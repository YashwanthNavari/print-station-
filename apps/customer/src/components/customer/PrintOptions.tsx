import { Minus, Plus } from "@phosphor-icons/react/dist/ssr";
import { motion } from "motion/react";

interface PrintOptionsProps {
  copies: number;
  setCopies: (val: number) => void;
  color: boolean;
  setColor: (val: boolean) => void;
  doubleSided: boolean;
  setDoubleSided: (val: boolean) => void;
}

export function PrintOptions({ 
  copies, setCopies, 
  color, setColor, 
  doubleSided, setDoubleSided 
}: PrintOptionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-6 space-y-4"
    >
      <div className="flex items-center justify-between bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-black/[0.04]">
        <span className="font-bold text-black px-2">Copies</span>
        <div className="flex items-center bg-zinc-50 rounded-full p-1 border border-zinc-100">
          <button
            type="button"
            onClick={() => setCopies(Math.max(1, copies - 1))}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-sm disabled:opacity-50 active:scale-90 transition-transform"
            disabled={copies <= 1}
          >
            <Minus weight="bold" />
          </button>
          <span className="w-14 text-center font-bold text-black text-xl">{copies}</span>
          <button
            type="button"
            onClick={() => setCopies(Math.min(100, copies + 1))}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-sm active:scale-90 transition-transform"
          >
            <Plus weight="bold" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-black/[0.04]">
        <span className="font-bold text-black px-2">Color</span>
        <div className="flex bg-zinc-50 rounded-full p-1 border border-zinc-100 w-44">
          <button
            type="button"
            onClick={() => setColor(false)}
            className={`flex-1 h-12 rounded-full text-sm font-bold transition-all ${
              !color ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-black"
            }`}
          >
            B&W
          </button>
          <button
            type="button"
            onClick={() => setColor(true)}
            className={`flex-1 h-12 rounded-full text-sm font-bold transition-all ${
              color ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-black"
            }`}
          >
            Color
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-black/[0.04]">
        <span className="font-bold text-black px-2">Sides</span>
        <div className="flex bg-zinc-50 rounded-full p-1 border border-zinc-100 w-44">
          <button
            type="button"
            onClick={() => setDoubleSided(false)}
            className={`flex-1 h-12 rounded-full text-sm font-bold transition-all ${
              !doubleSided ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-black"
            }`}
          >
            1-Sided
          </button>
          <button
            type="button"
            onClick={() => setDoubleSided(true)}
            className={`flex-1 h-12 rounded-full text-sm font-bold transition-all ${
              doubleSided ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-black"
            }`}
          >
            2-Sided
          </button>
        </div>
      </div>
    </motion.div>
  );
}
