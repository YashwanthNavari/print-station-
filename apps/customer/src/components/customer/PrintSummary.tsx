import { motion } from "motion/react";
import { FileText } from "@phosphor-icons/react/dist/ssr";

interface PrintSummaryProps {
  filename: string;
  copies: number;
  color: boolean;
  doubleSided: boolean;
}

export function PrintSummary({ filename, copies, color, doubleSided }: PrintSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-6 pb-4"
    >
      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 px-2">Print Summary</h3>
      <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-black/[0.04] space-y-5">
        
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
            <FileText weight="fill" className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-black truncate">{filename}</p>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mt-1">Document</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 pt-5">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Copies</p>
            <p className="font-bold text-base text-black">{copies}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Color</p>
            <p className="font-bold text-base text-black">{color ? "Color" : "Black & White"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Sides</p>
            <p className="font-bold text-base text-black">{doubleSided ? "Double-sided" : "Single-sided"}</p>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
