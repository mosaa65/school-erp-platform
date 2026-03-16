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

test.describe("Lookup Periods", () => {
  test("loads list and creates a new period", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupPeriodsCrud);

    const periodsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/lookup/periods**",
      initialItems: [
        {
          id: 1,
          code: "MORNING",
          nameAr: "صباحية",
          isActive: true,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          createdBy: null,
          updatedBy: null,
          _count: {
            timetableTemplateSlots: 0,
          },
        },
      ],
      onCreate: (payload) => ({
        id: 2,
        code: typeof payload.code === "string" ? payload.code : "EVENING",
        nameAr: typeof payload.nameAr === "string" ? payload.nameAr : "مسائية",
        isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        createdBy: null,
        updatedBy: null,
        _count: {
          timetableTemplateSlots: 0,
        },
      }),
    });

    await openModulePage({
      page,
      path: "/app/lookup-periods",
      heading: "الفترات",
    });
    await expectCardsCount(page, "period-card", 1);

    await page.getByTestId("period-form-code").fill("evening");
    await page.getByTestId("period-form-name-ar").fill("مسائية");
    await page.getByTestId("period-form-submit").click();

    await expectCardsCount(page, "period-card", 2);
    await expectTextVisible(page, "EVENING");

    const lastCreatePayload = periodsApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["code"]).toBe("EVENING");
    expect(lastCreatePayload?.["nameAr"]).toBe("مسائية");
  });

  test("validates code format before request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupPeriodsCrud);

    const periodsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/lookup/periods**",
      initialItems: [],
    });

    await openModulePage({
      page,
      path: "/app/lookup-periods",
      heading: "الفترات",
    });

    await page.getByTestId("period-form-code").fill("bad-code");
    await page.getByTestId("period-form-name-ar").fill("نص تجريبي");
    await page.getByTestId("period-form-submit").click();

    await expectValidationMessage(
      page,
      "الكود يجب أن يحتوي أحرفًا كبيرة/أرقامًا/underscore فقط وبحد أقصى 50.",
    );
    expect(periodsApi.getPostCount()).toBe(0);
  });
});
