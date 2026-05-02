"use client";

import { useState, useEffect, useRef } from "react";
import Card from "@/components/ui/Card";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

type FilterType = "all" | "customer" | "rider" | "store";

const FILTER_CONFIG: Record<FilterType, { label: string; icon: string; color: string; bg: string }> = {
  all:      { label: "ทั้งหมด",  icon: "💬", color: "text-slate-700", bg: "bg-slate-100" },
  customer: { label: "ลูกค้า",   icon: "👤", color: "text-emerald-700", bg: "bg-emerald-50" },
  rider:    { label: "ไรเดอร์",  icon: "🏍️", color: "text-blue-700", bg: "bg-blue-50" },
  store:    { label: "ร้านค้า",  icon: "🏪", color: "text-purple-700", bg: "bg-purple-50" },
};

function getUserTypeBadge(userType: string) {
  switch (userType) {
    case 'rider':
      return { label: 'RIDER', icon: '🏍️', badgeClass: 'bg-blue-50 text-blue-600 ring-blue-200', dotClass: 'bg-blue-500' };
    case 'store':
      return { label: 'STORE', icon: '🏪', badgeClass: 'bg-purple-50 text-purple-600 ring-purple-200', dotClass: 'bg-purple-500' };
    case 'unknown':
      return { label: 'UNKNOWN', icon: '❓', badgeClass: 'bg-slate-50 text-slate-500 ring-slate-200', dotClass: 'bg-slate-400' };
    default:
      return { label: 'CUSTOMER', icon: '👤', badgeClass: 'bg-emerald-50 text-emerald-600 ring-emerald-200', dotClass: 'bg-emerald-500' };
  }
}

function getChannelBadge(channel: string) {
  if (channel?.includes('line')) {
    return { label: 'LINE', color: 'bg-green-50 text-green-600', icon: '💬' };
  }
  return { label: 'In-App', color: 'bg-indigo-50 text-indigo-600', icon: '📱' };
}

export default function SupportCenterPage() {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ total: 0, customer: 0, rider: 0, store: 0, unknown: 0 });
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, [activeFilter]);

  useEffect(() => {
    if (selectedTicketId) {
      fetchMessages(selectedTicketId);
    }
  }, [selectedTicketId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchTickets = async () => {
    try {
      const filterParam = activeFilter !== "all" ? `&filter=${activeFilter}` : "";
      const res = await fetch(`/api/admin/support/tickets?_=${Date.now()}${filterParam}`);
      const data = await res.json();
      if (data.tickets) setTickets(data.tickets);
      if (data.counts) setCounts(data.counts);
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/support/tickets?id=${id}`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicketId) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/admin/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: selectedTicketId,
          text: replyText.trim(),
          adminName: t('admin.common.adminBadge')
        }),
      });
      if (res.ok) {
        setReplyText("");
        fetchMessages(selectedTicketId);
        fetchTickets();
      }
    } catch (err) {
      console.error("Reply failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);
  const typeBadge = selectedTicket ? getUserTypeBadge(selectedTicket.userType) : null;
  const channelBadge = selectedTicket ? getChannelBadge(selectedTicket.channel) : null;

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6 overflow-hidden">
      {/* ─── Sidebar: Ticket List ─── */}
      <div className="w-80 flex flex-col gap-4 h-full">
        <header>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('admin.support.title')}</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{t('admin.support.subtitle')}</p>
        </header>

        {/* ─── Filter Tabs ─── */}
        <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-xl">
          {(Object.keys(FILTER_CONFIG) as FilterType[]).map((key) => {
            const cfg = FILTER_CONFIG[key];
            const count = key === 'all' ? counts.total : (counts[key] || 0);
            return (
              <button
                key={key}
                onClick={() => { setActiveFilter(key); setIsLoading(true); }}
                className={`flex-1 py-2 px-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1
                  ${activeFilter === key 
                    ? 'bg-white shadow-md text-slate-900 scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                <span>{cfg.icon}</span>
                {count > 0 && (
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${activeFilter === key ? cfg.bg + ' ' + cfg.color : 'bg-slate-200 text-slate-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <Card className="flex-1 overflow-hidden flex flex-col bg-white border border-slate-200/60 shadow-sm rounded-xl">
          <div className="p-5 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('admin.support.activeChats')}</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {isLoading ? (
              <div className="p-10 flex justify-center"><div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin" /></div>
            ) : tickets.length === 0 ? (
              <div className="p-10 text-center text-slate-400 font-medium text-xs">{t('admin.support.empty')}</div>
            ) : (
              tickets.map((tk) => {
                const badge = getUserTypeBadge(tk.userType);
                const chBadge = getChannelBadge(tk.channel);
                return (
                  <button
                    key={tk.id}
                    onClick={() => setSelectedTicketId(tk.id)}
                    className={`w-full p-5 text-left transition-all hover:bg-slate-50 flex gap-4 items-start ${selectedTicketId === tk.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm">
                        {tk.userPicture ? (
                          <img src={tk.userPicture} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">{badge.icon}</span>
                        )}
                      </div>
                      {/* User Type Dot Overlay */}
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center shadow-md border-2 border-white ${badge.dotClass}`}>
                        <span className="text-[8px] text-white font-black">
                          {tk.userType === 'rider' ? 'R' : tk.userType === 'store' ? 'S' : 'C'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-black text-slate-900 truncate text-sm">{tk.userName || t('admin.common.customer')}</p>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md shrink-0 ring-1 ${badge.badgeClass}`}>
                            {badge.label}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                          {tk.lastMessageAt ? new Date(tk.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate leading-relaxed">
                        {tk.lastMessage || t('admin.support.openingTicket')}
                      </p>
                      {/* Channel Source */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${chBadge.color}`}>
                          {chBadge.icon} {chBadge.label}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* ─── Main: Chat Conversation ─── */}
      <div className="flex-1 h-full">
        {selectedTicketId ? (
          <Card className="h-full flex flex-col bg-white border border-slate-200/60 shadow-xl rounded-xl overflow-hidden">
            {/* Header */}
            <header className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/20">
              <div className="flex items-center gap-4">
                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black ${typeBadge ? typeBadge.badgeClass : 'bg-primary/10'}`}>
                   {typeBadge?.icon || selectedTicket?.userName?.[0]?.toUpperCase() || 'C'}
                 </div>
                 <div>
                   <div className="flex items-center gap-2">
                     <h2 className="font-black text-slate-900 tracking-tight">
                       {selectedTicket?.userName || t('admin.common.customer')}
                     </h2>
                     {typeBadge && (
                       <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ring-1 ${typeBadge.badgeClass}`}>
                         {typeBadge.label}
                       </span>
                     )}
                   </div>
                   <div className="flex items-center gap-3 mt-1">
                     <div className="flex items-center gap-1.5">
                       <span className={`w-1.5 h-1.5 rounded-full ${selectedTicket?.status === 'open' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                       <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                         {selectedTicket?.status === 'open' ? t('common.pending') : t('common.done')}
                       </span>
                     </div>
                     {channelBadge && (
                       <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${channelBadge.color}`}>
                         {channelBadge.icon} {channelBadge.label}
                       </span>
                     )}
                   </div>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-3 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"><Icons.FileText size={20} /></button>
                <button className="bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all">{t('admin.support.resolveBtn')}</button>
              </div>
            </header>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.senderType === 'admin' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`max-w-[70%] group`}>
                    <div className={`px-5 py-3.5 rounded-xl shadow-sm text-sm font-medium leading-relaxed
                      ${m.senderType === 'admin' 
                        ? 'bg-slate-900 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}
                    >
                      {m.content}
                    </div>
                    <p className={`text-[10px] font-bold text-slate-400 mt-1.5 px-2 ${m.senderType === 'admin' ? 'text-right' : 'text-left'}`}>
                      {m.senderType === 'admin' 
                        ? t('admin.support.you') 
                        : `${typeBadge?.icon || '👤'} ${selectedTicket?.userName || t('admin.common.customer')}`
                      } • {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-slate-100 bg-white">
               <div className="bg-slate-50 rounded-xl p-2 pl-6 flex items-center gap-3 border border-slate-100 ring-4 ring-slate-50/50">
                  <input 
                    type="text"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                    placeholder={t('admin.support.typePlaceholder')}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 placeholder:text-slate-400"
                  />
                  <button 
                    onClick={handleSendReply}
                    disabled={isSending || !replyText.trim()}
                    className="bg-primary text-white w-12 h-12 rounded-[1.1rem] flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSending ? <Icons.Refresh size={20} className="animate-spin" /> : <Icons.Settings size={20} className="rotate-90" />}
                  </button>
               </div>
            </div>
          </Card>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-white/50 border-2 border-dashed border-slate-200 rounded-xl">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
               <Icons.Chat size={48} />
            </div>
            <h3 className="text-xl font-black text-slate-900">{t('admin.support.noSelect')}</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2 font-medium">{t('admin.support.selectSub')}</p>
            
            {/* Quick Legend */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {(['customer', 'rider', 'store'] as const).map(type => {
                const badge = getUserTypeBadge(type);
                return (
                  <div key={type} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${badge.badgeClass} ring-1`}>
                    <span>{badge.icon}</span>
                    <span>{badge.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
