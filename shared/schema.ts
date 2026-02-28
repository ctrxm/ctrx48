import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, uuid, unique, jsonb, index } from "drizzle-orm/pg-core";
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
  isPremium: boolean("is_premium").notNull().default(false),
  premiumExpiresAt: timestamp("premium_expires_at"),
  isVerified: boolean("is_verified").notNull().default(false),
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
  groupId: uuid("group_id").references(() => groups.id),
  flair: text("flair"),
  score: integer("score").notNull().default(0),
  heat: integer("heat").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  isLocked: boolean("is_locked").notNull().default(false),
  isConfession: boolean("is_confession").notNull().default(false),
  isPinned: boolean("is_pinned").notNull().default(false),
  pinnedAt: timestamp("pinned_at"),
  threadId: uuid("thread_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_posts_active_feed").on(table.isDeleted, table.expiresAt, table.score),
  index("idx_posts_user_id").on(table.userId),
  index("idx_posts_group_id").on(table.groupId),
  index("idx_posts_created_at").on(table.createdAt),
  index("idx_posts_thread_id").on(table.threadId),
]);

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  parentId: uuid("parent_id"),
  content: text("content").notNull(),
  score: integer("score").notNull().default(0),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_comments_post_id").on(table.postId),
  index("idx_comments_user_id").on(table.userId),
]);

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
  index("idx_votes_post_id").on(table.postId),
  index("idx_votes_comment_id").on(table.commentId),
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

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  message: text("message").notNull(),
  postId: uuid("post_id"),
  fromUserId: uuid("from_user_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_notifications_user_id").on(table.userId),
  index("idx_notifications_unread").on(table.userId, table.isRead),
]);

export const bookmarks = pgTable("bookmarks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  postId: uuid("post_id").notNull().references(() => posts.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("unique_user_bookmark").on(table.userId, table.postId),
]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  invoiceId: text("invoice_id").notNull(),
  status: text("status").notNull().default("pending"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tips = pgTable("tips", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromUserId: uuid("from_user_id").notNull().references(() => users.id),
  toPostId: uuid("to_post_id").notNull().references(() => posts.id),
  amount: integer("amount").notNull(),
  paymentId: uuid("payment_id").references(() => payments.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_tips_to_post_id").on(table.toPostId),
]);

export const ads = pgTable("ads", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url").notNull(),
  placement: text("placement").notNull().default("sidebar"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const polls = pgTable("polls", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_polls_post_id").on(table.postId),
]);

export const pollOptions = pgTable("poll_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  pollId: uuid("poll_id").notNull().references(() => polls.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_poll_options_poll_id").on(table.pollId),
]);

export const pollVotes = pgTable("poll_votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  pollId: uuid("poll_id").notNull().references(() => polls.id),
  optionId: uuid("option_id").notNull().references(() => pollOptions.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("unique_poll_user_vote").on(table.pollId, table.userId),
  index("idx_poll_votes_poll_id").on(table.pollId),
]);

export const reactions = pgTable("reactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("unique_post_user_reaction").on(table.postId, table.userId, table.emoji),
  index("idx_reactions_post_id").on(table.postId),
]);

export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  category: text("category").notNull(),
  threshold: integer("threshold").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userAchievements = pgTable("user_achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  achievementId: uuid("achievement_id").notNull().references(() => achievements.id),
  unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
}, (table) => [
  unique("unique_user_achievement").on(table.userId, table.achievementId),
  index("idx_user_achievements_user_id").on(table.userId),
]);

export const whispers = pgTable("whispers", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromUserId: uuid("from_user_id").notNull().references(() => users.id),
  toUserId: uuid("to_user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_whispers_to_user").on(table.toUserId),
  index("idx_whispers_from_user").on(table.fromUserId),
]);

export const karmaPurchases = pgTable("karma_purchases", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  itemKey: text("item_key").notNull(),
  cost: integer("cost").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_karma_purchases_user").on(table.userId),
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
  groupId: true,
  flair: true,
}).extend({
  isConfession: z.boolean().optional(),
  threadId: z.string().uuid().optional(),
  pollOptions: z.array(z.string().min(1).max(200)).min(2).max(6).optional(),
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

export const insertReactionSchema = z.object({
  postId: z.string().uuid(),
  emoji: z.string().min(1).max(4),
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

export const insertWhisperSchema = z.object({
  toUsername: z.string().min(1),
  content: z.string().min(1).max(280),
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
export type Notification = typeof notifications.$inferSelect;
export type Bookmark = typeof bookmarks.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Tip = typeof tips.$inferSelect;
export type Ad = typeof ads.$inferSelect;
export type Poll = typeof polls.$inferSelect;
export type PollOption = typeof pollOptions.$inferSelect;
export type PollVote = typeof pollVotes.$inferSelect;
export type Reaction = typeof reactions.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;

export type PollWithResults = {
  id: string;
  postId: string;
  options: {
    id: string;
    text: string;
    voteCount: number;
  }[];
  totalVotes: number;
  userVotedOptionId?: string | null;
};

export type ReactionSummary = {
  emoji: string;
  count: number;
  userReacted: boolean;
};

export type PostWithUser = Post & {
  username: string;
  commentCount: number;
  isPublicEnemy: boolean;
  userVote: number | null;
  avatarUrl?: string | null;
  groupSlug?: string | null;
  groupName?: string | null;
  isBookmarked?: boolean;
  isPremiumUser?: boolean;
  isVerifiedUser?: boolean;
  tipTotal?: number;
  reactions?: ReactionSummary[];
  poll?: PollWithResults | null;
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
  isPremium: boolean;
  isVerified: boolean;
  createdAt: Date | string;
  postCount: number;
  commentCount: number;
  badges: (Badge & { awardedAt: Date | string })[];
};

export type GroupWithInfo = Group & {
  memberCount: number;
  creatorUsername: string;
  isMember?: boolean;
  userRole?: string | null;
};

export type AchievementWithStatus = Achievement & {
  unlocked: boolean;
  unlockedAt?: Date | string | null;
};

export type Whisper = typeof whispers.$inferSelect;
export type KarmaPurchase = typeof karmaPurchases.$inferSelect;
export type InsertWhisper = z.infer<typeof insertWhisperSchema>;

export type TrendingTag = {
  tag: string;
  count: number;
};

export type DailyRecap = {
  topPost: PostWithUser | null;
  mostCommented: PostWithUser | null;
  mostReacted: PostWithUser | null;
  totalPosts: number;
  totalComments: number;
  totalReactions: number;
};

export type KarmaShopItem = {
  key: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
};
