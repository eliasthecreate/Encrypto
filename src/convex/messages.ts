import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getConversations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) return [];

    const conversations = await ctx.db
      .query("conversations")
      .collect();

    const userConversations = conversations.filter((c) =>
      c.participants.includes(user._id)
    );

    return await Promise.all(
      userConversations
        .sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0))
        .map(async (conv) => {
          const otherParticipantIds = conv.participants.filter((p) => p !== user._id);
          const otherUsers = await Promise.all(
            otherParticipantIds.map((id) => ctx.db.get(id))
          );

          let unreadCount = 0;
          const lastMessage = conv.lastMessageAt
            ? await ctx.db
                .query("messages")
                .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
                .order("desc")
                .first()
            : null;

          if (lastMessage && !lastMessage.readBy.includes(user._id)) {
            unreadCount = 1;
          }

          return {
            ...conv,
            otherUsers: otherUsers.filter(Boolean),
            unreadCount,
            lastMessageObj: lastMessage,
          };
        })
    );
  },
});

export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .take(100);

    return await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        return { ...msg, sender };
      })
    );
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("text"),
        v.literal("image"),
        v.literal("voice"),
        v.literal("video"),
        v.literal("file")
      )
    ),
    mediaUrl: v.optional(v.string()),
    voiceDuration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) throw new Error("User not found");

    const msgId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: user._id,
      content: args.content,
      type: args.type ?? "text",
      mediaUrl: args.mediaUrl,
      voiceDuration: args.voiceDuration,
      readBy: [user._id],
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.conversationId, {
      lastMessage: args.content,
      lastMessageAt: Date.now(),
      lastMessageSender: user._id,
    });

    return msgId;
  },
});

export const createConversation = mutation({
  args: { participantId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) throw new Error("User not found");

    // Check if conversation already exists
    const existing = await ctx.db.query("conversations").collect();
    const found = existing.find(
      (c) =>
        c.participants.includes(user._id) &&
        c.participants.includes(args.participantId) &&
        c.participants.length === 2
    );

    if (found) return found._id;

    return await ctx.db.insert("conversations", {
      participants: [user._id, args.participantId],
      lastMessageAt: Date.now(),
    });
  },
});

export const markAsRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) throw new Error("User not found");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    await Promise.all(
      messages
        .filter((m) => !m.readBy.includes(user._id))
        .map((m) =>
          ctx.db.patch(m._id, { readBy: [...m.readBy, user._id] })
        )
    );
  },
});
