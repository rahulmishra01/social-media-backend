const mongoose = require("mongoose");
mongoose.set('strictQuery', false); 
const URL = process.env.MONGODB_URL;
const connectDB = () => {
  mongoose
    .connect(URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("database connected");
    })
    .catch((error) => {
      console.log(`somthing went wrong ${error}`);
    });
};

module.exports = connectDB;
