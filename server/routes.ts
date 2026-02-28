import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema, insertPostSchema, insertCommentSchema, insertVoteSchema,
  updateProfileSchema, emailOtpSchema, verifyOtpSchema, registerWithEmailSchema,
  insertBadgeSchema, insertGroupSchema, insertReactionSchema,
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
import { createBayarPayment, checkBayarPayment } from "./bayar";
import sharp from "sharp";

async function compressImage(buffer: Buffer, mimetype: string, maxWidth: number, quality = 80): Promise<{ buffer: Buffer; mimetype: string }> {
  try {
    let pipeline = sharp(buffer).resize({ width: maxWidth, withoutEnlargement: true });
    if (mimetype === "image/png") {
      pipeline = pipeline.png({ quality });
    } else if (mimetype === "image/webp") {
      pipeline = pipeline.webp({ quality });
    } else {
      pipeline = pipeline.jpeg({ quality });
    }
    const compressed = await pipeline.toBuffer();
    return { buffer: compressed, mimetype: mimetype === "image/gif" ? "image/jpeg" : mimetype };
  } catch {
    return { buffer, mimetype };
  }
}

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
  const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL });
  const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

  if (isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(
    session({
      store: new PgStore({ pool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "ritual48-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
      },
    })
  );

  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.get("/api/maintenance", async (_req, res) => {
    const val = await storage.getAdminSetting("maintenance_mode");
    res.json({ enabled: val === "true" });
  });

  app.use("/api", async (req, res, next) => {
    if (req.path === "/maintenance" || req.path === "/auth/login" || req.path === "/auth/me") {
      return next();
    }
    if (req.path.startsWith("/admin")) {
      return next();
    }
    const maintenance = await storage.getAdminSetting("maintenance_mode");
    if (maintenance === "true") {
      if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (user?.role === "admin") return next();
      }
      return res.status(503).json({ message: "Situs sedang dalam pemeliharaan. Silakan kembali nanti." });
    }
    next();
  });

  app.post("/api/auth/register", async (req, res) => {
    return res.status(400).json({ message: "Gunakan registrasi dengan verifikasi email" });
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

      const reservedCheck = await storage.isUsernameReserved(parsed.username);
      if (reservedCheck && reservedCheck.isAvailable) {
        return res.status(400).json({ message: `Username "${parsed.username}" adalah username premium dan harus dibeli` });
      }

      if (parsed.username.length <= 3) {
        return res.status(400).json({ message: "Username pendek (≤3 karakter) adalah premium dan harus dibeli" });
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

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ message: "Email dan kode wajib diisi" });
      }
      const valid = await storage.checkEmailCode(email, code);
      if (!valid) {
        return res.status(400).json({ message: "Kode verifikasi tidak valid atau sudah kedaluwarsa" });
      }
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
      isPremium: user.isPremium && user.premiumExpiresAt && user.premiumExpiresAt > new Date(),
      isVerified: user.isVerified,
      isPremiumUsername: user.isPremiumUsername,
      walletBalance: user.walletBalance,
    });
  });

  app.get("/api/posts", async (req, res) => {
    const currentUserId = req.session.userId;
    const posts = await storage.getActivePosts(currentUserId);
    res.json(posts);
  });

  app.get("/api/posts/:id", async (req, res) => {
    const post = await storage.getPostWithUser(req.params.id as string, req.session.userId);
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

      if (parsed.groupId) {
        const member = await storage.getGroupMember(parsed.groupId, req.session.userId!);
        if (!member) {
          return res.status(403).json({ message: "Kamu harus bergabung dengan grup ini untuk memposting" });
        }
      }

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
        isConfession: parsed.isConfession ?? false,
        threadId: parsed.threadId,
      });

      if (parsed.type === "poll" && parsed.pollOptions && parsed.pollOptions.length >= 2) {
        await storage.createPoll(post.id, parsed.pollOptions);
      }

      await storage.checkAndAwardAchievements(req.session.userId!);

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
      const compressed = await compressImage(req.file.buffer, req.file.mimetype, 1920);
      const url = await uploadToR2(compressed.buffer, req.file.originalname, compressed.mimetype);
      res.json({ url });
    } catch (err: any) {
      console.error("[R2 Upload Error]", err.message || err);
      res.status(500).json({ message: "Gagal mengupload gambar: " + (err.message || "Unknown error") });
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
    const comments = await storage.getCommentsByPost(req.params.id as string, req.session.userId);
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
      await storage.checkAndAwardAchievements(req.session.userId!);
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
      if (parsed.postId) {
        await storage.checkAndPinPost(parsed.postId);
      }
      await storage.checkAndAwardAchievements(req.session.userId!);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/users/:username", async (req, res) => {
    const profile = await storage.getUserProfile(req.params.username as string);
    if (!profile) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }
    res.json(profile);
  });

  app.get("/api/users/:username/posts", async (req, res) => {
    const profile = await storage.getUserProfile(req.params.username as string);
    if (!profile) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }
    const userPosts = await storage.getUserPosts(req.params.username as string, req.session.userId);
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
      const compressed = await compressImage(req.file.buffer, req.file.mimetype, 400, 85);
      const url = await uploadToR2(compressed.buffer, req.file.originalname, compressed.mimetype);
      await storage.updateUserProfile(req.session.userId!, { avatarUrl: url });
      res.json({ url });
    } catch (err: any) {
      console.error("[R2 Avatar Error]", err.message || err);
      res.status(500).json({ message: "Gagal mengupload avatar: " + (err.message || "Unknown error") });
    }
  });

  app.post("/api/profile/banner", requireAuth, upload.single("file"), async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Tidak ada file yang diupload" });
    }
    try {
      const compressed = await compressImage(req.file.buffer, req.file.mimetype, 1200, 80);
      const url = await uploadToR2(compressed.buffer, req.file.originalname, compressed.mimetype);
      await storage.updateUserProfile(req.session.userId!, { bannerUrl: url });
      res.json({ url });
    } catch (err: any) {
      console.error("[R2 Banner Error]", err.message || err);
      res.status(500).json({ message: "Gagal mengupload banner: " + (err.message || "Unknown error") });
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
      const updated = await storage.updateUser(req.params.id as string, req.body);
      if (!updated) return res.status(404).json({ message: "Pengguna tidak ditemukan" });
      res.json({ ...updated, password: undefined });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/posts/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updatePost(req.params.id as string, req.body);
      if (!updated) return res.status(404).json({ message: "Postingan tidak ditemukan" });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/admin/comments/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateComment(req.params.id as string, { isDeleted: true });
    if (!updated) return res.status(404).json({ message: "Komentar tidak ditemukan" });
    res.json(updated);
  });

  const PUBLIC_SETTINGS_KEYS = ["premium_username_price", "site_name", "site_description"];

  app.get("/api/settings/public", async (_req, res) => {
    const settings = await storage.getAllAdminSettings();
    const result: Record<string, string> = {};
    for (const s of settings) {
      if (PUBLIC_SETTINGS_KEYS.includes(s.key)) {
        result[s.key] = s.value;
      }
    }
    res.json(result);
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
    await storage.deleteBadge(req.params.id as string);
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
    const group = await storage.getGroup(req.params.slug as string, req.session.userId);
    if (!group) {
      return res.status(404).json({ message: "Grup tidak ditemukan" });
    }
    res.json(group);
  });

  app.get("/api/groups/:slug/posts", async (req, res) => {
    const group = await storage.getGroup(req.params.slug as string);
    if (!group) {
      return res.status(404).json({ message: "Grup tidak ditemukan" });
    }
    if (group.isPrivate) {
      if (!req.session.userId) {
        return res.status(403).json({ message: "Grup ini bersifat privat" });
      }
      const member = await storage.getGroupMember(group.id, req.session.userId);
      if (!member) {
        return res.status(403).json({ message: "Kamu harus bergabung untuk melihat postingan grup ini" });
      }
    }
    const groupPosts = await storage.getGroupPosts(group.id, req.session.userId);
    res.json(groupPosts);
  });

  app.get("/api/groups/:slug/members", async (req, res) => {
    const group = await storage.getGroup(req.params.slug as string);
    if (!group) {
      return res.status(404).json({ message: "Grup tidak ditemukan" });
    }
    if (group.isPrivate) {
      if (!req.session.userId) {
        return res.status(403).json({ message: "Grup ini bersifat privat" });
      }
      const member = await storage.getGroupMember(group.id, req.session.userId);
      if (!member) {
        return res.status(403).json({ message: "Kamu harus bergabung untuk melihat anggota grup ini" });
      }
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
      const group = await storage.getGroup(req.params.slug as string);
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
      const group = await storage.getGroup(req.params.slug as string);
      if (!group) {
        return res.status(404).json({ message: "Grup tidak ditemukan" });
      }
      await storage.leaveGroup(group.id, req.session.userId!);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/groups/:slug/members/:userId/role", requireAuth, async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.slug as string);
      if (!group) {
        return res.status(404).json({ message: "Grup tidak ditemukan" });
      }
      const currentMember = await storage.getGroupMember(group.id, req.session.userId!);
      if (!currentMember || (currentMember.role !== "owner" && currentMember.role !== "moderator")) {
        return res.status(403).json({ message: "Hanya owner atau moderator yang bisa mengubah role" });
      }
      const { role } = req.body;
      if (!["member", "moderator"].includes(role)) {
        return res.status(400).json({ message: "Role tidak valid" });
      }
      if (currentMember.role === "moderator" && role === "moderator") {
        return res.status(403).json({ message: "Moderator tidak bisa menjadikan moderator lain" });
      }
      await storage.setGroupMemberRole(group.id, req.params.userId as string, role);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/notifications", requireAuth, async (req, res) => {
    const notifs = await storage.getNotifications(req.session.userId!);
    res.json(notifs);
  });

  app.get("/api/notifications/count", requireAuth, async (req, res) => {
    const count = await storage.getUnreadNotificationCount(req.session.userId!);
    res.json({ count });
  });

  app.post("/api/notifications/read/:id", requireAuth, async (req, res) => {
    await storage.markNotificationRead(req.params.id as string, req.session.userId!);
    res.json({ ok: true });
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    await storage.markAllNotificationsRead(req.session.userId!);
    res.json({ ok: true });
  });

  app.get("/api/bookmarks", requireAuth, async (req, res) => {
    const bms = await storage.getUserBookmarks(req.session.userId!);
    res.json(bms);
  });

  app.post("/api/bookmarks", requireAuth, async (req, res) => {
    try {
      const { postId } = req.body;
      if (!postId) {
        return res.status(400).json({ message: "postId diperlukan" });
      }
      const bm = await storage.createBookmark(req.session.userId!, postId);
      res.json(bm);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/bookmarks/:postId", requireAuth, async (req, res) => {
    await storage.deleteBookmark(req.session.userId!, req.params.postId as string);
    res.json({ ok: true });
  });

  app.post("/api/payments/premium", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
      if (user.isPremium && user.premiumExpiresAt && user.premiumExpiresAt > new Date()) {
        return res.status(400).json({ message: "Kamu sudah Premium" });
      }
      const result = await createBayarPayment(25000, "CTRXL48 Premium 30 Hari");
      const payment = await storage.createPayment({
        userId: user.id,
        type: "premium",
        amount: 25000,
        invoiceId: result.invoice_id,
      });
      res.json({ payment, paymentUrl: result.payment_url, invoiceId: result.invoice_id, finalAmount: result.final_amount });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/payments/verified", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
      if (user.isVerified) {
        return res.status(400).json({ message: "Kamu sudah terverifikasi" });
      }
      const result = await createBayarPayment(50000, "CTRXL48 Badge Terverifikasi");
      const payment = await storage.createPayment({
        userId: user.id,
        type: "verified",
        amount: 50000,
        invoiceId: result.invoice_id,
      });
      res.json({ payment, paymentUrl: result.payment_url, invoiceId: result.invoice_id, finalAmount: result.final_amount });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/payments/premium-username", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
      if (user.isPremiumUsername) {
        return res.status(400).json({ message: "Username kamu sudah premium" });
      }
      const priceSetting = await storage.getAdminSetting("premium_username_price");
      const price = parseInt(priceSetting || "50000", 10);
      const result = await createBayarPayment(price, `CTRXL48 Premium Username: u/${user.username}`);
      const payment = await storage.createPayment({
        userId: user.id,
        type: "premium_username",
        amount: price,
        invoiceId: result.invoice_id,
      });
      res.json({ payment, paymentUrl: result.payment_url, invoiceId: result.invoice_id, finalAmount: result.final_amount });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/payments/boost/:postId", requireAuth, async (req, res) => {
    try {
      const post = await storage.getPost(req.params.postId);
      if (!post) return res.status(404).json({ message: "Postingan tidak ditemukan" });
      if (post.userId !== req.session.userId!) return res.status(403).json({ message: "Hanya bisa boost postingan sendiri" });
      const result = await createBayarPayment(5000, `CTRXL48 Boost: ${post.title.substring(0, 30)}`);
      const payment = await storage.createPayment({
        userId: req.session.userId!,
        type: "boost",
        amount: 5000,
        invoiceId: result.invoice_id,
        metadata: { postId: post.id },
      });
      res.json({ payment, paymentUrl: result.payment_url, invoiceId: result.invoice_id, finalAmount: result.final_amount });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/payments/tip/:postId", requireAuth, async (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount || amount < 1000) return res.status(400).json({ message: "Minimum tip Rp 1.000" });
      const post = await storage.getPost(req.params.postId);
      if (!post) return res.status(404).json({ message: "Postingan tidak ditemukan" });
      if (post.userId === req.session.userId!) return res.status(400).json({ message: "Tidak bisa tip diri sendiri" });
      const result = await createBayarPayment(amount, `CTRXL48 Tip untuk postingan: ${post.title.substring(0, 30)}`);
      const payment = await storage.createPayment({
        userId: req.session.userId!,
        type: "tip",
        amount,
        invoiceId: result.invoice_id,
        metadata: { postId: post.id },
      });
      res.json({ payment, paymentUrl: result.payment_url, invoiceId: result.invoice_id, finalAmount: result.final_amount });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/payments/group/:slug", requireAuth, async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.slug, req.session.userId!);
      if (!group) return res.status(404).json({ message: "Grup tidak ditemukan" });
      if (group.isMember) return res.status(400).json({ message: "Kamu sudah jadi anggota" });
      const price = 10000;
      const result = await createBayarPayment(price, `CTRXL48 Gabung Grup: ${group.name}`);
      const payment = await storage.createPayment({
        userId: req.session.userId!,
        type: "group",
        amount: price,
        invoiceId: result.invoice_id,
        metadata: { groupSlug: group.slug, groupId: group.id },
      });
      res.json({ payment, paymentUrl: result.payment_url, invoiceId: result.invoice_id, finalAmount: result.final_amount });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/payments/check/:invoiceId", requireAuth, async (req, res) => {
    try {
      const payment = await storage.getPaymentByInvoice(req.params.invoiceId);
      if (!payment) return res.status(404).json({ message: "Pembayaran tidak ditemukan" });
      if (payment.userId !== req.session.userId!) return res.status(403).json({ message: "Akses ditolak" });
      if (payment.status === "paid") {
        return res.json({ status: "paid", payment });
      }
      const check = await checkBayarPayment(req.params.invoiceId);
      if (check.status === "paid" || check.status === "completed") {
        await storage.updatePaymentStatus(payment.invoiceId, "paid");
        await applyPaymentBenefits(payment);
        const updated = await storage.getPaymentByInvoice(payment.invoiceId);
        return res.json({ status: "paid", payment: updated });
      }
      res.json({ status: check.status, payment });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/payments/webhook", async (req, res) => {
    try {
      const { invoice_id } = req.body;
      if (!invoice_id) return res.status(400).json({ message: "Missing invoice_id" });
      const payment = await storage.getPaymentByInvoice(invoice_id);
      if (!payment) return res.status(404).json({ message: "Payment not found" });
      if (payment.status === "paid") return res.json({ ok: true });
      const verified = await checkBayarPayment(invoice_id);
      if (verified.status === "paid" || verified.status === "completed") {
        await storage.updatePaymentStatus(invoice_id, "paid");
        await applyPaymentBenefits(payment);
      }
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/payments/history", requireAuth, async (req, res) => {
    const payments = await storage.getUserPayments(req.session.userId!);
    res.json(payments);
  });

  app.get("/api/ads", async (req, res) => {
    const placement = req.query.placement as string | undefined;
    if (placement) {
      const placementAds = await storage.getAdsByPlacement(placement);
      return res.json(placementAds);
    }
    const activeAds = await storage.getActiveAds();
    res.json(activeAds);
  });

  app.post("/api/admin/ads", requireAdmin, async (req, res) => {
    try {
      const { title, imageUrl, linkUrl, placement } = req.body;
      if (!title || !imageUrl || !linkUrl) {
        return res.status(400).json({ message: "Semua field diperlukan" });
      }
      const validPlacements = ["sidebar", "feed", "header", "post_detail"];
      const adPlacement = validPlacements.includes(placement) ? placement : "sidebar";
      const ad = await storage.createAd({ title, imageUrl, linkUrl, placement: adPlacement });
      res.json(ad);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/admin/ads/:id", requireAdmin, async (req, res) => {
    await storage.deleteAd(req.params.id);
    res.json({ ok: true });
  });

  app.get("/api/admin/payments", requireAdmin, async (req, res) => {
    const allPayments = await storage.getAllPayments();
    res.json(allPayments);
  });

  storage.seedDefaultAchievements().catch(console.error);

  app.get("/api/polls/:postId", async (req, res) => {
    const poll = await storage.getPollByPost(req.params.postId, req.session.userId);
    if (!poll) return res.status(404).json({ message: "Poll tidak ditemukan" });
    res.json(poll);
  });

  app.post("/api/polls/:postId/vote", requireAuth, async (req, res) => {
    try {
      const poll = await storage.getPollByPost(req.params.postId);
      if (!poll) return res.status(404).json({ message: "Poll tidak ditemukan" });
      if (poll.userVotedOptionId) return res.status(400).json({ message: "Kamu sudah memilih" });
      const { optionId } = req.body;
      if (!optionId || !poll.options.find(o => o.id === optionId)) {
        return res.status(400).json({ message: "Opsi tidak valid" });
      }
      await storage.votePoll(poll.id, optionId, req.session.userId!);
      const updated = await storage.getPollByPost(req.params.postId, req.session.userId);
      res.json(updated);
    } catch (e: any) {
      if (e.message?.includes("duplicate") || e.code === "23505") {
        return res.status(400).json({ message: "Kamu sudah memilih" });
      }
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/reactions", requireAuth, async (req, res) => {
    try {
      const parsed = insertReactionSchema.parse(req.body);
      const validEmojis = ["🔥", "💀", "😂", "🤡", "👏", "💯", "🤮", "🫡"];
      if (!validEmojis.includes(parsed.emoji)) {
        return res.status(400).json({ message: "Emoji tidak valid" });
      }
      await storage.addReaction(parsed.postId, req.session.userId!, parsed.emoji);
      const reactions = await storage.getPostReactions(parsed.postId, req.session.userId);
      res.json(reactions);
    } catch (e: any) {
      if (e.message?.includes("duplicate") || e.code === "23505") {
        await storage.removeReaction(req.body.postId, req.session.userId!, req.body.emoji);
        const reactions = await storage.getPostReactions(req.body.postId, req.session.userId);
        return res.json(reactions);
      }
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/reactions", requireAuth, async (req, res) => {
    try {
      const { postId, emoji } = req.body;
      await storage.removeReaction(postId, req.session.userId!, emoji);
      const reactions = await storage.getPostReactions(postId, req.session.userId);
      res.json(reactions);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    const data = await storage.getLeaderboard();
    res.json(data);
  });

  app.get("/api/achievements", async (req, res) => {
    const all = await storage.getAllAchievements();
    res.json(all);
  });

  app.get("/api/users/:username/achievements", async (req, res) => {
    const user = await storage.getUserByUsername(req.params.username);
    if (!user) return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    const achs = await storage.getUserAchievements(user.id);
    res.json(achs);
  });

  app.get("/api/threads/:threadId", async (req, res) => {
    const threadPosts = await storage.getThreadPosts(req.params.threadId, req.session.userId);
    res.json(threadPosts);
  });

  app.get("/api/tags/trending", async (_req, res) => {
    const tags = await storage.getTrendingTags(20);
    res.json(tags);
  });

  app.get("/api/whispers", requireAuth, async (req, res) => {
    const list = await storage.getWhispers(req.session.userId!);
    res.json(list);
  });

  app.post("/api/whispers", requireAuth, async (req, res) => {
    const { insertWhisperSchema } = await import("@shared/schema");
    const parsed = insertWhisperSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Data tidak valid" });
    }
    const { toUsername, content } = parsed.data;
    const toUser = await storage.getUserByUsername(toUsername);
    if (!toUser) return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    if (toUser.id === req.session.userId) return res.status(400).json({ message: "Tidak bisa mengirim bisikan ke diri sendiri" });

    const canSend = await storage.canSendWhisper(req.session.userId!, toUser.id);
    if (!canSend) return res.status(429).json({ message: "Kamu sudah mengirim bisikan ke pengguna ini hari ini. Coba lagi besok." });

    const whisper = await storage.sendWhisper(req.session.userId!, toUser.id, content);
    await storage.createNotification({
      userId: toUser.id,
      type: "whisper",
      message: "Seseorang mengirim bisikan anonim kepadamu",
      fromUserId: req.session.userId!,
    });
    res.json(whisper);
  });

  app.patch("/api/whispers/:id/read", requireAuth, async (req, res) => {
    await storage.markWhisperRead(req.params.id, req.session.userId!);
    res.json({ success: true });
  });

  const KARMA_SHOP_ITEMS = [
    { key: "custom_flair", name: "Flair Kustom", description: "Buka warna flair kustom untuk postinganmu", cost: 50, icon: "Palette" },
    { key: "pin_post_1h", name: "Pin 1 Jam", description: "Pin postingan kamu di feed selama 1 jam", cost: 100, icon: "Pin" },
    { key: "double_vote", name: "Vote 2x", description: "Vote berikutnya bernilai ganda", cost: 75, icon: "Zap" },
    { key: "golden_border", name: "Border Emas", description: "Border emas di semua postinganmu selama 24 jam", cost: 150, icon: "Crown" },
    { key: "emoji_vip", name: "Emoji VIP", description: "Buka reaksi emoji eksklusif", cost: 200, icon: "Sparkles" },
  ];

  app.get("/api/karma-shop/items", async (_req, res) => {
    res.json(KARMA_SHOP_ITEMS);
  });

  app.post("/api/karma-shop/purchase", requireAuth, async (req, res) => {
    const { itemKey } = req.body;
    const item = KARMA_SHOP_ITEMS.find(i => i.key === itemKey);
    if (!item) return res.status(400).json({ message: "Item tidak ditemukan" });

    try {
      const purchase = await storage.purchaseKarmaItem(req.session.userId!, item.key, item.cost);
      res.json({ purchase, message: `Berhasil membeli ${item.name}!` });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Gagal membeli item" });
    }
  });

  app.get("/api/recap", async (_req, res) => {
    const recap = await storage.getDailyRecap();
    res.json(recap);
  });

  // === Wallet ===
  app.get("/api/wallet", requireAuth, async (req, res) => {
    const [balance, transactions, userWithdrawals] = await Promise.all([
      storage.getUserWalletBalance(req.session.userId!),
      storage.getWalletTransactions(req.session.userId!),
      storage.getWithdrawals(req.session.userId!),
    ]);
    res.json({ balance, transactions, withdrawals: userWithdrawals });
  });

  app.post("/api/wallet/withdraw", requireAuth, async (req, res) => {
    try {
      const { withdrawalSchema } = await import("@shared/schema");
      const parsed = withdrawalSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || "Data tidak valid" });
      const { amount, method, accountName, accountNumber } = parsed.data;

      const minWithdraw = parseInt(await storage.getAdminSetting("min_withdrawal") || "10000", 10);
      if (amount < minWithdraw) return res.status(400).json({ message: `Minimum penarikan Rp ${minWithdraw.toLocaleString("id-ID")}` });

      const withdrawal = await storage.createWithdrawal({
        userId: req.session.userId!,
        amount,
        method,
        accountName,
        accountNumber,
      });
      res.json(withdrawal);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // === Username Management ===
  app.post("/api/profile/change-username", requireAuth, async (req, res) => {
    try {
      const { changeUsernameSchema } = await import("@shared/schema");
      const parsed = changeUsernameSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || "Username tidak valid" });

      const { newUsername } = parsed.data;
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) return res.status(404).json({ message: "User tidak ditemukan" });

      if (newUsername.toLowerCase() === currentUser.username.toLowerCase()) {
        return res.status(400).json({ message: "Username sama dengan yang sekarang" });
      }

      const existing = await storage.getUserByUsername(newUsername);
      if (existing) return res.status(400).json({ message: "Username sudah digunakan" });

      const reserved = await storage.isUsernameReserved(newUsername);
      if (reserved && reserved.isAvailable) {
        return res.status(400).json({
          message: `Username "${newUsername}" adalah username premium. Harga: Rp ${reserved.price.toLocaleString("id-ID")}`,
          reserved: true,
          reservedId: reserved.id,
          price: reserved.price,
        });
      }

      const isShort = newUsername.length <= 3;
      if (isShort) {
        const shortPrice = parseInt(await storage.getAdminSetting("short_username_price") || "100000", 10);
        return res.status(400).json({
          message: `Username pendek (≤3 karakter) adalah premium. Harga: Rp ${shortPrice.toLocaleString("id-ID")}`,
          reserved: true,
          shortUsername: true,
          price: shortPrice,
        });
      }

      const updated = await storage.changeUsername(req.session.userId!, newUsername);
      res.json({ user: updated, message: "Username berhasil diubah" });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/payments/buy-username", requireAuth, async (req, res) => {
    try {
      const { username, reservedId } = req.body as { username?: string; reservedId?: string };
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

      let price = 0;
      let targetUsername = "";

      if (reservedId && username) {
        const reserved = await storage.isUsernameReserved(username);
        if (!reserved || !reserved.isAvailable || reserved.id !== reservedId) {
          return res.status(400).json({ message: "Username premium tidak tersedia" });
        }
        price = reserved.price;
        targetUsername = reserved.username;
      } else if (username && username.length <= 3) {
        price = parseInt(await storage.getAdminSetting("short_username_price") || "100000", 10);
        targetUsername = username;
        const existing = await storage.getUserByUsername(targetUsername);
        if (existing) return res.status(400).json({ message: "Username sudah digunakan" });
      } else {
        return res.status(400).json({ message: "Data tidak valid" });
      }

      const result = await createBayarPayment(price, `CTRXL48 Beli Username: ${targetUsername}`);
      const payment = await storage.createPayment({
        userId: user.id,
        type: "buy_username",
        amount: price,
        invoiceId: result.invoice_id,
        metadata: { targetUsername, reservedId },
      });
      res.json({ payment, paymentUrl: result.payment_url, invoiceId: result.invoice_id, finalAmount: result.final_amount });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // === Reserved Usernames (Admin) ===
  app.get("/api/reserved-usernames", async (_req, res) => {
    const list = await storage.getReservedUsernames();
    res.json(list.filter(u => u.isAvailable));
  });

  app.get("/api/admin/reserved-usernames", requireAdmin, async (_req, res) => {
    const list = await storage.getReservedUsernames();
    res.json(list);
  });

  app.post("/api/admin/reserved-usernames", requireAdmin, async (req, res) => {
    try {
      const { username, price, category, glowColor } = req.body as { username: string; price: number; category: string; glowColor?: string };
      if (!username) return res.status(400).json({ message: "Username wajib diisi" });
      const result = await storage.addReservedUsername({
        username: username.toLowerCase(),
        price: price || 50000,
        category: category || "premium",
        glowColor: glowColor || null,
      });
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/admin/reserved-usernames/:id", requireAdmin, async (req, res) => {
    await storage.removeReservedUsername(req.params.id);
    res.json({ ok: true });
  });

  // === Admin Withdrawals ===
  app.get("/api/admin/withdrawals", requireAdmin, async (_req, res) => {
    const list = await storage.getAllWithdrawals();
    res.json(list);
  });

  app.patch("/api/admin/withdrawals/:id", requireAdmin, async (req, res) => {
    const { status, adminNote } = req.body as { status: string; adminNote?: string };
    const updated = await storage.updateWithdrawalStatus(req.params.id, status, adminNote);
    if (!updated) return res.status(404).json({ message: "Penarikan tidak ditemukan" });
    res.json(updated);
  });

  return httpServer;
}

async function applyPaymentBenefits(payment: { userId: string; type: string; metadata: any; invoiceId: string; id: string }) {
  switch (payment.type) {
    case "premium": {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await storage.updateUser(payment.userId, { isPremium: true, premiumExpiresAt: expiresAt });
      break;
    }
    case "verified": {
      await storage.updateUser(payment.userId, { isVerified: true });
      break;
    }
    case "premium_username": {
      await storage.updateUser(payment.userId, { isPremiumUsername: true, usernameGlow: "purple" });
      break;
    }
    case "boost": {
      const meta = payment.metadata as { postId: string } | null;
      if (meta?.postId) {
        const post = await storage.getPost(meta.postId);
        if (post) {
          await storage.updatePost(post.id, { heat: post.heat + 100 });
        }
      }
      break;
    }
    case "tip": {
      const meta = payment.metadata as { postId: string } | null;
      if (meta?.postId) {
        const post = await storage.getPost(meta.postId);
        if (post) {
          await storage.createTip({
            fromUserId: payment.userId,
            toPostId: meta.postId,
            amount: payment.amount,
            paymentId: payment.id,
          });
          const repBonus = Math.max(1, Math.floor(payment.amount / 1000));
          const postOwner = await storage.getUser(post.userId);
          if (postOwner) {
            await storage.updateUser(post.userId, {
              reputation: postOwner.reputation + repBonus,
              walletBalance: postOwner.walletBalance + payment.amount,
            });
            await storage.addWalletTransaction({
              userId: post.userId,
              type: "tip_received",
              amount: payment.amount,
              metadata: { fromUserId: payment.userId, postId: post.id, postTitle: post.title.substring(0, 50) },
            });
          }
          await storage.createNotification({
            userId: post.userId,
            type: "tip",
            message: `Seseorang memberi tip Rp ${payment.amount.toLocaleString("id-ID")} pada postingan "${post.title.substring(0, 40)}" — saldo wallet bertambah!`,
            postId: post.id,
            fromUserId: payment.userId,
          });
        }
      }
      break;
    }
    case "buy_username": {
      const meta = payment.metadata as { targetUsername: string; reservedId?: string; glowColor?: string } | null;
      if (meta?.targetUsername) {
        await storage.changeUsername(payment.userId, meta.targetUsername);
        let glowColor = meta.glowColor || null;
        if (meta.reservedId) {
          const reserved = await storage.getReservedUsername(meta.reservedId);
          if (reserved?.glowColor) glowColor = reserved.glowColor;
          await storage.purchaseUsername(payment.userId, meta.reservedId);
        }
        await storage.updateUser(payment.userId, { isPremiumUsername: true, usernameGlow: glowColor || "#8b5cf6,#ec4899" });
      }
      break;
    }
    case "group": {
      const meta = payment.metadata as { groupId: string; groupSlug: string } | null;
      if (meta?.groupId) {
        try {
          await storage.joinGroup(meta.groupId, payment.userId);
        } catch {}
      }
      break;
    }
  }
}
