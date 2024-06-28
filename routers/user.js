const express = require("express");
const router = express.Router();
const {
  Register,
  Login,
  followUser,
  Logout,
  updatePassword,
  updateProfile,
  deleteMyAccount,
  myProfile,
  getUserProfile,
  getMyPosts,
  getUserPosts,
  getAllUser,
  forgotPassword,
  resetPassword,
} = require("../controllers/user");
const isAuthincated = require("../middleware/auth");
router.post("/register", Register);
router.post("/login", Login);
router.get("/logout", Logout);
router.get("/follow/:id", isAuthincated, followUser);
router.put("/update/password", isAuthincated, updatePassword);
router.put("/update/profile", isAuthincated, updateProfile);
router.delete("/delete/me/", isAuthincated, deleteMyAccount);
router.get("/me", isAuthincated, myProfile);
router.get("/my/posts", isAuthincated, getMyPosts);
router.get("/userposts/:id", isAuthincated, getUserPosts);
router.get("/user/:id", isAuthincated, getUserProfile);
router.get("/users", isAuthincated, getAllUser);
router.post("/forgot/password", forgotPassword);
router.put("/password/reset/:token", resetPassword);
module.exports = router;
