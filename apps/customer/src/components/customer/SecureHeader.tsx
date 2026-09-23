"use client";

import { Printer, Info, CaretLeft, CheckCircle, WifiHigh } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";

interface SecureHeaderProps {
  stationId: string;
}

export function SecureHeader({ stationId }: SecureHeaderProps) {
  const router = useRouter();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between px-6 pt-12 pb-4 bg-[#F8F9FA] shrink-0 z-10 sticky top-0 border-b border-black/[0.04]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-black/[0.04] active:scale-95 transition-transform"
          >
            <CaretLeft weight="bold" className="h-5 w-5 text-black" />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-black uppercase flex items-center gap-2">
              Secure Print <Printer weight="fill" className="h-4 w-4 text-zinc-400" />
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <p className="text-xs font-semibold text-zinc-500">
                Connected to <span className="font-mono text-zinc-800">{stationId}</span>
              </p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowInfo(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-black/[0.04] text-zinc-400 hover:text-black active:scale-95 transition-all"
        >
          <Info weight="bold" className="h-5 w-5" />
        </button>
      </header>

      <AnimatePresence>
        {showInfo && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInfo(false)}
              className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 shadow-2xl max-w-[480px] mx-auto border-t border-black/[0.04]"
            >
              <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-black mb-6">Print Station</h2>
              
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Station ID</p>
                  <p className="text-base font-semibold text-black font-mono">{stationId}</p>
                </div>
                
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Connection</p>
                  <div className="flex items-center gap-2">
                    <WifiHigh weight="bold" className="h-5 w-5 text-zinc-600" />
                    <p className="text-base font-semibold text-black">Local Wi-Fi</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Status</p>
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle weight="fill" className="h-5 w-5" />
                    <p className="text-base font-semibold">Online</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100">
                  <p className="text-sm font-medium text-zinc-500">
                    Files are transferred directly to this station over the local network. No cloud storage is used.
                  </p>
                </div>

                <button
                  onClick={() => setShowInfo(false)}
                  className="w-full bg-black text-white font-bold rounded-xl py-4 active:scale-[0.98] transition-transform"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
