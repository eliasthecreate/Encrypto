import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, User, FileText, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Avatar } from "./ui/avatar";
import { formatTimeAgo } from "@/lib/utils";

interface SearchResults {
  people: any[];
  posts: any[];
}

export function GlobalSearch({
  open,
  query,
  onQueryChange,
  onClose,
  onViewProfile,
}: {
  open: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  onViewProfile: (user: { id: string; name: string; avatar_url?: string | null; status?: string | null }) => void;
}) {
  const [results, setResults] = useState<SearchResults>({ people: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const term = query.trim();

  useEffect(() => {
    if (!open) {
      setResults({ people: [], posts: [] });
      setSearched(false);
      return;
    }
    if (term.length < 2) {
      setResults({ people: [], posts: [] });
      setSearched(false);
      return;
    }

    let active = true;
    setLoading(true);

    // Postgres full-text search with ilike fallback for partial words
    // ("comp" should still match "Computer Science").
    const run = async () => {
      const escaped = term.replace(/[%,()]/g, " ");

      const [peopleRes, postsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, name, department, year, status, avatar_url, bio, skills")
          .or(
            `name.ilike.%${escaped}%,department.ilike.%${escaped}%,year.ilike.%${escaped}%,skills.ilike.%${escaped}%,school.ilike.%${escaped}%`
          )
          .limit(25),
        supabase
          .from("posts")
          .select("id, content, type, created_at, user_id, event_location, profiles!inner(id, name, avatar_url, status)")
          .ilike("content", `%${escaped}%`)
          .order("created_at", { ascending: false })
          .limit(25),
      ]);

      if (!active) return;

      const people = (peopleRes.data ?? []) as any[];

      // Rank: exact name prefix first, then name, then the other fields.
      const needle = term.toLowerCase();
      const scored = people
        .map((p) => {
          const name = (p.name ?? "").toLowerCase();
          let rank = 1;
          if (name === needle) rank = 0;
          else if (name.startsWith(needle)) rank = 1;
          else if (name.includes(needle)) rank = 2;
          else if ((p.department ?? "").toLowerCase().includes(needle)) rank = 3;
          else rank = 4;
          return { p, rank };
        })
        .sort((a, b) => a.rank - b.rank || a.p.name.localeCompare(b.p.name))
        .map((x) => x.p);

      setResults({ people: scored, posts: (postsRes.data ?? []) as any[] });
      setLoading(false);
      setSearched(true);
    };

    run();

    return () => {
      active = false;
    };
  }, [term, open]);

  const total = results.people.length + results.posts.length;

  const emptyMessage = useMemo(() => {
    if (!term) return "Search for students by name, program, year or skills.";
    if (term.length < 2) return "Keep typing to search.";
    if (!searched) return "Searching...";
    if (total === 0) return `No students or posts match "${term}".`;
    return null;
  }, [term, searched, total]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search students, posts, programs..."
                className="cc-input w-full h-11 pl-10 pr-10 text-sm"
                autoFocus
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-purple-400" />
              )}
              {!loading && query && (
                <button
                  onClick={() => onQueryChange("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {emptyMessage ? (
              <p className="text-xs text-slate-500 mt-3 px-1">{emptyMessage}</p>
            ) : (
              <div className="mt-3 max-h-[60vh] overflow-y-auto space-y-3 pr-0.5">
                {results.people.length > 0 && (
                  <section>
                    <div className="flex items-center gap-1.5 px-1 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-400">
                      <User className="h-3 w-3" />
                      Students ({results.people.length})
                    </div>
                    <div className="space-y-1">
                      {results.people.map((person) => (
                        <button
                          key={person.id}
                          onClick={() => {
                            onViewProfile({
                              id: person.id,
                              name: person.name,
                              avatar_url: person.avatar_url ?? null,
                              status: person.status ?? null,
                            });
                            onClose();
                          }}
                          className="w-full cc-card cc-card-hover p-2.5 flex items-center gap-3 text-left"
                        >
                          <Avatar
                            name={person.name}
                            src={person.avatar_url ?? undefined}
                            size="md"
                            status={person.status}
                            showStatus
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{person.name}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {[person.department, person.year].filter(Boolean).join(" · ") || "No program set"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {results.posts.length > 0 && (
                  <section>
                    <div className="flex items-center gap-1.5 px-1 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-pink-400">
                      <FileText className="h-3 w-3" />
                      Posts ({results.posts.length})
                    </div>
                    <div className="space-y-1">
                      {results.posts.map((post) => (
                        <button
                          key={post.id}
                          onClick={() => {
                            onViewProfile({
                              id: post.profiles?.id ?? post.user_id,
                              name: post.profiles?.name ?? "Unknown",
                              avatar_url: post.profiles?.avatar_url ?? null,
                              status: post.profiles?.status ?? null,
                            });
                            onClose();
                          }}
                          className="w-full cc-card cc-card-hover p-2.5 text-left"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-purple-300">
                              {post.profiles?.name ?? "Unknown"}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {formatTimeAgo(new Date(post.created_at))}
                            </span>
                          </div>
                          <p className="text-sm text-slate-200 leading-snug line-clamp-2">{post.content}</p>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}