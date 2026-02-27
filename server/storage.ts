import {
  type User, type InsertUser, type Post, type InsertPost,
  type Comment, type InsertComment, type Vote, type InsertVote,
  type PostWithUser, type CommentWithUser, type UserProfile,
  users, posts, comments, votes,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gt, sql, lt, ne, isNull, asc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { password: string }): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  createPost(post: InsertPost & { userId: string }): Promise<Post>;
  getPost(id: string): Promise<Post | undefined>;
  getPostWithUser(id: string, currentUserId?: string): Promise<PostWithUser | undefined>;
  getActivePosts(currentUserId?: string, excludeShadowBanned?: boolean): Promise<PostWithUser[]>;
  getAllPosts(): Promise<(Post & { username: string })[]>;
  updatePost(id: string, data: Partial<Post>): Promise<Post | undefined>;

  createComment(comment: InsertComment & { userId: string }): Promise<Comment>;
  getCommentsByPost(postId: string, currentUserId?: string, excludeShadowBanned?: boolean): Promise<CommentWithUser[]>;
  getComment(id: string): Promise<Comment | undefined>;
  updateComment(id: string, data: Partial<Comment>): Promise<Comment | undefined>;
  getCommentCount(postId: string): Promise<number>;

  upsertVote(vote: InsertVote & { userId: string }): Promise<void>;
  getUserVote(userId: string, postId?: string, commentId?: string): Promise<Vote | undefined>;

  getUserProfile(username: string): Promise<UserProfile | undefined>;
  getUserPosts(username: string, currentUserId?: string): Promise<PostWithUser[]>;
  updateUserProfile(id: string, data: { displayName?: string; bio?: string }): Promise<User | undefined>;

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

  async createUser(user: InsertUser & { password: string }): Promise<User> {
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

  async createPost(post: InsertPost & { userId: string }): Promise<Post> {
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const [created] = await db.insert(posts).values({ ...post, expiresAt }).returning();
    return created;
  }

  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async getPostWithUser(id: string, currentUserId?: string): Promise<PostWithUser | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    if (!post) return undefined;

    const [user] = await db.select().from(users).where(eq(users.id, post.userId));
    const commentCount = await this.getCommentCount(id);
    let userVote: number | null = null;
    if (currentUserId) {
      const vote = await this.getUserVote(currentUserId, id);
      userVote = vote?.value ?? null;
    }

    return {
      ...post,
      username: user?.username ?? "[deleted]",
      commentCount,
      isPublicEnemy: (user?.reputation ?? 0) <= -300,
      userVote,
    };
  }

  async getActivePosts(currentUserId?: string, excludeShadowBanned = true): Promise<PostWithUser[]> {
    const now = new Date();
    let allPosts = await db
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

    const result: PostWithUser[] = [];
    for (const post of allPosts) {
      const [user] = await db.select().from(users).where(eq(users.id, post.userId));
      if (excludeShadowBanned && user?.shadowBanned && post.userId !== currentUserId) continue;

      const commentCount = await this.getCommentCount(post.id);
      let userVote: number | null = null;
      if (currentUserId) {
        const vote = await this.getUserVote(currentUserId, post.id);
        userVote = vote?.value ?? null;
      }

      result.push({
        ...post,
        username: user?.username ?? "[deleted]",
        commentCount,
        isPublicEnemy: (user?.reputation ?? 0) <= -300,
        userVote,
      });
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

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      role: user.role,
      reputation: user.reputation,
      createdAt: user.createdAt,
      postCount: postCountResult.count,
      commentCount: commentCountResult.count,
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
      const commentCount = await this.getCommentCount(post.id);
      let userVote: number | null = null;
      if (currentUserId) {
        const vote = await this.getUserVote(currentUserId, post.id);
        userVote = vote?.value ?? null;
      }
      result.push({
        ...post,
        username: user.username,
        commentCount,
        isPublicEnemy: user.reputation <= -300,
        userVote,
      });
    }
    return result;
  }

  async updateUserProfile(id: string, data: { displayName?: string; bio?: string }): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ displayName: data.displayName, bio: data.bio })
      .where(eq(users.id, id))
      .returning();
    return updated;
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
