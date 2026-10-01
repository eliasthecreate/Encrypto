import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Phone,
  Video,
  MoreHorizontal,
  Send,
  Mic,
  Paperclip,
  Smile,
  ChevronLeft,
  CheckCheck,
  Check,
  MessageCircle,
  Loader2,
  UserPlus,
  X,
  FileText,
  Image,
  Music,
  File,
  BarChart3,
  PhoneCall,
  PhoneOff,
  VideoOff,
  Trash2,
  Eraser,
  Edit3,
  StopCircle,
  Play,
  Pause,
  ThumbsUp,
  Users,
  User,
  Palette,
  BellOff,
  ChevronRight,
  MailOpen,
  ShieldCheck,
  Sparkles,
  Bot,
  Volume2,
  Copy,
  Wand2,
  Brain,
  Zap,
} from "lucide-react";
import { VerifiedBadge } from "./VerifiedBadge";
import { useConversations, useMessages, useFriends, type ConversationWithDetails } from "@/lib/supabase-hooks";
import { generateAIResponse, AI_SUGGESTION_CHIPS, type AIMessage } from "@/lib/ai-service";
import { UserProfileView } from "./UserProfileView";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { formatTimeAgo, cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { supabase, uploadFile } from "@/lib/supabase";
import { toast } from "sonner";

const CAMPUS_AI_ID = "campus_ai_assistant";

// ─── COMMON EMOJIS ──────────────────────────────────────────────
const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    emojis: ["😀","😃","😄","😁","😅","😂","🤣","🥲","☺️","😊","😇","🙂","😉","😌","😍","🥰","😘","😗","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","😮‍💨","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥴","😵","🤯","🥳","🥺","😢","😭","😤","😠","😡","🤬","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"],
  },
  {
    name: "Gestures",
    emojis: ["👍","👎","👌","✌️","🤞","🤟","🤘","🤙","👋","🤚","✋","👊","✊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","🦷","🦴","👀","👁️","👅","👄"],
  },
  {
    name: "Hearts",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💕","💞","💓","💗","💖","💘","💝","❣️","💟","🫶","💌"],
  },
  {
    name: "Objects",
    emojis: ["🎉","🎊","🎈","🎁","🏆","🏅","🥇","🥈","🥉","⚽","🏀","🏈","⚾","🎾","🏐","🏓","🏸","🥊","🥋","🎯","⛳","🎣","🎽","🛹","🛼","🎤","🎧","🎼","🎹","🥁","🎷","🎸","🎺","🎻","🎲","♟️","🎭","🎨","🪁","🪀"],
  },
  {
    name: "Symbols",
    emojis: ["✅","❌","❓","❔","❗","‼️","⁉️","💯","🔥","⭐","🌟","✨","💫","⚡","🌈","☀️","🌙","⭐","💧","🌊","🍀","🎵","🎶","💡","🔑","🔒","🔓","🔔","📌","📍","🖤","💔","♻️","✅","🆗","🆒","🆕","🆙","🆓","🈳"],
  },
];

// ─── EMOJI PICKER ───────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const [category, setCategory] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute bottom-16 left-0 z-50 w-72 sm:w-80 max-w-full bg-[#1e1e3a] rounded-2xl shadow-2xl border border-white/[0.08] overflow-hidden"
    >
      <div className="flex gap-1 p-2 border-b border-white/[0.08] overflow-x-auto">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={cat.name}
            onClick={() => setCategory(i)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              category === i
                ? "bg-purple-500/15 text-purple-300"
                : "text-slate-400 hover:bg-white/[0.07]"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-0.5 p-2 max-h-48 overflow-y-auto">
        {EMOJI_CATEGORIES[category].emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/[0.07] text-lg transition-all hover:scale-125"
          >
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── VOICE RECORDER ─────────────────────────────────────────────
function VoiceRecorder({ onSend, onCancel }: { onSend: (blob: Blob) => void; onCancel: () => void }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const audioRef = useRef<HTMLAudioElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new (MediaRecorder as any)(stream) as MediaRecorder;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setRecording(true);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      toast.error("Microphone access denied. Check browser permissions.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => { clearInterval(timerRef.current); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-16 left-0 right-0 z-50 mx-3 p-3 bg-[#1e1e3a] rounded-2xl shadow-2xl border border-white/[0.08]"
    >
      <div className="flex items-center gap-3">
        {!audioUrl ? (
          <>
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                recording
                  ? "bg-rose-500/120 hover:bg-red-600 animate-pulse"
                  : "bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-105"
              }`}
            >
              {recording ? <StopCircle className="h-6 w-6 text-white" /> : <Mic className="h-6 w-6 text-white" />}
            </button>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">
                {recording ? "Recording..." : "Tap to record"}
              </div>
              <div className={`text-xs font-mono ${recording ? "text-rose-400" : "text-gray-400"}`}>
                {formatDuration(duration)}
              </div>
            </div>
            <button onClick={onCancel} className="h-8 w-8 rounded-full hover:bg-white/[0.07] flex items-center justify-center">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={togglePlayback}
              className="h-10 w-10 rounded-full bg-purple-500/15 flex items-center justify-center hover:bg-purple-500/20"
            >
              {isPlaying ? <Pause className="h-5 w-5 text-purple-300" /> : <Play className="h-5 w-5 text-purple-300" />}
            </button>
            <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
            <div className="flex-1 text-sm text-slate-400">Preview</div>
            <Button size="sm" variant="gradient" onClick={() => audioBlob && onSend(audioBlob)} className="h-9">
              Send
            </Button>
            <button onClick={onCancel} className="h-8 w-8 rounded-full hover:bg-white/[0.07] flex items-center justify-center">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── ATTACHMENT PICKER ──────────────────────────────────────────
function AttachmentPicker({ onSend, onClose }: { onSend: (file: File) => void; onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFilePick = (accept: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target?.files?.[0];
      if (file) onSend(file);
    };
    input.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute bottom-16 left-0 z-50 p-2 bg-[#1e1e3a] rounded-2xl shadow-2xl border border-white/[0.08]"
    >
      <div className="grid grid-cols-4 gap-1">
        {[
          { icon: Image, label: "Photo", color: "text-blue-500 bg-sky-500/12 bg-sky-500/15", action: () => handleFilePick("image/*") },
          { icon: FileText, label: "Document", color: "text-orange-300 bg-orange-400/12 bg-orange-400/15", action: () => handleFilePick(".pdf,.doc,.docx,.txt") },
          { icon: File, label: "Spreadsheet", color: "text-green-500 bg-emerald-500/12 bg-emerald-500/15", action: () => handleFilePick(".xls,.xlsx,.csv") },
          { icon: Music, label: "Audio", color: "text-pink-500 bg-pink-50 bg-pink-500/15", action: () => handleFilePick("audio/*") },
        ].map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/[0.03] hover:bg-white/[0.07] transition-all"
          >
            <div className={`h-10 w-10 rounded-xl ${item.color} flex items-center justify-center`}>
              <item.icon className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-slate-400">{item.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── POLL CREATOR ───────────────────────────────────────────────
function PollCreator({ onSend, onClose }: { onSend: (question: string, options: string[]) => void; onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const addOption = () => setOptions([...options, ""]);
  const removeOption = (i: number) => options.length > 2 && setOptions(options.filter((_, idx) => idx !== i));
  const updateOption = (i: number, val: string) => {
    const copy = [...options];
    copy[i] = val;
    setOptions(copy);
  };

  const handleSend = () => {
    if (!question.trim()) { toast.error("Poll question is required"); return; }
    const validOpts = options.filter((o) => o.trim());
    if (validOpts.length < 2) { toast.error("Need at least 2 options"); return; }
    onSend(question, validOpts);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute bottom-16 left-0 right-0 z-50 mx-3 p-4 bg-[#1e1e3a] rounded-2xl shadow-2xl border border-white/[0.08]"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-purple-500" />
          <span className="font-medium text-sm text-white">Create Poll</span>
        </div>
        <button onClick={onClose} className="h-6 w-6 rounded-full hover:bg-white/[0.07] flex items-center justify-center">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <input
        type="text"
        placeholder="Ask a question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="w-full h-9 px-3 rounded-xl bg-white/[0.05] bg-[#26264a] border-0 text-sm text-white mb-2 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
      />
      <div className="space-y-1.5 mb-3">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              className="flex-1 h-8 px-3 rounded-lg bg-white/[0.03] bg-[#26264a]/50 border border-white/[0.1] border-white/[0.12] text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/20"
            />
            {options.length > 2 && (
              <button onClick={() => removeOption(i)} className="h-6 w-6 rounded-full hover:bg-rose-500/12 hover:bg-rose-500/15 flex items-center justify-center">
                <X className="h-3 w-3 text-red-400" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={addOption} className="text-xs text-purple-500 hover:text-purple-300 font-medium">
          + Add option
        </button>
        <div className="flex-1" />
        <Button size="sm" variant="gradient" onClick={handleSend} disabled={!question.trim()} className="h-8 text-xs">
          Send Poll
        </Button>
      </div>
    </motion.div>
  );
}

// ─── POLL DISPLAY ───────────────────────────────────────────────
function PollDisplay({ pollMessageId, question, options, votes, myVote, onVote }: {
  pollMessageId?: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  myVote?: string;
  onVote?: (pollMessageId: string, option: string) => void;
}) {
  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
  const voted = !!myVote;

  return (
    <div className="mt-2 p-3 rounded-xl bg-white/[0.03] bg-[#26264a]/50 border border-white/[0.1] border-white/[0.12]">
      <p className="text-xs font-semibold mb-2 text-white">{question}</p>
      <div className="space-y-1.5">
        {options.map((opt) => {
          const count = votes[opt] || 0;
          const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
          const isMyVote = myVote === opt;
          return (
            <div
              key={opt}
              onClick={() => { if (pollMessageId && onVote) onVote(pollMessageId, opt); }}
              className={`relative h-8 rounded-lg overflow-hidden cursor-pointer transition-all active:scale-[0.98] ${
                isMyVote ? "ring-2 ring-purple-500" : "hover:ring-1 hover:ring-white/25"
              }`}
            >
              <div
                className="absolute inset-0 bg-purple-500/15 bg-purple-500/15 transition-all"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between h-full px-3">
                <span className="text-xs font-medium text-white truncate">{opt}</span>
                <span className="text-[10px] text-slate-400 ml-2">{count} vote{count !== 1 ? "s" : ""}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 mt-1.5">
        {totalVotes} vote{totalVotes !== 1 ? "s" : ""}{voted ? " · Tap an option to change your vote" : " · Tap an option to vote"}
      </p>
    </div>
  );
}

// ─── CALL DIALOG ────────────────────────────────────────────────
function CallDialog({ type, otherUser, onEnd }: { type: "voice" | "video"; otherUser: { name: string; avatar_url: string | null }; onEnd: () => void }) {
  const [duration, setDuration] = useState(0);
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setConnecting(false), 2000);
    const interval = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, []);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center rounded-2xl"
    >
      {otherUser.avatar_url ? (
        <img src={otherUser.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover border-4 border-white/20 mb-4" />
      ) : (
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-white/20 mb-4">
          {otherUser.name[0]}
        </div>
      )}
      <h3 className="text-white text-lg font-semibold">{otherUser.name}</h3>
      <p className="text-white/60 text-sm mt-1">
        {connecting ? "Connecting..." : fmt(duration)}
      </p>
      <div className="flex items-center gap-6 mt-8">
        <button
          onClick={onEnd}
          className="h-14 w-14 rounded-full bg-rose-500/120 hover:bg-red-600 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg"
        >
          {type === "video" ? <VideoOff className="h-6 w-6 text-white" /> : <PhoneOff className="h-6 w-6 text-white" />}
        </button>
        {!connecting && (
          <button
            onClick={() => toast.info("Microphone " + (Math.random() > 0.5 ? "muted" : "unmuted"))}
            className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
          >
            <Mic className="h-5 w-5 text-white" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── CHAT THEMES ────────────────────────────────────────────────
const CHAT_THEMES: Record<string, { label: string; from: string; to: string; soft: string }> = {
  default: { label: "Default", from: "#8b5cf6", to: "#ec4899", soft: "rgba(139,92,246,0.10)" },
  ocean: { label: "Ocean", from: "#3b82f6", to: "#06b6d4", soft: "rgba(59,130,246,0.10)" },
  forest: { label: "Forest", from: "#10b981", to: "#84cc16", soft: "rgba(16,185,129,0.10)" },
  rose: { label: "Rose", from: "#f43f5e", to: "#fb923c", soft: "rgba(244,63,94,0.10)" },
  sunset: { label: "Sunset", from: "#f59e0b", to: "#ef4444", soft: "rgba(245,158,11,0.10)" },
  night: { label: "Night", from: "#64748b", to: "#334155", soft: "rgba(100,116,139,0.12)" },
};

// ─── PROFILE / GROUP INFO SHEET ─────────────────────────────────
function ProfileSheet({ isGroup, conv, onClose }: { isGroup: boolean; conv: any; onClose: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!isGroup && conv?.otherUser?.id) {
        const { data } = await (supabase.from("profiles") as any).select("*").eq("id", conv.otherUser.id).single();
        if (active) setProfile(data || null);
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [isGroup, conv]);

  const members = (conv?.members ?? []) as any[];

  // 1:1 chats open the full profile page (name, program, year of study, skills, posts)
  if (!isGroup && conv?.otherUser?.id) {
    return <UserProfileView userId={conv.otherUser.id} onBack={onClose} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm max-h-[80dvh] overflow-y-auto bg-[#13132a] rounded-t-3xl sm:rounded-3xl p-6 border border-white/[0.07] shadow-2xl"
      >
        <div className="flex flex-col items-center text-center mb-5">
          {isGroup ? (
            <>
              <Avatar name={conv?.otherUser?.name || "Group"} size="xl" className="from-pink-500 to-orange-400" />
              <h3 className="mt-3 font-semibold text-lg text-white">{conv?.otherUser?.name || "Group"}</h3>
              <p className="text-xs text-muted-foreground mt-1">{members.length} members</p>
            </>
          ) : (
            <>
              <Avatar name={profile?.name || conv?.otherUser?.name || "?"} size="xl" status={profile?.status || conv?.otherUser?.status} showStatus />
              <h3 className="mt-3 font-semibold text-lg text-white">{profile?.name || conv?.otherUser?.name || "Loading..."}</h3>
              <p className="text-xs text-muted-foreground mt-1 capitalize">{profile?.status || conv?.otherUser?.status || "offline"}</p>
            </>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-purple-500" /></div>
        ) : isGroup ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Participants</p>
            {members.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.03]">
                <Avatar name={m.name || "?"} size="sm" />
                <span className="text-sm text-white truncate">{m.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            {(profile?.department || profile?.year) && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                <User className="h-4 w-4 text-purple-500" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Department · Year</p>
                  <p className="text-white">{profile.department}{profile.year ? ` · ${profile.year}` : ""}</p>
                </div>
              </div>
            )}
            {profile?.bio ? (
              <div className="p-3 rounded-xl bg-white/[0.03]">
                <p className="text-xs text-muted-foreground mb-1">About</p>
                <p className="text-white whitespace-pre-wrap">{profile.bio}</p>
              </div>
            ) : null}
            {profile?.created_at && (
              <p className="text-center text-xs text-muted-foreground">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
            )}
          </div>
        )}

        <button onClick={onClose} className="mt-6 w-full h-10 rounded-xl bg-white/[0.05] text-sm font-medium text-white hover:bg-white/[0.1] hover:bg-white/[0.07] transition-colors">
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── CHAT SETTINGS MENU ─────────────────────────────────────────
function ChatSettings({
  nickname,
  showNickname = true,
  isGroup = false,
  chatTheme,
  muteUntil,
  onSetNickname,
  onClearChat,
  onDeleteChat,
  onViewProfile,
  onSetTheme,
  onSearch,
  onMute,
  onMarkRead,
  onMarkUnread,
  onClose,
}: {
  nickname: string;
  showNickname?: boolean;
  isGroup?: boolean;
  chatTheme: string;
  muteUntil: string | null;
  onSetNickname: (n: string) => void;
  onClearChat: () => void;
  onDeleteChat: () => void;
  onViewProfile: () => void;
  onSetTheme: (id: string) => void;
  onSearch: () => void;
  onMute: (until: string | null) => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onClose: () => void;
}) {
  const [editNick, setEditNick] = useState(nickname);
  const [showNickInput, setShowNickInput] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showMuteMenu, setShowMuteMenu] = useState(false);

  const isMuted = !!muteUntil && (muteUntil === "forever" || new Date(muteUntil).getTime() > Date.now());
  const themeLabel = CHAT_THEMES[chatTheme]?.label || "Default";

  const row = "w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] hover:bg-white/[0.07] transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute top-14 right-2 z-50 w-64 max-h-[80dvh] overflow-y-auto bg-[#1e1e3a] rounded-2xl shadow-2xl border border-white/[0.08]"
    >
      <div className="p-1">
        {showNickname && (
          <button onClick={() => { setShowNickInput(!showNickInput); setShowThemeMenu(false); setShowMuteMenu(false); }} className={row}>
            <Edit3 className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-white">{showNickInput ? "Cancel" : "Set Nickname"}</span>
          </button>
        )}
        {showNickname && showNickInput && (
          <div className="px-2 pb-2">
            <div className="flex gap-1">
              <input
                type="text"
                value={editNick}
                onChange={(e) => setEditNick(e.target.value)}
                placeholder="Nickname..."
                className="flex-1 h-8 px-2 rounded-lg bg-white/[0.05] bg-[#26264a] text-xs border-0 focus:outline-none focus:ring-1 focus:ring-purple-500/20 text-white"
                autoFocus
              />
              <Button size="sm" variant="gradient" onClick={() => { onSetNickname(editNick); setShowNickInput(false); }} className="h-8 text-xs px-2">
                Save
              </Button>
            </div>
          </div>
        )}

        {/* View Profile / Group Info */}
        <button onClick={() => { onViewProfile(); onClose(); }} className={row}>
          {isGroup
            ? <Users className="h-4 w-4 text-pink-500" />
            : <User className="h-4 w-4 text-purple-500" />}
          <span className="text-sm text-white">{isGroup ? "Group Info" : "View Profile"}</span>
        </button>

        {/* Search */}
        <button onClick={() => { onSearch(); onClose(); }} className={row}>
          <Search className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-white">Search in Chat</span>
        </button>

        {/* Theme */}
        <div className="relative">
          <button onClick={() => { setShowThemeMenu(!showThemeMenu); setShowMuteMenu(false); setShowNickInput(false); }} className={row}>
            <Palette className="h-4 w-4 text-fuchsia-500" />
            <span className="flex-1 text-left text-sm text-white">Theme</span>
            <span className="text-[10px] text-gray-400">{themeLabel}</span>
            <ChevronRight className={`h-3.5 w-3.5 text-gray-400 transition-transform ${showThemeMenu ? "rotate-90" : ""}`} />
          </button>
          {showThemeMenu && (
            <div className="px-2 pb-2 space-y-0.5">
              {Object.entries(CHAT_THEMES).map(([id, t]) => (
                <button key={id} onClick={() => { onSetTheme(id); setShowThemeMenu(false); }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.03] hover:bg-white/[0.07] transition-colors">
                  <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ background: `linear-gradient(90deg, ${t.from}, ${t.to})` }} />
                  <span className="text-xs text-white">{t.label}</span>
                  {chatTheme === id && <Check className="h-3 w-3 text-purple-500 ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mute Notifications */}
        <div className="relative">
          <button onClick={() => { setShowMuteMenu(!showMuteMenu); setShowThemeMenu(false); setShowNickInput(false); }} className={row}>
            <BellOff className="h-4 w-4 text-slate-400" />
            <span className="flex-1 text-left text-sm text-white">Mute Notifications</span>
            {isMuted && <span className="text-[10px] text-purple-500 font-semibold">Muted</span>}
            <ChevronRight className={`h-3.5 w-3.5 text-gray-400 transition-transform ${showMuteMenu ? "rotate-90" : ""}`} />
          </button>
          {showMuteMenu && (
            <div className="px-2 pb-2 space-y-0.5">
              <button onClick={() => { onMute(new Date(Date.now() + 8 * 3600 * 1000).toISOString()); setShowMuteMenu(false); }}
                className="w-full text-left text-xs p-2 rounded-lg hover:bg-white/[0.03] hover:bg-white/[0.07] text-white">Mute for 8 hours</button>
              <button onClick={() => { onMute(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()); setShowMuteMenu(false); }}
                className="w-full text-left text-xs p-2 rounded-lg hover:bg-white/[0.03] hover:bg-white/[0.07] text-white">Mute for 1 week</button>
              <button onClick={() => { onMute("forever"); setShowMuteMenu(false); }}
                className="w-full text-left text-xs p-2 rounded-lg hover:bg-white/[0.03] hover:bg-white/[0.07] text-white">Mute forever</button>
              {isMuted && (
                <button onClick={() => { onMute(null); setShowMuteMenu(false); }}
                  className="w-full text-left text-xs p-2 rounded-lg hover:bg-white/[0.03] hover:bg-white/[0.07] text-purple-300">Unmute</button>
              )}
            </div>
          )}
        </div>

        {/* Empty Chat */}
        <button onClick={() => { onClearChat(); onClose(); }} className={row}>
          <Eraser className="h-4 w-4 text-orange-300" />
          <span className="text-sm text-white">Empty Chat</span>
        </button>

        {/* Mark as Read / Unread */}
        <button onClick={() => { onMarkRead(); onClose(); }} className={row}>
          <CheckCheck className="h-4 w-4 text-emerald-500" />
          <span className="text-sm text-white">Mark as Read</span>
        </button>
        <button onClick={() => { onMarkUnread(); onClose(); }} className={row}>
          <MailOpen className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-white">Mark as Unread</span>
        </button>

        {/* Clear Chat */}
        <button onClick={() => { onClearChat(); onClose(); }} className={row}>
          <Eraser className="h-4 w-4 text-orange-300" />
          <span className="text-sm text-white">Clear Chat</span>
        </button>

        {/* Delete Chat */}
        <button onClick={() => { onDeleteChat(); onClose(); }} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-500/12 hover:bg-rose-500/15 transition-colors">
          <Trash2 className="h-4 w-4 text-rose-400" />
          <span className="text-sm text-rose-400">Delete Chat</span>
        </button>
      </div>
    </motion.div>
  );
}

// ─── MESSAGE BUBBLE ─────────────────────────────────────────────
// Deterministic per-member color for group chat sender names (like WhatsApp)
const MEMBER_COLORS = ["#8b5cf6", "#ec4899", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#84cc16", "#f97316", "#14b8a6"];
const memberColor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return MEMBER_COLORS[h % MEMBER_COLORS.length];
};

function MessageBubble({
  messageId,
  content,
  senderName,
  senderColor,
  pollVotes,
  onVote,
  time,
  isOwn,
  read,
  delivered,
  type,
  fileUrl,
  fileName,
  metadata,
  accent,
}: {
  messageId?: string;
  content: string;
  senderName?: string;
  senderColor?: string;
  pollVotes?: { votes: Record<string, number>; myVote: string | null } | null;
  onVote?: (pollMessageId: string, option: string) => void;
  time: string;
  isOwn: boolean;
  read: boolean;
  delivered: boolean;
  type: string;
  fileUrl?: string | null;
  fileName?: string | null;
  metadata?: any;
  accent?: { from: string; to: string } | null;
}) {
  const renderContent = () => {
    if (type === "image" && fileUrl) {
      return (
        <img src={fileUrl} alt="Image" className="max-w-full rounded-lg mt-1 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.open(fileUrl, "_blank")}
        />
      );
    }
    if (type === "file" && fileUrl) {
      const icon = fileName?.endsWith(".pdf") ? "📄" : fileName?.match(/\.(doc|xls)/) ? "📊" : "📎";
      return (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 mt-1 p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
        >
          <span className="text-lg">{icon}</span>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate text-white">{fileName || "File"}</p>
            <p className="text-[10px] text-gray-400">Tap to open</p>
          </div>
        </a>
      );
    }
    if (type === "poll" && metadata) {
      return (
        <PollDisplay
          pollMessageId={messageId}
          question={metadata.question || content}
          options={metadata.options || []}
          votes={pollVotes?.votes ?? {}}
          myVote={pollVotes?.myVote ?? undefined}
          onVote={onVote}
        />
      );
    }
    if (type === "call") {
      return (
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
          <PhoneCall className="h-3.5 w-3.5" />
          {content || "Call ended"}
        </div>
      );
    }
    return <p>{content}</p>;
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={cn(
          "max-w-[78%] sm:max-w-[75%] min-w-0 px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm break-words [overflow-wrap:anywhere]",
          isOwn
            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-lg"
            : "bg-[#1e1e3a] text-slate-100 rounded-bl-lg border border-white/[0.08]"
        )}
        style={isOwn && accent ? { backgroundImage: `linear-gradient(90deg, ${accent.from}, ${accent.to})` } : undefined}
      >
        {!isOwn && senderName && (
          <p className="text-[11px] font-semibold mb-1 truncate" style={{ color: senderColor }}>
            {senderName}
          </p>
        )}
        {renderContent()}
        <div className={cn("flex items-center gap-1 mt-1", isOwn ? "justify-end" : "justify-start")}>
          <span className={`text-[10px] ${isOwn ? "text-white/70" : "text-slate-500"}`}>
            {new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {isOwn && (
            read ? <CheckCheck className="h-3 w-3 text-blue-300" />
            : delivered ? <CheckCheck className="h-3 w-3 text-white/60" />
            : <Check className="h-3 w-3 text-white/60" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN MESSAGES COMPONENT ────────────────────────────────────
export interface ChatTarget {
  id: string;
  name: string;
  avatar_url?: string | null;
  status?: string | null;
}

export function Messages({
  onChatOpen,
  openChatWith,
  onOpenChatConsumed,
  onViewProfile,
}: {
  onChatOpen?: (open: boolean) => void;
  openChatWith?: ChatTarget | null;
  onOpenChatConsumed?: () => void;
  onViewProfile?: (user: ChatTarget) => void;
} = {}) {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [fallbackConv, setFallbackConv] = useState<any>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState<"voice" | "video" | null>(null);
  const [showChatSettings, setShowChatSettings] = useState(false);

  // Close any open compose panels (poll/emoji/attach/voice) — used when switching chats
  const closeComposePanels = () => {
    setShowPoll(false);
    setShowEmoji(false);
    setShowAttach(false);
    setShowVoice(false);
  };

  // Close any open compose panel / search whenever the active chat changes
  useEffect(() => {
    closeComposePanels();
    setShowChatSearch(false);
    setChatSearchQuery("");
  }, [selectedChat]);
  const [nicknames, setNicknames] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("chat-nicknames") || "{}"); } catch { return {}; }
  });
  const [chatThemes, setChatThemes] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("chat-themes") || "{}"); } catch { return {}; }
  });
  const [chatMutes, setChatMutes] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("chat-mutes") || "{}"); } catch { return {}; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [searchTab, setSearchTab] = useState<"all" | "media" | "links">("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isMuted = (convId: string) => {
    const v = chatMutes[convId];
    if (!v) return false;
    if (v === "forever") return true;
    return new Date(v).getTime() > Date.now();
  };
  const chatSettingsRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // ─── CAMPUS AI STATE & HELPERS ───
  const [aiHistory, setAiHistory] = useState<AIMessage[]>(() => {
    try {
      const saved = localStorage.getItem(`campus_ai_history_${user?.id || "guest"}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "ai_welcome",
        sender: "ai",
        text: "👋 **Hello! I'm Campus AI.**\n\nI'm your intelligent university assistant on **CampusConnectICU**! 🎓\n\nAsk me anything about study strategies, exam preparation, notes summarization, code debugging, or campus guidance. How can I help you today? ✨",
        timestamp: new Date().toISOString(),
      },
    ];
  });
  const [isAITyping, setIsAITyping] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(`campus_ai_history_${user?.id || "guest"}`, JSON.stringify(aiHistory));
    } catch {}
  }, [aiHistory, user?.id]);

  const handleAISend = async (promptText?: string) => {
    const query = (promptText || messageInput).trim();
    if (!query) return;

    const userMsg: AIMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: query,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...aiHistory, userMsg];
    setAiHistory(newHistory);
    if (!promptText) setMessageInput("");
    setIsAITyping(true);

    try {
      const responseText = await generateAIResponse(query, newHistory);
      const aiMsg: AIMessage = {
        id: crypto.randomUUID(),
        sender: "ai",
        text: responseText,
        timestamp: new Date().toISOString(),
      };
      setAiHistory((prev) => [...prev, aiMsg]);
    } catch (err) {
      toast.error("Campus AI is currently busy. Please try again.");
    } finally {
      setIsAITyping(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleSpeakAI = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*_#`]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
      toast.info("Reading Campus AI response out loud...");
    } else {
      toast.error("Text-to-speech not supported on your browser.");
    }
  };

  const { conversations, loading: convsLoading, refresh: refreshConversations } = useConversations();
  const { friends, loading: friendsLoading } = useFriends();

  const selectedConv = conversations.find((c) => c.conversation.id === selectedChat) || fallbackConv;

  // Notify Dashboard when a chat is open so it can hide the global header/nav
  useEffect(() => {
    onChatOpen?.(!!selectedConv || selectedChat === CAMPUS_AI_ID);
  }, [selectedConv, selectedChat, onChatOpen]);

  // Reset on unmount (switching tabs while inside a chat)
  useEffect(() => {
    return () => onChatOpen?.(false);
  }, [onChatOpen]);
  const otherUserId = !selectedConv?.isGroup
    ? (selectedConv?.otherUser?.id ?? (selectedChat && !selectedConv ? fallbackConv?.otherUser?.id : null))
    : null;
  const nickname = otherUserId ? nicknames[otherUserId] || selectedConv?.otherUser?.name || "" : "";

  const { messages, getDecryptedContent, loading: msgsLoading, sendMessage, refreshMessages, pollVotes, voteOnPoll } = useMessages(selectedChat, otherUserId);

  const currentThemeId = selectedChat ? chatThemes[selectedChat] || "default" : "default";
  const currentTheme = CHAT_THEMES[currentThemeId] || CHAT_THEMES.default;
  const currentMute = selectedChat ? chatMutes[selectedChat] || null : null;

  // In-chat search filter (All / Media / Links)
  const filteredMessages = useMemo(() => {
    if (!showChatSearch) return messages;
    const q = chatSearchQuery.trim().toLowerCase();
    return messages.filter((msg) => {
      if (searchTab === "media") return ["image", "file", "voice"].includes(msg.type);
      if (searchTab === "links") return /https?:\/\/\S+/i.test(msg.content || "");
      return q === "" || (msg.content || "").toLowerCase().includes(q);
    });
  }, [messages, showChatSearch, chatSearchQuery, searchTab]);

  // Mark incoming messages as read (and delivered) the moment this chat is opened
  useEffect(() => {
    if (!selectedChat || !user?.id) return;
    const markRead = async () => {
      const { error } = await (supabase.from("messages") as any)
        .update({ read: true, delivered: true })
        .eq("conversation_id", selectedChat)
        .neq("sender_id", user.id)
        .eq("read", false);
      if (!error) refreshConversations();
    };
    markRead();
  }, [selectedChat, user?.id, refreshConversations]);

  // Smart preview for the conversation list (type-aware + "You:" prefix)
  const previewFor = (conv: ConversationWithDetails): string => {
    const lm = conv.lastMessage;
    if (!lm) return "Start a conversation";
    const prefix = lm.sender_id === user?.id ? "You: " : "";
    switch (lm.type) {
      case "image": return prefix + "📷 Photo";
      case "voice": return prefix + "🎤 Voice message";
      case "file": return prefix + "📎 " + (lm.file_name || "File");
      case "poll": return prefix + "📊 Poll";
      case "call": return prefix + "📞 " + lm.content;
      default: return prefix + lm.content;
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFriends = friends.filter((f) =>
    f.name?.toLowerCase().includes(friendSearch.toLowerCase())
  );

  const toggleGroupMember = (id: string) => {
    setGroupMembers((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const handleCreateGroup = async () => {
    const name = groupName.trim();
    if (!name) { toast.error("Give the group a name"); return; }
    if (groupMembers.length < 1) { toast.error("Select at least one member"); return; }
    if (!user?.id) { toast.error("Not authenticated"); return; }
    if (creatingGroup) return;
    setCreatingGroup(true);

    try {
      const convId = crypto.randomUUID();
      const { error: convError } = await (supabase.from("conversations") as any).insert({
        id: convId,
        is_group: true,
        group_name: name,
        created_by: user.id,
      });
      if (convError) throw new Error("Group create: " + convError.message);

      const participantRows = [
        { conversation_id: convId, user_id: user.id },
        ...groupMembers.map((m) => ({ conversation_id: convId, user_id: m })),
      ];
      const { error: partError } = await (supabase.from("conversation_participants") as any).insert(participantRows);
      if (partError) throw new Error("Participants: " + partError.message);

      const memberProfiles = friends
        .filter((f) => groupMembers.includes(f.id))
        .map((f: any) => ({ id: f.id, name: f.name, avatar_url: f.avatar_url }));

      // Open the group instantly via fallback, then refresh the list
      setFallbackConv({
        conversation: { id: convId, is_group: true, group_name: name, group_avatar_url: null },
        otherUser: { id: convId, name, avatar_url: null, status: "offline" },
        isGroup: true,
        members: memberProfiles,
        lastMessage: null,
        unreadCount: 0,
      });
      setSelectedChat(convId);
      setShowNewGroup(false);
      setGroupName("");
      setGroupMembers([]);
      refreshConversations();
      toast.success(`Group "${name}" created!`);
    } catch (err: any) {
      console.error("createGroup failed:", err);
      toast.error("Could not create group: " + (err?.message || "Unknown error"));
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleStartNewChat = async (friendId: string, profileOverride?: ChatTarget) => {
    // Check if conversation already exists
    const existing = conversations.find((c) => c.otherUser.id === friendId);
    if (existing) {
      setSelectedChat(existing.conversation.id);
      setFallbackConv(null);
      setShowNewChat(false);
      return;
    }

    // Find friend profile for fallback rendering
    const friendProfile = friends.find((f) => f.id === friendId) ?? profileOverride;
    if (!friendProfile) {
      toast.error("Could not find friend profile");
      return;
    }
    
    // Immediate feedback
    toast.info("Opening chat with " + friendProfile.name + "...");
    
    try {
      if (!user?.id) throw new Error("User not authenticated");

      // 1. Check the database for an existing conversation with this friend.
      //    The other person may have started one already — we MUST reuse it,
      //    otherwise each side gets a different chat and messages never cross.
      const { data: myParts } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);
      const myConvIds: string[] = (myParts ?? []).map((p: any) => p.conversation_id);
      if (myConvIds.length > 0) {
        const { data: sharedParts } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", friendId)
          .in("conversation_id", myConvIds);
        if (sharedParts && sharedParts.length > 0) {
          // Only reuse 1:1 conversations — never route a direct chat into a group
          const { data: sharedMeta } = await (supabase.from("conversations") as any)
            .select("id, is_group")
            .in("id", (sharedParts as any[]).map((p: any) => p.conversation_id));
          const sharedOneToOne = ((sharedMeta ?? []) as any[]).find((c: any) => !c.is_group) as any;
          if (sharedOneToOne) {
            // If we had deleted this chat earlier, un-hide it so it shows up again
            await (supabase.rpc as any)("restore_chat_for_me", { conv_id: sharedOneToOne.id });
            // Set fallback so the chat renders instantly, then refresh the list
            setFallbackConv({
              conversation: { id: sharedOneToOne.id },
              otherUser: {
                id: friendId,
                name: friendProfile.name,
                avatar_url: friendProfile.avatar_url,
                status: friendProfile.status || "offline",
              },
              lastMessage: null,
              unreadCount: 0,
            });
            setSelectedChat(sharedOneToOne.id);
            setShowNewChat(false);
            refreshConversations();
            return;
          }
        }
      }

      // 2. Generate conversation ID client-side (avoids SELECT policy issue)
      const convId = crypto.randomUUID();
      
      // 3. Create conversation with known ID (no .select() needed)
      const { error: convError } = await (supabase.from("conversations") as any).insert({ id: convId });
      if (convError) throw new Error("Conversation create: " + convError.message);
      
      // 3. Add both participants
      const { error: partError } = await (supabase.from("conversation_participants") as any).insert([
        { conversation_id: convId, user_id: user.id },
        { conversation_id: convId, user_id: friendId },
      ]);
      if (partError) throw new Error("Participants: " + partError.message);
      
      // 4. Set fallback so chat renders instantly
      setFallbackConv({
        conversation: { id: convId, created_at: new Date().toISOString() },
        otherUser: {
          id: friendId,
          name: friendProfile.name,
          avatar_url: friendProfile.avatar_url,
          status: friendProfile.status || "offline",
        },
        lastMessage: null,
        unreadCount: 0,
      });
      
      // 5. Switch to chat view
      setSelectedChat(convId);
      
      // 6. Close the new-chat panel
      setShowNewChat(false);
      
      // 7. Refresh conversations list in the background
      refreshConversations();
      
      toast.success("Chat started!");
    } catch (err: any) {
      console.error("❌ handleStartNewChat failed:", err);
      toast.error("Could not start chat: " + (err?.message || "Unknown error"));
      // DON'T close the new-chat panel on error so user can try again
    }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Deep link from another tab (e.g. "Message" on the Explore page): open that
  // user's inbox directly, reusing or creating the conversation as needed.
  // Guarded by a ref so a double-invoked effect (StrictMode, fast taps) cannot
  // create two conversations with the same person.
  const openingChatFor = useRef<string | null>(null);
  useEffect(() => {
    if (!openChatWith?.id) {
      openingChatFor.current = null;
      return;
    }
    if (friendsLoading || convsLoading) return;
    if (openingChatFor.current === openChatWith.id) return;
    openingChatFor.current = openChatWith.id;
    handleStartNewChat(openChatWith.id, openChatWith);
    onOpenChatConsumed?.();
  }, [openChatWith, friendsLoading, convsLoading]);

  // Close the chat settings (⋯) menu when clicking outside of it
  useEffect(() => {
    if (!showChatSettings) return;
    const onDocClick = (e: MouseEvent) => {
      if (chatSettingsRef.current && !chatSettingsRef.current.contains(e.target as Node)) {
        setShowChatSettings(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showChatSettings]);

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedChat) return;
    const msg = messageInput;
    setMessageInput(""); // Clear input immediately
    // Use hook's sendMessage which does optimistic update (no refresh flicker)
    await sendMessage(msg);

    // Check for inline @ai tag in standard conversations
    if (msg.toLowerCase().includes("@ai") || msg.toLowerCase().includes("@campusai")) {
      const prompt = msg.replace(/@campusai|@ai/gi, "").trim();
      if (prompt) {
        toast.info("Campus AI is thinking...");
        generateAIResponse(prompt).then(async (aiReply) => {
          await sendMessage(`🤖 **Campus AI:**\n\n${aiReply}`);
        });
      }
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput((prev) => prev + emoji);
    setShowEmoji(false);
  };

  const handleFileSend = async (file: File) => {
    setShowAttach(false);
    const url = await uploadFile("chat-files", `${Date.now()}-${file.name}`, file);
    if (url) {
      await sendMessage(`📎 ${file.name}`, "file", { fileUrl: url, fileName: file.name, fileSize: file.size });
      toast.success("File sent!");
    } else {
      toast.error("Upload failed. Make sure 'chat-files' bucket exists in Supabase.");
    }
  };

  const handleVoiceSend = async (blob: Blob) => {
    setShowVoice(false);
    const file = new (File as any)([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" }) as File;
    const url = await uploadFile("chat-files", `${Date.now()}-voice.webm`, file);
    if (url) {
      await sendMessage("🎤 Voice message", "voice", { fileUrl: url });
    }
  };

  const handlePollSend = async (question: string, options: string[]) => {
    setShowPoll(false);
    const votes: Record<string, number> = {};
    options.forEach((o) => { votes[o] = 0; });
    const metadata = { question, options, votes, type: "poll" };
    await sendMessage(question, "poll", { metadata });
  };

  const handleVote = async (pollMessageId: string, option: string) => {
    if (!user?.id) { toast.error("Sign in to vote"); return; }
    await voteOnPoll(pollMessageId, option);
  };

  const handleCall = (type: "voice" | "video") => {
    setShowCallDialog(type);
  };

  const handleSetNickname = (name: string) => {
    if (!otherUserId) return;
    const updated = { ...nicknames, [otherUserId]: name };
    setNicknames(updated);
    localStorage.setItem("chat-nicknames", JSON.stringify(updated));
    setShowChatSettings(false);
    toast.success("Nickname saved!");
  };

  const handleClearChat = async () => {
    if (!selectedChat) return;
    // Soft delete: hides the messages for ME only — data stays in the DB
    const { error } = await (supabase.rpc as any)("clear_chat_for_me", { conv_id: selectedChat });
    if (error) {
      console.error("Clear chat failed:", error);
      toast.error("Could not clear chat: " + error.message);
      return;
    }
    refreshMessages();
    toast.success("Chat cleared!");
  };

  const handleDeleteChat = async () => {
    if (!selectedChat) return;
    // Soft delete: hides the conversation for ME only — data stays in the DB
    const { error } = await (supabase.rpc as any)("delete_chat_for_me", { conv_id: selectedChat });
    if (error) {
      console.error("Delete chat failed:", error);
      toast.error("Could not delete chat: " + error.message);
      return;
    }
    setSelectedChat(null);
    setFallbackConv(null);
    closeComposePanels();
    refreshConversations();
    toast.success("Chat deleted!");
  };

  const handleSetTheme = (id: string) => {
    if (!selectedChat) return;
    const updated = { ...chatThemes, [selectedChat]: id };
    setChatThemes(updated);
    localStorage.setItem("chat-themes", JSON.stringify(updated));
    setShowChatSettings(false);
  };

  const handleMute = (until: string | null) => {
    if (!selectedChat) return;
    const updated = { ...chatMutes };
    if (until) updated[selectedChat] = until;
    else delete updated[selectedChat];
    setChatMutes(updated);
    localStorage.setItem("chat-mutes", JSON.stringify(updated));
    setShowChatSettings(false);
    toast.success(until ? "Notifications muted" : "Notifications unmuted");
  };

  const handleMarkRead = async () => {
    if (!selectedChat || !user?.id) return;
    const { error } = await (supabase.from("messages") as any)
      .update({ read: true })
      .eq("conversation_id", selectedChat)
      .neq("sender_id", user.id)
      .eq("read", false);
    if (error) {
      console.error("Mark read failed:", error);
      toast.error("Could not mark as read: " + error.message);
      return;
    }
    refreshMessages();
    refreshConversations();
    toast.success("Marked as read");
  };

  const handleMarkUnread = async () => {
    if (!selectedChat || !user?.id) return;
    const { error } = await (supabase.from("messages") as any)
      .update({ read: false })
      .eq("conversation_id", selectedChat)
      .neq("sender_id", user.id)
      .eq("read", true);
    if (error) {
      console.error("Mark unread failed:", error);
      toast.error("Could not mark as unread: " + error.message);
      return;
    }
    refreshMessages();
    refreshConversations();
    toast.success("Marked as unread");
  };

  const handleOpenSearch = () => {
    setShowChatSearch(true);
    setChatSearchQuery("");
    setSearchTab("all");
  };

  const closeChatSearch = () => {
    setShowChatSearch(false);
    setChatSearchQuery("");
  };

  // ─── CAMPUS AI CHAT VIEW ───
  if (selectedChat === CAMPUS_AI_ID) {
    return (
      <div className="flex flex-col h-screen max-w-2xl mx-auto bg-[#13132a] rounded-none sm:rounded-2xl border border-white/[0.07] shadow-sm overflow-hidden overflow-x-hidden relative" style={{ height: "100dvh" }}>
        {/* AI Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/[0.07] bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedChat(null)} className="h-9 w-9 rounded-xl hover:bg-white/[0.07] flex items-center justify-center">
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-500 to-pink-500 p-0.5 flex items-center justify-center shadow-md">
                <div className="h-full w-full rounded-full bg-gray-900 flex items-center justify-center text-white">
                  <Sparkles className="h-5 w-5 text-purple-300" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[#13132a] shadow-sm" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-bold text-sm bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                  Campus AI
                </h2>
                <VerifiedBadge className="scale-75" />
              </div>
              <p className="text-[11px] text-emerald-500 font-medium">Online · Intelligent Campus Mentor</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (confirm("Reset Campus AI conversation history?")) {
                  setAiHistory([
                    {
                      id: "ai_welcome",
                      sender: "ai",
                      text: "👋 **Hello! I'm Campus AI.**\n\nI'm your intelligent university assistant on **CampusConnectICU**! 🎓\n\nAsk me anything about study strategies, exam preparation, notes summarization, code debugging, or campus guidance. How can I help you today? ✨",
                      timestamp: new Date().toISOString(),
                    },
                  ]);
                  toast.success("AI chat reset!");
                }
              }}
              title="Reset AI Chat Memory"
              className="h-9 w-9 rounded-xl hover:bg-white/[0.07] flex items-center justify-center text-slate-400 transition-colors"
            >
              <Eraser className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* AI Messages list */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-4 bg-gradient-to-b from-purple-500/20 via-indigo-500/10 to-transparent dark:from-purple-950/20 dark:via-indigo-950/10 dark:to-transparent">
          {aiHistory.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              {msg.sender === "ai" ? (
                <div className="flex gap-2.5 max-w-[92%] sm:max-w-[85%]">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 flex-shrink-0 mt-1 shadow-sm">
                    <div className="h-full w-full rounded-full bg-gray-900 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-purple-300" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="p-4 rounded-2xl rounded-tl-sm bg-[#1e1e3a] border border-purple-500/25 shadow-sm text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {msg.text}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 px-1">
                      <span>Campus AI</span>
                      <span>·</span>
                      <span>{formatTimeAgo(new Date(msg.timestamp))}</span>
                      <span>·</span>
                      <button
                        onClick={() => handleSpeakAI(msg.text)}
                        className="hover:text-purple-300 dark:hover:text-purple-400 flex items-center gap-1 transition-colors"
                      >
                        <Volume2 className="h-3 w-3" /> Listen
                      </button>
                      <span>·</span>
                      <button
                        onClick={() => handleCopyText(msg.text)}
                        className="hover:text-purple-300 dark:hover:text-purple-400 flex items-center gap-1 transition-colors"
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-[85%] sm:max-w-[78%] space-y-1">
                  <div className="p-3.5 rounded-2xl rounded-tr-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </div>
                  <div className="text-[10px] text-gray-400 text-right px-1">
                    {formatTimeAgo(new Date(msg.timestamp))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isAITyping && (
            <div className="flex items-center gap-2 text-xs text-purple-300 p-3 rounded-2xl bg-purple-500/12 bg-purple-500/20 border border-purple-500/25 border-purple-500/30 w-fit animate-pulse">
              <Sparkles className="h-4 w-4 animate-spin text-purple-500" />
              <span>Campus AI is typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="px-3 py-2 border-t border-white/[0.07] bg-[#0d0d1a]/85 backdrop-blur-md overflow-x-auto flex gap-1.5 scrollbar-none shrink-0">
          {AI_SUGGESTION_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleAISend(chip.prompt)}
              disabled={isAITyping}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap bg-purple-500/12 bg-purple-500/25 hover:bg-purple-500/15 hover:bg-purple-500/20 text-purple-300 border border-purple-500/25 dark:border-purple-800 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="p-3 border-t border-white/[0.07] bg-[#13132a] relative shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask Campus AI anything (study help, code, notes)..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAISend()}
              disabled={isAITyping}
              className="flex-1 h-11 px-4 rounded-2xl bg-white/[0.05] border-0 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50"
            />
            <Button
              size="icon"
              variant="gradient"
              onClick={() => handleAISend()}
              disabled={!messageInput.trim() || isAITyping}
              className="h-11 w-11 rounded-2xl flex-shrink-0"
            >
              {isAITyping ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── CHAT VIEW ───
  if (selectedConv) {
    return (
      <div className="flex flex-col h-screen max-w-2xl mx-auto bg-[#13132a] rounded-none sm:rounded-2xl border border-white/[0.07] shadow-sm overflow-hidden overflow-x-hidden relative" style={{ height: "100dvh" }}>
        <AnimatePresence>{showCallDialog && (
          <CallDialog type={showCallDialog} otherUser={selectedConv.otherUser} onEnd={() => setShowCallDialog(null)} />
        )}</AnimatePresence>
        <AnimatePresence>{showProfileInfo && (
          <ProfileSheet isGroup={!!selectedConv.isGroup} conv={selectedConv} onClose={() => setShowProfileInfo(false)} />
        )}</AnimatePresence>

        {/* Chat header */}
        <div className="flex items-center justify-between p-3 border-b border-white/[0.07] bg-[#13132a] shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelectedChat(null); setFallbackConv(null); closeComposePanels(); closeChatSearch(); }} className="h-9 w-9 rounded-xl hover:bg-white/[0.07] flex items-center justify-center">
              <ChevronLeft className="h-5 w-5 text-slate-400" />
            </button>
            {selectedConv.isGroup ? (
              <div className="relative">
                <Avatar name={selectedConv.otherUser.name} size="md" className="from-pink-500 to-orange-400" />
                <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-[#1e1e3a] border border-white/[0.1] flex items-center justify-center">
                  <Users className="h-3 w-3 text-pink-500" />
                </span>
              </div>
            ) : (
              <Avatar name={selectedConv.otherUser.name} size="md" status={selectedConv.otherUser.status as any} showStatus />
            )}
            <div className="min-w-0">
              <div className="font-semibold text-sm text-white truncate flex items-center gap-1.5">
                <span>{selectedConv.otherUser.name}</span>
                {(selectedConv.otherUser as any)?.is_verified && (
                  <VerifiedBadge domain={(selectedConv.otherUser as any)?.university_domain} size="sm" />
                )}
                {(currentMute === "forever" || (currentMute && new Date(currentMute).getTime() > Date.now())) && (
                  <BellOff className="inline h-3.5 w-3.5 text-gray-400" />
                )}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>
                  {selectedConv.isGroup
                    ? `${selectedConv.members.length} members`
                    : (selectedConv.otherUser.status === "online" ? "Online" : "Offline")}
                </span>
                {!selectedConv.isGroup && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Sealed Sender
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!selectedConv.isGroup && (
              <>
                <button onClick={() => handleCall("voice")} className="h-9 w-9 rounded-xl hover:bg-white/[0.07] flex items-center justify-center" title="Voice call">
                  <Phone className="h-4 w-4 text-slate-400" />
                </button>
                <button onClick={() => handleCall("video")} className="h-9 w-9 rounded-xl hover:bg-white/[0.07] flex items-center justify-center" title="Video call">
                  <Video className="h-4 w-4 text-slate-400" />
                </button>
              </>
            )}
            <div className="relative" ref={chatSettingsRef}>
              <button onClick={() => setShowChatSettings(!showChatSettings)} className="h-9 w-9 rounded-xl hover:bg-white/[0.07] flex items-center justify-center">
                <MoreHorizontal className="h-4 w-4 text-slate-400" />
              </button>
              <AnimatePresence>{showChatSettings && (
                <ChatSettings
                  nickname={nickname}
                  showNickname={!selectedConv.isGroup}
                  isGroup={selectedConv.isGroup}
                  chatTheme={currentThemeId}
                  muteUntil={currentMute}
                  onSetNickname={handleSetNickname}
                  onClearChat={handleClearChat}
                  onDeleteChat={handleDeleteChat}
                  onViewProfile={() => setShowProfileInfo(true)}
                  onSetTheme={handleSetTheme}
                  onSearch={handleOpenSearch}
                  onMute={handleMute}
                  onMarkRead={handleMarkRead}
                  onMarkUnread={handleMarkUnread}
                  onClose={() => setShowChatSettings(false)}
                />
              )}</AnimatePresence>
            </div>
          </div>
        </div>

        {/* In-chat search */}
        {showChatSearch && (
          <div className="px-3 pb-2 border-b border-white/[0.07] bg-[#13132a] shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search messages, media, links..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/[0.05] border-0 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/20"
                />
              </div>
              <button onClick={closeChatSearch} className="h-8 w-8 rounded-lg hover:bg-white/[0.07] flex items-center justify-center">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {(["all", "media", "links"] as const).map((t) => (
                <button key={t} onClick={() => setSearchTab(t)}
                  className={cn("px-3 py-1 rounded-lg text-xs transition-colors",
                    searchTab === t ? "bg-purple-500/20 text-white" : "bg-white/[0.05] text-slate-400")}>
                  {t === "all" ? "All" : t === "media" ? "Media" : "Links"}
                </button>
              ))}
              {(chatSearchQuery || searchTab !== "all") && (
                <span className="ml-auto text-[10px] text-gray-400">
                  {filteredMessages.length} result{filteredMessages.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-1 bg-gradient-to-b from-purple-500/30 to-transparent dark:from-purple-950/10 dark:to-transparent"
          style={currentThemeId !== "default" ? { backgroundImage: `linear-gradient(to bottom, ${currentTheme.soft}, transparent)` } : undefined}>
          {msgsLoading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-purple-500" /></div>
          ) : filteredMessages.length > 0 ? (
            filteredMessages.map((msg) => {
              // In group chats, show the sender's name above their message
              let senderName: string | undefined;
              let senderColor: string | undefined;
              if (selectedConv.isGroup && msg.sender_id !== user?.id) {
                const sender = (selectedConv.members ?? []).find((m: any) => m.id === msg.sender_id);
                if (sender) {
                  senderName = nicknames[sender.id] || sender.name;
                  senderColor = memberColor(sender.id);
                }
              }
              return (
                <MessageBubble
                  key={msg.id}
                  messageId={msg.id}
                  content={getDecryptedContent(msg.id)}
                  senderName={senderName}
                  senderColor={senderColor}
                  pollVotes={pollVotes[msg.id]}
                  onVote={handleVote}
                  time={msg.created_at}
                  isOwn={msg.sender_id === user?.id}
                  read={selectedConv.isGroup ? false : msg.read}
                  delivered={selectedConv.isGroup ? true : ((msg as any).delivered ?? false)}
                  type={msg.type}
                  fileUrl={(msg as any).file_url}
                  fileName={(msg as any).file_name}
                  metadata={(msg as any).metadata}
                  accent={currentThemeId !== "default" ? { from: currentTheme.from, to: currentTheme.to } : null}
                />
              );
            })
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-white/[0.05] flex items-center justify-center mx-auto mb-3">
                  {showChatSearch ? <Search className="h-8 w-8 text-gray-400 text-slate-400" /> : <MessageCircle className="h-8 w-8 text-gray-400 text-slate-400" />}
                </div>
                <p className="text-sm text-muted-foreground">{showChatSearch ? "No results found" : "No messages yet. Say hello!"}</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-3 border-t border-white/[0.07] bg-[#13132a] relative shrink-0">
          <AnimatePresence>
            {showEmoji && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />}
            {showAttach && <AttachmentPicker onSend={handleFileSend} onClose={() => setShowAttach(false)} />}
            {showVoice && <VoiceRecorder onSend={handleVoiceSend} onCancel={() => setShowVoice(false)} />}
            {showPoll && <PollCreator onSend={handlePollSend} onClose={() => setShowPoll(false)} />}
          </AnimatePresence>

          <div className="flex items-center gap-2">
            <button onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); setShowVoice(false); setShowPoll(false); }}
              className="h-10 w-10 rounded-xl hover:bg-white/[0.07] flex items-center justify-center flex-shrink-0">
              <Paperclip className="h-5 w-5 text-gray-400 text-slate-500" />
            </button>
            <div className="flex-1 relative min-w-0">
              <input
                type="text" placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                className="w-full h-10 px-4 pr-10 rounded-xl bg-white/[0.05] border-0 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white/[0.07] transition-all"
              />
              <button onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); setShowVoice(false); setShowPoll(false); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-white/[0.1] hover:bg-white/[0.07] flex items-center justify-center">
                <Smile className="h-4 w-4 text-gray-400 text-slate-500" />
              </button>
            </div>
            <button onClick={() => { setShowVoice(!showVoice); setShowEmoji(false); setShowAttach(false); setShowPoll(false); }}
              className="h-10 w-10 rounded-xl hover:bg-white/[0.07] flex items-center justify-center flex-shrink-0">
              <Mic className="h-5 w-5 text-gray-400 text-slate-500" />
            </button>
            <button onClick={() => { setShowPoll(!showPoll); setShowEmoji(false); setShowAttach(false); setShowVoice(false); }}
              className="h-10 w-10 rounded-xl hover:bg-white/[0.07] flex items-center justify-center flex-shrink-0">
              <BarChart3 className="h-5 w-5 text-gray-400 text-slate-500" />
            </button>
            <Button size="icon" variant="gradient" onClick={handleSend} disabled={!messageInput.trim()} className="h-10 w-10 flex-shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── CONVERSATION LIST ───
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Messages</h1>
          <p className="text-sm text-muted-foreground">Chat with your campus friends</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="gradient" onClick={() => { setShowNewGroup(!showNewGroup); setShowNewChat(false); }} className="h-9">
            <Users className="h-4 w-4 mr-1.5" /> New Group
          </Button>
          <Button size="sm" variant="gradient" onClick={() => { setShowNewChat(!showNewChat); setShowNewGroup(false); }} className="h-9">
            <UserPlus className="h-4 w-4 mr-1.5" /> New Chat
          </Button>
        </div>
      </div>

      <AnimatePresence>{showNewGroup && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4">
          <div className="relative mb-3">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Group name (e.g. Study Group)" value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-2xl bg-[#1e1e3a] border border-white/[0.1] text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
          </div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Select members ({groupMembers.length} selected)</p>
            <button onClick={() => setShowNewGroup(false)} className="text-xs text-purple-500 hover:text-purple-300 font-medium">
              Close
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
            {friendsLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-purple-500" /></div>
            ) : friends.length > 0 ? (
              friends.map((friend) => {
                const selected = groupMembers.includes(friend.id);
                return (
                  <div key={friend.id} onClick={() => toggleGroupMember(friend.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${
                      selected
                        ? "bg-purple-500/12 bg-purple-500/20 border-purple-500/25 border-purple-500/30"
                        : "hover:bg-white/[0.06] border-transparent"
                    }`}>
                    <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      selected ? "bg-purple-500/20 border-purple-500" : "border-white/[0.14] border-white/[0.12]"
                    }`}>
                      {selected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <Avatar name={friend.name} size="md" status={friend.status} showStatus />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-white truncate">{friend.name}</div>
                      <div className="text-xs text-muted-foreground">{friend.department ?? ""}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6">
                <Users className="h-8 w-8 text-gray-300 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Add friends first to create a group!</p>
              </div>
            )}
          </div>
          {!friendsLoading && friends.length === 0 && (
            <p className="text-center text-xs text-muted-foreground mb-2">
              You need friends to create a group — add friends from the Friends tab first.
            </p>
          )}
          <Button size="sm" variant="gradient" onClick={handleCreateGroup} disabled={creatingGroup} className="w-full h-10">
            {creatingGroup ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Creating...</> : "Create Group"}
          </Button>
        </motion.div>
      )}</AnimatePresence>

      <AnimatePresence>{showNewChat && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search friends to message..." value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-10 rounded-2xl bg-[#1e1e3a] border border-white/[0.1] text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" autoFocus />
            <button onClick={() => setShowNewChat(false)} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {friendsLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-purple-500" /></div>
            ) : filteredFriends.length > 0 ? (
              filteredFriends.map((friend) => (
                <div key={friend.id} onClick={() => handleStartNewChat(friend.id)}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.06] cursor-pointer transition-all">
                  <Avatar name={friend.name} size="md" status={friend.status} showStatus />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-white">{friend.name}</div>
                    <div className="text-xs text-muted-foreground">{friend.department ?? ""}</div>
                  </div>
                  <MessageCircle className="h-4 w-4 text-purple-400" />
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <UserPlus className="h-8 w-8 text-gray-300 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">{friendSearch ? "No friends match your search" : "Add friends first to message them!"}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}</AnimatePresence>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="text" placeholder="Search conversations..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-2xl bg-[#1e1e3a] border border-white/[0.1] text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
      </div>

      {/* ─── META AI BANNER & PINNED CAMPUS AI CONTACT ─── */}
      <div className="mb-4 space-y-2">
        <div
          onClick={() => { setSelectedChat(CAMPUS_AI_ID); setFallbackConv(null); }}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white shadow-lg cursor-pointer transition-all hover:opacity-95 hover:scale-[0.99] flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <span>Ask Campus AI</span>
                <VerifiedBadge className="scale-75 text-white" />
              </div>
              <p className="text-xs text-purple-100 font-medium">Study tips, notes summarization & instant QA 🚀</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-white/80 group-hover:translate-x-1 transition-transform" />
        </div>

        {/* Pinned Contact Item */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => { setSelectedChat(CAMPUS_AI_ID); setFallbackConv(null); }}
          className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all group border ${
            selectedChat === CAMPUS_AI_ID
              ? "bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-pink-500/10 border-purple-400 dark:border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.25)]"
              : "bg-gradient-to-r from-purple-500/40 via-indigo-500/30 to-pink-500/40 border-purple-500/60 border-purple-500/30 hover:border-purple-400"
          }`}
        >
          <div className="relative flex-shrink-0">
            <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-500 to-pink-500 p-0.5 shadow-md flex items-center justify-center">
              <div className="h-full w-full rounded-full bg-gray-900 flex items-center justify-center text-white">
                <Sparkles className="h-6 w-6 text-purple-300 animate-pulse" />
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-[#13132a] shadow-sm" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                  Campus AI
                </span>
                <VerifiedBadge className="scale-75" />
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 bg-purple-500/25 text-purple-300 border border-purple-500/25 border-purple-500/35">
                AI Assistant
              </span>
            </div>
            <p className="text-xs text-slate-300 truncate mt-0.5 font-medium">
              {aiHistory.length > 0
                ? aiHistory[aiHistory.length - 1].text.replace(/[*_#`]/g, "").slice(0, 45) + "..."
                : "Ask Campus AI for study help, note summaries & quizzes! ✨"}
            </p>
          </div>
        </motion.div>
      </div>

      {convsLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-purple-500" /></div>
      ) : (
        <div className="space-y-1">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv, i) => {
              const isUnread = conv.unreadCount > 0 && !isMuted(conv.conversation.id);
              return (
                <motion.div key={conv.conversation.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedChat(conv.conversation.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all group ${
                    isUnread
                      ? "bg-purple-500/20 bg-purple-500/20 ring-1 ring-purple-500/40 shadow-[0_0_18px_rgba(168,85,247,0.25)]"
                      : "hover:bg-white/[0.06]"
                  }`}>
                  <div
                    onClick={(e) => {
                      if (conv.isGroup || !onViewProfile) return;
                      e.stopPropagation();
                      onViewProfile({
                        id: conv.otherUser.id,
                        name: conv.otherUser.name,
                        avatar_url: conv.otherUser.avatar_url,
                        status: conv.otherUser.status,
                      });
                    }}
                    className="relative flex-shrink-0"
                  >
                    {isUnread && (
                      <span className="absolute inset-0 rounded-full bg-purple-500/40 blur-md animate-pulse" />
                    )}
                    <div className="relative">
                      {conv.isGroup ? (
                        <div className="relative">
                          <Avatar name={conv.otherUser.name} size="lg" className="from-pink-500 to-orange-400" />
                          <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-[#1e1e3a] border border-white/[0.1] flex items-center justify-center">
                            <Users className="h-3 w-3 text-pink-500" />
                          </span>
                        </div>
                      ) : (
                        <Avatar
                          name={conv.otherUser.name}
                          src={conv.otherUser.avatar_url ?? undefined}
                          size="lg"
                          status={conv.otherUser.status as any}
                          showStatus
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        onClick={(e) => {
                          if (conv.isGroup || !onViewProfile) return;
                          e.stopPropagation();
                          onViewProfile({
                            id: conv.otherUser.id,
                            name: conv.otherUser.name,
                            avatar_url: conv.otherUser.avatar_url,
                            status: conv.otherUser.status,
                          });
                        }}
                        className={`text-sm truncate ${isUnread ? "font-bold text-purple-300" : "font-semibold text-white"} ${conv.isGroup ? "" : "cursor-pointer hover:text-purple-300 transition-colors"}`}
                      >
                        {conv.isGroup ? conv.otherUser.name : (nicknames[conv.otherUser.id] || conv.otherUser.name)}
                      </span>
                      <span className={`text-xs flex-shrink-0 ml-2 ${isUnread ? "font-semibold text-purple-500" : "text-muted-foreground"}`}>
                        {conv.lastMessage ? formatTimeAgo(new Date(conv.lastMessage.created_at)) : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={`text-sm truncate ${isUnread ? "text-purple-300 font-medium" : "text-muted-foreground"}`}>
                        {previewFor(conv)}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {conv.isGroup && (
                          <span className="text-[10px] text-muted-foreground">{conv.members.length} members</span>
                        )}
                        {isMuted(conv.conversation.id) && (
                          <BellOff className="h-3.5 w-3.5 text-gray-400" />
                        )}
                        {isUnread && (
                          <Badge variant="default" className="h-5 min-w-[20px] px-1.5 text-[10px] bg-purple-500/20 hover:bg-purple-500/20">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <MessageCircle className="h-10 w-10 text-gray-300 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No conversations yet. Click "New Chat" to start messaging!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
