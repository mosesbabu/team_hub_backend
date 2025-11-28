import { NextFunction, Request, Response } from "express";
import { UnauthorizedException } from "../utils/appError";
import jwt from "jsonwebtoken";
import { config } from "../config/app.config";

const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedException("Unauthorized. Please log in.");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.SESSION_SECRET) as {
      _id: string;
    };

    // Attach a minimal user object so existing code checking req.user._id keeps working
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = { _id: decoded._id };

    next();
  } catch (error) {
    throw new UnauthorizedException("Unauthorized. Please log in.");
  }
};

export default isAuthenticated;
