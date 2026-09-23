import { LockKey, Check } from "@phosphor-icons/react/dist/ssr";
import { motion } from "motion/react";

export function SecureTransferCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-6 pb-6"
    >
      <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-3 relative z-10">
          <LockKey weight="fill" className="h-5 w-5 text-emerald-600" />
          <h4 className="text-sm font-bold text-emerald-900 uppercase tracking-wide">Secure Local Printing</h4>
        </div>
        
        <p className="text-sm text-emerald-800 font-medium mb-4 relative z-10 leading-relaxed">
          Your document is transferred directly to this PrintStation over the local network.
        </p>
        
        <ul className="space-y-2 relative z-10">
          <li className="flex items-center gap-2 text-xs font-bold text-emerald-700">
            <Check weight="bold" className="h-4 w-4" /> No cloud upload
          </li>
          <li className="flex items-center gap-2 text-xs font-bold text-emerald-700">
            <Check weight="bold" className="h-4 w-4" /> Local processing
          </li>
        </ul>

        {/* Decorative background icon */}
        <LockKey weight="fill" className="absolute -right-4 -bottom-4 h-24 w-24 text-emerald-500 opacity-[0.08] z-0 -rotate-12" />
      </div>
    </motion.div>
  );
}
