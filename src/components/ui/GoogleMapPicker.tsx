"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { APIProvider, Map, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
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
        if (pos) onChange(parseFloat(pos.lat().toFixed(6)), parseFloat(pos.lng().toFixed(6)));
      });
    }

    markerRef.current.setPosition({ lat, lng });
    markerRef.current.setMap(map);

    return () => {
      markerRef.current?.setMap(null);
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // อัปเดต position เมื่อ lat/lng เปลี่ยน
  useEffect(() => {
    if (!markerRef.current || lat === 0 || lng === 0) return;
    markerRef.current.setPosition({ lat, lng });
    markerRef.current.setMap(map);
  }, [lat, lng, map]);

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
        onSelect(place.geometry.location.lat(), place.geometry.location.lng());
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

  // Pan เมื่อ coords เปลี่ยน
  useEffect(() => {
    if (!map || lat === 0 || lng === 0) return;
    map.panTo({ lat, lng });
    if ((map.getZoom() ?? 0) < 14) map.setZoom(15);
  }, [map, lat, lng]);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onChange(parseFloat(e.latLng.lat().toFixed(6)), parseFloat(e.latLng.lng().toFixed(6)));
      }
    },
    [onChange]
  );

  return (
    <>
      <Map
        style={{ width: "100%", height: "100%" }}
        defaultCenter={lat !== 0 && lng !== 0 ? { lat, lng } : { lat: 13.7563, lng: 100.5018 }}
        defaultZoom={13}
        gestureHandling="greedy"
        onClick={handleMapClick}
      />
      <ClassicMarker lat={lat} lng={lng} onChange={onChange} />
    </>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function GoogleMapPicker({ lat, lng, onChange }: MapPickerProps) {
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
