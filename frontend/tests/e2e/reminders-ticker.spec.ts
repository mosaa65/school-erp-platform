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

test.describe("Reminders Ticker", () => {
  test("loads list and creates a new reminder", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.remindersTickerCrud);

    const remindersApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/reminders-ticker**",
      initialItems: [
        {
          id: 1,
          content: "ذكر الصباح",
          tickerType: "DHIKR",
          isActive: true,
          displayOrder: 0,
          startDate: "2026-03-01T00:00:00.000Z",
          endDate: null,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          createdBy: null,
          updatedBy: null,
        },
      ],
      onCreate: (payload) => ({
        id: 2,
        content:
          typeof payload.content === "string"
            ? payload.content
            : "تنبيه تجريبي",
        tickerType:
          typeof payload.tickerType === "string"
            ? payload.tickerType
            : "ALERT",
        isActive:
          payload.isActive === undefined ? true : Boolean(payload.isActive),
        displayOrder:
          typeof payload.displayOrder === "number" ? payload.displayOrder : 0,
        startDate:
          typeof payload.startDate === "string" ? payload.startDate : null,
        endDate: typeof payload.endDate === "string" ? payload.endDate : null,
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        createdBy: null,
        updatedBy: null,
      }),
    });

    await openModulePage({
      page,
      path: "/app/reminders-ticker",
      heading: "شريط التنبيهات المتحرك",
    });
    await expectCardsCount(page, "reminder-card", 1);

    await page.getByTestId("reminder-form-content").fill("اختبار تجريبي للفصل الدراسي");
    await page.getByTestId("reminder-form-type").selectOption("ALERT");
    await page.getByTestId("reminder-form-order").fill("3");
    await page.getByTestId("reminder-form-start-date").fill("2026-03-05");
    await page.getByTestId("reminder-form-end-date").fill("2026-03-10");
    await page.getByTestId("reminder-form-submit").click();

    await expectCardsCount(page, "reminder-card", 2);
    await expectTextVisible(page, "اختبار تجريبي للفصل الدراسي");

    const lastCreatePayload = remindersApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["tickerType"]).toBe("ALERT");
    expect(lastCreatePayload?.["displayOrder"]).toBe(3);
    expect(lastCreatePayload?.["startDate"]).toBe("2026-03-05");
    expect(lastCreatePayload?.["endDate"]).toBe("2026-03-10");
  });

  test("validates date range before request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.remindersTickerCrud);

    const remindersApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/reminders-ticker**",
      initialItems: [],
    });

    await openModulePage({
      page,
      path: "/app/reminders-ticker",
      heading: "شريط التنبيهات المتحرك",
    });

    await page.getByTestId("reminder-form-content").fill("رسالة تذكير");
    await page.getByTestId("reminder-form-start-date").fill("2026-03-10");
    await page.getByTestId("reminder-form-end-date").fill("2026-03-01");
    await page.getByTestId("reminder-form-submit").click();

    await expectValidationMessage(page, "تاريخ النهاية يجب أن يكون بعد تاريخ البداية.");
    expect(remindersApi.getPostCount()).toBe(0);
  });
});
