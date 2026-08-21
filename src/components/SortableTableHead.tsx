import React from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { SortDirection } from "@/hooks/useSortableTable";

type SortableTableHeadProps<K extends string> = {
  column: K;
  activeColumn: K | null;
  direction: SortDirection;
  onSort: (column: K) => void;
  className?: string;
  align?: 'left' | 'right';
  children: React.ReactNode;
};

/**
 * Clickable table header cell with sort direction indicator, following the
 * pattern originally used for the model summary table in App.tsx.
 */
export function SortableTableHead<K extends string>({
  column,
  activeColumn,
  direction,
  onSort,
  className,
  align = 'left',
  children,
}: SortableTableHeadProps<K>) {
  return (
    <TableHead className={className}>
      <button
        className={`flex items-center gap-1 hover:text-foreground transition-colors ${align === 'right' ? 'ml-auto' : ''}`}
        onClick={() => onSort(column)}
      >
        {children}
        {activeColumn === column ? (
          direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}
