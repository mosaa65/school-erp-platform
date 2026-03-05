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

test.describe("System Settings", () => {
  test("loads list and creates a new setting", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.systemSettingsCrud);

    const settingsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/system-settings**",
      initialItems: [
        {
          id: 1,
          settingKey: "default_locale",
          settingValue: "ar",
          settingType: "TEXT",
          category: "general",
          description: "اللغة الافتراضية",
          isEditable: true,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          createdBy: null,
          updatedBy: null,
        },
      ],
      onCreate: (payload) => ({
        id: 2,
        settingKey:
          typeof payload.settingKey === "string"
            ? payload.settingKey
            : "school_name_ar",
        settingValue:
          typeof payload.settingValue === "string"
            ? payload.settingValue
            : null,
        settingType:
          typeof payload.settingType === "string"
            ? payload.settingType
            : "TEXT",
        category: typeof payload.category === "string" ? payload.category : null,
        description:
          typeof payload.description === "string" ? payload.description : null,
        isEditable:
          payload.isEditable === undefined ? true : Boolean(payload.isEditable),
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        createdBy: null,
        updatedBy: null,
      }),
    });

    await openModulePage({
      page,
      path: "/app/system-settings",
      heading: "إعدادات النظام",
    });
    await expectCardsCount(page, "setting-card", 1);

    await page.getByTestId("setting-form-key").fill("school_name_ar");
    await page.getByTestId("setting-form-type").selectOption("TEXT");
    await page.getByTestId("setting-form-value").fill("مدرسة النور");
    await page.getByTestId("setting-form-category").fill("profile");
    await page.getByTestId("setting-form-description").fill("اسم المدرسة بالعربية");
    await page.getByTestId("setting-form-submit").click();

    await expectCardsCount(page, "setting-card", 2);
    await expectTextVisible(page, "school_name_ar");
    await expectTextVisible(page, "اسم المدرسة بالعربية");

    const lastCreatePayload = settingsApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["settingKey"]).toBe("school_name_ar");
    expect(lastCreatePayload?.["settingValue"]).toBe("مدرسة النور");
    expect(lastCreatePayload?.["category"]).toBe("profile");
  });

  test("validates setting key format before request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.systemSettingsCrud);

    const settingsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/system-settings**",
      initialItems: [],
    });

    await openModulePage({
      page,
      path: "/app/system-settings",
      heading: "إعدادات النظام",
    });

    await page.getByTestId("setting-form-key").fill("Bad Key");
    await page.getByTestId("setting-form-submit").click();

    await expectValidationMessage(page, "صيغة مفتاح الإعداد غير صحيحة.");
    expect(settingsApi.getPostCount()).toBe(0);
  });
});
