import { expect, test } from "@playwright/test";
import { mockListWithPost } from "./helpers/api-mocks";
import { injectAuthSession } from "./helpers/auth-session";
import { buildTalentFixtures } from "./helpers/fixtures";
import { fillTalentCatalogForm } from "./helpers/form-actions";
import {
  buildCreatedTalentCatalogFromPayload,
  buildTalentCatalogListItem,
} from "./helpers/list-item-builders";
import { e2ePermissionSets } from "./helpers/permissions";
import {
  expectCardsCount,
  expectValidationMessage,
  openModulePage,
} from "./helpers/ui-assertions";

test.describe("Talents Catalog", () => {
  test("loads list and creates a new talent", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.talentsCrud);

    const talents = buildTalentFixtures(2);

    const talentsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/talents**",
      initialItems: [buildTalentCatalogListItem(talents[0])],
      onCreate: (payload) => buildCreatedTalentCatalogFromPayload(payload),
    });

    await openModulePage({
      page,
      path: "/app/talents",
      heading: "المواهب",
    });
    await expectCardsCount(page, "talent-catalog-card", 1);

    await fillTalentCatalogForm(page, {
      code: "tal-new",
      name: "Debate Coach",
      description: "Supports school debate clubs",
      submit: true,
    });

    await expectCardsCount(page, "talent-catalog-card", 2);
    await expect(
      page.getByTestId("talent-catalog-card").first().getByText("Debate Coach"),
    ).toBeVisible();

    const lastCreatePayload = talentsApi.getLastCreatePayload();
    expect(lastCreatePayload).not.toBeNull();
    expect(lastCreatePayload?.["code"]).toBe("TAL-NEW");
    expect(lastCreatePayload?.["name"]).toBe("Debate Coach");
  });

  test("validates code format before request", async ({ page }) => {
    await injectAuthSession(page, e2ePermissionSets.talentsCrud);

    const talentsApi = await mockListWithPost({
      page,
      urlPattern: "**/backend/talents**",
      initialItems: [],
    });

    await openModulePage({
      page,
      path: "/app/talents",
      heading: "المواهب",
    });

    await fillTalentCatalogForm(page, {
      code: "invalid code",
      name: "Some Talent",
      submit: true,
    });

    await expectValidationMessage(page, "صيغة code غير صحيحة.");
    expect(talentsApi.getPostCount()).toBe(0);
  });
});
