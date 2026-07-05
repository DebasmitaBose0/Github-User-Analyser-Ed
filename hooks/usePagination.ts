import { useMemo, useState } from 'react'

interface UsePaginationResult<T> {
  page: number
  totalPages: number
  paginatedItems: T[]
  setPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  hasNext: boolean
  hasPrev: boolean
  pageSize: number
  setPageSize: (size: number) => void
  totalItems: number
}

export function usePagination<T>(
  items: T[],
  initialPageSize: number = 12
): UsePaginationResult<T> {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

  const safePage = Math.min(page, totalPages)
  if (safePage !== page) {
    setPage(safePage)
  }

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  return {
    page: safePage,
    totalPages,
    paginatedItems,
    setPage: (p: number) => setPage(Math.max(1, Math.min(p, totalPages))),
    nextPage: () => setPage((p) => Math.min(p + 1, totalPages)),
    prevPage: () => setPage((p) => Math.max(p - 1, 1)),
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size)
      setPage(1)
    },
    totalItems: items.length,
  }
}
