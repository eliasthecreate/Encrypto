export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      posts: {
        Row: Post;
        Insert: Omit<Post, "id" | "created_at">;
        Update: Partial<Omit<Post, "id" | "created_at">>;
      };
      post_likes: {
        Row: PostLike;
        Insert: Omit<PostLike, "id" | "created_at">;
        Update: Partial<Omit<PostLike, "id" | "created_at">>;
      };
      comments: {
        Row: Comment;
        Insert: Omit<Comment, "id" | "created_at">;
        Update: Partial<Omit<Comment, "id" | "created_at">>;
      };
      conversations: {
        Row: Conversation;
        Insert: Omit<Conversation, "id" | "created_at">;
        Update: Partial<Omit<Conversation, "id" | "created_at">>;
      };
      conversation_participants: {
        Row: ConversationParticipant;
        Insert: Omit<ConversationParticipant, "id">;
        Update: Partial<Omit<ConversationParticipant, "id">>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, "id" | "created_at">;
        Update: Partial<Omit<Message, "id" | "created_at">>;
      };
      friend_requests: {
        Row: FriendRequest;
        Insert: Omit<FriendRequest, "id" | "created_at">;
        Update: Partial<Omit<FriendRequest, "id" | "created_at">>;
      };
      friends: {
        Row: Friend;
        Insert: Omit<Friend, "id" | "created_at">;
        Update: Partial<Omit<Friend, "id" | "created_at">>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, "id" | "created_at">;
        Update: Partial<Omit<Notification, "id" | "created_at">>;
      };
      live_streams: {
        Row: LiveStream;
        Insert: Omit<LiveStream, "id" | "created_at">;
        Update: Partial<Omit<LiveStream, "id" | "created_at">>;
      };
      stories: {
        Row: Story;
        Insert: Omit<Story, "id" | "created_at">;
        Update: Partial<Omit<Story, "id" | "created_at">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

/* ─── Profiles ─── */
export interface Profile {
  id: string;
  name: string;
  email: string;
  department: string | null;
  year: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  status: "online" | "offline" | "away" | "busy";
  created_at: string;
}

/* ─── Posts ─── */
export interface Post {
  id: string;
  user_id: string;
  content: string;
  type: "post" | "event" | "announcement";
  image_url: string | null;
  event_location: string | null;
  event_date: string | null;
  created_at: string;
}

export interface PostLike {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
}

/* ─── Messages ─── */
export interface Conversation {
  id: string;
  created_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: "text" | "image" | "voice";
  read: boolean;
  created_at: string;
}

/* ─── Friends ─── */
export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

export interface Friend {
  id: string;
  user_id_1: string;
  user_id_2: string;
  created_at: string;
}

/* ─── Notifications ─── */
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

/* ─── Live ─── */
export interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  is_live: boolean;
  viewer_count: number;
  started_at: string;
  scheduled_at: string | null;
  created_at: string;
}

/* ─── Stories ─── */
export interface Story {
  id: string;
  user_id: string;
  media_url: string | null;
  created_at: string;
  expires_at: string;
}
