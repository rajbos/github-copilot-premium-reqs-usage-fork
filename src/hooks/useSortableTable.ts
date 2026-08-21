import { useCallback, useMemo, useState } from "react";

export type SortDirection = 'asc' | 'desc';

/**
 * Generic column-sorting hook for tables. Clicking the same column toggles
 * direction; clicking a new column selects it and defaults to descending.
 * Mirrors the sorting behavior originally implemented for the model summary
 * table (handleModelSort) so all tables share the same UX.
 */
export function useSortableTable<T, K extends keyof T>(
  items: T[],
  defaultColumn: K | null = null,
  defaultDirection: SortDirection = 'desc'
) {
  const [sortColumn, setSortColumn] = useState<K | null>(defaultColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);

  const handleSort = useCallback((column: K) => {
    setSortColumn(prev => {
      if (prev === column) {
        setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        return prev;
      }
      setSortDirection('desc');
      return column;
    });
  }, []);

  const sortedItems = useMemo(() => {
    if (!sortColumn) return items;
    return [...items].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      const dir = sortDirection === 'asc' ? 1 : -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * dir;
      }
      return String(aVal).localeCompare(String(bVal)) * dir;
    });
  }, [items, sortColumn, sortDirection]);

  return { sortColumn, sortDirection, handleSort, sortedItems };
}
