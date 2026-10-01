# Supabase Setup Guide for CampusConnectICU

This guide will help you set up Supabase to replace Firebase for your CampusConnectICU application.

## Prerequisites

- A Supabase account (free tier is sufficient)
- Basic understanding of SQL and database concepts

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Choose your organization (or create one)
5. Fill in project details:
   - **Name**: CampusConnectICU
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose a region closest to your users
6. Click "Create new project"
7. Wait for the project to be provisioned (this may take a few minutes)

## Step 2: Get Your Supabase Credentials

1. Go to your project dashboard
2. Navigate to **Settings** → **API**
3. Copy the following values:
   - **Project URL**: This is your `VITE_SUPABASE_URL`
   - **anon/public key**: This is your `VITE_SUPABASE_ANON_KEY`

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and replace the placeholder values:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 4: Create Database Tables

Go to your Supabase project dashboard → **SQL Editor** and run the following SQL commands:

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  fullName TEXT NOT NULL,
  studentNumber TEXT,
  phoneNumber TEXT,
  department TEXT,
  yearOfStudy TEXT,
  age TEXT,
  bio TEXT,
  skills TEXT[],
  avatar TEXT,
  connections TEXT[] DEFAULT '{}',
  connectionRequests TEXT[] DEFAULT '{}',
  sentRequests TEXT[] DEFAULT '{}',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_fullname ON users(fullName);
```

### Posts Table
```sql
CREATE TABLE posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  userId TEXT NOT NULL,
  userName TEXT NOT NULL,
  userAvatar TEXT,
  userDepartment TEXT,
  content TEXT,
  media TEXT,
  postType TEXT DEFAULT 'regular',
  eventDate TEXT,
  eventTime TEXT,
  eventLocation TEXT,
  groupId TEXT,
  likes TEXT[] DEFAULT '{}',
  comments JSONB DEFAULT '[]',
  shares INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL
);

CREATE INDEX idx_posts_userId ON posts(userId);
CREATE INDEX idx_posts_createdAt ON posts(createdAt DESC);
CREATE INDEX idx_posts_groupId ON posts(groupId);
```

### Conversations Table
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  participants TEXT[] NOT NULL,
  isGroup BOOLEAN DEFAULT false,
  groupName TEXT,
  groupDescription TEXT,
  groupType TEXT DEFAULT 'general',
  groupAvatar TEXT,
  createdBy TEXT,
  admins TEXT[] DEFAULT '{}',
  lastMessage TEXT,
  lastMessageTime TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX idx_conversations_participants ON conversations USING GIN(participants);
CREATE INDEX idx_conversations_lastMessageTime ON conversations(lastMessageTime DESC);
```

### Messages Table
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversationId TEXT NOT NULL,
  senderId TEXT NOT NULL,
  text TEXT,
  media TEXT,
  mediaType TEXT,
  replyTo JSONB,
  createdAt TEXT NOT NULL
);

CREATE INDEX idx_messages_conversationId ON messages(conversationId);
CREATE INDEX idx_messages_createdAt ON messages(createdAt ASC);
```

### Statuses Table
```sql
CREATE TABLE statuses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  userId TEXT NOT NULL,
  userName TEXT NOT NULL,
  userAvatar TEXT,
  type TEXT NOT NULL,
  text TEXT,
  media TEXT,
  backgroundColor TEXT,
  viewedBy TEXT[] DEFAULT '{}',
  createdAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL
);

CREATE INDEX idx_statuses_userId ON statuses(userId);
CREATE INDEX idx_statuses_createdAt ON statuses(createdAt DESC);
CREATE INDEX idx_statuses_expiresAt ON statuses(expiresAt);
```

## Step 5: Enable Row Level Security (RLS)

Enable RLS for security:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id);

-- Posts table policies
CREATE POLICY "Anyone can view posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid()::text = userId);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid()::text = userId);

-- Conversations table policies
CREATE POLICY "Users can view conversations they're in" ON conversations FOR SELECT USING (auth.uid()::text = ANY(participants));
CREATE POLICY "Authenticated users can create conversations" ON conversations FOR INSERT WITH CHECK (auth.uid()::text = ANY(participants));
CREATE POLICY "Users can update conversations they're in" ON conversations FOR UPDATE USING (auth.uid()::text = ANY(participants));

-- Messages table policies
CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT USING (
  conversationId IN (
    SELECT id FROM conversations WHERE auth.uid()::text = ANY(participants)
  )
);
CREATE POLICY "Authenticated users can create messages" ON messages FOR INSERT WITH CHECK (
  conversationId IN (
    SELECT id FROM conversations WHERE auth.uid()::text = ANY(participants)
  )
);

-- Statuses table policies
CREATE POLICY "Anyone can view statuses" ON statuses FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create own statuses" ON statuses FOR INSERT WITH CHECK (auth.uid()::text = userId);
CREATE POLICY "Users can delete own statuses" ON statuses FOR DELETE USING (auth.uid()::text = userId);
```

## Step 6: Set Up Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider (it should be enabled by default)
3. Configure email settings if needed:
   - Enable email confirmation (optional)
   - Set up email templates

## Step 7: Install Dependencies

Navigate to the web directory and install the new dependencies:

```bash
cd web
npm install
```

## Step 8: Test the Connection

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Try to register a new user in the app
3. Check the Supabase dashboard → **Authentication** → **Users** to verify the user was created
4. Check the **Table Editor** to verify the user was added to the `users` table

## Step 9: Enable Real-time Subscriptions (Optional)

For real-time features like live messaging and post updates:

1. Go to **Database** → **Replication**
2. For each table (posts, conversations, messages, statuses, users):
   - Click the table name
   - Enable replication
   - Select "Realtime" for the tables you need

## Troubleshooting

### Connection Errors
- Verify your `.env` file has the correct values
- Check that your Supabase project is active (not paused)
- Ensure you're using the correct region

### Authentication Errors
- Check that email authentication is enabled in Supabase
- Verify RLS policies are correctly set
- Check the browser console for specific error messages

### Database Errors
- Ensure all tables are created with the correct schema
- Check that RLS policies allow the necessary operations
- Verify column names match exactly (case-sensitive)

## Migration Notes

The Supabase implementation maintains the same API as the Firebase implementation, so no changes were needed in the React components. The main differences:

- **Authentication**: Supabase uses JWT-based auth instead of Firebase's custom tokens
- **Real-time**: Supabase uses PostgreSQL replication instead of Firebase's real-time database
- **Queries**: Supabase uses SQL instead of Firebase's NoSQL queries

All existing functionality should work seamlessly with the new Supabase backend.
