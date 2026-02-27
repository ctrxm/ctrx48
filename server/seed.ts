import { db } from "./db";
import { users, posts, comments } from "@shared/schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function seed() {
  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) return;

  const hashed = await bcrypt.hash("admin123", 10);
  const userHashed = await bcrypt.hash("password", 10);

  const [admin] = await db.insert(users).values({
    username: "overlord",
    password: hashed,
    role: "admin",
    reputation: 100,
  }).returning();

  const [user1] = await db.insert(users).values({
    username: "void_walker",
    password: userHashed,
    reputation: -50,
  }).returning();

  const [user2] = await db.insert(users).values({
    username: "signal_noise",
    password: userHashed,
    reputation: 25,
  }).returning();

  const [user3] = await db.insert(users).values({
    username: "dead_channel",
    password: userHashed,
    reputation: -10,
  }).returning();

  const [user4] = await db.insert(users).values({
    username: "null_ref",
    password: userHashed,
    reputation: 5,
  }).returning();

  const now = new Date();
  const h48 = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const h12 = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const h3 = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const [post1] = await db.insert(posts).values({
    title: "The internet was a mistake",
    content: "We built a tool for communication and turned it into a machine for outrage. Every platform optimizes for engagement, which is just a euphemism for rage. We scroll not because we want to, but because we can't stop. The feed never ends. The discourse never improves. We are rats pressing the lever.\n\nProve me wrong. You can't.",
    userId: user1.id,
    score: 15,
    heat: 20,
    expiresAt: h48,
  }).returning();

  const [post2] = await db.insert(posts).values({
    title: "Why do we pretend meetings are productive?",
    content: "8 people in a room. 1 person talks. 7 people wait for it to end. The decision was already made before the meeting started. We just need the theater of consensus.\n\nEvery meeting could have been an email. Every email could have been a Slack message. Every Slack message could have been nothing.",
    userId: user2.id,
    score: 42,
    heat: 35,
    expiresAt: h48,
  }).returning();

  const [post3] = await db.insert(posts).values({
    title: "Social media killed authenticity",
    content: "Nobody posts what they actually feel. Everything is curated. Every photo is the 47th take. Every caption is workshopped. We've become brands, not people. The real you exists only in the space between posts.",
    userId: user3.id,
    score: -12,
    heat: 45,
    expiresAt: h12,
  }).returning();

  const [post4] = await db.insert(posts).values({
    title: "Hot take: most code is terrible and that's fine",
    content: "Stop obsessing over clean code. Your startup will die before anyone reads your beautifully architected codebase. Ship the ugly thing. Make money. Refactor never. The graveyard of startups is full of perfect codebases that nobody used.",
    userId: user4.id,
    score: 28,
    heat: 15,
    expiresAt: h48,
  }).returning();

  const [post5] = await db.insert(posts).values({
    title: "This thread will die in 3 hours",
    content: "And nothing of value will be lost. Just like every other conversation on the internet. We shout into the void and the void shouts back with advertisements.",
    userId: user1.id,
    score: -5,
    heat: 8,
    expiresAt: h3,
  }).returning();

  await db.insert(comments).values([
    { postId: post1.id, userId: user2.id, content: "Based. The dopamine loop is real and we're all addicted.", score: 8 },
    { postId: post1.id, userId: user3.id, content: "You say this while posting on yet another internet forum. The irony writes itself.", score: 12 },
    { postId: post1.id, userId: user4.id, content: "Every generation thinks they discovered the apocalypse. Relax.", score: -3 },
    { postId: post2.id, userId: user1.id, content: "Had a meeting today about reducing meetings. You can't make this up.", score: 25 },
    { postId: post2.id, userId: user4.id, content: "The real purpose of meetings is to diffuse responsibility. Nobody wants to make the call alone.", score: 15 },
    { postId: post3.id, userId: user2.id, content: "Delete your social media. It's been 2 years for me. Best decision ever.", score: 5 },
    { postId: post3.id, userId: user4.id, content: "He said, on social media.", score: 20 },
    { postId: post4.id, userId: user3.id, content: "Tell that to the person who has to maintain your 'beautiful' spaghetti 3 years later.", score: 18 },
    { postId: post4.id, userId: user1.id, content: "Bold of you to assume the project will exist in 3 years.", score: 10 },
    { postId: post5.id, userId: user3.id, content: "Watching the timer tick down is oddly therapeutic.", score: 3 },
  ]);
}
