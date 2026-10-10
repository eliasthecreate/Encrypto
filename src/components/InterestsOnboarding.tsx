import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ChevronLeft,
  ArrowRight,
  GraduationCap,
  BookOpen,
  PartyPopper,
  Wand2,
} from "lucide-react";
import {
  INTERESTS,
  COURSES,
  PROGRAMS,
  splitList,
  joinList,
  toggleInList,
} from "@/lib/interests";
import { InterestPicker } from "./InterestPicker";

interface InterestsOnboardingProps {
  open: boolean;
  profile: any;
  /** Persist the picked interests/courses/program. */
  onSave: (updates: Record<string, any>) => Promise<void> | void;
  /** Called after the final confirmation screen is dismissed. */
  onDone: () => void;
  /** When true, show a welcoming headline on the first step. */
  firstTime?: boolean;
}

const FLOATING = [
  { emoji: "🎬", x: "8%", y: "12%", d: 0 },
  { emoji: "⚽", x: "84%", y: "18%", d: 0.6 },
  { emoji: "🌸", x: "16%", y: "72%", d: 1.1 },
  { emoji: "🎵", x: "78%", y: "66%", d: 0.3 },
  { emoji: "🎮", x: "46%", y: "8%", d: 0.9 },
  { emoji: "👗", x: "88%", y: "44%", d: 1.4 },
  { emoji: "🍔", x: "6%", y: "44%", d: 0.5 },
  { emoji: "📚", x: "40%", y: "86%", d: 1.2 },
];

export function InterestsOnboarding({ open, profile, onSave, onDone, firstTime }: InterestsOnboardingProps) {
  const [step, setStep] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Seed selections from the saved profile each time the sheet opens.
  useEffect(() => {
    if (!open || !profile) return;
    setSelectedInterests(splitList(profile.interests));
    setSelectedCourses(splitList(profile.courses));
    const prog = PROGRAMS.find((p) => p.label === profile.department || p.id === profile.department);
    setSelectedProgram(prog?.id ?? "");
    setStep(0);
  }, [open, profile]);

  const programItems = useMemo(
    () => PROGRAMS.map((p) => ({ id: p.id, label: p.label, emoji: p.emoji, color: "from-purple-500 to-indigo-600" })),
    []
  );

  const canContinue = selectedInterests.length >= 3;

  const persist = async (finish: boolean) => {
    setSaving(true);
    const programDef = PROGRAMS.find((p) => p.id === selectedProgram);
    const updates: Record<string, any> = {
      interests: joinList(selectedInterests),
      courses: joinList(selectedCourses),
      interests_set: true,
    };
    if (programDef) updates.department = programDef.label;
    try {
      await onSave(updates);
      if (finish) setStep(2);
    } finally {
      setSaving(false);
    }
  };

  // Skipping still remembers that onboarding was seen, so it doesn't reappear
  // on every visit; any partial picks are kept.
  const handleSkip = async () => {
    await persist(false);
    onDone();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-[#0b0b18]/95 backdrop-blur-xl overflow-y-auto overscroll-contain"
        >
          {/* Animated backdrop */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-purple-600/25 blur-3xl" />
            <div className="absolute bottom-0 -right-20 h-80 w-80 rounded-full bg-pink-500/20 blur-3xl" />
            {FLOATING.map((f) => (
              <motion.span
                key={f.emoji + f.x}
                className="absolute text-3xl sm:text-4xl opacity-30 select-none"
                style={{ left: f.x, top: f.y }}
                animate={{ y: [0, -18, 0], rotate: [0, 10, -6, 0] }}
                transition={{ duration: 6, repeat: Infinity, delay: f.d, ease: "easeInOut" }}
              >
                {f.emoji}
              </motion.span>
            ))}
          </div>

          <div className="relative z-10 min-h-full flex items-start sm:items-center justify-center p-4">
            <div className="w-full max-w-lg">
              {/* Progress + close */}
              {step < 2 && (
                <div className="flex items-center gap-3 mb-5">
                  {step > 0 ? (
                    <button
                      onClick={() => setStep(step - 1)}
                      className="h-9 w-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-300 hover:bg-white/[0.1]"
                      aria-label="Back"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  ) : (
                    <span className="h-9 w-9" />
                  )}
                  <div className="flex-1 flex gap-1.5">
                    {[0, 1].map((i) => (
                      <div key={i} className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                          initial={false}
                          animate={{ width: i <= step ? "100%" : "0%" }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleSkip}
                    disabled={saving}
                    className="h-9 px-3 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] disabled:opacity-50"
                  >
                    Skip
                  </button>
                </div>
              )}

              <AnimatePresence mode="wait">
                {/* ── Step 0: interests ── */}
                {step === 0 && (
                  <motion.div
                    key="interests"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.28 }}
                    className="cc-card p-5 sm:p-6"
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/25 bg-purple-500/10 px-3 py-1 text-[11px] font-medium text-purple-200">
                      <Wand2 className="h-3 w-3" />
                      Personalize your For You
                    </span>
                    <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white">
                      {firstTime ? "Hey! What's your vibe?" : "Update your interests"}
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-400">
                      Pick at least 3 — we'll tune your feed like TikTok, Instagram and Facebook do,
                      but for your campus.
                    </p>

                    <div className="mt-5">
                      <InterestPicker
                        items={INTERESTS}
                        selected={selectedInterests}
                        onToggle={(id) => setSelectedInterests((prev) => toggleInList(prev, id))}
                      />
                    </div>

                    <div className="sticky bottom-0 mt-5 pt-4 bg-gradient-to-t from-[rgba(19,19,42,0.95)] to-transparent">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500">
                          {selectedInterests.length} selected
                          {!canContinue && " · pick 3+"}
                        </span>
                        <button
                          disabled={!canContinue}
                          onClick={() => setStep(1)}
                          className="cc-gradient-btn h-11 px-5 flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                          Continue
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 1: studies ── */}
                {step === 1 && (
                  <motion.div
                    key="studies"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.28 }}
                    className="cc-card p-5 sm:p-6"
                  >
                    <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                      <GraduationCap className="h-6 w-6 text-purple-400" />
                      Your studies
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-400">
                      We'll surface posts, notes and people from your program and courses.
                    </p>

                    <div className="mt-5">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                        Program
                      </h3>
                      <InterestPicker
                        items={programItems}
                        selected={selectedProgram ? [selectedProgram] : []}
                        onToggle={(id) => setSelectedProgram((prev) => (prev === id ? "" : id))}
                      />
                    </div>

                    <div className="mt-5">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        Courses
                      </h3>
                      <InterestPicker
                        items={COURSES}
                        selected={selectedCourses}
                        onToggle={(id) => setSelectedCourses((prev) => toggleInList(prev, id))}
                        startDelay={0.1}
                      />
                    </div>

                    <div className="sticky bottom-0 mt-5 pt-4 bg-gradient-to-t from-[rgba(19,19,42,0.95)] to-transparent">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500">
                          {selectedProgram ? PROGRAMS.find((p) => p.id === selectedProgram)?.label : "No program picked"}
                        </span>
                        <button
                          disabled={saving}
                          onClick={() => persist(true)}
                          className="cc-gradient-btn h-11 px-5 flex items-center gap-2 text-sm disabled:opacity-60"
                        >
                          {saving ? "Saving…" : "Finish"}
                          <Sparkles className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 2: done ── */}
                {step === 2 && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="cc-card p-8 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
                      className="h-20 w-20 mx-auto rounded-3xl bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-900/50"
                    >
                      <PartyPopper className="h-10 w-10 text-white" />
                    </motion.div>
                    <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-white">
                      Your feed is ready!
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Tuned to {selectedInterests.length} interests
                      {selectedProgram ? ` and ${PROGRAMS.find((p) => p.id === selectedProgram)?.label}` : ""}.
                    </p>
                    <button
                      onClick={onDone}
                      className="cc-gradient-btn mt-6 w-full h-12 flex items-center justify-center gap-2 text-sm"
                    >
                      Show me my For You
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
