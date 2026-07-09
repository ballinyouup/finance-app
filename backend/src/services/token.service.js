import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

export function createVerificationToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  return {
    rawToken,
    hashedToken: hashToken(rawToken),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
