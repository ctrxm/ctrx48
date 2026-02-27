# ritual48 — Chaos Forum

## Overview
Anonymous chaos forum where posts die in 48 hours. Votes have real consequences. Users can become "Public Enemy". Reddit-like modern UI design with orange primary accent.

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Session-based with bcryptjs (connect-pg-simple session store)
- **Routing**: wouter (frontend), Express (backend)

## Architecture
- `shared/schema.ts` — Drizzle schema for users, posts, comments, votes; includes types for PostWithUser, CommentWithUser, UserProfile
- `server/routes.ts` — All API endpoints with auth/admin middleware + rate limiting
- `server/storage.ts` — Database storage layer (IStorage interface + DatabaseStorage)
- `server/seed.ts` — Initial seed data (admin: overlord/admin123, users: password)
- `client/src/pages/` — Home, Login, Register, NewPost, PostDetail, UserProfile, Admin, not-found
- `client/src/components/` — Header, PostCard, VoteButton, CommentItem, SidebarWidget
- `client/src/lib/auth.tsx` — Auth context provider with login/register/logout
- `client/src/lib/queryClient.ts` — Single shared QueryClient instance (NEVER create another)

## Routes
- `/` — Home feed with Hot/New/Top sort
- `/trending` — Trending (same component as Home)
- `/login` — Login page
- `/register` — Registration page
- `/new` — Create new post (auth required)
- `/post/:id` — Post detail with nested comments
- `/u/:username` — User profile with posts tab
- `/admin` — Admin panel (admin role required)

## API Endpoints
- `POST /api/auth/register|login|logout` — Auth
- `GET /api/auth/me` — Current user
- `GET /api/posts` — Active posts
- `GET /api/posts/:id` — Single post
- `POST /api/posts` — Create post (auth, rate limited 30s)
- `GET /api/posts/:id/comments` — Comments for a post
- `POST /api/comments` — Create comment (auth, rate limited 10s)
- `POST /api/votes` — Upvote/downvote
- `GET /api/users/:username` — User profile
- `GET /api/users/:username/posts` — User's posts
- `PATCH /api/profile` — Update own profile (displayName, bio)
- `GET /api/admin/stats|users|posts` — Admin data
- `PATCH /api/admin/users/:id|posts/:id` — Admin updates
- `DELETE /api/admin/comments/:id` — Admin delete comment

## Key Features
- 48-hour post expiration with progress bar
- Upvote/downvote system with reputation tracking
- Collapse system (score < -50 collapsed, < -200 hidden, < -500 locked)
- Public Enemy badge (reputation <= -300)
- Auto shadow ban (reputation <= -200); shadow-banned users see own content
- Chaos amplifier (heat scoring for controversial posts)
- Admin panel with overview stats, user management, post control
- Rate limiting (30s between posts, 10s between comments)
- Nested comment threads (up to 5 levels deep, color-coded borders)
- User profiles with display name, bio, karma, post/comment counts
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

## Auth
- Admin: username `overlord`, password `admin123`
- Seed users: void_walker, signal_noise, dead_channel, null_ref (password: `password`)
- Session secret fallback: "ritual48-secret-key"

## Query Key Conventions
- Posts list: `["/api/posts"]`
- Single post: `["/api/posts", postId]`
- Comments: `["/api/posts", postId, "comments"]`
- User profile: `["/api/users", username]`
- User posts: `["/api/users", username, "posts"]`
- Auth: `["/api/auth/me"]`
