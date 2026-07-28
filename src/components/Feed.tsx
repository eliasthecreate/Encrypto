import { useState } from "react";
import { motion } from "framer-motion";
import {
  Image as ImageIcon,
  Video,
  Calendar,
  Send,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  MapPin,
  Loader2,
  X,
  Crosshair,
} from "lucide-react";
import { useFeedPosts, useStories } from "@/lib/supabase-hooks";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { formatTimeAgo } from "@/lib/utils";
import { getCurrentPosition, reverseGeocode } from "@/lib/geolocation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export function Feed() {
  const [postContent, setPostContent] = useState("");
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showCommentInput, setShowCommentInput] = useState<Record<string, boolean>>({});
  const [shareLocation, setShareLocation] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const { posts, loading, likePost, addComment, createPost } = useFeedPosts();
  const { stories, createStory } = useStories();
  const { user } = useAuth();

  const handleToggleLocation = async () => {
    if (shareLocation) {
      setShareLocation(false);
      setLocationName(null);
      return;
    }
    setGettingLocation(true);
    const pos = await getCurrentPosition();
    if (pos) {
      const name = await reverseGeocode(pos.latitude, pos.longitude);
      if (name) {
        setLocationName(name);
        setShareLocation(true);
        toast.success(`Location detected: ${name}`);
      } else {
        const approx = `${pos.latitude.toFixed(3)}, ${pos.longitude.toFixed(3)}`;
        setLocationName(`📍 ${approx}`);
        setShareLocation(true);
      }
    } else {
      toast.error("Could not detect your location. Check browser permissions.");
    }
    setGettingLocation(false);
  };

  const handlePost = async () => {
    if (!postContent.trim()) return;
    await createPost(postContent, "post", shareLocation ? locationName ?? undefined : undefined);
    toast.success("Post shared with campus!");
    setPostContent("");
    setShareLocation(false);
    setLocationName(null);
  };

  const handleCreateStory = async () => {
    await createStory();
    toast.success("Story created! 🎉");
  };

  const handleLike = (postId: string) => {
    likePost(postId);
  };

  const handleComment = (postId: string) => {
    setShowCommentInput((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleSubmitComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    await addComment(postId, content);
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    setShowCommentInput((prev) => ({ ...prev, [postId]: false }));
    toast.success("Comment added!");
  };

  const handleShare = async (postId: string) => {
    try {
      const url = `${window.location.origin}/post/${postId}`;
      await navigator.clipboard.writeText(url);
      toast.success("Post link copied to clipboard!");
    } catch {
      toast.error("Could not copy link");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const seenUserIds = new Set<string>();
  const uniqueStories = stories.filter((s: any) => {
    const uid = s.user?.id || s.user_id;
    if (seenUserIds.has(uid)) return false;
    seenUserIds.add(uid);
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Post Composer */}
      <Card className="overflow-hidden glass-card">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
              {user?.name?.charAt(0) || "Y"}
            </div>
            <div className="flex-1">
              <Textarea
                placeholder="What's happening on campus?"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                className="min-h-[60px] border-0 bg-gray-50 dark:bg-gray-800 rounded-xl resize-none text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
                rows={2}
              />

              {shareLocation && locationName && (
                <div className="mt-2 flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg px-3 py-1.5 text-xs text-purple-700 dark:text-purple-300">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="font-medium truncate max-w-[200px]">{locationName}</span>
                  <button
                    onClick={() => { setShareLocation(false); setLocationName(null); }}
                    className="ml-1 h-4 w-4 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex gap-1">
                  <button className="h-8 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-purple-500 transition-all flex items-center gap-1.5 text-xs font-medium">
                    <ImageIcon className="h-4 w-4" />
                    Photo
                  </button>
                  <button className="h-8 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-pink-500 transition-all flex items-center gap-1.5 text-xs font-medium">
                    <Video className="h-4 w-4" />
                    Video
                  </button>
                  <button className="h-8 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-all flex items-center gap-1.5 text-xs font-medium">
                    <Calendar className="h-4 w-4" />
                    Event
                  </button>
                  <button
                    onClick={handleToggleLocation}
                    disabled={gettingLocation}
                    className={`h-8 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all flex items-center gap-1.5 text-xs font-medium ${
                      shareLocation
                        ? "bg-purple-50 dark:bg-purple-900/30 text-purple-500"
                        : "text-gray-500 dark:text-gray-400 hover:text-purple-500"
                    }`}
                  >
                    {gettingLocation ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Crosshair className="h-4 w-4" />
                    )}
                    {shareLocation ? "Location On" : "Location"}
                  </button>
                </div>
                <Button
                  size="sm"
                  variant="gradient"
                  onClick={handlePost}
                  disabled={!postContent.trim()}
                  className="h-8"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Post
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stories Bar */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <div
          onClick={handleCreateStory}
          className="flex flex-col items-center gap-1.5 min-w-[68px] cursor-pointer group"
        >
          <div className="relative">
            <div className="h-16 w-16 rounded-full p-[2.5px] bg-gradient-to-tr from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700">
              <div className="h-full w-full rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-lg border-2 border-white dark:border-gray-900">
                {user?.name?.charAt(0) || "Y"}
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 bg-purple-500 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center shadow-sm">
              <span className="text-white text-xs leading-none">+</span>
            </div>
          </div>
          <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium truncate max-w-[68px]">
            Your Story
          </span>
        </div>

        {uniqueStories.map((story: any) => {
          const storyUser = story.user || {};
          return (
            <div
              key={story.id}
              className="flex flex-col items-center gap-1.5 min-w-[68px] cursor-pointer group"
            >
              <div className="relative">
                <div className="h-16 w-16 rounded-full p-[2.5px] bg-gradient-to-tr from-purple-400 via-pink-400 to-orange-400">
                  {storyUser.avatar_url ? (
                    <img
                      src={storyUser.avatar_url}
                      alt={storyUser.name || "Story"}
                      className="h-full w-full rounded-full object-cover border-2 border-white dark:border-gray-900"
                    />
                  ) : (
                    <div className="h-full w-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg border-2 border-white dark:border-gray-900">
                      {(storyUser.name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium truncate max-w-[68px]">
                {storyUser.name || "Unknown"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Feed Posts */}
      {posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-8 w-8 text-gray-400 dark:text-gray-600" />
          </div>
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">No posts yet</h3>
          <p className="text-sm text-muted-foreground">
            Be the first to share something with your campus!
          </p>
        </div>
      ) : (
        posts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="overflow-hidden glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={post.profiles?.name ?? "Unknown"}
                      size="lg"
                      status={post.profiles?.status ?? "offline"}
                      showStatus
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm hover:text-purple-500 cursor-pointer dark:text-white">
                          {post.profiles?.name ?? "Unknown"}
                        </span>
                        {post.type !== "post" && (
                          <Badge
                            variant={post.type === "event" ? "warning" : "default"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {post.type === "event" ? "Event" : "Announcement"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {post.profiles?.department ?? ""} ·{" "}
                          {post.profiles?.year ?? ""}
                        </span>
                        <span>·</span>
                        <span>{formatTimeAgo(new Date(post.created_at))}</span>
                      </div>
                    </div>
                  </div>
                  <button className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                  {post.content}
                </p>

                {post.event_location && (
                  <div className="mt-3 flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl px-3 py-2">
                    <MapPin className="h-4 w-4 text-purple-500" />
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                      {post.event_location}
                    </span>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-800">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 px-1">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5 text-pink-400" />
                      {post.like_count ?? 0} likes
                    </span>
                    <span>
                      {post.comment_count ?? 0} comments · 0 shares
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-800 pt-2">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                        post.is_liked_by_me
                          ? "text-pink-500 bg-pink-50 dark:bg-pink-900/20"
                          : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${post.is_liked_by_me ? "fill-current" : ""}`} />
                      Like
                    </button>
                    <button
                      onClick={() => handleComment(post.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Comment
                    </button>
                    <button
                      onClick={() => handleShare(post.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                  </div>

                  {showCommentInput[post.id] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800"
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Write a comment..."
                          value={commentInputs[post.id] ?? ""}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSubmitComment(post.id);
                          }}
                          className="h-9 text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="gradient"
                          onClick={() => handleSubmitComment(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                          className="h-9"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))
      )}
    </div>
  );
}
