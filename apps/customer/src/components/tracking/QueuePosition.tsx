import { motion } from "motion/react";
import { Users, Clock } from "@phosphor-icons/react/dist/ssr";

interface QueuePositionProps {
  position: number;
}

export function QueuePosition({ position }: QueuePositionProps) {
  // If position is 1, they are next. If > 1, there are people ahead.
  const ahead = position - 1;
  const estimatedWait = ahead * 2; // Rough estimate: 2 mins per job

  if (position <= 1) {
    return (
      <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Clock weight="fill" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-900">You're next in line</p>
            <p className="text-xs font-medium text-emerald-700 mt-0.5">Your document is printing now</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-black/[0.04] shadow-[0_2px_12px_rgb(0,0,0,0.03)] mb-4">
      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-5">Queue Position</h3>
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-2xl font-bold text-black">#{position}</p>
          <p className="text-xs font-medium text-zinc-500 mt-1">{ahead} document{ahead > 1 ? 's' : ''} ahead of you</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-black">~{estimatedWait} min</p>
          <p className="text-xs font-medium text-zinc-500 mt-1">Estimated wait</p>
        </div>
      </div>

      {/* Visual Queue Indicator */}
      <div className="flex items-center justify-between px-2">
        {Array.from({ length: Math.min(ahead + 1, 5) }).map((_, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className={`h-3 w-3 rounded-full ${i === ahead ? 'bg-black ring-4 ring-black/10' : 'bg-zinc-200'}`} />
            {i < Math.min(ahead + 1, 5) - 1 && (
              <div className="h-0.5 w-full bg-zinc-100 mx-1" />
            )}
          </div>
        ))}
      </div>
      
    </div>
  );
}
