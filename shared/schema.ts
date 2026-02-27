import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email"),
  emailVerified: boolean("email_verified").notNull().default(false),
  password: text("password").notNull(),
  displayName: text("display_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  role: text("role").notNull().default("user"),
  isBanned: boolean("is_banned").notNull().default(false),
  shadowBanned: boolean("shadow_banned").notNull().default(false),
  reputation: integer("reputation").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("text"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  linkTitle: text("link_title"),
  linkDescription: text("link_description"),
  linkImage: text("link_image"),
  userId: uuid("user_id").notNull().references(() => users.id),
  score: integer("score").notNull().default(0),
  heat: integer("heat").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  isLocked: boolean("is_locked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  parentId: uuid("parent_id"),
  content: text("content").notNull(),
  score: integer("score").notNull().default(0),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const votes = pgTable("votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  postId: uuid("post_id"),
  commentId: uuid("comment_id"),
  value: integer("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("unique_user_post_vote").on(table.userId, table.postId),
  unique("unique_user_comment_vote").on(table.userId, table.commentId),
]);

export const emailVerifications = pgTable("email_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminSettings = pgTable("admin_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const badges = pgTable("badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull().default("#f97316"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userBadges = pgTable("user_badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  badgeId: uuid("badge_id").notNull().references(() => badges.id),
  awardedAt: timestamp("awarded_at").notNull().defaultNow(),
}, (table) => [
  unique("unique_user_badge").on(table.userId, table.badgeId),
]);

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  isPrivate: boolean("is_private").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupMembers = pgTable("group_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => groups.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (table) => [
  unique("unique_group_member").on(table.groupId, table.userId),
]);

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const updateProfileSchema = z.object({
  displayName: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
});

export const insertPostSchema = createInsertSchema(posts).pick({
  title: true,
  content: true,
  type: true,
  imageUrl: true,
  linkUrl: true,
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  postId: true,
  content: true,
  parentId: true,
});

export const insertVoteSchema = z.object({
  postId: z.string().uuid().optional(),
  commentId: z.string().uuid().optional(),
  value: z.number().refine(v => v === 1 || v === -1),
});

export const emailOtpSchema = z.object({
  email: z.string().email(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const registerWithEmailSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
  email: z.string().email(),
  code: z.string().length(6),
});

export const insertBadgeSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().min(1).max(200),
  icon: z.string().min(1).max(50),
  color: z.string().optional(),
});

export const insertGroupSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Vote = typeof votes.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Badge = typeof badges.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type EmailVerification = typeof emailVerifications.$inferSelect;
export type AdminSetting = typeof adminSettings.$inferSelect;

export type PostWithUser = Post & {
  username: string;
  commentCount: number;
  isPublicEnemy: boolean;
  userVote: number | null;
  avatarUrl?: string | null;
};

export type CommentWithUser = Comment & {
  username: string;
  isPublicEnemy: boolean;
  userVote: number | null;
  replies?: CommentWithUser[];
};

export type UserProfile = {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  role: string;
  reputation: number;
  createdAt: Date | string;
  postCount: number;
  commentCount: number;
  badges: (Badge & { awardedAt: Date | string })[];
};

export type GroupWithInfo = Group & {
  memberCount: number;
  creatorUsername: string;
  isMember?: boolean;
};
