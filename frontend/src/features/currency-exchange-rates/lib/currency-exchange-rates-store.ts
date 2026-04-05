"use client";

import type { PaginatedResponse } from "@/lib/api/client";

export type CurrencyExchangeRateListItem = {
  id: string;
  baseCurrencyCode: string;
  quoteCurrencyCode: string;
  rate: number;
  effectiveDate: string;
  isActive: boolean;
  createdAt: string;
};

export type CreateCurrencyExchangeRatePayload = {
  baseCurrencyCode: string;
  quoteCurrencyCode: string;
  rate: number;
  effectiveDate: string;
  isActive: boolean;
};

export type UpdateCurrencyExchangeRatePayload = Partial<CreateCurrencyExchangeRatePayload>;

export type ListCurrencyExchangeRatesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  baseCurrencyCode?: string;
};

const seedData: CurrencyExchangeRateListItem[] = [
  {
    id: "fx-001",
    baseCurrencyCode: "SAR",
    quoteCurrencyCode: "USD",
    rate: 0.2667,
    effectiveDate: new Date("2025-01-01").toISOString(),
    isActive: true,
    createdAt: new Date("2025-01-01").toISOString(),
  },
  {
    id: "fx-002",
    baseCurrencyCode: "SAR",
    quoteCurrencyCode: "YER",
    rate: 133.45,
    effectiveDate: new Date("2025-02-01").toISOString(),
    isActive: true,
    createdAt: new Date("2025-02-01").toISOString(),
  },
  {
    id: "fx-003",
    baseCurrencyCode: "USD",
    quoteCurrencyCode: "EUR",
    rate: 0.91,
    effectiveDate: new Date("2024-12-15").toISOString(),
    isActive: false,
    createdAt: new Date("2024-12-15").toISOString(),
  },
];

let exchangeRatesStore = [...seedData];

const createId = () => `fx-${Math.random().toString(36).slice(2, 9)}`;

function applySearch(items: CurrencyExchangeRateListItem[], search?: string) {
  if (!search) {
    return items;
  }

  const query = search.trim().toLowerCase();
  if (!query) {
    return items;
  }

  return items.filter((item) => {
    const pair = `${item.baseCurrencyCode}/${item.quoteCurrencyCode}`.toLowerCase();
    return (
      pair.includes(query) ||
      item.baseCurrencyCode.toLowerCase().includes(query) ||
      item.quoteCurrencyCode.toLowerCase().includes(query)
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

export function listCurrencyExchangeRates(
  query: ListCurrencyExchangeRatesQuery = {},
): PaginatedResponse<CurrencyExchangeRateListItem> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 12;

  let results = [...exchangeRatesStore].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  results = applySearch(results, query.search);

  if (query.isActive !== undefined) {
    results = results.filter((item) => item.isActive === query.isActive);
  }

  if (query.baseCurrencyCode) {
    results = results.filter((item) => item.baseCurrencyCode === query.baseCurrencyCode);
  }

  return paginate(results, page, limit);
}

export function createCurrencyExchangeRate(
  payload: CreateCurrencyExchangeRatePayload,
): CurrencyExchangeRateListItem {
  const newRecord: CurrencyExchangeRateListItem = {
    id: createId(),
    baseCurrencyCode: payload.baseCurrencyCode,
    quoteCurrencyCode: payload.quoteCurrencyCode,
    rate: payload.rate,
    effectiveDate: payload.effectiveDate,
    isActive: payload.isActive,
    createdAt: new Date().toISOString(),
  };

  exchangeRatesStore = [newRecord, ...exchangeRatesStore];
  return newRecord;
}

export function updateCurrencyExchangeRate(
  rateId: string,
  payload: UpdateCurrencyExchangeRatePayload,
): CurrencyExchangeRateListItem {
  const index = exchangeRatesStore.findIndex((item) => item.id === rateId);
  if (index === -1) {
    throw new Error("تعذّر العثور على سعر الصرف المطلوب تحديثه.");
  }

  const current = exchangeRatesStore[index];
  const updated: CurrencyExchangeRateListItem = {
    ...current,
    ...payload,
  };

  exchangeRatesStore = [
    ...exchangeRatesStore.slice(0, index),
    updated,
    ...exchangeRatesStore.slice(index + 1),
  ];

  return updated;
}

export function deleteCurrencyExchangeRate(rateId: string) {
  const exists = exchangeRatesStore.some((item) => item.id === rateId);
  if (!exists) {
    throw new Error("تعذّر العثور على سعر الصرف المطلوب حذفه.");
  }

  exchangeRatesStore = exchangeRatesStore.filter((item) => item.id !== rateId);
}
