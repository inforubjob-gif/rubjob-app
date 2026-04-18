"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useEffect } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = typeof DAYS[number];

export default function RiderActiveHoursPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [riderId, setRiderId] = useState<string | null>(null);
  
  const [workingHours, setWorkingHours] = useState<Record<Day, { start: string, end: string, isOpen: boolean }>>(
    DAYS.reduce((acc, day) => ({
      ...acc,
      [day]: { start: "08:00", end: "22:00", isOpen: true }
    }), {} as Record<Day, { start: string, end: string, isOpen: boolean }>)
  );

  const [selectedDay, setSelectedDay] = useState<Day>("Mon");

  useEffect(() => {
    const localSession = localStorage.getItem("rubjob_rider_session");
    if (localSession) {
      const parsed = JSON.parse(localSession);
      setRiderId(parsed.id);
      fetchPrefs(parsed.id);
    } else {
      router.push("/rider/login");
    }
  }, [router]);

  async function fetchPrefs(id: string) {
    try {
      const res = await fetch(`/api/users/preferences?userId=${id}`);
      const data = await res.json();
      if (data.preferences?.activeHoursObj) {
        setWorkingHours(data.preferences.activeHoursObj);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const handleSave = async () => {
    if (!riderId) return;
    setIsSaving(true);
    
    // Create a string representation for the main page
    const mon = workingHours["Mon"];
    const activeHoursStr = mon.isOpen ? `${mon.start} - ${mon.end}` : "Varies";

    try {
      await fetch("/api/users/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: riderId, activeHoursObj: workingHours, activeHours: activeHoursStr })
      });
      router.back();
    } catch (error) {
      console.error("Failed to save active hours:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateHour = (day: Day, field: "start" | "end", value: string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const toggleDay = (day: Day) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], isOpen: !prev[day].isOpen }
    }));
  };

  const applyToAll = () => {
    const current = workingHours[selectedDay];
    setWorkingHours(prev => {
      const newState = { ...prev };
      DAYS.forEach(day => {
        if (newState[day].isOpen) {
           newState[day] = { ...current, isOpen: true };
        }
      });
      return newState;
    });
  };

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white px-5 pt-12 pb-4 border-b border-border sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-primary active:scale-95 transition-transform border border-orange-100"
          >
            <Icons.Back size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">{t("rider.profile.activeHours")}</h1>
            <p className="text-xs text-slate-400">Set availability for each day</p>
          </div>
          <Button 
            size="sm" 
            variant="primary" 
            className="rounded-xl px-4 font-black italic shadow-lg shadow-primary/20"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "..." : t("common.save")}
          </Button>
        </div>
      </header>

      <div className="p-5 space-y-6 animate-fade-in">
        {/* Day Selector Tabs */}
        <section>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1 mb-4">Select Day to Configure</p>
          <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
             {DAYS.map(day => (
                 <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`min-w-[70px] py-4 rounded-2xl border-2 font-black text-xs transition-all flex flex-col items-center gap-2 ${
                        selectedDay === day 
                            ? 'bg-primary border-primary text-slate-900 shadow-lg shadow-primary/20 scale-[1.05]' 
                            : workingHours[day].isOpen 
                                ? 'bg-white border-primary/20 text-primary' 
                                : 'bg-slate-100 border-transparent text-slate-400 opacity-50'
                    }`}
                 >
                    {day}
                    <div className={`w-1.5 h-1.5 rounded-full ${workingHours[day].isOpen ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                 </button>
             ))}
          </div>
        </section>

        {/* Selected Day Configuration */}
        <Card className="p-6 border-none shadow-xl shadow-primary/5 rounded-2xl bg-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
           
           <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{selectedDay}</h3>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Configure Availability</p>
              </div>
              <button 
                onClick={() => toggleDay(selectedDay)}
                className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${workingHours[selectedDay].isOpen ? 'bg-emerald-500' : 'bg-slate-200'}`}
              >
                <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${workingHours[selectedDay].isOpen ? 'transform translate-x-6' : ''}`} />
              </button>
           </div>

           {workingHours[selectedDay].isOpen ? (
             <div className="space-y-6 relative z-10">
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Start Time</span>
                      <input 
                         type="time" 
                         value={workingHours[selectedDay].start}
                         onChange={(e) => updateHour(selectedDay, "start", e.target.value)}
                         className="text-xl font-black text-slate-900 bg-transparent focus:outline-none"
                      />
                   </div>
                   <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">End Time</span>
                      <input 
                         type="time" 
                         value={workingHours[selectedDay].end}
                         onChange={(e) => updateHour(selectedDay, "end", e.target.value)}
                         className="text-xl font-black text-slate-900 bg-transparent focus:outline-none"
                      />
                   </div>
                </div>

                <div className="pt-4 flex gap-3">
                   <Button 
                     variant="outline" 
                     fullWidth 
                     size="sm" 
                     className="rounded-2xl py-4 border-2 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                     onClick={applyToAll}
                   >
                      <Icons.Clock size={16} /> Apply to all days
                   </Button>
                </div>
             </div>
           ) : (
             <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Off-duty on {selectedDay}</p>
             </div>
           )}
        </Card>

        {/* Global Reminder */}
        <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 mt-4">
            <div className="flex items-start gap-3">
                <Icons.Shield size={16} className="text-primary mt-0.5" />
                <p className="text-[10px] text-orange-700 font-bold leading-relaxed uppercase">
                    Our algorithm prioritizes riders based on their declared active hours. Stay active to earn more!
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
