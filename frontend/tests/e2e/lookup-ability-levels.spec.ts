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

test.describe("Lookup Ability Levels", () => {
  test("loads list and creates a new ability level", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupAbilityLevelsCrud);

    const abilityLevelsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/lookup/ability-levels**",
      initialItems: [
        {
          id: 1,
          code: "EXCELLENT",
          nameAr: "ممتاز",
          isActive: true,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          createdBy: null,
          updatedBy: null,
        },
      ],
      onCreate: (payload) => ({
        id: 2,
        code: typeof payload.code === "string" ? payload.code : "GOOD",
        nameAr: typeof payload.nameAr === "string" ? payload.nameAr : "جيد",
        isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        createdBy: null,
        updatedBy: null,
      }),
    });

    await openModulePage({
      page,
      path: "/app/lookup-ability-levels",
      heading: "مستويات القدرة",
    });
    await expectCardsCount(page, "ability-card", 1);

    await page.getByTestId("ability-form-code").fill("weak");
    await page.getByTestId("ability-form-name-ar").fill("ضعيف");
    await page.getByTestId("ability-form-submit").click();

    await expectCardsCount(page, "ability-card", 2);
    await expectTextVisible(page, "WEAK");

    const lastCreatePayload = abilityLevelsApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["code"]).toBe("WEAK");
    expect(lastCreatePayload?.["nameAr"]).toBe("ضعيف");
  });

  test("validates code format before request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupAbilityLevelsCrud);

    const abilityLevelsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/lookup/ability-levels**",
      initialItems: [],
    });

    await openModulePage({
      page,
      path: "/app/lookup-ability-levels",
      heading: "مستويات القدرة",
    });

    await page.getByTestId("ability-form-code").fill("bad-code");
    await page.getByTestId("ability-form-name-ar").fill("نص تجريبي");
    await page.getByTestId("ability-form-submit").click();

    await expectValidationMessage(
      page,
      "الكود يجب أن يحتوي أحرفًا كبيرة/أرقامًا/underscore فقط وبحد أقصى 50.",
    );
    expect(abilityLevelsApi.getPostCount()).toBe(0);
  });
});
