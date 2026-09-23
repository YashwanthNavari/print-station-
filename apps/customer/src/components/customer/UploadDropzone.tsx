import { CloudArrowUp } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
}

export function UploadDropzone({ onFileSelect }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="px-6 pb-6">
      <label
        htmlFor="pdf-upload"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.[0]) onFileSelect(e.dataTransfer.files[0]);
        }}
        className={`relative flex w-full cursor-pointer flex-col items-center justify-center rounded-[32px] border-2 p-10 transition-all ${
          isDragging 
            ? "border-black bg-black/5 scale-[0.98]" 
            : "border-dashed border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
        } shadow-[0_2px_24px_rgb(0,0,0,0.02)] active:scale-[0.98]`}
      >
        <input
          id="pdf-upload"
          type="file"
          className="sr-only"
          accept=".pdf,application/pdf"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onFileSelect(e.target.files[0]);
              e.target.value = ''; 
            }
          }}
        />
        
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-black mb-6 shadow-sm ring-4 ring-white">
          <CloudArrowUp weight="fill" className="h-8 w-8" />
        </div>
        
        <h3 className="text-xl font-bold text-black mb-1">Choose your PDF</h3>
        <p className="text-sm text-zinc-500 font-medium text-center px-4">
          Tap anywhere or drag & drop to select a file
        </p>
        
        <div className="mt-8 inline-flex items-center rounded-full bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-500 tracking-wider uppercase">
          PDF files only &middot; Max 25 MB
        </div>
      </label>
    </div>
  );
}
