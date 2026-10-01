import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) return null;

    return user;
  },
});

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    department: v.optional(v.string()),
    year: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      department: args.department,
      year: args.year,
      image: args.image,
      status: "online",
      lastSeen: Date.now(),
    });
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    department: v.optional(v.string()),
    year: v.optional(v.string()),
    bio: v.optional(v.string()),
    image: v.optional(v.string()),
    coverImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, args);
    return user._id;
  },
});

export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    if (!args.query) return [];
    return await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .take(10);
  },
});

export const getSuggestedFriends = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) return [];

    // Get current friends
    const friendsList = await ctx.db
      .query("friends")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const friendIds = new Set(friendsList.map((f) => f.friendId));
    friendIds.add(user._id);

    // Get pending requests
    const sentRequests = await ctx.db
      .query("friendRequests")
      .withIndex("by_sender", (q) => q.eq("senderId", user._id))
      .collect();

    const receiverIds = new Set(sentRequests.map((r) => r.receiverId));

    const receivedRequests = await ctx.db
      .query("friendRequests")
      .withIndex("by_receiver", (q) => q.eq("receiverId", user._id))
      .collect();

    const senderIds = new Set(receivedRequests.map((r) => r.senderId));

    // Get all users not in friends list and not pending
    const allUsers = await ctx.db.query("users").take(50);
    return allUsers.filter((u) => !friendIds.has(u._id) && !receiverIds.has(u._id) && !senderIds.has(u._id)).slice(0, 6);
  },
});

export const updateStatus = mutation({
  args: { status: v.union(v.literal("online"), v.literal("offline"), v.literal("away"), v.literal("busy")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, { status: args.status, lastSeen: Date.now() });
  },
});
