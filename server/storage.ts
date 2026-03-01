import {
  type User, type InsertUser, type Post, type InsertPost,
  type Comment, type InsertComment, type Vote, type InsertVote,
  type PostWithUser, type CommentWithUser, type UserProfile,
  type Badge, type UserBadge, type Group, type GroupMember,
  type GroupWithInfo, type EmailVerification, type AdminSetting,
  type Notification, type Bookmark, type Payment, type Tip, type Ad,
  type Poll, type PollOption, type PollVote, type Reaction,
  type Achievement, type UserAchievement, type PollWithResults,
  type ReactionSummary, type AchievementWithStatus,
  type ReservedUsername, type WalletTransaction, type Withdrawal,
  type UserLevel, type Challenge, type ChallengeProgress,
  type Rival, type RivalVote, type ChatMessage, type Report, type ReportVote,
  type Award, type PostAward, type Bounty,
  type GlobalPoll, type GlobalPollOption, type GlobalPollVote,
  type UserProfileTheme,
  users, posts, comments, votes,
  emailVerifications, adminSettings, badges, userBadges,
  groups, groupMembers, notifications, bookmarks,
  payments, tips, ads,
  polls, pollOptions, pollVotes, reactions,
  achievements, userAchievements,
  whispers, karmaPurchases,
  reservedUsernames, walletTransactions, withdrawals,
  userLevels, challenges, challengeProgress,
  rivals, rivalVotes, chatMessages,
  reports, reportVotes, awards, postAwards,
  bounties, globalPolls, globalPollOptions, globalPollVotes,
  userProfileThemes,
  getLevelFromXP, getRankFromLevel, AWARD_TYPES,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gt, sql, lt, ne, isNull, asc, inArray } from "drizzle-orm";

const settingsCache = new Map<string, { value: string; expiry: number }>();
const SETTINGS_TTL = 60_000;

function getCachedSetting(key: string): string | undefined {
  const entry = settingsCache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.value;
  settingsCache.delete(key);
  return undefined;
}

function setCachedSetting(key: string, value: string): void {
  settingsCache.set(key, { value, expiry: Date.now() + SETTINGS_TTL });
}

export function invalidateSettingsCache(): void {
  settingsCache.clear();
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser & { password: string; email?: string; emailVerified?: boolean }): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  createPost(post: InsertPost & { userId: string; linkTitle?: string; linkDescription?: string; linkImage?: string }): Promise<Post>;
  getPost(id: string): Promise<Post | undefined>;
  getPostWithUser(id: string, currentUserId?: string): Promise<PostWithUser | undefined>;
  getActivePosts(currentUserId?: string, excludeShadowBanned?: boolean): Promise<PostWithUser[]>;
  getAllPosts(): Promise<(Post & { username: string })[]>;
  updatePost(id: string, data: Partial<Post>): Promise<Post | undefined>;
  getGroupPosts(groupId: string, currentUserId?: string): Promise<PostWithUser[]>;

  createComment(comment: InsertComment & { userId: string }): Promise<Comment>;
  getCommentsByPost(postId: string, currentUserId?: string, excludeShadowBanned?: boolean): Promise<CommentWithUser[]>;
  getComment(id: string): Promise<Comment | undefined>;
  updateComment(id: string, data: Partial<Comment>): Promise<Comment | undefined>;
  getCommentCount(postId: string): Promise<number>;

  upsertVote(vote: InsertVote & { userId: string }): Promise<void>;
  getUserVote(userId: string, postId?: string, commentId?: string): Promise<Vote | undefined>;

  getUserProfile(username: string): Promise<UserProfile | undefined>;
  getUserPosts(username: string, currentUserId?: string): Promise<PostWithUser[]>;
  updateUserProfile(id: string, data: { displayName?: string; bio?: string; avatarUrl?: string; bannerUrl?: string }): Promise<User | undefined>;

  createEmailVerification(email: string, code: string): Promise<EmailVerification>;
  checkEmailCode(email: string, code: string): Promise<boolean>;
  verifyEmailCode(email: string, code: string): Promise<boolean>;

  getAdminSetting(key: string): Promise<string | undefined>;
  setAdminSetting(key: string, value: string): Promise<void>;
  getAllAdminSettings(): Promise<AdminSetting[]>;

  createBadge(badge: { name: string; description: string; icon: string; color?: string }): Promise<Badge>;
  getAllBadges(): Promise<Badge[]>;
  awardBadge(userId: string, badgeId: string): Promise<UserBadge>;
  revokeBadge(userId: string, badgeId: string): Promise<void>;
  getUserBadges(userId: string): Promise<(Badge & { awardedAt: Date | string })[]>;
  deleteBadge(id: string): Promise<void>;

  createGroup(group: { name: string; slug: string; description?: string; isPrivate?: boolean; createdBy: string }): Promise<Group>;
  getGroup(slug: string, userId?: string): Promise<GroupWithInfo | undefined>;
  getAllGroups(userId?: string): Promise<GroupWithInfo[]>;
  joinGroup(groupId: string, userId: string): Promise<GroupMember>;
  leaveGroup(groupId: string, userId: string): Promise<void>;
  getGroupMembers(groupId: string): Promise<(GroupMember & { username: string; avatarUrl?: string | null })[]>;
  setGroupMemberRole(groupId: string, userId: string, role: string): Promise<void>;
  getGroupMember(groupId: string, userId: string): Promise<GroupMember | undefined>;
  updateGroup(groupId: string, data: { avatarUrl?: string; bannerUrl?: string; description?: string }): Promise<Group>;

  createNotification(data: { userId: string; type: string; message: string; postId?: string; fromUserId?: string }): Promise<Notification>;
  getNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(id: string, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;

  createBookmark(userId: string, postId: string): Promise<Bookmark>;
  deleteBookmark(userId: string, postId: string): Promise<void>;
  getUserBookmarks(userId: string): Promise<PostWithUser[]>;
  isBookmarked(userId: string, postId: string): Promise<boolean>;

  createPayment(data: { userId: string; type: string; amount: number; invoiceId: string; metadata?: any }): Promise<Payment>;
  updatePaymentStatus(invoiceId: string, status: string): Promise<Payment | undefined>;
  getPaymentByInvoice(invoiceId: string): Promise<Payment | undefined>;
  getUserPayments(userId: string): Promise<Payment[]>;
  getAllPayments(): Promise<(Payment & { username: string })[]>;

  createTip(data: { fromUserId: string; toPostId: string; amount: number; paymentId: string }): Promise<Tip>;
  getPostTips(postId: string): Promise<number>;

  getActiveAds(): Promise<Ad[]>;
  getAdsByPlacement(placement: string): Promise<Ad[]>;
  createAd(data: { title: string; imageUrl: string; linkUrl: string; placement: string }): Promise<Ad>;
  deleteAd(id: string): Promise<void>;

  getStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalPosts: number;
    activePosts: number;
    deadPosts: number;
    shadowBannedUsers: number;
    publicEnemies: number;
  }>;

  createPoll(postId: string, options: string[]): Promise<Poll>;
  getPollByPost(postId: string, currentUserId?: string): Promise<PollWithResults | null>;
  votePoll(pollId: string, optionId: string, userId: string): Promise<void>;

  addReaction(postId: string, userId: string, emoji: string): Promise<Reaction>;
  removeReaction(postId: string, userId: string, emoji: string): Promise<void>;
  getPostReactions(postId: string, currentUserId?: string): Promise<ReactionSummary[]>;
  getPostsReactionsBatch(postIds: string[], currentUserId?: string): Promise<Map<string, ReactionSummary[]>>;

  getAllAchievements(): Promise<Achievement[]>;
  getUserAchievements(userId: string): Promise<AchievementWithStatus[]>;
  checkAndAwardAchievements(userId: string): Promise<AchievementWithStatus[]>;
  grantAllAchievements(userId: string): Promise<void>;
  seedDefaultAchievements(): Promise<void>;

  getThreadPosts(threadId: string, currentUserId?: string): Promise<PostWithUser[]>;
  checkAndPinPost(postId: string): Promise<void>;

  getLeaderboard(): Promise<{
    topUsers: { id: string; username: string; avatarUrl: string | null; reputation: number; isPremium: boolean; isVerified: boolean }[];
    topPosts: PostWithUser[];
    publicEnemies: { id: string; username: string; avatarUrl: string | null; reputation: number }[];
  }>;

  getTrendingTags(limit?: number): Promise<{ tag: string; count: number }[]>;

  sendWhisper(fromUserId: string, toUserId: string, content: string): Promise<any>;
  getWhispers(userId: string): Promise<any[]>;
  markWhisperRead(id: string, userId: string): Promise<void>;
  canSendWhisper(fromUserId: string, toUserId: string): Promise<boolean>;

  purchaseKarmaItem(userId: string, itemKey: string, cost: number): Promise<any>;
  getUserPurchases(userId: string): Promise<any[]>;

  getDailyRecap(): Promise<{
    topPost: PostWithUser | null;
    mostCommented: PostWithUser | null;
    mostReacted: PostWithUser | null;
    totalPosts: number;
    totalComments: number;
    totalReactions: number;
  }>;

  getReservedUsernames(): Promise<ReservedUsername[]>;
  getReservedUsername(id: string): Promise<ReservedUsername | undefined>;
  addReservedUsername(data: { username: string; price: number; category: string; glowColor?: string | null }): Promise<ReservedUsername>;
  removeReservedUsername(id: string): Promise<void>;
  isUsernameReserved(username: string): Promise<ReservedUsername | undefined>;
  purchaseUsername(userId: string, reservedId: string): Promise<void>;
  changeUsername(userId: string, newUsername: string): Promise<User | undefined>;

  getWalletTransactions(userId: string): Promise<WalletTransaction[]>;
  addWalletTransaction(data: { userId: string; type: string; amount: number; metadata?: any }): Promise<WalletTransaction>;
  getUserWalletBalance(userId: string): Promise<number>;

  getWithdrawals(userId: string): Promise<Withdrawal[]>;
  getAllWithdrawals(): Promise<(Withdrawal & { username: string })[]>;
  createWithdrawal(data: { userId: string; amount: number; method: string; accountName: string; accountNumber: string }): Promise<Withdrawal>;
  updateWithdrawalStatus(id: string, status: string, adminNote?: string): Promise<Withdrawal | undefined>;

  getUserLevel(userId: string): Promise<{xp: number; level: number}>;
  addXP(userId: string, amount: number): Promise<{xp: number; level: number}>;

  getActiveChallenges(userId?: string): Promise<any[]>;
  createChallenge(data: any): Promise<any>;
  updateChallengeProgress(challengeId: string, userId: string, increment: number): Promise<any>;

  createRival(data: any): Promise<any>;
  getRivals(userId?: string): Promise<any[]>;
  getRival(id: string, userId?: string): Promise<any>;
  submitRivalArgument(rivalId: string, userId: string, argument: string): Promise<any>;
  voteRival(rivalId: string, userId: string, votedFor: string): Promise<any>;

  getChatMessages(roomId: string): Promise<any[]>;
  createChatMessage(data: any): Promise<any>;
  cleanExpiredChatMessages(): Promise<void>;

  createReport(data: any): Promise<any>;
  getReports(status?: string): Promise<any[]>;
  voteReport(reportId: string, jurorId: string, verdict: string): Promise<any>;
  updateReportStatus(id: string, status: string): Promise<any>;

  getAwards(): Promise<any[]>;
  seedDefaultAwards(): Promise<void>;
  giveAward(postId: string, awardId: string, fromUserId: string): Promise<any>;
  getPostAwards(postId: string): Promise<any[]>;

  createBounty(data: any): Promise<any>;
  getPostBounty(postId: string): Promise<any>;
  awardBounty(bountyId: string, winnerId: string, commentId: string): Promise<any>;

  createGlobalPoll(data: any): Promise<any>;
  getActiveGlobalPolls(userId?: string): Promise<any[]>;
  voteGlobalPoll(pollId: string, optionId: string, userId: string): Promise<any>;

  getUserProfileTheme(userId: string): Promise<any>;
  setUserProfileTheme(userId: string, data: any): Promise<any>;

  getUserStats(username: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser & { password: string; email?: string; emailVerified?: boolean }): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async createPost(post: InsertPost & { userId: string; linkTitle?: string; linkDescription?: string; linkImage?: string; isConfession?: boolean; threadId?: string }): Promise<Post> {
    const user = await this.getUser(post.userId);
    const isActivePremium = user?.isPremium && user?.premiumExpiresAt && user.premiumExpiresAt > new Date();
    const hours = isActivePremium ? 168 : 48;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const { pollOptions: _pollOptions, ...postData } = post;
    const [created] = await db.insert(posts).values({ ...postData, expiresAt, isConfession: post.isConfession ?? false, threadId: post.threadId ?? null }).returning();
    return created;
  }

  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  private async enrichPostsBatch(postList: Post[], currentUserId?: string): Promise<PostWithUser[]> {
    if (postList.length === 0) return [];

    const postIds = postList.map(p => p.id);
    const userIds = [...new Set(postList.map(p => p.userId))];
    const groupIds = [...new Set(postList.filter(p => p.groupId).map(p => p.groupId!))];

    const [usersData, commentCounts, tipTotals, reactionsData, pollsData] = await Promise.all([
      db.select({
        id: users.id,
        username: users.username,
        reputation: users.reputation,
        avatarUrl: users.avatarUrl,
        isPremium: users.isPremium,
        premiumExpiresAt: users.premiumExpiresAt,
        isVerified: users.isVerified,
        shadowBanned: users.shadowBanned,
        isPremiumUsername: users.isPremiumUsername,
        usernameGlow: users.usernameGlow,
      }).from(users).where(inArray(users.id, userIds)),

      db.select({
        postId: comments.postId,
        count: sql<number>`count(*)::int`,
      }).from(comments)
        .where(and(inArray(comments.postId, postIds), eq(comments.isDeleted, false)))
        .groupBy(comments.postId),

      db.select({
        toPostId: tips.toPostId,
        total: sql<number>`coalesce(sum(amount), 0)::int`,
      }).from(tips)
        .where(inArray(tips.toPostId, postIds))
        .groupBy(tips.toPostId),

      db.select({
        postId: reactions.postId,
        emoji: reactions.emoji,
        count: sql<number>`count(*)::int`,
      }).from(reactions)
        .where(inArray(reactions.postId, postIds))
        .groupBy(reactions.postId, reactions.emoji),

      db.select({
        id: polls.id,
        postId: polls.postId,
      }).from(polls).where(inArray(polls.postId, postIds)),
    ]);

    const groupsData = groupIds.length > 0
      ? await db.select({ id: groups.id, slug: groups.slug, name: groups.name }).from(groups).where(inArray(groups.id, groupIds))
      : [];

    let userVotes: Vote[] = [];
    let userBookmarkSet = new Set<string>();
    let userReactionSet = new Set<string>();

    if (currentUserId) {
      const [votesData, bookmarksData, userReactionsData] = await Promise.all([
        db.select().from(votes)
          .where(and(eq(votes.userId, currentUserId), inArray(votes.postId, postIds))),
        db.select({ postId: bookmarks.postId }).from(bookmarks)
          .where(and(eq(bookmarks.userId, currentUserId), inArray(bookmarks.postId, postIds))),
        db.select({ postId: reactions.postId, emoji: reactions.emoji }).from(reactions)
          .where(and(eq(reactions.userId, currentUserId), inArray(reactions.postId, postIds))),
      ]);
      userVotes = votesData;
      userBookmarkSet = new Set(bookmarksData.map(b => b.postId));
      userReactionSet = new Set(userReactionsData.map(r => `${r.postId}:${r.emoji}`));
    }

    const reactionsMap = new Map<string, ReactionSummary[]>();
    for (const r of reactionsData) {
      if (!reactionsMap.has(r.postId)) reactionsMap.set(r.postId, []);
      reactionsMap.get(r.postId)!.push({
        emoji: r.emoji,
        count: r.count,
        userReacted: userReactionSet.has(`${r.postId}:${r.emoji}`),
      });
    }

    const pollPostIds = new Set(pollsData.map(p => p.postId));

    const usersMap = new Map(usersData.map(u => [u.id, u]));
    const commentCountMap = new Map(commentCounts.map(c => [c.postId, c.count]));
    const tipTotalMap = new Map(tipTotals.map(t => [t.toPostId, t.total]));
    const groupsMap = new Map(groupsData.map(g => [g.id, g]));
    const voteMap = new Map(userVotes.filter(v => v.postId).map(v => [v.postId!, v.value]));

    return postList.map(post => {
      const user = usersMap.get(post.userId);
      const group = post.groupId ? groupsMap.get(post.groupId) : null;
      const now = new Date();
      const isConfession = post.isConfession;

      return {
        ...post,
        username: isConfession ? "Anonim" : (user?.username ?? "[deleted]"),
        commentCount: commentCountMap.get(post.id) ?? 0,
        isPublicEnemy: isConfession ? false : ((user?.reputation ?? 0) <= -300),
        userVote: voteMap.get(post.id) ?? null,
        avatarUrl: isConfession ? null : (user?.avatarUrl ?? null),
        groupSlug: group?.slug ?? null,
        groupName: group?.name ?? null,
        isBookmarked: userBookmarkSet.has(post.id),
        isPremiumUser: isConfession ? false : ((user?.isPremium && user?.premiumExpiresAt && user.premiumExpiresAt > now) ?? false),
        isVerifiedUser: isConfession ? false : (user?.isVerified ?? false),
        isPremiumUsername: isConfession ? false : (user?.isPremiumUsername ?? false),
        usernameGlow: isConfession ? null : (user?.usernameGlow ?? null),
        tipTotal: tipTotalMap.get(post.id) ?? 0,
        reactions: reactionsMap.get(post.id) ?? [],
        poll: pollPostIds.has(post.id) ? { id: '', postId: post.id, options: [], totalVotes: 0, userVotedOptionId: null } : null,
      };
    });
  }

  private async enrichPost(post: Post, currentUserId?: string): Promise<PostWithUser> {
    const result = await this.enrichPostsBatch([post], currentUserId);
    return result[0];
  }

  async getPostWithUser(id: string, currentUserId?: string): Promise<PostWithUser | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    if (!post) return undefined;
    return this.enrichPost(post, currentUserId);
  }

  async getActivePosts(currentUserId?: string, excludeShadowBanned = true): Promise<PostWithUser[]> {
    const now = new Date();
    const allPosts = await db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.isDeleted, false),
          gt(posts.expiresAt, now),
          gt(posts.score, -200)
        )
      )
      .orderBy(desc(posts.isPinned), desc(posts.heat), asc(posts.score), desc(posts.createdAt));

    if (excludeShadowBanned) {
      const userIds = [...new Set(allPosts.map(p => p.userId))];
      if (userIds.length > 0) {
        const shadowBannedUsers = await db.select({ id: users.id })
          .from(users)
          .where(and(inArray(users.id, userIds), eq(users.shadowBanned, true)));
        const shadowBannedSet = new Set(shadowBannedUsers.map(u => u.id));

        const filteredPosts = allPosts.filter(post => {
          if (shadowBannedSet.has(post.userId) && post.userId !== currentUserId) return false;
          return true;
        });

        return this.enrichPostsBatch(filteredPosts, currentUserId);
      }
    }

    return this.enrichPostsBatch(allPosts, currentUserId);
  }

  async getGroupPosts(groupId: string, currentUserId?: string): Promise<PostWithUser[]> {
    const now = new Date();
    const groupPosts = await db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.groupId, groupId),
          eq(posts.isDeleted, false),
          gt(posts.expiresAt, now)
        )
      )
      .orderBy(desc(posts.createdAt));

    return this.enrichPostsBatch(groupPosts, currentUserId);
  }

  async getAllPosts(): Promise<(Post & { username: string })[]> {
    const rows = await db
      .select({
        id: posts.id, title: posts.title, content: posts.content, type: posts.type,
        imageUrl: posts.imageUrl, linkUrl: posts.linkUrl, linkTitle: posts.linkTitle,
        linkDescription: posts.linkDescription, linkImage: posts.linkImage,
        userId: posts.userId, groupId: posts.groupId, flair: posts.flair,
        score: posts.score, heat: posts.heat, expiresAt: posts.expiresAt,
        isDeleted: posts.isDeleted, isLocked: posts.isLocked, createdAt: posts.createdAt,
        isConfession: posts.isConfession, isPinned: posts.isPinned,
        pinnedAt: posts.pinnedAt, threadId: posts.threadId,
        username: users.username,
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .orderBy(desc(posts.createdAt));
    return rows.map(r => ({ ...r, username: r.username ?? "[deleted]" }));
  }

  async updatePost(id: string, data: Partial<Post>): Promise<Post | undefined> {
    const [updated] = await db.update(posts).set(data).where(eq(posts.id, id)).returning();
    return updated;
  }

  async createComment(comment: InsertComment & { userId: string }): Promise<Comment> {
    const [created] = await db.insert(comments).values(comment).returning();

    const commentCount = await this.getCommentCount(comment.postId);
    const [post] = await db.select().from(posts).where(eq(posts.id, comment.postId));
    if (post && post.score < 0 && commentCount > 50) {
      const heat = Math.abs(post.score) + commentCount;
      await db.update(posts).set({ heat }).where(eq(posts.id, comment.postId));
    }

    if (post && post.userId !== comment.userId) {
      const [commenter] = await db.select().from(users).where(eq(users.id, comment.userId));
      await this.createNotification({
        userId: post.userId,
        type: "comment",
        message: `${commenter?.username ?? "Seseorang"} mengomentari postingan "${post.title.substring(0, 40)}"`,
        postId: post.id,
        fromUserId: comment.userId,
      });
    }

    if (comment.parentId) {
      const parentComment = await this.getComment(comment.parentId);
      if (parentComment && parentComment.userId !== comment.userId) {
        const [replier] = await db.select().from(users).where(eq(users.id, comment.userId));
        await this.createNotification({
          userId: parentComment.userId,
          type: "reply",
          message: `${replier?.username ?? "Seseorang"} membalas komentar kamu`,
          postId: comment.postId,
          fromUserId: comment.userId,
        });
      }
    }

    return created;
  }

  async getCommentsByPost(postId: string, currentUserId?: string, excludeShadowBanned = true): Promise<CommentWithUser[]> {
    const rows = await db
      .select({
        id: comments.id,
        postId: comments.postId,
        userId: comments.userId,
        parentId: comments.parentId,
        content: comments.content,
        score: comments.score,
        isDeleted: comments.isDeleted,
        createdAt: comments.createdAt,
        username: users.username,
        reputation: users.reputation,
        shadowBanned: users.shadowBanned,
        isPremiumUsername: users.isPremiumUsername,
        usernameGlow: users.usernameGlow,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(and(eq(comments.postId, postId), eq(comments.isDeleted, false)))
      .orderBy(desc(comments.createdAt));

    let filteredRows = rows;
    if (excludeShadowBanned) {
      filteredRows = rows.filter(r => !r.shadowBanned || r.userId === currentUserId);
    }

    const commentIds = filteredRows.map(r => r.id);

    let voteMap = new Map<string, number>();
    if (currentUserId && commentIds.length > 0) {
      const userVotes = await db.select().from(votes)
        .where(and(eq(votes.userId, currentUserId), inArray(votes.commentId, commentIds)));
      voteMap = new Map(userVotes.filter(v => v.commentId).map(v => [v.commentId!, v.value]));
    }

    return filteredRows.map(row => ({
      id: row.id,
      postId: row.postId,
      userId: row.userId,
      parentId: row.parentId,
      content: row.content,
      score: row.score,
      isDeleted: row.isDeleted,
      createdAt: row.createdAt,
      username: row.username ?? "[deleted]",
      isPublicEnemy: (row.reputation ?? 0) <= -300,
      isPremiumUsername: row.isPremiumUsername ?? false,
      usernameGlow: row.usernameGlow ?? null,
      userVote: voteMap.get(row.id) ?? null,
    }));
  }

  async getComment(id: string): Promise<Comment | undefined> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, id));
    return comment;
  }

  async updateComment(id: string, data: Partial<Comment>): Promise<Comment | undefined> {
    const [updated] = await db.update(comments).set(data).where(eq(comments.id, id)).returning();
    return updated;
  }

  async getCommentCount(postId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .where(and(eq(comments.postId, postId), eq(comments.isDeleted, false)));
    return result[0]?.count ?? 0;
  }

  async upsertVote(vote: InsertVote & { userId: string }): Promise<void> {
    if (vote.postId) {
      const existing = await this.getUserVote(vote.userId, vote.postId);
      if (existing) {
        if (existing.value === vote.value) {
          await db.delete(votes).where(eq(votes.id, existing.id));
          await db.update(posts).set({
            score: sql`score - ${existing.value}`
          }).where(eq(posts.id, vote.postId));
          const [post] = await db.select().from(posts).where(eq(posts.id, vote.postId));
          if (post) {
            await db.update(users).set({
              reputation: sql`reputation - ${existing.value}`
            }).where(eq(users.id, post.userId));
            const updatedUser = await this.getUser(post.userId);
            if (updatedUser && updatedUser.reputation <= -200 && !updatedUser.shadowBanned) {
              await db.update(users).set({ shadowBanned: true }).where(eq(users.id, post.userId));
            }
          }
        } else {
          await db.update(votes).set({ value: vote.value }).where(eq(votes.id, existing.id));
          const diff = vote.value - existing.value;
          await db.update(posts).set({
            score: sql`score + ${diff}`
          }).where(eq(posts.id, vote.postId));
          const [post] = await db.select().from(posts).where(eq(posts.id, vote.postId));
          if (post) {
            await db.update(users).set({
              reputation: sql`reputation + ${diff}`
            }).where(eq(users.id, post.userId));
            const updatedUser = await this.getUser(post.userId);
            if (updatedUser && updatedUser.reputation <= -200 && !updatedUser.shadowBanned) {
              await db.update(users).set({ shadowBanned: true }).where(eq(users.id, post.userId));
            }
          }
          const updatedPost = await this.getPost(vote.postId);
          if (updatedPost) {
            if (updatedPost.score < -500) {
              await db.update(posts).set({ isLocked: true }).where(eq(posts.id, vote.postId));
            }
          }
        }
      } else {
        await db.insert(votes).values({
          userId: vote.userId,
          postId: vote.postId,
          value: vote.value,
        });
        await db.update(posts).set({
          score: sql`score + ${vote.value}`
        }).where(eq(posts.id, vote.postId));
        const [post] = await db.select().from(posts).where(eq(posts.id, vote.postId));
        if (post) {
          await db.update(users).set({
            reputation: sql`reputation + ${vote.value}`
          }).where(eq(users.id, post.userId));
          const updatedUser = await this.getUser(post.userId);
          if (updatedUser && updatedUser.reputation <= -200 && !updatedUser.shadowBanned) {
            await db.update(users).set({ shadowBanned: true }).where(eq(users.id, post.userId));
          }

          if (post.userId !== vote.userId) {
            const [voter] = await db.select().from(users).where(eq(users.id, vote.userId));
            await this.createNotification({
              userId: post.userId,
              type: "vote",
              message: `${voter?.username ?? "Seseorang"} ${vote.value > 0 ? "menyukai" : "tidak menyukai"} postingan "${post.title.substring(0, 40)}"`,
              postId: post.id,
              fromUserId: vote.userId,
            });
          }
        }
        const updatedPost = await this.getPost(vote.postId);
        if (updatedPost && updatedPost.score < -500) {
          await db.update(posts).set({ isLocked: true }).where(eq(posts.id, vote.postId));
        }
      }
    }

    if (vote.commentId) {
      const existing = await this.getUserVote(vote.userId, undefined, vote.commentId);
      if (existing) {
        if (existing.value === vote.value) {
          await db.delete(votes).where(eq(votes.id, existing.id));
          await db.update(comments).set({
            score: sql`score - ${existing.value}`
          }).where(eq(comments.id, vote.commentId));
          const [comment] = await db.select().from(comments).where(eq(comments.id, vote.commentId));
          if (comment) {
            await db.update(users).set({
              reputation: sql`reputation - ${existing.value}`
            }).where(eq(users.id, comment.userId));
          }
        } else {
          await db.update(votes).set({ value: vote.value }).where(eq(votes.id, existing.id));
          const diff = vote.value - existing.value;
          await db.update(comments).set({
            score: sql`score + ${diff}`
          }).where(eq(comments.id, vote.commentId));
          const [comment] = await db.select().from(comments).where(eq(comments.id, vote.commentId));
          if (comment) {
            await db.update(users).set({
              reputation: sql`reputation + ${diff}`
            }).where(eq(users.id, comment.userId));
          }
        }
      } else {
        await db.insert(votes).values({
          userId: vote.userId,
          commentId: vote.commentId,
          value: vote.value,
        });
        await db.update(comments).set({
          score: sql`score + ${vote.value}`
        }).where(eq(comments.id, vote.commentId));
        const [comment] = await db.select().from(comments).where(eq(comments.id, vote.commentId));
        if (comment) {
          await db.update(users).set({
            reputation: sql`reputation + ${vote.value}`
          }).where(eq(users.id, comment.userId));
        }
      }
    }
  }

  async getUserVote(userId: string, postId?: string, commentId?: string): Promise<Vote | undefined> {
    if (postId) {
      const [vote] = await db
        .select()
        .from(votes)
        .where(and(eq(votes.userId, userId), eq(votes.postId, postId)));
      return vote;
    }
    if (commentId) {
      const [vote] = await db
        .select()
        .from(votes)
        .where(and(eq(votes.userId, userId), eq(votes.commentId, commentId)));
      return vote;
    }
    return undefined;
  }

  async getUserProfile(username: string): Promise<UserProfile | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) return undefined;

    const [[postCountResult], [commentCountResult], userBadgesList] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` })
        .from(posts)
        .where(and(eq(posts.userId, user.id), eq(posts.isDeleted, false))),
      db.select({ count: sql<number>`count(*)::int` })
        .from(comments)
        .where(and(eq(comments.userId, user.id), eq(comments.isDeleted, false))),
      this.getUserBadges(user.id),
    ]);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      role: user.role,
      reputation: user.reputation,
      isPremium: user.isPremium && user.premiumExpiresAt ? user.premiumExpiresAt > new Date() : false,
      isVerified: user.isVerified,
      isPremiumUsername: user.isPremiumUsername,
      usernameGlow: user.usernameGlow,
      customFlair: user.customFlair,
      walletBalance: user.walletBalance,
      createdAt: user.createdAt,
      postCount: postCountResult.count,
      commentCount: commentCountResult.count,
      badges: userBadgesList,
    };
  }

  async getUserPosts(username: string, currentUserId?: string): Promise<PostWithUser[]> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) return [];

    const userPosts = await db
      .select()
      .from(posts)
      .where(and(eq(posts.userId, user.id), eq(posts.isDeleted, false)))
      .orderBy(desc(posts.createdAt));

    return this.enrichPostsBatch(userPosts, currentUserId);
  }

  async updateUserProfile(id: string, data: { displayName?: string; bio?: string; avatarUrl?: string; bannerUrl?: string }): Promise<User | undefined> {
    const updateData: any = {};
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.bannerUrl !== undefined) updateData.bannerUrl = data.bannerUrl;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async createEmailVerification(email: string, code: string): Promise<EmailVerification> {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const [created] = await db.insert(emailVerifications).values({ email, code, expiresAt }).returning();
    return created;
  }

  async checkEmailCode(email: string, code: string): Promise<boolean> {
    const [verification] = await db
      .select()
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.email, email),
          eq(emailVerifications.code, code),
          eq(emailVerifications.used, false),
          gt(emailVerifications.expiresAt, new Date())
        )
      )
      .orderBy(desc(emailVerifications.createdAt))
      .limit(1);
    return !!verification;
  }

  async verifyEmailCode(email: string, code: string): Promise<boolean> {
    const [verification] = await db
      .select()
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.email, email),
          eq(emailVerifications.code, code),
          eq(emailVerifications.used, false),
          gt(emailVerifications.expiresAt, new Date())
        )
      )
      .orderBy(desc(emailVerifications.createdAt))
      .limit(1);

    if (!verification) return false;

    await db.update(emailVerifications).set({ used: true }).where(eq(emailVerifications.id, verification.id));
    return true;
  }

  async getAdminSetting(key: string): Promise<string | undefined> {
    const cached = getCachedSetting(key);
    if (cached !== undefined) return cached;

    const [setting] = await db.select().from(adminSettings).where(eq(adminSettings.key, key));
    if (setting) setCachedSetting(key, setting.value);
    return setting?.value;
  }

  async setAdminSetting(key: string, value: string): Promise<void> {
    const [existing] = await db.select().from(adminSettings).where(eq(adminSettings.key, key));
    if (existing) {
      await db.update(adminSettings).set({ value }).where(eq(adminSettings.key, key));
    } else {
      await db.insert(adminSettings).values({ key, value });
    }
    setCachedSetting(key, value);
  }

  async getAllAdminSettings(): Promise<AdminSetting[]> {
    return db.select().from(adminSettings);
  }

  async createBadge(badge: { name: string; description: string; icon: string; color?: string }): Promise<Badge> {
    const [created] = await db.insert(badges).values(badge).returning();
    return created;
  }

  async getAllBadges(): Promise<Badge[]> {
    return db.select().from(badges).orderBy(desc(badges.createdAt));
  }

  async awardBadge(userId: string, badgeId: string): Promise<UserBadge> {
    const [created] = await db.insert(userBadges).values({ userId, badgeId }).returning();
    return created;
  }

  async revokeBadge(userId: string, badgeId: string): Promise<void> {
    await db.delete(userBadges).where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)));
  }

  async getUserBadges(userId: string): Promise<(Badge & { awardedAt: Date | string })[]> {
    const rows = await db
      .select({
        id: badges.id,
        name: badges.name,
        description: badges.description,
        icon: badges.icon,
        color: badges.color,
        createdAt: badges.createdAt,
        awardedAt: userBadges.awardedAt,
      })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.awardedAt));

    return rows;
  }

  async deleteBadge(id: string): Promise<void> {
    await db.delete(userBadges).where(eq(userBadges.badgeId, id));
    await db.delete(badges).where(eq(badges.id, id));
  }

  async createGroup(group: { name: string; slug: string; description?: string; isPrivate?: boolean; createdBy: string }): Promise<Group> {
    const [created] = await db.insert(groups).values(group).returning();
    await db.insert(groupMembers).values({ groupId: created.id, userId: group.createdBy, role: "owner" });
    return created;
  }

  async getGroup(slug: string, userId?: string): Promise<GroupWithInfo | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.slug, slug));
    if (!group) return undefined;

    const [[memberCountResult], [creator]] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, group.id)),
      db.select().from(users).where(eq(users.id, group.createdBy)),
    ]);

    let isMember = false;
    let userRole: string | null = null;
    if (userId) {
      const [membership] = await db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, userId)));
      isMember = !!membership;
      userRole = membership?.role ?? null;
    }

    return {
      ...group,
      memberCount: memberCountResult.count,
      creatorUsername: creator?.username ?? "[deleted]",
      isMember,
      userRole,
    };
  }

  async getAllGroups(userId?: string): Promise<GroupWithInfo[]> {
    const allGroups = await db.select().from(groups).orderBy(desc(groups.createdAt));
    if (allGroups.length === 0) return [];

    const groupIds = allGroups.map(g => g.id);
    const creatorIds = [...new Set(allGroups.map(g => g.createdBy))];

    const [memberCounts, creators] = await Promise.all([
      db.select({
        groupId: groupMembers.groupId,
        count: sql<number>`count(*)::int`,
      }).from(groupMembers)
        .where(inArray(groupMembers.groupId, groupIds))
        .groupBy(groupMembers.groupId),
      db.select({ id: users.id, username: users.username })
        .from(users)
        .where(inArray(users.id, creatorIds)),
    ]);

    let memberships: { groupId: string; role: string }[] = [];
    if (userId) {
      memberships = await db.select({ groupId: groupMembers.groupId, role: groupMembers.role })
        .from(groupMembers)
        .where(and(eq(groupMembers.userId, userId), inArray(groupMembers.groupId, groupIds)));
    }

    const memberCountMap = new Map(memberCounts.map(m => [m.groupId, m.count]));
    const creatorMap = new Map(creators.map(c => [c.id, c.username]));
    const membershipMap = new Map(memberships.map(m => [m.groupId, m.role]));

    return allGroups.map(group => ({
      ...group,
      memberCount: memberCountMap.get(group.id) ?? 0,
      creatorUsername: creatorMap.get(group.createdBy) ?? "[deleted]",
      isMember: membershipMap.has(group.id),
      userRole: membershipMap.get(group.id) ?? null,
    }));
  }

  async joinGroup(groupId: string, userId: string): Promise<GroupMember> {
    const [created] = await db.insert(groupMembers).values({ groupId, userId }).returning();
    return created;
  }

  async leaveGroup(groupId: string, userId: string): Promise<void> {
    await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  }

  async getGroupMembers(groupId: string): Promise<(GroupMember & { username: string; avatarUrl?: string | null })[]> {
    const rows = await db
      .select({
        id: groupMembers.id,
        groupId: groupMembers.groupId,
        userId: groupMembers.userId,
        role: groupMembers.role,
        joinedAt: groupMembers.joinedAt,
        username: users.username,
        avatarUrl: users.avatarUrl,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, groupId));

    return rows.map(r => ({
      ...r,
      username: r.username ?? "[deleted]",
      avatarUrl: r.avatarUrl ?? null,
    }));
  }

  async setGroupMemberRole(groupId: string, userId: string, role: string): Promise<void> {
    await db.update(groupMembers).set({ role }).where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))
    );
  }

  async getGroupMember(groupId: string, userId: string): Promise<GroupMember | undefined> {
    const [member] = await db.select().from(groupMembers).where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))
    );
    return member;
  }

  async updateGroup(groupId: string, data: { avatarUrl?: string; bannerUrl?: string; description?: string }): Promise<Group> {
    const updateData: Record<string, any> = {};
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.bannerUrl !== undefined) updateData.bannerUrl = data.bannerUrl;
    if (data.description !== undefined) updateData.description = data.description;
    const [updated] = await db.update(groups).set(updateData).where(eq(groups.id, groupId)).returning();
    return updated;
  }

  async createNotification(data: { userId: string; type: string; message: string; postId?: string; fromUserId?: string }): Promise<Notification> {
    const [created] = await db.insert(notifications).values(data).returning();
    return created;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async markNotificationRead(id: string, userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(
      and(eq(notifications.id, id), eq(notifications.userId, userId))
    );
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result?.count ?? 0;
  }

  async createBookmark(userId: string, postId: string): Promise<Bookmark> {
    const [created] = await db.insert(bookmarks).values({ userId, postId }).returning();
    return created;
  }

  async deleteBookmark(userId: string, postId: string): Promise<void> {
    await db.delete(bookmarks).where(
      and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId))
    );
  }

  async getUserBookmarks(userId: string): Promise<PostWithUser[]> {
    const userBookmarks = await db.select().from(bookmarks)
      .where(eq(bookmarks.userId, userId))
      .orderBy(desc(bookmarks.createdAt));

    if (userBookmarks.length === 0) return [];

    const postIds = userBookmarks.map(bm => bm.postId);
    const bmPosts = await db.select().from(posts).where(inArray(posts.id, postIds));
    const enriched = await this.enrichPostsBatch(bmPosts, userId);

    const orderMap = new Map(postIds.map((id, i) => [id, i]));
    enriched.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    return enriched;
  }

  async isBookmarked(userId: string, postId: string): Promise<boolean> {
    const [bm] = await db.select().from(bookmarks).where(
      and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId))
    );
    return !!bm;
  }

  async getStats() {
    const now = new Date();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      [totalUsersResult],
      [activeUsersResult],
      [totalPostsResult],
      [activePostsResult],
      [deadPostsResult],
      [shadowBannedResult],
      [publicEnemiesResult],
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db.select({ count: sql<number>`count(distinct user_id)::int` }).from(posts).where(gt(posts.createdAt, dayAgo)),
      db.select({ count: sql<number>`count(*)::int` }).from(posts),
      db.select({ count: sql<number>`count(*)::int` }).from(posts).where(and(gt(posts.expiresAt, now), eq(posts.isDeleted, false))),
      db.select({ count: sql<number>`count(*)::int` }).from(posts).where(lt(posts.expiresAt, now)),
      db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.shadowBanned, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(users).where(lt(users.reputation, sql`-300`)),
    ]);

    return {
      totalUsers: totalUsersResult.count,
      activeUsers: activeUsersResult.count,
      totalPosts: totalPostsResult.count,
      activePosts: activePostsResult.count,
      deadPosts: deadPostsResult.count,
      shadowBannedUsers: shadowBannedResult.count,
      publicEnemies: publicEnemiesResult.count,
    };
  }

  async createPayment(data: { userId: string; type: string; amount: number; invoiceId: string; metadata?: any }): Promise<Payment> {
    const [created] = await db.insert(payments).values(data).returning();
    return created;
  }

  async updatePaymentStatus(invoiceId: string, status: string): Promise<Payment | undefined> {
    const [updated] = await db.update(payments).set({ status }).where(eq(payments.invoiceId, invoiceId)).returning();
    return updated;
  }

  async getPaymentByInvoice(invoiceId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.invoiceId, invoiceId));
    return payment;
  }

  async getUserPayments(userId: string): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt)).limit(50);
  }

  async getAllPayments(): Promise<(Payment & { username: string })[]> {
    const rows = await db
      .select({
        id: payments.id,
        userId: payments.userId,
        type: payments.type,
        amount: payments.amount,
        invoiceId: payments.invoiceId,
        status: payments.status,
        metadata: payments.metadata,
        createdAt: payments.createdAt,
        username: users.username,
      })
      .from(payments)
      .leftJoin(users, eq(payments.userId, users.id))
      .orderBy(desc(payments.createdAt))
      .limit(100);
    return rows.map(r => ({ ...r, username: r.username ?? "unknown" }));
  }

  async createTip(data: { fromUserId: string; toPostId: string; amount: number; paymentId: string }): Promise<Tip> {
    const [created] = await db.insert(tips).values(data).returning();
    return created;
  }

  async getPostTips(postId: string): Promise<number> {
    const [result] = await db
      .select({ total: sql<number>`coalesce(sum(amount), 0)::int` })
      .from(tips)
      .where(eq(tips.toPostId, postId));
    return result?.total ?? 0;
  }

  async getActiveAds(): Promise<Ad[]> {
    return db.select().from(ads).where(eq(ads.isActive, true)).orderBy(desc(ads.createdAt));
  }

  async getAdsByPlacement(placement: string): Promise<Ad[]> {
    return db.select().from(ads).where(and(eq(ads.isActive, true), eq(ads.placement, placement))).orderBy(desc(ads.createdAt));
  }

  async createAd(data: { title: string; imageUrl: string; linkUrl: string; placement: string }): Promise<Ad> {
    const [created] = await db.insert(ads).values(data).returning();
    return created;
  }

  async deleteAd(id: string): Promise<void> {
    await db.delete(ads).where(eq(ads.id, id));
  }

  async createPoll(postId: string, options: string[]): Promise<Poll> {
    const [poll] = await db.insert(polls).values({ postId }).returning();
    for (const text of options) {
      await db.insert(pollOptions).values({ pollId: poll.id, text });
    }
    return poll;
  }

  async getPollByPost(postId: string, currentUserId?: string): Promise<PollWithResults | null> {
    const [poll] = await db.select().from(polls).where(eq(polls.postId, postId));
    if (!poll) return null;

    const opts = await db.select().from(pollOptions).where(eq(pollOptions.pollId, poll.id));
    const voteCounts = await db.select({
      optionId: pollVotes.optionId,
      count: sql<number>`count(*)::int`,
    }).from(pollVotes)
      .where(eq(pollVotes.pollId, poll.id))
      .groupBy(pollVotes.optionId);

    const voteCountMap = new Map(voteCounts.map(v => [v.optionId, v.count]));

    let userVotedOptionId: string | null = null;
    if (currentUserId) {
      const [userVote] = await db.select().from(pollVotes)
        .where(and(eq(pollVotes.pollId, poll.id), eq(pollVotes.userId, currentUserId)));
      userVotedOptionId = userVote?.optionId ?? null;
    }

    const totalVotes = voteCounts.reduce((sum, v) => sum + v.count, 0);

    return {
      id: poll.id,
      postId: poll.postId,
      options: opts.map(o => ({
        id: o.id,
        text: o.text,
        voteCount: voteCountMap.get(o.id) ?? 0,
      })),
      totalVotes,
      userVotedOptionId,
    };
  }

  async votePoll(pollId: string, optionId: string, userId: string): Promise<void> {
    await db.insert(pollVotes).values({ pollId, optionId, userId });
  }

  async addReaction(postId: string, userId: string, emoji: string): Promise<Reaction> {
    const [created] = await db.insert(reactions).values({ postId, userId, emoji }).returning();
    return created;
  }

  async removeReaction(postId: string, userId: string, emoji: string): Promise<void> {
    await db.delete(reactions).where(
      and(eq(reactions.postId, postId), eq(reactions.userId, userId), eq(reactions.emoji, emoji))
    );
  }

  async getPostReactions(postId: string, currentUserId?: string): Promise<ReactionSummary[]> {
    const counts = await db.select({
      emoji: reactions.emoji,
      count: sql<number>`count(*)::int`,
    }).from(reactions)
      .where(eq(reactions.postId, postId))
      .groupBy(reactions.emoji);

    let userReactions = new Set<string>();
    if (currentUserId) {
      const userR = await db.select({ emoji: reactions.emoji }).from(reactions)
        .where(and(eq(reactions.postId, postId), eq(reactions.userId, currentUserId)));
      userReactions = new Set(userR.map(r => r.emoji));
    }

    return counts.map(c => ({
      emoji: c.emoji,
      count: c.count,
      userReacted: userReactions.has(c.emoji),
    }));
  }

  async getPostsReactionsBatch(postIds: string[], currentUserId?: string): Promise<Map<string, ReactionSummary[]>> {
    if (postIds.length === 0) return new Map();
    const counts = await db.select({
      postId: reactions.postId,
      emoji: reactions.emoji,
      count: sql<number>`count(*)::int`,
    }).from(reactions)
      .where(inArray(reactions.postId, postIds))
      .groupBy(reactions.postId, reactions.emoji);

    let userReactionSet = new Set<string>();
    if (currentUserId) {
      const userR = await db.select({ postId: reactions.postId, emoji: reactions.emoji }).from(reactions)
        .where(and(eq(reactions.userId, currentUserId), inArray(reactions.postId, postIds)));
      userReactionSet = new Set(userR.map(r => `${r.postId}:${r.emoji}`));
    }

    const map = new Map<string, ReactionSummary[]>();
    for (const c of counts) {
      if (!map.has(c.postId)) map.set(c.postId, []);
      map.get(c.postId)!.push({
        emoji: c.emoji,
        count: c.count,
        userReacted: userReactionSet.has(`${c.postId}:${c.emoji}`),
      });
    }
    return map;
  }

  async getAllAchievements(): Promise<Achievement[]> {
    return db.select().from(achievements).orderBy(achievements.category, achievements.threshold);
  }

  async getUserAchievements(userId: string): Promise<AchievementWithStatus[]> {
    const allAch = await this.getAllAchievements();
    const userAch = await db.select().from(userAchievements).where(eq(userAchievements.userId, userId));
    const unlockedMap = new Map(userAch.map(ua => [ua.achievementId, ua.unlockedAt]));

    return allAch.map(a => ({
      ...a,
      unlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id) ?? null,
    }));
  }

  async checkAndAwardAchievements(userId: string): Promise<AchievementWithStatus[]> {
    const allAch = await this.getAllAchievements();
    const userAch = await db.select().from(userAchievements).where(eq(userAchievements.userId, userId));
    const unlockedIds = new Set(userAch.map(ua => ua.achievementId));

    const user = await this.getUser(userId);
    if (!user) return [];

    const [postCountRes, commentCountRes, voteCountRes] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(posts)
        .where(and(eq(posts.userId, userId), eq(posts.isDeleted, false))),
      db.select({ count: sql<number>`count(*)::int` }).from(comments)
        .where(and(eq(comments.userId, userId), eq(comments.isDeleted, false))),
      db.select({ count: sql<number>`count(*)::int` }).from(votes)
        .where(eq(votes.userId, userId)),
    ]);

    const stats: Record<string, number> = {
      posts: postCountRes[0]?.count ?? 0,
      comments: commentCountRes[0]?.count ?? 0,
      votes: voteCountRes[0]?.count ?? 0,
      reputation: user.reputation,
      survival: 0,
    };

    const activePosts = await db.select({ id: posts.id }).from(posts)
      .where(and(eq(posts.userId, userId), eq(posts.isDeleted, false), gt(posts.score, 0)));
    stats.survival = activePosts.length;

    const newlyAwarded: AchievementWithStatus[] = [];

    for (const ach of allAch) {
      if (unlockedIds.has(ach.id)) continue;
      const val = stats[ach.category] ?? 0;
      if (val >= ach.threshold) {
        try {
          await db.insert(userAchievements).values({ userId, achievementId: ach.id });
          newlyAwarded.push({ ...ach, unlocked: true, unlockedAt: new Date() });
        } catch (e) {}
      }
    }

    return newlyAwarded;
  }

  async grantAllAchievements(userId: string): Promise<void> {
    const allAch = await this.getAllAchievements();
    const userAch = await db.select().from(userAchievements).where(eq(userAchievements.userId, userId));
    const unlockedIds = new Set(userAch.map(ua => ua.achievementId));
    for (const ach of allAch) {
      if (!unlockedIds.has(ach.id)) {
        try {
          await db.insert(userAchievements).values({ userId, achievementId: ach.id });
        } catch (e) {}
      }
    }
  }

  async seedDefaultAchievements(): Promise<void> {
    const existing = await db.select({ id: achievements.id }).from(achievements).limit(1);
    if (existing.length > 0) return;

    const defaults = [
      { key: "first_post", name: "Postingan Pertama", description: "Buat postingan pertamamu", icon: "PenSquare", category: "posts", threshold: 1 },
      { key: "prolific_poster", name: "Penulis Aktif", description: "Buat 10 postingan", icon: "FileText", category: "posts", threshold: 10 },
      { key: "content_machine", name: "Mesin Konten", description: "Buat 50 postingan", icon: "Zap", category: "posts", threshold: 50 },
      { key: "first_comment", name: "Komentar Pertama", description: "Tulis komentar pertamamu", icon: "MessageCircle", category: "comments", threshold: 1 },
      { key: "chatterbox", name: "Tukang Ngobrol", description: "Tulis 50 komentar", icon: "MessagesSquare", category: "comments", threshold: 50 },
      { key: "comment_legend", name: "Legenda Komentar", description: "Tulis 200 komentar", icon: "Crown", category: "comments", threshold: 200 },
      { key: "first_vote", name: "Vote Pertama", description: "Berikan vote pertamamu", icon: "ThumbsUp", category: "votes", threshold: 1 },
      { key: "voter", name: "Pemilih Aktif", description: "Berikan 50 vote", icon: "Vote", category: "votes", threshold: 50 },
      { key: "judge", name: "Hakim Forum", description: "Berikan 200 vote", icon: "Gavel", category: "votes", threshold: 200 },
      { key: "respected", name: "Dihormati", description: "Raih 50 reputasi", icon: "Star", category: "reputation", threshold: 50 },
      { key: "famous", name: "Terkenal", description: "Raih 200 reputasi", icon: "Award", category: "reputation", threshold: 200 },
      { key: "legend", name: "Legenda", description: "Raih 1000 reputasi", icon: "Trophy", category: "reputation", threshold: 1000 },
      { key: "survivor", name: "Survivor", description: "Punya 5 post dengan skor positif", icon: "Shield", category: "survival", threshold: 5 },
      { key: "untouchable", name: "Tak Tersentuh", description: "Punya 20 post dengan skor positif", icon: "ShieldCheck", category: "survival", threshold: 20 },
    ];

    for (const d of defaults) {
      await db.insert(achievements).values(d);
    }
  }

  async getThreadPosts(threadId: string, currentUserId?: string): Promise<PostWithUser[]> {
    const threadPosts = await db.select().from(posts)
      .where(and(eq(posts.threadId, threadId), eq(posts.isDeleted, false)))
      .orderBy(asc(posts.createdAt));
    const originalPost = await db.select().from(posts).where(eq(posts.id, threadId));
    const allPosts = [...originalPost.filter(p => !p.isDeleted), ...threadPosts];
    return this.enrichPostsBatch(allPosts, currentUserId);
  }

  async checkAndPinPost(postId: string): Promise<void> {
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!post || post.isPinned || post.isDeleted) return;

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    if (post.createdAt > sixHoursAgo && post.score >= 50) {
      await db.update(posts).set({ isPinned: true, pinnedAt: new Date() }).where(eq(posts.id, postId));
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db.update(posts).set({ isPinned: false, pinnedAt: null })
      .where(and(eq(posts.isPinned, true), lt(posts.pinnedAt!, oneDayAgo)));
  }

  async getLeaderboard(): Promise<{
    topUsers: { id: string; username: string; avatarUrl: string | null; reputation: number; isPremium: boolean; isVerified: boolean }[];
    topPosts: PostWithUser[];
    publicEnemies: { id: string; username: string; avatarUrl: string | null; reputation: number }[];
  }> {
    const [topUsers, topPostsRaw, publicEnemies] = await Promise.all([
      db.select({
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
        reputation: users.reputation,
        isPremium: users.isPremium,
        isVerified: users.isVerified,
      }).from(users)
        .where(gt(users.reputation, 0))
        .orderBy(desc(users.reputation))
        .limit(20),

      db.select().from(posts)
        .where(and(
          eq(posts.isDeleted, false),
          gt(posts.score, 0),
        ))
        .orderBy(desc(posts.score))
        .limit(20),

      db.select({
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
        reputation: users.reputation,
      }).from(users)
        .where(lt(users.reputation, sql`-50`))
        .orderBy(asc(users.reputation))
        .limit(20),
    ]);

    const topPosts = await this.enrichPostsBatch(topPostsRaw);

    return { topUsers, topPosts, publicEnemies };
  }

  async getTrendingTags(limit: number = 20): Promise<{ tag: string; count: number }[]> {
    const now = new Date();
    const activePosts = await db.select({
      title: posts.title,
      content: posts.content,
    }).from(posts).where(and(
      eq(posts.isDeleted, false),
      gt(posts.expiresAt, now),
    ));

    const tagCounts = new Map<string, number>();
    const hashtagRegex = /#([\w\u00C0-\u024F]+)/g;
    for (const post of activePosts) {
      const text = `${post.title} ${post.content}`;
      let match;
      while ((match = hashtagRegex.exec(text)) !== null) {
        const tag = match[1].toLowerCase();
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async sendWhisper(fromUserId: string, toUserId: string, content: string): Promise<any> {
    const [whisper] = await db.insert(whispers).values({
      fromUserId,
      toUserId,
      content,
    }).returning();
    return whisper;
  }

  async getWhispers(userId: string): Promise<any[]> {
    const received = await db.select({
      id: whispers.id,
      content: whispers.content,
      isRead: whispers.isRead,
      createdAt: whispers.createdAt,
      fromUsername: users.username,
      direction: sql<string>`'received'`,
    }).from(whispers)
      .innerJoin(users, eq(whispers.fromUserId, users.id))
      .where(eq(whispers.toUserId, userId))
      .orderBy(desc(whispers.createdAt))
      .limit(50);

    const sent = await db.select({
      id: whispers.id,
      content: whispers.content,
      isRead: whispers.isRead,
      createdAt: whispers.createdAt,
      toUsername: users.username,
      direction: sql<string>`'sent'`,
    }).from(whispers)
      .innerJoin(users, eq(whispers.toUserId, users.id))
      .where(eq(whispers.fromUserId, userId))
      .orderBy(desc(whispers.createdAt))
      .limit(50);

    return [...received, ...sent].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async markWhisperRead(id: string, userId: string): Promise<void> {
    await db.update(whispers)
      .set({ isRead: true })
      .where(and(eq(whispers.id, id), eq(whispers.toUserId, userId)));
  }

  async canSendWhisper(fromUserId: string, toUserId: string): Promise<boolean> {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [existing] = await db.select({ id: whispers.id }).from(whispers)
      .where(and(
        eq(whispers.fromUserId, fromUserId),
        eq(whispers.toUserId, toUserId),
        gt(whispers.createdAt, dayAgo),
      ))
      .limit(1);
    return !existing;
  }

  async purchaseKarmaItem(userId: string, itemKey: string, cost: number): Promise<any> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.reputation < cost) {
      throw new Error("Karma tidak cukup");
    }
    await db.update(users).set({ reputation: user.reputation - cost }).where(eq(users.id, userId));
    const [purchase] = await db.insert(karmaPurchases).values({
      userId,
      itemKey,
      cost,
    }).returning();
    return purchase;
  }

  async getUserPurchases(userId: string): Promise<any[]> {
    return db.select().from(karmaPurchases)
      .where(eq(karmaPurchases.userId, userId))
      .orderBy(desc(karmaPurchases.createdAt))
      .limit(50);
  }

  async getDailyRecap(): Promise<{
    topPost: PostWithUser | null;
    mostCommented: PostWithUser | null;
    mostReacted: PostWithUser | null;
    totalPosts: number;
    totalComments: number;
    totalReactions: number;
  }> {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [topPostRaw] = await db.select().from(posts)
      .where(and(eq(posts.isDeleted, false), gt(posts.createdAt, dayAgo)))
      .orderBy(desc(posts.score))
      .limit(1);

    const mostCommentedResult = await db.select({
      postId: comments.postId,
      count: sql<number>`count(*)::int`,
    }).from(comments)
      .where(gt(comments.createdAt, dayAgo))
      .groupBy(comments.postId)
      .orderBy(desc(sql`count(*)`))
      .limit(1);

    const mostReactedResult = await db.select({
      postId: reactions.postId,
      count: sql<number>`count(*)::int`,
    }).from(reactions)
      .where(gt(reactions.createdAt, dayAgo))
      .groupBy(reactions.postId)
      .orderBy(desc(sql`count(*)`))
      .limit(1);

    const [postCountResult] = await db.select({
      count: sql<number>`count(*)::int`,
    }).from(posts).where(and(eq(posts.isDeleted, false), gt(posts.createdAt, dayAgo)));

    const [commentCountResult] = await db.select({
      count: sql<number>`count(*)::int`,
    }).from(comments).where(gt(comments.createdAt, dayAgo));

    const [reactionCountResult] = await db.select({
      count: sql<number>`count(*)::int`,
    }).from(reactions).where(gt(reactions.createdAt, dayAgo));

    let topPost: PostWithUser | null = null;
    let mostCommented: PostWithUser | null = null;
    let mostReacted: PostWithUser | null = null;

    if (topPostRaw) {
      const enriched = await this.enrichPostsBatch([topPostRaw]);
      topPost = enriched[0] || null;
    }

    if (mostCommentedResult[0]?.postId) {
      const [p] = await db.select().from(posts).where(eq(posts.id, mostCommentedResult[0].postId));
      if (p) {
        const enriched = await this.enrichPostsBatch([p]);
        mostCommented = enriched[0] || null;
      }
    }

    if (mostReactedResult[0]?.postId) {
      const [p] = await db.select().from(posts).where(eq(posts.id, mostReactedResult[0].postId));
      if (p) {
        const enriched = await this.enrichPostsBatch([p]);
        mostReacted = enriched[0] || null;
      }
    }

    return {
      topPost,
      mostCommented,
      mostReacted,
      totalPosts: postCountResult?.count || 0,
      totalComments: commentCountResult?.count || 0,
      totalReactions: reactionCountResult?.count || 0,
    };
  }
  async getReservedUsernames(): Promise<ReservedUsername[]> {
    return db.select().from(reservedUsernames).orderBy(desc(reservedUsernames.createdAt));
  }

  async getReservedUsername(id: string): Promise<ReservedUsername | undefined> {
    const [result] = await db.select().from(reservedUsernames).where(eq(reservedUsernames.id, id));
    return result;
  }

  async addReservedUsername(data: { username: string; price: number; category: string; glowColor?: string | null }): Promise<ReservedUsername> {
    const [result] = await db.insert(reservedUsernames).values({
      username: data.username.toLowerCase(),
      price: data.price,
      category: data.category,
      glowColor: data.glowColor || null,
    }).returning();
    return result;
  }

  async removeReservedUsername(id: string): Promise<void> {
    await db.delete(reservedUsernames).where(eq(reservedUsernames.id, id));
  }

  async isUsernameReserved(username: string): Promise<ReservedUsername | undefined> {
    const [result] = await db.select().from(reservedUsernames)
      .where(eq(reservedUsernames.username, username.toLowerCase()));
    return result;
  }

  async purchaseUsername(userId: string, reservedId: string): Promise<void> {
    await db.update(reservedUsernames).set({
      isAvailable: false,
      purchasedBy: userId,
    }).where(eq(reservedUsernames.id, reservedId));
  }

  async changeUsername(userId: string, newUsername: string): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ username: newUsername }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
    return db.select().from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.createdAt));
  }

  async addWalletTransaction(data: { userId: string; type: string; amount: number; metadata?: any }): Promise<WalletTransaction> {
    const [result] = await db.insert(walletTransactions).values({
      userId: data.userId,
      type: data.type,
      amount: data.amount,
      metadata: data.metadata || null,
    }).returning();
    return result;
  }

  async getUserWalletBalance(userId: string): Promise<number> {
    const [user] = await db.select({ walletBalance: users.walletBalance }).from(users).where(eq(users.id, userId));
    return user?.walletBalance ?? 0;
  }

  async getWithdrawals(userId: string): Promise<Withdrawal[]> {
    return db.select().from(withdrawals)
      .where(eq(withdrawals.userId, userId))
      .orderBy(desc(withdrawals.createdAt));
  }

  async getAllWithdrawals(): Promise<(Withdrawal & { username: string })[]> {
    const rows = await db.select({
      id: withdrawals.id,
      userId: withdrawals.userId,
      amount: withdrawals.amount,
      method: withdrawals.method,
      accountName: withdrawals.accountName,
      accountNumber: withdrawals.accountNumber,
      status: withdrawals.status,
      adminNote: withdrawals.adminNote,
      createdAt: withdrawals.createdAt,
      username: users.username,
    }).from(withdrawals)
      .innerJoin(users, eq(withdrawals.userId, users.id))
      .orderBy(desc(withdrawals.createdAt));
    return rows;
  }

  async createWithdrawal(data: { userId: string; amount: number; method: string; accountName: string; accountNumber: string }): Promise<Withdrawal> {
    const user = await this.getUser(data.userId);
    if (!user || user.walletBalance < data.amount) {
      throw new Error("Saldo tidak mencukupi");
    }
    await db.update(users).set({ walletBalance: user.walletBalance - data.amount }).where(eq(users.id, data.userId));
    await this.addWalletTransaction({
      userId: data.userId,
      type: "withdrawal",
      amount: -data.amount,
      metadata: { method: data.method, accountNumber: data.accountNumber },
    });
    const [result] = await db.insert(withdrawals).values(data).returning();
    return result;
  }

  async updateWithdrawalStatus(id: string, status: string, adminNote?: string): Promise<Withdrawal | undefined> {
    const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, id));
    if (!withdrawal) return undefined;

    if (status === "rejected" && withdrawal.status === "pending") {
      const user = await this.getUser(withdrawal.userId);
      if (user) {
        await db.update(users).set({ walletBalance: user.walletBalance + withdrawal.amount }).where(eq(users.id, withdrawal.userId));
        await this.addWalletTransaction({
          userId: withdrawal.userId,
          type: "withdrawal_refund",
          amount: withdrawal.amount,
          metadata: { withdrawalId: id, reason: adminNote },
        });
      }
    }

    const [updated] = await db.update(withdrawals).set({
      status,
      adminNote: adminNote || null,
    }).where(eq(withdrawals.id, id)).returning();
    return updated;
  }

  async getUserLevel(userId: string): Promise<{xp: number; level: number}> {
    const [row] = await db.select().from(userLevels).where(eq(userLevels.userId, userId));
    if (!row) return { xp: 0, level: 0 };
    return { xp: row.xp, level: row.level };
  }

  async addXP(userId: string, amount: number): Promise<{xp: number; level: number}> {
    const [existing] = await db.select().from(userLevels).where(eq(userLevels.userId, userId));
    if (existing) {
      const newXP = existing.xp + amount;
      const newLevel = getLevelFromXP(newXP);
      await db.update(userLevels).set({ xp: newXP, level: newLevel }).where(eq(userLevels.userId, userId));
      return { xp: newXP, level: newLevel };
    } else {
      const newLevel = getLevelFromXP(amount);
      await db.insert(userLevels).values({ userId, xp: amount, level: newLevel });
      return { xp: amount, level: newLevel };
    }
  }

  async getActiveChallenges(userId?: string): Promise<any[]> {
    const now = new Date();
    const rows = await db.select().from(challenges)
      .where(and(eq(challenges.isActive, true), gt(challenges.endsAt, now)))
      .orderBy(desc(challenges.createdAt));

    if (!userId) return rows;

    const progressRows = await db.select().from(challengeProgress)
      .where(and(eq(challengeProgress.userId, userId), inArray(challengeProgress.challengeId, rows.map(r => r.id))));
    const progressMap = new Map(progressRows.map(p => [p.challengeId, p]));

    return rows.map(c => ({
      ...c,
      userProgress: progressMap.get(c.id)?.progress ?? 0,
      userCompleted: progressMap.get(c.id)?.completed ?? false,
    }));
  }

  async createChallenge(data: any): Promise<any> {
    const [created] = await db.insert(challenges).values(data).returning();
    return created;
  }

  async updateChallengeProgress(challengeId: string, userId: string, increment: number): Promise<any> {
    const [existing] = await db.select().from(challengeProgress)
      .where(and(eq(challengeProgress.challengeId, challengeId), eq(challengeProgress.userId, userId)));

    const [challenge] = await db.select().from(challenges).where(eq(challenges.id, challengeId));
    if (!challenge) throw new Error("Challenge not found");

    if (existing) {
      const newProgress = existing.progress + increment;
      const completed = newProgress >= challenge.target;
      const [updated] = await db.update(challengeProgress)
        .set({ progress: newProgress, completed })
        .where(eq(challengeProgress.id, existing.id))
        .returning();

      if (completed && !existing.completed) {
        await db.update(users).set({ reputation: sql`${users.reputation} + ${challenge.rewardKarma}` }).where(eq(users.id, userId));
      }
      return updated;
    } else {
      const completed = increment >= challenge.target;
      const [created] = await db.insert(challengeProgress)
        .values({ challengeId, userId, progress: increment, completed })
        .returning();

      if (completed) {
        await db.update(users).set({ reputation: sql`${users.reputation} + ${challenge.rewardKarma}` }).where(eq(users.id, userId));
      }
      return created;
    }
  }

  async createRival(data: any): Promise<any> {
    const [created] = await db.insert(rivals).values(data).returning();
    return created;
  }

  async getRivals(userId?: string): Promise<any[]> {
    const rows = await db.select({
      id: rivals.id,
      challengerId: rivals.challengerId,
      opponentId: rivals.opponentId,
      topic: rivals.topic,
      challengerArgument: rivals.challengerArgument,
      opponentArgument: rivals.opponentArgument,
      challengerVotes: rivals.challengerVotes,
      opponentVotes: rivals.opponentVotes,
      status: rivals.status,
      winnerId: rivals.winnerId,
      rewardKarma: rivals.rewardKarma,
      expiresAt: rivals.expiresAt,
      createdAt: rivals.createdAt,
    }).from(rivals).orderBy(desc(rivals.createdAt));

    const allUserIds = [...new Set(rows.flatMap(r => [r.challengerId, r.opponentId]))];
    const usersData = allUserIds.length > 0
      ? await db.select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl }).from(users).where(inArray(users.id, allUserIds))
      : [];
    const usersMap = new Map(usersData.map(u => [u.id, u]));

    let userVoteMap = new Map<string, string>();
    if (userId) {
      const voteRows = await db.select().from(rivalVotes)
        .where(and(eq(rivalVotes.userId, userId), inArray(rivalVotes.rivalId, rows.map(r => r.id))));
      userVoteMap = new Map(voteRows.map(v => [v.rivalId, v.votedFor]));
    }

    return rows.map(r => ({
      ...r,
      challengerUsername: usersMap.get(r.challengerId)?.username ?? "[deleted]",
      opponentUsername: usersMap.get(r.opponentId)?.username ?? "[deleted]",
      challengerAvatarUrl: usersMap.get(r.challengerId)?.avatarUrl ?? null,
      opponentAvatarUrl: usersMap.get(r.opponentId)?.avatarUrl ?? null,
      userVote: userVoteMap.get(r.id) ?? null,
    }));
  }

  async getRival(id: string, userId?: string): Promise<any> {
    const [row] = await db.select().from(rivals).where(eq(rivals.id, id));
    if (!row) return null;

    const [challenger] = await db.select({ username: users.username, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, row.challengerId));
    const [opponent] = await db.select({ username: users.username, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, row.opponentId));

    let userVote: string | null = null;
    if (userId) {
      const [vote] = await db.select().from(rivalVotes).where(and(eq(rivalVotes.rivalId, id), eq(rivalVotes.userId, userId)));
      userVote = vote?.votedFor ?? null;
    }

    return {
      ...row,
      challengerUsername: challenger?.username ?? "[deleted]",
      opponentUsername: opponent?.username ?? "[deleted]",
      challengerAvatarUrl: challenger?.avatarUrl ?? null,
      opponentAvatarUrl: opponent?.avatarUrl ?? null,
      userVote,
    };
  }

  async submitRivalArgument(rivalId: string, userId: string, argument: string): Promise<any> {
    const [rival] = await db.select().from(rivals).where(eq(rivals.id, rivalId));
    if (!rival) throw new Error("Rival not found");

    if (rival.opponentId === userId) {
      const [updated] = await db.update(rivals)
        .set({ opponentArgument: argument, status: "active" })
        .where(eq(rivals.id, rivalId))
        .returning();
      return updated;
    }
    throw new Error("Not authorized");
  }

  async voteRival(rivalId: string, userId: string, votedFor: string): Promise<any> {
    const [rival] = await db.select().from(rivals).where(eq(rivals.id, rivalId));
    if (!rival) throw new Error("Rival not found");

    await db.insert(rivalVotes).values({ rivalId, userId, votedFor });

    if (votedFor === rival.challengerId) {
      await db.update(rivals).set({ challengerVotes: sql`${rivals.challengerVotes} + 1` }).where(eq(rivals.id, rivalId));
    } else {
      await db.update(rivals).set({ opponentVotes: sql`${rivals.opponentVotes} + 1` }).where(eq(rivals.id, rivalId));
    }

    const [updated] = await db.select().from(rivals).where(eq(rivals.id, rivalId));
    return updated;
  }

  async getChatMessages(roomId: string): Promise<any[]> {
    const now = new Date();
    const rows = await db.select({
      id: chatMessages.id,
      roomId: chatMessages.roomId,
      userId: chatMessages.userId,
      content: chatMessages.content,
      expiresAt: chatMessages.expiresAt,
      createdAt: chatMessages.createdAt,
      username: users.username,
      avatarUrl: users.avatarUrl,
    }).from(chatMessages)
      .leftJoin(users, eq(chatMessages.userId, users.id))
      .where(and(eq(chatMessages.roomId, roomId), gt(chatMessages.expiresAt, now)))
      .orderBy(desc(chatMessages.createdAt))
      .limit(100);

    return rows.map(r => ({
      ...r,
      username: r.username ?? "[deleted]",
    }));
  }

  async createChatMessage(data: any): Promise<any> {
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const [created] = await db.insert(chatMessages).values({ ...data, expiresAt }).returning();
    return created;
  }

  async cleanExpiredChatMessages(): Promise<void> {
    const now = new Date();
    await db.delete(chatMessages).where(lt(chatMessages.expiresAt, now));
  }

  async createReport(data: any): Promise<any> {
    const [created] = await db.insert(reports).values(data).returning();
    return created;
  }

  async getReports(status?: string): Promise<any[]> {
    const conditions = status ? [eq(reports.status, status)] : [];
    const rows = await db.select({
      id: reports.id,
      reporterId: reports.reporterId,
      postId: reports.postId,
      commentId: reports.commentId,
      reason: reports.reason,
      description: reports.description,
      status: reports.status,
      juryVotesGuilty: reports.juryVotesGuilty,
      juryVotesInnocent: reports.juryVotesInnocent,
      createdAt: reports.createdAt,
      reporterUsername: users.username,
    }).from(reports)
      .leftJoin(users, eq(reports.reporterId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reports.createdAt));

    return rows.map(r => ({
      ...r,
      reporterUsername: r.reporterUsername ?? "[deleted]",
    }));
  }

  async voteReport(reportId: string, jurorId: string, verdict: string): Promise<any> {
    await db.insert(reportVotes).values({ reportId, jurorId, verdict });

    if (verdict === "guilty") {
      await db.update(reports).set({ juryVotesGuilty: sql`${reports.juryVotesGuilty} + 1` }).where(eq(reports.id, reportId));
    } else {
      await db.update(reports).set({ juryVotesInnocent: sql`${reports.juryVotesInnocent} + 1` }).where(eq(reports.id, reportId));
    }

    const [updated] = await db.select().from(reports).where(eq(reports.id, reportId));
    return updated;
  }

  async updateReportStatus(id: string, status: string): Promise<any> {
    const [updated] = await db.update(reports).set({ status }).where(eq(reports.id, id)).returning();
    return updated;
  }

  async getAwards(): Promise<any[]> {
    return db.select().from(awards).orderBy(asc(awards.cost));
  }

  async seedDefaultAwards(): Promise<void> {
    for (const awardType of AWARD_TYPES) {
      const [existing] = await db.select().from(awards).where(eq(awards.name, awardType.name));
      if (!existing) {
        await db.insert(awards).values({
          name: awardType.name,
          icon: awardType.icon,
          cost: awardType.cost,
          walletReward: awardType.walletReward,
          description: awardType.description,
          color: awardType.color,
        });
      }
    }
  }

  async giveAward(postId: string, awardId: string, fromUserId: string): Promise<any> {
    const [award] = await db.select().from(awards).where(eq(awards.id, awardId));
    if (!award) throw new Error("Award not found");

    const fromUser = await this.getUser(fromUserId);
    if (!fromUser || fromUser.reputation < award.cost) throw new Error("Karma tidak cukup");

    await db.update(users).set({ reputation: fromUser.reputation - award.cost }).where(eq(users.id, fromUserId));

    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (post && award.walletReward > 0) {
      await db.update(users).set({ walletBalance: sql`${users.walletBalance} + ${award.walletReward}` }).where(eq(users.id, post.userId));
      await this.addWalletTransaction({
        userId: post.userId,
        type: "award_received",
        amount: award.walletReward,
        metadata: { awardName: award.name, fromUserId },
      });
    }

    const [created] = await db.insert(postAwards).values({ postId, awardId, fromUserId }).returning();
    return created;
  }

  async getPostAwards(postId: string): Promise<any[]> {
    const rows = await db.select({
      id: postAwards.id,
      postId: postAwards.postId,
      awardId: postAwards.awardId,
      fromUserId: postAwards.fromUserId,
      createdAt: postAwards.createdAt,
      name: awards.name,
      icon: awards.icon,
      color: awards.color,
    }).from(postAwards)
      .innerJoin(awards, eq(postAwards.awardId, awards.id))
      .where(eq(postAwards.postId, postId))
      .orderBy(desc(postAwards.createdAt));
    return rows;
  }

  async createBounty(data: any): Promise<any> {
    const user = await this.getUser(data.userId);
    if (!user || user.walletBalance < data.amount) throw new Error("Saldo tidak mencukupi");

    await db.update(users).set({ walletBalance: user.walletBalance - data.amount }).where(eq(users.id, data.userId));
    await this.addWalletTransaction({
      userId: data.userId,
      type: "bounty_placed",
      amount: -data.amount,
      metadata: { postId: data.postId },
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const [created] = await db.insert(bounties).values({ ...data, expiresAt }).returning();
    return created;
  }

  async getPostBounty(postId: string): Promise<any> {
    const [bounty] = await db.select().from(bounties)
      .where(and(eq(bounties.postId, postId), eq(bounties.status, "active")))
      .orderBy(desc(bounties.createdAt));
    return bounty ?? null;
  }

  async awardBounty(bountyId: string, winnerId: string, commentId: string): Promise<any> {
    const [bounty] = await db.select().from(bounties).where(eq(bounties.id, bountyId));
    if (!bounty) throw new Error("Bounty not found");

    await db.update(users).set({ walletBalance: sql`${users.walletBalance} + ${bounty.amount}` }).where(eq(users.id, winnerId));
    await this.addWalletTransaction({
      userId: winnerId,
      type: "bounty_won",
      amount: bounty.amount,
      metadata: { bountyId, postId: bounty.postId },
    });

    const [updated] = await db.update(bounties)
      .set({ status: "awarded", winnerId, winnerCommentId: commentId })
      .where(eq(bounties.id, bountyId))
      .returning();
    return updated;
  }

  async createGlobalPoll(data: any): Promise<any> {
    const expiresAt = new Date(Date.now() + (data.expiresInHours || 24) * 60 * 60 * 1000);
    const [poll] = await db.insert(globalPolls).values({
      title: data.title,
      createdBy: data.createdBy,
      expiresAt,
    }).returning();

    for (const optionText of data.options) {
      await db.insert(globalPollOptions).values({ pollId: poll.id, text: optionText });
    }

    return poll;
  }

  async getActiveGlobalPolls(userId?: string): Promise<any[]> {
    const now = new Date();
    const rows = await db.select({
      id: globalPolls.id,
      title: globalPolls.title,
      createdBy: globalPolls.createdBy,
      isActive: globalPolls.isActive,
      expiresAt: globalPolls.expiresAt,
      createdAt: globalPolls.createdAt,
      creatorUsername: users.username,
    }).from(globalPolls)
      .leftJoin(users, eq(globalPolls.createdBy, users.id))
      .where(and(eq(globalPolls.isActive, true), gt(globalPolls.expiresAt, now)))
      .orderBy(desc(globalPolls.createdAt));

    const pollIds = rows.map(r => r.id);
    if (pollIds.length === 0) return [];

    const options = await db.select().from(globalPollOptions)
      .where(inArray(globalPollOptions.pollId, pollIds));

    let userVoteMap = new Map<string, string>();
    if (userId && pollIds.length > 0) {
      const voteRows = await db.select().from(globalPollVotes)
        .where(and(eq(globalPollVotes.userId, userId), inArray(globalPollVotes.pollId, pollIds)));
      userVoteMap = new Map(voteRows.map(v => [v.pollId, v.optionId]));
    }

    const optionsMap = new Map<string, typeof options>();
    for (const opt of options) {
      if (!optionsMap.has(opt.pollId)) optionsMap.set(opt.pollId, []);
      optionsMap.get(opt.pollId)!.push(opt);
    }

    return rows.map(r => {
      const pollOptions = optionsMap.get(r.id) ?? [];
      const totalVotes = pollOptions.reduce((sum, o) => sum + o.voteCount, 0);
      return {
        ...r,
        creatorUsername: r.creatorUsername ?? "[deleted]",
        options: pollOptions.map(o => ({ id: o.id, text: o.text, voteCount: o.voteCount })),
        totalVotes,
        userVotedOptionId: userVoteMap.get(r.id) ?? null,
      };
    });
  }

  async voteGlobalPoll(pollId: string, optionId: string, userId: string): Promise<any> {
    await db.insert(globalPollVotes).values({ pollId, optionId, userId });
    await db.update(globalPollOptions)
      .set({ voteCount: sql`${globalPollOptions.voteCount} + 1` })
      .where(eq(globalPollOptions.id, optionId));

    const [poll] = await db.select().from(globalPolls).where(eq(globalPolls.id, pollId));
    return poll;
  }

  async getUserProfileTheme(userId: string): Promise<any> {
    const [theme] = await db.select().from(userProfileThemes).where(eq(userProfileThemes.userId, userId));
    return theme ?? null;
  }

  async setUserProfileTheme(userId: string, data: any): Promise<any> {
    const [existing] = await db.select().from(userProfileThemes).where(eq(userProfileThemes.userId, userId));
    if (existing) {
      const [updated] = await db.update(userProfileThemes).set(data).where(eq(userProfileThemes.userId, userId)).returning();
      return updated;
    } else {
      const [created] = await db.insert(userProfileThemes).values({ userId, ...data }).returning();
      return created;
    }
  }

  async getUserStats(username: string): Promise<any> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) return null;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [postCountResult] = await db.select({ count: sql<number>`count(*)::int` }).from(posts)
      .where(and(eq(posts.userId, user.id), eq(posts.isDeleted, false)));
    const [commentCountResult] = await db.select({ count: sql<number>`count(*)::int` }).from(comments)
      .where(and(eq(comments.userId, user.id), eq(comments.isDeleted, false)));

    const [upvotesResult] = await db.select({ count: sql<number>`count(*)::int` }).from(votes)
      .where(and(inArray(votes.postId, db.select({ id: posts.id }).from(posts).where(eq(posts.userId, user.id))), eq(votes.value, 1)));
    const [downvotesResult] = await db.select({ count: sql<number>`count(*)::int` }).from(votes)
      .where(and(inArray(votes.postId, db.select({ id: posts.id }).from(posts).where(eq(posts.userId, user.id))), eq(votes.value, -1)));

    const dailyPosts = await db.select({
      date: sql<string>`to_char(${posts.createdAt}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    }).from(posts)
      .where(and(eq(posts.userId, user.id), gt(posts.createdAt, thirtyDaysAgo), eq(posts.isDeleted, false)))
      .groupBy(sql`to_char(${posts.createdAt}, 'YYYY-MM-DD')`);

    const dailyComments = await db.select({
      date: sql<string>`to_char(${comments.createdAt}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    }).from(comments)
      .where(and(eq(comments.userId, user.id), gt(comments.createdAt, thirtyDaysAgo), eq(comments.isDeleted, false)))
      .groupBy(sql`to_char(${comments.createdAt}, 'YYYY-MM-DD')`);

    const postMap = new Map(dailyPosts.map(d => [d.date, d.count]));
    const commentMap = new Map(dailyComments.map(d => [d.date, d.count]));

    const activityGraph: { date: string; posts: number; comments: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      activityGraph.push({
        date: dateStr,
        posts: postMap.get(dateStr) ?? 0,
        comments: commentMap.get(dateStr) ?? 0,
      });
    }

    const userPosts = await db.select({ flair: posts.flair }).from(posts)
      .where(and(eq(posts.userId, user.id), eq(posts.isDeleted, false)));
    const tagCounts = new Map<string, number>();
    for (const p of userPosts) {
      if (p.flair) {
        tagCounts.set(p.flair, (tagCounts.get(p.flair) ?? 0) + 1);
      }
    }
    const favoriteTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    const hourCounts = await db.select({
      hour: sql<number>`extract(hour from ${posts.createdAt})::int`,
      count: sql<number>`count(*)::int`,
    }).from(posts)
      .where(and(eq(posts.userId, user.id), eq(posts.isDeleted, false)))
      .groupBy(sql`extract(hour from ${posts.createdAt})`);

    let favoriteHour = 0;
    let maxHourCount = 0;
    for (const h of hourCounts) {
      if (h.count > maxHourCount) {
        maxHourCount = h.count;
        favoriteHour = h.hour;
      }
    }

    const topPostRows = await db.select().from(posts)
      .where(and(eq(posts.userId, user.id), eq(posts.isDeleted, false)))
      .orderBy(desc(posts.score))
      .limit(1);
    const topPost = topPostRows.length > 0 ? await this.enrichPost(topPostRows[0]) : null;

    return {
      totalPosts: postCountResult.count,
      totalComments: commentCountResult.count,
      totalUpvotesReceived: upvotesResult.count,
      totalDownvotesReceived: downvotesResult.count,
      topPost,
      favoriteHour,
      activityGraph,
      favoriteTags,
    };
  }
}

export const storage = new DatabaseStorage();
