"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { APIProvider, Map, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  onAddressChange?: (address: string, shortName: string) => void;
}

// ── Classic Marker (ไม่ต้องใช้ mapId) ────────────────────────────────────────
function ClassicMarker({ lat, lng, onChange }: MapPickerProps) {
  const map = useMap();
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!map) return;
    if (lat === 0 && lng === 0) {
      markerRef.current?.setMap(null);
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        map,
        draggable: true,
        animation: google.maps.Animation.DROP,
      });

      markerRef.current.addListener("dragend", () => {
        const pos = markerRef.current?.getPosition();
        if (pos) {
          const plat = typeof pos.lat === "function" ? pos.lat() : pos.lat;
          const plng = typeof pos.lng === "function" ? pos.lng() : pos.lng;
          const nLat = Number(plat);
          const nLng = Number(plng);
          if (!isNaN(nLat) && !isNaN(nLng)) {
            onChange(Number(nLat.toFixed(6)), Number(nLng.toFixed(6)));
          }
        }
      });
    }

    const nLat = Number(lat);
    const nLng = Number(lng);
    if (!isNaN(nLat) && !isNaN(nLng)) {
      markerRef.current.setPosition({ lat: nLat, lng: nLng });
    }
    markerRef.current.setMap(map);

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, lat, lng]);

  return null;
}

// ── Places Autocomplete Input ────────────────────────────────────────────────
function PlacesSearch({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  const placesLib = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    autocompleteRef.current = new placesLib.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "th" },
      fields: ["geometry", "name", "formatted_address"],
    } as google.maps.places.AutocompleteOptions);

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location) {
        const loc = place.geometry.location;
        const plat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
        const plng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
        const nLat = Number(plat);
        const nLng = Number(plng);
        if (!isNaN(nLat) && !isNaN(nLng)) {
          onSelect(nLat, nLng);
        }
        if (inputRef.current) {
          inputRef.current.value = place.name || place.formatted_address || "";
        }
      }
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [placesLib, onSelect]);

  return (
    <div className="absolute top-3 left-3 right-3 z-[1000]">
      <input
        ref={inputRef}
        type="text"
        placeholder="🔍 ค้นหาสถานที่..."
        className="w-full bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400 placeholder:font-medium"
      />
    </div>
  );
}

// ── Map Content ───────────────────────────────────────────────────────────────
function MapContent({ lat, lng, onChange }: MapPickerProps) {
  const map = useMap();
  const hasAutoLocated = useRef(false);

  // Auto-locate ครั้งแรก
  useEffect(() => {
    if (lat !== 0 || lng !== 0) return;
    if (hasAutoLocated.current) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    hasAutoLocated.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, [lat, lng, onChange]);

  useEffect(() => {
    if (!map || !lat || !lng) return;
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (isNaN(nLat) || isNaN(nLng) || (nLat === 0 && nLng === 0)) return;
    
    map.panTo({ lat: nLat, lng: nLng });
    if ((map.getZoom() ?? 0) < 14) map.setZoom(15);
  }, [map, lat, lng]);

  const handleMapClick = useCallback(
    (e: any) => {
      const latLng = e.detail?.latLng || e.latLng;
      if (!latLng) return;

      const plat = typeof latLng.lat === "function" ? latLng.lat() : latLng.lat;
      const plng = typeof latLng.lng === "function" ? latLng.lng() : latLng.lng;

      const nLat = Number(plat);
      const nLng = Number(plng);
      if (!isNaN(nLat) && !isNaN(nLng)) {
        onChange(Number(nLat.toFixed(6)), Number(nLng.toFixed(6)));
      }
    },
    [onChange]
  );

  return (
    <Map
      style={{ width: "100%", height: "100%" }}
      defaultCenter={
        lat !== 0 && lng !== 0 && !isNaN(Number(lat)) && !isNaN(Number(lng))
          ? { lat: Number(lat), lng: Number(lng) }
          : { lat: 13.7563, lng: 100.5018 }
      }
      defaultZoom={13}
      gestureHandling="greedy"
      onClick={handleMapClick}
    >
      <ClassicMarker lat={lat} lng={lng} onChange={onChange} />
    </Map>
  );
}

// ── Reverse Geocoder ────────────────────────────────────────────────────────
function ReverseGeocoder({ lat, lng, onAddressChange }: { lat: number; lng: number; onAddressChange?: (address: string, shortName: string) => void }) {
  const geocodingLib = useMapsLibrary("geocoding");
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  useEffect(() => {
    if (!geocodingLib || !onAddressChange) return;
    if (!geocoderRef.current) {
      geocoderRef.current = new geocodingLib.Geocoder();
    }
    
    if (lat === 0 && lng === 0) return;

    const timer = setTimeout(() => {
      geocoderRef.current?.geocode({ location: { lat, lng }, language: "th" }, async (results, status) => {
        if (status === "OK" && results && results[0]) {
          const formattedAddress = results[0].formatted_address;
          const parts = results[0].address_components;
          const province = parts?.find((p) => p.types?.includes("administrative_area_level_1"))?.long_name;
          const district = parts?.find((p) => p.types?.includes("administrative_area_level_2"))?.long_name;
          const subdistrict = parts?.find((p) => p.types?.includes("sublocality_level_1") || p.types?.includes("sublocality"))?.long_name;
          const shortName = [subdistrict, district, province].filter(Boolean).join(", ") || formattedAddress;
          onAddressChange(formattedAddress, shortName);
        } else {
          // FALLBACK to OpenStreetMap Nominatim if Google Maps fails (e.g. no billing enabled)
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=th`);
            const data = await res.json();
            if (data && data.display_name) {
              const address = data.display_name;
              const shortName = [data.address?.suburb, data.address?.city || data.address?.town, data.address?.state].filter(Boolean).join(", ") || address;
              onAddressChange(address, shortName);
            } else {
              onAddressChange("", "");
            }
          } catch (e) {
            onAddressChange("", "");
          }
        }
      });
    }, 500);
    
    return () => clearTimeout(timer);
  }, [lat, lng, geocodingLib, onAddressChange]);

  return null;
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function GoogleMapPicker({ lat, lng, onChange, onAddressChange }: MapPickerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const handlePlaceSelect = useCallback(
    (placeLat: number, placeLng: number) => onChange(placeLat, placeLng),
    [onChange]
  );

  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(
          parseFloat(pos.coords.latitude.toFixed(6)),
          parseFloat(pos.coords.longitude.toFixed(6))
        );
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [onChange]);

  if (!isMounted) return (
    <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center font-bold text-slate-400">
      Loading Map...
    </div>
  );

  if (!GOOGLE_KEY) return (
    <div className="h-full w-full bg-red-50 rounded-xl flex items-center justify-center text-red-500 text-sm font-bold">
      Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY
    </div>
  );

  return (
    <APIProvider apiKey={GOOGLE_KEY} language="th" region="TH">
      <div
        className="w-full rounded-xl overflow-hidden border-2 border-slate-100 relative"
        style={{ minHeight: "400px", height: "400px" }}
      >
        <PlacesSearch onSelect={handlePlaceSelect} />
        <MapContent lat={lat} lng={lng} onChange={onChange} />
        <ReverseGeocoder lat={lat} lng={lng} onAddressChange={onAddressChange} />

        {/* My Location Button */}
        <button
          onClick={handleMyLocation}
          disabled={isLocating}
          className="absolute bottom-14 right-3 z-[1000] w-11 h-11 bg-white rounded-full shadow-lg border border-slate-200 flex items-center justify-center active:scale-90 transition-all hover:shadow-xl disabled:opacity-60"
          title="ตำแหน่งของฉัน"
        >
          {isLocating ? (
            <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          )}
        </button>

        <div className="absolute bottom-3 left-3 right-16 z-[999] pointer-events-none">
          <p className="text-[10px] font-bold text-slate-500 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow text-center">
            แตะแผนที่หรือลากหมุดเพื่อปรับตำแหน่ง
          </p>
        </div>
      </div>
    </APIProvider>
  );
}
