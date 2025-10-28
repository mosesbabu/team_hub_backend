import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import session from "cookie-session";
import { config } from "./config/app.config";
import connectDatabase from "./config/database.config";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import { HTTPSTATUS } from "./config/http.config";
import { asyncHandler } from "./middlewares/asyncHandler.middleware";
import { BadRequestException } from "./utils/appError";
import { ErrorCodeEnum } from "./enums/error-code.enum";

import "./config/passport.config";
import passport from "passport";
import authRoutes from "./routes/auth.route";
import userRoutes from "./routes/user.route";
import isAuthenticated from "./middlewares/isAuthenticated.middleware";
import workspaceRoutes from "./routes/workspace.route";
import memberRoutes from "./routes/member.route";
import projectRoutes from "./routes/project.route";
import taskRoutes from "./routes/task.route";

const app = express();
const BASE_PATH = config.BASE_PATH;

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Trust proxy for production (required for Render.com)
if (config.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// CORS should be configured before session middleware
console.log("CORS configuration - FRONTEND_ORIGIN:", config.FRONTEND_ORIGIN);
app.use(
  cors({
    origin: [
      config.FRONTEND_ORIGIN,
      'https://team-hubb.vercel.app',
      'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  })
);

// Session configuration - different for production vs development
if (config.NODE_ENV === "production") {
  console.log("Using PRODUCTION session configuration");
  // Production session config for Render.com with Vercel frontend
  app.use(
    session({
      name: "session",
      keys: [config.SESSION_SECRET],
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true,         // ✅ MUST be true in production (HTTPS)
      sameSite: "none",     // ✅ Required for cross-origin cookies (Vercel -> Render)
      domain: undefined,    // ✅ Let browser handle domain
      path: "/",            // ✅ Set explicit path
      overwrite: true,      // ✅ Allow overwriting existing cookies
    })
  );
} else {
  console.log("Using DEVELOPMENT session configuration");
  // Development session config
  app.use(
    session({
      name: "session",
      keys: [config.SESSION_SECRET],
      maxAge: 24 * 60 * 60 * 1000,
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      overwrite: true,
    })
  );
}
app.use(passport.initialize());
app.use(passport.session());

// Debug middleware to log session info
app.use((req: any, res: any, next: any) => {
  console.log('=== Request Debug ===');
  console.log('URL:', req.url);
  console.log('Method:', req.method);
  console.log('Session ID:', req.session?.id);
  console.log('Session data:', req.session);
  console.log('User:', req.user);
  console.log('Headers:', {
    cookie: req.headers.cookie,
    origin: req.headers.origin,
    referer: req.headers.referer
  });
  console.log('===================');
  next();
});

app.get(
  `/`,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    throw new BadRequestException(
      "This is a bad request",
      ErrorCodeEnum.AUTH_INVALID_TOKEN
    );
    return res.status(HTTPSTATUS.OK).json({
      message: "Hello Subscribe to the channel & share",
    });
  })
);

// Debug endpoint to test session creation
app.get('/debug/session', (req: any, res: any) => {
  console.log('=== Debug Session Endpoint ===');
  console.log('Session ID:', req.session?.id);
  console.log('Session data:', req.session);
  console.log('User:', req.user);
  console.log('Headers:', req.headers);
  
  // Create a test session
  if (!req.session?.id) {
    req.session.id = 'debug-session-' + Date.now();
    req.session.testData = 'test-value';
    console.log('Created debug session:', req.session.id);
  }
  
  res.cookie('debug-session', req.session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/'
  });
  
  res.json({
    sessionId: req.session?.id,
    sessionData: req.session,
    user: req.user,
    headers: req.headers
  });
});


app.use(`${BASE_PATH}/auth`, authRoutes);
app.use(`${BASE_PATH}/user`, isAuthenticated, userRoutes);
app.use(`${BASE_PATH}/workspace`, isAuthenticated, workspaceRoutes);
app.use(`${BASE_PATH}/member`, isAuthenticated, memberRoutes);
app.use(`${BASE_PATH}/project`, isAuthenticated, projectRoutes);
app.use(`${BASE_PATH}/task`, isAuthenticated, taskRoutes);

app.use(errorHandler);

app.listen(config.PORT, async () => {
  console.log(`Server listening on port ${config.PORT} in ${config.NODE_ENV}`);
  await connectDatabase();
});
