import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getFriendRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) return [];

    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_receiver", (q) => q.eq("receiverId", user._id))
      .collect();

    const pending = requests.filter((r) => r.status === "pending");

    return await Promise.all(
      pending.map(async (req) => {
        const sender = await ctx.db.get(req.senderId);
        return { ...req, sender };
      })
    );
  },
});

export const getSentRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) return [];

    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_sender", (q) => q.eq("senderId", user._id))
      .collect();

    return requests.filter((r) => r.status === "pending");
  },
});

export const sendFriendRequest = mutation({
  args: { receiverId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) throw new Error("User not found");

    // Check if already sent
    const existing = await ctx.db
      .query("friendRequests")
      .withIndex("by_sender_receiver", (q) =>
        q.eq("senderId", user._id).eq("receiverId", args.receiverId)
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("friendRequests", {
      senderId: user._id,
      receiverId: args.receiverId,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const respondToRequest = mutation({
  args: { requestId: v.id("friendRequests"), accept: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) throw new Error("User not found");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    if (request.receiverId !== user._id) throw new Error("Not your request");

    await ctx.db.patch(args.requestId, {
      status: args.accept ? "accepted" : "rejected",
    });

    if (args.accept) {
      await ctx.db.insert("friends", {
        userId: request.senderId,
        friendId: request.receiverId,
        createdAt: Date.now(),
      });
      await ctx.db.insert("friends", {
        userId: request.receiverId,
        friendId: request.senderId,
        createdAt: Date.now(),
      });
    }
  },
});

export const getFriends = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) return [];

    const friendsList = await ctx.db
      .query("friends")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return await Promise.all(
      friendsList.map(async (f) => {
        const friend = await ctx.db.get(f.friendId);
        return { ...f, friend };
      })
    );
  },
});

export const removeFriend = mutation({
  args: { friendId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) throw new Error("User not found");

    const friendship1 = await ctx.db
      .query("friends")
      .withIndex("by_both", (q) => q.eq("userId", user._id).eq("friendId", args.friendId))
      .first();

    const friendship2 = await ctx.db
      .query("friends")
      .withIndex("by_both", (q) => q.eq("userId", args.friendId).eq("friendId", user._id))
      .first();

    if (friendship1) await ctx.db.delete(friendship1._id);
    if (friendship2) await ctx.db.delete(friendship2._id);
  },
});
