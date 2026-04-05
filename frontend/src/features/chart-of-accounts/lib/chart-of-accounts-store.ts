"use client";

import type { PaginatedResponse } from "@/lib/api/client";

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export type ChartOfAccountListItem = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentAccountId?: string;
  isControl: boolean;
  isActive: boolean;
  createdAt: string;
};

export type CreateChartOfAccountPayload = {
  code: string;
  name: string;
  type: AccountType;
  parentAccountId?: string;
  isControl: boolean;
  isActive: boolean;
};

export type UpdateChartOfAccountPayload = Partial<CreateChartOfAccountPayload>;

export type ListChartOfAccountsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  type?: AccountType;
  isActive?: boolean;
};

const seedData: ChartOfAccountListItem[] = [
  {
    id: "coa-1000",
    code: "1000",
    name: "الأصول المتداولة",
    type: "ASSET",
    isControl: true,
    isActive: true,
    createdAt: new Date("2025-01-10").toISOString(),
  },
  {
    id: "coa-1100",
    code: "1100",
    name: "الصندوق",
    type: "ASSET",
    parentAccountId: "coa-1000",
    isControl: false,
    isActive: true,
    createdAt: new Date("2025-01-12").toISOString(),
  },
  {
    id: "coa-2000",
    code: "2000",
    name: "الالتزامات المتداولة",
    type: "LIABILITY",
    isControl: true,
    isActive: true,
    createdAt: new Date("2025-01-15").toISOString(),
  },
  {
    id: "coa-4000",
    code: "4000",
    name: "الإيرادات التشغيلية",
    type: "REVENUE",
    isControl: true,
    isActive: true,
    createdAt: new Date("2025-02-01").toISOString(),
  },
];

let chartOfAccountsStore = [...seedData];

const createId = () => `coa-${Math.random().toString(36).slice(2, 9)}`;

function applySearch(items: ChartOfAccountListItem[], search?: string) {
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

export function listChartOfAccounts(
  query: ListChartOfAccountsQuery = {},
): PaginatedResponse<ChartOfAccountListItem> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 12;

  let results = [...chartOfAccountsStore].sort((a, b) => a.code.localeCompare(b.code));

  results = applySearch(results, query.search);

  if (query.type) {
    results = results.filter((item) => item.type === query.type);
  }

  if (query.isActive !== undefined) {
    results = results.filter((item) => item.isActive === query.isActive);
  }

  return paginate(results, page, limit);
}

export function createChartOfAccount(
  payload: CreateChartOfAccountPayload,
): ChartOfAccountListItem {
  const newRecord: ChartOfAccountListItem = {
    id: createId(),
    code: payload.code,
    name: payload.name,
    type: payload.type,
    parentAccountId: payload.parentAccountId,
    isControl: payload.isControl,
    isActive: payload.isActive,
    createdAt: new Date().toISOString(),
  };

  chartOfAccountsStore = [newRecord, ...chartOfAccountsStore];
  return newRecord;
}

export function updateChartOfAccount(
  accountId: string,
  payload: UpdateChartOfAccountPayload,
): ChartOfAccountListItem {
  const index = chartOfAccountsStore.findIndex((item) => item.id === accountId);
  if (index === -1) {
    throw new Error("تعذّر العثور على الحساب المطلوب تحديثه.");
  }

  const current = chartOfAccountsStore[index];
  const updated: ChartOfAccountListItem = {
    ...current,
    ...payload,
  };

  chartOfAccountsStore = [
    ...chartOfAccountsStore.slice(0, index),
    updated,
    ...chartOfAccountsStore.slice(index + 1),
  ];

  return updated;
}

export function deleteChartOfAccount(accountId: string) {
  const exists = chartOfAccountsStore.some((item) => item.id === accountId);
  if (!exists) {
    throw new Error("تعذّر العثور على الحساب المطلوب حذفه.");
  }

  chartOfAccountsStore = chartOfAccountsStore.filter((item) => item.id !== accountId);
}

export function listAllChartOfAccounts() {
  return [...chartOfAccountsStore];
}
