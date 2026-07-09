export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message = "The request is invalid.") =>
  new ApiError(400, "BAD_REQUEST", message);
