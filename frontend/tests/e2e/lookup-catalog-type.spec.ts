import { expect, test } from "@playwright/test";
import { mockListWithPost } from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectTextVisible,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

test.describe("Lookup Catalog Type", () => {
  test("loads list and creates a new item for selected type", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupCatalogIdTypesReadCreate);

    const lookupCatalogApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/lookup/catalog/id-types**",
      initialItems: [
        {
          id: 1,
          code: "NATIONAL_ID",
          nameAr: "بطاقة شخصية",
          isActive: true,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          createdBy: null,
          updatedBy: null,
        },
      ],
      onCreate: (payload) => ({
        id: 2,
        code:
          typeof payload.code === "string" ? payload.code : "PASSPORT",
        nameAr:
          typeof payload.nameAr === "string" ? payload.nameAr : "جواز سفر",
        isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        createdBy: null,
        updatedBy: null,
      }),
    });

    await openModulePage({
      page,
      path: "/app/lookup-catalog/id-types",
      heading: "أنواع الهوية",
    });
    await expectCardsCount(page, "lookup-catalog-card", 1);

    await page.getByTestId("lookup-catalog-form-code").fill("passport");
    await page.getByTestId("lookup-catalog-form-nameAr").fill("جواز سفر");
    await page.getByTestId("lookup-catalog-form-submit").click();

    await expectCardsCount(page, "lookup-catalog-card", 2);
    await expectTextVisible(page, "PASSPORT");

    const lastCreatePayload = lookupCatalogApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["code"]).toBe("PASSPORT");
    expect(lastCreatePayload?.["nameAr"]).toBe("جواز سفر");
  });

  test("validates code format before request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupCatalogIdTypesReadCreate);

    const lookupCatalogApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/lookup/catalog/id-types**",
      initialItems: [],
    });

    await openModulePage({
      page,
      path: "/app/lookup-catalog/id-types",
      heading: "أنواع الهوية",
    });

    await page.getByTestId("lookup-catalog-form-code").fill("bad-code");
    await page.getByTestId("lookup-catalog-form-nameAr").fill("بيان تجريبي");
    await page.getByTestId("lookup-catalog-form-submit").click();

    await expectValidationMessage(
      page,
      "الكود يجب أن يحتوي أحرف كبيرة/أرقام/underscore فقط وبحد أقصى 50.",
    );
    expect(lookupCatalogApi.getPostCount()).toBe(0);
  });

  test("shows forbidden state when read permission is missing", async ({ page }) => {
    await injectAuthSession(page, ["lookup-id-types.create"]);

    await page.goto("/app/lookup-catalog/id-types");

    await expectTextVisible(page, "403 - غير مصرح");
    await expectTextVisible(page, "lookup-id-types.read");
  });
});
