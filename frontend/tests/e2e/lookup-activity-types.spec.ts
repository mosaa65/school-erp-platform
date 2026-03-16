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

test.describe("Lookup Activity Types", () => {
  test("loads list and creates a new activity type", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupActivityTypesCrud);

    const activityTypesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/lookup/activity-types**",
      initialItems: [
        {
          id: 1,
          code: "SPORTS",
          nameAr: "رياضي",
          isActive: true,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          createdBy: null,
          updatedBy: null,
        },
      ],
      onCreate: (payload) => ({
        id: 2,
        code: typeof payload.code === "string" ? payload.code : "CULTURAL",
        nameAr: typeof payload.nameAr === "string" ? payload.nameAr : "ثقافي",
        isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        createdBy: null,
        updatedBy: null,
      }),
    });

    await openModulePage({
      page,
      path: "/app/lookup-activity-types",
      heading: "أنواع الأنشطة",
    });
    await expectCardsCount(page, "activity-card", 1);

    await page.getByTestId("activity-form-code").fill("social");
    await page.getByTestId("activity-form-name-ar").fill("اجتماعي");
    await page.getByTestId("activity-form-submit").click();

    await expectCardsCount(page, "activity-card", 2);
    await expectTextVisible(page, "SOCIAL");

    const lastCreatePayload = activityTypesApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["code"]).toBe("SOCIAL");
    expect(lastCreatePayload?.["nameAr"]).toBe("اجتماعي");
  });

  test("validates code format before request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupActivityTypesCrud);

    const activityTypesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/lookup/activity-types**",
      initialItems: [],
    });

    await openModulePage({
      page,
      path: "/app/lookup-activity-types",
      heading: "أنواع الأنشطة",
    });

    await page.getByTestId("activity-form-code").fill("bad-code");
    await page.getByTestId("activity-form-name-ar").fill("نص تجريبي");
    await page.getByTestId("activity-form-submit").click();

    await expectValidationMessage(
      page,
      "الكود يجب أن يحتوي أحرفًا كبيرة/أرقامًا/underscore فقط وبحد أقصى 50.",
    );
    expect(activityTypesApi.getPostCount()).toBe(0);
  });
});
