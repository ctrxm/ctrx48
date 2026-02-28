# CTRXL48 — Chaos Forum

## Overview
Anonymous chaos forum where posts die in 48 hours. Votes have real consequences. Users can become "Public Enemy". Modern Twitter/X-style feed layout with violet/purple gradient branding.

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Session-based with bcryptjs (connect-pg-simple session store)
- **Email**: nodemailer (SMTP via cyberpersons.com)
- **Uploads**: multer (memory) → Cloudflare R2 (S3-compatible)
- **Link Previews**: cheerio for OG tag extraction
- **Routing**: wouter (frontend), Express (backend)

## Architecture
- `shared/schema.ts` — Drizzle schema for users, posts, comments, votes, email_verifications, admin_settings, badges, user_badges, groups, group_members, notifications, bookmarks, payments, tips, ads, polls, poll_options, poll_votes, reactions, achievements, user_achievements, whispers, karma_purchases, reserved_usernames, wallet_transactions, withdrawals
- `server/routes.ts` — All API endpoints with auth/admin middleware + rate limiting
- `server/storage.ts` — Database storage layer (IStorage interface + DatabaseStorage)
- `server/email.ts` — Nodemailer transporter + OTP generation + email sending
- `server/upload.ts` — Multer memory storage config (5MB limit, JPEG/PNG/GIF/WebP)
- `server/r2.ts` — Cloudflare R2 upload client (@aws-sdk/client-s3)
- `server/linkPreview.ts` — Fetch and parse OG/meta tags from URLs
- `server/bayar.ts` — bayar.gg payment gateway client (create + check payments)
- `server/seed.ts` — Initial seed data (admin: overlord/admin123, users: password)
- `client/src/pages/` — Home, Login, Register, NewPost, PostDetail, UserProfile, Admin, Groups, GroupDetail, Notifications, Bookmarks, Premium, Leaderboard, Achievements, Tags, Whispers, KarmaShop, DailyRecap, Wallet, UsernameMarket, not-found
- `client/src/components/` — Header, PostCard, VoteButton, CommentItem, SidebarWidget, AdBanner, PaymentModal, PollDisplay, ReactionBar, AchievementBadge, PostSkeleton, UserHoverCard
- `client/src/lib/auth.tsx` — Auth context provider with login/register/logout
- `client/src/lib/queryClient.ts` — Single shared QueryClient instance (NEVER create another)

## Routes
- `/` — Home feed with Hot/New/Top sort
- `/trending` — Trending (same component as Home)
- `/login` — Login page
- `/register` — Registration page (email OTP or quick signup)
- `/new` — Create new post: text, image upload, link, or poll (auth required)
- `/post/:id` — Post detail with nested comments, image display, link previews
- `/u/:username` — User profile with avatar/banner upload, badges display
- `/admin` — Admin panel (overview, users, posts, badges, settings)
- `/groups` — Groups listing, create/join/leave groups
- `/groups/:slug` — Group detail with posts, members, moderator management
- `/notifications` — User notifications list
- `/bookmarks` — User's saved/bookmarked posts
- `/premium` — Premium membership and verified badge purchase page
- `/leaderboard` — Leaderboard (top users, best posts, public enemies)
- `/achievements` — All achievements with progress tracking
- `/tags` — Trending hashtags extracted from active posts
- `/whispers` — Anonymous whisper messages (send/receive DMs, 1x/day/person)
- `/karma-shop` — Spend karma on perks (custom flair, pin post, double vote, etc.)
- `/recap` — Daily recap with top post, most commented, most reacted, stats
- `/wallet` — Wallet: balance, transactions, withdrawal requests (auth required)
- `/username-market` — Browse and buy premium/reserved usernames

## API Endpoints
### Auth
- `POST /api/auth/register` — Quick register (username+password)
- `POST /api/auth/register-email` — Register with email OTP verification
- `POST /api/auth/send-otp` — Send OTP code to email
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Current user

### Posts
- `GET /api/posts` — Active posts
- `GET /api/posts/:id` — Single post
- `POST /api/posts` — Create post (text/image/link/poll type, auth, rate limited 30s)
- `GET /api/posts/:id/comments` — Comments for a post
- `POST /api/comments` — Create comment (auth, rate limited 10s)
- `POST /api/votes` — Upvote/downvote

### Uploads
- `POST /api/upload` — Upload image (returns URL)
- `POST /api/link-preview` — Fetch link preview metadata

### Users
- `GET /api/users/:username` — User profile (includes badges)
- `GET /api/users/:username/posts` — User's posts
- `PATCH /api/profile` — Update own profile (displayName, bio)
- `POST /api/profile/avatar` — Upload avatar image
- `POST /api/profile/banner` — Upload banner image

### Groups
- `GET /api/groups` — All groups (with membership status if logged in)
- `GET /api/groups/:slug` — Single group
- `GET /api/groups/:slug/posts` — Posts in a group (private groups require membership)
- `GET /api/groups/:slug/members` — Group members (private groups require membership)
- `POST /api/groups` — Create group (auth)
- `POST /api/groups/:slug/join` — Join group (auth)
- `POST /api/groups/:slug/leave` — Leave group (auth)
- `PATCH /api/groups/:slug` — Update group (bannerUrl, avatarUrl, description; owner/mod only)
- `PATCH /api/groups/:slug/members/:userId/role` — Set member role (owner/mod only)
- `POST /api/admin/achievements/grant-all` — Grant all achievements to user { username } (admin)

### Notifications
- `GET /api/notifications` — User notifications (auth)
- `GET /api/notifications/count` — Unread count (auth)
- `POST /api/notifications/read/:id` — Mark one as read (auth, ownership checked)
- `POST /api/notifications/read-all` — Mark all as read (auth)

### Bookmarks
- `GET /api/bookmarks` — User's bookmarked posts (auth)
- `POST /api/bookmarks` — Add bookmark { postId } (auth)
- `DELETE /api/bookmarks/:postId` — Remove bookmark (auth)

### Payments (bayar.gg)
- `POST /api/payments/premium` — Create premium membership payment (Rp 25.000/30 days, auth)
- `POST /api/payments/verified` — Create verified badge payment (Rp 50.000, auth)
- `POST /api/payments/premium-username` — Buy premium username with glow effect (admin-configurable price, auth)
- `POST /api/payments/boost/:postId` — Boost own post (Rp 5.000, auth, own post only)
- `POST /api/payments/tip/:postId` — Tip a post (min Rp 1.000, auth)
- `POST /api/payments/group/:slug` — Pay to join premium group (Rp 10.000, auth)
- `GET /api/payments/check/:invoiceId` — Check payment status, auto-apply if paid (auth)
- `POST /api/payments/webhook` — bayar.gg webhook callback (no auth)
- `GET /api/payments/history` — User's payment history (auth)

### Ads
- `GET /api/ads` — Active ads (public); `?placement=sidebar|feed|header|post_detail` to filter by placement
- `POST /api/admin/ads` — Create ad with placement (admin)
- `DELETE /api/admin/ads/:id` — Delete ad (admin)

### Polls
- `GET /api/polls/:postId` — Get poll results with options + vote counts
- `POST /api/polls/:postId/vote` — Vote on poll option { optionId } (auth, one vote per poll)

### Reactions
- `POST /api/reactions` — Add reaction { postId, emoji } (auth, toggle — duplicate removes)
- `DELETE /api/reactions` — Remove reaction { postId, emoji } (auth)

### Leaderboard
- `GET /api/leaderboard` — All-time leaderboard: top users by rep, top posts by score, public enemies

### Achievements
- `GET /api/achievements` — All available achievements
- `GET /api/users/:username/achievements` — User's unlocked achievements

### Threads
- `GET /api/threads/:threadId` — Get all posts in a thread chain

### Tags
- `GET /api/tags/trending` — Top 20 trending hashtags from active posts

### Whispers
- `GET /api/whispers` — User's sent + received whispers (auth)
- `POST /api/whispers` — Send whisper { toUsername, content } (auth, 1x/day/recipient)
- `PATCH /api/whispers/:id/read` — Mark whisper as read (auth)

### Karma Shop
- `GET /api/karma-shop/items` — List available karma shop items with costs
- `POST /api/karma-shop/purchase` — Purchase item { itemKey } (auth, deducts karma)

### Daily Recap
- `GET /api/recap` — Daily recap stats (top post, most commented, most reacted, totals)

### Wallet
- `GET /api/wallet` — User's wallet balance, transactions, and withdrawals (auth)
- `POST /api/wallet/withdraw` — Request withdrawal { amount, method, accountName, accountNumber } (auth)

### Username Management
- `POST /api/profile/change-username` — Change username { newUsername } (auth, checks reserved/premium)
- `POST /api/payments/buy-username` — Purchase premium/short username { username, reservedId } (auth, via bayar.gg)

### Reserved Usernames
- `GET /api/reserved-usernames` — List available reserved usernames (public)
- `GET /api/admin/reserved-usernames` — List all reserved usernames (admin)
- `POST /api/admin/reserved-usernames` — Add reserved username { username, price, category } (admin)
- `DELETE /api/admin/reserved-usernames/:id` — Remove reserved username (admin)

### Admin Withdrawals
- `GET /api/admin/withdrawals` — List all withdrawal requests with usernames (admin)
- `PATCH /api/admin/withdrawals/:id` — Update withdrawal status { status, adminNote } (admin)

### Admin
- `GET /api/admin/stats` — Overview stats
- `GET /api/admin/users` — All users
- `GET /api/admin/posts` — All posts
- `PATCH /api/admin/users/:id` — Update user (ban, shadow ban, promote)
- `PATCH /api/admin/posts/:id` — Update post (lock, delete, expire, boost)
- `DELETE /api/admin/comments/:id` — Delete comment
- `GET /api/admin/settings` — Get all settings
- `PUT /api/admin/settings` — Save settings (blocked domains, site config)
- `GET /api/admin/badges` — All badges
- `POST /api/admin/badges` — Create badge
- `DELETE /api/admin/badges/:id` — Delete badge
- `POST /api/admin/badges/award` — Award badge to user
- `POST /api/admin/badges/revoke` — Revoke badge from user

## Key Features
- 48-hour post expiration with timer pills
- **Email OTP signup** — Send verification code to email, verify, then register
- **Image post uploads** — Upload images via multer to Cloudflare R2 (S3-compatible)
- **Link posts with previews** — Auto-fetch OG title/description/image from URLs
- **Domain blocking** — Admin can block email domains and link domains
- **Badge system** — Admin creates badges, awards them to users, shown on profiles
- **Groups** — Create/join/leave groups with descriptions and privacy settings; post in groups; moderator roles; owner/mod can upload group banner and avatar images
- **Flair/Tags** — Posts can have flair (Diskusi, Curhat, Meme, Berita, Opini) shown as colored badges
- **Notifications** — Auto-created on comment, reply, vote; mark read individually or all at once
- **Bookmarks** — Save/unsave posts; view saved posts on dedicated page
- **Profile editing** — Avatar upload, banner upload, display name, bio
- **Admin settings panel** — Site name, description, post expiry, blocked domains, registration toggle, content limits, score/rep thresholds, feature toggles (whisper, karma shop, confession, chaos, poll), feed ads interval
- **Premium membership** — Rp 25.000/30 days via bayar.gg QRIS; extended post life (7 days), crown badge
- **Verified badge** — Rp 50.000 one-time via bayar.gg QRIS; blue checkmark on posts/profile
- **Premium Username** — One-time purchase via bayar.gg (admin-configurable price, default Rp 50.000); glowing purple-pink gradient text effect on username across feed, comments, profile, hover card
- **Post boost** — Rp 5.000 via bayar.gg; increases post heat by +100 for visibility
- **Tip system** — Min Rp 1.000 via bayar.gg; 90% goes as reputation bonus to post author
- **Ad banners** — Admin creates ads with placement options (sidebar, feed, header banner, post detail); labeled "Iklan"
- **Payment gateway** — bayar.gg (QRIS/GoPay), create-payment + check-payment + webhook
- Upvote/downvote system with reputation tracking
- Collapse system (score < -50 collapsed, < -200 hidden, < -500 locked)
- Public Enemy badge (reputation <= -300)
- Auto shadow ban (reputation <= -200)
- Chaos amplifier (heat scoring for controversial posts)
- Admin panel with overview stats, user management, post control, badges, settings, reserved usernames management, withdrawal approvals
- Rate limiting (30s between posts, 10s between comments)
- Nested comment threads (up to 5 levels deep, color-coded borders)
- Dark/light mode toggle (persisted in localStorage, defaults to dark)
- Mobile-responsive design with bottom tab navigation
- **Polls/Jajak Pendapat** — Post type "poll" with 2-6 options, one vote per user, animated percentage bars
- **Reaction emoji** — 8 emoji reactions on posts (🔥💀😂🤡👏💯🤮🫡), toggle on click
- **Leaderboard** — All-time rankings: top users by rep, best posts by score, public enemies
- **Community Pinning** — Auto-pin posts scoring ≥50 within 6 hours, unpin after 24h
- **Thread/Reply Chains** — Link posts as thread via `threadId` field, "Lanjutan thread..." indicator
- **Achievement System** — 14 auto-awarded milestones across 5 categories (posts, comments, votes, reputation, survival). Seeded on first startup.
- **Chaos Mode** — Dark red/black/neon-green theme unlocked at rep ≥100 or isPremium. Toggle in user dropdown, stored in localStorage. CSS `.chaos` class overrides colors.
- **Confession/Curhat Mode** — Fully anonymous posts (isConfession=true) hide username, show ghost icon + "Anonim"
- **Logo** — Purple flame glitch icon applied to header, login/register pages, sidebar branding
- **Trending Tags** — Hashtags extracted from active posts, displayed on /tags page, hashtags highlighted in purple in PostCard
- **Whisper / DM Anonim** — Send anonymous messages to other users (1x/day/recipient limit), read tracking
- **Toko Karma** — Spend karma on items: custom flair (50), pin 1h (100), double vote (75), golden border (150), VIP emoji (200)
- **Rekap Harian** — Daily recap: top post, most commented, most reacted, total stats for last 24h
- **Skeleton Loading** — PostSkeleton shimmer component displayed while feed loads
- **Feed Animations** — Cascading fade-in-up animation on post cards in feed (staggered 50ms)
- **Gradient Border Glow** — Purple glow border on high-score posts (≥25 subtle, ≥50 strong)
- **Chaos Timer** — Color-coded countdown on posts: green >24h, yellow 12-24h, orange 6-12h, red <6h
- **User Hover Card** — Hovering username shows mini profile with avatar, rep, join date, badges
- **u/username Display** — All usernames in feed, comments, hover cards, and profiles show `u/` prefix
- **g/groupname Display** — Group names in feed posts show `g/` prefix
- **Wallet System** — Tips received credit user's wallet balance; wallet transactions tracked; users can request withdrawals
- **Username Marketplace** — Reserved/premium usernames managed by admin; short usernames (≤3 chars) are premium; purchase via bayar.gg
- **Username Editing** — Users can change username; reserved/premium usernames blocked unless purchased
- **Withdrawal System** — Users request withdrawal from wallet balance; admin approves/rejects; supports BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, ShopeePay; rejected withdrawals refund wallet balance

## Design System
- **Primary**: Violet/Purple (hsl 262 83% 58%)
- **Font**: Plus Jakarta Sans (loaded via Google Fonts in index.css)
- **Gradient branding**: Purple → Pink (`bg-gradient-brand`)
- **Layout**: Twitter/X-style feed (max-width 640px), inline vote actions (not Reddit column)
- **Mobile**: Bottom tab navigation (Home, Trending, Create, Groups, Profile)
- **Cards**: rounded-xl (12px), minimal/no borders, shadow on hover
- **Light mode**: White cards on gray background (240 5% 96%)
- **Dark mode**: Deep navy-dark (240 10% 4%), dark cards (240 8% 8%)
- **Custom classes**: `text-gradient`, `bg-gradient-brand`, `bg-gradient-brand-subtle`, `animate-fade-in`, `mobile-feed-padding`, `hover-elevate`, `post-card-enter`, `post-glow`, `post-glow-strong`, `username-glow`
- **Auth pages**: Full-page centered card layout (no header), rounded-2xl cards
- **Tabs/segments**: Pill-style with `bg-muted/50 rounded-full` container

## Database Performance Optimizations
- **Batch enrichment**: `enrichPostsBatch()` replaces N+1 `enrichPost()` loop — fetches all users, comment counts, tips, votes, bookmarks, groups in parallel batch queries (6 queries total instead of 5-7 per post)
- **JOIN queries**: `getCommentsByPost` uses INNER JOIN with users table; `getUserBadges` uses INNER JOIN with badges; `getGroupMembers` uses INNER JOIN with users; `getAllPosts` uses LEFT JOIN with users; `getAllGroups` uses batch queries for member counts + creators + memberships
- **Database indexes**: Added to `shared/schema.ts` — posts(isDeleted, expiresAt, score), posts(userId), posts(groupId), posts(createdAt), comments(postId), comments(userId), votes(postId), votes(commentId), notifications(userId), notifications(userId, isRead), tips(toPostId), whispers(toUserId), whispers(fromUserId), karma_purchases(userId)
- **Settings cache**: In-memory TTL cache (60s) for `getAdminSetting()` — avoids DB hit on every request for maintenance_mode checks
- **Connection pool**: Configured in `server/db.ts` — max 10 connections, 30s idle timeout, 5s connect timeout, 15s statement timeout
- **Parallel queries**: `Promise.all()` used for independent queries in `getUserProfile`, `getGroup`, `getStats`, `enrichPostsBatch`
- **Shadow ban filtering**: Done in JS after batch fetch instead of per-post DB query

## Language
- All UI text is in Bahasa Indonesia
- date-fns uses Indonesian locale (`id as idLocale` from `date-fns/locale`)

## R2 Configuration
- Account ID: stored in R2_ACCOUNT_ID env var
- Bucket: ctrxl48 (stored in R2_BUCKET_NAME)
- Access Key: R2_ACCESS_KEY_ID secret
- Secret Key: R2_SECRET_ACCESS_KEY secret
- Endpoint: `https://{accountId}.r2.cloudflarestorage.com`
- Public URL: `https://pub-{accountId}.r2.dev/{key}`
- Requires bucket public access enabled in Cloudflare dashboard

## Registration
- Email OTP verification is mandatory — 3-step flow: enter email → receive OTP → complete account
- Old /api/auth/register endpoint is disabled (returns 400), only /api/auth/register-email works
- Frontend Register page uses step-by-step wizard (email → otp → account details)

## Auth
- Admin: username `overlord`, password `admin123`
- Seed users: void_walker, signal_noise, dead_channel, null_ref (password: `password`)
- Session secret fallback: "ritual48-secret-key"
- SMTP: Host mail.cyberpersons.com, Port 587, STARTTLS

## Vercel Deployment
- **Config**: `vercel.json` routes `/api/*` to serverless function, frontend static from Vite build
- **API handler**: `api/index.ts` wraps Express app as Vercel serverless function
- **Vite config**: `vite.config.vercel.ts` (without Replit-specific plugins) used for Vercel builds
- **Build command**: `npx vite build --config vite.config.vercel.ts --outDir dist/public`
- **Session**: Uses `connect-pg-simple` (PostgreSQL), works in serverless because session store is external
- **Cookie**: `secure: true` + `sameSite: lax` in production
- **Trust proxy**: Enabled in production for correct IP detection behind Vercel's reverse proxy
- **Required env vars on Vercel**:
  - `DATABASE_URL` — PostgreSQL connection string (e.g. from Neon, Supabase, etc.)
  - `SESSION_SECRET` — Random secret for session encryption
  - `R2_ACCOUNT_ID` — Cloudflare R2 account ID
  - `R2_BUCKET_NAME` — R2 bucket name (`ctrxl48`)
  - `R2_ACCESS_KEY_ID` — Cloudflare R2 access key
  - `R2_SECRET_ACCESS_KEY` — Cloudflare R2 secret key
  - `SMTP_PASS` — SMTP password for email OTP
  - (Optional) `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` — if different from defaults

## Query Key Conventions
- Posts list: `["/api/posts"]`
- Single post: `["/api/posts", postId]`
- Comments: `["/api/posts", postId, "comments"]`
- User profile: `["/api/users", username]`
- User posts: `["/api/users", username, "posts"]`
- Auth: `["/api/auth/me"]`
- Groups: `["/api/groups"]`
- Admin badges: `["/api/admin/badges"]`
- Admin settings: `["/api/admin/settings"]`
- Notifications: `["/api/notifications"]`
- Notification count: `["/api/notifications/count"]`
- Bookmarks: `["/api/bookmarks"]`
- Group posts: `["/api/groups", slug, "posts"]`
- Group members: `["/api/groups", slug, "members"]`
- Payment check: `["/api/payments/check", invoiceId]`
- Payment history: `["/api/payments/history"]`
- Active ads: `["/api/ads"]` or `["/api/ads?placement=sidebar"]` etc.
- Leaderboard: `["/api/leaderboard"]`
- Achievements: `["/api/achievements"]`
- User achievements: `["/api/users", username, "achievements"]`
- Reactions: `["/api/reactions", postId]`
- Poll: `["/api/polls", postId]`
- Thread: `["/api/threads", threadId]`
- Trending tags: `["/api/tags/trending"]`
- Whispers: `["/api/whispers"]`
- Karma shop items: `["/api/karma-shop/items"]`
- Daily recap: `["/api/recap"]`

## bayar.gg Payment Gateway
- API base: `https://bayar.gg/api`
- Auth header: `X-API-Key: $BAYAR_API_KEY`
- Create: POST `/api/create-payment` {amount, description, payment_method: "gopay_qris"}
- Check: GET `/api/check-payment?invoice=INVOICE_ID`
- Response: {success, data: {invoice_id, payment_url, final_amount, status, expires_at}}
- Webhook: POST to callback_url with {invoice_id, status}
- Required env: `BAYAR_API_KEY`
