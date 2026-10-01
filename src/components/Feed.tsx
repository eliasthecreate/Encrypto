import { useState, useRef } from "react";
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
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { formatTimeAgo } from "@/lib/utils";
import { getCurrentPosition, reverseGeocode } from "@/lib/geolocation";
import { uploadFile } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

import { VerifiedBadge } from "./VerifiedBadge";

export function Feed({
  onViewProfile,
}: {
  onViewProfile?: (user: { id: string; name: string; avatar_url?: string | null; status?: string | null }) => void;
} = {}) {
  const [postContent, setPostContent] = useState("");
  const [postType, setPostType] = useState<"post" | "event" | "announcement">("post");
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showCommentInput, setShowCommentInput] = useState<Record<string, boolean>>({});
  const [shareLocation, setShareLocation] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

    setUploading(true);
    let imageUrl: string | undefined;

    // Upload image if selected
    if (postImage) {
      const url = await uploadFile("post-images", `${Date.now()}-${postImage.name}`, postImage);
      if (url) imageUrl = url;
    }

    await createPost(
      postContent,
      postType,
      shareLocation ? locationName ?? undefined : undefined,
      imageUrl
    );

    toast.success(postType === "event" ? "Event created! 🎉" : "Post shared with campus!");
    setPostContent("");
    setPostImage(null);
    setPostImagePreview(null);
    setPostType("post");
    setEventDate("");
    setShareLocation(false);
    setLocationName(null);
    setUploading(false);
  };

  const handleSelectImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setPostImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleEventClick = () => {
    setPostType(postType === "event" ? "post" : "event");
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
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
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
      <div className="cc-card p-4">
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
            {user?.name?.charAt(0) || "Y"}
          </div>
          <div className="flex-1 min-w-0">
            <Textarea
              placeholder="What's happening on campus?"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="min-h-[60px] border-0 bg-white/[0.04] rounded-xl resize-none text-sm text-slate-100 placeholder:text-slate-500 focus:ring-0 focus:border-purple-500/40"
              rows={2}
            />

            {shareLocation && locationName && (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-purple-500/12 rounded-lg pl-3 pr-1.5 py-1.5 text-xs text-purple-300">
                <MapPin className="h-3.5 w-3.5" />
                <span className="font-medium truncate max-w-[200px]">{locationName}</span>
                <button
                  onClick={() => { setShareLocation(false); setLocationName(null); }}
                  aria-label="Remove location"
                  className="h-4 w-4 rounded-full hover:bg-purple-500/25 flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {postImagePreview && (
              <div className="mt-2 relative">
                <img src={postImagePreview} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
                <button
                  onClick={() => { setPostImage(null); setPostImagePreview(null); }}
                  aria-label="Remove image"
                  className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {postType === "event" && (
              <div className="mt-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-400" />
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-slate-200 [color-scheme:dark] focus:outline-none focus:border-orange-400/50"
                />
              </div>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 cc-hairline">
              <div className="flex gap-0.5 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button onClick={handleSelectImage} className="cc-tool hover:text-purple-300">
                  <ImageIcon className="h-4 w-4" />
                  {postImage ? "Change" : "Photo"}
                </button>
                <button onClick={handleSelectImage} className="cc-tool hover:text-pink-300">
                  <Video className="h-4 w-4" />
                  Video
                </button>
                <button
                  onClick={handleEventClick}
                  className={`cc-tool ${
                    postType === "event"
                      ? "!bg-orange-400/15 !text-orange-300"
                      : "hover:text-orange-300"
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  Event
                </button>
                <button
                  onClick={handleToggleLocation}
                  disabled={gettingLocation}
                  className={`cc-tool ${
                    shareLocation
                      ? "!bg-purple-500/15 !text-purple-300"
                      : "hover:text-purple-300"
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
              <button
                onClick={handlePost}
                disabled={!postContent.trim() || uploading}
                className="cc-gradient-btn h-8 px-4 text-xs flex items-center gap-1.5 flex-shrink-0"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {postType === "event" ? "Create Event" : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stories Bar */}
      <div className="cc-scroll-x flex gap-3 pb-1">
        <button
          onClick={handleCreateStory}
          className="flex flex-col items-center gap-1.5 min-w-[68px]"
        >
          <div className="relative">
            <div className="h-16 w-16 rounded-full p-[2px] bg-white/10">
              <div className="h-full w-full rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-lg">
                {user?.name?.charAt(0) || "Y"}
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full ring-2 ring-[#0d0d1a] flex items-center justify-center shadow-lg shadow-purple-900/60">
              <span className="text-white text-xs leading-none">+</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-medium truncate max-w-[68px]">
            Your Story
          </span>
        </button>

        {uniqueStories.map((story: any) => {
          const storyUser = story.user || {};
          return (
            <button
              key={story.id}
              className="flex flex-col items-center gap-1.5 min-w-[68px]"
            >
              <div className="cc-story-ring h-16 w-16 rounded-full p-[2.5px]">
                {storyUser.avatar_url ? (
                  <img
                    src={storyUser.avatar_url}
                    alt={storyUser.name || "Story"}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-lg">
                    {(storyUser.name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-medium truncate max-w-[68px]">
                {storyUser.name || "Unknown"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Feed Posts */}
      {posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-8 w-8 text-slate-600" />
          </div>
          <h3 className="font-semibold text-slate-200 mb-1">No posts yet</h3>
          <p className="text-sm text-slate-500">
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
            <div className="cc-card cc-card-hover overflow-hidden">
              <div className="p-4 pb-3">
                <div className="flex items-start justify-between">
                  <button
                      onClick={() =>
                        onViewProfile?.({
                          id: post.profiles?.id ?? post.user_id,
                          name: post.profiles?.name ?? "Unknown",
                          avatar_url: post.profiles?.avatar_url ?? null,
                          status: post.profiles?.status ?? null,
                        })
                      }
                      className="group flex items-center gap-3 min-w-0 text-left"
                    >
                      <Avatar
                        name={post.profiles?.name ?? "Unknown"}
                        src={post.profiles?.avatar_url ?? undefined}
                        size="lg"
                        status={post.profiles?.status ?? "offline"}
                        showStatus
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-white group-hover:text-purple-300 transition-colors flex items-center gap-1.5 truncate">
                            <span>{post.profiles?.name ?? "Unknown"}</span>
                            {(post.profiles as any)?.is_verified && (
                              <VerifiedBadge domain={(post.profiles as any)?.university_domain} size="sm" />
                            )}
                          </span>
                        {post.type !== "post" && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              post.type === "event"
                                ? "bg-orange-400/15 text-orange-300"
                                : "bg-purple-500/15 text-purple-300"
                            }`}
                          >
                            {post.type === "event" ? "Event" : "Announcement"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                        <span className="truncate">
                          {post.profiles?.department ?? ""} ·{" "}
                          {post.profiles?.year ?? ""}
                        </span>
                        <span>·</span>
                        <span className="flex-shrink-0">{formatTimeAgo(new Date(post.created_at))}</span>
                      </div>
                      </div>
                    </button>
                  <button
                    aria-label="Post options"
                    className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0"
                  >
                    <MoreHorizontal className="h-4 w-4 text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="px-4 pb-4">
                <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
                  {post.content}
                </p>

                {post.event_location && (
                  <div className="mt-3 flex items-center gap-2 bg-purple-500/12 rounded-xl px-3 py-2">
                    <MapPin className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-medium text-purple-300 truncate">
                      {post.event_location}
                    </span>
                  </div>
                )}

                <div className="mt-4 pt-3 cc-hairline">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1 px-1">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5 text-pink-400" />
                      {post.like_count ?? 0} likes
                    </span>
                    <span>
                      {post.comment_count ?? 0} comments · 0 shares
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`cc-action ${post.is_liked_by_me ? "cc-action-liked" : ""}`}
                    >
                      <Heart className={`h-4 w-4 ${post.is_liked_by_me ? "fill-current" : ""}`} />
                      Like
                    </button>
                    <button
                      onClick={() => handleComment(post.id)}
                      className="cc-action hover:text-purple-300"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Comment
                    </button>
                    <button
                      onClick={() => handleShare(post.id)}
                      className="cc-action hover:text-cyan-300"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                  </div>

                  {showCommentInput[post.id] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 pt-3 cc-hairline"
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
                          className="cc-input h-9 text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSubmitComment(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                          aria-label="Send comment"
                          className="cc-gradient-btn h-9 w-9 flex items-center justify-center flex-shrink-0"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}
