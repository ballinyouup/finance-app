export function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ success: true, data, error: null });
}

export function sendError(res, error) {
  return res.status(error.status || 500).json({
    success: false,
    data: null,
    error: {
      code: error.code || "INTERNAL_SERVER_ERROR",
      message: error.message || "Something went wrong."
    }
  });
}
