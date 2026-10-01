import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getStories = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const stories = await ctx.db
      .query("stories")
      .withIndex("by_expires", (q) => q.gt("expiresAt", now))
      .order("desc")
      .take(20);

    // Group by user
    const grouped: Record<string, typeof stories> = {};
    for (const story of stories) {
      if (!grouped[story.userId]) {
        grouped[story.userId] = [];
      }
      grouped[story.userId].push(story);
    }

    return await Promise.all(
      Object.entries(grouped).map(async ([userId, userStories]) => {
        const user = await ctx.db.get(userId as any);
        return {
          user,
          stories: userStories,
          latestStory: userStories[0],
        };
      })
    );
  },
});

export const createStory = mutation({
  args: { imageUrl: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) throw new Error("User not found");

    const now = Date.now();
    return await ctx.db.insert("stories", {
      userId: user._id,
      imageUrl: args.imageUrl,
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
    });
  },
});
