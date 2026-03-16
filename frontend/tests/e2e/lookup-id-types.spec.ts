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

test.describe("Lookup ID Types", () => {
  test("loads list and creates a new id type", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupIdTypesCrud);

    const idTypesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/lookup/id-types**",
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
          typeof payload.code === "string" ? payload.code : "BIRTH_CERTIFICATE",
        nameAr:
          typeof payload.nameAr === "string" ? payload.nameAr : "شهادة ميلاد",
        isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        createdBy: null,
        updatedBy: null,
      }),
    });

    await openModulePage({
      page,
      path: "/app/lookup-id-types",
      heading: "أنواع الهوية",
    });
    await expectCardsCount(page, "id-type-card", 1);

    await page.getByTestId("id-type-form-code").fill("passport");
    await page.getByTestId("id-type-form-name-ar").fill("جواز سفر");
    await page.getByTestId("id-type-form-submit").click();

    await expectCardsCount(page, "id-type-card", 2);
    await expectTextVisible(page, "PASSPORT");

    const lastCreatePayload = idTypesApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["code"]).toBe("PASSPORT");
    expect(lastCreatePayload?.["nameAr"]).toBe("جواز سفر");
  });

  test("validates code format before request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupIdTypesCrud);

    const idTypesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/lookup/id-types**",
      initialItems: [],
    });

    await openModulePage({
      page,
      path: "/app/lookup-id-types",
      heading: "أنواع الهوية",
    });

    await page.getByTestId("id-type-form-code").fill("bad-code");
    await page.getByTestId("id-type-form-name-ar").fill("نص تجريبي");
    await page.getByTestId("id-type-form-submit").click();

    await expectValidationMessage(
      page,
      "الكود يجب أن يحتوي أحرفًا كبيرة/أرقامًا/underscore فقط وبحد أقصى 50.",
    );
    expect(idTypesApi.getPostCount()).toBe(0);
  });
});
