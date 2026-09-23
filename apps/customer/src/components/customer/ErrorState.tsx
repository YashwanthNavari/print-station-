import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { motion } from "motion/react";

interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-6 mb-4"
    >
      <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100">
        <WarningCircle weight="fill" className="h-6 w-6 shrink-0" />
        <p className="text-sm font-semibold">{message}</p>
      </div>
    </motion.div>
  );
}
