import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getFeedPosts = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_created")
      .order("desc")
      .take(20);

    return await Promise.all(
      posts.map(async (post) => {
        const author = await ctx.db.get(post.authorId);
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_post", (q) => q.eq("postId", post._id))
          .order("desc")
          .take(3);

        const commentsWithAuthor = await Promise.all(
          comments.map(async (comment) => {
            const commentAuthor = await ctx.db.get(comment.authorId);
            return { ...comment, author: commentAuthor };
          })
        );

        return {
          ...post,
          author,
          comments: commentsWithAuthor,
          commentCount: post.commentCount ?? comments.length,
        };
      })
    );
  },
});

export const createPost = mutation({
  args: {
    content: v.string(),
    image: v.optional(v.string()),
    type: v.optional(v.union(v.literal("post"), v.literal("event"), v.literal("announcement"))),
    eventDate: v.optional(v.number()),
    eventLocation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) throw new Error("User not found");

    const postId = await ctx.db.insert("posts", {
      authorId: user._id,
      content: args.content,
      image: args.image,
      type: args.type ?? "post",
      eventDate: args.eventDate,
      eventLocation: args.eventLocation,
      likes: [],
      commentCount: 0,
      shareCount: 0,
      createdAt: Date.now(),
    });

    return postId;
  },
});

export const likePost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) throw new Error("User not found");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    const hasLiked = post.likes.includes(user._id);
    const newLikes = hasLiked
      ? post.likes.filter((id) => id !== user._id)
      : [...post.likes, user._id];

    await ctx.db.patch(args.postId, { likes: newLikes });
    return { liked: !hasLiked, count: newLikes.length };
  },
});

export const addComment = mutation({
  args: { postId: v.id("posts"), content: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .first();

    if (!user) throw new Error("User not found");

    const commentId = await ctx.db.insert("comments", {
      postId: args.postId,
      authorId: user._id,
      content: args.content,
      createdAt: Date.now(),
    });

    const post = await ctx.db.get(args.postId);
    if (post) {
      await ctx.db.patch(args.postId, {
        commentCount: (post.commentCount ?? 0) + 1,
      });
    }

    return commentId;
  },
});

export const getComments = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .take(50);

    return await Promise.all(
      comments.map(async (comment) => {
        const author = await ctx.db.get(comment.authorId);
        return { ...comment, author };
      })
    );
  },
});
