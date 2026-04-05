import type { Page, Route } from "@playwright/test";

type JsonObject = Record<string, unknown>;

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ListResponse<T extends JsonObject> = {
  data: T[];
  pagination: PaginationMeta;
};

type ListWithPostMockOptions<T extends JsonObject> = {
  page: Page;
  urlPattern: string;
  initialItems: T[];
  listLimit?: number;
  createStatus?: number;
  onCreate?: (payload: JsonObject, context: { items: T[]; postCount: number }) => T;
};

type ListWithPostMockHandle<T extends JsonObject> = {
  getItems: () => T[];
  getPostCount: () => number;
  getGetCount: () => number;
  getLastCreatePayload: () => JsonObject | null;
};

type CrudListMockOptions<T extends JsonObject> = {
  page: Page;
  urlPattern: string;
  initialItems: T[];
  listLimit?: number;
  createStatus?: number;
  updateStatus?: number;
  deleteStatus?: number;
  getItemId?: (item: T) => string;
  onCreate?: (payload: JsonObject, context: { items: T[]; postCount: number }) => T;
  onUpdate?: (
    payload: JsonObject,
    context: {
      item: T;
      items: T[];
      patchCount: number;
      itemId: string;
      action: string | null;
    },
  ) => T;
  onDelete?: (context: { item: T; items: T[]; deleteCount: number; itemId: string }) => void;
};

type CrudListMockHandle<T extends JsonObject> = {
  getItems: () => T[];
  getPostCount: () => number;
  getPatchCount: () => number;
  getDeleteCount: () => number;
  getGetCount: () => number;
  getLastCreatePayload: () => JsonObject | null;
  getLastUpdatePayload: () => JsonObject | null;
  getLastDeletedId: () => string | null;
};

function buildPagination(total: number, page = 1, limit = 12): PaginationMeta {
  const totalPages = total === 0 ? 1 : Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
  };
}

function buildListResponse<T extends JsonObject>(
  data: T[],
  page = 1,
  limit = 12,
): ListResponse<T> {
  return {
    data,
    pagination: buildPagination(data.length, page, limit),
  };
}

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function parsePayload(requestBody: string | null): JsonObject {
  if (!requestBody) {
    return {};
  }

  try {
    return JSON.parse(requestBody) as JsonObject;
  } catch {
    return {};
  }
}

function getItemId<T extends JsonObject>(
  item: T,
  resolver?: (item: T) => string,
): string {
  if (resolver) {
    return resolver(item);
  }

  const candidate = item["id"];
  if (typeof candidate !== "string" || candidate.length === 0) {
    throw new Error("Mock item must include a string id or provide getItemId.");
  }

  return candidate;
}

function extractRequestTargetFromUrl(url: string): {
  itemId: string | null;
  action: string | null;
} {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    const lastSegment = segments.at(-1) ?? null;
    const actionSegments = new Set([
      "approve",
      "reject",
      "cancel",
      "lock",
      "unlock",
      "revoke",
    ]);

    if (lastSegment && actionSegments.has(lastSegment) && segments.length >= 2) {
      return {
        itemId: segments.at(-2) ?? null,
        action: lastSegment,
      };
    }

    return {
      itemId: lastSegment,
      action: null,
    };
  } catch {
    return {
      itemId: null,
      action: null,
    };
  }
}

async function mockOptionsList<T extends JsonObject>(
  page: Page,
  urlPattern: string,
  items: T[],
) {
  await page.route(urlPattern, async (route) => {
    await fulfillJson(route, 200, buildListResponse(items, 1, 100));
  });
}

export async function mockEmployeesOptions<T extends JsonObject>(page: Page, employees: T[]) {
  await mockOptionsList(page, "**/backend/employees**", employees);
}

export async function mockEmployeeOrganizationOptions(
  page: Page,
  options: {
    departments?: JsonObject[];
    branches?: JsonObject[];
    costCenters?: JsonObject[];
    managers?: JsonObject[];
  } = {},
) {
  await page.route("**/backend/employees/organization-options", async (route) => {
    await fulfillJson(route, 200, {
      departments: options.departments ?? [],
      branches: options.branches ?? [],
      costCenters: options.costCenters ?? [],
      managers: options.managers ?? [],
    });
  });
}

export async function mockTalentsOptions<T extends JsonObject>(page: Page, talents: T[]) {
  await mockOptionsList(page, "**/backend/talents**", talents);
}

export async function mockAcademicYearsOptions<T extends JsonObject>(page: Page, years: T[]) {
  await mockOptionsList(page, "**/backend/academic-years**", years);
}

export async function mockAcademicTermsOptions<T extends JsonObject>(page: Page, terms: T[]) {
  await mockOptionsList(page, "**/backend/academic-terms**", terms);
}

export async function mockGradeLevelsOptions<T extends JsonObject>(page: Page, gradeLevels: T[]) {
  await mockOptionsList(page, "**/backend/grade-levels**", gradeLevels);
}

export async function mockSubjectsOptions<T extends JsonObject>(page: Page, subjects: T[]) {
  await mockOptionsList(page, "**/backend/subjects**", subjects);
}

export async function mockSectionsOptions<T extends JsonObject>(page: Page, sections: T[]) {
  await mockOptionsList(page, "**/backend/sections**", sections);
}

export async function mockStudentsOptions<T extends JsonObject>(page: Page, students: T[]) {
  await mockOptionsList(page, "**/backend/students**", students);
}

export async function mockRelationshipTypeOptions<T extends JsonObject>(
  page: Page,
  relationshipTypes: T[],
) {
  await mockOptionsList(
    page,
    "**/backend/lookup/catalog/relationship-types**",
    relationshipTypes,
  );
}

export async function mockSummaryEndpoint(
  page: Page,
  urlPattern: string,
  body: JsonObject,
): Promise<{ getCalls: () => number }> {
  let getCalls = 0;

  await page.route(urlPattern, async (route) => {
    if (route.request().method() === "GET") {
      getCalls += 1;
    }
    await fulfillJson(route, 200, body);
  });

  return {
    getCalls: () => getCalls,
  };
}

export async function mockListWithPost<T extends JsonObject>(
  options: ListWithPostMockOptions<T>,
): Promise<ListWithPostMockHandle<T>> {
  const listLimit = options.listLimit ?? 12;
  const createStatus = options.createStatus ?? 201;
  let items = [...options.initialItems];
  let postCount = 0;
  let getCount = 0;
  let lastCreatePayload: JsonObject | null = null;

  await options.page.route(options.urlPattern, async (route) => {
    const method = route.request().method();

    if (method === "POST") {
      postCount += 1;
      lastCreatePayload = parsePayload(route.request().postData());

      if (options.onCreate) {
        const created = options.onCreate(lastCreatePayload, {
          items,
          postCount,
        });

        items = [created, ...items];
        await fulfillJson(route, createStatus, created);
        return;
      }
    }

    if (method === "GET") {
      getCount += 1;
    }

    await fulfillJson(route, 200, buildListResponse(items, 1, listLimit));
  });

  return {
    getItems: () => items,
    getPostCount: () => postCount,
    getGetCount: () => getCount,
    getLastCreatePayload: () => lastCreatePayload,
  };
}

export async function mockCrudList<T extends JsonObject>(
  options: CrudListMockOptions<T>,
): Promise<CrudListMockHandle<T>> {
  const listLimit = options.listLimit ?? 12;
  const createStatus = options.createStatus ?? 201;
  const updateStatus = options.updateStatus ?? 200;
  const deleteStatus = options.deleteStatus ?? 200;
  let items = [...options.initialItems];
  let postCount = 0;
  let patchCount = 0;
  let deleteCount = 0;
  let getCount = 0;
  let lastCreatePayload: JsonObject | null = null;
  let lastUpdatePayload: JsonObject | null = null;
  let lastDeletedId: string | null = null;

  await options.page.route(options.urlPattern, async (route) => {
    const method = route.request().method();

    if (method === "POST") {
      postCount += 1;
      lastCreatePayload = parsePayload(route.request().postData());

      if (options.onCreate) {
        const created = options.onCreate(lastCreatePayload, {
          items,
          postCount,
        });
        items = [created, ...items];
        await fulfillJson(route, createStatus, created);
        return;
      }
    }

    if (method === "PATCH") {
      patchCount += 1;
      lastUpdatePayload = parsePayload(route.request().postData());
      const target = extractRequestTargetFromUrl(route.request().url());
      const itemId = target.itemId;
      const index = itemId
        ? items.findIndex((item) => getItemId(item, options.getItemId) === itemId)
        : -1;

      if (index === -1) {
        await fulfillJson(route, 404, { message: "Not found" });
        return;
      }

      const currentItem = items[index];
      if (!currentItem || !itemId) {
        await fulfillJson(route, 404, { message: "Not found" });
        return;
      }

      const updated = options.onUpdate
        ? options.onUpdate(lastUpdatePayload, {
            item: currentItem,
            items,
            patchCount,
            itemId,
            action: target.action,
          })
        : ({
            ...currentItem,
            ...lastUpdatePayload,
          } as T);

      items = items.map((item, itemIndex) => (itemIndex === index ? updated : item));
      await fulfillJson(route, updateStatus, updated);
      return;
    }

    if (method === "DELETE") {
      deleteCount += 1;
      const itemId = extractRequestTargetFromUrl(route.request().url()).itemId;
      const index = itemId
        ? items.findIndex((item) => getItemId(item, options.getItemId) === itemId)
        : -1;

      if (index === -1) {
        await fulfillJson(route, 404, { message: "Not found" });
        return;
      }

      const deletedItem = items[index];
      if (!deletedItem || !itemId) {
        await fulfillJson(route, 404, { message: "Not found" });
        return;
      }

      lastDeletedId = itemId;
      items = items.filter((item, itemIndex) => itemIndex !== index);
      options.onDelete?.({
        item: deletedItem,
        items,
        deleteCount,
        itemId,
      });

      await fulfillJson(route, deleteStatus, {
        success: true,
        id: itemId,
      });
      return;
    }

    if (method === "GET") {
      getCount += 1;
    }

    await fulfillJson(route, 200, buildListResponse(items, 1, listLimit));
  });

  return {
    getItems: () => items,
    getPostCount: () => postCount,
    getPatchCount: () => patchCount,
    getDeleteCount: () => deleteCount,
    getGetCount: () => getCount,
    getLastCreatePayload: () => lastCreatePayload,
    getLastUpdatePayload: () => lastUpdatePayload,
    getLastDeletedId: () => lastDeletedId,
  };
}
