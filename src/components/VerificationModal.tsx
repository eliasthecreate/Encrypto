import React, { useState } from "react";
import { X, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Sparkles, Building2, Fingerprint } from "lucide-react";
import { verifyUniversityCredentials } from "../lib/crypto";
import { useAuth } from "../lib/auth-context";
import { toast } from "sonner";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified?: () => void;
}

export function VerificationModal({ isOpen, onClose, onVerified }: VerificationModalProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const isAlreadyVerified = user.profile?.is_verified;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await verifyUniversityCredentials(user.id, email, studentId);
      if (res.success) {
        toast.success(res.message);
        if (onVerified) onVerified();
        setTimeout(() => {
          onClose();
          window.location.reload(); // Refresh profile state cleanly
        }, 1200);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Decorative Banner */}
        <div className="h-2 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

        {/* Modal Header */}
        <div className="p-6 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                University Student Verification
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Claim your verified student trust signal badge & campus identity credential
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Public UUID Section */}
        <div className="mx-6 p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
            <Fingerprint className="w-4 h-4 text-cyan-400" />
            <span>Public UUID:</span>
            <span className="text-cyan-300 font-semibold">{user.profile?.public_uuid || "Generating..."}</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
            Anonymous Handle
          </span>
        </div>

        {/* Body Form */}
        <form onSubmit={handleVerify} className="p-6 space-y-4">
          {isAlreadyVerified ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Verified Student Credential Active
              </div>
              <p className="text-xs text-emerald-300/80 leading-relaxed">
                Your account is verified with domain{" "}
                <span className="font-mono text-emerald-200">{user.profile?.university_domain || "icu.edu.ng"}</span>.
                Your verified trust badge is visible across your profile, posts, and chats.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  Official Campus Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@icu.edu.ng or .edu"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Must end with accredited university domain (e.g. .edu, .edu.ng, icu.edu.ng)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Student Registration / Matric ID (Optional)
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. ICU/2026/1042"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Close
            </button>

            {!isAlreadyVerified && (
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Verify Credential
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
