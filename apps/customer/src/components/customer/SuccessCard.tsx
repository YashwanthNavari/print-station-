import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";

interface SuccessCardProps {
  jobId: string;
  onPrintAnother: () => void;
}

export function SuccessCard({ jobId, onPrintAnother }: SuccessCardProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center pt-10 px-6 pb-24"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black text-white shadow-xl shadow-black/10 mb-8">
        <CheckCircle weight="fill" className="h-10 w-10" />
      </div>
      
      <h2 className="text-3xl font-bold text-black mb-3 tracking-tight">You're all set</h2>
      <p className="text-sm font-medium text-zinc-500 text-center mb-8 px-4">
        Your document has been added to the PrintStation queue.
      </p>

      <div className="w-full bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-black/[0.04] mb-8 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-zinc-100">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Job ID</span>
          <span className="text-sm font-bold text-black font-mono bg-zinc-100 px-2 py-1 rounded">{jobId.slice(0, 8)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</span>
          <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded">
            <CheckCircle weight="fill" /> Received
          </span>
        </div>
      </div>

      <div className="w-full space-y-3">
        <button
          type="button"
          onClick={() => router.push(`/status/${jobId}`)}
          className="w-full rounded-full bg-black py-4 h-[56px] text-base font-bold text-white shadow-[0_8px_30px_rgb(0,0,0,0.2)] active:scale-[0.98] transition-transform"
        >
          Track Print Job
        </button>
        <button
          type="button"
          onClick={onPrintAnother}
          className="w-full rounded-full bg-white py-4 h-[56px] text-base font-bold text-black border-2 border-zinc-200 active:scale-[0.98] transition-transform"
        >
          Print Another Document
        </button>
      </div>
    </motion.div>
  );
}
