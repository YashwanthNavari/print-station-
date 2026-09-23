"use client";

import { use, useEffect, useState } from "react";
import { JobTimeline } from "@/components/tracking/JobTimeline";
import { QueuePosition } from "@/components/tracking/QueuePosition";
import { PrinterStatusCard } from "@/components/tracking/PrinterStatusCard";
import { CaretLeft, Printer } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { config } from "@/lib/config";

export default function StatusPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const router = useRouter();
  const { jobId } = use(params);

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printerStatus, setPrinterStatus] = useState<"Online" | "Offline" | "Unknown">("Unknown");
  const [printerName, setPrinterName] = useState("Local Printer");

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const baseUrl = config.apiUrl;
        
        // Fetch Job
        const res = await fetch(`${baseUrl}/api/jobs/${jobId}/status`);
        if (!res.ok) throw new Error("Job not found or server offline");
        const data = await res.json();
        setJob(data.job);
        
        // Fetch Health/Printer Status
        const healthRes = await fetch(`${baseUrl}/api/health`);
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          // We assume printer is online if the agent is running for now, 
          // or we can fetch /api/printers
          const printerRes = await fetch(`${baseUrl}/api/printers`);
          if (printerRes.ok) {
            const printers = await printerRes.json();
            if (printers && printers.length > 0) {
              setPrinterStatus("Online");
              setPrinterName(printers[0].name || "Local Printer");
            } else {
              setPrinterStatus("Offline");
              setPrinterName("No printer found");
            }
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [jobId]);

  return (
    <main className="flex h-[100dvh] w-full flex-col bg-[#F8F9FA] font-sans mx-auto max-w-[480px] relative overflow-hidden">
      <header className="flex items-center justify-between px-6 pt-12 pb-4 bg-[#F8F9FA] shrink-0 z-10 sticky top-0 border-b border-black/[0.04]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-black/[0.04] active:scale-95 transition-transform"
          >
            <CaretLeft weight="bold" className="h-5 w-5 text-black" />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-black uppercase flex items-center gap-2">
              Job Status <Printer weight="fill" className="h-4 w-4 text-zinc-400" />
            </h1>
            <p className="text-xs font-semibold text-zinc-500 font-mono mt-0.5">
              {jobId}
            </p>
          </div>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto no-scrollbar p-6">
        {loading && !job && (
          <div className="flex justify-center items-center h-40">
            <div className="h-8 w-8 rounded-full border-4 border-zinc-200 border-t-black animate-spin" />
          </div>
        )}
        
        {error && !job && (
          <div className="bg-red-50 p-6 rounded-3xl border border-red-100 text-center">
            <p className="text-red-600 font-bold mb-2">Unable to load job</p>
            <p className="text-red-500 text-sm font-medium">{error}</p>
          </div>
        )}

        {job && (
          <div className="space-y-4">
            <PrinterStatusCard 
              status={printerStatus} 
              printerName={printerName}
              stationId={job.stationId || "PS-TEST-001"}
            />
            
            <QueuePosition 
              // Assuming position 1 if printing, 3 if ready. 
              // (In a real app, position comes from backend queue length)
              position={job.status === "PRINTING" || job.status === "COMPLETED" ? 1 : 3} 
            />
            
            <JobTimeline status={job.status} />
          </div>
        )}
      </div>
    </main>
  );
}
