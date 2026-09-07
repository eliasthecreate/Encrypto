import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth-context";
import { encryptMessage, decryptMessage } from "./crypto";
import { toast } from "sonner";
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

      // Send notification to post author
      const postRes = await (supabase.from("posts") as any).select("user_id").eq("id", postId).single();
      if (postRes.data && postRes.data.user_id !== uid) {
        const myProfileRes = await (supabase.from("profiles") as any).select("name").eq("id", uid).single();
        await (supabase.from("notifications") as any).insert({
          user_id: postRes.data.user_id,
          type: "like",
          title: "New Like",
          body: `${myProfileRes.data?.name ?? "Someone"} liked your post.`,
        });
      }
    }
    fetchPosts();
  };

  const addComment = async (postId: string, content: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) return;
    const uid = sessionData.session.user.id;
    await supabase.from("comments").insert({
      post_id: postId,
      user_id: uid,
      content,
    } as any);

    // Send notification to post author
    const postRes = await (supabase.from("posts") as any).select("user_id").eq("id", postId).single();
    if (postRes.data && postRes.data.user_id !== uid) {
      const myProfileRes = await (supabase.from("profiles") as any).select("name").eq("id", uid).single();
      await (supabase.from("notifications") as any).insert({
        user_id: postRes.data.user_id,
        type: "comment",
        title: "New Comment",
        body: `${myProfileRes.data?.name ?? "Someone"} commented on your post: "${content.slice(0, 50)}${content.length > 50 ? "..." : ""}"`,
      });
    }

    fetchPosts();
  };

  const createPost = async (
    content: string,
    type: "post" | "event" | "announcement" = "post",
    location?: string,
    imageUrl?: string
  ) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) return;
    const insertData: any = {
      user_id: sessionData.session.user.id,
      content,
      type,
    };
    if (location) insertData.event_location = location;
    if (imageUrl) insertData.image_url = imageUrl;
    await supabase.from("posts").insert(insertData);

    // Send notification to all friends about the new post
    if (sessionData.session.user.id) {
      // Get user's friends to notify them
      const { data: friends } = await supabase
        .from("friends")
        .select("*")
        .or(`user_id_1.eq.${sessionData.session.user.id},user_id_2.eq.${sessionData.session.user.id}`);

      const myProfileRes2 = await (supabase.from("profiles") as any).select("name").eq("id", sessionData.session.user.id).single();
      const myProfile = myProfileRes2.data;

      for (const f of (friends ?? [])) {
        const friendId = (f as any).user_id_1 === sessionData.session.user.id ? (f as any).user_id_2 : (f as any).user_id_1;
        await (supabase.from("notifications") as any).insert({
          user_id: friendId,
          type: "new_post",
          title: "New Post",
          body: `${myProfile?.name ?? "Someone"} just shared a new ${type}!`,
        });
      }
    }

    fetchPosts();
  };

  return { posts, loading, likePost, addComment, createPost, refresh: fetchPosts };
}

// ─── MESSAGES HOOKS ─────────────────────────────────────────────

export interface ConversationWithDetails {
  conversation: {
    id: string;
    created_at?: string;
    is_group?: boolean;
    group_name?: string | null;
    group_avatar_url?: string | null;
  };
  otherUser: { id: string; name: string; avatar_url: string | null; status: string };
  isGroup: boolean;
  members: { id: string; name: string; avatar_url: string | null }[];
  lastMessage: Message | null;
  unreadCount: number;
}

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const { user } = useAuth();
  const userId = user?.id;

  const fetchConvos = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
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

      // Exclude conversations this user has soft-deleted (delete chat — data stays in DB)
      const { data: hiddenConvs } = await supabase
        .from("conversations")
        .select("id")
        .contains("hidden_for", [userId]);
      const hiddenIds = new Set((hiddenConvs ?? []).map((c: any) => c.id));
      const visibleConvIds = convIds.filter((id) => !hiddenIds.has(id));

      const { data: allPartsRaw } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", visibleConvIds);
      const allParts: any[] = allPartsRaw ?? [];

      // Group metadata + member profiles (batched, avoids N+1)
      const { data: convMetaRaw } = await supabase
        .from("conversations")
        .select("id, is_group, group_name, group_avatar_url")
        .in("id", visibleConvIds);
      const convMeta: Record<string, any> = {};
      for (const c of (convMetaRaw ?? [])) convMeta[(c as any).id] = c;

      const memberIds = Array.from(new Set(allParts.map((p: any) => p.user_id)));
      const memberProfiles: Record<string, any> = {};
      if (memberIds.length > 0) {
        const { data: profilesRaw } = await supabase
          .from("profiles")
          .select("id, name, avatar_url, status")
          .in("id", memberIds);
        for (const p of (profilesRaw ?? [])) memberProfiles[(p as any).id] = p;
      }

      const result: ConversationWithDetails[] = [];

      for (const convId of visibleConvIds) {
        const meta: any = convMeta[convId] ?? {};
        const convParts = allParts.filter((p: any) => p.conversation_id === convId);
        const isGroup = !!meta.is_group;
        const members = convParts
          .map((p: any) => memberProfiles[p.user_id])
          .filter(Boolean)
          .map((p: any) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url }));

        const otherPart = convParts.find((p: any) => p.user_id !== userId);
        if (!isGroup && !otherPart) continue;
        const otherProfile = otherPart ? memberProfiles[otherPart.user_id] : null;

        const { data: msgs } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", convId)
          .not("deleted_for", "cs", `{${userId}}`)
          .order("created_at", { ascending: false })
          .limit(1);

        const msgList: any[] = msgs ?? [];

        const { count: unread } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", convId)
          .eq("read", false)
          .neq("sender_id", userId)
          .not("deleted_for", "cs", `{${userId}}`);

        result.push({
          conversation: {
            id: convId,
            is_group: isGroup,
            group_name: meta.group_name ?? null,
            group_avatar_url: meta.group_avatar_url ?? null,
          },
          otherUser: isGroup
            ? { id: convId, name: meta.group_name || "Group Chat", avatar_url: meta.group_avatar_url ?? null, status: "offline" }
            : (otherProfile ?? { id: "", name: "Unknown", avatar_url: null, status: "offline" }) as any,
          isGroup,
          members: isGroup ? members : [],
          lastMessage: msgList[0] ?? null,
          unreadCount: unread ?? 0,
        });
      }

      // Dedupe: one designated tab per friend. If duplicate conversations exist
      // (created before the dedupe fix), keep only the one with the most recent
      // message — and prefer one with unread messages on a tie.
      const byFriend = new Map<string, ConversationWithDetails>();
      for (const c of result) {
        const existing = byFriend.get(c.otherUser.id);
        if (!existing) {
          byFriend.set(c.otherUser.id, c);
          continue;
        }
        const aTime = existing.lastMessage?.created_at ?? "";
        const bTime = c.lastMessage?.created_at ?? "";
        if (bTime > aTime || (bTime === aTime && c.unreadCount > existing.unreadCount)) {
          byFriend.set(c.otherUser.id, c);
        }
      }

      // Sort by most recent activity — chats with the newest message at the top
      const sorted = Array.from(byFriend.values()).sort((a, b) => {
        const aTime = a.lastMessage?.created_at ?? a.conversation.created_at ?? "";
        const bTime = b.lastMessage?.created_at ?? b.conversation.created_at ?? "";
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(sorted);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchConvos();
  }, [fetchConvos, refreshCounter]);

  const refresh = useCallback(() => {
    setRefreshCounter((c) => c + 1);
  }, []);

  return { conversations, loading, refresh };
}

export function useMessages(conversationId: string | null, otherUserId?: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});
  const [pollVotes, setPollVotes] = useState<Record<string, { votes: Record<string, number>; myVote: string | null }>>({});
  const [loading, setLoading] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const { user } = useAuth();
  const decryptedRef = useRef<Record<string, string>>({});

  // Decrypt messages when they come in (cached — only new messages are decrypted)
  useEffect(() => {
    const run = async () => {
      if (!conversationId || !otherUserId) return;
      const map = { ...decryptedRef.current };
      let changed = false;
      for (const msg of messages) {
        if (map[msg.id]) continue;
        const senderId = msg.sender_id;
        const decryptedId = senderId === user?.id ? otherUserId : senderId;
        if (decryptedId) {
          map[msg.id] = await decryptMessage(conversationId, decryptedId, msg.content);
        } else {
          map[msg.id] = msg.content;
        }
        changed = true;
      }
      if (changed) {
        decryptedRef.current = map;
        setDecrypted(map);
      }
    };
    run();
  }, [messages, conversationId, otherUserId, user?.id]);

  // Fetch votes for poll messages (results + my vote)
  const fetchPollVotes = useCallback(async (msgs: Message[]) => {
    if (!user?.id) return;
    const pollIds = msgs.filter((m) => m.type === "poll").map((m) => m.id);
    if (!pollIds.length) {
      setPollVotes({});
      return;
    }
    const { data } = await (supabase.from("poll_votes") as any)
      .select("poll_message_id, user_id, option")
      .in("poll_message_id", pollIds);
    const rows: any[] = data ?? [];
    const agg: Record<string, { votes: Record<string, number>; myVote: string | null }> = {};
    for (const id of pollIds) agg[id] = { votes: {}, myVote: null };
    for (const r of rows) {
      const a = agg[r.poll_message_id];
      if (!a) continue;
      a.votes[r.option] = (a.votes[r.option] ?? 0) + 1;
      if (r.user_id === user.id) a.myVote = r.option;
    }
    setPollVotes(agg);
  }, [user?.id]);

  // Fetch messages silently (no loading state = no flicker); skips cleared messages
  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user?.id) return;
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .not("deleted_for", "cs", `{${user.id}}`)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("useMessages: fetch failed", error);
      return;
    }
    const msgs = (data ?? []) as Message[];
    setMessages(msgs);
    fetchPollVotes(msgs);
  }, [conversationId, user?.id, fetchPollVotes]);

  useEffect(() => {
    if (!conversationId) return;

    const load = async () => {
      setLoading(true);
      await fetchMessages();
      setLoading(false);
    };
    load();

    // Realtime subscription (works when the messages table is in the supabase_realtime publication)
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          // Delivery/read ticks changed — silently refresh so ticks update live
          fetchMessages();
        }
      )
      .subscribe();

    // Polling fallback every 3s — guarantees the receiver sees new messages even if
    // Realtime is not enabled on the messages table in Supabase.
    const interval = setInterval(fetchMessages, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [conversationId, refreshCounter, fetchMessages]);

  const sendMessage = async (
    content: string,
    type: "text" | "image" | "voice" | "file" | "poll" | "call" = "text",
    options?: {
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      metadata?: Record<string, any>;
    }
  ) => {
    try {
      if (!conversationId) return;
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) return;

      const insertData: any = {
        conversation_id: conversationId,
        sender_id: sessionData.session.user.id,
        content: content,
        type,
      };

      if (options?.fileUrl) insertData.file_url = options.fileUrl;
      if (options?.fileName) insertData.file_name = options.fileName;
      if (options?.fileSize) insertData.file_size = options.fileSize;
      if (options?.metadata) insertData.metadata = options.metadata;

      const { error } = await supabase.from("messages").insert(insertData);
      if (error) {
        console.error("sendMessage: insert failed", error);
        toast.error("Send failed: " + error.message);
        return;
      }

      // Silently re-fetch so the sender sees the message instantly
      await fetchMessages();
    } catch (err: any) {
      console.error("sendMessage: unexpected error", err);
      toast.error("Send error: " + (err?.message || "Unknown"));
    }
  };

  const refreshMessages = useCallback(() => {
    setRefreshCounter((c) => c + 1);
  }, []);

  const getDecryptedContent = (msgId: string): string => {
    return decrypted[msgId] ?? messages.find((m) => m.id === msgId)?.content ?? "";
  };

  // Cast a vote on a poll (upsert — changes an existing vote, creator can vote too)
  const voteOnPoll = async (pollMessageId: string, option: string) => {
    if (!user?.id) return;
    const { error } = await (supabase.from("poll_votes") as any).upsert(
      { poll_message_id: pollMessageId, user_id: user.id, option },
      { onConflict: "poll_message_id,user_id" }
    );
    if (error) {
      console.error("voteOnPoll failed:", error);
      toast.error("Vote failed: " + error.message);
      return;
    }
    await fetchMessages(); // refresh votes + messages
  };

  return {
    messages,
    decrypted,
    getDecryptedContent,
    loading,
    sendMessage,
    refreshMessages,
    pollVotes,
    voteOnPoll,
  };
}

// ─── DELIVERY STATUS ───────────────────────────────────────────
// Marks incoming messages as "delivered" while this user has the app open.
// (Sender sees 1 grey tick → 2 grey ticks the moment the recipient is online.)
export function useMarkIncomingDelivered() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const markDelivered = async () => {
      try {
        const { data: parts } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", user.id);
        const convIds: string[] = (parts ?? []).map((p: any) => p.conversation_id);
        if (!convIds.length) return;
        const { error } = await (supabase.from("messages") as any)
          .update({ delivered: true })
          .in("conversation_id", convIds)
          .neq("sender_id", user.id)
          .eq("delivered", false);
        if (error) console.error("markDelivered failed:", error.message);
      } catch (err) {
        console.error("markDelivered error:", err);
      }
    };

    markDelivered();
    const interval = setInterval(markDelivered, 10000);
    return () => clearInterval(interval);
  }, [user?.id]);
}

// ─── FRIENDS HOOKS ──────────────────────────────────────────────

// `channelTag` isolates the realtime channel per caller, so the Dashboard bell's
// subscription is never torn down when the Friends tab mounts/unmounts its own.
export function useFriendRequests(channelTag = "main") {
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
    let active = true;

    const fetchRequests = async () => {
      try {
        const { data } = await supabase
          .from("friend_requests")
          .select(`*, sender:profiles!sender_id(id, name, department, year, status)`)
          .eq("receiver_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false });
        if (!active) return;
        setRequests(data ?? []);
      } catch (err) {
        console.error("useFriendRequests fetch failed:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchRequests();

    // Live updates: refetch whenever a request arrives or is accepted/rejected
    const channel = supabase
      .channel(`friend-requests-${channelTag}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friend_requests",
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId, channelTag]);

  const acceptRequest = async (requestId: string) => {
    // Get the request details first
    const reqRes = await (supabase.from("friend_requests") as any).select("*").eq("id", requestId).single();
    if (!reqRes.data) return;
    const req = reqRes.data;

    // Update status to accepted (auto-creates friend record via DB trigger)
    await (supabase.from("friend_requests") as any).update({ status: "accepted" }).eq("id", requestId);

    // Auto-create a conversation between the two users
    if (userId && req.sender_id) {
      // Check if conversation already exists
      const { data: existingParts } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);

      const existingConvIds = existingParts?.map((p: any) => p.conversation_id) ?? [];

      if (existingConvIds.length > 0) {
        // Check if any existing conversation has the other user
        const { data: otherParts } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", req.sender_id)
          .in("conversation_id", existingConvIds);

        if (otherParts && otherParts.length > 0) {
          // Conversation already exists, skip creation
          setRequests((prev: any[]) => prev.filter((r: any) => r.id !== requestId));
          return;
        }
      }

      // Create new conversation — generate the ID client-side and insert WITHOUT .select(),
      // because RLS blocks selecting a conversation you're not a participant of yet.
      const convId = crypto.randomUUID();
      const { error: convError } = await (supabase
        .from("conversations") as any)
        .insert({ id: convId });
      if (convError) {
        console.error("acceptRequest: conversation create failed", convError);
        return;
      }

      const { error: partError } = await supabase.from("conversation_participants").insert([
        { conversation_id: convId, user_id: userId },
        { conversation_id: convId, user_id: req.sender_id },
      ] as any);
      if (partError) {
        console.error("acceptRequest: participants insert failed", partError);
      }
    }

    // Send notification to the sender
    const myProfileRes = await (supabase.from("profiles") as any).select("name").eq("id", userId).single();
    await (supabase.from("notifications") as any).insert({
      user_id: (req as any).sender_id,
      type: "friend_request",
      title: "Friend Request Accepted",
      body: `${myProfileRes.data?.name ?? "Someone"} accepted your friend request!`,
    });

    setRequests((prev: any[]) => prev.filter((r: any) => r.id !== requestId));
  };

  const rejectRequest = async (requestId: string) => {
    await (supabase.from("friend_requests") as any).update({ status: "rejected" }).eq("id", requestId);
    setRequests((prev: any[]) => prev.filter((r: any) => r.id !== requestId));
  };

  const sendRequest = async (receiverId: string) => {
    if (!userId) return;
    await supabase.from("friend_requests").insert({ sender_id: userId, receiver_id: receiverId } as any);

    // Send notification to receiver
    const myProfileRes = await (supabase.from("profiles") as any).select("name").eq("id", userId).single();
    await (supabase.from("notifications") as any).insert({
      user_id: receiverId,
      type: "friend_request",
      title: "New Friend Request",
      body: `${myProfileRes.data?.name ?? "Someone"} sent you a friend request.`,
    });
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
