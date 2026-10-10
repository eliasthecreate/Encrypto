import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  GraduationCap,
  BookOpen,
  MapPin,
  Sparkles,
  Loader2,
  Briefcase,
  Calendar,
  Globe,
  Instagram,
  Twitter,
  Home,
  School,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { InterestPicker } from "./InterestPicker";
import { INTERESTS, COURSES, splitList, joinList, toggleInList } from "@/lib/interests";
import { toast } from "sonner";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: any;
  onSave: (updates: any) => Promise<void>;
}

export function EditProfileModal({ open, onClose, profile, onSave }: EditProfileModalProps) {
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [skills, setSkills] = useState("");
  const [bio, setBio] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [location, setLocation] = useState("");
  const [hometown, setHometown] = useState("");
  const [birthday, setBirthday] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [school, setSchool] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setDepartment(profile.department ?? "");
      setYear(profile.year ?? "");
      setSkills(profile.skills ?? "");
      setBio(profile.bio ?? "");
      setPronouns(profile.pronouns ?? "");
      setLocation(profile.location ?? "");
      setHometown(profile.hometown ?? "");
      setBirthday(profile.birthday ?? "");
      setWorkplace(profile.workplace ?? "");
      setJobTitle(profile.job_title ?? "");
      setSchool(profile.school ?? "");
      setWebsite(profile.website ?? "");
      setInstagram(profile.instagram ?? "");
      setTwitter(profile.twitter ?? "");
      setInterests(splitList(profile.interests));
      setCourses(splitList(profile.courses));
    }
  }, [profile]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    await onSave({
      name,
      department,
      year,
      skills,
      bio,
      pronouns,
      location,
      hometown,
      birthday,
      workplace,
      job_title: jobTitle,
      school,
      website,
      instagram,
      twitter,
      interests: joinList(interests),
      courses: joinList(courses),
    });
    setSaving(false);
    toast.success("Profile updated!");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-50 w-full max-w-lg mx-4 bg-[#13132a] rounded-2xl shadow-2xl border border-white/[0.07] overflow-hidden max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/[0.07] flex-shrink-0">
              <h2 className="text-lg font-semibold dark:text-white">Edit Profile</h2>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full hover:bg-white/[0.07] flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="p-4 space-y-5 overflow-y-auto flex-1">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-300">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="pl-10" placeholder="Your name" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-300">Pronouns</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={pronouns}
                    onChange={(e) => setPronouns(e.target.value)}
                    className="pl-10"
                    placeholder="he/his, she/her, they/them"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-300">Department</label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input value={department} onChange={(e) => setDepartment(e.target.value)} className="pl-10" placeholder="Computer Science" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-300">Year</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input value={year} onChange={(e) => setYear(e.target.value)} className="pl-10" placeholder="3rd Year" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-300">Skills</label>
                <div className="relative">
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input value={skills} onChange={(e) => setSkills(e.target.value)} className="pl-10" placeholder="UI Design, React, Public Speaking" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Separate skills with commas</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-300">Bio</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="min-h-[70px] resize-none bg-[#1e1e3a]"
                  placeholder="Tell your campus story..."
                  rows={3}
                />
              </div>

              {/* Personal Details */}
              <div className="border-t border-white/[0.07] pt-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Personal Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-400">Lives in</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input value={location} onChange={(e) => setLocation(e.target.value)} className="pl-10" placeholder="Lusaka, Zambia" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-400">Hometown</label>
                    <div className="relative">
                      <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input value={hometown} onChange={(e) => setHometown(e.target.value)} className="pl-10" placeholder="Lusaka" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-400">Birthday</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input value={birthday} onChange={(e) => setBirthday(e.target.value)} className="pl-10" placeholder="November 30" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Work */}
              <div className="border-t border-white/[0.07] pt-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Work</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-400">Workplace</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input value={workplace} onChange={(e) => setWorkplace(e.target.value)} className="pl-10" placeholder="Nike" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-400">Job Title</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="pl-10" placeholder="Share Holder" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Education */}
              <div className="border-t border-white/[0.07] pt-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Education</h3>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-400">School / University</label>
                  <div className="relative">
                    <School className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input value={school} onChange={(e) => setSchool(e.target.value)} className="pl-10" placeholder="Information and Communication University" />
                  </div>
                </div>
              </div>

              {/* For You personalization */}
              <div className="border-t border-white/[0.07] pt-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-fuchsia-400" />
                  For You Interests
                </h3>
                <p className="text-[11px] text-muted-foreground mb-3">
                  These tune what you see on the For You tab.
                </p>
                <InterestPicker
                  items={INTERESTS}
                  selected={interests}
                  onToggle={(id) => setInterests((prev) => toggleInList(prev, id))}
                />
                <h3 className="text-xs font-semibold text-slate-400 mt-4 mb-2">Courses</h3>
                <InterestPicker
                  items={COURSES}
                  selected={courses}
                  onToggle={(id) => setCourses((prev) => toggleInList(prev, id))}
                  startDelay={0.05}
                />
              </div>

              {/* Contact / Social Links */}
              <div className="border-t border-white/[0.07] pt-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Contact Info</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-400">Website</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="pl-10" placeholder="yoursite.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-slate-400">Instagram</label>
                      <div className="relative">
                        <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} className="pl-10" placeholder="@username" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-slate-400">Twitter / X</label>
                      <div className="relative">
                        <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input value={twitter} onChange={(e) => setTwitter(e.target.value)} className="pl-10" placeholder="@username" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-white/[0.07] flex-shrink-0">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button variant="gradient" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
