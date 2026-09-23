import { FilePdf, CheckCircle, X } from "@phosphor-icons/react/dist/ssr";
import { motion } from "motion/react";

interface FilePreviewCardProps {
  file: File;
  onRemove: () => void;
}

export function FilePreviewCard({ file, onRemove }: FilePreviewCardProps) {
  return (
    <div className="px-6 pb-6">
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-black/[0.04] relative overflow-hidden group"
      >
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500 shadow-inner">
            <FilePdf weight="fill" className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-black truncate text-base">{file.name}</p>
            <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-zinc-400 uppercase tracking-wider">
              <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
              <span>&middot;</span>
              <span>PDF</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs font-bold text-emerald-600 uppercase tracking-wider">
              <CheckCircle weight="fill" className="h-3.5 w-3.5" />
              PDF Validated
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button 
              type="button" 
              onClick={onRemove}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 hover:bg-zinc-100 hover:text-black transition-colors"
              aria-label="Remove file"
            >
              <X weight="bold" className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Subtle background decoration */}
        <FilePdf weight="fill" className="absolute -right-6 -bottom-6 h-32 w-32 text-zinc-50 opacity-50 z-0 rotate-12 transition-transform group-hover:scale-110 duration-500" />
      </motion.div>
    </div>
  );
}
