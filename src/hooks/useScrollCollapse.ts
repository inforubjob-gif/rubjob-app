"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook to detect scroll position and toggle header collapse state.
 * Returns `isCollapsed` (true when user has scrolled past `threshold`).
 * 
 * Usage:
 *   const isCollapsed = useScrollCollapse(60);
 *   // Apply CSS classes conditionally based on isCollapsed
 */
export function useScrollCollapse(threshold = 60): boolean {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    setIsCollapsed(scrollY > threshold);
  }, [threshold]);

  useEffect(() => {
    // Check initial state
    handleScroll();
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return isCollapsed;
}
