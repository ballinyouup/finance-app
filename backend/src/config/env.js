import dotenv from "dotenv";

dotenv.config();

export const env = {
  MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/finance_app",
  JWT_SECRET: process.env.JWT_SECRET || "dev-only-secret-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1h",
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "MoneySim <no-reply@moneysim.app>",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  PORT: Number(process.env.PORT || 5000)
};
