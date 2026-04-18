"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";
import { SUPPORT_FAQS, SUPPORT_TEMPLATES } from "@/lib/support-content";

export default function RiderSupportPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const templateOptions = SUPPORT_TEMPLATES.rider;
  const faqItems = SUPPORT_FAQS.rider;

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (selectedTicketId) {
      fetchMessages(selectedTicketId);
      const interval = setInterval(() => fetchMessages(selectedTicketId), 8000);
      return () => clearInterval(interval);
    }
  }, [selectedTicketId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/support/tickets");
      const data = await res.json();
      if (data.tickets) setTickets(data.tickets);
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (id: string) => {
    try {
      const res = await fetch(`/api/support/tickets?id=${id}`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const handleSendMessage = async (subject?: string) => {
    const msg = newMessage.trim();
    if (!msg) return;
    setIsSending(true);
    try {
      const body: any = { message: msg };
      if (selectedTicketId) {
        body.ticketId = selectedTicketId;
      } else {
        body.subject = subject || newSubject || "ติดต่อแอดมิน";
      }
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage("");
        setNewSubject("");
        setShowNewTicket(false);
        if (data.ticketId) {
          setSelectedTicketId(data.ticketId);
        }
        fetchTickets();
        if (selectedTicketId || data.ticketId) {
          fetchMessages(selectedTicketId || data.ticketId);
        }
      }
    } catch (err) {
      console.error("Failed to send:", err);
    } finally {
      setIsSending(false);
    }
  };

  const applyTemplate = (templateId: string) => {
    const tpl = templateOptions.find((item) => item.id === templateId);
    if (!tpl) return;
    setSelectedTemplateId(templateId);
    setNewSubject(tpl.subject);
    setNewMessage(tpl.message);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-emerald-100 text-emerald-700";
      case "pending": return "bg-amber-100 text-amber-700";
      case "resolved": return "bg-blue-100 text-blue-700";
      case "closed": return "bg-slate-100 text-slate-500";
      default: return "bg-slate-100 text-slate-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "open": return t("support.statusOpen") || "เปิดอยู่";
      case "pending": return t("support.statusPending") || "รอตอบ";
      case "resolved": return t("support.statusResolved") || "แก้ไขแล้ว";
      case "closed": return t("support.statusClosed") || "ปิดแล้ว";
      default: return status;
    }
  };

  // Chat view (when a ticket is selected)
  if (selectedTicketId) {
    const ticket = tickets.find(t => t.id === selectedTicketId);
    return (
      <div className="flex flex-col h-dvh bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <button
            onClick={() => { setSelectedTicketId(null); setMessages([]); }}
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center active:scale-90 transition-all"
          >
            <Icons.Back size={18} className="text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black text-slate-900 truncate">{ticket?.subject || "ติดต่อแอดมิน"}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${getStatusColor(ticket?.status || "open")}`}>
                {getStatusLabel(ticket?.status || "open")}
              </span>
              <span className="text-[9px] text-slate-400 font-bold">
                #{selectedTicketId.slice(-6)}
              </span>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-28">
          {messages.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Icons.Chat size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-xs font-bold">{t("support.noMessages") || "ยังไม่มีข้อความ"}</p>
            </div>
          )}
          {messages.map((m) => {
            const isMe = m.senderType === "rider" || m.senderType === "store";
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-fade-in`}>
                <div className={`max-w-[80%]`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm
                    ${isMe
                      ? "bg-primary text-white rounded-tr-sm"
                      : "bg-white text-slate-700 border border-slate-100 rounded-tl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                  <p className={`text-[9px] font-bold text-slate-400 mt-1 px-1 ${isMe ? "text-right" : "text-left"}`}>
                    {isMe ? (t("support.you") || "คุณ") : (t("support.admin") || "แอดมิน")} • {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-lg z-20">
          <div className="bg-slate-50 rounded-2xl p-1.5 pl-5 flex items-center gap-2 border border-slate-100">
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendMessage()}
              placeholder={t("support.typePlaceholder") || "พิมพ์ข้อความ..."}
              className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm font-bold text-slate-700 placeholder:text-slate-400"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isSending || !newMessage.trim()}
              className="bg-primary text-white w-11 h-11 rounded-[1rem] flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-90 transition-all disabled:opacity-50"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Ticket list view
  return (
    <div className="flex flex-col min-h-dvh bg-slate-50">
      {/* Header */}
      <header className="bg-primary text-white px-5 pt-12 pb-8 rounded-b-[2rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push("/rider/profile")}
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:scale-90 transition-all"
          >
            <Icons.Back size={18} className="text-white" />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight">{t("support.title") || "ติดต่อแอดมิน"}</h1>
            <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">{t("support.subtitle") || "ระบบแจ้งเรื่อง / สอบถาม"}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 px-5 pt-6 pb-24 space-y-4">
        <section className="space-y-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] pl-1">เทมเพลตยอดนิยมสำหรับไรเดอร์</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {templateOptions.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => {
                  setShowNewTicket(true);
                  applyTemplate(tpl.id);
                }}
                className="shrink-0 px-3 py-2 rounded-xl bg-white border border-slate-100 text-xs font-bold text-slate-700 active:scale-95 transition-all"
              >
                {tpl.title}
              </button>
            ))}
          </div>
        </section>

        {/* New Ticket Button */}
        <button
          onClick={() => setShowNewTicket(true)}
          className="w-full bg-white p-5 rounded-2xl border-2 border-dashed border-primary/20 flex items-center gap-4 hover:border-primary/40 active:scale-[0.98] transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
            <Icons.Edit size={22} />
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-slate-900">{t("support.newTicket") || "แจ้งเรื่องใหม่"}</p>
            <p className="text-[10px] text-slate-400 font-bold">{t("support.newTicketDesc") || "สร้างรายการสอบถามหรือแจ้งปัญหา"}</p>
          </div>
        </button>

        <section className="space-y-2 mt-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] pl-1">Q&A พื้นฐาน</p>
          {faqItems.map((faq) => (
            <div key={faq.q} className="bg-white rounded-xl border border-slate-100 p-3">
              <p className="text-xs font-black text-slate-800">{faq.q}</p>
              <p className="text-xs text-slate-500 mt-1">{faq.a}</p>
            </div>
          ))}
        </section>

        {/* Ticket List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Icons.Chat size={36} className="text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-500">{t("support.emptyTickets") || "ยังไม่มีรายการ"}</p>
            <p className="text-xs text-slate-400 mt-1">{t("support.emptyTicketsDesc") || "เมื่อคุณแจ้งเรื่อง จะปรากฏที่นี่"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] pl-1">{t("support.myTickets") || "รายการของฉัน"}</p>
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className="w-full bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 active:scale-[0.98] transition-all shadow-sm text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icons.Chat size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-black text-slate-900 truncate">{ticket.subject || "ติดต่อแอดมิน"}</p>
                    {(ticket.unreadCount > 0) && (
                      <span className="w-5 h-5 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shrink-0 ml-2">
                        {ticket.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{ticket.lastMessage || "..."}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${getStatusColor(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">
                      {ticket.lastMessageAt ? new Date(ticket.lastMessageAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                </div>
                <Icons.ChevronRight size={16} className="text-slate-200 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showNewTicket && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewTicket(false)} />
          <div className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-2xl p-6 pb-8 relative z-10 animate-slide-up shadow-2xl">
            <div className="w-12 h-1.5 bg-orange-100 rounded-full mx-auto mb-6 sm:hidden" />
            <h3 className="text-lg font-black text-slate-900 mb-1">{t("support.newTicket") || "แจ้งเรื่องใหม่"}</h3>
            <p className="text-xs text-slate-400 font-bold mb-5">{t("support.newTicketModalDesc") || "กรอกหัวข้อและรายละเอียดที่ต้องการแจ้ง"}</p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">เลือกเทมเพลต</label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {templateOptions.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => applyTemplate(tpl.id)}
                      className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                        selectedTemplateId === tpl.id
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-slate-50 border-slate-100 text-slate-600"
                      }`}
                    >
                      {tpl.title}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{t("support.subjectLabel") || "หัวข้อ"}</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  placeholder={t("support.subjectPlaceholder") || "เช่น สอบถามเรื่องงาน, แจ้งปัญหาระบบ"}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{t("support.messageLabel") || "ข้อความ"}</label>
                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder={t("support.messagePlaceholder") || "อธิบายรายละเอียดเพิ่มเติม..."}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewTicket(false)}
                className="flex-1 py-3.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest"
              >
                {t("common.cancel") || "ยกเลิก"}
              </button>
              <button
                onClick={() => handleSendMessage()}
                disabled={isSending || !newMessage.trim()}
                className="flex-1 py-3.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-95 transition-all"
              >
                {isSending ? (t("common.loading") || "กำลังส่ง...") : (t("support.sendTicket") || "ส่งเรื่อง")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
