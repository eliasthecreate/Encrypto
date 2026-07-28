import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth-context";
import { encryptMessage, decryptMessage } from "./crypto";
import type { Profile, Post, Message, FriendRequest, LiveStream, Notification, Conversation } from "./supabase-types";

// ─── FEED HOOKS ─────────────────────────────────────────────────

export interface PostWithDetails extends Post {
  profiles: Pick<Profile, "id" | "name" | "department" | "year" | "status" | "avatar_url">;
  like_count: number;
  comment_count: number;
  is_liked_by_me: boolean;
}

export function useFeedPosts() {
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rawData, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles!inner(id, name, department, year, status, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const data: any[] = rawData ?? [];

      const postsWithMeta = await Promise.all(
        data.map(async (post: any) => {
          const { count: likeCount } = await supabase
            .from("post_likes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          const { count: commentCount } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          let isLikedByMe = false;
          if (isAuthenticated) {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user) {
              const { data: like } = await supabase
                .from("post_likes")
                .select("id")
                .eq("post_id", post.id)
                .eq("user_id", sessionData.session.user.id)
                .maybeSingle();
              isLikedByMe = !!like;
            }
          }

          return {
            ...post,
            like_count: likeCount ?? 0,
            comment_count: commentCount ?? 0,
            is_liked_by_me: isLikedByMe,
          } as PostWithDetails;
        })
      );

      setPosts(postsWithMeta);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const likePost = async (postId: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) return;
    const uid = sessionData.session.user.id;

    const existing = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", uid)
      .maybeSingle();

    if (existing.data) {
      await supabase.from("post_likes").delete().eq("id", (existing.data as any).id);
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: uid } as any);
    }
    fetchPosts();
  };

  const addComment = async (postId: string, content: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) return;
    await supabase.from("comments").insert({
      post_id: postId,
      user_id: sessionData.session.user.id,
      content,
    } as any);
    fetchPosts();
  };

  const createPost = async (
    content: string,
    type: "post" | "event" | "announcement" = "post",
    location?: string
  ) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) return;
    const insertData: any = {
      user_id: sessionData.session.user.id,
      content,
      type,
    };
    if (location) insertData.event_location = location;
    await supabase.from("posts").insert(insertData);
    fetchPosts();
  };

  return { posts, loading, likePost, addComment, createPost, refresh: fetchPosts };
}

// ─── MESSAGES HOOKS ─────────────────────────────────────────────

export interface ConversationWithDetails {
  conversation: { id: string; created_at?: string };
  otherUser: { id: string; name: string; avatar_url: string | null; status: string };
  lastMessage: Message | null;
  unreadCount: number;
}

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchConvos = async () => {
      setLoading(true);

      const { data: parts } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);

      const participations: any[] = parts ?? [];
      if (!participations.length) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convIds: string[] = participations.map((p: any) => p.conversation_id);

      const { data: allPartsRaw } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", convIds);

      const allParts: any[] = allPartsRaw ?? [];
      const result: ConversationWithDetails[] = [];

      for (const convId of convIds) {
        const otherPart = allParts.find((p: any) => p.conversation_id === convId && p.user_id !== userId);
        if (!otherPart) continue;

        const { data: otherProfile } = await supabase
          .from("profiles")
          .select("id, name, avatar_url, status")
          .eq("id", otherPart.user_id)
          .single();

        const { data: msgs } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: false })
          .limit(1);

        const msgList: any[] = msgs ?? [];

        const { count: unread } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", convId)
          .eq("read", false)
          .neq("sender_id", userId);

        result.push({
          conversation: { id: convId },
          otherUser: (otherProfile ?? { id: "", name: "Unknown", avatar_url: null, status: "offline" }) as any,
          lastMessage: msgList[0] ?? null,
          unreadCount: unread ?? 0,
        });
      }

      setConversations(result);
      setLoading(false);
    };

    fetchConvos();
  }, [userId]);

  return { conversations, loading };
}

export function useMessages(conversationId: string | null, otherUserId?: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Decrypt messages when they come in
  useEffect(() => {
    const run = async () => {
      if (!conversationId || !otherUserId) return;
      const map: Record<string, string> = {};
      for (const msg of messages) {
        const senderId = msg.sender_id;
        const decryptedId = senderId === user?.id ? otherUserId : senderId;
        if (decryptedId) {
          map[msg.id] = await decryptMessage(conversationId, decryptedId, msg.content);
        } else {
          map[msg.id] = msg.content;
        }
      }
      setDecrypted(map);
    };
    run();
  }, [messages, conversationId, otherUserId, user?.id]);

  useEffect(() => {
    if (!conversationId) return;

    const fetchMsgs = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      setMessages((data ?? []) as Message[]);
      setLoading(false);
    };

    fetchMsgs();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const sendMessage = async (content: string, type: "text" | "image" | "voice" = "text") => {
    if (!conversationId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) return;

    let contentToSend = content;
    if (otherUserId) {
      contentToSend = await encryptMessage(conversationId, otherUserId, content);
    }

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: sessionData.session.user.id,
      content: contentToSend,
      type,
    } as any);
  };

  const getDecryptedContent = (msgId: string): string => {
    return decrypted[msgId] ?? messages.find((m) => m.id === msgId)?.content ?? "";
  };

  return { messages, decrypted, getDecryptedContent, loading, sendMessage };
}

// ─── FRIENDS HOOKS ──────────────────────────────────────────────

export function useFriendRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchRequests = async () => {
      const { data } = await supabase
        .from("friend_requests")
        .select(`*, sender:profiles!sender_id(id, name, department, year, status)`)
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      setRequests(data ?? []);
      setLoading(false);
    };

    fetchRequests();
  }, [userId]);

  const acceptRequest = async (requestId: string) => {
    await (supabase.from("friend_requests") as any).update({ status: "accepted" }).eq("id", requestId);
    setRequests((prev: any[]) => prev.filter((r: any) => r.id !== requestId));
  };

  const rejectRequest = async (requestId: string) => {
    await (supabase.from("friend_requests") as any).update({ status: "rejected" }).eq("id", requestId);
    setRequests((prev: any[]) => prev.filter((r: any) => r.id !== requestId));
  };

  const sendRequest = async (receiverId: string) => {
    if (!userId) return;
    await supabase.from("friend_requests").insert({ sender_id: userId, receiver_id: receiverId } as any);
  };

  return { requests, loading, acceptRequest, rejectRequest, sendRequest };
}

export function useFriends() {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchFriends = async () => {
      const { data: friendships } = await supabase
        .from("friends")
        .select("*")
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

      const fList: any[] = friendships ?? [];
      if (!fList.length) { setLoading(false); return; }

      const friendIds: string[] = fList.map((f: any) => (f.user_id_1 === userId ? f.user_id_2 : f.user_id_1));

      const { data: profiles } = await supabase.from("profiles").select("*").in("id", friendIds);
      setFriends(profiles ?? []);
      setLoading(false);
    };

    fetchFriends();
  }, [userId]);

  return { friends, loading };
}

export function useStudentSuggestions() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchSuggestions = async () => {
      const { data: friendships } = await supabase.from("friends").select("*")
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);
      const fList: any[] = friendships ?? [];

      const friendIds = new Set<string>();
      fList.forEach((f: any) => { friendIds.add(f.user_id_1 === userId ? f.user_id_2 : f.user_id_1); });

      const { data: sentReqs } = await supabase.from("friend_requests").select("receiver_id")
        .eq("sender_id", userId).eq("status", "pending");
      const sList: any[] = sentReqs ?? [];

      const pendingIds = new Set(sList.map((r: any) => r.receiver_id));

      const { data: profiles } = await supabase.from("profiles").select("*").neq("id", userId).limit(20);
      const pList: any[] = profiles ?? [];
      const filtered = pList.filter((p: any) => !friendIds.has(p.id) && !pendingIds.has(p.id));

      setSuggestions(filtered);
      setLoading(false);
    };

    fetchSuggestions();
  }, [userId]);

  return { suggestions, loading };
}

// ─── LIVE STREAMS HOOKS ─────────────────────────────────────────

export function useLiveStreams() {
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStreams = useCallback(async () => {
    const { data } = await supabase
      .from("live_streams")
      .select(`*, host:profiles!user_id(id, name, department, avatar_url)`)
      .eq("is_live", true)
      .order("viewer_count", { ascending: false });

    setLiveStreams(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStreams(); }, [fetchStreams]);

  const startStream = async (title: string, description: string, category: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) return;
    await supabase.from("live_streams").insert({
      user_id: sessionData.session.user.id, title, description, category, is_live: true,
    } as any);
    fetchStreams();
  };

  return { liveStreams, loading, startStream, refresh: fetchStreams };
}

// ─── NOTIFICATIONS HOOK ─────────────────────────────────────────

export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUserId(data.session?.user?.id ?? null); });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifs = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      const list: any[] = data ?? [];
      setNotifications(list);
      setUnreadCount(list.filter((n: any) => !n.read).length);
      setLoading(false);
    };

    fetchNotifs();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const newNotif: any = payload.new;
          setNotifications((prev: any[]) => [newNotif, ...prev]);
          if (!newNotif.read) setUnreadCount((prev: number) => prev + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const markAsRead = async (notifId: string) => {
    await (supabase.from("notifications") as any).update({ read: true }).eq("id", notifId);
    setNotifications((prev: any[]) => prev.map((n: any) => (n.id === notifId ? { ...n, read: true } : n)));
    setUnreadCount((prev: number) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    await (supabase.from("notifications") as any).update({ read: true }).eq("user_id", userId).eq("read", false);
    setNotifications((prev: any[]) => prev.map((n: any) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}

// ─── STORIES HOOK ────────────────────────────────────────────────

export function useStories() {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchStories = async () => {
      const { data } = await supabase
        .from("stories")
        .select(`*, user:profiles!user_id(id, name, avatar_url)`)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      setStories(data ?? []);
      setLoading(false);
    };
    fetchStories();

    // Refresh every 60s
    const interval = setInterval(fetchStories, 60000);
    return () => clearInterval(interval);
  }, []);

  const createStory = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) return;
    await (supabase.from("stories") as any).insert({
      user_id: sessionData.session.user.id,
      media_url: null,
    });
  };

  return { stories, loading, createStory };
}

// ─── PROFILE STATS HOOK ─────────────────────────────────────────

export function useProfileStats(userId?: string) {
  const [postCount, setPostCount] = useState(0);
  const [friendCount, setFriendCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const profileId = userId ?? user?.id;

  useEffect(() => {
    if (!profileId) return;

    const fetchStats = async () => {
      const { count: pCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profileId);

      const { count: fCount } = await supabase
        .from("friends")
        .select("*", { count: "exact", head: true })
        .or(`user_id_1.eq.${profileId},user_id_2.eq.${profileId}`);

      setPostCount(pCount ?? 0);
      setFriendCount(fCount ?? 0);
      setLoading(false);
    };

    fetchStats();
  }, [profileId]);

  return { postCount, friendCount, loading };
}

// ─── USER POSTS (for profile) ───────────────────────────────────

export function useUserPosts(userId?: string) {
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const profileId = userId ?? user?.id;

  useEffect(() => {
    if (!profileId) return;

    const fetch = async () => {
      setLoading(true);
      try {
        const { data: rawData } = await supabase
          .from("posts")
          .select(`*`)
          .eq("user_id", profileId)
          .order("created_at", { ascending: false });

        const data: any[] = rawData ?? [];
        const enriched = await Promise.all(
          data.map(async (post: any) => {
            const { count: likeCount } = await supabase
              .from("post_likes")
              .select("*", { count: "exact", head: true })
              .eq("post_id", post.id);

            const { count: commentCount } = await supabase
              .from("comments")
              .select("*", { count: "exact", head: true })
              .eq("post_id", post.id);

            return {
              ...post,
              profiles: user,
              like_count: likeCount ?? 0,
              comment_count: commentCount ?? 0,
              is_liked_by_me: false,
            } as PostWithDetails;
          })
        );
        setPosts(enriched);
      } catch (err) {
        console.error("Failed to fetch user posts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [profileId]);

  return { posts, loading };
}

// ─── PROFILE HOOK ───────────────────────────────────────────────

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const { user } = useAuth();
  const profileId = userId ?? user?.id;

  useEffect(() => {
    if (!profileId) return;

    const fetchProfile = async () => {
      setLoading(true);

      // Try to get existing profile
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .maybeSingle();

      if (data) {
        setProfile(data);
      } else {
        // Profile doesn't exist yet — create one
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          const newProfile = {
            id: profileId,
            name: (sessionData.session.user.user_metadata as any)?.name
              || sessionData.session.user.email?.split("@")[0]
              || "User",
            email: sessionData.session.user.email || "",
            status: "offline" as const,
          };
          const { data: inserted } = await supabase
            .from("profiles")
            .insert(newProfile as any)
            .select()
            .single();

          if (inserted) {
            setProfile(inserted);
          } else {
            setProfile(null);
          }
        }
      }

      setLoading(false);
    };

    fetchProfile();
  }, [profileId, refreshCounter]);

  const updateProfile = async (updates: any) => {
    if (!profileId) return;
    await (supabase.from("profiles") as any).update(updates).eq("id", profileId);
    // Optimistic update
    setProfile((prev: any) => (prev ? { ...prev, ...updates } : prev));
  };

  const refresh = () => setRefreshCounter((c) => c + 1);

  return { profile, loading, updateProfile, refresh };
}
