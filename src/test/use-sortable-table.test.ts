import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSortableTable } from '@/hooks/useSortableTable'

interface Row {
  name: string
  count: number
}

const rows: Row[] = [
  { name: 'bob', count: 5 },
  { name: 'alice', count: 20 },
  { name: 'carol', count: 10 },
]

describe('useSortableTable', () => {
  it('returns items unsorted when no column is selected', () => {
    const { result } = renderHook(() => useSortableTable<Row, keyof Row>(rows))
    expect(result.current.sortedItems.map(r => r.name)).toEqual(['bob', 'alice', 'carol'])
  })

  it('sorts numeric columns descending on first click', () => {
    const { result } = renderHook(() => useSortableTable<Row, keyof Row>(rows))
    act(() => result.current.handleSort('count'))
    expect(result.current.sortedItems.map(r => r.count)).toEqual([20, 10, 5])
    expect(result.current.sortDirection).toBe('desc')
  })

  it('toggles direction when the same column is clicked again', () => {
    const { result } = renderHook(() => useSortableTable<Row, keyof Row>(rows))
    act(() => result.current.handleSort('count'))
    act(() => result.current.handleSort('count'))
    expect(result.current.sortedItems.map(r => r.count)).toEqual([5, 10, 20])
    expect(result.current.sortDirection).toBe('asc')
  })

  it('sorts string columns alphabetically', () => {
    const { result } = renderHook(() => useSortableTable<Row, keyof Row>(rows))
    act(() => result.current.handleSort('name'))
    act(() => result.current.handleSort('name')) // switch to asc
    expect(result.current.sortedItems.map(r => r.name)).toEqual(['alice', 'bob', 'carol'])
  })

  it('resets to descending when switching to a new column', () => {
    const { result } = renderHook(() => useSortableTable<Row, keyof Row>(rows))
    act(() => result.current.handleSort('count'))
    act(() => result.current.handleSort('count')) // now asc
    act(() => result.current.handleSort('name')) // new column -> desc
    expect(result.current.sortColumn).toBe('name')
    expect(result.current.sortDirection).toBe('desc')
    expect(result.current.sortedItems.map(r => r.name)).toEqual(['carol', 'bob', 'alice'])
  })
})
