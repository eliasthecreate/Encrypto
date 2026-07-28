import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    department: v.optional(v.string()),
    year: v.optional(v.string()),
    bio: v.optional(v.string()),
    status: v.optional(v.union(v.literal("online"), v.literal("offline"), v.literal("away"), v.literal("busy"))),
    lastSeen: v.optional(v.number()),
    coverImage: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .searchIndex("search_name", { searchField: "name" }),

  posts: defineTable({
    authorId: v.id("users"),
    content: v.string(),
    image: v.optional(v.string()),
    type: v.union(v.literal("post"), v.literal("event"), v.literal("announcement")),
    eventDate: v.optional(v.number()),
    eventLocation: v.optional(v.string()),
    likes: v.array(v.id("users")),
    commentCount: v.optional(v.number()),
    shareCount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_created", ["createdAt"]),

  comments: defineTable({
    postId: v.id("posts"),
    authorId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_post", ["postId"]),

  conversations: defineTable({
    participants: v.array(v.id("users")),
    lastMessage: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
    lastMessageSender: v.optional(v.id("users")),
    isGroup: v.optional(v.boolean()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  })
    .index("by_participants", ["participants"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.optional(v.string()),
    type: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("voice"),
      v.literal("video"),
      v.literal("file")
    ),
    mediaUrl: v.optional(v.string()),
    mediaName: v.optional(v.string()),
    voiceDuration: v.optional(v.number()),
    readBy: v.array(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_sender", ["senderId"]),

  friendRequests: defineTable({
    senderId: v.id("users"),
    receiverId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected")),
    createdAt: v.number(),
  })
    .index("by_sender", ["senderId"])
    .index("by_receiver", ["receiverId"])
    .index("by_status", ["status"])
    .index("by_sender_receiver", ["senderId", "receiverId"]),

  friends: defineTable({
    userId: v.id("users"),
    friendId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_friend", ["friendId"])
    .index("by_both", ["userId", "friendId"]),

  liveStreams: defineTable({
    hostId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("club_event"),
      v.literal("class_help"),
      v.literal("performance"),
      v.literal("campus_news"),
      v.literal("sports"),
      v.literal("other")
    ),
    thumbnailUrl: v.optional(v.string()),
    viewerCount: v.optional(v.number()),
    isLive: v.boolean(),
    scheduledAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_host", ["hostId"])
    .index("by_live", ["isLive"])
    .index("by_category", ["category"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("friend_request"),
      v.literal("friend_accepted"),
      v.literal("new_post"),
      v.literal("like"),
      v.literal("comment"),
      v.literal("live_started"),
      v.literal("message")
    ),
    title: v.string(),
    body: v.string(),
    relatedUserId: v.optional(v.id("users")),
    relatedPostId: v.optional(v.id("posts")),
    relatedConversationId: v.optional(v.id("conversations")),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "read"]),

  stories: defineTable({
    userId: v.id("users"),
    imageUrl: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_expires", ["expiresAt"]),
});
