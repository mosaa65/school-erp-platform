"use client";

import type { PaginatedResponse } from "@/lib/api/client";

export type CurrencyListItem = {
  id: string;
  name: string;
  symbol?: string;
  precision: number;
  isBase: boolean;
  isActive: boolean;
  createdAt: string;
};

export type CreateCurrencyPayload = {
  name: string;
  symbol?: string;
  precision: number;
  isBase: boolean;
  isActive: boolean;
};

export type UpdateCurrencyPayload = Partial<CreateCurrencyPayload>;

export type ListCurrenciesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  isBase?: boolean;
  isActive?: boolean;
};

const seedData: CurrencyListItem[] = [
  {
    id: "cur-usd",
    name: "دولار أمريكي",
    symbol: "$",
    precision: 2,
    isBase: false,
    isActive: true,
    createdAt: new Date("2025-01-15").toISOString(),
  },
  {
    id: "cur-sar",
    name: "ريال سعودي",
    symbol: "ر.س",
    precision: 2,
    isBase: true,
    isActive: true,
    createdAt: new Date("2025-02-01").toISOString(),
  },
  {
    id: "cur-yer",
    name: "ريال يمني",
    symbol: "ر.ي",
    precision: 2,
    isBase: false,
    isActive: true,
    createdAt: new Date("2025-03-10").toISOString(),
  },
  {
    id: "cur-eur",
    name: "يورو",
    symbol: "€",
    precision: 2,
    isBase: false,
    isActive: false,
    createdAt: new Date("2025-04-22").toISOString(),
  },
];

let currenciesStore = [...seedData];

const createId = () => `cur-${Math.random().toString(36).slice(2, 9)}`;

function applySearch(items: CurrencyListItem[], search?: string) {
  if (!search) {
    return items;
  }

  const query = search.trim().toLowerCase();
  if (!query) {
    return items;
  }

  return items.filter((item) => {
    return (
      item.name.toLowerCase().includes(query) ||
      item.symbol?.toLowerCase().includes(query)
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

export function listCurrencies(query: ListCurrenciesQuery = {}): PaginatedResponse<CurrencyListItem> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 12;

  let results = [...currenciesStore].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  results = applySearch(results, query.search);

  if (query.isBase !== undefined) {
    results = results.filter((item) => item.isBase === query.isBase);
  }

  if (query.isActive !== undefined) {
    results = results.filter((item) => item.isActive === query.isActive);
  }

  return paginate(results, page, limit);
}

export function createCurrency(payload: CreateCurrencyPayload): CurrencyListItem {
  const newRecord: CurrencyListItem = {
    id: createId(),
    name: payload.name,
    symbol: payload.symbol,
    precision: payload.precision,
    isBase: payload.isBase,
    isActive: payload.isActive,
    createdAt: new Date().toISOString(),
  };

  currenciesStore = [newRecord, ...currenciesStore];
  return newRecord;
}

export function updateCurrency(currencyId: string, payload: UpdateCurrencyPayload): CurrencyListItem {
  const index = currenciesStore.findIndex((item) => item.id === currencyId);
  if (index === -1) {
    throw new Error("تعذّر العثور على العملة المطلوبة تحديثها.");
  }

  const current = currenciesStore[index];
  const updated: CurrencyListItem = {
    ...current,
    ...payload,
  };

  currenciesStore = [
    ...currenciesStore.slice(0, index),
    updated,
    ...currenciesStore.slice(index + 1),
  ];

  return updated;
}

export function deleteCurrency(currencyId: string) {
  const exists = currenciesStore.some((item) => item.id === currencyId);
  if (!exists) {
    throw new Error("تعذّر العثور على العملة المطلوبة حذفها.");
  }

  currenciesStore = currenciesStore.filter((item) => item.id !== currencyId);
}

export function hasBaseCurrency(excludeId?: string) {
  return currenciesStore.some((item) => item.isBase && item.id !== excludeId);
}

export function listAllCurrencies() {
  return [...currenciesStore];
}
