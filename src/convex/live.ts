import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getLiveStreams = query({
  args: {},
  handler: async (ctx) => {
    const liveStreams = await ctx.db
      .query("liveStreams")
      .withIndex("by_live", (q) => q.eq("isLive", true))
      .collect();

    return await Promise.all(
      liveStreams.map(async (stream) => {
        const host = await ctx.db.get(stream.hostId);
        return { ...stream, host };
      })
    );
  },
});

export const getUpcomingStreams = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const streams = await ctx.db.query("liveStreams").collect();
    const upcoming = streams.filter(
      (s) => !s.isLive && s.scheduledAt && s.scheduledAt > now
    );

    return await Promise.all(
      upcoming.map(async (stream) => {
        const host = await ctx.db.get(stream.hostId);
        return { ...stream, host };
      })
    );
  },
});

export const startStream = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) throw new Error("User not found");

    return await ctx.db.insert("liveStreams", {
      hostId: user._id,
      title: args.title,
      description: args.description,
      category: args.category,
      thumbnailUrl: args.thumbnailUrl,
      viewerCount: 0,
      isLive: true,
      startedAt: Date.now(),
      createdAt: Date.now(),
    });
  },
});

export const endStream = mutation({
  args: { streamId: v.id("liveStreams") },
  handler: async (ctx, args) => {
    const stream = await ctx.db.get(args.streamId);
    if (!stream) throw new Error("Stream not found");

    await ctx.db.patch(args.streamId, {
      isLive: false,
      endedAt: Date.now(),
    });
  },
});

export const incrementViewers = mutation({
  args: { streamId: v.id("liveStreams") },
  handler: async (ctx, args) => {
    const stream = await ctx.db.get(args.streamId);
    if (!stream) throw new Error("Stream not found");

    await ctx.db.patch(args.streamId, {
      viewerCount: (stream.viewerCount ?? 0) + 1,
    });
  },
});
