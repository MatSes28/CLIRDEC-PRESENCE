import type { NextFunction, Request, Response } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log error details for debugging
  console.error(`[${new Date().toISOString()}] Error ${status}: ${message}`);
  if (process.env.NODE_ENV === "development") {
    console.error("Stack:", err.stack);
    console.error("Request:", {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === "development";
  const response = {
    message,
    ...(isDevelopment && {
      stack: err.stack,
      details: err.details,
    }),
  };

  res.status(status).json(response);
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    message: "Route not found",
    path: req.path,
    method: req.method,
  });
}
