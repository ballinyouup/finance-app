import { ZodError } from "zod";
import { sendError } from "../utils/response.js";

export function errorMiddleware(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof ZodError) {
    return sendError(res, {
      status: 400,
      code: "VALIDATION_ERROR",
      message: error.issues.map((issue) => issue.message).join(" ")
    });
  }

  if (error.name === "CastError") {
    return sendError(res, {
      status: 400,
      code: "INVALID_ID",
      message: "One or more IDs are invalid."
    });
  }

  return sendError(res, error);
}
