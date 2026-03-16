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
