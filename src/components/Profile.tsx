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
  Camera,
  Image as ImageIcon,
  Loader2,
  Heart,
  MessageCircle,
  MoreHorizontal,
} from "lucide-react";
import { useProfile, useProfileStats, useUserPosts } from "@/lib/supabase-hooks";
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

export function Profile() {
  const [activeTab, setActiveTab] = useState("posts");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const { user } = useAuth();
  const { profile, loading, updateProfile, refresh } = useProfile();
  const { postCount, friendCount, loading: statsLoading } = useProfileStats();
  const { posts: userPosts, loading: postsLoading } = useUserPosts();
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

  return (
    <div className="max-w-2xl mx-auto">
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />

      {/* Cover Photo */}
      <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 mb-20">
        {profile?.cover_url && (
          <img src={profile.cover_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        
        {/* Hover overlay for cover */}
        <div
          onClick={() => coverInputRef.current?.click()}
          className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all duration-300 flex items-center justify-center cursor-pointer group"
        >
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg flex items-center gap-2">
            <Camera className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {uploadingCover ? "Uploading..." : "Change Cover Photo"}
            </span>
            {uploadingCover && <Loader2 className="h-4 w-4 animate-spin text-purple-500" />}
          </div>
        </div>

        <div className="absolute -bottom-16 left-6">
          <div className="relative group">
            <div className="h-28 w-28 rounded-2xl border-4 border-white dark:border-gray-900 shadow-xl overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile?.name ?? "Avatar"} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-4xl font-bold">
                  {(profile?.name ?? "Y").charAt(0).toUpperCase()}
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

      {/* Profile Info */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">
              {profile?.name ?? user?.name ?? "You"}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              <span>{profile?.department ?? "Computer Science"}, {profile?.year ?? "3rd Year"}</span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {profile?.created_at
                  ? `Joined ${new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
                  : ""}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 max-w-md leading-relaxed">
              {profile?.bio ?? "Passionate about technology and building connections on campus. Coffee addict ☕, hackathon enthusiast 💻, always up for new adventures!"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="gradient" size="sm" onClick={() => setShowEditModal(true)}>
              <Edit3 className="h-4 w-4 mr-1.5" />
              Edit Profile
            </Button>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-6 mt-4 py-3 border-t border-gray-100 dark:border-gray-800">
          {[
            { label: "Posts", value: statsLoading ? "..." : postCount },
            { label: "Friends", value: statsLoading ? "..." : friendCount },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-bold text-lg dark:text-white">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { icon: BookOpen, label: "Department", value: profile?.department ?? "Computer Science", color: "from-purple-400 to-pink-500" },
          { icon: Users, label: "Member of", value: "Campus Community", color: "from-pink-400 to-orange-500" },
          { icon: GraduationCap, label: "Year", value: profile?.year ?? "3rd Year (Junior)", color: "from-orange-400 to-amber-500" },
          { icon: MapPin, label: "From", value: "ICU Campus", color: "from-amber-400 to-yellow-500" },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"
          >
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}>
              <item.icon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="text-sm font-medium truncate dark:text-white">{item.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-gray-100/50 dark:bg-gray-800/50 mb-4">
          <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
          <TabsTrigger value="photos" className="flex-1">Photos</TabsTrigger>
          <TabsTrigger value="about" className="flex-1">About</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          {postsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </div>
          ) : userPosts.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="h-6 w-6 text-gray-400 dark:text-gray-600" />
                </div>
                <p className="text-sm text-muted-foreground">No posts yet</p>
                <p className="text-xs text-muted-foreground mt-1">Go to the Home feed to create your first post!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {userPosts.map((post, i) => (
                <Card key={post.id} className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-2">
                      <Avatar name={profile?.name ?? "You"} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">{post.content}</p>
                        {post.event_location && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{post.event_location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-50 dark:border-gray-800 text-xs text-muted-foreground">
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="photos">
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                <ImageIcon className="h-6 w-6 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-sm text-muted-foreground">No photos yet</p>
              <p className="text-xs text-muted-foreground mt-1">Photos you share in posts will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about">
          <Card className="glass-card">
            <CardContent className="p-4 space-y-4">
              <div>
                <h3 className="font-semibold text-sm mb-2 dark:text-white">Education</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">B.Sc. {profile?.department ?? "Computer Science"}</p>
                <p className="text-xs text-muted-foreground">International Christian University · Expected 2027</p>
              </div>
              <div className="border-t border-gray-50 dark:border-gray-800 pt-4">
                <h3 className="font-semibold text-sm mb-2 dark:text-white">Clubs & Activities</h3>
                <div className="flex flex-wrap gap-2">
                  {["Tech Club", "Photography Club", "Hackathon Team"].map((club) => (
                    <Badge key={club} variant="secondary">{club}</Badge>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-50 dark:border-gray-800 pt-4">
                <h3 className="font-semibold text-sm mb-2 dark:text-white">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {["Coding", "Photography", "Music", "Travel", "Sports"].map((interest) => (
                    <Badge key={interest} variant="outline">{interest}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditProfileModal open={showEditModal} onClose={() => setShowEditModal(false)} profile={profile} onSave={updateProfile} />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
