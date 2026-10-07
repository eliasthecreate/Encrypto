import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Edit3,
  MapPin,
  Calendar,
  GraduationCap,
  BookOpen,
  Users,
  User,
  Camera,
  Image as ImageIcon,
  Loader2,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Globe,
  Instagram,
  Twitter,
  Briefcase,
  Home,
  School,
  List,
  LayoutGrid,
  ChevronDown,
  Check,
} from "lucide-react";
import { useProfile, useProfileStats, useUserPosts, useFriends } from "@/lib/supabase-hooks";
import { useAuth } from "@/lib/auth-context";
import { uploadFile } from "@/lib/supabase";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { EditProfileModal } from "./EditProfileModal";
import { SettingsModal } from "./SettingsModal";
import { formatTimeAgo } from "@/lib/utils";
import { toast } from "sonner";

import { VerifiedBadge } from "./VerifiedBadge";
import { VerificationModal } from "./VerificationModal";
import { ShieldCheck, Fingerprint } from "lucide-react";

export function Profile() {
  const [activeTab, setActiveTab] = useState("all");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [postViewMode, setPostViewMode] = useState<"list" | "grid">("list");
  const { user } = useAuth();
  const { profile, loading, updateProfile, refresh } = useProfile();
  const { postCount, friendCount, loading: statsLoading } = useProfileStats();
  const { posts: userPosts, loading: postsLoading } = useUserPosts();
  const { friends, loading: friendsLoading } = useFriends();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const url = await uploadFile("avatars", `${user?.id}/avatar-${Date.now()}`, file);
    if (url) {
      await updateProfile({ avatar_url: url });
      toast.success("Profile picture updated!");
    } else {
      toast.error("Upload failed. Make sure the 'avatars' bucket exists in Supabase.");
    }
    setUploadingAvatar(false);
  };

  const STATUS_OPTIONS = [
  { id: "online", label: "Online", dot: "bg-green-500" },
  { id: "away", label: "Away", dot: "bg-yellow-500" },
  { id: "busy", label: "Busy", dot: "bg-red-500" },
  { id: "offline", label: "Invisible", dot: "bg-gray-400" },
] as const;

  const [savingStatus, setSavingStatus] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const changeStatus = async (next: string) => {
    if (next === (profile?.status ?? "offline")) {
      setShowStatusMenu(false);
      return;
    }
    setSavingStatus(true);
    await updateProfile({ status: next } as any);
    setSavingStatus(false);
    setShowStatusMenu(false);
    toast.success(next === "offline" ? "You are now appearing offline" : `Status set to ${next}`);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    const url = await uploadFile("covers", `${user?.id}/cover-${Date.now()}`, file);
    if (url) {
      await updateProfile({ cover_url: url });
      toast.success("Cover photo updated!");
    } else {
      toast.error("Upload failed. Make sure the 'covers' bucket exists in Supabase Storage.");
    }
    setUploadingCover(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const p = profile;
  const displayName = p?.name ?? user?.name ?? "You";
  const pronounsText = p?.pronouns ? ` · ${p.pronouns}` : "";
  const details: string[] = [];
  if (p?.workplace || p?.job_title) details.push([p?.job_title, p?.workplace].filter(Boolean).join(" at "));
  if (p?.location) details.push(p.location);
  if (p?.school) details.push(p.school);
  if (p?.department) details.push(p.department);
  const joinedDate = p?.created_at
    ? new Date(p.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;
  const currentStatus = (p?.status ?? "offline") as "online" | "away" | "busy" | "offline";

  return (
    <div className="max-w-2xl mx-auto">
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />

      {/* ─── Cover Photo ─── */}
      <div className="relative h-48 sm:h-64 rounded-b-2xl overflow-hidden bg-gradient-to-br from-[#2a1145] via-purple-700 to-pink-600">
        <div className="absolute inset-0 bg-grid opacity-40" />
        {p?.cover_url && (
          <img src={p.cover_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d1a] via-transparent to-transparent" />

        {/* Edit cover button */}
        <div
          onClick={() => coverInputRef.current?.click()}
          className="absolute bottom-3 right-3 bg-[#13132a]/80 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-white/10 flex items-center gap-2 cursor-pointer hover:bg-[#1e1e3a] transition-colors"
        >
          <Camera className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium text-slate-200">
            {uploadingCover ? "Uploading..." : "Edit cover photo"}
          </span>
          {uploadingCover && <Loader2 className="h-4 w-4 animate-spin text-purple-500" />}
        </div>

        {/* Profile picture overlapping cover */}
        <div className="absolute -bottom-14 left-6">
          <div className="relative group">
            <div className="h-28 w-28 rounded-full border-4 border-[#13132a] shadow-xl overflow-hidden">
              {p?.avatar_url ? (
                <img src={p.avatar_url} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-4xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Avatar hover overlay */}
              <div
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all duration-300 flex items-center justify-center cursor-pointer"
              >
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {uploadingAvatar ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white drop-shadow-lg" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Profile Info ─── */}
      <div className="px-6 pt-16 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>{displayName}</span>
              {p?.is_verified && <VerifiedBadge domain={p.university_domain} size="md" />}
              {pronounsText && (
                <span className="text-base font-normal text-muted-foreground">{pronounsText}</span>
              )}
            </h1>

            {/* Public UUID Handle */}
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400 font-mono">
              <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
              <span>{p?.public_uuid || `cc-uuid-${user?.id?.slice(0, 8)}`}</span>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
              <span className="font-medium text-slate-300">
                {statsLoading ? "..." : friendCount} friends
              </span>
              <span>·</span>
              <span>{joinedDate ? `Joined ${joinedDate}` : ""}</span>
            </div>

            {/* Presence: lets the user choose what others see on their avatar */}
            <div className="relative mt-2.5">
              <button
                onClick={() => setShowStatusMenu((v) => !v)}
                disabled={savingStatus}
                aria-expanded={showStatusMenu}
                className="inline-flex items-center gap-2 h-8 pl-2.5 pr-3 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-slate-300 hover:border-purple-500/40 hover:text-purple-200 transition-colors disabled:opacity-60"
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    STATUS_OPTIONS.find((s) => s.id === currentStatus)?.dot ?? "bg-gray-400"
                  } ${currentStatus === "online" ? "live-dot" : ""}`}
                />
                {savingStatus ? "Saving..." : STATUS_OPTIONS.find((s) => s.id === currentStatus)?.label}
              </button>

              {showStatusMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowStatusMenu(false)} />
                  <div className="absolute top-9 left-0 z-30 w-44 rounded-2xl bg-[#16162e] border border-white/10 shadow-2xl shadow-black/50 p-1.5">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => changeStatus(option.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-colors ${
                          option.id === currentStatus
                            ? "bg-purple-500/15 text-purple-200"
                            : "text-slate-300 hover:bg-white/[0.06]"
                        }`}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${option.dot}`} />
                        {option.label}
                        {option.id === currentStatus && <Check className="h-3.5 w-3.5 ml-auto" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Detail line (work · location · school) */}
            {details.length > 0 && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground flex-wrap">
                {details.map((d, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i === 0 && <Briefcase className="h-3.5 w-3.5" />}
                    {i === 1 && <MapPin className="h-3.5 w-3.5" />}
                    {i === 2 && <School className="h-3.5 w-3.5" />}
                    {d}
                  </span>
                ))}
              </div>
            )}

            {/* Social links */}
            {(p?.instagram || p?.twitter || p?.website) && (
              <div className="flex items-center gap-3 mt-2">
                {p?.instagram && (
                  <a
                    href={`https://instagram.com/${p.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-purple-500 hover:text-purple-300"
                  >
                    <Instagram className="h-3.5 w-3.5" />
                    {p.instagram}
                  </a>
                )}
                {p?.twitter && (
                  <a
                    href={`https://twitter.com/${p.twitter.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-500 hover:text-sky-400"
                  >
                    <Twitter className="h-3.5 w-3.5" />
                    {p.twitter}
                  </a>
                )}
                {p?.website && (
                  <a
                    href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-green-500 hover:text-emerald-400"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {p.website}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVerifyModal(true)}
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1.5"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              {p?.is_verified ? "Verified" : "Verify Student"}
            </Button>
            <Button variant="gradient" size="sm" onClick={() => setShowEditModal(true)}>
              <Edit3 className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="border-t border-white/[0.07]">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-transparent border-b border-white/[0.07] rounded-none h-auto p-0">
            {[
              { value: "all", label: "All" },
              { value: "about", label: "About" },
              { value: "photos", label: "Photos" },
              { value: "friends", label: "Friends" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:text-purple-300 data-[state=active]:shadow-none py-3 text-sm font-medium"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ─── ALL TAB ─── */}
          <TabsContent value="all" className="px-0">
            {/* Bio */}
            {(p?.bio || "") && (
              <div className="px-6 py-4">
                <p className="text-sm text-slate-300 leading-relaxed">{p.bio}</p>
              </div>
            )}

            {/* Friends preview */}
            <FriendsSection
              friends={friends}
              loading={friendsLoading}
              friendCount={statsLoading ? 0 : friendCount}
              onSeeAll={() => setActiveTab("friends")}
            />

            {/* Posts */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-base text-white">Posts</h3>
                <div className="flex items-center gap-1 bg-white/[0.05] rounded-lg p-0.5">
                  <button
                    onClick={() => setPostViewMode("list")}
                    className={`p-1.5 rounded-md transition-colors ${postViewMode === "list" ? "bg-white bg-[#26264a] shadow-sm text-purple-500" : "text-gray-400 hover:text-slate-300"}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPostViewMode("grid")}
                    className={`p-1.5 rounded-md transition-colors ${postViewMode === "grid" ? "bg-white bg-[#26264a] shadow-sm text-purple-500" : "text-gray-400 hover:text-slate-300"}`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {postsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                </div>
              ) : userPosts.length === 0 ? (
                <Card className="glass-card">
                  <CardContent className="p-8 text-center">
                    <div className="h-12 w-12 rounded-full bg-white/[0.05] flex items-center justify-center mx-auto mb-3">
                      <MessageCircle className="h-6 w-6 text-gray-400 text-slate-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">No posts yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Go to the Home feed to create your first post!</p>
                  </CardContent>
                </Card>
              ) : postViewMode === "grid" ? (
                <div className="grid grid-cols-3 gap-1">
                  {userPosts.filter((po) => po.image_url).map((post) => (
                    <div key={post.id} className="aspect-square rounded-lg overflow-hidden bg-white/[0.05]">
                      <img src={post.image_url!} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {userPosts.filter((po) => po.image_url).length === 0 && (
                    <div className="col-span-3 text-center py-8 text-sm text-muted-foreground">No photos in posts yet</div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {userPosts.map((post) => (
                    <PostCard key={post.id} post={post} profileName={displayName} avatarUrl={p?.avatar_url} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── ABOUT TAB ─── */}
          <TabsContent value="about" className="px-0">
            <AboutSection profile={p} />
          </TabsContent>

          {/* ─── PHOTOS TAB ─── */}
          <TabsContent value="photos" className="px-6 py-4">
            <h3 className="font-semibold text-base text-white mb-3">Photos</h3>
            {(() => {
              const photoPosts = userPosts.filter((po) => po.image_url);
              if (photoPosts.length === 0) {
                return (
                  <Card className="glass-card">
                    <CardContent className="p-8 text-center">
                      <div className="h-12 w-12 rounded-full bg-white/[0.05] flex items-center justify-center mx-auto mb-3">
                        <ImageIcon className="h-6 w-6 text-gray-400 text-slate-500" />
                      </div>
                      <p className="text-sm text-muted-foreground">No photos yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Photos you share in posts will appear here</p>
                    </CardContent>
                  </Card>
                );
              }
              return (
                <div className="grid grid-cols-3 gap-1">
                  {photoPosts.map((post) => (
                    <div key={post.id} className="aspect-square rounded-lg overflow-hidden bg-white/[0.05]">
                      <img src={post.image_url!} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              );
            })()}
          </TabsContent>

          {/* ─── FRIENDS TAB ─── */}
          <TabsContent value="friends" className="px-6 py-4">
            <FriendsFullSection friends={friends} loading={friendsLoading} friendCount={statsLoading ? 0 : friendCount} />
          </TabsContent>
        </Tabs>
      </div>

      <EditProfileModal open={showEditModal} onClose={() => setShowEditModal(false)} profile={profile} onSave={updateProfile} />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      <VerificationModal isOpen={showVerifyModal} onClose={() => setShowVerifyModal(false)} onVerified={refresh} />
    </div>
  );
}

/* ─── Post Card ─── */
function PostCard({ post, profileName, avatarUrl }: { post: any; profileName: string; avatarUrl: string | null }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-2">
          <Avatar name={profileName} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">{profileName}</p>
            <p className="text-[11px] text-muted-foreground">{formatTimeAgo(new Date(post.created_at))}</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-slate-200 mb-2">{post.content}</p>
        {post.image_url && (
          <img src={post.image_url} alt="" className="rounded-lg w-full max-h-80 object-cover mb-2" />
        )}
        {post.event_location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <MapPin className="h-3 w-3" />
            <span>{post.event_location}</span>
          </div>
        )}
        <div className="flex items-center gap-3 pt-2 border-t border-white/[0.07] text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 text-pink-400" />
            {post.like_count}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {post.comment_count}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Friends Preview (All tab) ─── */
function FriendsSection({ friends, loading, friendCount, onSeeAll }: { friends: any[]; loading: boolean; friendCount: number; onSeeAll: () => void }) {
  if (loading) return null;
  if (friendCount === 0) return null;

  return (
    <div className="px-6 py-4 border-t border-white/[0.07]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-base text-white">Friends</h3>
          <p className="text-sm text-muted-foreground">{friendCount.toLocaleString()} friends</p>
        </div>
        <button onClick={onSeeAll} className="text-sm text-purple-500 hover:text-purple-300 font-medium">
          See all friends
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {friends.slice(0, 6).map((friend: any) => (
          <div key={friend.id} className="text-center">
            <div className="aspect-square rounded-xl overflow-hidden bg-white/[0.05] mb-1.5">
              {friend.avatar_url ? (
                <img src={friend.avatar_url} alt={friend.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                  {(friend.name ?? "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <p className="text-xs font-medium text-white truncate">{friend.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Friends Full Grid ─── */
function FriendsFullSection({ friends, loading, friendCount }: { friends: any[]; loading: boolean; friendCount: number }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-base text-white">Friends</h3>
          <p className="text-sm text-muted-foreground">{friendCount.toLocaleString()} friends</p>
        </div>
      </div>
      {friends.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <div className="h-12 w-12 rounded-full bg-white/[0.05] flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6 text-gray-400 text-slate-500" />
            </div>
            <p className="text-sm text-muted-foreground">No friends yet</p>
            <p className="text-xs text-muted-foreground mt-1">Connect with your campus mates!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {friends.map((friend: any) => (
            <div key={friend.id} className="text-center">
              <div className="aspect-square rounded-xl overflow-hidden bg-white/[0.05] mb-1.5">
                {friend.avatar_url ? (
                  <img src={friend.avatar_url} alt={friend.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                    {(friend.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-white truncate">{friend.name}</p>
              {friend.department && (
                <p className="text-[10px] text-muted-foreground truncate">{friend.department}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── About Section ─── */
function AboutSection({ profile: p }: { profile: any }) {
  return (
    <div className="px-6 py-4 space-y-5">
      {/* Personal Details */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-base text-white">Personal Details</h3>
        </div>
        <div className="space-y-3">
          {p?.pronouns && (
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-slate-300">{p.pronouns}</span>
            </div>
          )}
          {p?.location && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-slate-300">Lives in {p.location}</span>
            </div>
          )}
          {p?.hometown && (
            <div className="flex items-center gap-3 text-sm">
              <Home className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-slate-300">From {p.hometown}</span>
            </div>
          )}
          {p?.birthday && (
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-slate-300">{p.birthday}</span>
            </div>
          )}
          {p?.created_at && (
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-slate-300">
                Joined {new Date(p.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Work */}
      {(p?.workplace || p?.job_title) && (
        <div className="glass-card rounded-xl p-4">
          <h3 className="font-semibold text-base text-white mb-3">Work</h3>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{p.job_title || "Employee"}</p>
              <p className="text-sm text-muted-foreground">{p.workplace}</p>
            </div>
          </div>
        </div>
      )}

      {/* Education */}
      {(p?.school || p?.department) && (
        <div className="glass-card rounded-xl p-4">
          <h3 className="font-semibold text-base text-white mb-3">Education</h3>
          <div className="space-y-3">
            {p?.school && (
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <School className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{p.school}</p>
                  {p.year && <p className="text-xs text-muted-foreground">{p.year}</p>}
                </div>
              </div>
            )}
            {p?.department && !p?.school && (
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">B.Sc. {p.department}</p>
                  {p.year && <p className="text-xs text-muted-foreground">The Information and Communications University · {p.year}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Skills */}
      {(p?.skills || "").trim() !== "" && (
        <div className="glass-card rounded-xl p-4">
          <h3 className="font-semibold text-base text-white mb-3">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {p.skills.split(",").map((s: string) => s.trim()).filter(Boolean).map((skill: string) => (
              <Badge key={skill} className="bg-purple-500/12 text-purple-300 bg-purple-500/15 text-purple-300 border-purple-500/25 dark:border-purple-800">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Contact Info */}
      {(p?.website || p?.instagram || p?.twitter || p?.email) && (
        <div className="glass-card rounded-xl p-4">
          <h3 className="font-semibold text-base text-white mb-3">Contact Info</h3>
          <div className="space-y-3">
            {p?.email && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400">@</span>
                <span className="text-slate-300">{p.email}</span>
              </div>
            )}
            {p?.instagram && (
              <a href={`https://instagram.com/${p.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:opacity-80">
                <Instagram className="h-4 w-4 text-pink-500 flex-shrink-0" />
                <span className="text-purple-500">{p.instagram}</span>
              </a>
            )}
            {p?.twitter && (
              <a href={`https://twitter.com/${p.twitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:opacity-80">
                <Twitter className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="text-blue-500">{p.twitter}</span>
              </a>
            )}
            {p?.website && (
              <a href={p.website.startsWith("http") ? p.website : `https://${p.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:opacity-80">
                <Globe className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-green-500">{p.website}</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
