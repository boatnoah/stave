import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  type ElectronApplication,
  _electron as electron,
  expect,
  type Page,
  test,
} from "@playwright/test";
import { electronEnvironment } from "./electron-environment";

const appDirectory = path.resolve(__dirname, "..");
let dataDirectory: string;

async function launch(): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: [appDirectory],
    env: electronEnvironment({ dataDirectory }),
  });
  const page = await app.firstWindow();
  return { app, page };
}

test.beforeEach(() => {
  dataDirectory = mkdtempSync(path.join(tmpdir(), "stave-e2e-"));
});
test.afterEach(() => {
  rmSync(dataDirectory, { recursive: true, force: true });
});

test("runs a simulated ticket to done and restores it after restart", async () => {
  const first = await launch();
  const page = first.page;

  await page.locator("#project-name").fill("Smoke test");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name: "Smoke test" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Board", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  await page.getByRole("button", { name: "Chat" }).click();
  await expect(page.getByRole("heading", { name: "Team chat" })).toBeVisible();
  await page.getByRole("button", { name: "Board", exact: true }).click();

  await page.keyboard.press("ControlOrMeta+k");
  await expect(
    page.getByRole("dialog", { name: "Command menu" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Open command menu" }).click();
  await expect(
    page.getByRole("dialog", { name: "Command menu" }),
  ).toBeVisible();
  await page.getByLabel("Search commands").fill("create");
  await expect(
    page.getByRole("button", { name: /Create ticket/ }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Open command menu" }).click();
  await page.getByLabel("Search commands").fill("Maya");
  await page.getByRole("button", { name: /Maya.*Direct message/ }).click();
  await expect(page.getByRole("heading", { name: "Maya" })).toBeVisible();
  await page.getByRole("button", { name: "Board", exact: true }).click();

  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(page.getByLabel("Project name")).toHaveValue("Smoke test");
  await page.getByRole("spinbutton", { name: "Building" }).fill("3");
  await page.getByLabel("Show a Needs you lane above the board").check();
  await page.getByRole("button", { name: "Save board settings" }).click();
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(
    page.locator(".board-column--implementation .board-column__wip"),
  ).toHaveText("0/3");
  await expect(
    page.getByRole("button", { name: "Expand To do" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Expand To do" }).click();

  await page.keyboard.press("c");
  await page.locator("#ticket-title").fill("Prove the board works");
  await page.getByRole("button", { name: "Create ticket" }).click();
  await expect(page.locator(".work-ticket")).toHaveCount(1);

  await page.getByRole("button", { name: "Run simulation" }).first().click();
  await expect(
    page.locator(".board-column--done .board-rail__count"),
  ).toHaveText("1", { timeout: 15_000 });
  await page.getByRole("button", { name: "Expand Done" }).click();
  await expect(page.locator(".board-column--done .work-ticket")).toHaveCount(
    1,
    { timeout: 15_000 },
  );
  await page
    .getByRole("button", { name: "View details: Prove the board works" })
    .click();
  await expect(page.locator(".run-output")).toContainText(
    "Simulated qa passed",
  );
  await first.app.close();

  const second = await launch();
  await second.page.getByRole("button", { name: "Expand Done" }).click();
  await expect(
    second.page.locator(".board-column--done .work-ticket"),
  ).toContainText("Prove the board works");
  await second.page.getByRole("button", { name: "Open settings" }).click();
  await expect(
    second.page.getByRole("spinbutton", { name: "Building" }),
  ).toHaveValue("3");
  await expect(
    second.page.getByLabel("Show a Needs you lane above the board"),
  ).toBeChecked();
  await second.app.close();
});
