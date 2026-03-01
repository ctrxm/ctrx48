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
  isPremiumUsername: boolean("is_premium_username").notNull().default(false),
  usernameGlow: text("username_glow"),
  walletBalance: integer("wallet_balance").notNull().default(0),
  customFlair: text("custom_flair"),
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

export const reservedUsernames = pgTable("reserved_usernames", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  price: integer("price").notNull().default(50000),
  category: text("category").notNull().default("premium"),
  glowColor: text("glow_color"),
  isAvailable: boolean("is_available").notNull().default(true),
  purchasedBy: uuid("purchased_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("completed"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_wallet_transactions_user").on(table.userId),
]);

export const withdrawals = pgTable("withdrawals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  method: text("method").notNull(),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number").notNull(),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_withdrawals_user").on(table.userId),
]);

export const userLevels = pgTable("user_levels", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("unique_user_level").on(table.userId),
  index("idx_user_levels_user").on(table.userId),
]);

export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default("daily"),
  metric: text("metric").notNull(),
  target: integer("target").notNull().default(1),
  rewardKarma: integer("reward_karma").notNull().default(50),
  startsAt: timestamp("starts_at").notNull().defaultNow(),
  endsAt: timestamp("ends_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const challengeProgress = pgTable("challenge_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengeId: uuid("challenge_id").notNull().references(() => challenges.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  progress: integer("progress").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("unique_challenge_user").on(table.challengeId, table.userId),
  index("idx_challenge_progress_user").on(table.userId),
]);

export const rivals = pgTable("rivals", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengerId: uuid("challenger_id").notNull().references(() => users.id),
  opponentId: uuid("opponent_id").notNull().references(() => users.id),
  topic: text("topic").notNull(),
  challengerArgument: text("challenger_argument"),
  opponentArgument: text("opponent_argument"),
  challengerVotes: integer("challenger_votes").notNull().default(0),
  opponentVotes: integer("opponent_votes").notNull().default(0),
  status: text("status").notNull().default("pending"),
  winnerId: uuid("winner_id"),
  rewardKarma: integer("reward_karma").notNull().default(100),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rivalVotes = pgTable("rival_votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  rivalId: uuid("rival_id").notNull().references(() => rivals.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  votedFor: uuid("voted_for").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("unique_rival_vote").on(table.rivalId, table.userId),
]);

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: text("room_id").notNull().default("global"),
  userId: uuid("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_chat_messages_room").on(table.roomId),
  index("idx_chat_messages_expires").on(table.expiresAt),
]);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id").notNull().references(() => users.id),
  postId: uuid("post_id").references(() => posts.id),
  commentId: uuid("comment_id").references(() => comments.id),
  reason: text("reason").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  juryVotesGuilty: integer("jury_votes_guilty").notNull().default(0),
  juryVotesInnocent: integer("jury_votes_innocent").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_reports_status").on(table.status),
]);

export const reportVotes = pgTable("report_votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id").notNull().references(() => reports.id),
  jurorId: uuid("juror_id").notNull().references(() => users.id),
  verdict: text("verdict").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("unique_report_juror").on(table.reportId, table.jurorId),
]);

export const awards = pgTable("awards", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  icon: text("icon").notNull(),
  cost: integer("cost").notNull(),
  walletReward: integer("wallet_reward").notNull().default(0),
  description: text("description").notNull(),
  color: text("color").notNull().default("#f97316"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const postAwards = pgTable("post_awards", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id),
  awardId: uuid("award_id").notNull().references(() => awards.id),
  fromUserId: uuid("from_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_post_awards_post").on(table.postId),
]);

export const bounties = pgTable("bounties", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("active"),
  winnerId: uuid("winner_id"),
  winnerCommentId: uuid("winner_comment_id"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_bounties_post").on(table.postId),
  index("idx_bounties_status").on(table.status),
]);

export const globalPolls = pgTable("global_polls", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const globalPollOptions = pgTable("global_poll_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  pollId: uuid("poll_id").notNull().references(() => globalPolls.id),
  text: text("text").notNull(),
  voteCount: integer("vote_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_global_poll_options_poll").on(table.pollId),
]);

export const globalPollVotes = pgTable("global_poll_votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  pollId: uuid("poll_id").notNull().references(() => globalPolls.id),
  optionId: uuid("option_id").notNull().references(() => globalPollOptions.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("unique_global_poll_vote").on(table.pollId, table.userId),
]);

export const userProfileThemes = pgTable("user_profile_themes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  backgroundColor: text("background_color"),
  gradientFrom: text("gradient_from"),
  gradientTo: text("gradient_to"),
  pattern: text("pattern"),
  accentColor: text("accent_color"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("unique_user_theme").on(table.userId),
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

export const changeUsernameSchema = z.object({
  newUsername: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Username hanya boleh huruf, angka, dan underscore"),
});

export const WITHDRAWAL_METHODS = [
  "BCA", "Mandiri", "BRI", "BNI", "GoPay", "OVO", "DANA", "ShopeePay"
] as const;

export const withdrawalSchema = z.object({
  amount: z.number().min(10000, "Minimum penarikan Rp 10.000"),
  method: z.enum(WITHDRAWAL_METHODS, { errorMap: () => ({ message: "Metode penarikan tidak valid" }) }),
  accountName: z.string().min(1, "Nama pemilik rekening wajib diisi").max(100),
  accountNumber: z.string().min(1, "Nomor rekening wajib diisi").max(50),
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

export const insertChallengeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  type: z.enum(["daily", "weekly"]),
  metric: z.string().min(1),
  target: z.number().min(1),
  rewardKarma: z.number().min(1),
  endsAt: z.string(),
});

export const insertRivalSchema = z.object({
  opponentUsername: z.string().min(1),
  topic: z.string().min(1).max(200),
  challengerArgument: z.string().min(1).max(2000),
});

export const insertChatMessageSchema = z.object({
  roomId: z.string().min(1).default("global"),
  content: z.string().min(1).max(500),
});

export const insertReportSchema = z.object({
  postId: z.string().uuid().optional(),
  commentId: z.string().uuid().optional(),
  reason: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const insertAwardSchema = z.object({
  postId: z.string().uuid(),
  awardId: z.string().uuid(),
});

export const insertBountySchema = z.object({
  postId: z.string().uuid(),
  amount: z.number().min(100, "Minimum bounty Rp 100"),
});

export const insertGlobalPollSchema = z.object({
  title: z.string().min(1).max(200),
  options: z.array(z.string().min(1).max(200)).min(2).max(6),
  expiresInHours: z.number().min(1).max(168).default(24),
});

export const insertProfileThemeSchema = z.object({
  backgroundColor: z.string().max(20).optional(),
  gradientFrom: z.string().max(20).optional(),
  gradientTo: z.string().max(20).optional(),
  pattern: z.string().max(50).optional(),
  accentColor: z.string().max(20).optional(),
});

export const customFlairSchema = z.object({
  flair: z.string().min(1).max(20),
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
export type UserLevel = typeof userLevels.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type ChallengeProgress = typeof challengeProgress.$inferSelect;
export type Rival = typeof rivals.$inferSelect;
export type RivalVote = typeof rivalVotes.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type ReportVote = typeof reportVotes.$inferSelect;
export type Award = typeof awards.$inferSelect;
export type PostAward = typeof postAwards.$inferSelect;
export type Bounty = typeof bounties.$inferSelect;
export type GlobalPoll = typeof globalPolls.$inferSelect;
export type GlobalPollOption = typeof globalPollOptions.$inferSelect;
export type GlobalPollVote = typeof globalPollVotes.$inferSelect;
export type UserProfileTheme = typeof userProfileThemes.$inferSelect;

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
  isPremiumUsername?: boolean;
  usernameGlow?: string | null;
  customFlair?: string | null;
  tipTotal?: number;
  reactions?: ReactionSummary[];
  poll?: PollWithResults | null;
  awards?: { name: string; icon: string; color: string; count: number }[];
  bounty?: { amount: number; status: string } | null;
  userLevel?: number;
  userRank?: string;
};

export type CommentWithUser = Comment & {
  username: string;
  isPublicEnemy: boolean;
  isPremiumUsername?: boolean;
  usernameGlow?: string | null;
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
  isPremiumUsername: boolean;
  usernameGlow: string | null;
  customFlair: string | null;
  walletBalance: number;
  createdAt: Date | string;
  postCount: number;
  commentCount: number;
  badges: (Badge & { awardedAt: Date | string })[];
  level?: number;
  xp?: number;
  rank?: string;
  profileTheme?: UserProfileTheme | null;
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
export type ReservedUsername = typeof reservedUsernames.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type Withdrawal = typeof withdrawals.$inferSelect;

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

export type RivalWithUsers = Rival & {
  challengerUsername: string;
  opponentUsername: string;
  challengerAvatarUrl?: string | null;
  opponentAvatarUrl?: string | null;
  userVote?: string | null;
};

export type ChatMessageWithUser = ChatMessage & {
  username: string;
  avatarUrl?: string | null;
};

export type GlobalPollWithOptions = GlobalPoll & {
  options: { id: string; text: string; voteCount: number }[];
  totalVotes: number;
  userVotedOptionId?: string | null;
  creatorUsername: string;
};

export type ChallengeWithProgress = Challenge & {
  userProgress?: number;
  userCompleted?: boolean;
};

export type UserStats = {
  totalPosts: number;
  totalComments: number;
  totalUpvotesReceived: number;
  totalDownvotesReceived: number;
  topPost: PostWithUser | null;
  favoriteHour: number;
  activityGraph: { date: string; posts: number; comments: number }[];
  favoriteTags: { tag: string; count: number }[];
};

export function getRankFromLevel(level: number): string {
  if (level >= 30) return "Legend";
  if (level >= 20) return "Elite";
  if (level >= 10) return "Veteran";
  if (level >= 5) return "Regular";
  return "Newbie";
}

export function getLevelFromXP(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100));
}

export function getXPForLevel(level: number): number {
  return level * level * 100;
}

export const AWARD_TYPES = [
  { key: "fire", name: "Api 🔥", icon: "🔥", cost: 500, walletReward: 250, description: "Postingan ini panas!", color: "#f97316" },
  { key: "gold", name: "Emas ⭐", icon: "⭐", cost: 1000, walletReward: 500, description: "Postingan berkualitas emas", color: "#eab308" },
  { key: "diamond", name: "Berlian 💎", icon: "💎", cost: 2500, walletReward: 1250, description: "Postingan legendaris!", color: "#06b6d4" },
  { key: "crown", name: "Mahkota 👑", icon: "👑", cost: 5000, walletReward: 2500, description: "Yang terbaik dari yang terbaik", color: "#a855f7" },
] as const;

export const REPORT_REASONS = [
  "Spam",
  "Konten tidak pantas",
  "Ujaran kebencian",
  "Pelecehan",
  "Informasi palsu",
  "Pelanggaran hak cipta",
  "Lainnya",
] as const;
