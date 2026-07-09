import { User } from "../models/User.js";
import { verifyAccessToken } from "../services/token.service.js";
import { ApiError } from "../utils/errors.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.get("authorization") || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication is required.");
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);

    if (!user) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication is required.");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error.status ? error : new ApiError(401, "UNAUTHORIZED", "Authentication is required."));
  }
}
