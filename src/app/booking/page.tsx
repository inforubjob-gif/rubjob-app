"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { TIME_SLOTS } from "@/lib/constants";
import type { ServiceType, Address, Store } from "@/types";

import { Icons, getServiceIcon, IconCircle } from "@/components/ui/Icons";
import Modal from "@/components/ui/Modal";
import { calculateOrderPrice, PricingConfig } from "@/utils/pricing";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import PromptPayCheckout from "@/components/checkout/PromptPayCheckout";

// Haversine (straight-line) — used as instant fallback while OSRM loads
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

// OSRM road distance — returns actual driving distance in km
const osrmCache = new Map<string, { distanceKm: number; durationMin: number }>();

async function getRoadDistance(
  lat1: number, lon1: number, lat2: number, lon2: number
): Promise<{ distanceKm: number; durationMin: number } | null> {
  const cacheKey = `${lat1.toFixed(5)},${lon1.toFixed(5)}-${lat2.toFixed(5)},${lon2.toFixed(5)}`;
  if (osrmCache.has(cacheKey)) return osrmCache.get(cacheKey)!;

  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]) {
      const result = {
        distanceKm: data.routes[0].distance / 1000,
        durationMin: Math.ceil(data.routes[0].duration / 60),
      };
      osrmCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.warn('OSRM fallback to Haversine:', err);
  }
  return null;
}
import { useTranslation } from "@/components/providers/LanguageProvider";
import { useLiff } from "@/components/providers/LiffProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useScrollCollapse } from "@/hooks/useScrollCollapse";
import HowToOverlay from "@/components/tutorial/HowToOverlay";

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

  const pkgDataParam = searchParams.get("pkgData");
  const pkgDataRaw = useMemo(() => {
    if (!pkgDataParam) return null;
    try {
      return JSON.parse(decodeURIComponent(atob(pkgDataParam)));
    } catch(e) { return null; }
  }, [pkgDataParam]);

  const { profile, login, isReady } = useLiff();
  const { t, language } = useTranslation();
  const { showToast } = useToast();

  // Format "9kg" → "9 kg." for display
  const formatKg = (val: string) => val.replace(/(\d+)kg/, '$1 kg.');
  const [step, setStep] = useState<BookingStep>(validInitService ? "details" : "service");
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(validInitService);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  // Favorites system
  const [favorites, setFavorites] = useState<string[]>([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("rubjob_fav_services");
      if (saved) setFavorites(JSON.parse(saved));
    } catch {}
  }, []);
  const toggleFavorite = (svcId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(svcId) ? prev.filter(id => id !== svcId) : [...prev, svcId];
      localStorage.setItem("rubjob_fav_services", JSON.stringify(next));
      showToast(next.includes(svcId) ? "⭐ บันทึกเป็นรายการโปรดแล้ว" : "ลบออกจากรายการโปรดแล้ว", "success");
      return next;
    });
  };
  type DeliverySpeed = "standard" | "express";
  const [deliverySpeed, setDeliverySpeed] = useState<DeliverySpeed>("standard");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliverySlot, setDeliverySlot] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("promptpay");
  const [tempPhone, setTempPhone] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  
  // Weight & Size based selection instead of per-piece items
  const [bagSize, setBagSize] = useState<string>("9kg");
  const [machineSize, setMachineSize] = useState<"small" | "large">("small");
  const [washMode, setWashMode] = useState<"standard" | "extra">("standard");
  const [selectedSizePrice, setSelectedSizePrice] = useState<number>(0);
  const [selectedSizeCost, setSelectedSizeCost] = useState<number>(0);
  const [selectedSizeExtraCost, setSelectedSizeExtraCost] = useState<number>(0);
  const [withFolding, setWithFolding] = useState<boolean>(true);
  const [needsDetergent, setNeedsDetergent] = useState<boolean>(true);

  // Pickup: always scheduled (no more instant option)
  const [pickupDate, setPickupDate] = useState("");
  const [pickupSlot, setPickupSlot] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isCollapsed = useScrollCollapse(40);
  const [isSkippingPayment, setIsSkippingPayment] = useState(false);

  // Tutorial support
  const tutorialParam = searchParams.get("tutorial");
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStartStep, setTutorialStartStep] = useState(0);
  useEffect(() => {
    if (tutorialParam) {
      const stepNum = parseInt(tutorialParam);
      if (!isNaN(stepNum)) {
        setTutorialStartStep(stepNum);
        // Delay to let page render
        setTimeout(() => setShowTutorial(true), 800);
      }
    } else {
      // Check sessionStorage for tutorial continuation
      const savedStep = sessionStorage.getItem("rubjob_tutorial_step");
      if (savedStep) {
        sessionStorage.removeItem("rubjob_tutorial_step");
        const stepNum = parseInt(savedStep);
        if (!isNaN(stepNum)) {
          setTutorialStartStep(stepNum);
          setTimeout(() => setShowTutorial(true), 800);
        }
      }
    }
  }, [tutorialParam]);

  function handleTutorialComplete() {
    setShowTutorial(false);
    const userId = profile?.userId;
    if (userId) {
      localStorage.setItem(`rubjob_tutorial_seen_${userId}`, "true");
    }
    // Navigate back home after tutorial
    router.push("/");
  }

  // Reactive clock — ticks every 30s so isSlotPassed re-evaluates as real time passes
  const [clockTick, setClockTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClockTick(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [dbStores, setDbStores] = useState<any[]>([]);
  const [dbAddresses, setDbAddresses] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>({});
  const [paymentQR, setPaymentQR] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>({ gpRubberPercent: 10, platformFeePerDelivery: 10, deliveryFeeBase: 50 });

  // Fetch Payment Config
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/payment/config");
        const data = await res.json() as any;
        if (data.publishableKey) {
          setPublishableKey(data.publishableKey);
          setStripePromise(loadStripe(data.publishableKey));
        }
      } catch (err) {
        console.error("Failed to fetch payment config", err);
      }
    }
    fetchConfig();
  }, []);

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

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Fetch real data from APIs
  useEffect(() => {
    // If profile is still loading from useLiff, wait
    // If profile is null after loading, it means user is a guest or not logged in yet
    if (!profile?.userId) {
      // We still want to load services and stores even for guests to see the UI
      // but addresses will be empty.
    }

    async function fetchData() {
      setIsDataLoading(true);
      setDataError(null);
      try {
        // Individual fetching with safe fallbacks
        const [sRes, stRes, adRes, setRes, pricingRes] = await Promise.all([
          fetch("/api/services").catch(() => null),
          fetch("/api/stores").catch(() => null),
          profile?.userId ? fetch(`/api/user/addresses?userId=${profile.userId}`).catch(() => null) : Promise.resolve(null),
          fetch("/api/admin/settings").catch(() => null),
          fetch("/api/settings/pricing").catch(() => null),
        ]);

        const sData = sRes?.ok ? await sRes.json() as any : { services: [] };
        const stData = stRes?.ok ? await stRes.json() as any : { stores: [] };
        const adData = adRes?.ok ? await adRes.json() as any : { addresses: [] };
        const setData = setRes?.ok ? await setRes.json() as any : { settings: [] };
        const pricingData = pricingRes?.ok ? await pricingRes.json() as any : null;

        if (sData?.services) setDbServices(sData.services);
        if (stData?.stores) setDbStores(stData.stores);
        
        if (setData?.settings && Array.isArray(setData.settings)) {
          const settingsMap: Record<string, any> = {};
          setData.settings.forEach((s: any) => {
            if (s.key) settingsMap[s.key] = s.value;
          });
          setSystemSettings(settingsMap);
        }

        if (pricingData) {
          setPricingConfig({
            gpRubberPercent: pricingData.gpRubberPercent ?? 10,
            platformFeePerDelivery: pricingData.platformFeePerDelivery ?? 10,
            deliveryFeeBase: pricingData.deliveryFeeBase ?? 50,
          });
        }
        
        if (adData?.addresses && Array.isArray(adData.addresses)) {
          setDbAddresses(adData.addresses);
          if (adData.addresses.length > 0 && !selectedAddress) {
            const firstAddr = adData.addresses[0];
            setSelectedAddress(firstAddr);
            if (stData?.stores) {
              const store = autoAssignStore(firstAddr, stData.stores);
              if (store) setSelectedStore(store);
            }
          }
        }
      } catch (err: unknown) {
        console.error("Failed to fetch booking data:", err);
        setDataError(err instanceof Error ? err.message : "Failed to load booking data");
      } finally {
        setIsDataLoading(false);
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

  const locale = language === "th" ? "th" : "en";

  // Date/time constraints and generation...
  const dates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return {
        value: d.toISOString().slice(0, 10),
        day: d.toLocaleDateString(locale, { weekday: "short" }),
        date: d.getDate(),
        month: d.toLocaleDateString(locale, { month: "short" }),
      };
    });
  }, [locale]);

  const isSlotPassed = (slotStartTime: string, dateVal: string) => {
    // clockTick ensures this re-evaluates when time passes (every 30s)
    const now = new Date(clockTick);
    // Use local time comparison
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    if (dateVal > todayStr) return false;
    if (dateVal < todayStr) return true;

    const [slotH, slotM] = slotStartTime.split(":").map(Number);
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    // Disable if current time has passed the start time
    return currentH > slotH || (currentH === slotH && currentM >= slotM);
  };

  // Set default pickup date/slot
  useEffect(() => {
    if (!pickupDate && dates.length > 0) {
      const validDate = dates.find(d => TIME_SLOTS.some(s => !isSlotPassed(s.startTime, d.value)));
      setPickupDate(validDate ? validDate.value : dates[0].value);
    }
  }, [dates, pickupDate]);

  // Ensure selected slot is valid for the selected date (re-runs when clock ticks)
  useEffect(() => {
    if (pickupDate && TIME_SLOTS.length > 0) {
      const validSlots = TIME_SLOTS.filter(s => !isSlotPassed(s.startTime, pickupDate));
      if (validSlots.length > 0) {
        if (!pickupSlot || isSlotPassed(TIME_SLOTS.find(s => s.id === pickupSlot)?.startTime || "00:00", pickupDate)) {
          setPickupSlot(validSlots[0].id);
        }
      } else {
        // All slots passed for today — auto-advance to next date with valid slots
        const nextDate = dates.find(d => d.value > pickupDate && TIME_SLOTS.some(s => !isSlotPassed(s.startTime, d.value)));
        if (nextDate) {
          setPickupDate(nextDate.value);
        } else {
          setPickupSlot(""); // No slots available at all
        }
      }
    }
  }, [pickupDate, pickupSlot, clockTick]);

  // Road distance state (OSRM)
  const [roadDistance, setRoadDistance] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [isLoadingDistance, setIsLoadingDistance] = useState(false);

  // Haversine as immediate estimate
  const haversineKm = selectedStore && selectedAddress?.lat && selectedAddress?.lng 
    ? getDistanceKm(selectedAddress.lat, selectedAddress.lng, selectedStore.lat, selectedStore.lng)
    : 5.1;

  // Fetch real road distance when address/store changes
  useEffect(() => {
    if (!selectedStore || !selectedAddress?.lat || !selectedAddress?.lng) {
      setRoadDistance(null);
      return;
    }
    let cancelled = false;
    setIsLoadingDistance(true);
    getRoadDistance(
      selectedAddress.lat, selectedAddress.lng,
      selectedStore.lat, selectedStore.lng
    ).then(result => {
      if (!cancelled) {
        setRoadDistance(result);
        setIsLoadingDistance(false);
      }
    });
    return () => { cancelled = true; };
  }, [selectedStore?.id, selectedAddress?.lat, selectedAddress?.lng]);

  // Use road distance if available, fallback to Haversine
  const distanceKm = roadDistance?.distanceKm ?? haversineKm;
  const estimatedMinutes = roadDistance?.durationMin ?? null;
  
  // Round Trip Delivery Fare = base + distance bonus
  const roundTripKm = distanceKm * 2;
  const roundTripDistanceBonus = roundTripKm > 3 ? (roundTripKm - 3) * 10 : 0;
  const totalDeliveryBase = pricingConfig.deliveryFeeBase + roundTripDistanceBonus;
    
  // Pricing Logic (2026 Strategy)
  let pricing: any = { customerTotal: 0, breakdown: { laundry: 0, delivery: 0, addons: 0 } };
  
  try {
    pricing = calculateOrderPrice({
      weightKg: parseInt(bagSize) || 9,
      distanceKm: distanceKm || 0,
      isExpress: deliverySpeed === "express",
      needsDetergent: needsDetergent,
      withFolding: withFolding,
      machineSize: machineSize,
      washMode: "standard", // Always default to standard mode (customer can request extra via chat)
      storePrices: selectedSizePrice > 0 ? { standard: selectedSizeCost || selectedSizePrice, extra: selectedSizeExtraCost || selectedSizePrice } : undefined,
      laundryAppPrice: selectedSizePrice > 0 ? selectedSizePrice : undefined,
      storeCostPrice: selectedSizeCost > 0 ? selectedSizeCost : undefined,
    }, pricingConfig);
  } catch (err) {
    console.error("Pricing error:", err);
  }

  const laundryFee = pricing.breakdown.laundry;
  const laundryCost = pricing.breakdown.storeCost || laundryFee;
  const deliveryFee = pricing.breakdown.delivery;
  const addonsTotal = pricing.breakdown.addons;

  // Add-on components for display
  const bagSizeExtra = 0; // Legacy, now integrated into laundryFee
  const foldingFee = withFolding ? 10 : 0;

  const subTotal = pricing.customerTotal;
  const totalDiscount = couponDiscount + pointsDiscount;
  const totalPrice = Math.ceil(Math.max(subTotal - totalDiscount, 0));

  const minOrderAmount = Number(systemSettings.min_order_amount) || 0;
  const isBelowMinOrder = totalPrice < minOrderAmount;

  const unitLabel = service?.unit === "hour" ? t("booking.hours") : service?.unit === "session" ? t("home.perSession") : t("home.perPiece");

  const isTooFar = distanceKm > 10;

  async function handleConfirm(): Promise<boolean> {
    // Block real order creation during tutorial mode
    if (tutorialParam) {
      showToast("นี่คือโหมดสอนใช้งาน ไม่สามารถสั่งจริงได้", "info");
      return false;
    }
    if (isTooFar) {
      showToast(t("booking.errors.tooFar") || "ขออภัย ระยะทางไกลเกิน 10 กม. ไม่สามารถให้บริการได้", "error");
      return false;
    }
    if (isBelowMinOrder) {
      showToast(t("booking.errors.minOrder").replace("{amount}", minOrderAmount.toString()), "error");
      return false;
    }

    if (activeOrderId && paymentQR) {
      // If we already have a QR and ID, just redirect to orders (user might have scanned already)
      router.push(`/orders/${activeOrderId}`);
      return false;
    }

    setIsSubmitting(true);
    try {
      if (!profile?.userId) {
        showToast(t("booking.loginRequired"), "error");
        setIsSubmitting(false);
        return false;
      }
      if ((!selectedStore?.id && !service?.isDynamicGig) || !selectedService) {
        showToast(t("booking.selectServiceStore"), "error");
        setIsSubmitting(false);
        return false;
      }
      
      const userId = profile.userId;
      const payload = {
        userId,
        storeId: service?.isDynamicGig ? undefined : selectedStore?.id,
        providerId: service?.isDynamicGig ? service.providerId : undefined,
        serviceId: selectedService,
        items: pkgDataRaw 
          ? [{ name: `${service?.name || selectedService} - ${pkgDataRaw.name}`, qty: 1 }] 
          : service?.category === "laundry" 
            ? [{ name: `${t("booking.bag")} ${formatKg(bagSize)}`, qty: 1 }] 
            : [{ name: service?.name || selectedService, qty: 1 }],
        address: selectedAddress,
        paymentMethod: selectedPayment,
        laundryFee,
        laundryCost,
        deliveryFee,
        distanceKm,
        totalPrice,
        pickupDateTime: `${pickupDate} ${pickupSlot}`,
        scheduledDate: deliverySpeed === "express" ? t("booking.speed.expressShort") : t("booking.speed.standardShort"),
        customerNote: customerNote.trim() || undefined,
        serviceDetails: JSON.stringify({
          machineSize,
          washMode,
          bagSize,
          needsDetergent,
          withFolding
        }),
        discountCode: appliedCoupon?.code || undefined,
        discountAmount: appliedCoupon?.discount || 0,
      };

      // 1. Create Booking
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const bookingData = await res.json() as any;
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

      const payData = await payRes.json() as any;
      if (payRes.ok && payData.clientSecret) {
        setPaymentQR(payData.clientSecret);
        return true;
      } else {
        // Show specific error from payment API
        showToast(`${t("common.error")}: ${payData.error || 'Payment init failed'}`, "error");
        return false;
      }
    } catch (error: unknown) {
      console.error(error);
      const msg = error instanceof Error ? error.message : t("booking.genericError");
      showToast(`${t("common.error")}: ${msg}`, "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  // 1. Loading State
  if (isDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-slate-50 gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{t("common.loading")}</p>
      </div>
    );
  }
  
  // 1.5 Wait for LIFF Initialization
  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-slate-50 gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{t("booking.connectingLine")}</p>
      </div>
    );
  }

  // 2. Error State
  if (dataError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-10 text-center bg-slate-50">
        <IconCircle variant="orange" size="lg" className="mb-6">
          <Icons.AlertCircle size={32} />
        </IconCircle>
        <h2 className="text-xl font-black text-slate-900">{t("common.error")}</h2>
        <p className="text-slate-500 mt-2 text-sm font-bold">{dataError}</p>
        <Button 
          className="mt-8 rounded-xl font-black px-10 shadow-lg shadow-primary/20"
          onClick={() => window.location.reload()}
        >
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  // 3. Login Required
  if (!profile?.userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-10 text-center bg-slate-50">
        <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 border border-slate-100 rotate-3">
           <Icons.Logo variant="icon" size={48} className="text-primary" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">{t("booking.loginRequiredTitle") || "เข้าสู่ระบบเพื่อจองงาน"}</h2>
        <p className="text-slate-500 mt-3 font-bold text-sm leading-relaxed">
          {t("booking.loginRequiredDesc") || "กรุณาเข้าสู่ระบบผ่าน LINE เพื่อเริ่มขั้นตอนการสั่งบริการซักอบรีด"}
        </p>
        <Button 
          className="mt-10 w-full rounded-2xl font-black py-4 shadow-xl shadow-primary/20"
          onClick={() => login()}
        >
          {t("common.login")}
        </Button>
        <button 
          onClick={() => router.push("/")}
          className="mt-6 text-xs font-black text-slate-400 uppercase tracking-widest"
        >
          {t("common.goHome")}
        </button>
      </div>
    );
  }

  // 4. Handle platform closed state
  if (isLoaded && systemSettings.is_open === "false") {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-10 text-center animate-page-enter bg-slate-50">
        <div className="w-24 h-24 bg-white rounded-xl shadow-xl flex items-center justify-center mb-8 border border-slate-100">
           <Icons.Settings size={48} className="text-slate-300 animate-spin-slow" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">{t("booking.errors.systemClosedTitle")}</h2>
        <p className="text-slate-500 mt-3 font-medium leading-relaxed">
          {t("booking.errors.systemClosedDesc")?.split("\n").map((line: string, i: number) => (
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
      {/* Header */}
      <header className={`bg-white px-5 border-b border-border sticky top-0 z-30 header-transition ${
        isCollapsed ? "pt-2 pb-2 shadow-md" : "pt-4 pb-4"
      }`}>
        <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (step === "service") router.back();
                else if (step === "details") setStep("service");
                else if (step === "payment") setStep("details");
              }}
              className="active:scale-95 transition-transform"
            >
              <IconCircle variant="white" size={isCollapsed ? "xs" : "sm"}>
                <Icons.Back size={isCollapsed ? 14 : 18} />
              </IconCircle>
            </button>
          <h1 className={`font-bold text-foreground header-transition ${isCollapsed ? "text-sm" : "text-lg"}`}>
            {step === "service" ? t("booking.serviceTitle") : 
            step === "details" ? t("booking.pickupTitle") : 
             t("orders.payment.title")}
          </h1>
        </div>

        {/* Progress bar — hides on scroll */}
        <div className={`flex gap-2 header-element-collapse ${isCollapsed ? "mt-0 header-element-hidden" : "mt-4"}`}>
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

      <div className="flex-1 px-5 py-5 pb-56 space-y-4 animate-page-enter relative">

        {/* ─── Step: Service ─── */}
        {step === "service" && (
          <div className="space-y-3 stagger">
            {/* Favorites hint */}
            {favorites.length === 0 && dbServices.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                <Icons.Star size={14} className="text-amber-400" />
                <p className="text-[10px] font-bold text-amber-600">กดดาว ⭐ เพื่อบันทึกบริการโปรด สำหรับจองด่วนครั้งถัดไป</p>
              </div>
            )}
            {/* Sort: favorites first */}
            {[...dbServices].sort((a, b) => {
              const aFav = favorites.includes(a.id) ? -1 : 0;
              const bFav = favorites.includes(b.id) ? -1 : 0;
              return aFav - bFav;
            }).map((svc) => (
                <Card
                  key={svc.id}
                  hoverable
                  onClick={() => {
                    setSelectedService(svc.id as ServiceType);
                    if (svc.id === "duvet_washing") setBagSize("28kg");
                    setStep("details");
                  }}
                  className={`p-4 flex items-center gap-3 transition-all duration-300 border-2 ${
                    selectedService === svc.id
                      ? "bg-primary/5 border-primary shadow-xl shadow-primary/20 scale-[1.02] ring-4 ring-primary/10"
                      : favorites.includes(svc.id)
                        ? "border-amber-200 bg-amber-50/30"
                        : "border-slate-100 hover:border-slate-200"
                  }`}
                >
                <IconCircle variant={selectedService === svc.id ? "orange" : "white"} size="md" className="shrink-0">
                  {getServiceIcon(svc.id, { size: 22 })}
                </IconCircle>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black text-foreground">{t(`orders.services.${svc.id}`) || svc.name}</h3>
                    {favorites.includes(svc.id) && (
                      <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full uppercase leading-none">โปรด</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted mt-0.5 leading-relaxed opacity-90 line-clamp-1">{t(`serviceDesc.${svc.id}`) || svc.description}</p>
                </div>
                <button
                  onClick={(e) => toggleFavorite(svc.id, e)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 ${
                    favorites.includes(svc.id)
                      ? "bg-amber-100 text-amber-500"
                      : "bg-slate-50 text-slate-300 hover:text-amber-400 hover:bg-amber-50"
                  }`}
                >
                  <Icons.Star size={16} />
                </button>
              </Card>
            ))}
          </div>
        )}

        {/* ─── Step: Details ─── */}
        {step === "details" && (
          <div className="space-y-5 animate-page-enter">
            {/* Service Selection (Editable) */}
            <div data-tutorial-step="2">
            <section>
              {service && (
                <Card
                  hoverable
                  onClick={() => setStep("service")}
                  className="p-2.5 transition-all duration-300 border border-slate-100 hover:border-primary/50 bg-white shadow-sm flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <IconCircle variant="orange" size="xs">
                      {getServiceIcon(service.id, { size: 12 })}
                    </IconCircle>
                    <p className="text-xs font-black text-slate-800 truncate">{t(`orders.services.${service.id}`) || service.name}</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0 ml-2">
                    <Icons.Edit size={12} />
                  </div>
                </Card>
              )}
            </section>

            {/* Address selection */}
            <section>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[10px] font-black text-slate-400 flex items-center gap-1 uppercase tracking-tight">
                  <Icons.MapPin size={10} strokeWidth={3} className="text-primary" /> {t("booking.pickupAddress")}
                </h3>
                <button 
                  onClick={() => router.push("/profile/addresses")}
                  className="text-[10px] font-bold text-primary active:opacity-60 transition-opacity"
                >
                  {t("booking.addNew")}
                </button>
              </div>
              {dbAddresses.length === 0 && (
                <p className="text-center py-3 text-xs text-muted">{t("booking.noAddress")}</p>
              )}
              {selectedAddress && (
                <Card
                  hoverable
                  onClick={() => router.push("/profile/addresses?redirect=/booking")}
                  className="p-2.5 transition-all duration-300 border border-slate-100 hover:border-primary/50 bg-white shadow-sm flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <IconCircle variant="orange" size="xs">
                      {selectedAddress.label.toLowerCase().includes("home") || selectedAddress.label.toLowerCase().includes("บ้าน") ? <Icons.Home size={12} /> : <Icons.Office size={12} />}
                    </IconCircle>
                    <p className="text-xs font-bold text-slate-800 truncate">{selectedAddress.label}{selectedAddress.details ? ` — ${selectedAddress.details}` : ''}</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0 ml-2">
                    <Icons.Edit size={12} />
                  </div>
                </Card>
              )}
              {/* Auto-assigned store is hidden from the user per requirements */}
            </section>
            </div>

            {/* Customer Note for Driver */}
            <section data-tutorial-step="3">
              <h3 className="text-[10px] font-black text-slate-400 flex items-center gap-1 uppercase tracking-tight mb-1">
                <Icons.Edit size={10} strokeWidth={3} className="text-primary" /> {t("booking.noteForDriver") || "โน้ตถึงคนขับ"}
              </h3>
              <div className="relative">
                <input
                  type="text"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value.slice(0, 100))}
                  placeholder={t("booking.notePlaceholder") || "เช่น ฝากผ้าไว้หน้าบ้าน, กดกริ่งชั้น 3"}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  maxLength={100}
                />
                {customerNote && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300">{customerNote.length}/100</span>
                )}
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* 🟠 GROUP 1: ค่าซักผ้า (ส่วนนี้ต้องจ่ายอยู่แล้ว)       */}
            {/* ═══════════════════════════════════════════════════════ */}
            {service?.category === "laundry" && (
              <section>
                <div className="rounded-2xl border-2 border-amber-200/60 bg-gradient-to-b from-amber-50/50 to-white overflow-hidden mb-4" data-tutorial-step="4">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-100/60 border-b border-amber-200/40">
                    <Icons.Tasks size={14} strokeWidth={3} className="text-amber-600" />
                    <span className="text-xs font-black text-amber-800 uppercase tracking-tight">ค่าซัก + อบผ้า</span>
                    <span className="text-[9px] font-bold text-amber-500 ml-auto">ส่วนนี้ต้องจ่ายอยู่แล้ว</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-[10px] text-slate-400 font-bold">เลือกขนาดที่เหมาะกับปริมาณผ้าของคุณ</p>
                    {selectedService === "duvet_washing" ? (
                      <div className="grid grid-cols-1">
                        <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-primary bg-primary/5 shadow-md shadow-primary/10">
                          <span className="text-sm font-black text-foreground">{t("booking.bagMaxSize")}</span>
                          <span className="text-[10px] text-muted font-bold mt-1">{t("booking.bagMaxDesc")}</span>
                        </label>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {(() => {
                          const store = selectedStore as any;
                          const washers = store?.washers && store.washers.length > 0
                            ? [...store.washers].sort((a: any, b: any) => a.sizeKg - b.sizeKg) : null;
                          let sizeOptions: any[] = [];
                          if (store?.machineType === 'combo') {
                            const smallWasher = washers?.find((w: any) => w.sizeKg <= 15) || {};
                            const largeWasher = washers?.find((w: any) => w.sizeKg > 15) || {};
                            const smallCost = smallWasher.priceStandard || 100;
                            const smallExtraCost = smallWasher.priceExtra || 140;
                            const largeCost = largeWasher.priceStandard || 120;
                            const largeExtraCost = largeWasher.priceExtra || 160;
                            sizeOptions = [
                              { sizeKg: 9, label: "9 kg", price: 120, cost: smallCost, extraCost: smallExtraCost },
                              { sizeKg: 14, label: "14 kg", price: 140, cost: smallCost, extraCost: smallExtraCost },
                              { sizeKg: 18, label: "18 kg", price: 170, cost: largeCost, extraCost: largeExtraCost },
                              { sizeKg: 28, label: "28 kg", price: 210, cost: largeCost, extraCost: largeExtraCost },
                            ];
                          } else {
                            const dryers = store?.dryers || [];
                            const fixedSizes = [
                              { sizeKg: 9, price: 120, defaultWash: 50, defaultDry: 50 },
                              { sizeKg: 14, price: 140, defaultWash: 70, defaultDry: 50 },
                              { sizeKg: 18, price: 170, defaultWash: 80, defaultDry: 70 },
                              { sizeKg: 28, price: 210, defaultWash: 110, defaultDry: 70 },
                            ];
                            sizeOptions = fixedSizes.map(fs => {
                              const washer = washers?.length > 0 ? washers.reduce((prev: any, curr: any) =>
                                Math.abs(curr.sizeKg - fs.sizeKg) < Math.abs(prev.sizeKg - fs.sizeKg) ? curr : prev
                              ) : {};
                              const dryer = dryers.length > 0 ? dryers.reduce((prev: any, curr: any) =>
                                Math.abs(curr.sizeKg - fs.sizeKg) < Math.abs(prev.sizeKg - fs.sizeKg) ? curr : prev
                              ) : {};
                              const cost = (washer.priceCold || fs.defaultWash) + (dryer.priceStandard || dryer.priceCold || fs.defaultDry);
                              const extraCost = (washer.priceHot || fs.defaultWash + 10) + (dryer.priceStandard || dryer.priceCold || fs.defaultDry);
                              return { sizeKg: fs.sizeKg, label: `${fs.sizeKg} kg`, price: fs.price, cost, extraCost };
                            });
                          }
                          const piecesMap: Record<number, string> = { 9: '~25 ชิ้น', 14: '~40 ชิ้น', 18: '~60 ชิ้น', 28: '~85 ชิ้น' };
                          return sizeOptions.map((opt: any) => (
                            <button key={opt.sizeKg} onClick={() => {
                              setBagSize(`${opt.sizeKg}kg`); setMachineSize(opt.sizeKg <= 14 ? "small" : "large");
                              setSelectedSizePrice(opt.price); setSelectedSizeCost(opt.cost); setSelectedSizeExtraCost(opt.extraCost || opt.cost);
                            }} className={`flex flex-col items-center py-3 px-1 rounded-xl border-2 transition-all active:scale-[0.97] ${bagSize === `${opt.sizeKg}kg` ? "border-primary bg-primary/5 shadow-md shadow-primary/10" : "border-slate-100 bg-white hover:border-slate-200"}`}>
                              <p className={`text-sm font-black leading-tight ${bagSize === `${opt.sizeKg}kg` ? "text-primary" : "text-slate-900"}`}>{opt.label}</p>
                              <p className="text-[8px] text-slate-400 font-bold mt-0.5">{piecesMap[opt.sizeKg]}</p>
                              <p className={`text-xs font-black mt-1 ${bagSize === `${opt.sizeKg}kg` ? "text-primary" : "text-slate-500"}`}>฿{opt.price}</p>
                            </button>
                          ));
                        })()}
                      </div>
                    )}

                    {/* Inline add-ons — folding + detergent in one row */}
                    <div className="flex gap-2">
                      <button onClick={() => setWithFolding(!withFolding)} className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all active:scale-[0.97] ${withFolding ? "border-primary bg-primary/5" : "border-slate-100 bg-white"}`}>
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${withFolding ? "bg-primary text-white" : "border-2 border-slate-200"}`}>
                          {withFolding && <Icons.Check size={10} strokeWidth={3} />}
                        </div>
                        <div className="text-left">
                          <p className="text-[11px] font-bold text-slate-800">{t("booking.options.withFolding")}</p>
                          <p className="text-[9px] font-bold text-primary">+฿10</p>
                        </div>
                      </button>
                      <button onClick={() => setNeedsDetergent(!needsDetergent)} className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all active:scale-[0.97] ${needsDetergent ? "border-primary bg-primary/5" : "border-slate-100 bg-white"}`}>
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${needsDetergent ? "bg-primary text-white" : "border-2 border-slate-200"}`}>
                          {needsDetergent && <Icons.Check size={10} strokeWidth={3} />}
                        </div>
                        <div className="text-left">
                          <p className="text-[11px] font-bold text-slate-800">{t("booking.detergentLabel")}</p>
                          <p className="text-[9px] font-bold text-primary">+฿15</p>
                        </div>
                      </button>
                    </div>

                    {/* Promo banner */}
                    {new Date() <= new Date("2026-06-30T23:59:59+07:00") && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl animate-page-enter">
                        <span className="text-base">✨</span>
                        <p className="text-[11px] font-bold text-emerald-700">มีคูปองพับผ้าฟรี! ถึง 30 มิ.ย. นี้</p>
                      </div>
                    )}

                    {/* Laundry subtotal */}
                    <div className="flex items-center justify-between pt-2 border-t border-amber-200/40">
                      <span className="text-xs font-bold text-amber-700">รวมค่าซัก</span>
                      <span className="text-sm font-black text-amber-800">฿{laundryFee + addonsTotal}</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* 🔵 GROUP 2: ค่าบริการรับ-ส่ง RUBJOB                   */}
            {/* ═══════════════════════════════════════════════════════ */}
            <section>
              <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-white overflow-hidden mb-4" data-tutorial-step="5">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border-b border-primary/15">
                  <Icons.Truck size={14} strokeWidth={3} className="text-primary" />
                  <span className="text-xs font-black text-primary-dark uppercase tracking-tight">ค่าบริการรับ-ส่ง RUBJOB</span>
                  <span className="text-[9px] font-bold text-primary/50 ml-auto">เพิ่มเติมจากบริการ</span>
                </div>
                <div className="p-4 space-y-3">
                  {/* Time slot selection */}
                  <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <Icons.Bell size={10} strokeWidth={3} className="text-primary" /> {t("booking.pickupSelectTime")}
                  </p>

                  {TIME_SLOTS.every(s => isSlotPassed(s.startTime, pickupDate)) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2 animate-page-enter">
                      <Icons.Bell size={14} className="text-amber-500 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-amber-700">{t("booking.outsideHoursTitle")}</p>
                        <p className="text-[9px] text-amber-600">{t("booking.outsideHoursDesc")}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const isDisabled = isSlotPassed(slot.startTime, pickupDate);
                      return (
                        <button key={slot.id} disabled={isDisabled} onClick={() => setPickupSlot(slot.id)}
                          className={`py-3 px-3 rounded-xl text-center transition-all ${
                            isDisabled ? "bg-slate-50 text-slate-300 cursor-not-allowed opacity-40"
                            : pickupSlot === slot.id ? "bg-primary text-white shadow-md shadow-primary/20"
                            : "bg-white text-foreground hover:bg-slate-100 border border-slate-200"
                          }`}>
                          <p className={`text-xs font-black ${isDisabled ? "line-through" : ""}`}>{t(`timeSlots.${slot.id}`) || slot.label}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Delivery speed */}
                  <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 pt-1">
                    <Icons.Home size={10} strokeWidth={3} className="text-primary" /> {t("booking.deliveryOptions")}
                  </p>
                  <div className="space-y-2">
                    <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${deliverySpeed === "standard" ? "border-primary bg-primary/5 shadow-sm" : "border-slate-100 bg-white"}`} onClick={() => setDeliverySpeed("standard")}>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">{t("booking.speed.standardTitle")}</span>
                        <span className="text-[10px] text-muted mt-0.5">{t("booking.speed.standardDesc").replace("{fee}", Math.ceil(totalDeliveryBase).toString()).replace("{halfFee}", Math.ceil(totalDeliveryBase / 2).toString())}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${deliverySpeed === "standard" ? "bg-primary text-white" : "border-2 border-slate-200"}`}>
                        {deliverySpeed === "standard" && <span className="text-[8px] font-bold">✓</span>}
                      </div>
                    </label>
                    <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${deliverySpeed === "express" ? "border-primary bg-primary/5 shadow-sm" : "border-slate-100 bg-white"}`} onClick={() => setDeliverySpeed("express")}>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-primary-dark">{t("booking.speed.expressTitle")}</span>
                        <span className="text-[10px] text-primary/60 mt-0.5">{t("booking.speed.expressDesc").replace("{fee}", Math.ceil(totalDeliveryBase + 20).toString()).replace("{halfFee}", Math.ceil((totalDeliveryBase + 20) / 2).toString())}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${deliverySpeed === "express" ? "bg-primary text-white" : "border-2 border-slate-200"}`}>
                        {deliverySpeed === "express" && <span className="text-[8px] font-bold">✓</span>}
                      </div>
                    </label>
                  </div>
                  {roundTripDistanceBonus > 0 && <span className="text-[9px] text-muted block">{t("booking.distanceNote").replace("{distance}", roundTripKm.toFixed(1))}</span>}

                  {/* Delivery subtotal */}
                  <div className="flex items-center justify-between pt-2 border-t border-primary/15">
                    <span className="text-xs font-bold text-primary-dark">รวมค่าส่ง</span>
                    <span className="text-sm font-black text-primary-dark">฿{deliveryFee}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* GROUP 3: ยอดรวม + คูปอง                                */}
            {/* ═══════════════════════════════════════════════════════ */}
            <section className="animate-page-enter">
              <Card className="p-4 space-y-3">
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1.5"><Icons.Tasks size={12} className="text-amber-500" /> ค่าซัก + อบผ้า {formatKg(bagSize)}</span>
                    <span className="font-bold text-slate-700">฿{laundryFee + addonsTotal}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1.5"><Icons.Truck size={12} className="text-primary" /> {t("booking.summary.deliveryFee")}</span>
                    <span className="font-bold text-slate-700">฿{deliveryFee}</span>
                  </div>
                  {(couponDiscount > 0 || pointsDiscount > 0) && (<>
                    {couponDiscount > 0 && (
                      <div className="flex items-center justify-between text-emerald-600 font-bold">
                        <span className="flex items-center gap-1"><Icons.Ticket size={12} /> {t("booking.summary.discountCoupon")}</span>
                        <span>-฿{couponDiscount}</span>
                      </div>
                    )}
                    {pointsDiscount > 0 && (
                      <div className="flex items-center justify-between text-emerald-600 font-bold">
                        <span className="flex items-center gap-1"><Icons.Guarantee size={12} /> {t("booking.summary.discountPoints")}</span>
                        <span>-฿{pointsDiscount}</span>
                      </div>
                    )}
                  </>)}
                </div>

                <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                  <span className="text-sm font-black text-slate-900">{t("booking.summaryTitle")}</span>
                  <span className="text-xl font-black text-primary">฿{totalPrice}</span>
                </div>

                {/* Compact coupon section */}
                <div className="border-t border-slate-100 pt-3 space-y-2" data-tutorial-step="6">
                  {/* Coupon picker button — full width */}
                  <button onClick={async () => {
                    setIsCouponModalOpen(true); setIsLoadingCoupons(true);
                    try { const res = await fetch("/api/coupons"); const data = await res.json() as any; if (data.coupons) setAvailableCoupons(data.coupons); }
                    catch (err) { console.error("Failed to fetch coupons", err); }
                    finally { setIsLoadingCoupons(false); }
                  }} className="w-full flex items-center gap-2 px-3 py-2.5 bg-primary/10 hover:bg-primary/15 border border-primary/20 rounded-xl transition-all active:scale-[0.97]">
                    <Icons.Ticket size={14} className="text-primary" />
                    <span className="text-[11px] font-black text-primary">{t("booking.selectCoupon")}</span>
                    <Icons.ChevronRight size={12} className="text-primary/50 ml-auto" />
                  </button>
                  {/* Manual code input — separate row */}
                  <div className="flex gap-2">
                    <input type="text" placeholder={t("booking.couponPlaceholder")} value={couponCode} onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 min-w-0 bg-slate-50 border border-slate-200 focus:border-primary/40 rounded-xl px-3 py-2.5 text-xs focus:outline-none font-bold uppercase placeholder:normal-case placeholder:font-medium placeholder:text-slate-300 transition-colors" />
                    <Button onClick={async () => {
                      if (!couponCode) return;
                      try {
                        const res = await fetch("/api/coupons/validate", { method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ code: couponCode, subtotal: laundryFee + deliveryFee, userRole: 'customer' }) });
                        const data = await res.json() as any;
                        if (res.ok && data.success) { setAppliedCoupon({ code: data.coupon.code, discount: data.coupon.discount });
                          showToast(t("booking.couponSuccess").replace("{amount}", data.coupon.discount.toString()), "success"); setCouponCode(data.coupon.code);
                        } else { showToast(`❌ ${data.error || t("booking.couponErrorGeneric")}`, "error"); }
                      } catch (err) { console.error("Coupon validation error:", err); showToast(`❌ ${t("booking.couponErrorGeneric")}`, "error"); }
                    }} className="rounded-xl text-[10px] font-black py-2.5 px-4 shadow-sm shrink-0">{t("booking.applyCoupon")}</Button>
                  </div>

                  {appliedCoupon && (
                    <div className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-3 py-2 rounded-xl flex items-center justify-between border border-emerald-200">
                      <span className="flex items-center gap-1.5"><Icons.Check size={14} strokeWidth={3} />{t("booking.couponApplied").replace("{code}", appliedCoupon.code)}</span>
                      <button onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">{t("common.remove")}</button>
                    </div>
                  )}

                  <label className="flex items-center justify-between cursor-pointer" onClick={() => setUsePoints(!usePoints)}>
                    <div className="flex items-center gap-2">
                      <Icons.Guarantee size={16} className={usePoints ? "text-amber-500" : "text-slate-300"} />
                      <span className="text-xs font-bold text-foreground">{t("booking.usePoints")}</span>
                      <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md font-black border border-amber-100">{availablePoints} Pts</span>
                    </div>
                    <div className={`w-[38px] h-[22px] rounded-full p-[2px] transition-all duration-300 flex items-center ${usePoints ? "bg-primary" : "bg-slate-200"}`}>
                      <div className={`w-[18px] h-[18px] rounded-full bg-white transition-transform duration-300 shadow-sm ${usePoints ? "translate-x-[16px]" : "translate-x-0"}`} />
                    </div>
                  </label>
                </div>
              </Card>
            </section>
          </div>
        )}

        {/* ─── Step: Payment & Summary ─── */}
        {step === "payment" && (
          <div className="space-y-6 animate-page-enter">
            {/* Order Summary */}
            <section className="space-y-3" data-tutorial-step="7">
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
                    <Row icon={<Icons.Home size={12} />} label={t("common.store")} value={
                      isLoadingDistance 
                        ? `${selectedStore.name} (~${(haversineKm * 2).toFixed(1)} ${t("booking.km")} ไป-กลับ...)` 
                        : `${selectedStore.name} (${roundTripKm.toFixed(1)} ${t("booking.km")} ไป-กลับ${estimatedMinutes ? ` ~${estimatedMinutes * 2} นาที` : ''})`
                    } />
                  )}
                  <Row icon={<Icons.FileText size={11} />} label={t("booking.confirm.bagSize")} value={`${formatKg(bagSize)} ${bagSizeExtra > 0 ? `(+฿${bagSizeExtra})` : ""}`} />
                  <Row icon={<Icons.Tasks size={11} />} label={t("booking.confirm.extraService")} value={withFolding ? t("booking.options.withFoldingShort") : t("booking.options.noFoldingShort")} />
                </div>
              </Card>
            </section>

            <div className="text-center space-y-1 pt-2">
              <h2 className="text-base font-black text-foreground">{t("booking.selectPayment")}</h2>
              <p className="text-xs text-muted">{t("booking.scanToPayPromptPay")}</p>
            </div>

            {/* Main PromptPay QR Section */}
            <div className="flex flex-col items-center gap-4 py-2">
              <Card data-tutorial-step="8" 
                className={`p-6 border-2 transition-all duration-300 flex flex-col items-center gap-5 w-full max-w-[320px] mx-auto ${
                  selectedPayment === "promptpay" ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10 scale-[1.02]" : "border-slate-100 opacity-60 grayscale"
                }`} 
                onClick={() => setSelectedPayment("promptpay")}
              >
                {tutorialParam ? (
                  <>
                    <div className="bg-[#1a3d6d] px-5 py-2.5 rounded-xl flex items-center gap-3">
                      <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                        <span className="text-[11px] font-black text-[#1a3d6d]">PP</span>
                      </div>
                      <span className="text-base font-black text-white">PromptPay</span>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl shadow-inner border border-slate-100 relative overflow-hidden">
                      {/* Tutorial-only fake QR — encodes a harmless text string */}
                      <img 
                        src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=RUBJOB-TUTORIAL-DEMO-NOT-REAL-PAYMENT"
                        alt="Demo QR" 
                        className="w-48 h-48 object-contain"
                      />
                      {/* ตัวอย่าง watermark */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-4xl font-black text-red-500/40 -rotate-30 select-none">ตัวอย่าง</span>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-bold text-muted">{t("booking.amountDue")}</span>
                        <span className="text-2xl font-black text-foreground">฿{totalPrice}</span>
                      </div>
                      <p className="text-xs text-red-400 font-bold mt-1">
                        โหมดสอนใช้งาน — ไม่ใช่การชำระเงินจริง
                      </p>
                    </div>
                  </>
                ) : paymentQR && stripePromise ? (
                   <Elements stripe={stripePromise} options={{ clientSecret: paymentQR, appearance: { theme: 'stripe' } }}>
                      <PromptPayCheckout clientSecret={paymentQR} autoConfirm />
                   </Elements>
                ) : (
                  <>
                    <div className="bg-[#1a3d6d] px-5 py-2.5 rounded-xl flex items-center gap-3">
                      <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                        <span className="text-[11px] font-black text-[#1a3d6d]">PP</span>
                      </div>
                      <span className="text-base font-black text-white">PromptPay</span>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl shadow-inner border border-slate-100 relative overflow-hidden">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020101021129370016A000000677010111011300660000000005802TH5303764580215${totalPrice}.006304`}
                        alt="PromptPay Placeholder" 
                        className="w-48 h-48 object-contain opacity-20 grayscale"
                      />
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-xl">
                          {isSubmitting ? <Icons.Loading className="animate-spin" /> : <Icons.Payment size={24} />}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm font-bold text-muted">{t("booking.amountDue")}</span>
                        <span className="text-2xl font-black text-foreground">฿{totalPrice}</span>
                      </div>
                      <p className="text-xs text-primary-dark font-bold mt-1 uppercase">
                        {t("booking.instantConfirmation")}
                      </p>
                    </div>
                  </>
                )}
              </Card>
            </div>

            <div className="flex items-center justify-center gap-2 py-2 opacity-50 mt-4">
              <Icons.Shield size={14} className="text-green-600" />
              <span className="text-xs font-bold uppercase text-foreground">{t("orders.payment.secure")}</span>
            </div>

            {/* Skip Payment removed for production security */}
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
            <p className="text-xs font-black text-rose-600 uppercase">
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
            onClick={() => {
              if (!selectedService) {
                showToast(t("booking.selectServiceStore"), "error");
                return;
              }
              setStep("details");
            }}
          >
            {t("common.confirm")}
          </Button>
        )}
        {step === "details" && (
          <div className="space-y-3">

            {isTooFar && (
              <div className="bg-red-50 text-red-600 text-[11px] font-bold p-2 rounded-lg flex items-center gap-2 border border-red-100">
                <Icons.AlertCircle size={14} />
                {t("booking.errors.tooFar") || "ขออภัย ระยะทางไกลเกิน 10 กม. ไม่สามารถให้บริการได้"}
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted uppercase">{t("booking.summary.total")}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {(couponDiscount > 0 || pointsDiscount > 0) && <span className="text-xs text-slate-400 line-through font-bold">฿{subTotal}</span>}
                    <span className={`text-2xl font-black leading-none ${isTooFar ? "text-slate-400" : "text-primary-dark"}`}>฿{totalPrice}</span>
                  </div>
                  <span className="text-[9px] text-muted font-medium mt-0.5">{t("booking.summary.taxIncluded")}</span>
                </div>
                <Button
                  size="lg"
                  onClick={async () => {
                    if (!selectedAddress) {
                      showToast(t("booking.errors.noAddress"), "error");
                      return;
                    }
                    if (!pickupDate || !pickupSlot) {
                      showToast(t("booking.errors.noDateTime"), "error");
                      return;
                    }

                    const success = await handleConfirm();
                    if (success) setStep("payment");
                  }}
                  disabled={isTooFar || isSubmitting}
                  className={`min-w-[120px] py-4 text-base ${(isTooFar || isSubmitting) ? "bg-slate-300 text-slate-500 shadow-none border-transparent cursor-not-allowed" : ""}`}
                >
                  {isSubmitting ? t("common.loading") : isTooFar ? t("booking.errors.tooFar") : t("common.confirm")}
                </Button>
              </div>
            </div>
          </div>
        )}
        {step === "payment" && (
          <Button
            fullWidth
            size="lg"
            isLoading={isSubmitting}
            disabled={isSubmitting || !paymentQR}
            className={(!paymentQR) ? "bg-slate-300 text-slate-500 shadow-none border-transparent cursor-not-allowed" : ""}
            onClick={() => {
              if (activeOrderId) router.push(`/orders/${activeOrderId}`);
            }}
          >
            {isSubmitting ? t("common.loading") : 
             paymentQR ? t("booking.viewMyOrders") : t("common.loading")}
          </Button>
        )}
      </div>
      
      {/* Coupon Selection Modal */}
      <Modal isOpen={isCouponModalOpen} onClose={() => setIsCouponModalOpen(false)} title={t("booking.selectCoupon")}>
         <div className="space-y-3 pt-2">
            {isLoadingCoupons && (
               <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-xs font-bold text-slate-400 uppercase">{t("common.loading")}</p>
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
                           body: JSON.stringify({ code: cpn.code, subtotal: laundryFee + deliveryFee, userRole: 'customer' })
                        });
                        const data = await res.json() as any;
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
                  className="w-full relative group transition-transform active:scale-[0.97]"
               >
                  {/* Premium Ticket Container */}
                  <div className="bg-white rounded-2xl overflow-hidden shadow-md shadow-primary/5 border border-slate-100 group-hover:shadow-lg group-hover:shadow-primary/10 group-hover:border-primary/20 transition-all duration-300">
                    {/* Top: Gradient discount banner */}
                    <div className="bg-gradient-to-r from-primary/15 via-amber-50 to-primary/10 px-5 py-5 flex items-center justify-between relative">
                      {/* Decorative circles */}
                      <div className="absolute -bottom-3 left-6 w-6 h-6 bg-white rounded-full border border-slate-100" />
                      <div className="absolute -bottom-3 right-6 w-6 h-6 bg-white rounded-full border border-slate-100" />
                      
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/80 backdrop-blur rounded-2xl flex flex-col items-center justify-center shadow-sm border border-white">
                          <span className="text-[9px] font-black text-primary uppercase leading-none">{t("booking.off")}</span>
                          <span className="text-2xl font-black text-primary-dark leading-none mt-0.5">
                            {cpn.type === 'percentage' ? `${cpn.value}%` : `฿${cpn.value}`}
                          </span>
                        </div>
                        <div className="text-left">
                          <h4 className="text-base font-black text-slate-900 leading-tight">{cpn.title || cpn.code}</h4>
                          <p className="text-xs font-bold text-slate-500 mt-1 line-clamp-2 leading-relaxed">{cpn.description || t("promotions.subtitle")}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black font-mono bg-white/80 backdrop-blur text-primary-dark px-2.5 py-1.5 rounded-lg uppercase shadow-sm border border-white shrink-0">{cpn.code}</span>
                    </div>

                    {/* Bottom: Details + CTA */}
                    <div className="px-5 py-4 flex items-center justify-between border-t border-dashed border-slate-100">
                      <div className="flex items-center gap-5">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider">{t("booking.minSpend")}</span>
                          <span className="text-sm font-black text-slate-700">฿{cpn.minOrder || 0}</span>
                        </div>
                        <div className="w-px h-8 bg-slate-100" />
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider">{t("booking.expires")}</span>
                          <span className="text-sm font-black text-amber-600">
                            {cpn.expiryDate ? new Date(cpn.expiryDate).toLocaleDateString("th-TH", { day: 'numeric', month: 'short', year: '2-digit' }) : "∞"}
                          </span>
                        </div>
                      </div>
                      <div className="bg-primary text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md shadow-primary/20 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all uppercase tracking-wider">
                        {t("common.useNow")}
                      </div>
                    </div>
                  </div>
               </button>
            ))}
         </div>
      </Modal>
      
      {/* Too Far Modal */}
      <Modal isOpen={isTooFar} onClose={() => router.push("/")} title={t("booking.errors.tooFarTitle") || "อยู่นอกพื้นที่บริการ"}>
         <div 
           className="flex flex-col items-center justify-center py-10 px-5 text-center cursor-pointer active:opacity-80 transition-opacity"
           onClick={() => router.push("/")}
         >
            <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-8 animate-pulse">
               <Icons.AlertCircle size={48} />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">
               {t("booking.errors.tooFarTitle") || "อยู่นอกพื้นที่บริการ"}
            </h2>
            <p className="text-sm font-bold text-slate-500 leading-relaxed whitespace-pre-line">
               {t("booking.errors.tooFarDesc")}
            </p>
            <div className="mt-12 w-full">
              <Button 
                 fullWidth 
                 className="rounded-2xl py-4 font-black shadow-lg shadow-primary/20"
              >
                 {t("common.goHome")}
              </Button>
            </div>
         </div>
      </Modal>

      {/* Tutorial Overlay */}
      {showTutorial && (
        <HowToOverlay
          onComplete={handleTutorialComplete}
          startStep={tutorialStartStep}
          onStepChange={(stepIdx) => {
            // Step indices: 0-4 = details steps, 5 = coupon (still details), 6-7 = payment steps
            if (stepIdx >= 6) {
              setStep("payment");
            } else {
              setStep("details");
            }
          }}
        />
      )}
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
