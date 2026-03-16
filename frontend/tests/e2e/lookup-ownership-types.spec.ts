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

test.describe("Lookup Ownership Types", () => {
  test("loads list and creates a new ownership type", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupOwnershipTypesCrud);

    const ownershipTypesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/lookup/ownership-types**",
      initialItems: [
        {
          id: 1,
          code: "PRIVATE",
          nameAr: "خاصة",
          isActive: true,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          createdBy: null,
          updatedBy: null,
        },
      ],
      onCreate: (payload) => ({
        id: 2,
        code: typeof payload.code === "string" ? payload.code : "PUBLIC",
        nameAr: typeof payload.nameAr === "string" ? payload.nameAr : "حكومية",
        isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        createdBy: null,
        updatedBy: null,
      }),
    });

    await openModulePage({
      page,
      path: "/app/lookup-ownership-types",
      heading: "أنواع الملكية",
    });
    await expectCardsCount(page, "ownership-card", 1);

    await page.getByTestId("ownership-form-code").fill("community");
    await page.getByTestId("ownership-form-name-ar").fill("أهلية");
    await page.getByTestId("ownership-form-submit").click();

    await expectCardsCount(page, "ownership-card", 2);
    await expectTextVisible(page, "COMMUNITY");

    const lastCreatePayload = ownershipTypesApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["code"]).toBe("COMMUNITY");
    expect(lastCreatePayload?.["nameAr"]).toBe("أهلية");
  });

  test("validates code format before request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupOwnershipTypesCrud);

    const ownershipTypesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/lookup/ownership-types**",
      initialItems: [],
    });

    await openModulePage({
      page,
      path: "/app/lookup-ownership-types",
      heading: "أنواع الملكية",
    });

    await page.getByTestId("ownership-form-code").fill("bad-code");
    await page.getByTestId("ownership-form-name-ar").fill("نص تجريبي");
    await page.getByTestId("ownership-form-submit").click();

    await expectValidationMessage(
      page,
      "الكود يجب أن يحتوي أحرفًا كبيرة/أرقامًا/underscore فقط وبحد أقصى 50.",
    );
    expect(ownershipTypesApi.getPostCount()).toBe(0);
  });
});
