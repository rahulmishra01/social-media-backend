const express = require("express");
const router = express.Router();

const {
  createPost,
  likeAndUnlikePost,
  deletePost,
  getPostOfFollowing,
  updateCaption,
  commentOnPostandUpdate,
  deleteComment
} = require("../controllers/post");
const isAuthincated = require("../middleware/auth");
router.post("/post/upload", isAuthincated, createPost);
router.get("/post/:id", isAuthincated, likeAndUnlikePost);
router.delete("/post/:id", isAuthincated, deletePost);
router.get("/posts", isAuthincated, getPostOfFollowing);
router.put("/post/:id", isAuthincated, updateCaption);
router.put("/post/comment/:id", isAuthincated, commentOnPostandUpdate);
router.delete("/post/comment/:id", isAuthincated, deleteComment);
module.exports = router;
