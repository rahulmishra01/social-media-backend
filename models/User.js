const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const UserSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter a name"],
  },

  avatar: {
    public_id: String,
    url: String,
  },

  email: {
    type: String,
    required: [true, "please enter a email"],
    unique: [true, "email already exist"],
  },
  password: {
    type: String,
    required: [true, "please enter a password"],
    minlength: [6, "password must be atlease 6 digits"],
    select: false,
  },
  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
  ],
  followers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  following: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  resetPasswordToken: String,
  resetPasswordExpires: Date,
});

// bcrypt password
UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

UserSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

UserSchema.methods.generateToken = function () {
  return jwt.sign({ _id: this._id }, process.env.JWT_SECRET);
};

UserSchema.methods.getResetPasswordToken = function () {
  // generate token
  const resetToken = crypto.randomBytes(20).toString("hex");
// hashing and add user schema
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model("User", UserSchema);
