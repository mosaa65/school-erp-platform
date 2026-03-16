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

test.describe("Lookup Orphan Statuses", () => {
  test("loads list and creates a new orphan status", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupOrphanStatusesCrud);

    const orphanStatusesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/lookup/orphan-statuses**",
      initialItems: [
        {
          id: 1,
          code: "NONE",
          nameAr: "غير يتيم",
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
          typeof payload.code === "string" ? payload.code : "FATHER_DECEASED",
        nameAr: typeof payload.nameAr === "string" ? payload.nameAr : "يتيم الأب",
        isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        createdBy: null,
        updatedBy: null,
      }),
    });

    await openModulePage({
      page,
      path: "/app/lookup-orphan-statuses",
      heading: "حالات اليتم",
    });
    await expectCardsCount(page, "orphan-card", 1);

    await page.getByTestId("orphan-form-code").fill("both_deceased");
    await page.getByTestId("orphan-form-name-ar").fill("يتيم الأبوين");
    await page.getByTestId("orphan-form-submit").click();

    await expectCardsCount(page, "orphan-card", 2);
    await expectTextVisible(page, "BOTH_DECEASED");

    const lastCreatePayload = orphanStatusesApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["code"]).toBe("BOTH_DECEASED");
    expect(lastCreatePayload?.["nameAr"]).toBe("يتيم الأبوين");
  });

  test("validates code format before request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupOrphanStatusesCrud);

    const orphanStatusesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/lookup/orphan-statuses**",
      initialItems: [],
    });

    await openModulePage({
      page,
      path: "/app/lookup-orphan-statuses",
      heading: "حالات اليتم",
    });

    await page.getByTestId("orphan-form-code").fill("bad-code");
    await page.getByTestId("orphan-form-name-ar").fill("نص تجريبي");
    await page.getByTestId("orphan-form-submit").click();

    await expectValidationMessage(
      page,
      "الكود يجب أن يحتوي أحرفًا كبيرة/أرقامًا/underscore فقط وبحد أقصى 50.",
    );
    expect(orphanStatusesApi.getPostCount()).toBe(0);
  });
});
