import { expect, test } from "@playwright/test";
import { injectAuthSession } from "./helpers/auth-session";
import { e2ePermissionSets } from "./helpers/permissions";
import { expectTextVisible, openModulePage } from "./helpers/ui-assertions";

test.describe("Lookup Catalog Index", () => {
  test("shows only lookup cards allowed by read permissions", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupCatalogIndexSampleRead);

    await openModulePage({
      page,
      path: "/app/lookup-catalog",
      heading: "قاموس المرجعيات الموسع",
    });

    await expect(
      page.getByRole("heading", { name: "النظام 01 - البنية المشتركة", level: 3 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "النظام 04 - الطلاب", level: 3 }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "فصائل الدم" })).toBeVisible();
    await expect(page.getByRole("link", { name: "حالات القيد" })).toBeVisible();
    await expect(page.getByRole("link", { name: "أنواع الهوية" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "حالات اليتم" })).toHaveCount(0);
  });

  test("shows empty-state fallback when no lookup read permissions are granted", async ({ page }) => {
    await injectAuthSession(page, []);

    await openModulePage({
      page,
      path: "/app/lookup-catalog",
      heading: "قاموس المرجعيات الموسع",
    });

    await expectTextVisible(page, "لا تملك صلاحيات قراءة لأي مرجعية إضافية.");
    await expect(page.getByRole("link", { name: "فصائل الدم" })).toHaveCount(0);
  });
});
