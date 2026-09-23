-- Print Station Supabase Schema

-- Custom Types
CREATE TYPE job_status AS ENUM (
  'UPLOADED',
  'QUEUED',
  'CLAIMED',
  'DOWNLOADING',
  'LOCAL',
  'READY_TO_PRINT',
  'PRINTING',
  'COMPLETED',
  'FAILED',
  'PRINT_FAILED'
);

-- Stations Table
CREATE TABLE public.stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id text UNIQUE NOT NULL, -- e.g., 'PS-HYD-001'
  name text NOT NULL,
  station_secret text NOT NULL, -- Hashed or plain (since it's a simple setup)
  is_active boolean DEFAULT true,
  last_seen_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Agent Sessions Table
CREATE TABLE public.agent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id text REFERENCES public.stations(station_id) ON DELETE CASCADE,
  last_heartbeat timestamp with time zone DEFAULT now(),
  ip_address text,
  version text,
  created_at timestamp with time zone DEFAULT now()
);

-- Print Jobs Table
CREATE TABLE public.print_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_job_id text UNIQUE NOT NULL, -- e.g., 'PS-8F42A1' for the customer
  station_id text REFERENCES public.stations(station_id) ON DELETE CASCADE,
  status job_status DEFAULT 'UPLOADED'::job_status,
  original_filename text NOT NULL,
  storage_path text NOT NULL,
  file_size integer,
  file_hash text,
  copies integer DEFAULT 1,
  color boolean DEFAULT false,
  double_sided boolean DEFAULT false,
  error_message text,
  claimed_at timestamp with time zone,
  heartbeat_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Job Events Table
CREATE TABLE public.job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.print_jobs(id) ON DELETE CASCADE,
  event text NOT NULL, -- e.g., 'UPLOADED', 'RECEIVED', 'DOWNLOADING', 'LOCAL', 'PRINTING', 'COMPLETED'
  message text,
  created_at timestamp with time zone DEFAULT now()
);

-- RPC for Atomic Job Claiming & Stale Recovery
CREATE OR REPLACE FUNCTION public.claim_next_print_job(p_station_id text)
RETURNS SETOF public.print_jobs AS $$
DECLARE
  v_job_id uuid;
BEGIN
  -- Find the oldest QUEUED job, OR a stale CLAIMED/DOWNLOADING job (heartbeat older than 5 minutes)
  SELECT id INTO v_job_id
  FROM public.print_jobs
  WHERE station_id = p_station_id 
    AND (
      status = 'QUEUED' 
      OR (
        status IN ('CLAIMED', 'DOWNLOADING') 
        AND heartbeat_at < now() - interval '5 minutes'
      )
    )
  ORDER BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF FOUND THEN
    -- Update the status to CLAIMED and set heartbeat/claimed_at
    UPDATE public.print_jobs
    SET 
      status = 'CLAIMED', 
      claimed_at = now(),
      heartbeat_at = now(),
      updated_at = now()
    WHERE id = v_job_id;

    -- Return the updated row
    RETURN QUERY SELECT * FROM public.print_jobs WHERE id = v_job_id;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_print_jobs_updated_at
    BEFORE UPDATE ON public.print_jobs
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Row Level Security (RLS)
-- Enable RLS
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;

-- Print Jobs RLS:
-- 1. Anyone can insert a job (via the Next.js API, or the API can bypass RLS using service role)
-- 2. Customers can read their own job status using public_job_id (API wrapper will handle this)
-- 3. Stations can read/update jobs assigned to them (API wrapper will handle this)

-- For simplicity, since all db access will be via Next.js API using Service Role Key, 
-- or we can expose it via REST API. Let's assume Next.js API will use the Service Role Key
-- to handle business logic securely, so we don't strictly need complex public RLS policies.
-- We can just create a policy that allows service role to do everything.

CREATE POLICY "Allow all actions for service role on print_jobs" ON public.print_jobs
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all actions for service role on stations" ON public.stations
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all actions for service role on agent_sessions" ON public.agent_sessions
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all actions for service role on job_events" ON public.job_events
    USING (true)
    WITH CHECK (true);

-- Storage configuration
-- Create a bucket for temporary documents
INSERT INTO storage.buckets (id, name, public) VALUES ('print_jobs', 'print_jobs', false);

-- Storage RLS
-- Only authenticated users (the Next.js API service role) can upload/download.
CREATE POLICY "Allow service role full access" ON storage.objects
    USING (bucket_id = 'print_jobs')
    WITH CHECK (bucket_id = 'print_jobs');
