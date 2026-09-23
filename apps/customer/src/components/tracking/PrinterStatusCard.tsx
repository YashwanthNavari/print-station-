import { Printer, CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";

interface PrinterStatusCardProps {
  status: "Online" | "Offline" | "Unknown";
  printerName: string;
  stationId: string;
}

export function PrinterStatusCard({ status, printerName, stationId }: PrinterStatusCardProps) {
  const isOnline = status === "Online";

  return (
    <div className="bg-white rounded-3xl p-6 border border-black/[0.04] shadow-[0_2px_12px_rgb(0,0,0,0.03)] mb-4">
      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-5">Printer Status</h3>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            <Printer weight="fill" className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              {isOnline ? (
                <>
                  <CheckCircle weight="fill" className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-700">Ready</span>
                </>
              ) : (
                <>
                  <WarningCircle weight="fill" className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-bold text-red-700">Unavailable</span>
                </>
              )}
            </div>
            <p className="text-sm font-bold text-black">{printerName}</p>
            <p className="text-xs font-medium text-zinc-500 mt-0.5">Station {stationId}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
