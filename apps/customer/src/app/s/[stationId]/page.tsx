"use client";

import { use, useState, useEffect } from "react";
import { SecureHeader } from "@/components/customer/SecureHeader";
import { ProgressStepper, Step } from "@/components/customer/ProgressStepper";
import { UploadDropzone } from "@/components/customer/UploadDropzone";
import { FilePreviewCard } from "@/components/customer/FilePreviewCard";
import { PrintOptions } from "@/components/customer/PrintOptions";
import { PrintSummary } from "@/components/customer/PrintSummary";
import { SecureTransferCard } from "@/components/customer/SecureTransferCard";
import { UploadProgress } from "@/components/customer/UploadProgress";
import { SuccessCard } from "@/components/customer/SuccessCard";
import { BottomActionBar } from "@/components/customer/BottomActionBar";
import { ErrorState } from "@/components/customer/ErrorState";
import { config } from "@/lib/config";

export default function StationPage({ params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = use(params);

  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Print Options
  const [copies, setCopies] = useState(1);
  const [color, setColor] = useState(false);
  const [doubleSided, setDoubleSided] = useState(false);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    if (selectedFile.size === 0) {
      setError("The selected file is empty.");
      return;
    }
    if (selectedFile.size > 25 * 1024 * 1024) {
      setError("File exceeds the 25 MiB limit.");
      return;
    }
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    setFile(selectedFile);
    setStep(2); // Auto-advance to options
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("stationId", stationId);
      formData.append("copies", String(copies));
      formData.append("color", String(color));
      formData.append("doubleSided", String(doubleSided));

      const baseUrl = config.apiUrl;
      const response = await fetch(`${baseUrl}/api/upload`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success || !data.jobId) {
        throw new Error(data.error || "Unable to connect to this PrintStation.");
      }
      
      setTimeout(() => {
        setJobId(data.jobId);
        setIsSuccess(true);
        setIsUploading(false);
      }, 400);
      
    } catch (err: any) {
      clearInterval(progressInterval);
      let msg = err.message || "Upload timed out. Please try again.";
      if (msg === "Failed to fetch") msg = "Unable to connect to this PrintStation.";
      
      setError(`Upload rejected: ${msg}`);
      setIsUploading(false);
      setUploadProgress(0);
      setStep(1); // Go back to start on error
    }
  };

  if (isSuccess && jobId) {
    return (
      <main className="flex h-[100dvh] w-full flex-col bg-[#F8F9FA] font-sans mx-auto max-w-[480px] relative overflow-hidden">
        <SecureHeader stationId={stationId} />
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <SuccessCard 
            jobId={jobId} 
            onPrintAnother={() => {
              setFile(null);
              setIsSuccess(false);
              setJobId(null);
              setCopies(1);
              setColor(false);
              setDoubleSided(false);
              setStep(1);
            }} 
          />
        </div>
      </main>
    );
  }

  if (isUploading) {
    return (
      <main className="flex h-[100dvh] w-full flex-col bg-[#F8F9FA] font-sans mx-auto max-w-[480px] relative overflow-hidden">
        <SecureHeader stationId={stationId} />
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <UploadProgress progress={uploadProgress} filename={file?.name || ""} />
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[100dvh] w-full flex-col bg-[#F8F9FA] font-sans mx-auto max-w-[480px] relative overflow-hidden">
      <SecureHeader stationId={stationId} />
      
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <ProgressStepper currentStep={step} />
        
        {error && <ErrorState message={error} />}

        {step === 1 && (
          <>
            {!file ? (
              <UploadDropzone onFileSelect={handleFileSelect} />
            ) : (
              <FilePreviewCard 
                file={file} 
                onRemove={() => { setFile(null); setError(null); }} 
              />
            )}
          </>
        )}

        {step === 2 && file && (
          <PrintOptions 
            copies={copies} setCopies={setCopies}
            color={color} setColor={setColor}
            doubleSided={doubleSided} setDoubleSided={setDoubleSided}
          />
        )}

        {step === 3 && file && (
          <>
            <PrintSummary 
              filename={file.name}
              copies={copies}
              color={color}
              doubleSided={doubleSided}
            />
            <SecureTransferCard />
          </>
        )}
      </div>

      {file && !isUploading && !isSuccess && (
        <BottomActionBar 
          label={step === 3 ? "Upload & Print" : "Continue"}
          onNext={() => {
            if (step < 3) setStep((s) => (s + 1) as Step);
            else handleUpload();
          }}
          onBack={step > 1 ? () => setStep((s) => (s - 1) as Step) : undefined}
          disabled={!file}
        />
      )}
    </main>
  );
}
