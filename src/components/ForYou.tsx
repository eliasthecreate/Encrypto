import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Heart,
  MessageCircle,
  Wand2,
  Users,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { useProfile, useForYouFeed, useStudentSuggestions, type ForYouPost } from "@/lib/supabase-hooks";
import { interestById, splitList, countMatches } from "@/lib/interests";
import { Avatar } from "./ui/avatar";
import { formatTimeAgo } from "@/lib/utils";
import { InterestsOnboarding } from "./InterestsOnboarding";

interface ForYouProps {
  onViewProfile?: (user: { id: string; name: string; avatar_url?: string | null; status?: string | null }) => void;
}

export function ForYou({ onViewProfile }: ForYouProps) {
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  const interestIds = useMemo(() => splitList(profile?.interests), [profile?.interests]);
  const courseIds = useMemo(() => splitList(profile?.courses), [profile?.courses]);

  const { posts, loading: feedLoading, likePost, refresh } = useForYouFeed(interestIds, courseIds);
  const { suggestions } = useStudentSuggestions();

  // First visit (interests_set === false) → launch the animated picker.
  useEffect(() => {
    if (!profileLoading && profile && profile.interests_set === false) {
      setShowOnboarding(true);
    }
  }, [profileLoading, profile]);

  const pickedInterests = interestIds
    .map((id) => interestById(id))
    .filter(Boolean) as { id: string; label: string; emoji: string }[];

  const visiblePosts = useMemo(() => {
    if (!activeTopic) return posts;
    const def = interestById(activeTopic);
    if (!def) return posts;
    return posts.filter((p) => {
      if (p.match_reasons.includes(def.label)) return true;
      const text = `${p.content ?? ""} ${p.event_location ?? ""}`.toLowerCase();
      return countMatches(text, def.keywords) > 0;
    });
  }, [posts, activeTopic]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Hero */}
      <div className="relative overflow-hidden cc-card p-5">
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(124,58,237,0.35),transparent_60%)]" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-fuchsia-400" />
              For You
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-md">
              {pickedInterests.length > 0
                ? `Ranked for you based on ${pickedInterests.length} interests${
                    profile?.department ? `, ${profile.department}` : ""
                  } and your courses.`
                : "Pick a few interests and we'll tune your campus feed."}
            </p>
          </div>
          <button
            onClick={() => setShowOnboarding(true)}
            className="cc-outline-btn h-9 px-3 flex items-center gap-1.5 text-xs flex-shrink-0"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Personalize
          </button>
        </div>

        {/* Topic pills */}
        {pickedInterests.length > 0 && (
          <div className="relative cc-scroll-x -mx-1 mt-4 flex gap-2 px-1">
            <button
              onClick={() => setActiveTopic(null)}
              className={`cc-pill ${activeTopic === null ? "cc-pill-active" : "cc-pill-idle"}`}
            >
              All
            </button>
            {pickedInterests.map((it) => (
              <button
                key={it.id}
                onClick={() => setActiveTopic((t) => (t === it.id ? null : it.id))}
                className={`cc-pill flex items-center gap-1.5 ${activeTopic === it.id ? "cc-pill-active" : "cc-pill-idle"}`}
              >
                <span>{it.emoji}</span>
                {it.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* People you may like */}
      {suggestions.length > 0 && (
        <div className="cc-card p-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-1.5 mb-3">
            <Users className="h-4 w-4 text-cyan-400" />
            People with your vibe
          </h2>
          <div className="cc-scroll-x flex gap-3 pb-1">
            {suggestions.slice(0, 10).map((s: any) => (
              <button
                key={s.id}
                onClick={() =>
                  onViewProfile?.({
                    id: s.id,
                    name: s.name ?? "Student",
                    avatar_url: s.avatar_url ?? null,
                    status: s.status ?? null,
                  })
                }
                className="flex flex-col items-center gap-1.5 min-w-[76px] text-center"
              >
                <Avatar name={s.name ?? "?"} src={s.avatar_url ?? undefined} size="lg" status={s.status} showStatus />
                <span className="text-[11px] font-medium text-slate-200 truncate max-w-[76px]">
                  {s.name?.split(" ")[0] ?? "Student"}
                </span>
                {s.match_reasons?.[0] && (
                  <span className="text-[9px] text-purple-300/90 leading-tight line-clamp-2 px-0.5">
                    {s.match_reasons[0]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feed header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-purple-400" />
          {activeTopic ? `${interestById(activeTopic)?.label} picks` : "Picked for you"}
        </h2>
        <button
          onClick={refresh}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${feedLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Posts */}
      {feedLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      ) : visiblePosts.length === 0 ? (
        <div className="cc-card p-10 text-center">
          <div className="h-14 w-14 rounded-full bg-white/[0.05] flex items-center justify-center mx-auto mb-3">
            <Sparkles className="h-7 w-7 text-slate-600" />
          </div>
          <h3 className="font-semibold text-slate-200 mb-1">Nothing here yet</h3>
          <p className="text-sm text-slate-500">
            {interestIds.length === 0
              ? "Pick your interests to tune this feed."
              : "No posts match this topic yet — check back soon."}
          </p>
          <button
            onClick={() => setShowOnboarding(true)}
            className="cc-gradient-btn mt-4 h-10 px-5 inline-flex items-center gap-2 text-sm"
          >
            <Wand2 className="h-4 w-4" />
            Tune my interests
          </button>
        </div>
      ) : (
        visiblePosts.map((post, index) => (
          <ForYouPostCard
            key={post.id}
            post={post}
            index={index}
            onLike={likePost}
            onViewProfile={onViewProfile}
          />
        ))
      )}

      <InterestsOnboarding
        open={showOnboarding}
        profile={profile}
        firstTime={!profile?.interests_set}
        onSave={updateProfile}
        onDone={() => setShowOnboarding(false)}
      />
    </div>
  );
}

function ForYouPostCard({
  post,
  index,
  onLike,
  onViewProfile,
}: {
  post: ForYouPost;
  index: number;
  onLike: (id: string) => void;
  onViewProfile?: ForYouProps["onViewProfile"];
}) {
  const author = post.profiles ?? ({} as any);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04 }}
    >
      <div className="cc-card cc-card-hover overflow-hidden">
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <button
              onClick={() =>
                onViewProfile?.({
                  id: author.id ?? post.user_id,
                  name: author.name ?? "Unknown",
                  avatar_url: author.avatar_url ?? null,
                  status: author.status ?? null,
                })
              }
              className="flex items-center gap-3 min-w-0 text-left group"
            >
              <Avatar
                name={author.name ?? "Unknown"}
                src={author.avatar_url ?? undefined}
                size="lg"
                status={author.status ?? "offline"}
                showStatus
              />
              <div className="min-w-0">
                <span className="font-semibold text-sm text-white group-hover:text-purple-300 transition-colors truncate block">
                  {author.name ?? "Unknown"}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                  <span className="truncate">
                    {author.department ?? ""}
                    {author.department && author.year ? " · " : ""}
                    {author.year ?? ""}
                  </span>
                  <span>·</span>
                  <span className="flex-shrink-0">{formatTimeAgo(new Date(post.created_at))}</span>
                </div>
              </div>
            </button>
            {post.type !== "post" && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  post.type === "event" ? "bg-orange-400/15 text-orange-300" : "bg-purple-500/15 text-purple-300"
                }`}
              >
                {post.type === "event" ? "Event" : "Announcement"}
              </span>
            )}
          </div>

          {post.match_reasons.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-fuchsia-400" />
                Because you like
              </span>
              {post.match_reasons.map((r) => (
                <span
                  key={r}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/25"
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
            {post.content}
          </p>

          {post.image_url && (
            <img src={post.image_url} alt="Post" className="mt-3 rounded-xl w-full object-cover max-h-96" />
          )}

          {post.event_location && (
            <div className="mt-3 flex items-center gap-2 bg-purple-500/12 rounded-xl px-3 py-2">
              <MapPin className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-medium text-purple-300 truncate">{post.event_location}</span>
            </div>
          )}

          <div className="mt-3 pt-3 cc-hairline flex items-center justify-between">
            <button
              onClick={() => onLike(post.id)}
              className={`cc-action ${post.is_liked_by_me ? "cc-action-liked" : ""}`}
            >
              <Heart className={`h-4 w-4 ${post.is_liked_by_me ? "fill-current" : ""}`} />
              {post.like_count ?? 0}
            </button>
            <span className="cc-action pointer-events-none">
              <MessageCircle className="h-4 w-4" />
              {post.comment_count ?? 0}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
