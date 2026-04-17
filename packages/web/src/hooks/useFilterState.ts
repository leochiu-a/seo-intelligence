import { useState, useCallback } from 'react';

/**
 * Manages active filter keys for the global filter panel.
 *
 * Filter key format:
 * - Global node:  "node:{nodeId}"
 * - Placement:    "placement:{nodeId}:{placementId}"
 */
export function useFilterState() {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const toggle = useCallback((key: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setActiveFilters(new Set());
  }, []);

  return { activeFilters, toggle, clear };
}
