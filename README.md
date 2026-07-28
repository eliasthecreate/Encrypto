# Campus Connect ICU

A Facebook-like campus social network for International Christian University students. Connect with classmates, share posts, chat in real-time, go live, and discover fellow students — all in one place.

## ✨ Features

- **📱 Campus Feed** — Share updates, events, and announcements with the ICU community. React, comment, and engage with posts.
- **💬 Real-time Messaging** — Chat with friends with text, images, voice notes, and media. Read receipts, typing indicators, and online status.
- **👥 Friends & Community** — Send friend requests, discover students from your department and year, and see mutual connections.
- **📺 Live Streaming** — Broadcast and watch campus events, study sessions, performances, and sports. Go live with just a tap.
- **🔔 Notifications** — Stay updated with friend requests, messages, likes, and live streams.
- **👤 Profile** — Showcase your department, year, clubs, interests, and campus identity.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite 6 |
| Backend & DB | Convex (real-time, serverless) |
| Auth | Convex Auth |
| Styling | Tailwind CSS 3 + shadcn/ui |
| Animations | Framer Motion |
| Icons | Lucide React |
| Package Manager | Bun |

## 🚀 Getting Started

### Prerequisites

- **Bun** (recommended) or **Node.js 18+**
- A **Convex** account (free tier works perfectly)

### Setup

1. **Install dependencies**
   ```bash
   bun install
   ```

2. **Set up Convex**
   - Sign up at [convex.dev](https://convex.dev)
   - Create a new project
   - Copy your deployment URL
   - Set it as `VITE_CONVEX_URL` in your environment/API keys
   - Run `bun run convex:dev` to generate types and deploy the schema

3. **Start the dev server**
   ```bash
   bun run dev
   ```

4. **Build for production**
   ```bash
   bun run build
   ```

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui base components
│   ├── AuthPage.tsx      # Login/Signup
│   ├── Dashboard.tsx     # Main app shell + bottom nav
│   ├── Feed.tsx          # Home feed with posts
│   ├── Friends.tsx       # Friend requests + suggestions
│   ├── LandingPage.tsx   # Public landing page
│   ├── Live.tsx          # Live streaming
│   ├── Messages.tsx      # Chat + conversations
│   ├── Profile.tsx       # User profile
│   └── RequireAuth.tsx   # Auth guard
├── convex/
│   ├── schema.ts         # Database schema
│   ├── users.ts          # User queries/mutations
│   ├── posts.ts          # Post queries/mutations
│   ├── messages.ts       # Message queries/mutations
│   ├── friends.ts        # Friend request queries/mutations
│   ├── live.ts           # Live stream queries/mutations
│   ├── notifications.ts  # Notification queries/mutations
│   ├── stories.ts        # Story queries/mutations
│   └── auth.config.ts    # Auth configuration
├── lib/
│   └── utils.ts          # Utility functions
├── App.tsx               # Root with routes
├── index.css             # Global styles + Tailwind
└── main.tsx              # Entry point
```

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_CONVEX_URL` | ✅ | Your Convex deployment URL |

## 📄 License

MIT
