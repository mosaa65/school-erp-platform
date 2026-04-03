"use client";

import type { PaginatedResponse } from "@/lib/api/client";

export type BranchListItem = {
  id: string;
  code: string;
  name: string;
  city: string;
  address?: string;
  isMain: boolean;
  isActive: boolean;
  createdAt: string;
};

export type CreateBranchPayload = {
  code: string;
  name: string;
  city: string;
  address?: string;
  isMain: boolean;
  isActive: boolean;
};

export type UpdateBranchPayload = Partial<CreateBranchPayload>;

export type ListBranchesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  isMain?: boolean;
  isActive?: boolean;
};

const seedData: BranchListItem[] = [
  {
    id: "br-001",
    code: "MAIN",
    name: "الفرع الرئيسي",
    city: "صنعاء",
    address: "شارع الزبيري - مقابل البريد المركزي",
    isMain: true,
    isActive: true,
    createdAt: new Date("2025-07-01").toISOString(),
  },
  {
    id: "br-002",
    code: "NORTH",
    name: "فرع الشمال",
    city: "عمران",
    address: "حي الجامعة - جوار المجمع التعليمي",
    isMain: false,
    isActive: true,
    createdAt: new Date("2025-08-12").toISOString(),
  },
  {
    id: "br-003",
    code: "SOUTH",
    name: "فرع الجنوب",
    city: "عدن",
    address: "مديرية المنصورة - شارع التسعين",
    isMain: false,
    isActive: false,
    createdAt: new Date("2025-10-05").toISOString(),
  },
];

let branchesStore = [...seedData];

const createId = () => `br-${Math.random().toString(36).slice(2, 9)}`;

function applySearch(items: BranchListItem[], search?: string) {
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
      item.name.toLowerCase().includes(query) ||
      item.city.toLowerCase().includes(query) ||
      item.address?.toLowerCase().includes(query)
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

export function listBranches(query: ListBranchesQuery = {}): PaginatedResponse<BranchListItem> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 12;

  let results = [...branchesStore].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  results = applySearch(results, query.search);

  if (query.isMain !== undefined) {
    results = results.filter((item) => item.isMain === query.isMain);
  }

  if (query.isActive !== undefined) {
    results = results.filter((item) => item.isActive === query.isActive);
  }

  return paginate(results, page, limit);
}

export function createBranch(payload: CreateBranchPayload): BranchListItem {
  const newRecord: BranchListItem = {
    id: createId(),
    code: payload.code,
    name: payload.name,
    city: payload.city,
    address: payload.address,
    isMain: payload.isMain,
    isActive: payload.isActive,
    createdAt: new Date().toISOString(),
  };

  branchesStore = [newRecord, ...branchesStore];
  return newRecord;
}

export function updateBranch(branchId: string, payload: UpdateBranchPayload): BranchListItem {
  const index = branchesStore.findIndex((item) => item.id === branchId);
  if (index === -1) {
    throw new Error("تعذّر العثور على الفرع المطلوب تحديثه.");
  }

  const current = branchesStore[index];
  const updated: BranchListItem = {
    ...current,
    ...payload,
  };

  branchesStore = [
    ...branchesStore.slice(0, index),
    updated,
    ...branchesStore.slice(index + 1),
  ];

  return updated;
}

export function deleteBranch(branchId: string) {
  const exists = branchesStore.some((item) => item.id === branchId);
  if (!exists) {
    throw new Error("تعذّر العثور على الفرع المطلوب حذفه.");
  }

  branchesStore = branchesStore.filter((item) => item.id !== branchId);
}

export function hasMainBranch(excludeId?: string) {
  return branchesStore.some((item) => item.isMain && item.id !== excludeId);
}
