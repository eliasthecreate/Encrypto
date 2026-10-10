import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface PickerItem {
  id: string;
  label: string;
  emoji: string;
  color?: string;
}

interface InterestPickerProps {
  items: PickerItem[];
  selected: string[];
  onToggle: (id: string) => void;
  /** Stagger starting index, so multiple pickers animate in sequence. */
  startDelay?: number;
}

/** Animated, tappable chip grid used by onboarding and the profile editor. */
export function InterestPicker({ items, selected, onToggle, startDelay = 0 }: InterestPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => {
        const active = selected.includes(item.id);
        return (
          <motion.button
            key={item.id}
            type="button"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: startDelay + i * 0.025,
              type: "spring",
              stiffness: 340,
              damping: 22,
            }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onToggle(item.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium border transition-colors",
              active
                ? `text-white border-transparent bg-gradient-to-r ${item.color ?? "from-purple-500 to-pink-500"} shadow-lg shadow-purple-900/30`
                : "text-slate-300 border-white/10 bg-white/[0.05] hover:bg-white/[0.09] hover:border-purple-500/30"
            )}
          >
            <span className="text-base leading-none">{item.emoji}</span>
            <span>{item.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
