# CTRXL48 — Chaos Forum

## Overview
Anonymous chaos forum where posts die in 48 hours. Votes have real consequences. Users can become "Public Enemy". Reddit-like modern UI design with vibrant orange-to-pink gradient branding and animations.

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
- `shared/schema.ts` — Drizzle schema for users, posts, comments, votes, email_verifications, admin_settings, badges, user_badges, groups, group_members
- `server/routes.ts` — All API endpoints with auth/admin middleware + rate limiting
- `server/storage.ts` — Database storage layer (IStorage interface + DatabaseStorage)
- `server/email.ts` — Nodemailer transporter + OTP generation + email sending
- `server/upload.ts` — Multer memory storage config (5MB limit, JPEG/PNG/GIF/WebP)
- `server/r2.ts` — Cloudflare R2 upload client (@aws-sdk/client-s3)
- `server/linkPreview.ts` — Fetch and parse OG/meta tags from URLs
- `server/seed.ts` — Initial seed data (admin: overlord/admin123, users: password)
- `client/src/pages/` — Home, Login, Register, NewPost, PostDetail, UserProfile, Admin, Groups, not-found
- `client/src/components/` — Header, PostCard, VoteButton, CommentItem, SidebarWidget
- `client/src/lib/auth.tsx` — Auth context provider with login/register/logout
- `client/src/lib/queryClient.ts` — Single shared QueryClient instance (NEVER create another)

## Routes
- `/` — Home feed with Hot/New/Top sort
- `/trending` — Trending (same component as Home)
- `/login` — Login page
- `/register` — Registration page (email OTP or quick signup)
- `/new` — Create new post: text, image upload, or link post (auth required)
- `/post/:id` — Post detail with nested comments, image display, link previews
- `/u/:username` — User profile with avatar/banner upload, badges display
- `/admin` — Admin panel (overview, users, posts, badges, settings)
- `/groups` — Groups listing, create/join/leave groups

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
- `POST /api/posts` — Create post (text/image/link type, auth, rate limited 30s)
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
- `GET /api/groups/:slug/members` — Group members
- `POST /api/groups` — Create group (auth)
- `POST /api/groups/:slug/join` — Join group (auth)
- `POST /api/groups/:slug/leave` — Leave group (auth)

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
- 48-hour post expiration with progress bar
- **Email OTP signup** — Send verification code to email, verify, then register
- **Image post uploads** — Upload images via multer to Cloudflare R2 (S3-compatible)
- **Link posts with previews** — Auto-fetch OG title/description/image from URLs
- **Domain blocking** — Admin can block email domains and link domains
- **Badge system** — Admin creates badges, awards them to users, shown on profiles
- **Groups** — Create/join/leave groups with descriptions and privacy settings
- **Profile editing** — Avatar upload, banner upload, display name, bio
- **Admin settings panel** — Site name, description, post expiry, blocked domains
- Upvote/downvote system with reputation tracking
- Collapse system (score < -50 collapsed, < -200 hidden, < -500 locked)
- Public Enemy badge (reputation <= -300)
- Auto shadow ban (reputation <= -200)
- Chaos amplifier (heat scoring for controversial posts)
- Admin panel with overview stats, user management, post control, badges, settings
- Rate limiting (30s between posts, 10s between comments)
- Nested comment threads (up to 5 levels deep, color-coded borders)
- Dark/light mode toggle (persisted in localStorage)
- Mobile-responsive design with hamburger menu

## Design
- Orange primary accent (hsl 24 95% 53% / #f97316)
- Light: white cards on gray background
- Dark: dark navy/gray cards (#151a23 approx)
- Inter font family
- Reddit-like two-column layout (content + sidebar on desktop)
- Card-based posts with vote column on left
- Rounded corners, clean spacing

## Language
- All UI text is in Bahasa Indonesia
- date-fns uses Indonesian locale (`id as idLocale` from `date-fns/locale`)

## R2 Configuration
- Account ID: stored in R2_ACCOUNT_ID env var
- Bucket: ctrx48 (stored in R2_BUCKET_NAME)
- Access Key: R2_ACCESS_KEY_ID secret
- Secret Key: R2_SECRET_ACCESS_KEY secret
- Endpoint: `https://{accountId}.r2.cloudflarestorage.com`
- Public URL: `https://pub-{accountId}.r2.dev/{key}`
- Requires bucket public access enabled in Cloudflare dashboard

## Registration
- Email is required for registration (backend enforces it)

## Auth
- Admin: username `overlord`, password `admin123`
- Seed users: void_walker, signal_noise, dead_channel, null_ref (password: `password`)
- Session secret fallback: "ritual48-secret-key"
- SMTP: Host mail.cyberpersons.com, Port 587, STARTTLS

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
