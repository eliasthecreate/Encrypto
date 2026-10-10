import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Loader2,
  GraduationCap,
  BookOpen,
  Calendar,
  Heart,
  MessageCircle,
  Sparkles,
  Users,
  User,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Avatar } from "./ui/avatar";
import { formatTimeAgo } from "@/lib/utils";
import { interestById, splitList } from "@/lib/interests";

interface UserProfileViewProps {
  userId: string;
  onBack: () => void;
  onMessage?: (user: { id: string; name: string }) => void;
}

interface PostWithMeta {
  id: string;
  content: string;
  type: string;
  image_url: string | null;
  event_location: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
}

export function UserProfileView({ userId, onBack, onMessage }: UserProfileViewProps) {
  const [profile, setProfile] = useState<any>(null);
  const [postCount, setPostCount] = useState<number | null>(null);
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [posts, setPosts] = useState<PostWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: prof } = await (supabase.from("profiles") as any)
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      const { count: pCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // RLS on `friends` scopes rows to the signed-in user's own pairs, so this
      // returns only the viewed user's connections.
      const { count: fCount } = await supabase
        .from("friends")
        .select("*", { count: "exact", head: true })
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

      const { data: rawPosts } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      const enriched = await Promise.all(
        (rawPosts ?? []).map(async (post: any) => {
          const { count: likeCount } = await supabase
            .from("post_likes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);
          const { count: commentCount } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);
          return {
            id: post.id,
            content: post.content,
            type: post.type,
            image_url: post.image_url,
            event_location: post.event_location,
            created_at: post.created_at,
            like_count: likeCount ?? 0,
            comment_count: commentCount ?? 0,
          } as PostWithMeta;
        })
      );

      if (active) {
        setProfile(prof || null);
        setPostCount(pCount ?? 0);
        setFriendCount(fCount ?? 0);
        setPosts(enriched);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const skills = (profile?.skills || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  const interests = splitList(profile?.interests);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-[#0d0d1a] overflow-y-auto"
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[#0d0d1a]/90 backdrop-blur-xl border-b border-white/[0.07]">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <button
            onClick={onBack}
            className="h-9 w-9 rounded-xl hover:bg-white/[0.07] flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-slate-400" />
          </button>
          <span className="font-semibold text-white truncate">
            {loading ? "Profile" : profile?.name || "Profile"}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : !profile ? (
        <div className="max-w-2xl mx-auto p-8 text-center text-sm text-muted-foreground">
          This profile could not be found.
        </div>
      ) : (
        <div className="max-w-2xl mx-auto pb-24">
          {/* Cover Photo */}
          <div className="relative h-44 sm:h-52 bg-gradient-to-r from-purple-700 via-violet-600 to-pink-600">
            {profile.cover_url && (
              <img
                src={profile.cover_url}
                alt="Cover"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute -bottom-14 left-5">
              <Avatar
                src={profile.avatar_url}
                name={profile.name || "?"}
                size="2xl"
                status={profile.status}
                showStatus
              />
            </div>
          </div>

          {/* Name + status */}
          <div className="pt-20 px-5">
            <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
            <p className="text-sm text-muted-foreground capitalize mt-0.5">
              {profile.status || "offline"}
            </p>

            {/* Stats */}
            <div className="flex gap-6 mt-3 py-3 border-t border-white/[0.07]">
              <div className="text-center">
                <div className="font-bold text-lg text-white">{postCount}</div>
                <div className="text-xs text-slate-500">Posts</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-white">{friendCount}</div>
                <div className="text-xs text-slate-500">Friends</div>
              </div>
            </div>

            {/* Bio */}
            {profile.bio ? (
              <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                {profile.bio}
              </p>
            ) : null}

            {/* Message */}
            {onMessage && (
              <button
                onClick={() => onMessage({ id: profile.id, name: profile.name })}
                className="mt-4 w-full h-10 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-purple-900/40"
              >
                <MessageCircle className="h-4 w-4" />
                Message {profile.name?.split(" ")[0]}
              </button>
            )}

            {/* Detail cards */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              {[
                { icon: BookOpen, label: "Program", value: profile.department || "—", color: "from-purple-500 to-pink-600" },
                { icon: GraduationCap, label: "Year of Study", value: profile.year || "—", color: "from-orange-500 to-amber-500" },
                { icon: Calendar, label: "Joined", value: profile.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—", color: "from-pink-500 to-orange-600" },
                { icon: Users, label: "Member of", value: "Campus Community", color: "from-amber-500 to-yellow-500" },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] bg-[#1e1e3a]/50 border border-white/[0.08]"
                >
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}>
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">{item.label}</div>
                    <div className="text-sm font-medium text-white truncate">{item.value}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <div className="mt-6">
                <h3 className="flex items-center gap-1.5 font-semibold text-sm text-white mb-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill: string) => (
                    <span
                      key={skill}
                      className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Interests */}
            {interests.length > 0 && (
              <div className="mt-6">
                <h3 className="flex items-center gap-1.5 font-semibold text-sm text-white mb-2">
                  <Sparkles className="h-4 w-4 text-fuchsia-400" />
                  Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {interests.map((id: string) => {
                    const def = interestById(id);
                    return (
                      <span
                        key={id}
                        className="text-xs font-medium px-2.5 py-1 rounded-full bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/25"
                      >
                        {def ? `${def.emoji} ${def.label}` : id}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Posts */}
            <div className="mt-8">
              <h3 className="flex items-center gap-1.5 font-semibold text-sm text-white mb-3">
                <User className="h-4 w-4 text-pink-500" />
                Posts
              </h3>
              {posts.length === 0 ? (
                <div className="cc-card p-8 text-center">
                  <p className="text-sm text-muted-foreground">No posts yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <div key={post.id} className="cc-card p-4">
                      <p className="text-sm leading-relaxed text-slate-200">{post.content}</p>
                      {post.image_url && (
                        <img src={post.image_url} alt="Post" className="mt-3 rounded-xl w-full object-cover max-h-80" />
                      )}
                      {post.event_location && (
                        <p className="mt-2 text-xs text-muted-foreground">📍 {post.event_location}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-white/[0.07] text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5 text-pink-400" />
                          {post.like_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {post.comment_count}
                        </span>
                        <span className="ml-auto">{formatTimeAgo(new Date(post.created_at))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
