import { NextFunction, Request, Response } from "express";
import { UnauthorizedException } from "../utils/appError";

const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // Debug logging to help identify the issue
  console.log("isAuthenticated middleware - req.user:", req.user);
  console.log("isAuthenticated middleware - session:", req.session);
  
  if (!req.user || !req.user._id) {
    throw new UnauthorizedException("Unauthorized. Please log in.");
  }
  next();
};

export default isAuthenticated;
