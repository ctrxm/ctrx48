import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertPostSchema, insertCommentSchema, insertVoteSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
};

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

const rateLimitMap = new Map<string, number>();

const rateLimit = (seconds: number) => (req: Request, res: Response, next: NextFunction) => {
  const userId = req.session.userId;
  if (!userId) return next();
  const key = `${userId}:${req.path}`;
  const last = rateLimitMap.get(key);
  const now = Date.now();
  if (last && now - last < seconds * 1000) {
    return res.status(429).json({ message: `Wait ${seconds} seconds between actions` });
  }
  rateLimitMap.set(key, now);
  next();
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgStore = connectPgSimple(session);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  app.use(
    session({
      store: new PgStore({ pool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "ritual48-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true, secure: false, sameSite: "lax" },
    })
  );

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByUsername(parsed.username);
      if (existing) {
        return res.status(400).json({ message: "Username taken" });
      }
      const hashed = await bcrypt.hash(parsed.password, 10);
      const user = await storage.createUser({ username: parsed.username, password: hashed });
      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username, role: user.role, reputation: user.reputation });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = insertUserSchema.parse(req.body);
      const user = await storage.getUserByUsername(parsed.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      if (user.isBanned) {
        return res.status(403).json({ message: "You have been banned" });
      }
      const valid = await bcrypt.compare(parsed.password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username, role: user.role, reputation: user.reputation, shadowBanned: user.shadowBanned });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      reputation: user.reputation,
      isBanned: user.isBanned,
      shadowBanned: user.shadowBanned,
    });
  });

  app.get("/api/posts", async (req, res) => {
    const currentUserId = req.session.userId;
    const posts = await storage.getActivePosts(currentUserId);
    res.json(posts);
  });

  app.get("/api/posts/:id", async (req, res) => {
    const post = await storage.getPostWithUser(req.params.id, req.session.userId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  });

  app.post("/api/posts", requireAuth, rateLimit(30), async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.isBanned) {
        return res.status(403).json({ message: "Cannot post" });
      }
      const parsed = insertPostSchema.parse(req.body);
      const post = await storage.createPost({ ...parsed, userId: req.session.userId! });
      res.json(post);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/posts/:id/comments", async (req, res) => {
    const comments = await storage.getCommentsByPost(req.params.id, req.session.userId);
    res.json(comments);
  });

  app.post("/api/comments", requireAuth, rateLimit(10), async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.isBanned) {
        return res.status(403).json({ message: "Cannot comment" });
      }
      const parsed = insertCommentSchema.parse(req.body);
      const post = await storage.getPost(parsed.postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (post.isLocked) {
        return res.status(403).json({ message: "Thread is locked" });
      }
      if (new Date(post.expiresAt) < new Date()) {
        return res.status(403).json({ message: "Thread is dead" });
      }
      const comment = await storage.createComment({ ...parsed, userId: req.session.userId! });
      res.json(comment);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/votes", requireAuth, async (req, res) => {
    try {
      const parsed = insertVoteSchema.parse(req.body);
      if (!parsed.postId && !parsed.commentId) {
        return res.status(400).json({ message: "Must specify postId or commentId" });
      }
      await storage.upsertVote({ ...parsed, userId: req.session.userId! });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users.map(u => ({ ...u, password: undefined })));
  });

  app.get("/api/admin/posts", requireAdmin, async (req, res) => {
    const posts = await storage.getAllPosts();
    res.json(posts);
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateUser(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "User not found" });
      res.json({ ...updated, password: undefined });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/posts/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updatePost(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Post not found" });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/admin/comments/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateComment(req.params.id, { isDeleted: true });
    if (!updated) return res.status(404).json({ message: "Comment not found" });
    res.json(updated);
  });

  return httpServer;
}
