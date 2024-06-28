// require("dotenv").config({ path: "backend/config/.env" });
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: "config/.env" });
}
const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();
const connectDB = require("./config/Database");
// Imports Routes
const Post = require("./routers/post");
const User = require("./routers/user");
const cookieParser = require("cookie-parser");
const cloudinary = require("cloudinary");
const bodyParser = require("body-parser");
const port = process.env.PORT;
// Using MIddleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
// Using Routes
app.use("/api", Post);
app.use("/api", User);
app.use(express.static(path.join(__dirname, "../frontend/build")));
connectDB();
// cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.get("*", (req, res) => res.sendFile(path.resolve(__dirname, "../frontend/build/index.html")));
app.get("/", (req, res) => {
  res.send("Hello World");
});
app.listen(port, console.log(`app is running ${port}`));
