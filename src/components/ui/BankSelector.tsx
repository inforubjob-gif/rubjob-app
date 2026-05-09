"use client";

import { useState } from "react";
import Modal from "./Modal";
import { Icons } from "./Icons";

export const THAI_BANKS = [
  { id: "kbank", name: "ธนาคารกสิกรไทย", logo: "/images/logo-bank/kbank.png" },
  { id: "scb", name: "ธนาคารไทยพาณิชย์", logo: "/images/logo-bank/scb.png" },
  { id: "bbl", name: "ธนาคารกรุงเทพ", logo: "/images/logo-bank/bbl.png" },
  { id: "ktb", name: "ธนาคารกรุงไทย", logo: "/images/logo-bank/ktb.png" },
  { id: "bay", name: "ธนาคารกรุงศรีอยุธยา", logo: "/images/logo-bank/bay.png" },
  { id: "ttb", name: "ทีเอ็มบีธนชาต (ttb)", logo: "/images/logo-bank/ttb.png" },
  { id: "gsb", name: "ธนาคารออมสิน", logo: "/images/logo-bank/gsb.png" },
  { id: "baac", name: "ธ.ก.ส.", logo: "/images/logo-bank/baac.png" },
  { id: "ghb", name: "ธนาคารอาคารสงเคราะห์", logo: "/images/logo-bank/ghb.png" },
  { id: "uob", name: "ธนาคารยูโอบี", logo: "/images/logo-bank/UOB.png" },
  { id: "cimb", name: "ธนาคารซีไอเอ็มบี", logo: "/images/logo-bank/Cimb.png" },
  { id: "tisco", name: "ธนาคารทิสโก้", logo: "/images/logo-bank/tisco.png" },
  { id: "kkp", name: "ธนาคารเกียรตินาคินภัทร", logo: "/images/logo-bank/kkp.png" },
  { id: "lh", name: "ธนาคารแลนด์ แอนด์ เฮ้าส์", logo: "/images/logo-bank/lh.png" },
  { id: "ibank", name: "ธนาคารอิสลามแห่งประเทศไทย", logo: "/images/logo-bank/ibank.png" },
  { id: "icbc", name: "ธนาคารไอซีบีซี", logo: "/images/logo-bank/ICBC.png" },
  { id: "boc", name: "ธนาคารแห่งประเทศจีน", logo: "/images/logo-bank/boc.png" },
];

interface BankSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export default function BankSelector({ value, onChange, label, placeholder = "เลือกธนาคาร" }: BankSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedBank = THAI_BANKS.find(b => b.id === value);

  return (
    <div className="space-y-2">
      {label && <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block">{label}</label>}
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full bg-slate-50 rounded-xl px-4 py-4 flex items-center justify-between font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-slate-100 active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          {selectedBank ? (
            <>
              <div className="w-6 h-6 shrink-0 bg-white rounded-full p-0.5 shadow-sm border border-slate-100 overflow-hidden">
                <img src={selectedBank.logo} alt={selectedBank.name} className="w-full h-full object-contain" />
              </div>
              <span className="text-slate-900">{selectedBank.name}</span>
            </>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        <Icons.ChevronRight size={18} className="text-slate-400" />
      </button>

      {/* Modal / Bottom Sheet */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="เลือกธนาคาร">
        <div className="w-full max-h-[60vh] overflow-y-auto no-scrollbar pb-6 space-y-1 mt-2">
          {THAI_BANKS.map((bank) => {
            const isSelected = value === bank.id;
            return (
              <button
                key={bank.id}
                onClick={() => {
                  onChange(bank.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                  isSelected ? "bg-primary/10 border-primary/20" : "bg-white hover:bg-slate-50 border-transparent"
                } border`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 shrink-0 bg-white rounded-full p-1.5 shadow-sm border border-slate-100 overflow-hidden">
                    <img src={bank.logo} alt={bank.name} className="w-full h-full object-contain" />
                  </div>
                  <span className={`text-sm font-bold ${isSelected ? "text-primary" : "text-slate-700"}`}>
                    {bank.name}
                  </span>
                </div>
                
                {/* Radio Circle */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSelected ? "border-primary" : "border-slate-300"
                }`}>
                  {isSelected && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                </div>
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
