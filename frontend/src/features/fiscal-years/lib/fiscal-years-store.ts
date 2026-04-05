"use client";

import type { PaginatedResponse } from "@/lib/api/client";

export type FiscalYearStatus = "PLANNED" | "ACTIVE" | "CLOSED" | "ARCHIVED";

export type FiscalYearListItem = {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: FiscalYearStatus;
  isCurrent: boolean;
  createdAt: string;
};

export type CreateFiscalYearPayload = {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: FiscalYearStatus;
  isCurrent: boolean;
};

export type UpdateFiscalYearPayload = Partial<CreateFiscalYearPayload>;

export type ListFiscalYearsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: FiscalYearStatus;
  isCurrent?: boolean;
};

const seedData: FiscalYearListItem[] = [
  {
    id: "fy-2024",
    code: "FY-2024",
    name: "السنة المالية 2024",
    startDate: new Date("2024-01-01").toISOString(),
    endDate: new Date("2024-12-31").toISOString(),
    status: "CLOSED",
    isCurrent: false,
    createdAt: new Date("2023-12-01").toISOString(),
  },
  {
    id: "fy-2025",
    code: "FY-2025",
    name: "السنة المالية 2025",
    startDate: new Date("2025-01-01").toISOString(),
    endDate: new Date("2025-12-31").toISOString(),
    status: "ACTIVE",
    isCurrent: true,
    createdAt: new Date("2024-12-01").toISOString(),
  },
  {
    id: "fy-2026",
    code: "FY-2026",
    name: "السنة المالية 2026",
    startDate: new Date("2026-01-01").toISOString(),
    endDate: new Date("2026-12-31").toISOString(),
    status: "PLANNED",
    isCurrent: false,
    createdAt: new Date("2025-12-01").toISOString(),
  },
];

let fiscalYearsStore = [...seedData];

const createId = () => `fy-${Math.random().toString(36).slice(2, 9)}`;

function applySearch(items: FiscalYearListItem[], search?: string) {
  if (!search) {
    return items;
  }

  const query = search.trim().toLowerCase();
  if (!query) {
    return items;
  }

  return items.filter((item) => {
    return (
      item.code.toLowerCase().includes(query) ||
      item.name.toLowerCase().includes(query)
    );
  });
}

function paginate<T>(items: T[], page: number, limit: number): PaginatedResponse<T> {
  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * limit;
  const data = items.slice(start, start + limit);

  return {
    data,
    pagination: {
      page: currentPage,
      limit,
      total,
      totalPages,
    },
  };
}

export function listFiscalYears(query: ListFiscalYearsQuery = {}): PaginatedResponse<FiscalYearListItem> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 12;

  let results = [...fiscalYearsStore].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  results = applySearch(results, query.search);

  if (query.status) {
    results = results.filter((item) => item.status === query.status);
  }

  if (query.isCurrent !== undefined) {
    results = results.filter((item) => item.isCurrent === query.isCurrent);
  }

  return paginate(results, page, limit);
}

export function createFiscalYear(payload: CreateFiscalYearPayload): FiscalYearListItem {
  const newRecord: FiscalYearListItem = {
    id: createId(),
    code: payload.code,
    name: payload.name,
    startDate: payload.startDate,
    endDate: payload.endDate,
    status: payload.status,
    isCurrent: payload.isCurrent,
    createdAt: new Date().toISOString(),
  };

  fiscalYearsStore = [newRecord, ...fiscalYearsStore];
  return newRecord;
}

export function updateFiscalYear(
  fiscalYearId: string,
  payload: UpdateFiscalYearPayload,
): FiscalYearListItem {
  const index = fiscalYearsStore.findIndex((item) => item.id === fiscalYearId);
  if (index === -1) {
    throw new Error("تعذّر العثور على السنة المالية المطلوبة تحديثها.");
  }

  const current = fiscalYearsStore[index];
  const updated: FiscalYearListItem = {
    ...current,
    ...payload,
  };

  fiscalYearsStore = [
    ...fiscalYearsStore.slice(0, index),
    updated,
    ...fiscalYearsStore.slice(index + 1),
  ];

  return updated;
}

export function deleteFiscalYear(fiscalYearId: string) {
  const exists = fiscalYearsStore.some((item) => item.id === fiscalYearId);
  if (!exists) {
    throw new Error("تعذّر العثور على السنة المالية المطلوبة حذفها.");
  }

  fiscalYearsStore = fiscalYearsStore.filter((item) => item.id !== fiscalYearId);
}

export function hasCurrentFiscalYear(excludeId?: string) {
  return fiscalYearsStore.some((item) => item.isCurrent && item.id !== excludeId);
}

export function listAllFiscalYears() {
  return [...fiscalYearsStore];
}
