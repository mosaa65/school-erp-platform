"use client";

import type { PaginatedResponse } from "@/lib/api/client";

export type FiscalPeriodStatus = "OPEN" | "CLOSED";

export type FiscalPeriodListItem = {
  id: string;
  code: string;
  name: string;
  fiscalYearId: string;
  startDate: string;
  endDate: string;
  status: FiscalPeriodStatus;
  isLocked: boolean;
  createdAt: string;
};

export type CreateFiscalPeriodPayload = {
  code: string;
  name: string;
  fiscalYearId: string;
  startDate: string;
  endDate: string;
  status: FiscalPeriodStatus;
  isLocked: boolean;
};

export type UpdateFiscalPeriodPayload = Partial<CreateFiscalPeriodPayload>;

export type ListFiscalPeriodsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: FiscalPeriodStatus;
  fiscalYearId?: string;
};

const seedData: FiscalPeriodListItem[] = [
  {
    id: "fp-2025-q1",
    code: "Q1-2025",
    name: "الربع الأول 2025",
    fiscalYearId: "fy-2025",
    startDate: new Date("2025-01-01").toISOString(),
    endDate: new Date("2025-03-31").toISOString(),
    status: "CLOSED",
    isLocked: true,
    createdAt: new Date("2024-12-15").toISOString(),
  },
  {
    id: "fp-2025-q2",
    code: "Q2-2025",
    name: "الربع الثاني 2025",
    fiscalYearId: "fy-2025",
    startDate: new Date("2025-04-01").toISOString(),
    endDate: new Date("2025-06-30").toISOString(),
    status: "OPEN",
    isLocked: false,
    createdAt: new Date("2025-03-10").toISOString(),
  },
  {
    id: "fp-2025-q3",
    code: "Q3-2025",
    name: "الربع الثالث 2025",
    fiscalYearId: "fy-2025",
    startDate: new Date("2025-07-01").toISOString(),
    endDate: new Date("2025-09-30").toISOString(),
    status: "OPEN",
    isLocked: false,
    createdAt: new Date("2025-06-15").toISOString(),
  },
];

let fiscalPeriodsStore = [...seedData];

const createId = () => `fp-${Math.random().toString(36).slice(2, 9)}`;

function applySearch(items: FiscalPeriodListItem[], search?: string) {
  if (!search) {
    return items;
  }

  const query = search.trim().toLowerCase();
  if (!query) {
    return items;
  }

  return items.filter((item) => {
    return (
      item.code.toLowerCase().includes(query) || item.name.toLowerCase().includes(query)
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

export function listFiscalPeriods(
  query: ListFiscalPeriodsQuery = {},
): PaginatedResponse<FiscalPeriodListItem> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 12;

  let results = [...fiscalPeriodsStore].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  results = applySearch(results, query.search);

  if (query.status) {
    results = results.filter((item) => item.status === query.status);
  }

  if (query.fiscalYearId) {
    results = results.filter((item) => item.fiscalYearId === query.fiscalYearId);
  }

  return paginate(results, page, limit);
}

export function createFiscalPeriod(payload: CreateFiscalPeriodPayload): FiscalPeriodListItem {
  const newRecord: FiscalPeriodListItem = {
    id: createId(),
    code: payload.code,
    name: payload.name,
    fiscalYearId: payload.fiscalYearId,
    startDate: payload.startDate,
    endDate: payload.endDate,
    status: payload.status,
    isLocked: payload.isLocked,
    createdAt: new Date().toISOString(),
  };

  fiscalPeriodsStore = [newRecord, ...fiscalPeriodsStore];
  return newRecord;
}

export function updateFiscalPeriod(
  fiscalPeriodId: string,
  payload: UpdateFiscalPeriodPayload,
): FiscalPeriodListItem {
  const index = fiscalPeriodsStore.findIndex((item) => item.id === fiscalPeriodId);
  if (index === -1) {
    throw new Error("تعذّر العثور على الفترة المالية المطلوبة تحديثها.");
  }

  const current = fiscalPeriodsStore[index];
  const updated: FiscalPeriodListItem = {
    ...current,
    ...payload,
  };

  fiscalPeriodsStore = [
    ...fiscalPeriodsStore.slice(0, index),
    updated,
    ...fiscalPeriodsStore.slice(index + 1),
  ];

  return updated;
}

export function deleteFiscalPeriod(fiscalPeriodId: string) {
  const exists = fiscalPeriodsStore.some((item) => item.id === fiscalPeriodId);
  if (!exists) {
    throw new Error("تعذّر العثور على الفترة المالية المطلوبة حذفها.");
  }

  fiscalPeriodsStore = fiscalPeriodsStore.filter((item) => item.id !== fiscalPeriodId);
}
