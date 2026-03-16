import { expect, type Page } from "@playwright/test";

type OpenModulePageOptions = {
  page: Page;
  path: string;
  heading: string;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  headingExact?: boolean;
};

export async function openModulePage(options: OpenModulePageOptions) {
  await options.page.goto(options.path);
  await expect(
    options.page.getByRole("heading", {
      name: options.heading,
      level: options.headingLevel ?? 2,
      exact: options.headingExact,
    }),
  ).toBeVisible({ timeout: 15_000 });
}

export async function expectCardsCount(
  page: Page,
  cardTestId: string,
  count: number,
) {
  await expect(page.getByTestId(cardTestId)).toHaveCount(count);
}

export async function expectValidationMessage(page: Page, message: string) {
  await expect(page.getByText(message)).toBeVisible();
}

export async function expectTextVisible(page: Page, text: string) {
  await expect(page.getByText(text)).toBeVisible();
}
