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

test.describe("Lookup Blood Types", () => {
  test("loads list and creates a new blood type", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupBloodTypesCrud);

    const bloodTypesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/lookup/blood-types**",
      initialItems: [
        {
          id: 1,
          name: "A+",
          isActive: true,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          createdBy: null,
          updatedBy: null,
        },
      ],
      onCreate: (payload) => ({
        id: 2,
        name: typeof payload.name === "string" ? payload.name : "O+",
        isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
        createdAt: "2026-03-02T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        createdBy: null,
        updatedBy: null,
      }),
    });

    await openModulePage({
      page,
      path: "/app/lookup-blood-types",
      heading: "فصائل الدم",
    });
    await expectCardsCount(page, "blood-card", 1);

    await page.getByTestId("blood-form-name").fill("o+");
    await page.getByTestId("blood-form-submit").click();

    await expectCardsCount(page, "blood-card", 2);
    await expectTextVisible(page, "O+");

    const lastCreatePayload = bloodTypesApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["name"]).toBe("O+");
  });

  test("validates blood type max length before request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.lookupBloodTypesCrud);

    const bloodTypesApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/lookup/blood-types**",
      initialItems: [],
    });

    await openModulePage({
      page,
      path: "/app/lookup-blood-types",
      heading: "فصائل الدم",
    });

    await page.getByTestId("blood-form-name").fill("ABCDEFGHIJK");
    await page.getByTestId("blood-form-submit").click();

    await expectValidationMessage(page, "الاسم يجب ألا يتجاوز 10 أحرف.");
    expect(bloodTypesApi.getPostCount()).toBe(0);
  });
});
