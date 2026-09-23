import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Printer, 
  Settings, 
  FileText, 
  LayoutDashboard, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Search,
  HardDrive,
  Activity,
  X,
  RefreshCw,
  Bell,
  Lock,
  AlertTriangle,
  FolderOpen,
  ChevronRight,
  Wifi,
  Database,
  Server,
  Eye,
  Download,
  Maximize2,
} from 'lucide-react';
import './index.css';
import { apiUrl } from './apiConfig';

// ----------------------------------------------------
// Types
// ----------------------------------------------------
interface Job {
  id: string;
  cloud_job_id: string;
  status: string;
  filename: string;
  copies: number;
  color_mode: boolean;
  page_range: string;
  error_message?: string;
  created_at: string;
  file_size?: number;
}

interface PrinterInfo {
  name: string;
  status: string;
  isDefault: boolean;
}

interface HealthInfo {
  status: string;
  services: {
    api: string;
    database: string;
    storage: string;
    agent: string;
    printer: string;
  }
}

// ----------------------------------------------------
// Helpers
// ----------------------------------------------------
function formatBytes(bytes: number = 0, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function getFriendlyStatus(technicalStatus: string) {
  switch (technicalStatus) {
    case 'QUEUED':
    case 'CLAIMED':
    case 'DOWNLOADING':
    case 'LOCAL':
    case 'READY_TO_PRINT':
      return { text: 'Ready to Print', type: 'ready', color: 'text-amber-600', dot: 'bg-amber-500', bg: 'bg-amber-50 border-amber-100' };
    case 'PRINTING':
      return { text: 'Printing', type: 'active', color: 'text-blue-600', dot: 'bg-blue-500', bg: 'bg-blue-50 border-blue-100' };
    case 'COMPLETED':
      return { text: 'Completed', type: 'success', color: 'text-green-600', dot: 'bg-green-500', bg: 'bg-green-50 border-green-100' };
    case 'PRINT_FAILED':
    case 'FAILED':
      return { text: 'Failed', type: 'error', color: 'text-red-600', dot: 'bg-red-500', bg: 'bg-red-50 border-red-100' };
    default:
      return { text: 'Queued', type: 'pending', color: 'text-gray-600', dot: 'bg-gray-400', bg: 'bg-gray-50 border-gray-100' };
  }
}

function StatusBadge({ status }: { status: string }) {
  const s = getFriendlyStatus(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold border ${s.bg} ${s.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`}></span>
      {s.text}
    </span>
  );
}

// ----------------------------------------------------
// Sub-Components
// ----------------------------------------------------
function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[16px] p-16 flex flex-col items-center text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="h-16 w-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 mb-6">
        {icon}
      </div>
      <h4 className="text-[18px] font-semibold text-[#111827] mb-2">{title}</h4>
      <p className="text-[14px] text-[#6b7280] max-w-sm">{description}</p>
    </div>
  );
}

function JobCard({ job, onView, onPrint, isLoading }: {
  job: Job;
  onView: (j: Job) => void;
  onPrint: (j: Job) => void;
  isLoading: boolean;
}) {
  const canPrint = ['LOCAL', 'READY_TO_PRINT', 'FAILED', 'PRINT_FAILED'].includes(job.status);
  const isRetry = ['FAILED', 'PRINT_FAILED'].includes(job.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group bg-white border border-[#e5e7eb] rounded-[16px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-gray-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all cursor-pointer"
      onClick={() => onView(job)}
    >
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex gap-4 min-w-0">
          <div className="h-14 w-14 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-red-500 font-bold text-xs">PDF</span>
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <h4 className="text-[16px] font-semibold text-[#111827] truncate max-w-[200px] sm:max-w-md">{job.filename}</h4>
              <StatusBadge status={job.status} />
            </div>
            <div className="text-[13px] font-mono text-[#9ca3af] mb-2">#{job.cloud_job_id}</div>
            <div className="text-[13px] text-[#6b7280] font-medium flex flex-wrap items-center gap-1.5">
              <span>{job.copies} {job.copies === 1 ? 'copy' : 'copies'}</span>
              <span>·</span>
              <span>{job.color_mode ? 'Color' : 'B&W'}</span>
              {job.file_size ? <><span>·</span><span>{formatBytes(job.file_size)}</span></> : null}
              <span className="ml-1 bg-gray-100 px-2 py-0.5 rounded text-xs">
                {timeAgo(job.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end border-t border-gray-100 pt-3 md:border-none md:pt-0 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onView(job); }}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold text-[#111827] bg-white border border-[#e5e7eb] hover:bg-gray-50 transition-colors"
          >
            View
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onPrint(job); }}
            disabled={!canPrint || isLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors shadow-sm ${
              canPrint && !isLoading
                ? isRetry
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-[#111827] text-white hover:bg-gray-800'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            {isLoading ? 'Printing...' : isRetry ? 'Retry' : 'Print'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function JobListPanel({ jobs, title, emptyTitle, emptyDesc, onView, onPrint, loadingId }: {
  jobs: Job[];
  title: string;
  emptyTitle: string;
  emptyDesc: string;
  onView: (j: Job) => void;
  onPrint: (j: Job) => void;
  loadingId: string | null;
}) {
  const [search, setSearch] = useState('');
  const filtered = jobs.filter(j =>
    !search || j.filename.toLowerCase().includes(search.toLowerCase()) || j.cloud_job_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[20px] font-semibold text-[#111827]">{title}</h3>
        <span className="text-[14px] text-[#6b7280]">{jobs.length} document{jobs.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="bg-white border border-[#e5e7eb] rounded-[14px] p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search filename or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#f6f7f9] rounded-lg pl-9 pr-3 py-2 text-[14px] text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#e5e7eb] border-none"
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title={emptyTitle}
          description={emptyDesc}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {filtered.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onView={onView}
                onPrint={onPrint}
                isLoading={loadingId === job.id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// Main App
// ----------------------------------------------------
export default function App() {
  const [authStatus, setAuthStatus] = useState<'LOADING' | 'SETUP' | 'LOGIN' | 'AUTHENTICATED'>('LOADING');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [health, setHealth] = useState<HealthInfo | null>(null);

  const [activeTab, setActiveTab] = useState('Overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [viewerJob, setViewerJob] = useState<Job | null>(null);
  const [printConfirmJob, setPrintConfirmJob] = useState<Job | null>(null);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [printerScanState, setPrinterScanState] = useState<'IDLE' | 'SCANNING'>('IDLE');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Toast helper
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Initialization & Auth
  const checkAuth = async () => {
    try {
      const res = await fetch(apiUrl('/api/auth/status'), { credentials: 'include' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.setupRequired) setAuthStatus('SETUP');
      else if (data.loggedIn) setAuthStatus('AUTHENTICATED');
      else setAuthStatus('LOGIN');
    } catch {
      setTimeout(checkAuth, 3000);
    }
  };

  useEffect(() => { checkAuth(); }, []);

  const fetchData = useCallback(async () => {
    if (authStatus !== 'AUTHENTICATED') return;
    try {
      fetch(apiUrl('/api/health'), { credentials: 'include' }).then(r => r.json()).then(h => setHealth(h)).catch(() => {});
      const resJobs = await fetch(apiUrl('/api/jobs'), { credentials: 'include' });
      if (resJobs.status === 401) { setAuthStatus('LOGIN'); return; }
      const dataJobs = await resJobs.json();
      setJobs(Array.isArray(dataJobs) ? dataJobs : []);
      // Keep selectedJob in sync
      setSelectedJob(prev => {
        if (!prev) return null;
        const updated = dataJobs.find((j: Job) => j.id === prev.id);
        return updated || prev;
      });
    } catch (err) {
      console.error(err);
    }
  }, [authStatus]);

  const scanPrinters = async () => {
    setPrinterScanState('SCANNING');
    try {
      const res = await fetch(apiUrl('/api/printers'), { credentials: 'include' });
      const data = await res.json();
      setPrinters(Array.isArray(data) ? data : []);
    } catch { /* noop */ } finally {
      setPrinterScanState('IDLE');
    }
  };

  useEffect(() => {
    if (authStatus === 'AUTHENTICATED') {
      fetchData();
      scanPrinters();
      const jobInterval = setInterval(fetchData, 3000);
      const healthInterval = setInterval(() => {
        fetch(apiUrl('/api/health'), { credentials: 'include' }).then(r => r.json()).then(h => setHealth(h)).catch(() => {});
      }, 10000);
      return () => { clearInterval(jobInterval); clearInterval(healthInterval); };
    }
  }, [authStatus, fetchData]);

  // Auth submit
  const handleAuthSubmit = async (e: React.FormEvent, endpoint: string) => {
    e.preventDefault();
    setPinError('');
    try {
      const res = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pin })
      });
      if (res.ok) {
        setPin('');
        setAuthStatus(endpoint === '/api/auth/setup' ? 'LOGIN' : 'AUTHENTICATED');
      } else {
        setPinError(endpoint === '/api/auth/setup' ? 'PIN must be at least 4 digits.' : 'Incorrect PIN. Please try again.');
      }
    } catch {
      setPinError('Cannot connect to PrintStation server.');
    }
  };

  // Browser-native print: open PDF in a hidden iframe → trigger system print dialog → confirm
  const handlePrintConfirm = useCallback(async (job: Job) => {
    // 1. Tell backend the print dialog is being opened → sets status = PRINTING
    await fetch(apiUrl(`/api/jobs/${job.id}/print-dialog`), { method: 'POST', credentials: 'include' }).catch(() => {});
    await fetchData();

    // 2. Open a hidden iframe that loads the PDF, then auto-trigger window.print()
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;';
    iframe.src = apiUrl(`/api/jobs/${job.id}/document`);
    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        // afterprint fires when the dialog closes (print or cancel)
        iframe.contentWindow?.addEventListener('afterprint', () => {
          document.body.removeChild(iframe);
          // Show confirm modal — was the page actually printed?
          setPrintConfirmJob(job);
        }, { once: true });
        iframe.contentWindow?.print();
      } catch {
        // Cross-origin / browser restriction fallback: open in new tab
        document.body.removeChild(iframe);
        const win = window.open(apiUrl(`/api/jobs/${job.id}/document`), '_blank');
        if (win) {
          win.onload = () => { win.print(); };
        }
        setPrintConfirmJob(job);
      }
    };

    showToast(`Print dialog opened for "${job.filename}"`, 'success');
  }, [fetchData]);

  const handleMarkPrinted = async (job: Job) => {
    setIsActionLoading(job.id);
    try {
      await fetch(apiUrl(`/api/jobs/${job.id}/mark-printed`), { method: 'POST', credentials: 'include' });
      showToast(`"${job.filename}" marked as printed ✓`, 'success');
      await fetchData();
    } catch {
      showToast('Failed to update status.', 'error');
    } finally {
      setIsActionLoading(null);
      setPrintConfirmJob(null);
    }
  };

  const handleMarkFailed = async (job: Job, reason?: string) => {
    setIsActionLoading(job.id);
    try {
      await fetch(apiUrl(`/api/jobs/${job.id}/mark-failed`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: reason || 'Print cancelled' }),
      });
      showToast(`Job marked as failed.`, 'error');
      await fetchData();
    } catch {
      showToast('Failed to update status.', 'error');
    } finally {
      setIsActionLoading(null);
      setPrintConfirmJob(null);
    }
  };

  // Computed
  const pendingJobs = jobs.filter(j => ['QUEUED', 'CLAIMED', 'DOWNLOADING', 'LOCAL', 'READY_TO_PRINT'].includes(j.status));
  const printingJobs = jobs.filter(j => j.status === 'PRINTING');
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED');
  const failedJobs = jobs.filter(j => ['FAILED', 'PRINT_FAILED'].includes(j.status));


  const recentActivities = [...jobs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  // ----------------------------------------------------
  // Render Auth
  // ----------------------------------------------------
  if (authStatus === 'LOADING') {
    return (
      <div className="h-screen w-full bg-[#f6f7f9] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#6b7280]">
          <Loader2 className="animate-spin h-8 w-8" />
          <span className="text-sm font-medium">Connecting to PrintStation…</span>
        </div>
      </div>
    );
  }

  if (authStatus === 'SETUP' || authStatus === 'LOGIN') {
    return (
      <div className="h-screen w-full bg-[#f6f7f9] flex items-center justify-center font-sans p-4">
        <form
          onSubmit={e => handleAuthSubmit(e, authStatus === 'SETUP' ? '/api/auth/setup' : '/api/auth/login')}
          className="bg-white border border-[#e5e7eb] p-8 rounded-2xl w-full max-w-sm shadow-sm"
        >
          <div className="h-12 w-12 bg-[#111827] text-white rounded-xl flex items-center justify-center mb-6">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="text-[#111827] text-2xl font-semibold tracking-tight mb-1">PrintStation</h2>
          <p className="text-[#6b7280] text-sm mb-6">
            {authStatus === 'SETUP' ? 'Create a PIN to secure this station' : 'Enter your PIN to unlock the dashboard'}
          </p>
          <input
            type="password"
            autoFocus
            value={pin}
            placeholder="••••"
            onChange={e => setPin(e.target.value)}
            className="w-full bg-[#f6f7f9] border border-[#e5e7eb] rounded-xl p-3 text-[#111827] text-center tracking-[0.5em] text-lg focus:outline-none focus:border-[#111827] transition-all mb-2 font-mono"
          />
          {pinError && (
            <p className="text-red-500 text-sm font-medium mb-3 text-center">{pinError}</p>
          )}
          <button
            type="submit"
            className="w-full bg-[#111827] text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors shadow-sm mt-3"
          >
            {authStatus === 'SETUP' ? 'Create PIN & Continue' : 'Unlock Dashboard'}
          </button>
        </form>
      </div>
    );
  }

  // ----------------------------------------------------
  // Render Dashboard
  // ----------------------------------------------------
  const navItems = [
    { id: 'Overview', icon: LayoutDashboard, count: null },
    { id: 'Print Queue', icon: FileText, count: pendingJobs.length },
    { id: 'Printing', icon: Loader2, count: printingJobs.length },
    { id: 'Completed', icon: CheckCircle2, count: completedJobs.length },
    { id: 'Failed', icon: XCircle, count: failedJobs.length },
  ];

  const sysItems = [
    { id: 'Printer', icon: Printer },
    { id: 'Storage', icon: HardDrive },
    { id: 'Agent', icon: Activity },
    { id: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-full bg-[#f6f7f9] text-[#111827] font-sans overflow-hidden">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white text-[14px] font-semibold ${
              toast.type === 'success' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------- SIDEBAR ----------------- */}
      <aside className={`fixed md:relative z-30 h-full w-[240px] bg-[#111111] text-white flex flex-col shrink-0 transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-[72px] flex items-center px-5 shrink-0 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-white/10 rounded-lg flex items-center justify-center">
              <Printer className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-[14px] font-bold tracking-tight text-white leading-none">PrintStation</h1>
              <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-widest font-semibold">Operations</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          <div>
            <div className="px-2 mb-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Workspace</div>
            <div className="space-y-0.5">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-white/10 text-white'
                      : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className={`h-4 w-4 ${item.id === 'Printing' && printingJobs.length > 0 ? 'animate-spin text-blue-400' : ''}`} />
                    {item.id}
                  </div>
                  {item.count !== null && item.count > 0 && (
                    <span className="text-[11px] font-mono bg-white/10 px-1.5 py-0.5 rounded">{item.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="px-2 mb-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest">System</div>
            <div className="space-y-0.5">
              {sysItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    activeTab === item.id ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.id}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 text-[12px] font-medium text-white">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            Station Online
          </div>
          <div className="mt-1 text-[10px] text-gray-600 font-mono pl-4">PS-HYD-001</div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-[#111827]/50 z-20 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* ----------------- MAIN LAYOUT ----------------- */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* Topbar */}
        <header className="h-[72px] bg-white border-b border-[#e5e7eb] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-[#6b7280] hover:bg-gray-50 rounded-lg" onClick={() => setIsMobileMenuOpen(true)}>
              <LayoutDashboard className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-[18px] font-semibold text-[#111827] leading-tight">{activeTab}</h2>
              <p className="text-[12px] text-[#6b7280] mt-0.5 hidden sm:block">
                {activeTab === 'Overview' ? 'Monitor and manage your local print station' :
                  activeTab === 'Print Queue' ? `${pendingJobs.length} document${pendingJobs.length !== 1 ? 's' : ''} waiting to print` :
                  activeTab === 'Printing' ? `${printingJobs.length} job${printingJobs.length !== 1 ? 's' : ''} currently printing` :
                  activeTab === 'Completed' ? `${completedJobs.length} job${completedJobs.length !== 1 ? 's' : ''} printed successfully` :
                  activeTab === 'Failed' ? `${failedJobs.length} job${failedJobs.length !== 1 ? 's' : ''} require attention` :
                  `Manage ${activeTab.toLowerCase()}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-[13px] font-medium text-[#111827] mr-2">
              <span className="h-2 w-2 rounded-full bg-[#16A34A]"></span>
              Online
            </div>
            <button
              onClick={fetchData}
              className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-gray-50 text-[#6b7280] border border-transparent hover:border-[#e5e7eb] transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-gray-50 text-[#6b7280] border border-transparent hover:border-[#e5e7eb] transition-colors" title="Notifications">
              <Bell className="h-4 w-4" />
            </button>
            {/* Admin button → lock/re-auth */}
            <button
              onClick={async () => {
                await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' });
                setJobs([]);
                setPrinters([]);
                setHealth(null);
                setAuthStatus('LOGIN');
              }}
              className="flex items-center gap-2 ml-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-[#e5e7eb] text-[13px] font-semibold text-[#111827] transition-colors"
              title="Lock dashboard"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:block">Lock</span>
            </button>
          </div>
        </header>

        {/* Dashboard Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-[1600px] mx-auto">

            {/* ===== OVERVIEW ===== */}
            {activeTab === 'Overview' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* KPI Cards */}
                {[
                  { label: 'QUEUED', val: pendingJobs.length, sub: 'Waiting to print', color: 'text-amber-600', dot: 'bg-amber-500' },
                  { label: 'PRINTING', val: printingJobs.length, sub: 'Currently processing', color: 'text-blue-600', dot: 'bg-blue-500' },
                  { label: 'COMPLETED', val: completedJobs.length, sub: 'Successfully printed', color: 'text-green-600', dot: 'bg-green-500' },
                  { label: 'FAILED', val: failedJobs.length, sub: 'Requires attention', color: 'text-red-600', dot: 'bg-red-500' },
                ].map((kpi, i) => (
                  <div key={i} className="md:col-span-3 bg-white border border-[#e5e7eb] rounded-[16px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="text-[11px] font-bold text-[#6b7280] uppercase tracking-widest">{kpi.label}</div>
                      <span className={`h-2 w-2 rounded-full ${kpi.dot}`}></span>
                    </div>
                    <div className={`text-[44px] font-bold tracking-tight leading-none mb-1 font-mono ${kpi.color}`}>{kpi.val.toString().padStart(2, '0')}</div>
                    <div className="text-[13px] font-medium text-[#6b7280]">{kpi.sub}</div>
                  </div>
                ))}

                {/* Print Queue */}
                <div className="md:col-span-8 flex flex-col gap-4 mt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[20px] font-semibold text-[#111827]">Print Queue</h3>
                    <span className="text-[13px] text-[#6b7280]">{jobs.length} total</span>
                  </div>

                  {jobs.length === 0 ? (
                    <EmptyState icon={<FileText className="h-8 w-8" />} title="Queue is empty" description="Uploaded documents from the Customer App will appear here automatically." />
                  ) : (
                    <div className="flex flex-col gap-3">
                      <AnimatePresence>
                        {jobs.slice(0, 8).map(job => (
                          <JobCard
                            key={job.id}
                            job={job}
                            onView={j => setSelectedJob(j)}
                            onPrint={handlePrintConfirm}
                            isLoading={isActionLoading === job.id}
                          />
                        ))}
                      </AnimatePresence>
                      {jobs.length > 8 && (
                        <button onClick={() => setActiveTab('Print Queue')} className="text-[13px] font-semibold text-[#6b7280] hover:text-[#111827] flex items-center gap-1.5 justify-center py-2">
                          View all {jobs.length} jobs <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="md:col-span-4 flex flex-col gap-5 mt-2">

                  {/* Printer — System Print Mode */}
                  <div className="bg-white border border-[#e5e7eb] rounded-[16px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
                    <div className="text-[11px] font-bold text-[#6b7280] uppercase tracking-widest mb-4">Printing</div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A]"></span>
                      <span className="text-[15px] font-bold text-[#111827]">System Print Ready</span>
                    </div>
                    <p className="text-[13px] text-[#6b7280] mb-4 leading-relaxed">
                      Any printer installed on this computer is available. The system print dialog opens automatically when you click <strong>Print Document</strong>.
                    </p>
                    <div className="space-y-2 mb-4">
                      {[
                        'Select any Windows printer',
                        'Set copies, color, duplex',
                        'Print to PDF supported',
                      ].map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-[12px] text-[#6b7280]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A] shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>
                    {printers.length > 0 && (
                      <div className="bg-[#f6f7f9] rounded-lg p-3 text-[12px]">
                        <div className="font-bold text-[#6b7280] uppercase tracking-widest mb-2">Detected</div>
                        {printers.slice(0, 2).map((p, i) => (
                          <div key={i} className="flex items-center gap-2 text-[#111827] font-medium">
                            <span className={`h-1.5 w-1.5 rounded-full ${p.status === 'Idle' ? 'bg-[#16A34A]' : 'bg-blue-500'}`}></span>
                            <span className="truncate">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>


                  {/* System Health */}
                  <div className="bg-white border border-[#e5e7eb] rounded-[16px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
                    <div className="text-[11px] font-bold text-[#6b7280] uppercase tracking-widest mb-4">System Health</div>
                    {!health ? (
                      <div className="space-y-3 animate-pulse">
                        {[1,2,3,4].map(i => <div key={i} className="h-4 bg-gray-100 rounded w-full" />)}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[
                          { label: 'API', status: health.services.api, ok: health.services.api === 'online' },
                          { label: 'Database', status: health.services.database, ok: health.services.database === 'healthy' },
                          { label: 'Storage', status: health.services.storage, ok: health.services.storage === 'healthy' },
                          { label: 'Print Agent', status: 'running', ok: true },
                        ].map(s => (
                          <div key={s.label} className="flex items-center gap-3 text-[14px]">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${s.ok ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}></span>
                            <span className="text-[#6b7280] w-24">{s.label}</span>
                            <span className="font-medium text-[#111827] capitalize">{s.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white border border-[#e5e7eb] rounded-[16px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
                    <div className="text-[11px] font-bold text-[#6b7280] uppercase tracking-widest mb-4">Recent Activity</div>
                    {recentActivities.length === 0 ? (
                      <div className="text-[13px] text-[#6b7280]">No recent activity</div>
                    ) : (
                      <div className="space-y-4">
                        {recentActivities.map((act, i) => {
                          const isSuccess = act.status === 'COMPLETED';
                          const isFail = ['FAILED', 'PRINT_FAILED'].includes(act.status);
                          return (
                            <div key={i} className="flex items-start gap-3 cursor-pointer" onClick={() => setSelectedJob(act)}>
                              <span className={`h-2.5 w-2.5 rounded-full mt-1 shrink-0 ${isSuccess ? 'bg-[#16A34A]' : isFail ? 'bg-[#DC2626]' : 'bg-[#2563EB]'}`}></span>
                              <div className="min-w-0 flex-1">
                                <div className="text-[13px] font-semibold text-[#111827] truncate">{act.filename}</div>
                                <div className="text-[11px] text-[#9ca3af]">{timeAgo(act.created_at)} · {getFriendlyStatus(act.status).text}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* ===== PRINT QUEUE ===== */}
            {activeTab === 'Print Queue' && (
              <JobListPanel
                jobs={pendingJobs}
                title="Print Queue"
                emptyTitle="Queue is empty"
                emptyDesc="Documents uploaded from the Customer App will appear here, ready to print."
                onView={j => setSelectedJob(j)}
                onPrint={handlePrintConfirm}
                loadingId={isActionLoading}
              />
            )}

            {/* ===== PRINTING ===== */}
            {activeTab === 'Printing' && (
              <JobListPanel
                jobs={printingJobs}
                title="Currently Printing"
                emptyTitle="Nothing printing"
                emptyDesc="When a print job is sent to the printer, it will appear here."
                onView={j => setSelectedJob(j)}
                onPrint={handlePrintConfirm}
                loadingId={isActionLoading}
              />
            )}

            {/* ===== COMPLETED ===== */}
            {activeTab === 'Completed' && (
              <JobListPanel
                jobs={completedJobs}
                title="Completed Jobs"
                emptyTitle="No completed jobs"
                emptyDesc="Successfully printed documents will appear here."
                onView={j => setSelectedJob(j)}
                onPrint={handlePrintConfirm}
                loadingId={isActionLoading}
              />
            )}

            {/* ===== FAILED ===== */}
            {activeTab === 'Failed' && (
              <div className="flex flex-col gap-4">
                {failedJobs.length > 0 && (
                  <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-[14px] p-4">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                    <p className="text-[14px] font-medium text-red-700">
                      {failedJobs.length} job{failedJobs.length !== 1 ? 's' : ''} failed. Use the Retry button to attempt printing again.
                    </p>
                  </div>
                )}
                <JobListPanel
                  jobs={failedJobs}
                  title="Failed Jobs"
                  emptyTitle="No failed jobs"
                  emptyDesc="Any jobs that encounter printing errors will appear here for review and retry."
                  onView={j => setSelectedJob(j)}
                  onPrint={handlePrintConfirm}
                  loadingId={isActionLoading}
                />
              </div>
            )}

            {/* ===== PRINTER ===== */}
            {activeTab === 'Printer' && (
              <div className="max-w-2xl flex flex-col gap-6">
                <div className="bg-white border border-[#e5e7eb] rounded-[16px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[18px] font-semibold text-[#111827]">Printer Status</h3>
                    <button onClick={scanPrinters} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#e5e7eb] text-[13px] font-semibold text-[#111827] hover:bg-gray-50 transition-colors">
                      <RefreshCw className={`h-4 w-4 ${printerScanState === 'SCANNING' ? 'animate-spin' : ''}`} />
                      Scan
                    </button>
                  </div>

                  {printerScanState === 'SCANNING' ? (
                    <div className="flex items-center gap-4 p-6">
                      <Loader2 className="h-8 w-8 animate-spin text-[#6b7280]" />
                      <div>
                        <div className="text-[16px] font-semibold text-[#111827]">Scanning for printers…</div>
                        <div className="text-[13px] text-[#6b7280] mt-1">Detecting connected devices</div>
                      </div>
                    </div>
                  ) : printers.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-center">
                      <div className="h-16 w-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 mb-4">
                        <Printer className="h-8 w-8" />
                      </div>
                      <h4 className="text-[18px] font-semibold text-[#111827] mb-2">No Printers Found</h4>
                      <p className="text-[14px] text-[#6b7280] max-w-sm">Make sure your printer is connected and powered on, then scan again.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {printers.map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border border-[#e5e7eb] rounded-xl">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-gray-50 rounded-xl flex items-center justify-center">
                              <Printer className="h-6 w-6 text-[#6b7280]" />
                            </div>
                            <div>
                              <div className="text-[15px] font-semibold text-[#111827]">{p.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`h-2 w-2 rounded-full ${p.status === 'Idle' ? 'bg-[#16A34A]' : 'bg-[#2563EB]'}`}></span>
                                <span className="text-[13px] text-[#6b7280]">{p.status}</span>
                                {p.isDefault && <span className="text-[11px] font-bold bg-[#111827] text-white px-2 py-0.5 rounded-full">Default</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== STORAGE ===== */}
            {activeTab === 'Storage' && (
              <div className="max-w-2xl flex flex-col gap-6">
                <div className="bg-white border border-[#e5e7eb] rounded-[16px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <h3 className="text-[18px] font-semibold text-[#111827] mb-6">Storage Overview</h3>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-[#f6f7f9] rounded-xl p-5">
                      <div className="text-[11px] font-bold text-[#6b7280] uppercase tracking-widest mb-2">Total Jobs</div>
                      <div className="text-[32px] font-bold text-[#111827] font-mono">{jobs.length.toString().padStart(2,'0')}</div>
                    </div>
                    <div className="bg-[#f6f7f9] rounded-xl p-5">
                      <div className="text-[11px] font-bold text-[#6b7280] uppercase tracking-widest mb-2">Total Size</div>
                      <div className="text-[32px] font-bold text-[#111827] font-mono">{formatBytes(jobs.reduce((acc, j) => acc + (j.file_size || 0), 0))}</div>
                    </div>
                  </div>

                  <div className="text-[12px] font-bold text-[#6b7280] uppercase tracking-widest mb-3">Files on Disk</div>
                  {jobs.length === 0 ? (
                    <div className="flex items-center gap-4 p-6 bg-[#f6f7f9] rounded-xl">
                      <FolderOpen className="h-8 w-8 text-gray-400" />
                      <div>
                        <div className="text-[15px] font-semibold text-[#111827]">No files stored</div>
                        <div className="text-[13px] text-[#6b7280]">Uploaded PDFs will be listed here</div>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#e5e7eb] border border-[#e5e7eb] rounded-xl overflow-hidden">
                      {jobs.map(job => (
                        <div key={job.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center shrink-0">
                              <span className="text-red-500 font-bold text-[10px]">PDF</span>
                            </div>
                            <div className="min-w-0">
                              <div className="text-[13px] font-semibold text-[#111827] truncate">{job.filename}</div>
                              <div className="text-[11px] text-[#9ca3af] font-mono">{job.cloud_job_id}</div>
                            </div>
                          </div>
                          <div className="text-[13px] text-[#6b7280] font-medium shrink-0 ml-4">{formatBytes(job.file_size)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== AGENT ===== */}
            {activeTab === 'Agent' && (
              <div className="max-w-2xl flex flex-col gap-6">
                <div className="bg-white border border-[#e5e7eb] rounded-[16px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <h3 className="text-[18px] font-semibold text-[#111827] mb-6">Print Agent</h3>
                  <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-100 rounded-xl mb-6">
                    <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Activity className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-green-900">Agent Running</div>
                      <div className="text-[13px] text-green-700 mt-0.5">Monitoring print queue every 5 seconds</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      { icon: <Server className="h-5 w-5" />, label: 'Express API', val: health?.services.api || 'Checking…', ok: health?.services.api === 'online' },
                      { icon: <Database className="h-5 w-5" />, label: 'SQLite Database', val: health?.services.database || 'Checking…', ok: health?.services.database === 'healthy' },
                      { icon: <HardDrive className="h-5 w-5" />, label: 'File Storage', val: health?.services.storage || 'Checking…', ok: health?.services.storage === 'healthy' },
                      { icon: <Printer className="h-5 w-5" />, label: 'Print Driver', val: printers.length > 0 ? `${printers.length} printer(s)` : 'Not detected', ok: printers.length > 0 },
                      { icon: <Wifi className="h-5 w-5" />, label: 'LAN Endpoint', val: 'http://192.168.0.108:3000', ok: true },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border border-[#e5e7eb] rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${item.ok ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                            {item.icon}
                          </div>
                          <span className="text-[14px] font-semibold text-[#111827]">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${item.ok ? 'bg-[#16A34A]' : 'bg-gray-400'}`}></span>
                          <span className="text-[13px] text-[#6b7280] font-medium capitalize font-mono">{item.val}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-[#e5e7eb] rounded-[16px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <div className="text-[12px] font-bold text-[#6b7280] uppercase tracking-widest mb-4">Job Statistics</div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Total Processed', val: jobs.length, color: 'text-[#111827]' },
                      { label: 'Success Rate', val: jobs.length > 0 ? `${Math.round((completedJobs.length / jobs.length) * 100)}%` : 'N/A', color: 'text-green-600' },
                      { label: 'Pending', val: pendingJobs.length, color: 'text-amber-600' },
                      { label: 'Failed', val: failedJobs.length, color: 'text-red-600' },
                    ].map((s, i) => (
                      <div key={i} className="bg-[#f6f7f9] rounded-xl p-4">
                        <div className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-widest mb-1">{s.label}</div>
                        <div className={`text-[28px] font-bold font-mono ${s.color}`}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ===== SETTINGS ===== */}
            {activeTab === 'Settings' && (
              <div className="max-w-2xl flex flex-col gap-6">
                <div className="bg-white border border-[#e5e7eb] rounded-[16px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <h3 className="text-[18px] font-semibold text-[#111827] mb-6">Station Settings</h3>

                  <div className="space-y-5">
                    {[
                      { label: 'Station ID', val: 'PS-HYD-001', mono: true },
                      { label: 'API Endpoint', val: 'http://192.168.0.108:3000', mono: true },
                      { label: 'Customer Portal', val: 'http://192.168.0.108:3001', mono: true },
                      { label: 'Admin Dashboard', val: 'http://192.168.0.108:5173', mono: true },
                      { label: 'Database', val: 'SQLite (local)', mono: false },
                      { label: 'Storage Path', val: 'downloads/jobs/', mono: true },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-[#f3f4f6] pb-4 last:border-none last:pb-0">
                        <span className="text-[14px] text-[#6b7280]">{row.label}</span>
                        <span className={`text-[14px] font-semibold text-[#111827] ${row.mono ? 'font-mono' : ''}`}>{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-[#e5e7eb] rounded-[16px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <h3 className="text-[18px] font-semibold text-[#111827] mb-2">Security</h3>
                  <p className="text-[14px] text-[#6b7280] mb-5">Reset your admin PIN.</p>
                  <button
                    onClick={async () => {
                      await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' });
                      setAuthStatus('LOGIN');
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111827] text-white text-[14px] font-semibold hover:bg-gray-800 transition-colors"
                  >
                    <Lock className="h-4 w-4" />
                    Lock & Re-authenticate
                  </button>
                </div>

                <div className="bg-white border border-[#e5e7eb] rounded-[16px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[18px] font-semibold text-[#111827]">Connected Printers</h3>
                    <button onClick={scanPrinters} className="flex items-center gap-2 text-[13px] font-semibold text-[#6b7280] hover:text-[#111827]">
                      <RefreshCw className={`h-4 w-4 ${printerScanState === 'SCANNING' ? 'animate-spin' : ''}`} />
                      Rescan
                    </button>
                  </div>
                  {printers.length === 0 ? (
                    <p className="text-[14px] text-[#6b7280]">No printers detected. Ensure your printer is on and connected.</p>
                  ) : (
                    <div className="space-y-3">
                      {printers.map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-[#f6f7f9] rounded-xl">
                          <div className="flex items-center gap-3">
                            <Printer className="h-5 w-5 text-[#6b7280]" />
                            <span className="text-[14px] font-semibold text-[#111827]">{p.name}</span>
                            {p.isDefault && <span className="text-[11px] font-bold bg-[#111827] text-white px-2 py-0.5 rounded-full">Default</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${p.status === 'Idle' ? 'bg-[#16A34A]' : 'bg-[#2563EB]'}`}></span>
                            <span className="text-[13px] text-[#6b7280]">{p.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ------------------------------------------------
          Job Details Drawer
      ------------------------------------------------ */}
      <AnimatePresence>
        {selectedJob && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedJob(null)}
              className="absolute inset-0 bg-[#111827]/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="w-full max-w-[440px] bg-[#f6f7f9] shadow-2xl relative z-50 flex flex-col h-full border-l border-[#e5e7eb]"
            >
              <div className="h-[72px] flex items-center justify-between px-6 border-b border-[#e5e7eb] shrink-0 bg-white">
                <h3 className="text-[13px] font-bold text-[#6b7280] uppercase tracking-widest">Job Details</h3>
                <button onClick={() => setSelectedJob(null)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e5e7eb] text-[#6b7280] hover:text-[#111827] transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">

                {/* Document Header */}
                <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex flex-col items-center text-center">
                  <div className="h-16 w-16 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center text-red-500 font-bold text-sm mb-4">PDF</div>
                  <h4 className="text-[18px] font-semibold text-[#111827] break-all leading-snug mb-3">{selectedJob.filename}</h4>
                  <StatusBadge status={selectedJob.status} />
                </div>

                {/* Job Info */}
                <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
                  <div className="text-[11px] font-bold text-[#6b7280] uppercase tracking-widest mb-4">Job Information</div>
                  <div className="space-y-3">
                    {[
                      { label: 'Job ID', val: selectedJob.cloud_job_id, mono: true },
                      { label: 'Uploaded', val: new Date(selectedJob.created_at).toLocaleString() },
                      { label: 'File Size', val: formatBytes(selectedJob.file_size) },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-[14px] text-[#6b7280]">{row.label}</span>
                        <span className={`text-[14px] font-semibold text-[#111827] ${row.mono ? 'font-mono bg-[#f6f7f9] px-2 py-0.5 rounded text-[13px]' : ''}`}>{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Print Settings */}
                <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
                  <div className="text-[11px] font-bold text-[#6b7280] uppercase tracking-widest mb-4">Print Settings</div>
                  <div className="space-y-3">
                    {[
                      { label: 'Copies', val: selectedJob.copies },
                      { label: 'Color Mode', val: selectedJob.color_mode ? 'Color' : 'Black & White' },
                      { label: 'Sides', val: selectedJob.page_range === 'double' ? 'Double-sided' : 'Single-sided' },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-[14px] text-[#6b7280]">{row.label}</span>
                        <span className="text-[14px] font-semibold text-[#111827]">{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Error Details */}
                {selectedJob.error_message && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-5">
                    <div className="text-[11px] font-bold text-red-600 uppercase tracking-widest mb-2">Error Details</div>
                    <div className="text-[13px] font-medium text-red-700">{selectedJob.error_message}</div>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-[#e5e7eb] bg-white space-y-3">
                {/* View Document Button */}
                <button
                  onClick={() => setViewerJob(selectedJob)}
                  className="w-full py-3 rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 bg-white border border-[#e5e7eb] hover:bg-gray-50 text-[#111827] transition-colors"
                >
                  <Eye className="h-5 w-5" />
                  View Document
                </button>

                {/* System Print Button */}
                {selectedJob.status === 'COMPLETED' ? (
                  <div className="w-full py-3.5 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 bg-green-50 border border-green-100 text-green-700">
                    <CheckCircle2 className="h-5 w-5" /> Printed Successfully
                  </div>
                ) : selectedJob.status === 'PRINTING' ? (
                  <button
                    onClick={() => handleMarkPrinted(selectedJob)}
                    className="w-full py-3.5 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle2 className="h-5 w-5" /> Mark as Printed
                  </button>
                ) : (
                  <button
                    onClick={() => handlePrintConfirm(selectedJob)}
                    disabled={!['LOCAL', 'READY_TO_PRINT', 'FAILED', 'PRINT_FAILED', 'QUEUED', 'CLAIMED', 'DOWNLOADING'].includes(selectedJob.status)}
                    className={`w-full py-3.5 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 transition-colors shadow-sm ${
                      ['LOCAL', 'READY_TO_PRINT', 'FAILED', 'PRINT_FAILED', 'QUEUED', 'CLAIMED', 'DOWNLOADING'].includes(selectedJob.status)
                        ? ['FAILED', 'PRINT_FAILED'].includes(selectedJob.status)
                          ? 'bg-amber-600 text-white hover:bg-amber-700'
                          : 'bg-[#111827] text-white hover:bg-black'
                        : 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed'
                    }`}
                  >
                    <Printer className="h-5 w-5" />
                    {['FAILED', 'PRINT_FAILED'].includes(selectedJob.status) ? 'Retry — Open Print Dialog' : 'Print — Open System Dialog'}
                  </button>
                )}

                <button
                  onClick={() => setSelectedJob(null)}
                  className="w-full py-3 rounded-xl font-semibold text-[14px] text-[#6b7280] bg-transparent border border-[#e5e7eb] hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------
          Document Viewer Modal
      ------------------------------------------------ */}
      <AnimatePresence>
        {viewerJob && (() => {
          const fileUrl = apiUrl(`/api/jobs/${viewerJob.id}/document`);
          const ext = viewerJob.filename.split('.').pop()?.toLowerCase() || 'pdf';
          const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tiff', 'tif'].includes(ext);
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between px-5 py-3 bg-[#111111] border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-white truncate">{viewerJob.filename}</p>
                    <p className="text-[11px] text-gray-500 font-mono">{viewerJob.cloud_job_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handlePrintConfirm(viewerJob)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-[#111827] text-[13px] font-semibold hover:bg-gray-100 transition-colors"
                  >
                    <Printer className="h-4 w-4" /> Print
                  </button>
                  <a
                    href={apiUrl(`/api/jobs/${viewerJob.id}/document`)}
                    download={viewerJob.filename}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[13px] font-semibold transition-colors"
                  >
                    <Download className="h-4 w-4" /> Download
                  </a>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[13px] font-semibold transition-colors"
                  >
                    <Maximize2 className="h-4 w-4" /> Open Tab
                  </a>
                  <button
                    onClick={() => setViewerJob(null)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto flex items-center justify-center p-4 md:p-8">
                {isImage ? (
                  <img src={fileUrl} alt={viewerJob.filename} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                ) : (
                  <iframe
                    src={`${fileUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                    title={viewerJob.filename}
                    className="w-full h-full rounded-lg shadow-2xl border-0"
                    style={{ minHeight: '70vh' }}
                  />
                )}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ------------------------------------------------
          Print Confirmation Modal
          (appears after system print dialog closes)
      ------------------------------------------------ */}
      <AnimatePresence>
        {printConfirmJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-[#111827]/60 backdrop-blur-sm" onClick={() => setPrintConfirmJob(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center text-center"
            >
              {/* Icon */}
              <div className="h-16 w-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mb-5">
                <Printer className="h-8 w-8 text-blue-600" />
              </div>

              <h3 className="text-[22px] font-bold text-[#111827] mb-2">Did it print?</h3>
              <p className="text-[14px] text-[#6b7280] mb-2">
                <span className="font-semibold text-[#111827]">{printConfirmJob.filename}</span>
              </p>
              <p className="text-[13px] text-[#9ca3af] mb-7">
                The system print dialog was opened. Confirm whether the document physically printed.
              </p>

              {/* Info strip */}
              <div className="w-full bg-[#f6f7f9] rounded-xl p-4 mb-6 text-left space-y-2">
                {[
                  { label: 'Copies', val: printConfirmJob.copies },
                  { label: 'Color', val: printConfirmJob.color_mode ? 'Color' : 'Black & White' },
                  { label: 'Sides', val: printConfirmJob.page_range === 'double' ? 'Double-sided' : 'Single-sided' },
                ].map((r, i) => (
                  <div key={i} className="flex justify-between text-[13px]">
                    <span className="text-[#6b7280]">{r.label}</span>
                    <span className="font-semibold text-[#111827]">{r.val}</span>
                  </div>
                ))}
              </div>

              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={() => handleMarkPrinted(printConfirmJob)}
                  disabled={isActionLoading === printConfirmJob.id}
                  className="w-full py-3.5 rounded-xl font-bold text-[15px] bg-[#16A34A] text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isActionLoading === printConfirmJob.id
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : <CheckCircle2 className="h-5 w-5" />
                  }
                  Yes — Mark as Printed
                </button>
                <button
                  onClick={() => handleMarkFailed(printConfirmJob, 'Print cancelled or did not complete')}
                  disabled={isActionLoading === printConfirmJob.id}
                  className="w-full py-3 rounded-xl font-semibold text-[14px] text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="h-5 w-5" /> No — Mark as Failed
                </button>
                <button
                  onClick={() => setPrintConfirmJob(null)}
                  className="w-full py-2.5 rounded-xl font-semibold text-[13px] text-[#6b7280] hover:text-[#111827] transition-colors"
                >
                  Decide Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
