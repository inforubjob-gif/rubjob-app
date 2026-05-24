"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import { Icons } from "@/components/ui/Icons";
import Badge from "@/components/ui/Badge";

interface CashAdvanceRecorderProps {
  orderId: string;
  storeId: string;
  storeName: string;
  rubberId: string;
  serviceDetails?: any;
  onRecorded?: () => void;
}

export default function CashAdvanceRecorder({ orderId, storeId, storeName, rubberId, serviceDetails, onRecorded }: CashAdvanceRecorderProps) {
  const [washers, setWashers] = useState<any[]>([]);
  const [dryers, setDryers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingRecords, setExistingRecords] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [totalAmount, setTotalAmount] = useState(0); // wait, it's a useMemo.
  const [manualAmount, setManualAmount] = useState("");
  const [note, setNote] = useState("");
  const [machineType, setMachineType] = useState<"separate" | "combo">("separate");

  // Selections
  const [selectedWasher, setSelectedWasher] = useState<{ id: string; waterTemp: string } | null>(null);
  const [selectedDryer, setSelectedDryer] = useState<string | null>(null);

  useEffect(() => {
    fetchCostMatrix();
    fetchExistingRecords();
  }, []);

  async function fetchCostMatrix() {
    try {
      const res = await fetch(`/api/rubber/cash-advance/store-costs?storeId=${storeId}`);
      const data = await res.json() as any;
      setWashers(data.washers || []);
      setDryers(data.dryers || []);
      const mType = data.machineType || "separate";
      setMachineType(mType);

      // Auto-select based on customer serviceDetails
      if (serviceDetails) {
        const targetKg = parseInt(serviceDetails.bagSize) || 9;
        
        // Find nearest washer size
        const wMatch = data.washers.find((w: any) => w.sizeKg >= targetKg) || data.washers[0];
        if (wMatch) {
          let temp = "cold";
          if (mType === "combo") {
            temp = serviceDetails.washMode === "extra" ? "extra" : "standard";
          }
          setSelectedWasher({ id: wMatch.id, waterTemp: temp });
        }

        // Find nearest dryer size if separate
        if (mType === "separate") {
          const dMatch = data.dryers.find((d: any) => d.sizeKg >= targetKg) || data.dryers[0];
          if (dMatch) setSelectedDryer(dMatch.id);
        }
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchExistingRecords() {
    try {
      const res = await fetch(`/api/rubber/cash-advance?rubberId=${rubberId}`);
      const data = await res.json() as any;
      const orderRecords = (data.records || []).filter((r: any) => r.orderId === orderId && r.status === "pending");
      setExistingRecords(orderRecords);
      if (orderRecords.length > 0) setSaved(true);
    } catch (err) {
      console.error(err);
    }
  }

  function getWasherPrice(washer: any, temp: string): number {
    if (temp === "standard") return washer.priceStandard;
    if (temp === "extra") return washer.priceExtra;
    if (temp === "cold") return washer.priceCold;
    if (temp === "warm") return washer.priceWarm;
    return washer.priceHot;
  }

  const computedTotal = useMemo(() => {
    let t = 0;
    if (selectedWasher) {
      const w = washers.find(x => x.id === selectedWasher.id);
      if (w) t += getWasherPrice(w, selectedWasher.waterTemp);
    }
    if (selectedDryer) {
      const d = dryers.find(x => x.id === selectedDryer);
      if (d) t += d.price;
    }
    return t;
  }, [selectedWasher, selectedDryer, washers, dryers]);

  async function handleSave() {
    if (!selectedWasher && !selectedDryer) {
      setError("กรุณาเลือกเครื่องอย่างน้อย 1 เครื่อง");
      return;
    }

    setIsSaving(true);
    setError("");

    const items: any[] = [];
    if (selectedWasher) {
      items.push({
        costMatrixId: selectedWasher.id,
        machineType: "washer",
        waterTemp: selectedWasher.waterTemp,
      });
    }
    if (selectedDryer) {
      items.push({
        costMatrixId: selectedDryer,
        machineType: "dryer",
      });
    }

    try {
      const payload: any = { rubberId, orderId, storeId, items, note };
      if (computedTotal === 0 && manualAmount) {
        payload.manualAmount = Number(manualAmount);
      }

      const res = await fetch("/api/rubber/cash-advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaved(true);
        setIsEditing(false);
        fetchExistingRecords();
        onRecorded?.();
      } else {
        const data = await res.json() as any;
        setError(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsSaving(false);
    }
  }

  const tempLabels: Record<string, { label: string; color: string; bg: string }> = {
    cold: { label: "เย็น", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
    warm: { label: "อุ่น", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
    hot: { label: "ร้อน", color: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
    standard: { label: "Standard", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
    extra: { label: "Extra", color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-white border-none shadow-xl shadow-primary/5 rounded-[2rem]">
        <div className="flex items-center justify-center py-6">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  if (washers.length === 0 && dryers.length === 0) {
    return (
      <Card className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem]">
        <div className="text-center py-4">
          <p className="text-xs font-black text-slate-400 uppercase">ร้านนี้ยังไม่ตั้งค่าตารางต้นทุน</p>
          <p className="text-[10px] text-slate-300 font-bold mt-1">Admin ต้องตั้งค่า Cost Matrix ก่อน</p>
        </div>
      </Card>
    );
  }

  // Show saved state
  if (saved && !isEditing) {
    const existingTotal = existingRecords.reduce((acc, r) => acc + (r.amount || r.manualAmount || 0), 0);
    return (
      <Card className="p-6 bg-emerald-50 border-2 border-emerald-100 rounded-[2rem] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Icons.Check size={24} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-emerald-700">บันทึกต้นทุนแล้ว</p>
            <p className="text-xs font-bold text-emerald-500 mt-0.5">ยอด ฿{existingTotal.toLocaleString()} • รอ Admin จ่ายคืน</p>
          </div>
          <button
            onClick={() => { setIsEditing(true); setSelectedWasher(null); setSelectedDryer(null); }}
            className="px-4 py-2 bg-white text-emerald-600 rounded-xl text-[10px] font-black uppercase border border-emerald-200 hover:bg-emerald-50 transition-all active:scale-95"
          >
            ✏️ แก้ไข
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white border-none shadow-xl shadow-amber-500/10 rounded-[2rem] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            💵
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase">บันทึกต้นทุนซัก</h3>
            <p className="text-[10px] font-bold text-slate-400">{storeName}</p>
          </div>
        </div>

        {/* Washer Selection */}
        {washers.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              🫧 {machineType === "combo" ? "เครื่องซักอบในตัว (Combo)" : "เครื่องซัก"}
            </p>
            {washers.every(w => getWasherPrice(w, 'cold') === 0) && (
              <div className="bg-rose-50 text-rose-500 text-xs p-3 rounded-xl mb-3 font-bold border border-rose-100 flex items-start gap-2">
                <span>⚠️</span>
                <span>ร้านค้านี้ยังไม่ได้ตั้งราคาในระบบ ตัวเลขจึงเป็น 0 กรุณาระบุยอดที่จ่ายจริงด้านล่าง</span>
              </div>
            )}
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-center">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-[9px] font-black text-slate-300 uppercase">ขนาด</th>
                    {machineType === "combo" ? (
                      <>
                        <th className="px-2 py-2 text-[9px] font-black text-emerald-500 uppercase">Standard</th>
                        <th className="px-2 py-2 text-[9px] font-black text-purple-500 uppercase">Extra</th>
                      </>
                    ) : (
                      <>
                        <th className="px-2 py-2 text-[9px] font-black text-blue-400 uppercase">เย็น</th>
                        <th className="px-2 py-2 text-[9px] font-black text-amber-500 uppercase">อุ่น</th>
                        <th className="px-2 py-2 text-[9px] font-black text-rose-400 uppercase">ร้อน</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {washers.map(w => (
                    <tr key={w.id}>
                      <td className="px-2 py-1.5">
                        <span className="text-xs font-black text-slate-700">{w.sizeLabel || `${w.sizeKg}kg`}</span>
                      </td>
                      {(machineType === "combo" ? ["standard", "extra"] as const : ["cold", "warm", "hot"] as const).map(temp => {
                        const price = getWasherPrice(w, temp);
                        const isSelected = selectedWasher?.id === w.id && selectedWasher?.waterTemp === temp;
                        return (
                          <td key={temp} className="px-1 py-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedWasher(isSelected ? null : { id: w.id, waterTemp: temp })}
                              className={`w-full py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 border-2 ${
                                isSelected
                                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-105"
                                  : `${tempLabels[temp].bg} ${tempLabels[temp].color} hover:opacity-80`
                              }`}
                            >
                              ฿{price}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dryer Selection */}
        {machineType === "separate" && dryers.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">🌀 เครื่องอบ (ถ้าใช้)</p>
            <div className="grid grid-cols-2 gap-2">
              {dryers.map(d => {
                const isSelected = selectedDryer === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDryer(isSelected ? null : d.id)}
                    className={`p-3 rounded-xl text-left transition-all active:scale-95 border-2 ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/30"
                        : "bg-orange-50 border-orange-200 text-orange-600 hover:opacity-80"
                    }`}
                  >
                    <p className="text-sm font-black">{d.sizeLabel || `${d.sizeKg}kg`}</p>
                    <p className={`text-[10px] font-bold ${isSelected ? "text-white/70" : "text-orange-400"}`}>
                      ฿{d.price} • {d.durationMinutes || "—"}นาที
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Total + Submit */}
        <div className="border-t border-slate-100 pt-6">
          {error && (
            <p className="text-xs font-bold text-rose-500 mb-3">{error}</p>
          )}
          
          <div className="flex items-end justify-between mb-6">
            <p className="text-xs font-black text-slate-400 uppercase">ยอดรวม</p>
            <p className="text-4xl font-black text-slate-800 italic pr-2">
              ฿{computedTotal === 0 && manualAmount ? manualAmount : computedTotal}
            </p>
          </div>

          {computedTotal === 0 && (
            <div className="mb-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                ยอดเงินที่จ่ายจริง (บาท)
              </label>
              <input 
                type="number" 
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="ระบุยอดเงิน (เช่น 120)"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-slate-900 font-bold focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>
          )}

          <div className="mb-6">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              เหตุผลการเปลี่ยนแปลง (ถ้ามี)
            </label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ลูกค้าให้ผ้ามาเยอะกว่าที่ระบุ, ตู้ 9kg ไม่ว่าง"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              rows={2}
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || totalAmount === 0}
            className="w-full bg-amber-500 text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/20 hover:bg-amber-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Icons.Check size={18} />
            )}
            {isSaving ? "กำลังบันทึก..." : `ยืนยันต้นทุน ฿${totalAmount.toLocaleString()}`}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={() => { setIsEditing(false); }}
              className="w-full mt-2 text-xs font-bold text-slate-400 py-2 hover:text-slate-600 transition-colors uppercase"
            >
              ยกเลิกการแก้ไข
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
