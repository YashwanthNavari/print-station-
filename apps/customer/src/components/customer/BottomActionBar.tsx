import { motion } from "motion/react";

interface BottomActionBarProps {
  onNext: () => void;
  onBack?: () => void;
  label: string;
  disabled?: boolean;
}

export function BottomActionBar({ onNext, onBack, label, disabled }: BottomActionBarProps) {
  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F8F9FA] via-[#F8F9FA] to-transparent z-40 pointer-events-none"
    >
      <div className="max-w-[480px] mx-auto w-full relative pointer-events-auto flex gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-[56px] w-[80px] shrink-0 items-center justify-center rounded-full bg-white border border-zinc-200 text-black font-bold active:scale-[0.98] transition-transform shadow-sm"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={disabled}
          className="flex-1 items-center justify-center rounded-full bg-black h-[56px] text-base font-bold text-white shadow-[0_8px_30px_rgb(0,0,0,0.2)] active:scale-[0.98] disabled:scale-100 disabled:shadow-none disabled:bg-zinc-300 transition-all"
        >
          {label}
        </button>
      </div>
    </motion.div>
  );
}
