import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema, insertPostSchema, insertCommentSchema, insertVoteSchema,
  updateProfileSchema, emailOtpSchema, verifyOtpSchema, registerWithEmailSchema,
  insertBadgeSchema, insertGroupSchema,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import path from "path";
import express from "express";
import { generateOtp, sendOtpEmail } from "./email";
import { upload } from "./upload";
import { uploadToR2 } from "./r2";
import { fetchLinkPreview } from "./linkPreview";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Belum masuk" });
  }
  next();
};

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Belum masuk" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Akses ditolak" });
  }
  next();
};

const rateLimitMap = new Map<string, number>();

const rateLimit = (scope: string, seconds: number) => (req: Request, res: Response, next: NextFunction) => {
  const identifier = req.session.userId || req.ip || "anon";
  const key = `${identifier}:${scope}`;
  const last = rateLimitMap.get(key);
  const now = Date.now();
  if (last && now - last < seconds * 1000) {
    return res.status(429).json({ message: `Tunggu ${seconds} detik sebelum aksi berikutnya` });
  }
  rateLimitMap.set(key, now);
  next();
};

async function isEmailDomainBlocked(email: string): Promise<boolean> {
  const blockedDomainsStr = await storage.getAdminSetting("blocked_domains");
  if (!blockedDomainsStr) return false;
  const blockedDomains = blockedDomainsStr.split(",").map(d => d.trim().toLowerCase()).filter(Boolean);
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? blockedDomains.includes(domain) : false;
}

async function isLinkDomainBlocked(url: string): Promise<boolean> {
  const blockedDomainsStr = await storage.getAdminSetting("blocked_domains");
  if (!blockedDomainsStr) return false;
  const blockedDomains = blockedDomainsStr.split(",").map(d => d.trim().toLowerCase()).filter(Boolean);
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return blockedDomains.some(d => hostname === d || hostname.endsWith("." + d));
  } catch {
    return false;
  }
}

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

  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByUsername(parsed.username);
      if (existing) {
        return res.status(400).json({ message: "Nama pengguna sudah dipakai" });
      }
      const email = req.body.email?.trim();
      if (!email) {
        return res.status(400).json({ message: "Email wajib diisi" });
      }
      if (await isEmailDomainBlocked(email)) {
        return res.status(400).json({ message: "Domain email ini tidak diperbolehkan" });
      }
      const hashed = await bcrypt.hash(parsed.password, 10);
      const user = await storage.createUser({ username: parsed.username, password: hashed });
      await storage.updateUser(user.id, { email });
      req.session.userId = user.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });
      res.json({ id: user.id, username: user.username, role: user.role, reputation: user.reputation });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/auth/register-email", async (req, res) => {
    try {
      const parsed = registerWithEmailSchema.parse(req.body);

      if (await isEmailDomainBlocked(parsed.email)) {
        return res.status(400).json({ message: "Domain email ini tidak diperbolehkan" });
      }

      const existingUsername = await storage.getUserByUsername(parsed.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Nama pengguna sudah dipakai" });
      }

      const existingEmail = await storage.getUserByEmail(parsed.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email sudah terdaftar" });
      }

      const verified = await storage.verifyEmailCode(parsed.email, parsed.code);
      if (!verified) {
        return res.status(400).json({ message: "Kode verifikasi tidak valid atau sudah kedaluwarsa" });
      }

      const hashed = await bcrypt.hash(parsed.password, 10);
      const user = await storage.createUser({
        username: parsed.username,
        password: hashed,
        email: parsed.email,
        emailVerified: true,
      });

      req.session.userId = user.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });
      res.json({ id: user.id, username: user.username, role: user.role, reputation: user.reputation });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/auth/send-otp", rateLimit("otp", 60), async (req, res) => {
    try {
      const parsed = emailOtpSchema.parse(req.body);

      if (await isEmailDomainBlocked(parsed.email)) {
        return res.status(400).json({ message: "Domain email ini tidak diperbolehkan" });
      }

      const code = generateOtp();
      await storage.createEmailVerification(parsed.email, code);
      await sendOtpEmail(parsed.email, code);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = insertUserSchema.parse(req.body);
      const user = await storage.getUserByUsername(parsed.username);
      if (!user) {
        return res.status(401).json({ message: "Kredensial tidak valid" });
      }
      if (user.isBanned) {
        return res.status(403).json({ message: "Akun kamu telah diblokir" });
      }
      const valid = await bcrypt.compare(parsed.password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Kredensial tidak valid" });
      }
      req.session.userId = user.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });
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
      return res.status(401).json({ message: "Belum masuk" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Belum masuk" });
    }
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      reputation: user.reputation,
      isBanned: user.isBanned,
      shadowBanned: user.shadowBanned,
      email: user.email,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
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
      return res.status(404).json({ message: "Postingan tidak ditemukan" });
    }
    res.json(post);
  });

  app.post("/api/posts", requireAuth, rateLimit("post", 30), async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.isBanned) {
        return res.status(403).json({ message: "Tidak bisa memposting" });
      }
      const parsed = insertPostSchema.parse(req.body);

      let linkTitle: string | undefined;
      let linkDescription: string | undefined;
      let linkImage: string | undefined;

      if (parsed.linkUrl) {
        if (await isLinkDomainBlocked(parsed.linkUrl)) {
          return res.status(400).json({ message: "Domain tautan ini tidak diperbolehkan" });
        }
        const preview = await fetchLinkPreview(parsed.linkUrl);
        linkTitle = preview.title ?? undefined;
        linkDescription = preview.description ?? undefined;
        linkImage = preview.image ?? undefined;
      }

      const post = await storage.createPost({
        ...parsed,
        userId: req.session.userId!,
        linkTitle,
        linkDescription,
        linkImage,
      });
      res.json(post);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/upload", requireAuth, upload.single("file"), async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Tidak ada file yang diupload" });
    }
    try {
      const url = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
      res.json({ url });
    } catch (err: any) {
      res.status(500).json({ message: "Gagal mengupload gambar" });
    }
  });

  app.post("/api/link-preview", requireAuth, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ message: "URL diperlukan" });
      }
      const preview = await fetchLinkPreview(url);
      res.json(preview);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/posts/:id/comments", async (req, res) => {
    const comments = await storage.getCommentsByPost(req.params.id, req.session.userId);
    res.json(comments);
  });

  app.post("/api/comments", requireAuth, rateLimit("comment", 10), async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.isBanned) {
        return res.status(403).json({ message: "Tidak bisa berkomentar" });
      }
      const parsed = insertCommentSchema.parse(req.body);
      const post = await storage.getPost(parsed.postId);
      if (!post) {
        return res.status(404).json({ message: "Postingan tidak ditemukan" });
      }
      if (post.isLocked) {
        return res.status(403).json({ message: "Thread sudah dikunci" });
      }
      if (new Date(post.expiresAt) < new Date()) {
        return res.status(403).json({ message: "Thread sudah kedaluwarsa" });
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
        return res.status(400).json({ message: "Harus menyertakan postId atau commentId" });
      }
      await storage.upsertVote({ ...parsed, userId: req.session.userId! });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/users/:username", async (req, res) => {
    const profile = await storage.getUserProfile(req.params.username);
    if (!profile) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }
    res.json(profile);
  });

  app.get("/api/users/:username/posts", async (req, res) => {
    const profile = await storage.getUserProfile(req.params.username);
    if (!profile) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }
    const userPosts = await storage.getUserPosts(req.params.username, req.session.userId);
    res.json(userPosts);
  });

  app.patch("/api/profile", requireAuth, async (req, res) => {
    try {
      const parsed = updateProfileSchema.parse(req.body);
      const updated = await storage.updateUserProfile(req.session.userId!, parsed);
      if (!updated) return res.status(404).json({ message: "Pengguna tidak ditemukan" });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/profile/avatar", requireAuth, upload.single("file"), async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Tidak ada file yang diupload" });
    }
    try {
      const url = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
      await storage.updateUserProfile(req.session.userId!, { avatarUrl: url });
      res.json({ url });
    } catch (err: any) {
      res.status(500).json({ message: "Gagal mengupload avatar" });
    }
  });

  app.post("/api/profile/banner", requireAuth, upload.single("file"), async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Tidak ada file yang diupload" });
    }
    try {
      const url = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
      await storage.updateUserProfile(req.session.userId!, { bannerUrl: url });
      res.json({ url });
    } catch (err: any) {
      res.status(500).json({ message: "Gagal mengupload banner" });
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
      if (!updated) return res.status(404).json({ message: "Pengguna tidak ditemukan" });
      res.json({ ...updated, password: undefined });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/posts/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updatePost(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Postingan tidak ditemukan" });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/admin/comments/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateComment(req.params.id, { isDeleted: true });
    if (!updated) return res.status(404).json({ message: "Komentar tidak ditemukan" });
    res.json(updated);
  });

  app.get("/api/admin/settings", requireAdmin, async (req, res) => {
    const settings = await storage.getAllAdminSettings();
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    res.json(result);
  });

  app.put("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const entries = Object.entries(req.body) as [string, string][];
      for (const [key, value] of entries) {
        await storage.setAdminSetting(key, String(value));
      }
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/admin/badges", requireAdmin, async (req, res) => {
    const allBadges = await storage.getAllBadges();
    res.json(allBadges);
  });

  app.post("/api/admin/badges", requireAdmin, async (req, res) => {
    try {
      const parsed = insertBadgeSchema.parse(req.body);
      const badge = await storage.createBadge(parsed);
      res.json(badge);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/admin/badges/:id", requireAdmin, async (req, res) => {
    await storage.deleteBadge(req.params.id);
    res.json({ ok: true });
  });

  app.post("/api/admin/badges/award", requireAdmin, async (req, res) => {
    try {
      const { userId, badgeId } = req.body;
      if (!userId || !badgeId) {
        return res.status(400).json({ message: "userId dan badgeId diperlukan" });
      }
      const ub = await storage.awardBadge(userId, badgeId);
      res.json(ub);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/admin/badges/revoke", requireAdmin, async (req, res) => {
    try {
      const { userId, badgeId } = req.body;
      if (!userId || !badgeId) {
        return res.status(400).json({ message: "userId dan badgeId diperlukan" });
      }
      await storage.revokeBadge(userId, badgeId);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/groups", async (req, res) => {
    const allGroups = await storage.getAllGroups(req.session.userId);
    res.json(allGroups);
  });

  app.get("/api/groups/:slug", async (req, res) => {
    const group = await storage.getGroup(req.params.slug);
    if (!group) {
      return res.status(404).json({ message: "Grup tidak ditemukan" });
    }
    if (req.session.userId) {
      const members = await storage.getGroupMembers(group.id);
      group.isMember = members.some(m => m.userId === req.session.userId);
    }
    res.json(group);
  });

  app.get("/api/groups/:slug/members", async (req, res) => {
    const group = await storage.getGroup(req.params.slug);
    if (!group) {
      return res.status(404).json({ message: "Grup tidak ditemukan" });
    }
    const members = await storage.getGroupMembers(group.id);
    res.json(members);
  });

  app.post("/api/groups", requireAuth, async (req, res) => {
    try {
      const parsed = insertGroupSchema.parse(req.body);
      const group = await storage.createGroup({ ...parsed, createdBy: req.session.userId! });
      res.json(group);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/groups/:slug/join", requireAuth, async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.slug);
      if (!group) {
        return res.status(404).json({ message: "Grup tidak ditemukan" });
      }
      const member = await storage.joinGroup(group.id, req.session.userId!);
      res.json(member);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/groups/:slug/leave", requireAuth, async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.slug);
      if (!group) {
        return res.status(404).json({ message: "Grup tidak ditemukan" });
      }
      await storage.leaveGroup(group.id, req.session.userId!);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  return httpServer;
}
