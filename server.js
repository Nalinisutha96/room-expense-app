require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static("uploads"));
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log(err));

// ✅ API PREFIX
app.use("/api/auth", require("./routes/auth"));
app.use("/api/expense", require("./routes/expense"));

app.listen(process.env.PORT || 5000, () => {
  console.log("🚀 Server running");
});