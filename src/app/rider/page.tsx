"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant, statusLabel } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Icons, getServiceIcon } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useLiff } from "@/components/providers/LiffProvider";

import Modal from "@/components/ui/Modal";

// Mock Data for Rider
const MOCK_TOTAL_DELIVERIES = 15;
const MOCK_RIDER_EARNINGS = 850;

const INITIAL_AVAILABLE_JOBS = [
  { id: "DLV-001", type: "pickup", store: "Rubjob Phrom Phong", customer: "The EmQuartier", dist: "0.5", earn: 45 },
  { id: "DLV-002", type: "delivery", store: "Rubjob Thong Lo", customer: "Grande Centre Point", dist: "1.8", earn: 65 },
];

const INITIAL_ACTIVE_JOBS = [
  { id: "DLV-000", type: "delivery", status: "delivering_to_customer", location: "Sukhumvit 49", time: "10 mins" },
];

export default function RiderDashboard() {
  const { t } = useTranslation();
  const { profile } = useLiff();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"available" | "active">("available");
  const [isLoading, setIsLoading] = useState(true);
  const [workStatus, setWorkStatus] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  
  // Lifted state
  const [availableJobs, setAvailableJobs] = useState(INITIAL_AVAILABLE_JOBS);
  const [activeJobs, setActiveJobs] = useState(INITIAL_ACTIVE_JOBS);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleAcceptJob = (jobId: string) => {
    // Navigate to the order detail page with map and details
    setSelectedJob(null);
    router.push(`/rider/orders/${jobId}`);
  };

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 relative overflow-hidden">
      {/* Background Gradient Layer */}
      <div className="absolute top-0 left-0 right-0 h-[450px] bg-gradient-to-b from-primary via-primary to-slate-50 z-0" />

      {/* Rider Header */}
      <header className="relative z-10 px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-lg shadow-primary-dark/10">
              <Icons.Truck size={32} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em] leading-none mb-1 truncate">{t("rider.hero")}</p>
              <h1 className="text-xl font-black tracking-tight truncate drop-shadow-sm">{profile?.displayName || "Rider Tester"}</h1>
            </div>
          </div>
          <button className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md shadow-primary-dark/10 active:scale-90 transition-transform">
            <Icons.Bell size={20} className="text-white" />
          </button>
        </div>

        {/* Work Status Toggle (Dashboard Version) */}
        <Card className="mb-6 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl shadow-primary-dark/20 rounded-[2rem] p-4 text-white">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${workStatus ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white/60'}`}>
                      <Icons.Shield size={20} />
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none mb-1">{t("rider.profile.workStatus")}</p>
                      <p className="text-sm font-black uppercase tracking-tight">
                        {workStatus ? t("rider.profile.receivingJobs") : t("rider.profile.notReceiving")}
                      </p>
                  </div>
              </div>
              <button 
                onClick={() => setWorkStatus(!workStatus)}
                className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${workStatus ? 'bg-white shadow-lg shadow-white/20' : 'bg-white/20'}`}
              >
                <div className={`w-6 h-6 rounded-full shadow-md transition-all duration-300 ${workStatus ? 'bg-primary transform translate-x-6' : 'bg-white'}`} />
              </button>
           </div>
        </Card>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-[2rem] border border-white/10">
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">{t("rider.tasksToday")}</p>
            <p className="text-2xl font-black mt-1 text-white">{MOCK_TOTAL_DELIVERIES + (INITIAL_ACTIVE_JOBS.length - activeJobs.length) * -1}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-[2rem] border border-white/10">
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">{t("rider.earnings")}</p>
            <p className="text-2xl font-black mt-1 text-white">฿{MOCK_RIDER_EARNINGS.toLocaleString()}</p>
          </div>
        </div>
      </header>

      <div className="relative z-10 px-5 space-y-7 pt-2 animate-fade-in">
        {/* Tabs */}
        <div className="bg-white p-1.5 rounded-2xl flex shadow-sm border border-slate-200">
          <button
            onClick={() => setActiveTab("available")}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
              activeTab === "available" ? "bg-primary text-slate-900 shadow-lg shadow-primary/20 scale-[1.01]" : "text-white/70"
            }`}
          >
            {t("rider.availableJobs")}
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
              activeTab === "active" ? "bg-primary text-slate-900 shadow-lg shadow-primary/20 scale-[1.01]" : "text-white/70"
            }`}
          >
            {t("rider.myJobs")}
          </button>
        </div>
      </div>

      <div className="flex-1 px-5 pt-6 space-y-7 pb-24 animate-fade-in">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === "available" ? (
              <AvailableDeliveries 
                t={t} 
                router={router} 
                jobs={availableJobs} 
                onAccept={handleAcceptJob} 
                onViewDetails={(job) => setSelectedJob(job)}
              />
            ) : (
              <ActiveDeliveries 
                t={t} 
                router={router} 
                activeJobs={activeJobs}
              />
            )}
          </>
        )}
      </div>

      {/* Modern Job Detail Modal */}
      <Modal 
        isOpen={!!selectedJob} 
        onClose={() => setSelectedJob(null)}
        title={t("common.details")}
      >
        {selectedJob && (
          <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Virtual Route Connection */}
             <div className="relative h-24 bg-slate-50 rounded-[2rem] border-2 border-slate-100/50 flex items-center justify-between px-10 overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                
                <div className="relative z-10 flex flex-col items-center">
                   <div className="w-10 h-10 bg-black rounded-xl border-4 border-white shadow-xl flex items-center justify-center text-white">
                      <Icons.Logo size={20} variant="icon" />
                   </div>
                   <p className="text-[10px] font-black mt-2 uppercase tracking-tighter opacity-50">Store</p>
                </div>

                <div className="flex-1 px-4 relative">
                   <div className="h-1 bg-slate-200 rounded-full w-full">
                      <div className="h-full bg-primary w-2/3 rounded-full shadow-[0_0_8px_rgba(255,159,28,0.5)] animate-shimmer" />
                   </div>
                   <div className="absolute top-1/2 left-2/3 -translate-y-1/2 -translate-x-1/2">
                      <Icons.Bike size={18} className="text-primary transform scale-x-[-1] animate-bounce-slow" />
                   </div>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                   <div className="w-10 h-10 bg-primary rounded-xl border-4 border-white shadow-xl flex items-center justify-center text-slate-800">
                      <Icons.MapPin size={20} strokeWidth={3} />
                   </div>
                   <p className="text-[10px] font-black mt-2 uppercase tracking-tighter opacity-50">User</p>
                </div>
             </div>

             <div className="space-y-4">
               <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                        <Icons.User size={20} />
                     </div>
                     <div>
                        <p className="text-sm font-black text-slate-900 uppercase">Tawan Berkfah</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedJob.id}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-xl font-black text-slate-900 leading-none">฿{selectedJob.earn}</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{t("rider.earnAmount")}</p>
                  </div>
               </div>

               <div className="space-y-4 pt-2">
                 <div className="flex gap-4">
                    <Icons.Navigation size={18} className="text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{t("rider.pickup")}</p>
                       <p className="text-xs font-bold text-slate-700 leading-relaxed">{selectedJob.store}</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <Icons.MapPin size={18} className="text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{t("rider.delivery")}</p>
                       <p className="text-xs font-black text-slate-900 leading-relaxed">{selectedJob.customer}</p>
                       <p className="text-[10px] text-slate-400 font-bold mt-1">Sukhumvit 49, Wattana, Bangkok</p>
                    </div>
                 </div>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-4 mt-8 pt-4 border-t border-slate-100">
                <Button 
                   variant="secondary" 
                   fullWidth 
                   className="rounded-[1.5rem] py-5 font-black uppercase text-xs tracking-[0.2em]" 
                   onClick={() => setSelectedJob(null)}
                >
                   {t("common.close")}
                </Button>
                <Button 
                   fullWidth 
                   className="bg-green-600 hover:bg-green-700 text-white shadow-xl shadow-green-100 rounded-[1.5rem] py-5 font-black uppercase text-xs tracking-[0.2em] active:scale-95 transition-all"
                   onClick={() => handleAcceptJob(selectedJob.id)}
                >
                   {t("rider.acceptJob")}
                </Button>
             </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function AvailableDeliveries({ t, router, jobs, onAccept, onViewDetails }: { t: any, router: any, jobs: any[], onAccept: (id: string) => void, onViewDetails: (job: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">{t("rider.newRequests")}</h2>
        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{jobs.length} {t("staff.nearby")}</span>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-[2rem] border border-slate-100">
           <div className="text-4xl mb-3">✨</div>
           <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t("staff.noJobs") || "No new jobs nearby"}</p>
        </div>
      ) : (
        jobs.map((job) => (
          <Card key={job.id} className="p-4 border-2 border-transparent hover:border-primary/20 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
                {job.type === "pickup" ? <Icons.Package size={28} /> : <Icons.Truck size={28} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-primary-dark uppercase tracking-widest">{job.id}</span>
                  <span className="text-xs font-black text-slate-900">฿{job.earn}</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-1 leading-tight">
                  {job.type === "pickup" ? `${job.store} → Customer` : `Store → ${job.customer}`}
                </h3>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1"><Icons.MapPin size={12} className="text-primary" /> {job.dist} {t("rider.nearby")}</span>
                  <span className="flex items-center gap-1"><Icons.ArrowRight size={12} className="text-primary" /> {t("rider.earnAmount")}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="secondary" size="sm" onClick={() => onViewDetails(job)}>
                {t("common.details")}
              </Button>
              <Button 
                size="sm" 
                className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 active:scale-95 transition-transform"
                onClick={() => onAccept(job.id)}
              >
                {t("rider.acceptJob")}
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function ActiveDeliveries({ t, router, activeJobs }: { t: any, router: any, activeJobs: any[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">{t("staff.activeJobs")}</h2>
      </div>

      {activeJobs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-[2rem] border border-slate-100">
           <div className="text-4xl mb-3">🚛</div>
           <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t("staff.noJobs") || "No active jobs"}</p>
        </div>
      ) : (
        activeJobs.map((job) => (
          <Card key={job.id} className="p-4 border-l-4 border-primary shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 text-primary-dark rounded-xl flex items-center justify-center shrink-0">
                <Icons.Truck size={24} />
              </div>
              <div className="flex-1 border-r border-slate-100 mr-2 pr-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{job.id}</p>
                <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">{job.location}</h3>
              </div>
              <div className="text-right min-w-[80px]">
                <Badge variant={statusToBadgeVariant(job.status as any)}>
                  {t(`orders.status.${job.status}`)}
                </Badge>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{job.time}</p>
              </div>
            </div>
            <Button 
              fullWidth 
              className="mt-4 bg-primary text-white hover:bg-primary-dark shadow-xl shadow-primary/20 active:scale-95 transition-all" 
              size="sm"
              onClick={() => router.push(`/rider/orders/${job.id}`)}
            >
              {t("rider.manageTask")}
            </Button>
          </Card>
        ))
      )}
    </div>
  );
}
