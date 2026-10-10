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
  await expect(page.locator(".crew-member h3")).toHaveText([
    "Maya",
    "Alex",
    "Sam",
  ]);

  await page.getByRole("button", { name: "Add ticket" }).click();
  await page.locator("#ticket-title").fill("Prove the board works");
  await page.getByRole("button", { name: "Create ticket" }).click();
  await expect(page.locator(".work-ticket")).toHaveCount(1);

  await page.getByRole("button", { name: "Run simulation" }).first().click();
  await expect(page.locator(".board-column--done .work-ticket")).toHaveCount(
    1,
    { timeout: 15_000 },
  );
  await expect(page.locator(".activity-list")).toContainText(
    "Simulated qa passed",
  );
  await first.app.close();

  const second = await launch();
  await expect(
    second.page.locator(".board-column--done .work-ticket"),
  ).toContainText("Prove the board works");
  await second.app.close();
});
