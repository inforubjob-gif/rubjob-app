"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { MOCK_ORDERS } from "@/lib/mock-data";

// Revenue constants based on the business model
const PARTNER_COMMISSION_RATE = 0.3; // 30%
const AVG_WASH_COST = 40; // Price we pay to laundry shop
const AVG_WASH_PRICE = 59; // Price we charge customer

export default function AdminDashboard() {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCommision, setTotalCommision] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    // In a real app, this would fetch from Firestore via orderService
    const orders = MOCK_ORDERS;
    const completedOrders = orders.filter(o => o.status === "completed");
    
    const revenue = completedOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const commision = revenue * PARTNER_COMMISSION_RATE;
    
    // Simple profit calculation: (Price we charge - Cost from shop) * orders
    const marginPerOrder = AVG_WASH_PRICE - AVG_WASH_COST;
    const directProfit = completedOrders.length * marginPerOrder;
    
    setTotalRevenue(revenue);
    setTotalCommision(commision);
    setNetProfit(directProfit - (commision * 0.1)); // Simulating some ops cost
    setOrderCount(orders.length);
  }, []);

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50">
      <header className="bg-white px-5 pt-12 pb-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-slate-900">Admin Backend</h1>
          <Link href="/" className="text-xs text-primary font-bold">← View App</Link>
        </div>
        <p className="text-sm text-slate-500">Revenue Stream & Order Monitoring</p>
      </header>

      <div className="p-5 space-y-6">
        {/* ─── Revenue Overview ─── */}
        <section className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-white">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
            <p className="text-xl font-black text-slate-900 mt-1">฿{totalRevenue.toLocaleString()}</p>
          </Card>
          <Card className="p-4 bg-white">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Profit</p>
            <p className="text-xl font-black text-emerald-600 mt-1">฿{netProfit.toLocaleString()}</p>
          </Card>
          <Card className="p-4 bg-primary-light border-primary/20 col-span-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-primary-dark uppercase tracking-wider">Partner Commission (30%)</p>
                <p className="text-2xl font-black text-primary-dark mt-1">฿{totalCommision.toLocaleString()}</p>
              </div>
              <div className="text-3xl opacity-50">🤝</div>
            </div>
          </Card>
        </section>

        {/* ─── Revenue Stream Breakdown ─── */}
        <section>
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            📊 Revenue Stream Breakdown
          </h2>
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Service Fee Margin</span>
              <span className="font-bold text-slate-900">~฿19.00 / order</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full w-[60%]" />
              <div className="bg-primary h-full w-[40%]" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Direct Profit
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                <span className="w-2 h-2 rounded-full bg-primary" /> Commissions
              </div>
            </div>
          </Card>
        </section>

        {/* ─── Recent Orders ─── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 italic">Recent Orders ({orderCount})</h2>
            <button className="text-[10px] font-bold bg-slate-200 px-2 py-1 rounded">Update Status</button>
          </div>
          <div className="space-y-3">
            {MOCK_ORDERS.slice(0, 5).map(order => (
              <Card key={order.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{order.id}</span>
                    <Badge variant="default">{order.status}</Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{order.address.label} • {order.items.length} items</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black">฿{order.totalPrice}</p>
                  <p className="text-[9px] text-slate-400">Profit: ~฿19</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
        <div className="max-w-md mx-auto flex gap-3">
           <button className="flex-1 bg-slate-900 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-slate-200">
             Export CSV
           </button>
           <button className="flex-1 bg-white border border-slate-200 text-slate-900 rounded-xl py-3 text-sm font-bold">
             Partner View
           </button>
        </div>
      </nav>
    </div>
  );
}
