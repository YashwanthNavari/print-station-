import { Check } from "@phosphor-icons/react/dist/ssr";

export type Step = 1 | 2 | 3;

interface ProgressStepperProps {
  currentStep: Step;
}

export function ProgressStepper({ currentStep }: ProgressStepperProps) {
  const steps = [
    { num: 1, label: "Upload" },
    { num: 2, label: "Options" },
    { num: 3, label: "Confirm" }
  ];

  return (
    <div className="w-full flex items-center justify-between px-6 py-6 mb-2">
      {steps.map((step, i) => {
        const isActive = currentStep === step.num;
        const isPast = currentStep > step.num;
        
        return (
          <div key={step.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div 
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isPast 
                    ? "bg-black text-white" 
                    : isActive 
                      ? "bg-black text-white ring-4 ring-black/10" 
                      : "bg-zinc-100 text-zinc-400 border border-zinc-200"
                }`}
              >
                {isPast ? <Check weight="bold" className="h-4 w-4" /> : step.num}
              </div>
              <span 
                className={`text-[10px] uppercase tracking-wider font-bold mt-2 transition-colors ${
                  isActive || isPast ? "text-black" : "text-zinc-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            
            {i < steps.length - 1 && (
              <div className="w-12 sm:w-20 mx-3 h-0.5 rounded-full overflow-hidden bg-zinc-100 mt-[-16px]">
                <div 
                  className="h-full bg-black transition-all duration-500 ease-out" 
                  style={{ width: isPast ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
