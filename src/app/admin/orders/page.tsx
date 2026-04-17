"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge, { statusToBadgeVariant } from "@/components/ui/Badge";
import { Icons } from "@/components/ui/Icons";
import { useTranslation } from "@/components/providers/LanguageProvider";

export default function AdminOrdersPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const res = await fetch("/api/orders?userId=all");
      const data = await res.json() as any;
      if (data.orders) setOrders(data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="mb-6">
         <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{t('admin.orders.title')}</h1>
         <p className="text-slate-500 text-sm md:text-base font-medium mt-1">{t('admin.orders.subtitle')}</p>
      </header>

      <Card className="bg-white border border-slate-200/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
             <p className="text-slate-400 font-medium">{t('admin.orders.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">{t('admin.orders.table.id')}</th>
                  <th className="px-6 py-4">{t('admin.orders.table.date')}</th>
                  <th className="px-6 py-4">{t('admin.orders.table.status')}</th>
                  <th className="px-6 py-4">{t('admin.orders.table.customer')}</th>
                  <th className="px-6 py-4 text-right">{t('admin.orders.table.total')}</th>
                  <th className="px-6 py-4 text-center">{t('admin.orders.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{order.id}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{new Date(order.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <Badge variant={statusToBadgeVariant(order.status)}>{t(`orders.status.${order.status}`)}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">{order.userId.slice(0, 10)}...</td>
                    <td className="px-6 py-4 text-right font-black">฿{order.totalPrice}</td>
                    <td className="px-6 py-4 text-center">
                       <button className="text-primary font-bold text-xs hover:underline">{t('admin.orders.viewJson')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
