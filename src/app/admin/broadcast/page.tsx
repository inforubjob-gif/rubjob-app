"use client";

import { useState } from "react";
import { Icons } from "@/components/ui/Icons";
import { useToast } from "@/components/providers/ToastProvider";

export default function BroadcastPage() {
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all_users");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      showToast("Please enter a message to broadcast", "error");
      return;
    }

    if (!confirm(`Are you sure you want to broadcast this message to ${target.replace("_", " ")}?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, target }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to broadcast");
      
      showToast(`Broadcast sent successfully! (Sent: ${data.sent}, Failed: ${data.failed})`, "success");
      setMessage("");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
            <Icons.Bell size={24} />
          </div>
          Broadcast Center
        </h1>
        <p className="text-slate-500 mt-2 text-sm font-medium">
          Send announcements, promotions, or alerts to users via LINE Push Notification.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-8">
        <form onSubmit={handleSend} className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700">Select Target Audience</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: "all_users", label: "All Customers", icon: <Icons.Users size={20} /> },
                { id: "rubbers", label: "All Rubbers (Drivers)", icon: <Icons.Car size={20} /> },
                { id: "stores", label: "All Store Owners", icon: <Icons.Store size={20} /> }
              ].map(t => (
                <label 
                  key={t.id}
                  className={`flex flex-col items-center gap-2 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                    target === t.id 
                      ? "border-primary bg-primary/5 text-primary" 
                      : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <input 
                    type="radio" 
                    name="target" 
                    value={t.id} 
                    checked={target === t.id} 
                    onChange={(e) => setTarget(e.target.value)} 
                    className="sr-only"
                  />
                  {t.icon}
                  <span className="font-bold text-sm">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700">Message Content</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here... You can use emojis 😊"
              className="w-full h-40 p-4 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none text-slate-700"
              required
            />
            <p className="text-xs text-slate-400 font-medium">
              Note: Messages will be sent as standard text messages via LINE Official Account. Ensure your LINE Messaging API limit allows mass sending.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="px-8 py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl shadow-lg shadow-primary/30 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Icons.Loading size={20} />
                  Sending Broadcast...
                </>
              ) : (
                <>
                  <Icons.Bell size={20} />
                  Send Broadcast
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
