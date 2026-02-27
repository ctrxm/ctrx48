# ritual48 — Chaos Forum

## Overview
Anonymous chaos forum where posts die in 48 hours. Votes have real consequences. Users can become "Public Enemy".

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Session-based with bcryptjs
- **Routing**: wouter (frontend), Express (backend)

## Architecture
- `shared/schema.ts` — Drizzle schema for users, posts, comments, votes
- `server/routes.ts` — All API endpoints with auth middleware
- `server/storage.ts` — Database storage layer (DatabaseStorage)
- `server/seed.ts` — Initial seed data
- `client/src/pages/` — Home, Login, NewPost, PostDetail, Admin
- `client/src/components/` — Header, PostCard, VoteButton, CommentItem
- `client/src/lib/auth.tsx` — Auth context provider

## Key Features
- 48-hour post expiration
- Upvote/downvote system with reputation tracking
- Collapse system (score < -50 collapsed, < -200 hidden, < -500 locked)
- Public Enemy badge (reputation <= -300)
- Auto shadow ban (reputation <= -200)
- Chaos amplifier (heat scoring for controversial posts)
- Admin panel with user management, post control, stats dashboard
- Rate limiting (30s between posts, 10s between comments)
- Nested comment threads (up to 5 levels deep)

## Auth
- Admin: username `overlord`, password `admin123`
- Regular users: password `password`

## Design
- Dark theme (#0d0d0d background, #111111 cards)
- Blood red accent (#7f1d1d)
- Inter font, monospace for UI elements
- Minimal, oppressive, tight spacing
