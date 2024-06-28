const User = require("../models/User");
const Post = require("../models/Post");
const cloudinary = require("cloudinary");
const sendEmail = require("../middleware/sendEmail");
const crypto = require("crypto");

const Register = async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;

    let user = await User.findOne({ email }).populate(
      "avatar name followers following posts"
    );

    if (user) {
      return res
        .status(400)
        .json({ success: false, message: "User already exist" });
    }

    const myCloud = await cloudinary.v2.uploader.upload(avatar, {
      folder: "social-media",
    });

    user = await User.create({
      name,
      email,
      password,
      avatar: { public_id: myCloud.public_id, url: myCloud.secure_url },
    });

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email })
      .select("+password")
      .populate("posts followers following");
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User does not exist" });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect Password",
      });
    }

    const token = await user.generateToken();

    const options = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    };

    res
      .status(201)
      .cookie("token", token, options)
      .json({ success: true, user, token });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const Logout = async (req, res) => {
  try {
    res.cookie("token", "", { 
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

    return res.status(200).json({ 
      success: true, 
      message: "Logout User" 
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const followUser = async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    const loggedinUser = await User.findById(req.user._id);

    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (loggedinUser.following.includes(userToFollow._id)) {
      const indexOfFollowing = loggedinUser.following.indexOf(userToFollow._id);
      loggedinUser.following.splice(indexOfFollowing, 1);

      const indexOfFollowers = userToFollow.followers.indexOf(loggedinUser._id);
      userToFollow.followers.splice(indexOfFollowers, 1);

      await loggedinUser.save();
      await userToFollow.save();

      return res.status(200).json({
        success: false,
        message: "User Unfollowed",
      });
    } else {
      loggedinUser.following.push(userToFollow._id);
      userToFollow.followers.push(loggedinUser._id);

      await loggedinUser.save();
      await userToFollow.save();

      return res.status(200).json({
        success: false,
        message: "User followed",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+password");

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "please enter old and new password",
      });
    }

    const isMatch = await user.matchPassword(oldPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect Old Password",
      });
    }

    user.password = newPassword;

    await user.save();

    return res.status(201).json({
      success: false,
      message: "Password Updated",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const { name, email, avatar } = req.body;

    if (name) {
      user.name = name;
    }
    if (email) {
      user.email = email;
    }

    // user avatar

    if (avatar) {
      await cloudinary.v2.uploader.destroy(user.avatar.public_id);
      const myCloud = await cloudinary.v2.uploader.upload(avatar, {
        folder: "social-media",
      });
      user.avatar.public_id = myCloud.public_id;
      user.avatar.url = myCloud.secure_url;
    }

    await user.save();
    return res.status(200).json({
      success: true,
      message: "profile upated",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteMyAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const posts = user.posts;
    const followers = user.followers;
    const following = user.following;
    const userId = user._id;

    // Removing Avatar from cloudinary

    await cloudinary.v2.uploader.destroy(user.avatar.public_id);

    await user.remove();

    // Logout user after deletig profile
    res.cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    });

    //  Delete all posts in user
    for (let i = 0; i < posts.length; i++) {
      const post = await Post.findById(posts[i]);
      await cloudinary.v2.uploader.destroy(post.image.public_id);
      await post.remove();
    }

    // Removing user from follower's following

    for (let i = 0; i < followers.length; i++) {
      const follower = await User.findById(followers[i]);

      const index = follower.following.indexOf(userId);
      follower.following.splice(index, 1);
      await follower.save();
    }

    // removing all comments of the user from

    const allPosts = await Post.find();

    for (let i = 0; i < allPosts.length; i++) {
      const post = await Post.findById(allPosts[i]._id);

      for (let j = 0; j < post.comments.length; j++) {
        if (post.comments[j].user === userId) {
          post.comments.splice(j, 1);
        }
      }
      await post.save();
    }

    // removing all Likes of the user from all posts

    for (let i = 0; i < allPosts.length; i++) {
      const post = await Post.findById(allPosts[i]._id);

      for (let j = 0; j < post.likes.length; j++) {
        if (post.likes[j].user === userId) {
          post.likes.splice(j, 1);
        }
      }
      await post.save();
    }

    // Removing user from following's followers

    for (let i = 0; i < following.length; i++) {
      const follows = await User.findById(following[i]);

      const index = follows.followers.indexOf(userId);
      follows.followers.splice(index, 1);
      await follows.save();
    }

    return res.status(200).json({
      success: false,
      message: "Profile Deleted",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const myProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "posts followers following"
    );
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "posts followers following"
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllUser = async (req, res) => {
  try {
    const user = await User.find({
      name: { $regex: req.query.name, $options: "i" },
    });

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getMyPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const posts = [];

    for (let i = 0; i < user.posts.length; i++) {
      const post = await Post.findById(user.posts[i]).populate(
        "likes comments.user owner"
      );
      posts.push(post);
    }
    return res.status(200).json({ success: true, posts, user });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getUserPosts = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    const posts = [];

    for (let i = 0; i < user.posts.length; i++) {
      const post = await Post.findById(user.posts[i]).populate(
        "likes comments.user owner"
      );
      posts.push(post);
    }
    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const resetPasswordToken = user.getResetPasswordToken();

    await user.save();

    const resetPasswordUrl = `${process.env.FRONTEND_URL}/password/reset/${resetPasswordToken}`;

    const message = `your password reset token is \n\n ${resetPasswordUrl} \n\nIf you have not requested this email then plase ignore it`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Social-media password recovery",
        message,
      });

      res.status(200).json({
        success: true,
        message: `Email sent to ${user.email} successfully`,
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "token is invalid or has expired",
      });
    }

    user.password = req.body.password;

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "password updated",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  Register,
  Login,
  Logout,
  followUser,
  updatePassword,
  updateProfile,
  deleteMyAccount,
  myProfile,
  getUserProfile,
  getAllUser,
  getMyPosts,
  getUserPosts,
  forgotPassword,
  resetPassword,
};
