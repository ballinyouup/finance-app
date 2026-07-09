export function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });

      req.validated = parsed;
      req.body = parsed.body ?? req.body;
      req.params = parsed.params ?? req.params;
      next();
    } catch (error) {
      next(error);
    }
  };
}
