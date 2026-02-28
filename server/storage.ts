import {
  type User, type InsertUser, type Post, type InsertPost,
  type Comment, type InsertComment, type Vote, type InsertVote,
  type PostWithUser, type CommentWithUser, type UserProfile,
  type Badge, type UserBadge, type Group, type GroupMember,
  type GroupWithInfo, type EmailVerification, type AdminSetting,
  type Notification, type Bookmark, type Payment, type Tip, type Ad,
  users, posts, comments, votes,
  emailVerifications, adminSettings, badges, userBadges,
  groups, groupMembers, notifications, bookmarks,
  payments, tips, ads,
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
  createAd(data: { title: string; imageUrl: string; linkUrl: string }): Promise<Ad>;
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

  async createPost(post: InsertPost & { userId: string; linkTitle?: string; linkDescription?: string; linkImage?: string }): Promise<Post> {
    const user = await this.getUser(post.userId);
    const isActivePremium = user?.isPremium && user?.premiumExpiresAt && user.premiumExpiresAt > new Date();
    const hours = isActivePremium ? 168 : 48;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const [created] = await db.insert(posts).values({ ...post, expiresAt }).returning();
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
    const groupIds = [...new Set(postList.filter(p => p.groupId).map(p => p.groupId!))] ;

    const [usersData, commentCounts, tipTotals] = await Promise.all([
      db.select({
        id: users.id,
        username: users.username,
        reputation: users.reputation,
        avatarUrl: users.avatarUrl,
        isPremium: users.isPremium,
        premiumExpiresAt: users.premiumExpiresAt,
        isVerified: users.isVerified,
        shadowBanned: users.shadowBanned,
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
    ]);

    const groupsData = groupIds.length > 0
      ? await db.select({ id: groups.id, slug: groups.slug, name: groups.name }).from(groups).where(inArray(groups.id, groupIds))
      : [];

    let userVotes: Vote[] = [];
    let userBookmarkSet = new Set<string>();

    if (currentUserId) {
      const [votesData, bookmarksData] = await Promise.all([
        db.select().from(votes)
          .where(and(eq(votes.userId, currentUserId), inArray(votes.postId, postIds))),
        db.select({ postId: bookmarks.postId }).from(bookmarks)
          .where(and(eq(bookmarks.userId, currentUserId), inArray(bookmarks.postId, postIds))),
      ]);
      userVotes = votesData;
      userBookmarkSet = new Set(bookmarksData.map(b => b.postId));
    }

    const usersMap = new Map(usersData.map(u => [u.id, u]));
    const commentCountMap = new Map(commentCounts.map(c => [c.postId, c.count]));
    const tipTotalMap = new Map(tipTotals.map(t => [t.toPostId, t.total]));
    const groupsMap = new Map(groupsData.map(g => [g.id, g]));
    const voteMap = new Map(userVotes.filter(v => v.postId).map(v => [v.postId!, v.value]));

    return postList.map(post => {
      const user = usersMap.get(post.userId);
      const group = post.groupId ? groupsMap.get(post.groupId) : null;
      const now = new Date();

      return {
        ...post,
        username: user?.username ?? "[deleted]",
        commentCount: commentCountMap.get(post.id) ?? 0,
        isPublicEnemy: (user?.reputation ?? 0) <= -300,
        userVote: voteMap.get(post.id) ?? null,
        avatarUrl: user?.avatarUrl ?? null,
        groupSlug: group?.slug ?? null,
        groupName: group?.name ?? null,
        isBookmarked: userBookmarkSet.has(post.id),
        isPremiumUser: (user?.isPremium && user?.premiumExpiresAt && user.premiumExpiresAt > now) ?? false,
        isVerifiedUser: user?.isVerified ?? false,
        tipTotal: tipTotalMap.get(post.id) ?? 0,
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
      .orderBy(desc(posts.heat), asc(posts.score), desc(posts.createdAt));

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

  async createAd(data: { title: string; imageUrl: string; linkUrl: string }): Promise<Ad> {
    const [created] = await db.insert(ads).values(data).returning();
    return created;
  }

  async deleteAd(id: string): Promise<void> {
    await db.delete(ads).where(eq(ads.id, id));
  }
}

export const storage = new DatabaseStorage();
