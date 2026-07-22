import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { User } from "../models/User.js";
import { sendVerificationEmail } from "../services/email.service.js";
import {
  createVerificationToken,
  hashToken,
  signAccessToken
} from "../services/token.service.js";
import { ApiError } from "../utils/errors.js";
import { logger, maskEmail } from "../utils/logger.js";
import { sendSuccess } from "../utils/response.js";

export const authRouter = Router();

const emailSchema = z.string().trim().toLowerCase().email();
const signupSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name is required."),
    email: emailSchema,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).+$/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
      )
  })
});const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required.")
  })
});
const verifySchema = z.object({
  body: z.object({
    email: emailSchema,
    token: z.string().min(1, "Verification token is required.")
  })
});
const resendSchema = z.object({
  body: z.object({ email: emailSchema })
});

async function assignVerificationToken(user) {
  const verification = createVerificationToken();
  user.verificationToken = verification.hashedToken;
  user.verificationTokenExpires = verification.expiresAt;
  await user.save();
  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    token: verification.rawToken
  });
}

authRouter.post("/signup", validate(signupSchema), async (req, res, next) => {
  try {
    logger.info("Signup requested", { email: maskEmail(req.body.email) });
    const existing = await User.findOne({ email: req.body.email });

    if (existing) {
      logger.warn("Signup rejected because email already exists", {
        email: maskEmail(req.body.email)
      });
      throw new ApiError(409, "EMAIL_EXISTS", "An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      passwordHash
    });

    await assignVerificationToken(user);
    logger.info("Signup completed; verification email step finished", {
      email: maskEmail(user.email),
      userId: user._id.toString()
    });
    sendSuccess(res, { user: user.toPublicJSON() }, 201);
  } catch (error) {
    logger.error("Signup failed", {
      email: maskEmail(req.body.email || ""),
      message: error.message,
      code: error.code
    });
    next(error);
  }
});

authRouter.post("/verify-email", validate(verifySchema), async (req, res, next) => {
  try {
    logger.info("Email verification requested", { email: maskEmail(req.body.email) });
    const user = await User.findOne({ email: req.body.email });

    if (user?.isVerified) {
      logger.info("Email verification skipped because user is already verified", {
        email: maskEmail(req.body.email)
      });
      sendSuccess(res, { message: "Email already verified." });
      return;
    }

    if (!user || !user.verificationToken) {
      logger.warn("Email verification rejected because token was missing", {
        email: maskEmail(req.body.email),
        userFound: Boolean(user)
      });
      throw new ApiError(400, "INVALID_TOKEN", "Verification token is invalid.");
    }

    if (user.verificationTokenExpires < new Date()) {
      logger.warn("Email verification rejected because token expired", {
        email: maskEmail(req.body.email)
      });
      throw new ApiError(410, "TOKEN_EXPIRED", "Verification token has expired.");
    }

    if (user.verificationToken !== hashToken(req.body.token)) {
      logger.warn("Email verification rejected because token did not match", {
        email: maskEmail(req.body.email)
      });
      throw new ApiError(400, "INVALID_TOKEN", "Verification token is invalid.");
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    logger.info("Email verification completed", { email: maskEmail(req.body.email) });
    sendSuccess(res, { message: "Email verified." });
  } catch (error) {
    logger.error("Email verification failed", {
      email: maskEmail(req.body.email || ""),
      message: error.message,
      code: error.code
    });
    next(error);
  }
});

authRouter.post("/resend-verification", validate(resendSchema), async (req, res, next) => {
  try {
    logger.info("Verification resend requested", { email: maskEmail(req.body.email) });
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      logger.warn("Verification resend rejected because user was not found", {
        email: maskEmail(req.body.email)
      });
      throw new ApiError(404, "USER_NOT_FOUND", "Account not found.");
    }

    if (user.isVerified) {
      logger.warn("Verification resend rejected because user is already verified", {
        email: maskEmail(req.body.email)
      });
      throw new ApiError(409, "ALREADY_VERIFIED", "This account is already verified.");
    }

    await assignVerificationToken(user);
    logger.info("Verification resend completed", { email: maskEmail(req.body.email) });
    sendSuccess(res, { message: "Verification email sent." });
  } catch (error) {
    logger.error("Verification resend failed", {
      email: maskEmail(req.body.email || ""),
      message: error.message,
      code: error.code
    });
    next(error);
  }
});

authRouter.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    const passwordMatches = user
      ? await bcrypt.compare(req.body.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    }

    if (!user.isVerified) {
      throw new ApiError(403, "EMAIL_NOT_VERIFIED", "Please verify your email before logging in.");
    }

    sendSuccess(res, { token: signAccessToken(user), user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  sendSuccess(res, { user: req.user.toPublicJSON() });
});

authRouter.post("/logout", requireAuth, (req, res) => {
  sendSuccess(res, { message: "Logged out." });
});
