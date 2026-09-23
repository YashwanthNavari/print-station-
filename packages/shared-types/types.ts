export type PrintJobStatus = 
  | 'UPLOADED' 
  | 'QUEUED' 
  | 'CLAIMED' 
  | 'DOWNLOADING' 
  | 'LOCAL' 
  | 'READY_TO_PRINT' 
  | 'PRINTING' 
  | 'COMPLETED'
  | 'FAILED'
  | 'PRINT_FAILED';

export interface PrintJob {
  id: string;
  stationId: string;
  status: PrintJobStatus;
  originalFilename: string;
  storagePath: string; // Path in Supabase storage
  fileSize?: number;
  fileHash?: string;
  errorMessage?: string;
  settings: {
    copies: number;
    color: boolean;
    doubleSided: boolean;
  };
  createdAt: string;
  updatedAt: string;
}
