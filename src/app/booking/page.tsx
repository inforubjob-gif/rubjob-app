"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { TIME_SLOTS } from "@/lib/constants";
import type { ServiceType, Address, Store } from "@/types";

import { Icons, getServiceIcon } from "@/components/ui/Icons";
import Modal from "@/components/ui/Modal";

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useLiff } from "@/components/providers/LiffProvider";
import { useToast } from "@/components/providers/ToastProvider";

const ITEM_KEY_MAP: Record<string, string> = {
  "T-shirt": "items.tshirt",
  "Pants": "items.pants",
  "Towel": "items.towel",
  "Suit Jacket": "items.suitJacket",
  "Dress Shirt": "items.dressShirt",
  "Skirt": "items.skirt",
};

type BookingStep = "service" | "details" | "payment";

function BookingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initServiceRaw = searchParams.get("service") as ServiceType | null;
  const validInitService = initServiceRaw;

  const { profile } = useLiff();
  const { t, language } = useTranslation();
  const { showToast } = useToast();
  const [step, setStep] = useState<BookingStep>(validInitService ? "details" : "service");
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(validInitService);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  type DeliverySpeed = "standard" | "express";
  const [deliverySpeed, setDeliverySpeed] = useState<DeliverySpeed>("standard");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliverySlot, setDeliverySlot] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("promptpay");
  const [tempPhone, setTempPhone] = useState("");
  
  // Weight & Size based selection instead of per-piece items
  const [bagSize, setBagSize] = useState<"9kg" | "14kg" | "18kg" | "28kg">("9kg");
  const [withFolding, setWithFolding] = useState<boolean>(true);

  // Pickup: always scheduled (no more instant option)
  const [pickupDate, setPickupDate] = useState("");
  const [pickupSlot, setPickupSlot] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [dbStores, setDbStores] = useState<any[]>([]);
  const [dbAddresses, setDbAddresses] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>({});
  const [paymentQR, setPaymentQR] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Auto-assign store based on selected address
  function autoAssignStore(address: Address, stores: any[]): Store | null {
    if (!address?.lat || !address?.lng || stores.length === 0) return null;

    let bestStore: Store | null = null;
    let bestDist = Infinity;

    for (const store of stores) {
      const dist = getDistanceKm(address.lat, address.lng, store.lat, store.lng);
      if (dist <= store.serviceRadiusKm && dist < bestDist) {
        bestDist = dist;
        bestStore = store;
      }
    }

    // If no store is within radius, pick the closest one anyway
    if (!bestStore && stores.length > 0) {
      for (const store of stores) {
        const dist = getDistanceKm(address.lat!, address.lng!, store.lat, store.lng);
        if (dist < bestDist) {
          bestDist = dist;
          bestStore = store;
        }
      }
    }

    return bestStore;
  }

  // Fetch real data from APIs
  useEffect(() => {
    if (!profile?.userId) return;

    async function fetchData() {
      try {
        const [sRes, stRes, adRes, setRes] = await Promise.all([
          fetch("/api/services"),
          fetch("/api/stores"),
          fetch(`/api/user/addresses?userId=${profile?.userId}`),
          fetch("/api/admin/settings") // Fetch system settings
        ]);

        const sData = (await sRes.json()) as any;
        const stData = (await stRes.json()) as any;
        const adData = (await adRes.json()) as any;
        const setData = (await setRes.json()) as any;

        if (sData.services) setDbServices(sData.services);
        if (stData.stores) setDbStores(stData.stores);
        if (setData.settings) {
          const settingsMap: Record<string, any> = {};
          setData.settings.forEach((s: any) => {
            settingsMap[s.key] = s.value;
          });
          setSystemSettings(settingsMap);
        }
        
        if (adData.addresses) {
          setDbAddresses(adData.addresses);
          if (adData.addresses.length > 0 && !selectedAddress) {
            const firstAddr = adData.addresses[0];
            setSelectedAddress(firstAddr);
            // Auto-assign store for default address
            if (stData.stores) {
              const store = autoAssignStore(firstAddr, stData.stores);
              if (store) setSelectedStore(store);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch booking data:", err);
      }
    }
    fetchData();
  }, [profile?.userId]);

  // Re-assign store when address changes
  useEffect(() => {
    if (selectedAddress && dbStores.length > 0) {
      const store = autoAssignStore(selectedAddress, dbStores);
      if (store) setSelectedStore(store);
    }
  }, [selectedAddress, dbStores]);

  // Load drafted state
  useEffect(() => {
    const saved = sessionStorage.getItem("rubjob_booking_draft");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        // If we have a URL param, prioritize it over drafted step/service
        if (p.step && p.step !== "store" && !validInitService) setStep(p.step);
        if (p.selectedService && !validInitService) setSelectedService(p.selectedService);
        
        if (p.selectedAddress) setSelectedAddress(p.selectedAddress);
        if (p.deliverySpeed && p.deliverySpeed !== "flash") setDeliverySpeed(p.deliverySpeed);
        if (p.deliveryDate) setDeliveryDate(p.deliveryDate);
        if (p.deliverySlot) setDeliverySlot(p.deliverySlot);
        if (p.selectedPayment) setSelectedPayment(p.selectedPayment);
        if (p.bagSize) setBagSize(p.bagSize);
        if (p.withFolding !== undefined) setWithFolding(p.withFolding);
        if (p.pickupDate) setPickupDate(p.pickupDate);
        if (p.pickupSlot) setPickupSlot(p.pickupSlot);
      } catch (e) {
        console.error("Failed to parse drafted state", e);
      }
    }
    setIsLoaded(true);
  }, [validInitService]);

  // Sync state to draft
  useEffect(() => {
    if (!isLoaded) return;
    sessionStorage.setItem("rubjob_booking_draft", JSON.stringify({
      step, selectedService, selectedAddress, deliverySpeed, 
      deliveryDate, deliverySlot, selectedPayment, bagSize, withFolding, 
      pickupDate, pickupSlot,
      userId: profile?.userId
    }));
  }, [isLoaded, step, selectedService, selectedAddress, deliverySpeed, deliveryDate, deliverySlot, selectedPayment, bagSize, withFolding, pickupDate, pickupSlot]);

  // Discounts
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string, discount: number } | null>(null);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const availablePoints = 500;
  const pointsDiscount = usePoints ? 50 : 0;
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;

  const service = dbServices.find((s) => s.id === selectedService);

  const locale = language === "th" ? "th" : language === "zh" ? "zh" : "en";

  // Date/time constraints and generation...
  const dates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      return {
        value: d.toISOString().slice(0, 10),
        day: d.toLocaleDateString(locale, { weekday: "short" }),
        date: d.getDate(),
        month: d.toLocaleDateString(locale, { month: "short" }),
      };
    });
  }, [locale]);

  // Set default pickup date/slot
  useEffect(() => {
    if (!pickupDate && dates.length > 0) {
      setPickupDate(dates[0].value);
    }
    if (!pickupSlot && TIME_SLOTS.length > 0) {
      setPickupSlot(TIME_SLOTS[0].id);
    }
  }, [dates, pickupDate, pickupSlot]);

  // Calculate distance based on actual coordinates or fallback
  const distanceKm = selectedStore && selectedAddress?.lat && selectedAddress?.lng 
    ? getDistanceKm(selectedAddress.lat, selectedAddress.lng, selectedStore.lat, selectedStore.lng)
    : 5.1; 
    
  // Pricing Logic
  const baseDeliveryFee = deliverySpeed === "express" ? 59 : 39;
  
  // Dynamic radius from settings
  const radiusLimit = Number(systemSettings.radius_km) || 5;
  const radiusExtended = radiusLimit * 2; // e.g. 10 if radius is 5

  let distanceExtra = 0;
  if (distanceKm > radiusExtended) {
    distanceExtra = (radiusExtended - radiusLimit) * 8 + Math.ceil(distanceKm - radiusExtended) * 20;
  } else if (distanceKm > radiusLimit) {
    distanceExtra = Math.ceil(distanceKm - radiusLimit) * 8;
  }
  const deliveryFee = selectedAddress && selectedStore ? baseDeliveryFee + distanceExtra : 0;

  const bagSizeExtra = bagSize === "28kg" ? 20 : 0;
  
  let foldingFee = 0;
  if (withFolding) {
    if (bagSize === "9kg" || bagSize === "14kg") foldingFee = 20;
    else if (bagSize === "18kg") foldingFee = 25;
    else if (bagSize === "28kg") foldingFee = 35;
  }

  const laundryFee = (service?.basePrice || 0) + bagSizeExtra + foldingFee;
  const subTotal = laundryFee + deliveryFee;
  const totalDiscount = couponDiscount + pointsDiscount;
  const totalPrice = Math.max(subTotal - totalDiscount, 0);

  const minOrderAmount = Number(systemSettings.min_order_amount) || 0;
  const isBelowMinOrder = totalPrice < minOrderAmount;

  const unitLabel = service?.unit === "hour" ? t("booking.hours") : service?.unit === "session" ? t("home.perSession") : t("home.perPiece");

  async function handleConfirm() {
    if (isBelowMinOrder) {
      showToast(t("booking.errors.minOrder").replace("{amount}", minOrderAmount.toString()), "error");
      return;
    }

    if (activeOrderId && paymentQR) {
      // If we already have a QR and ID, just redirect to orders (user might have scanned already)
      router.push(`/orders/${activeOrderId}`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (!profile?.userId) {
        showToast(t("booking.loginRequired"), "error");
        setIsSubmitting(false);
        return;
      }
      if (!selectedStore?.id || !selectedService) {
        showToast(t("booking.selectServiceStore"), "error");
        setIsSubmitting(false);
        return;
      }
      
      const userId = profile.userId;
      const payload = {
        userId,
        storeId: selectedStore.id,
        serviceId: selectedService,
        items: [{ name: `${t("booking.bag")} ${bagSize}`, qty: 1 }],
        address: selectedAddress,
        paymentMethod: selectedPayment,
        laundryFee,
        deliveryFee,
        distanceKm,
        totalPrice,
        pickupDateTime: `${pickupDate} ${pickupSlot}`,
        scheduledDate: deliverySpeed === "express" ? t("booking.speed.expressShort") : t("booking.speed.standardShort")
      };

      // 1. Create Booking
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const bookingData = await res.json();
      if (!res.ok || !bookingData.success) throw new Error(bookingData.error || "Booking failed");
      
      const orderId = bookingData.orderId;
      setActiveOrderId(orderId);

      // 2. Initiate Payment Checkout
      const payRes = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amount: totalPrice,
          paymentMethod: selectedPayment
        })
      });

      const payData = await payRes.json();
      if (payRes.ok && payData.paymentData) {
        setPaymentQR(payData.paymentData);
        // Step remains 'payment' but now shows the real QR
      } else {
        // If payment fails to init, still have the order. Redirect to order page.
        router.push(`/orders/${orderId}`);
      }
    } catch (error: any) {
      console.error(error);
      showToast(`${t("common.error")}: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle platform closed state
  if (isLoaded && systemSettings.is_open === "false") {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-10 text-center animate-fade-in bg-slate-50">
        <div className="w-24 h-24 bg-white rounded-xl shadow-xl flex items-center justify-center mb-8 border border-slate-100">
           <Icons.Settings size={48} className="text-slate-300 animate-spin-slow" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t("booking.errors.systemClosedTitle")}</h2>
        <p className="text-slate-500 mt-3 font-medium leading-relaxed">
          {t("booking.errors.systemClosedDesc").split("\n").map((line, i) => (
            <span key={i}>{line}{i === 0 && <br/>}</span>
          ))}
        </p>
        <Button 
          variant="outline" 
          className="mt-10 rounded-xl border-2 font-black px-10"
          onClick={() => router.push("/")}
        >
          {t("common.goHome")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <header className="bg-white px-5 pt-6 pb-4 border-b border-border sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (step === "service") router.back();
              else if (step === "details") setStep("service");
              else if (step === "payment") setStep("details");
            }}
            className="w-9 h-9 rounded-xl bg-surface-alt flex items-center justify-center text-foreground active:scale-95 transition-transform"
          >
            <Icons.Back size={20} />
          </button>
          <h1 className="text-lg font-bold text-foreground">
            {step === "service" ? t("booking.serviceTitle") : 
            step === "details" ? t("booking.pickupTitle") : 
             t("orders.payment.title")}
          </h1>
        </div>

        {/* Progress bar — 3 steps now */}
        <div className="flex gap-2 mt-4">
          {(["service", "details", "payment"] as BookingStep[]).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= ["service", "details", "payment"].indexOf(step) ? "bg-primary" : "bg-gray-100"
              }`}
            />
          ))}
        </div>
      </header>

      <div className="flex-1 px-5 py-5 pb-56 space-y-4 animate-fade-in relative">

        {/* ─── Step: Service ─── */}
        {step === "service" && (
          <div className="space-y-4 stagger">
            {dbServices.filter(s => s.category === "laundry").map((svc) => (
              <Card
                key={svc.id}
                hoverable
                onClick={() => setSelectedService(svc.id as ServiceType)}
                className={`p-5 flex items-center gap-4 transition-all duration-300 border-2 ${
                  selectedService === svc.id
                    ? "bg-primary/5 border-primary shadow-xl shadow-primary/20 scale-[1.02] ring-4 ring-primary/10"
                    : "border-slate-100 hover:border-slate-200"
                }`}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  selectedService === svc.id ? "bg-primary text-white shadow-md shadow-primary/30" : "bg-primary-light text-primary-dark"
                }`}>
                  {getServiceIcon(svc.id, { size: 28 })}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-foreground">{t(`orders.services.${svc.id}`) || svc.name}</h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed opacity-90">{t(`serviceDesc.${svc.id}`) || svc.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-black text-primary-dark bg-primary/10 px-2 py-0.5 rounded-md">
                      {t("booking.fromPrice")} ฿{svc.basePrice}/{unitLabel}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      ~{svc.estimatedDays} {t("booking.dayTurnaround")}
                    </span>
                  </div>
                </div>
                {selectedService === svc.id && (
                  <div className="w-7 h-7 bg-primary shadow-md shadow-primary/40 rounded-full flex items-center justify-center text-white text-sm shrink-0">
                    ✓
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* ─── Step: Details ─── */}
        {step === "details" && (
          <div className="space-y-5 animate-fade-in">
            {/* Address selection */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Icons.MapPin size={18} className="text-primary" /> {t("booking.pickupAddress")}
                </h3>
                <button 
                  onClick={() => router.push("/profile/addresses")}
                  className="text-xs font-bold text-primary active:opacity-60 transition-opacity"
                >
                  {t("booking.addNew")}
                </button>
              </div>
              <div className="space-y-2">
                {dbAddresses.length === 0 && (
                  <p className="text-center py-4 text-xs text-muted italic">{t("booking.noAddress")}</p>
                )}
                {dbAddresses.map((addr) => (
                  <Card
                    key={addr.id}
                    hoverable
                    onClick={() => setSelectedAddress(addr)}
                    className={`p-3.5 transition-all duration-300 border-2 ${
                      selectedAddress?.id === addr.id
                        ? "bg-primary/5 border-primary shadow-lg shadow-primary/10 -translate-y-0.5"
                        : "border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        selectedAddress?.id === addr.id ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
                      }`}>
                        {addr.label.toLowerCase().includes("home") || addr.label.toLowerCase().includes("บ้าน") ? <Icons.Home size={18} /> : <Icons.Office size={18} />}
                      </div>
                      <div>
                        <p className={`text-sm font-bold transition-colors ${
                          selectedAddress?.id === addr.id ? "text-primary-dark" : "text-foreground"
                        }`}>{addr.label}</p>
                        <p className="text-xs text-muted mt-0.5">{addr.details}</p>
                        {addr.note && (
                          <div className="flex items-center gap-1.5 mt-1 text-primary-dark">
                            <Icons.FileText size={12} strokeWidth={3} />
                            <p className="text-xs">{addr.note}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Auto-assigned store is hidden from the user per requirements */}
            </section>

            {/* Pickup Info — always show date/time picker (no instant option) */}
            <section>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <Icons.Bell size={18} className="text-primary" /> {t("booking.pickupSelectTime")}
              </h3>
              
              <div className="p-3 bg-slate-50/80 rounded-xl space-y-4 animate-fade-in border border-slate-100">
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                  {dates.map((d: { value: string; day: string; date: number; month: string }) => (
                    <button
                      key={d.value}
                      onClick={() => setPickupDate(d.value)}
                      className={`flex flex-col items-center min-w-[60px] py-2 px-2 rounded-xl transition-all duration-300 ${pickupDate === d.value ? "bg-primary text-white shadow-md shadow-primary/20 scale-105" : "bg-white text-foreground hover:bg-slate-100 border border-border"}`}
                    >
                      <span className="text-[10px] font-medium opacity-80">{d.day}</span>
                      <span className="text-sm font-bold">{d.date}</span>
                      <span className="text-[10px] opacity-80">{d.month}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setPickupSlot(slot.id)}
                      className={`py-2 px-2 rounded-xl text-center transition-all duration-300 ${pickupSlot === slot.id ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]" : "bg-white text-foreground hover:bg-slate-100 border border-border"}`}
                    >
                      <p className="text-xs font-semibold">{t(`timeSlots.${slot.id}`) || slot.label}</p>
                      <p className="text-[10px] opacity-80">{slot.startTime}–{slot.endTime}</p>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Delivery Options — 2 choices: มาตรฐาน + ด่วนพิเศษ */}
            <section>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <Icons.Home size={18} className="text-primary" /> {t("booking.deliveryOptions")}
              </h3>
              <div className="space-y-2">
                <label className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${deliverySpeed === "standard" ? "border-primary bg-primary/5 shadow-md shadow-primary/5" : "border-slate-100 bg-white hover:bg-slate-50"}`} onClick={() => setDeliverySpeed("standard")}>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">{t("booking.speed.standardTitle")}</span>
                    <span className="text-xs text-muted block mt-0.5">{t("booking.speed.standardDesc").replace("{fee}", (39 + distanceExtra).toString())}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${deliverySpeed === "standard" ? "bg-primary text-white" : "border-2 border-slate-200"}`}>
                    {deliverySpeed === "standard" && <span className="text-xs font-bold leading-none flex items-center justify-center pt-0.5">✓</span>}
                  </div>
                </label>

                <label className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${deliverySpeed === "express" ? "border-[ff9f1c] bg-[#fff8e1] shadow-md shadow-[ff9f1c]/10" : "border-slate-100 bg-white hover:bg-slate-50"}`} onClick={() => setDeliverySpeed("express")}>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[ff9f1c]">{t("booking.speed.expressTitle")}</span>
                    <span className="text-xs text-[ff9f1c]/80 block mt-0.5">{t("booking.speed.expressDesc").replace("{fee}", (59 + distanceExtra).toString())}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${deliverySpeed === "express" ? "bg-[ff9f1c] text-white" : "border-2 border-slate-200"}`}>
                    {deliverySpeed === "express" && <span className="text-xs font-bold leading-none flex items-center justify-center pt-0.5">✓</span>}
                  </div>
                </label>
              </div>
              {distanceExtra > 0 && <span className="text-[10px] text-muted block mt-2 ml-1">{t("booking.distanceNote").replace("{distance}", distanceKm.toFixed(1))}</span>}
            </section>

            {/* Luggage Size & Folding Option */}
            <section>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <Icons.FileText size={18} className="text-primary" /> 
                {t("booking.bagSizeTitle")}
              </h3>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(["9kg", "14kg", "18kg", "28kg"] as const).map((size) => (
                  <label key={size} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${bagSize === size ? "border-primary bg-primary/5 shadow-sm" : "border-slate-100 bg-white hover:bg-slate-50"}`} onClick={() => setBagSize(size)}>
                    <span className="text-sm font-bold text-foreground">{size}</span>
                    {size === "28kg" && <span className="text-[10px] text-muted">+฿20</span>}
                  </label>
                ))}
              </div>

              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <Icons.Tasks size={18} className="text-primary" /> 
                {t("booking.foldingServiceTitle")}
              </h3>
              
              <Card className="overflow-hidden mb-2">
                <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors border-b border-border" onClick={() => setWithFolding(false)}>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">{t("booking.options.noFolding")}</span>
                    <span className="text-xs text-muted">{t("booking.options.noFoldingDesc")}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${!withFolding ? "bg-primary text-white shadow-md shadow-primary/30" : "border-2 border-slate-200"}`}>
                    {!withFolding && <span className="text-xs font-bold leading-none flex items-center justify-center pt-0.5">✓</span>}
                  </div>
                </label>

                <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setWithFolding(true)}>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">{t("booking.options.withFolding")}</span>
                    <span className="text-xs text-primary-dark font-medium">+฿{bagSize === "28kg" ? 35 : bagSize === "18kg" ? 25 : 20}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${withFolding ? "bg-primary text-white shadow-md shadow-primary/30" : "border-2 border-slate-200"}`}>
                    {withFolding && <span className="text-xs font-bold leading-none flex items-center justify-center pt-0.5">✓</span>}
                  </div>
                </label>
              </Card>
            </section>

            {/* Discount & Points */}
            <section className="animate-fade-in">
              <div className="flex items-center justify-between mb-2 mt-6">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Icons.Ticket size={18} className="text-primary" /> {t("booking.discountsTitle")}
                </h3>
              </div>
              
              <Card className="p-4 mb-4">
                <button 
                  onClick={async () => {
                    setIsCouponModalOpen(true);
                    setIsLoadingCoupons(true);
                    try {
                      const res = await fetch("/api/coupons");
                      const data = await res.json() as any;
                      if (data.coupons) setAvailableCoupons(data.coupons);
                    } catch (err) {
                      console.error("Failed to fetch coupons", err);
                    } finally {
                      setIsLoadingCoupons(false);
                    }
                  }}
                  className="w-full mb-4 bg-primary/5 hover:bg-primary/10 border-2 border-dashed border-primary/20 rounded-xl p-3 flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-primary group-active:scale-95 transition-transform">
                      <Icons.Ticket size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-[13px] font-black text-primary-dark uppercase tracking-tight leading-none">{t("booking.selectCoupon")}</p>
                      <p className="text-[10px] text-primary/60 font-bold mt-1 uppercase leading-none">{t("booking.promoLabel")}</p>
                    </div>
                  </div>
                  <Icons.ChevronRight size={18} className="text-primary/40 group-hover:text-primary transition-colors" />
                </button>
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    placeholder={t("booking.couponPlaceholder")} 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold uppercase"
                  />
                  <Button 
                    onClick={async () => {
                      if (!couponCode) return;
                      try {
                        const res = await fetch("/api/coupons/validate", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ code: couponCode, subtotal: laundryFee + deliveryFee })
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                          setAppliedCoupon({ code: data.coupon.code, discount: data.coupon.discount });
                          showToast(t("booking.couponSuccess").replace("{amount}", data.coupon.discount.toString()), "success");
                          setCouponCode(data.coupon.code);
                        } else {
                          showToast(`❌ ${data.error || t("booking.couponErrorGeneric")}`, "error");
                      }
                    } catch (err) {
                      console.error("Coupon validation error:", err);
                      showToast(`❌ ${t("booking.couponErrorGeneric")}`, "error");
                    }
                    }}
                    className="min-w-[80px] rounded-xl text-xs font-black shadow-md shadow-primary/20"
                  >
                    {t("booking.applyCoupon")}
                  </Button>
                </div>
                
                {appliedCoupon && (
                  <div className="bg-emerald-50 text-emerald-600 text-[11px] font-bold px-3 py-2.5 rounded-xl flex items-center justify-between mb-4 border border-emerald-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <span className="flex items-center gap-1.5">{t("booking.couponApplied").replace("{code}", appliedCoupon.code)}</span>
                    <button onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} className="text-emerald-700 underline underline-offset-2">{t("common.remove")}</button>
                  </div>
                )}

                <label className="flex items-center justify-between cursor-pointer border-t border-slate-100 pt-4" onClick={() => setUsePoints(!usePoints)}>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{t("booking.usePoints")}</span>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-black">{availablePoints} Pts</span>
                    </div>
                    <span className="text-xs text-muted mt-0.5">{t("booking.pointsDesc")}</span>
                  </div>
                  <div className={`w-[42px] h-[24px] rounded-full p-[2px] transition-colors duration-300 flex items-center ${usePoints ? "bg-primary" : "bg-slate-200"}`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow-sm ${usePoints ? "translate-x-[18px]" : "translate-x-0"}`} />
                  </div>
                </label>
              </Card>

              {/* Billing Summary */}
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2 mt-6">
                <Icons.FileText size={18} className="text-primary" /> {t("booking.summaryTitle")}
              </h3>
              <Card className="p-5">
                <div className="space-y-4 mb-4 text-xs font-medium text-slate-600">
                  
                  {/* Shop Section */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2 text-primary-dark font-bold">
                      <span className="text-sm leading-none pt-0.5">🏪</span>
                      <span>{t("booking.summary.storeSection")}{selectedStore ? ` (${selectedStore.name})` : ""}</span>
                    </div>
                    <div className="space-y-2 pl-5">
                      <div className="flex items-center justify-between">
                        <span>{t("booking.summary.package")} {t(`orders.services.${service?.id}`) || service?.name}</span>
                        <span className="font-bold text-slate-800">฿{service?.basePrice || 0}</span>
                      </div>
                      {bagSizeExtra > 0 && (
                        <div className="flex items-center justify-between">
                          <span>{t("booking.summary.extraBag")} ({bagSize})</span>
                          <span className="font-bold text-slate-800">+฿{bagSizeExtra}</span>
                        </div>
                      )}
                      {foldingFee > 0 && (
                        <div className="flex items-center justify-between">
                          <span>{t("booking.foldingServiceTitle")}</span>
                          <span className="font-bold text-slate-800">+฿{foldingFee}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 pl-5 text-[11px]">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t("booking.summary.subtotalLaundry")}</span>
                      <span className="font-black text-slate-700">฿{laundryFee}</span>
                    </div>
                  </div>

                  {/* Rider Section */}
                  <div className="pt-3 border-t border-dashed border-slate-200">
                    <div className="flex items-center gap-1.5 mb-2 text-blue-600 font-bold">
                      <span className="text-sm leading-none pt-0.5">🛵</span>
                      <span>{t("booking.summary.riderSection")}</span>
                    </div>
                    <div className="space-y-2 pl-5">
                      <div className="flex items-center justify-between">
                        <span>{t("booking.summary.deliveryFee")} ({deliverySpeed === "express" ? t("booking.speed.expressShort") : t("booking.speed.standardShort")})</span>
                        <span className="font-bold text-slate-800">+฿{deliveryFee}</span>
                      </div>
                    </div>
                  </div>

                  {/* Discounts */}
                  {(couponDiscount > 0 || pointsDiscount > 0) && (
                    <div className="pt-3 border-t border-dashed border-slate-200 space-y-2">
                       {couponDiscount > 0 && (
                         <div className="flex items-center justify-between text-emerald-600 font-bold bg-emerald-50/50 px-2.5 py-1.5 rounded-lg">
                           <span className="flex items-center gap-1"><Icons.Ticket size={12} /> {t("booking.summary.discountCoupon")}</span>
                           <span>-฿{couponDiscount}</span>
                         </div>
                       )}
                       {pointsDiscount > 0 && (
                         <div className="flex items-center justify-between text-emerald-600 font-bold bg-emerald-50/50 px-2.5 py-1.5 rounded-lg">
                           <span className="flex items-center gap-1"><Icons.Guarantee size={12} /> {t("booking.summary.discountPoints")}</span>
                           <span>-฿{pointsDiscount}</span>
                         </div>
                       )}
                    </div>
                  )}
                </div>
                
                {/* Total */}
                <div className="flex items-end justify-between border-t border-slate-200 pt-4 bg-slate-50/50 -mx-5 -mb-5 px-5 pb-5 rounded-b-2xl">
                  <div>
                    <span className="block text-sm font-black text-foreground">{t("booking.summary.total")}</span>
                    <span className="block text-[10px] text-muted font-bold tracking-tight mt-0.5">{t("booking.summary.taxIncluded")}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    {(couponDiscount > 0 || pointsDiscount > 0) && <span className="text-[11px] text-slate-400 line-through font-bold">฿{subTotal}</span>}
                    <span className="text-3xl font-black text-primary-dark leading-none tracking-tighter">฿{totalPrice}</span>
                  </div>
                </div>
              </Card>
            </section>
          </div>
        )}

        {/* ─── Step: Payment & Summary ─── */}
        {step === "payment" && (
          <div className="space-y-6 animate-fade-in">
            {/* Order Summary */}
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Icons.FileText size={18} className="text-primary" /> {t("booking.confirmOrder")}
              </h3>
              <Card className="p-5 space-y-4 shadow-sm border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center text-primary-dark">
                    {getServiceIcon(service?.id || "wash_fold", { size: 20 })}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{t(`orders.services.${service?.id}`) || service?.name}</h3>
                    <p className="text-xs text-muted">~{service?.estimatedDays} {t("booking.dayTurnaround")}</p>
                  </div>
                </div>

                <div className="bg-slate-50/50 p-3.5 rounded-xl space-y-2.5 border border-slate-100">
                  <Row icon={<Icons.MapPin size={12} />} label={t("booking.confirm.pickupLocation")} value={selectedAddress?.label || ""} />
                  <Row icon={<Icons.Bell size={12} />} label={t("booking.confirm.pickupDate")} value={`${pickupDate} ${TIME_SLOTS.find(s => s.id === pickupSlot)?.label || pickupSlot}`} />
                  <Row
                    icon={<Icons.Truck size={12} />}
                    label={t("booking.confirm.deliveryService")}
                    value={deliverySpeed === "express" ? t("booking.speed.expressShort") : t("booking.speed.standardShort")}
                  />
                  {selectedStore && (
                    <Row icon={<Icons.Home size={12} />} label={t("common.store")} value={`${selectedStore.name} (${distanceKm.toFixed(1)} ${t("booking.km")})`} />
                  )}
                  <Row icon={<Icons.FileText size={11} />} label={t("booking.confirm.bagSize")} value={`${bagSize} ${bagSizeExtra > 0 ? `(+฿${bagSizeExtra})` : ""}`} />
                  <Row icon={<Icons.Tasks size={11} />} label={t("booking.confirm.extraService")} value={withFolding ? `${t("booking.options.withFoldingShort")} (+฿${foldingFee})` : t("booking.options.noFoldingShort")} />
                </div>
              </Card>
            </section>

            <div className="text-center space-y-1 pt-2">
              <h2 className="text-base font-black text-foreground">{t("booking.selectPayment")}</h2>
              <p className="text-xs text-muted">{t("booking.scanToPayPromptPay")}</p>
            </div>

            {/* Main PromptPay QR Section */}
            <div className="flex flex-col items-center gap-4 py-2">
              <Card 
                className={`p-6 border-2 transition-all duration-300 flex flex-col items-center gap-5 w-full max-w-[320px] mx-auto ${
                  selectedPayment === "promptpay" ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10 scale-[1.02]" : "border-slate-100 opacity-60 grayscale"
                }`} 
                onClick={() => setSelectedPayment("promptpay")}
              >
                <div className="bg-[#1a3d6d] px-5 py-2.5 rounded-xl flex items-center gap-3">
                  <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-[11px] font-black text-[#1a3d6d]">PP</span>
                  </div>
                  <span className="text-base font-black text-white tracking-tight">PromptPay</span>
                </div>
                
                <div className="bg-white p-4 rounded-xl shadow-inner border border-slate-100 relative overflow-hidden">
                  <img 
                    src={paymentQR || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020101021129370016A000000677010111011300660000000005802TH5303764580215${totalPrice}.006304`}
                    alt="PromptPay QR" 
                    className="w-48 h-48 object-contain"
                  />
                  {(selectedPayment !== "promptpay" || !paymentQR) && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                      <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-xl">
                        {isSubmitting ? <Icons.Loading className="animate-spin" /> : <Icons.Payment size={24} />}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-sm font-bold text-muted">{t("booking.amountDue")}</span>
                    <span className="text-2xl font-black text-foreground">฿{totalPrice}.00</span>
                  </div>
                  <p className="text-xs text-primary-dark font-bold mt-1 uppercase tracking-wider">
                    {paymentQR ? t("booking.paymentDoneNote") : t("booking.instantConfirmation")}
                  </p>
                </div>
              </Card>
            </div>

            <div className="flex items-center justify-center gap-2 py-2 opacity-50 mt-4">
              <Icons.Shield size={14} className="text-green-600" />
              <span className="text-xs font-bold uppercase tracking-widest text-foreground">{t("orders.payment.secure")}</span>
            </div>
          </div>
        )}

        {/* Confirm step removed */}
      </div>

      {/* ─── Bottom CTA ─── */}
      <div className="sticky bottom-20 px-5 pb-4 space-y-3">
        {step === "payment" && isBelowMinOrder && (
          <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-3 animate-bounce">
            <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shrink-0">
               <Icons.Info size={16} />
            </div>
            <p className="text-xs font-black text-rose-600 uppercase tracking-tight">
              {t("booking.errors.minOrderRemaining")
                .replace("{amount}", minOrderAmount.toString())
                .replace("{needed}", (minOrderAmount - totalPrice).toString())}
            </p>
          </div>
        )}

        {step === "service" && (
          <Button
            fullWidth
            size="lg"
            disabled={!selectedService}
            onClick={() => setStep("details")}
          >
            {t("common.confirm")}
          </Button>
        )}
        {step === "details" && (
          <div className="space-y-3">
            {!profile?.phone && (
              <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl">
                <p className="text-xs font-bold text-amber-700 mb-2">{t("booking.identifyPhone")}</p>
                <input 
                  type="tel" 
                  placeholder="081-234-5678" 
                  className="w-full bg-white border border-amber-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold"
                  value={tempPhone}
                  onChange={(e) => setTempPhone(e.target.value)}
                />
              </div>
            )}
            <Button
              fullWidth
              size="lg"
              disabled={!selectedAddress || !pickupDate || !pickupSlot || (!profile?.phone && !tempPhone)}
              onClick={async () => {
                // If phone was provided in the temp input, sync it to user profile
                if (tempPhone && !profile?.phone) {
                  try {
                    await fetch("/api/user/sync", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        id: profile?.userId,
                        displayName: profile?.displayName,
                        pictureUrl: profile?.pictureUrl,
                        phone: tempPhone
                      })
                    });
                    // Note: LiffProvider might not refresh immediately, but we have it in D1 now
                    profile!.phone = tempPhone; 
                  } catch (e) {
                    console.error("Phone sync failed", e);
                  }
                }
                setStep("payment");
              }}
            >
              {t("common.confirm")}
            </Button>
          </div>
        )}
        {step === "payment" && (
          <Button
            fullWidth
            size="lg"
            isLoading={isSubmitting}
            disabled={!selectedPayment || isBelowMinOrder}
            onClick={handleConfirm}
            className={isBelowMinOrder ? "bg-slate-300 text-slate-500 shadow-none border-transparent" : ""}
          >
            {isSubmitting ? t("common.loading") : isBelowMinOrder ? t("booking.errors.cannotPlaceOrder").replace("{amount}", minOrderAmount.toString()) : 
             paymentQR ? t("booking.viewMyOrders") : `${t("booking.placeOrder")} — ฿${totalPrice}`}
          </Button>
        )}
      </div>
      
      {/* Coupon Selection Modal */}
      <Modal isOpen={isCouponModalOpen} onClose={() => setIsCouponModalOpen(false)} title={t("booking.selectCoupon")}>
         <div className="space-y-3 pt-2">
            {isLoadingCoupons && (
               <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t("common.loading")}</p>
               </div>
            )}
            {!isLoadingCoupons && availableCoupons.length === 0 && (
               <div className="text-center py-20 px-10 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                    <Icons.Ticket size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-500">{t("booking.noCoupons")}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{t("promotions.subtitle")}</p>
                  </div>
               </div>
            )}
            {availableCoupons.map((cpn) => (
               <button 
                  key={cpn.id}
                  onClick={async () => {
                     setCouponCode(cpn.code);
                     setIsCouponModalOpen(false);
                     try {
                        const res = await fetch("/api/coupons/validate", {
                           method: "POST",
                           headers: { "Content-Type": "application/json" },
                           body: JSON.stringify({ code: cpn.code, subtotal: laundryFee + deliveryFee })
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                           setAppliedCoupon({ code: data.coupon.code, discount: data.coupon.discount });
                           showToast(t("booking.couponSuccess").replace("{amount}", data.coupon.discount.toString()), "success");
                        } else {
                           showToast(`❌ ${data.error || t("booking.couponErrorGeneric")}`, "error");
                        }
                     } catch (err) {
                        showToast(`❌ ${t("booking.couponErrorGeneric")}`, "error");
                     }
                  }}
                  className="w-full relative group transition-transform active:scale-[0.98]"
               >
                  {/* Ticket Container */}
                  <div className="bg-white border-2 border-slate-100 rounded-2xl flex overflow-hidden shadow-sm group-hover:border-primary/30 transition-colors">
                    {/* Left side: Discount Amount */}
                    <div className="w-24 bg-primary/10 flex flex-col items-center justify-center border-r-2 border-dashed border-slate-100 relative">
                      {/* Punch holes */}
                      <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-slate-100 rounded-full" />
                      <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-4 h-4 bg-white border-2 border-slate-100 rounded-full" />
                      
                      <span className="text-xs font-black text-primary uppercase leading-none mb-1">{t("booking.off")}</span>
                      <span className="text-2xl font-black text-primary-dark">
                        {cpn.type === 'percentage' ? `${cpn.value}%` : `฿${cpn.value}`}
                      </span>
                    </div>

                    {/* Right side: Details */}
                    <div className="flex-1 p-4 text-left flex flex-col justify-between min-h-[100px]">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-black text-slate-800 leading-tight">{cpn.title || cpn.code}</h4>
                          <span className="text-[10px] font-black font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">{cpn.code}</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 line-clamp-2">{cpn.description || t("promotions.subtitle")}</p>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none">{t("booking.minSpend")}</span>
                          <span className="text-[11px] font-black text-slate-600">฿{cpn.minOrder || 0}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none">{t("booking.expires")}</span>
                          <span className="text-[10px] font-bold text-amber-600">
                            {cpn.expiryDate ? new Date(cpn.expiryDate).toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: '2-digit' }) : "∞"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
               </button>
            ))}
         </div>
      </Modal>
    </div>
  );
}

export default function BookingPage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center p-4 text-slate-400 font-bold animate-pulse">Loading...</div>}>
      <BookingFlow />
    </Suspense>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}
