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

test.describe("Lookup Enrollment Statuses", () => {
  test("loads list and creates a new enrollment status", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupEnrollmentStatusesCrud);

    const enrollmentStatusesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/lookup/enrollment-statuses**",
      initialItems: [
        {
          id: 1,
          code: "ACTIVE",
          nameAr: "منتظم",
          isActive: true,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          createdBy: null,
          updatedBy: null,
        },
      ],
      onCreate: (payload) => ({
        id: 2,
        code: typeof payload.code === "string" ? payload.code : "WITHDRAWN",
        nameAr: typeof payload.nameAr === "string" ? payload.nameAr : "منسحب",
        isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        createdBy: null,
        updatedBy: null,
      }),
    });

    await openModulePage({
      page,
      path: "/app/lookup-enrollment-statuses",
      heading: "حالات القيد",
    });
    await expectCardsCount(page, "enrollment-card", 1);

    await page.getByTestId("enrollment-form-code").fill("transferred");
    await page.getByTestId("enrollment-form-name-ar").fill("منقول");
    await page.getByTestId("enrollment-form-submit").click();

    await expectCardsCount(page, "enrollment-card", 2);
    await expectTextVisible(page, "TRANSFERRED");

    const lastCreatePayload = enrollmentStatusesApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["code"]).toBe("TRANSFERRED");
    expect(lastCreatePayload?.["nameAr"]).toBe("منقول");
  });

  test("validates code format before request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupEnrollmentStatusesCrud);

    const enrollmentStatusesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/lookup/enrollment-statuses**",
      initialItems: [],
    });

    await openModulePage({
      page,
      path: "/app/lookup-enrollment-statuses",
      heading: "حالات القيد",
    });

    await page.getByTestId("enrollment-form-code").fill("bad-code");
    await page.getByTestId("enrollment-form-name-ar").fill("نص تجريبي");
    await page.getByTestId("enrollment-form-submit").click();

    await expectValidationMessage(
      page,
      "الكود يجب أن يحتوي أحرفًا كبيرة/أرقامًا/underscore فقط وبحد أقصى 50.",
    );
    expect(enrollmentStatusesApi.getPostCount()).toBe(0);
  });
});
