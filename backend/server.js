import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/finance_app";

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Finance API is running",
    status: "ok"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "API test route works"
  });
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("Connected to MongoDB");

    app.listen(PORT, "127.0.0.1", () => {
      console.log(`Server running on http://127.0.0.1:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
