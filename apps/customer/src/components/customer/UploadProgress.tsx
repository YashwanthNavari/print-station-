import { motion } from "motion/react";
import { CircleNotch } from "@phosphor-icons/react/dist/ssr";

interface UploadProgressProps {
  progress: number;
  filename: string;
}

export function UploadProgress({ progress, filename }: UploadProgressProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center pt-12 px-6"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md border border-black/[0.04] mb-8">
        <CircleNotch weight="bold" className="h-8 w-8 text-black animate-spin" />
      </div>
      
      <h2 className="text-2xl font-bold text-black mb-2 tracking-tight">Uploading document</h2>
      <p className="text-sm font-bold text-zinc-400 truncate max-w-full px-8 mb-10">{filename}</p>

      <div className="w-full max-w-[320px] bg-white rounded-full h-3 p-0.5 shadow-inner border border-zinc-100 relative overflow-hidden mb-4">
        <div 
          className="h-full bg-black rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-base font-bold text-black">{Math.min(100, progress)}%</span>
      </div>
      
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mt-6">
        Sending securely to PrintStation...
      </p>
    </motion.div>
  );
}
