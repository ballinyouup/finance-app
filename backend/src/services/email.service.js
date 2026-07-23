import { Resend } from "resend";
import { env } from "../config/env.js";
import { logger, maskEmail } from "../utils/logger.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

logger.info("Email service initialized", {
  provider: "resend",
  resendConfigured: Boolean(resend),
  from: env.RESEND_FROM_EMAIL,
  frontendUrl: env.FRONTEND_URL
});

export async function sendVerificationEmail({ to, name, token }) {
  const url = new URL("/verify-email", env.FRONTEND_URL);
  url.searchParams.set("token", token);
  url.searchParams.set("email", to);

  logger.info("Verification email requested", {
    provider: "resend",
    to: maskEmail(to),
    resendConfigured: Boolean(resend),
    from: env.RESEND_FROM_EMAIL
  });

  if (!resend) {
    logger.warn("Resend API key missing; using console verification link", {
      to: maskEmail(to),
      verificationUrl: url.toString()
    });
    return;
  }

  const { data, error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: [to],
    subject: "Verify your MoneySim account",
    text: `Hi ${name}, verify your account here: ${url.toString()}`,
    html: `<p>Hi ${name},</p><p><a href="${url.toString()}">Verify your account</a>.</p>`
  });

  if (error) {
    logger.error("Resend verification email failed", {
      to: maskEmail(to),
      message: error.message,
      name: error.name
    });
    throw new Error(error.message);
  }

  logger.info("Resend verification email sent", {
    to: maskEmail(to),
    messageId: data?.id
  });
}

export async function sendPasswordResetEmail({ to, name, token }) {
  const url = new URL("/reset-password", env.FRONTEND_URL);
  url.searchParams.set("token", token);

  logger.info("Password reset email requested", {
    provider: "resend",
    to: maskEmail(to),
    resendConfigured: Boolean(resend),
    from: env.RESEND_FROM_EMAIL
  });

  if (!resend) {
    logger.warn("Resend API key missing; using console password reset link", {
      to: maskEmail(to),
      resetUrl: url.toString()
    });
    return;
  }

  const { data, error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: [to],
    subject: "Reset your MoneySim password",
    text: `Hi ${name}, reset your MoneySim password here: ${url.toString()}`,
    html: `<p>Hi ${name},</p><p><a href="${url.toString()}">Reset your password</a>.</p><p>This link expires in 30 minutes.</p>`
  });

  if (error) {
    logger.error("Resend password reset email failed", {
      to: maskEmail(to),
      message: error.message,
      name: error.name
    });
    throw new Error(error.message);
  }

  logger.info("Resend password reset email sent", {
    to: maskEmail(to),
    messageId: data?.id
  });
}
