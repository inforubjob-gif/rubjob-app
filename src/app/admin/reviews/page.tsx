"use client";

import { useState, useEffect } from "react";
import { Icons } from "@/components/ui/Icons";

import { useToast } from "@/components/providers/ToastProvider";

interface Review {
  orderId: string;
  rating: number;
  reviewText: string;
  storeRating?: number;
  storeReview?: string;
  driverRating?: number;
  driverReview?: string;
  createdAt: string;
  customerName: string;
  customerAvatar: string;
  storeName?: string;
  rubberName?: string;
  providerName?: string;
  serviceName: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/admin/reviews");
      if (!res.ok) throw new Error("Failed to fetch reviews");
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    try {
      const res = await fetch(`/api/admin/reviews/${orderId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete review");
      showToast("Review deleted successfully", "success");
      setReviews(reviews.filter(r => r.orderId !== orderId));
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icons.Loading size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/10 text-yellow-600 rounded-xl">
              <Icons.Star size={24} />
            </div>
            Reviews & Ratings
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">
            Manage customer feedback and ratings
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-4 px-6 font-bold text-slate-500 text-xs uppercase tracking-widest whitespace-nowrap">Date</th>
                <th className="py-4 px-6 font-bold text-slate-500 text-xs uppercase tracking-widest whitespace-nowrap">Customer</th>
                <th className="py-4 px-6 font-bold text-slate-500 text-xs uppercase tracking-widest whitespace-nowrap">Service / Target</th>
                <th className="py-4 px-6 font-bold text-slate-500 text-xs uppercase tracking-widest whitespace-nowrap">Rating</th>
                <th className="py-4 px-6 font-bold text-slate-500 text-xs uppercase tracking-widest w-full min-w-[200px]">Review</th>
                <th className="py-4 px-6 font-bold text-slate-500 text-xs uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Icons.Star size={48} className="mx-auto mb-4 text-slate-300 opacity-50" />
                    <p className="font-medium text-lg">No reviews found</p>
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.orderId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 whitespace-nowrap text-sm text-slate-500">
                      {new Date(review.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {review.customerAvatar ? (
                          <img src={review.customerAvatar} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                            {review.customerName?.[0] || '?'}
                          </div>
                        )}
                        <span className="font-bold text-slate-900 whitespace-nowrap">{review.customerName || "Unknown"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-bold text-slate-900">{review.serviceName}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {review.storeName ? `Store: ${review.storeName}` : 
                         review.providerName ? `Provider: ${review.providerName}` : 
                         review.rubberName ? `Rubber: ${review.rubberName}` : "General"}
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap space-y-2">
                      {review.storeRating && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 w-10">STORE</span>
                          <div className="flex text-yellow-400 text-xs">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={`s-${i}`} className={i < review.storeRating! ? "text-yellow-400" : "text-slate-200"}>★</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {review.driverRating && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 w-10">DRIVER</span>
                          <div className="flex text-yellow-400 text-xs">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={`d-${i}`} className={i < review.driverRating! ? "text-yellow-400" : "text-slate-200"}>★</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {!review.storeRating && !review.driverRating && (
                        <div className="flex text-yellow-400 text-sm">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={i < (review.rating || 0) ? "text-yellow-400" : "text-slate-200"}>★</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 space-y-2">
                      {review.storeReview && (
                        <div className="text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="font-bold text-slate-400 block mb-0.5 text-[9px]">STORE REVIEW:</span>
                          {review.storeReview}
                        </div>
                      )}
                      {review.driverReview && (
                        <div className="text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="font-bold text-slate-400 block mb-0.5 text-[9px]">DRIVER REVIEW:</span>
                          {review.driverReview}
                        </div>
                      )}
                      {!review.storeReview && !review.driverReview && (
                        <div>{review.reviewText || <span className="italic text-slate-400">No text provided</span>}</div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleDelete(review.orderId)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete Review"
                      >
                        <Icons.Trash size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
