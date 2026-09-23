import { CheckCircle, CircleNotch, WarningCircle } from "@phosphor-icons/react/dist/ssr";

interface JobTimelineProps {
  status: string;
}

export function JobTimeline({ status }: JobTimelineProps) {
  const statuses = [
    "READY_TO_PRINT", // Used when file uploaded and prepared
    "PRINTING",
    "COMPLETED"
  ];
  
  const isFailed = status === "PRINT_FAILED" || status === "FAILED";
  const currentIndex = isFailed ? -1 : statuses.indexOf(status);
  
  const steps = [
    { label: "Document uploaded", description: "Validated and securely transferred", done: currentIndex >= 0 || isFailed, current: false },
    { label: "Received by PrintStation", description: "Added to local queue", done: currentIndex >= 0 || isFailed, current: currentIndex === 0 && !isFailed },
    { label: "Printing", description: "Sending to physical printer", done: currentIndex >= 1, current: currentIndex === 1 },
    { label: "Completed", description: "Successfully printed", done: currentIndex === 2, current: currentIndex === 2 }
  ];

  if (isFailed) {
    return (
      <div className="w-full bg-white rounded-3xl border border-black/[0.04] p-8 text-center space-y-4 shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
          <WarningCircle weight="fill" className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-black">Print Failed</h2>
        <p className="text-zinc-500 text-sm font-medium mt-2">
          There was an issue processing your document at the station. Please check with the operator.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-black/[0.04] shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-6">Status Timeline</h3>
      <ul className="relative space-y-8 pl-1">
        <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-zinc-100 -z-10 rounded-full"></div>
        
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-4">
            <div className="relative flex shrink-0 items-center justify-center bg-white py-1">
              {step.done && !step.current ? (
                <div className="h-7 w-7 rounded-full bg-black flex items-center justify-center">
                  <CheckCircle weight="bold" className="h-4 w-4 text-white" />
                </div>
              ) : step.current ? (
                <div className="h-7 w-7 rounded-full bg-white border-2 border-black flex items-center justify-center shadow-[0_0_0_4px_rgba(0,0,0,0.05)]">
                  <CircleNotch weight="bold" className="h-4 w-4 text-black animate-spin" />
                </div>
              ) : (
                <div className="h-7 w-7 rounded-full border-2 border-zinc-200 bg-white flex items-center justify-center"></div>
              )}
            </div>
            <div className="flex-1 pt-1">
              <p className={`text-sm font-bold ${step.done || step.current ? "text-black" : "text-zinc-400"}`}>
                {step.label}
              </p>
              {step.description && (
                <p className={`text-xs mt-1 font-medium ${step.done || step.current ? "text-zinc-500" : "text-zinc-300"}`}>
                  {step.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
