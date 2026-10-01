import { useMemo, useState } from "react";
import { useNotifications, useFriendRequests } from "@/lib/supabase-hooks";
import {
  Bell,
  Settings,
  Heart,
  MessageCircle,
  UserPlus,
  AtSign,
  CalendarDays,
  Check,
  X,
  ChevronRight,
} from "lucide-react";
import { Avatar } from "./ui/avatar";

type Filter = "all" | "mentions" | "follows";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "mentions", label: "Mentions" },
  { id: "follows", label: "Follows" },
];

function matchesFilter(type: string, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "mentions") return type === "comment" || type.includes("mention");
  return type === "friend_request" || type.includes("follow");
}

function NotificationGlyph({ type }: { type: string }) {
  const base =
    "absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full flex items-center justify-center ring-2 ring-[#0d0d1a]";
  if (type === "like")
    return (
      <span className={`${base} bg-gradient-to-br from-rose-500 to-pink-600`}>
        <Heart className="h-2.5 w-2.5 text-white fill-white" />
      </span>
    );
  if (type === "comment")
    return (
      <span className={`${base} bg-gradient-to-br from-purple-500 to-violet-600`}>
        <MessageCircle className="h-2.5 w-2.5 text-white" />
      </span>
    );
  if (type === "friend_request" || type.includes("follow"))
    return (
      <span className={`${base} bg-gradient-to-br from-purple-400 to-pink-500`}>
        <UserPlus className="h-2.5 w-2.5 text-white" />
      </span>
    );
  if (type.includes("mention"))
    return (
      <span className={`${base} bg-gradient-to-br from-cyan-400 to-purple-600`}>
        <AtSign className="h-2.5 w-2.5 text-white" />
      </span>
    );
  if (type.includes("event"))
    return (
      <span className={`${base} bg-gradient-to-br from-amber-400 to-pink-500`}>
        <CalendarDays className="h-2.5 w-2.5 text-white" />
      </span>
    );
  return (
    <span className={`${base} bg-gradient-to-br from-purple-500 to-pink-500`}>
      <Bell className="h-2.5 w-2.5 text-white" />
    </span>
  );
}

export function NotificationsPanel({
  onOpenConnections,
}: {
  onOpenConnections: () => void;
}) {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const { requests, acceptRequest, rejectRequest } = useFriendRequests("panel");
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(
    () => notifications.filter((n: any) => matchesFilter(n.type ?? "", filter)),
    [notifications, filter]
  );

  const hasAny = requests.length > 0 || visible.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-2xl font-bold text-white tracking-tight">Notifications</h1>
        <div className="flex items-center gap-1.5">
          {notifications.some((n: any) => !n.read) && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors px-2 py-1"
            >
              Mark all read
            </button>
          )}
          <button
            aria-label="Notification settings"
            className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Settings className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`cc-pill ${
              filter === f.id ? "cc-pill-active" : "cc-pill-idle"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {requests.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-pink-400">
            <UserPlus className="h-3 w-3" />
            Connect Requests
          </div>
          {requests.map((request) => (
            <div key={request.id} className="cc-card cc-card-hover p-3 flex items-center gap-3">
              <Avatar
                name={request.sender?.name ?? "Unknown"}
                src={request.sender?.avatar_url}
                size="md"
                status={request.sender?.status as any}
                showStatus
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white line-clamp-1">
                  <span className="font-semibold">
                    {request.sender?.name ?? "Someone"}
                  </span>{" "}
                  <span className="text-slate-400">wants to connect</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {request.sender?.department ?? "Campus Connect ICU"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => acceptRequest(request.id)}
                  aria-label="Accept"
                  className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white hover:brightness-110 transition"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => rejectRequest(request.id)}
                  aria-label="Decline"
                  className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-rose-300 hover:border-rose-500/40 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        {loading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="cc-card p-4 flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-white/5 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-white/5 animate-pulse" />
                  <div className="h-2.5 w-1/3 rounded bg-white/5 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && visible.length > 0 && (
          visible.map((notif: any) => (
            <button
              key={notif.id}
              onClick={() => markAsRead(notif.id)}
              className={`w-full text-left cc-card cc-card-hover p-4 flex items-start gap-3 ${
                notif.read ? "opacity-70" : ""
              }`}
            >
              <div className="relative flex-shrink-0">
                <span className="flex h-11 w-11 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 items-center justify-center text-white text-sm font-bold">
                  {(notif.title ?? "?")[0]?.toUpperCase()}
                </span>
                <NotificationGlyph type={notif.type ?? ""} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 leading-snug">
                  {notif.title && (
                    <span className="font-semibold text-white">{notif.title} </span>
                  )}
                  {notif.body}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(notif.created_at).toLocaleString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
              {!notif.read && (
                <span className="h-2 w-2 rounded-full bg-purple-400 flex-shrink-0 mt-2" />
              )}
            </button>
          ))
        )}

        {!loading && visible.length === 0 && requests.length === 0 && (
          <div className="cc-card py-14 flex flex-col items-center text-center px-6">
            <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Bell className="h-6 w-6 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-300">Nothing here yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[16rem]">
              {filter === "all"
                ? "Likes, comments and connection requests will show up here."
                : `No ${filter} to show right now.`}
            </p>
          </div>
        )}

        {!loading && filter !== "all" && visible.length === 0 && requests.length > 0 && (
          <button
            onClick={onOpenConnections}
            className="w-full flex items-center justify-between cc-card p-4 text-left"
          >
            <span className="text-sm text-slate-300">View your connections</span>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        )}
      </section>

      {!hasAny && !loading && <div className="h-4" />}
    </div>
  );
}