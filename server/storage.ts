import {
  type User, type InsertUser, type Post, type InsertPost,
  type Comment, type InsertComment, type Vote, type InsertVote,
  type PostWithUser, type CommentWithUser, type UserProfile,
  type Badge, type UserBadge, type Group, type GroupMember,
  type GroupWithInfo, type EmailVerification, type AdminSetting,
  type Notification, type Bookmark,
  users, posts, comments, votes,
  emailVerifications, adminSettings, badges, userBadges,
  groups, groupMembers, notifications, bookmarks,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gt, sql, lt, ne, isNull, asc, inArray } from "drizzle-orm";

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
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const [created] = await db.insert(posts).values({ ...post, expiresAt }).returning();
    return created;
  }

  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  private async enrichPost(post: Post, currentUserId?: string): Promise<PostWithUser> {
    const [user] = await db.select().from(users).where(eq(users.id, post.userId));
    const commentCount = await this.getCommentCount(post.id);
    let userVote: number | null = null;
    if (currentUserId) {
      const vote = await this.getUserVote(currentUserId, post.id);
      userVote = vote?.value ?? null;
    }

    let groupSlug: string | null = null;
    let groupName: string | null = null;
    if (post.groupId) {
      const [group] = await db.select().from(groups).where(eq(groups.id, post.groupId));
      if (group) {
        groupSlug = group.slug;
        groupName = group.name;
      }
    }

    let isBookmarkedVal = false;
    if (currentUserId) {
      isBookmarkedVal = await this.isBookmarked(currentUserId, post.id);
    }

    return {
      ...post,
      username: user?.username ?? "[deleted]",
      commentCount,
      isPublicEnemy: (user?.reputation ?? 0) <= -300,
      userVote,
      avatarUrl: user?.avatarUrl,
      groupSlug,
      groupName,
      isBookmarked: isBookmarkedVal,
    };
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
          gt(posts.score, -200),
          isNull(posts.groupId)
        )
      )
      .orderBy(desc(posts.heat), asc(posts.score), desc(posts.createdAt));

    const result: PostWithUser[] = [];
    for (const post of allPosts) {
      const [user] = await db.select().from(users).where(eq(users.id, post.userId));
      if (excludeShadowBanned && user?.shadowBanned && post.userId !== currentUserId) continue;
      const enriched = await this.enrichPost(post, currentUserId);
      result.push(enriched);
    }
    return result;
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

    const result: PostWithUser[] = [];
    for (const post of groupPosts) {
      result.push(await this.enrichPost(post, currentUserId));
    }
    return result;
  }

  async getAllPosts(): Promise<(Post & { username: string })[]> {
    const allPosts = await db.select().from(posts).orderBy(desc(posts.createdAt));
    const result = [];
    for (const post of allPosts) {
      const [user] = await db.select().from(users).where(eq(users.id, post.userId));
      result.push({ ...post, username: user?.username ?? "[deleted]" });
    }
    return result;
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
    const allComments = await db
      .select()
      .from(comments)
      .where(and(eq(comments.postId, postId), eq(comments.isDeleted, false)))
      .orderBy(desc(comments.createdAt));

    const result: CommentWithUser[] = [];
    for (const comment of allComments) {
      const [user] = await db.select().from(users).where(eq(users.id, comment.userId));
      if (excludeShadowBanned && user?.shadowBanned && comment.userId !== currentUserId) continue;

      let userVote: number | null = null;
      if (currentUserId) {
        const vote = await this.getUserVote(currentUserId, undefined, comment.id);
        userVote = vote?.value ?? null;
      }

      result.push({
        ...comment,
        username: user?.username ?? "[deleted]",
        isPublicEnemy: (user?.reputation ?? 0) <= -300,
        userVote,
      });
    }
    return result;
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
            const [postOwner] = await db.select().from(users).where(eq(users.id, post.userId));
            if (postOwner) {
              await db.update(users).set({
                reputation: sql`reputation - ${existing.value}`
              }).where(eq(users.id, post.userId));
              const updatedUser = await this.getUser(post.userId);
              if (updatedUser && updatedUser.reputation <= -200 && !updatedUser.shadowBanned) {
                await db.update(users).set({ shadowBanned: true }).where(eq(users.id, post.userId));
              }
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

    const [postCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(and(eq(posts.userId, user.id), eq(posts.isDeleted, false)));

    const [commentCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .where(and(eq(comments.userId, user.id), eq(comments.isDeleted, false)));

    const userBadgesList = await this.getUserBadges(user.id);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      role: user.role,
      reputation: user.reputation,
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

    const result: PostWithUser[] = [];
    for (const post of userPosts) {
      result.push(await this.enrichPost(post, currentUserId));
    }
    return result;
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
    const [setting] = await db.select().from(adminSettings).where(eq(adminSettings.key, key));
    return setting?.value;
  }

  async setAdminSetting(key: string, value: string): Promise<void> {
    const existing = await this.getAdminSetting(key);
    if (existing !== undefined) {
      await db.update(adminSettings).set({ value }).where(eq(adminSettings.key, key));
    } else {
      await db.insert(adminSettings).values({ key, value });
    }
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
    const ubs = await db
      .select()
      .from(userBadges)
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.awardedAt));

    const result: (Badge & { awardedAt: Date | string })[] = [];
    for (const ub of ubs) {
      const [badge] = await db.select().from(badges).where(eq(badges.id, ub.badgeId));
      if (badge) {
        result.push({ ...badge, awardedAt: ub.awardedAt });
      }
    }
    return result;
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

    const [memberCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, group.id));

    const [creator] = await db.select().from(users).where(eq(users.id, group.createdBy));

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
    const result: GroupWithInfo[] = [];

    for (const group of allGroups) {
      const [memberCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, group.id));

      const [creator] = await db.select().from(users).where(eq(users.id, group.createdBy));

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

      result.push({
        ...group,
        memberCount: memberCountResult.count,
        creatorUsername: creator?.username ?? "[deleted]",
        isMember,
        userRole,
      });
    }
    return result;
  }

  async joinGroup(groupId: string, userId: string): Promise<GroupMember> {
    const [created] = await db.insert(groupMembers).values({ groupId, userId }).returning();
    return created;
  }

  async leaveGroup(groupId: string, userId: string): Promise<void> {
    await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  }

  async getGroupMembers(groupId: string): Promise<(GroupMember & { username: string; avatarUrl?: string | null })[]> {
    const members = await db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
    const result: (GroupMember & { username: string; avatarUrl?: string | null })[] = [];
    for (const m of members) {
      const [user] = await db.select().from(users).where(eq(users.id, m.userId));
      result.push({ ...m, username: user?.username ?? "[deleted]", avatarUrl: user?.avatarUrl });
    }
    return result;
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

    const result: PostWithUser[] = [];
    for (const bm of userBookmarks) {
      const post = await this.getPostWithUser(bm.postId, userId);
      if (post) {
        result.push(post);
      }
    }
    return result;
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

    const [totalUsersResult] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const [activeUsersResult] = await db.select({ count: sql<number>`count(distinct user_id)::int` }).from(posts).where(gt(posts.createdAt, dayAgo));
    const [totalPostsResult] = await db.select({ count: sql<number>`count(*)::int` }).from(posts);
    const [activePostsResult] = await db.select({ count: sql<number>`count(*)::int` }).from(posts).where(and(gt(posts.expiresAt, now), eq(posts.isDeleted, false)));
    const [deadPostsResult] = await db.select({ count: sql<number>`count(*)::int` }).from(posts).where(lt(posts.expiresAt, now));
    const [shadowBannedResult] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.shadowBanned, true));
    const [publicEnemiesResult] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(lt(users.reputation, sql`-300`));

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
}

export const storage = new DatabaseStorage();
