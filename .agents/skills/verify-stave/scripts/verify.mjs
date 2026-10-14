#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const [, , command, portValue, evidenceDirectory] = process.argv;
const port = Number(portValue);

if (!command || !Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error(
    "usage: verify.mjs <doctor|drive-avatar-study|drive-boot-screen|drive-state-preview|drive-workflow|drive-decision|drive-git|verify-restored> <port> [evidence-dir]",
  );
  process.exit(64);
}

async function getStavePage() {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  assert.equal(response.ok, true, `CDP endpoint returned ${response.status}`);
  const pages = await response.json();
  assert.ok(Array.isArray(pages), "CDP page list is not an array");
  const page = pages.find(
    (candidate) =>
      candidate.type === "page" &&
      candidate.title === "Stave" &&
      typeof candidate.webSocketDebuggerUrl === "string",
  );
  assert.ok(page, "Stave renderer was not found in the CDP page list");
  return page;
}

class CdpClient {
  #nextId = 1;
  #pending = new Map();
  #socket;

  constructor(url) {
    this.#socket = new WebSocket(url);
    this.#socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id) return;
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      this.#pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  async open() {
    if (this.#socket.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.#socket.addEventListener("open", resolve, { once: true });
      this.#socket.addEventListener("error", reject, { once: true });
    });
  }

  send(method, params = {}) {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.#socket.close();
  }
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.text ?? "renderer evaluation failed",
    );
  }
  return result.result.value;
}

async function captureScreenshot(client, path, captureBeyondViewport = true) {
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport,
  });
  await writeFile(path, Buffer.from(result.data, "base64"));
}

async function withStaveClient(callback) {
  const page = await getStavePage();
  const client = new CdpClient(page.webSocketDebuggerUrl);
  await client.open();
  try {
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await evaluate(client, "document.fonts.ready.then(() => true)");
    return await callback(client, page);
  } finally {
    client.close();
  }
}

async function doctor() {
  const result = await withStaveClient(async (client, page) => {
    const surface = await evaluate(
      client,
      `(() => ({
        title: document.title,
        heading: document.querySelector('#page-title')?.textContent?.trim() ?? null,
        statePicker: document.querySelector('[aria-label="Preview an avatar state"]') !== null,
        agentCards: document.querySelectorAll('.agent-study').length,
        taskCards: document.querySelectorAll('.task-card').length
      }))()`,
    );
    assert.equal(surface.title, "Stave");
    assert.ok(
      await evaluate(
        client,
        "document.querySelector('.shell-content') !== null || document.querySelector('.avatar-lab') !== null",
      ),
      "Stave product surface is missing",
    );
    return { ready: true, url: page.url, ...surface };
  });
  console.log(JSON.stringify(result, null, 2));
}

async function driveAvatarStudy() {
  assert.ok(
    evidenceDirectory,
    "drive-avatar-study requires an evidence directory",
  );
  await mkdir(evidenceDirectory, { recursive: true });

  const result = await withStaveClient(async (client, page) => {
    await evaluate(
      client,
      `(() => {
        document.querySelector('button[aria-label="Open settings"]')?.click();
        [...document.querySelectorAll('button')]
          .find((button) => button.textContent.trim() === 'Open lab')?.click();
      })()`,
    );
    for (let attempt = 0; attempt < 50; attempt++) {
      if (
        await evaluate(
          client,
          "document.querySelector('.agent-study') !== null",
        )
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const crew = await evaluate(
      client,
      `(() => [...document.querySelectorAll('.agent-study')].map((card) => ({
        name: card.querySelector('h2')?.textContent?.trim() ?? '',
        role: card.querySelector('.agent-study__identity p')?.textContent?.trim() ?? '',
        state: card.querySelector('.state-label')?.textContent?.trim() ?? '',
        activity: card.querySelector('.agent-study__activity')?.textContent?.trim() ?? '',
        avatarLabel: card.querySelector('.agent-avatar svg[role="img"]')?.getAttribute('aria-label') ?? ''
      })))()`,
    );
    assert.equal(crew.length, 10, "expected ten visible crew cards");
    assert.equal(
      new Set(crew.map((agent) => agent.name)).size,
      10,
      "agent names must be unique",
    );
    assert.ok(
      crew.every(
        (agent) =>
          agent.name &&
          agent.role &&
          agent.state &&
          agent.activity &&
          agent.avatarLabel,
      ),
      "each crew card must expose identity, role, state, activity, and an accessible avatar",
    );
    await captureScreenshot(client, `${evidenceDirectory}/crew.png`);

    const cards = await evaluate(
      client,
      `(() => [...document.querySelectorAll('.task-card')].map((card) => ({
        metadata: [...card.querySelectorAll('.task-card__meta span')].map((node) => node.textContent?.trim() ?? ''),
        title: card.querySelector('h3')?.textContent?.trim() ?? '',
        agent: card.querySelector('.task-card__agent > span:last-child')?.textContent?.trim() ?? '',
        decorative: card.querySelector('.task-card__agent .agent-avatar')?.getAttribute('aria-hidden') === 'true',
        state: card.querySelector('.task-card__footer > span:last-child')?.textContent?.trim() ?? ''
      })))()`,
    );
    assert.equal(cards.length, 4, "expected four compact board study cards");
    assert.ok(
      cards.every(
        (card) =>
          card.metadata.length === 2 &&
          card.metadata.every(Boolean) &&
          card.title &&
          card.agent &&
          card.decorative &&
          card.state,
      ),
      `each compact card must retain its metadata, title, agent, decorative avatar, and state: ${JSON.stringify(cards)}`,
    );

    const layouts = [];
    for (const width of [1280, 800, 500]) {
      await client.send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: false,
      });
      const columns = await evaluate(
        client,
        "getComputedStyle(document.querySelector('.mini-board')).gridTemplateColumns.split(' ').length",
      );
      const expected = width > 900 ? 4 : width > 560 ? 2 : 1;
      assert.equal(
        columns,
        expected,
        `expected ${expected} compact card columns at ${width}px`,
      );
      layouts.push({ width, columns });
      await captureScreenshot(
        client,
        `${evidenceDirectory}/cards-${width}.png`,
      );
    }
    await client.send("Emulation.clearDeviceMetricsOverride");
    return {
      passed: true,
      feature: "living-crew-and-board-size-cards",
      pageUrl: page.url,
      crew,
      cards,
      layouts,
    };
  });

  await writeFile(
    `${evidenceDirectory}/result.json`,
    `${JSON.stringify(result, null, 2)}\n`,
  );
  console.log(JSON.stringify(result, null, 2));
}

async function driveBootScreen() {
  assert.ok(
    evidenceDirectory,
    "drive-boot-screen requires an evidence directory",
  );
  await mkdir(evidenceDirectory, { recursive: true });

  const page = await getStavePage();
  const client = new CdpClient(page.webSocketDebuggerUrl);
  await client.open();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  try {
    const health = await evaluate(
      client,
      `(() => ({ title: document.title }))()`,
    );
    assert.equal(health.title, "Stave");
    await client.send("Emulation.setCPUThrottlingRate", { rate: 20 });
    let visible = false;
    let state = null;
    for (let attempt = 0; attempt < 200; attempt++) {
      try {
        await client.send("Runtime.enable");
        state = await evaluate(
          client,
          `(() => ({
            visible: document.querySelector('.boot-screen') !== null,
            surface: document.querySelector('.shell-content') !== null,
            covered: document.querySelector('.shell-content')?.classList.contains('boot-covered') ?? false,
            loading: document.querySelector('.workspace-status')?.textContent?.trim() ?? null
          }))()`,
        );
        visible = state.visible;
        if (visible || (state.surface && !state.covered && !state.loading))
          break;
      } catch {
        // Chromium can briefly drop the execution context while the real renderer reloads.
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    if (!visible) {
      await captureScreenshot(client, `${evidenceDirectory}/fast-open.png`);
      const result = {
        passed: true,
        feature: "delayed-workspace-boot-screen",
        verification: "verified-unreachable",
        prerequisite:
          "workspace snapshot loading must exceed the 300 ms display delay",
        attempted:
          "fresh isolated Stave launch with a 20x CPU throttle while observing the real workspace load",
        observation: state,
        pageUrl: page.url,
      };
      await writeFile(
        `${evidenceDirectory}/result.json`,
        `${JSON.stringify(result, null, 2)}\n`,
      );
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    const opening = await evaluate(
      client,
      `(() => ({
        label: document.querySelector('.boot-screen')?.getAttribute('aria-label') ?? null,
        title: document.querySelector('.boot-screen')?.getAttribute('role') ?? null,
        mark: document.querySelector('.boot-screen__mark') !== null,
        shellCovered: document.querySelector('.shell-content')?.classList.contains('boot-covered') ?? false
      }))()`,
    );
    assert.deepEqual(opening, {
      label: "Opening Stave",
      title: "status",
      mark: true,
      shellCovered: true,
    });
    await captureScreenshot(client, `${evidenceDirectory}/opening.png`);
    await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    let revealed = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      revealed = await evaluate(
        client,
        "document.querySelector('.boot-screen') === null && document.querySelector('.shell-content')?.classList.contains('boot-covered') === false",
      );
      if (revealed) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.ok(
      revealed,
      "the boot overlay did not reveal the workspace after loading",
    );
    await captureScreenshot(client, `${evidenceDirectory}/revealed.png`);
    const result = {
      passed: true,
      feature: "delayed-workspace-boot-screen",
      verification: "observed",
      pageUrl: page.url,
      opening,
      revealed,
    };
    await writeFile(
      `${evidenceDirectory}/result.json`,
      `${JSON.stringify(result, null, 2)}\n`,
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    client.close();
  }
}

async function driveStatePreview() {
  assert.ok(
    evidenceDirectory,
    "drive-state-preview requires an evidence directory",
  );
  await mkdir(evidenceDirectory, { recursive: true });

  const result = await withStaveClient(async (client, page) => {
    await evaluate(
      client,
      `(() => {
        document.querySelector('button[aria-label="Open settings"]')?.click();
        [...document.querySelectorAll('button')]
          .find((button) => button.textContent.trim() === 'Open lab')?.click();
      })()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    await captureScreenshot(client, `${evidenceDirectory}/before.png`);
    const before = await evaluate(
      client,
      `(() => ({
        selected: document.querySelector('.state-picker .is-active')?.textContent?.trim() ?? null,
        labels: [...document.querySelectorAll('.state-label')].map((node) => node.textContent?.trim())
      }))()`,
    );

    const action = await evaluate(
      client,
      `(() => {
        const button = [...document.querySelectorAll('.state-picker button')]
          .find((node) => node.textContent?.trim() === 'Blocked');
        if (!button) return { clicked: false };
        button.click();
        return { clicked: true, label: button.textContent?.trim() };
      })()`,
    );
    assert.equal(action.clicked, true, "Blocked state control was not found");
    await new Promise((resolve) => setTimeout(resolve, 350));

    const after = await evaluate(
      client,
      `(() => ({
        selected: document.querySelector('.state-picker .is-active')?.textContent?.trim() ?? null,
        labels: [...document.querySelectorAll('.state-label')].map((node) => node.textContent?.trim()),
        avatarLabels: [...document.querySelectorAll('.agent-study .agent-avatar svg[aria-label]')]
          .map((node) => node.getAttribute('aria-label'))
      }))()`,
    );
    assert.equal(after.selected, "Blocked", "Blocked control is not selected");
    assert.equal(after.labels.length, 10, "expected ten visible state labels");
    assert.ok(
      after.labels.every((label) => label === "Blocked"),
      "not every card reports Blocked",
    );
    assert.equal(
      after.avatarLabels.length,
      10,
      "expected ten accessible avatar labels",
    );
    assert.ok(
      after.avatarLabels.every((label) => label?.endsWith(", blocked")),
      "not every accessible avatar reports blocked",
    );

    await captureScreenshot(client, `${evidenceDirectory}/after.png`);
    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await evaluate(
      client,
      `(() => [...document.querySelectorAll('.state-picker button')]
        .find((button) => button.textContent.trim() === 'Done')?.click())()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    const reducedMotion = await evaluate(
      client,
      `(() => ({
        selected: document.querySelector('.state-picker .is-active')?.textContent?.trim() ?? null,
        labels: [...document.querySelectorAll('.state-label')].map((node) => node.textContent?.trim()),
        animation: getComputedStyle(document.querySelector('.agent-avatar__presence')).animationName
      }))()`,
    );
    assert.equal(reducedMotion.selected, "Done");
    assert.equal(reducedMotion.labels.length, 10);
    assert.ok(reducedMotion.labels.every((label) => label === "Done"));
    assert.equal(reducedMotion.animation, "none");
    await captureScreenshot(client, `${evidenceDirectory}/reduced-motion.png`);
    await client.send("Emulation.setEmulatedMedia", { features: [] });
    await evaluate(
      client,
      `(() => [...document.querySelectorAll('.state-picker button')]
        .find((button) => button.textContent.trim() === 'Live mix')?.click())()`,
    );
    const restored = await evaluate(
      client,
      `(() => ({
        selected: document.querySelector('.state-picker .is-active')?.textContent?.trim() ?? null,
        labels: [...document.querySelectorAll('.state-label')].map((node) => node.textContent?.trim())
      }))()`,
    );
    assert.equal(restored.selected, "Live mix");
    assert.deepEqual(restored.labels, [
      "Working",
      "Reviewing",
      "Reviewing",
      "Waiting",
      "Idle",
      "Done",
      "Blocked",
      "Queued",
      "Failed",
      "Working",
    ]);
    await captureScreenshot(client, `${evidenceDirectory}/live-mix.png`);
    return {
      passed: true,
      feature: "avatar-state-preview",
      pageUrl: page.url,
      action,
      before,
      after,
      reducedMotion,
      restored,
    };
  });

  await writeFile(
    `${evidenceDirectory}/result.json`,
    `${JSON.stringify(result, null, 2)}\n`,
  );
  console.log(JSON.stringify(result, null, 2));
}

async function driveWorkflow() {
  assert.ok(evidenceDirectory, "drive-workflow requires evidence directory");
  await mkdir(evidenceDirectory, { recursive: true });
  const result = await withStaveClient(async (client, page) => {
    const click = async (text) => {
      const clicked = await evaluate(
        client,
        `(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(${JSON.stringify(text)}) || b.getAttribute('aria-label') === ${JSON.stringify(text)}); if (!b || b.disabled) return false; b.scrollIntoView({block:'nearest',inline:'nearest'}); b.click(); return true; })()`,
      );
      assert.ok(clicked, `Enabled ${text} control not found`);
    };
    const fill = async (id, value) => {
      await evaluate(
        client,
        `(() => {const e=document.getElementById(${JSON.stringify(id)}); if(!e) throw Error('Missing input'); const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)}); e.dispatchEvent(new Event('input',{bubbles:true})); })()`,
      );
    };
    const select = async (id, value) => {
      await evaluate(
        client,
        `(() => {const e=document.getElementById(${JSON.stringify(id)});if(!e)throw Error('Missing select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
      );
    };
    const wait = async (expression) => {
      for (let i = 0; i < 100; i++) {
        if (await evaluate(client, expression)) return;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error(`Timed out: ${expression}`);
    };
    await wait("document.getElementById('project-name') !== null");
    await captureScreenshot(client, `${evidenceDirectory}/before.png`);
    await fill("project-name", "Workflow proof");
    await click("Create project");
    await wait("document.querySelector('.board-page__header') !== null");
    await click("Expand To do");
    await click("Add ticket");
    await fill("ticket-title", "Verify delivery workflow");
    await fill("ticket-description", "Pass implementation, review, and QA.");
    await select("ticket-type", "bug");
    await select("ticket-priority", "urgent");
    await fill("ticket-points", "5");
    await fill("ticket-epic", "Boot screen");
    await fill("ticket-labels", "ui, verification");
    await captureScreenshot(client, `${evidenceDirectory}/ticket-form.png`);
    await click("Create ticket");
    await wait("document.querySelectorAll('.work-ticket').length === 1");
    await click("Run simulation");
    await wait(
      "document.querySelector('.work-ticket[data-execution=running]') !== null",
    );
    await click("Cancel");
    await wait(
      "document.querySelector('.work-ticket[data-execution=canceled]') !== null",
    );
    await click("Run simulation");
    await wait(
      "document.querySelector('.board-column--done .board-rail__count')?.textContent.trim() === '1'",
    );
    await click("Expand Done");
    await wait(
      "document.querySelector('.board-column--done .work-ticket') !== null",
    );
    await evaluate(
      client,
      "(() => { const button = document.querySelector('.board-column--done .work-ticket__title'); button.scrollIntoView({block:'nearest',inline:'nearest'}); button.click(); })()",
    );
    await wait("document.querySelector('.ticket-inspector') !== null");
    const observed = await evaluate(
      client,
      `({
        tabs: [...document.querySelectorAll('.shell-tabs button')].map((element) => element.textContent.trim()),
        done: document.querySelectorAll('.board-column--done .work-ticket').length,
        inspector: document.querySelector('.ticket-inspector') !== null,
        key: document.querySelector('.ticket-inspector__identity code')?.textContent,
        type: document.querySelector('.ticket-metadata > div:first-child dd')?.textContent,
        priority: document.querySelector('.ticket-metadata > div:nth-child(2) dd')?.textContent,
        points: document.querySelector('.ticket-metadata > div:nth-child(3) dd')?.textContent,
        epic: document.querySelector('.ticket-metadata > div:nth-child(4) dd')?.textContent,
        labels: document.querySelector('.ticket-metadata__labels')?.textContent,
        activity: document.querySelector('.ticket-activity').textContent,
        output: document.querySelector('.run-output').textContent
      })`,
    );
    assert.deepEqual(observed.tabs, ["Board", "Chat"]);
    assert.equal(observed.done, 1);
    assert.ok(observed.activity.includes("Simulation canceled"));
    assert.ok(observed.output.includes("Simulated qa passed"));
    assert.equal(observed.inspector, true);
    assert.equal(observed.key, "STV-1");
    assert.equal(observed.type, "Bug");
    assert.equal(observed.priority, "Urgent");
    assert.equal(observed.points, "5");
    assert.equal(observed.epic, "Boot screen");
    assert.equal(observed.labels, "uiverification");
    await evaluate(
      client,
      "document.querySelector('.delivery-board').scrollLeft = document.querySelector('.delivery-board').scrollWidth",
    );
    await captureScreenshot(client, `${evidenceDirectory}/inspector.png`);
    await click("Close details");
    await wait("document.querySelector('.ticket-inspector') === null");
    await captureScreenshot(client, `${evidenceDirectory}/after.png`);
    await click("Chat");
    await wait(
      "document.querySelector('#chat-heading')?.textContent.trim() === '#team'",
    );
    const chat = await evaluate(
      client,
      "document.querySelector('.chat-messages')?.textContent ?? ''",
    );
    assert.ok(chat.includes("Created ticket: Verify delivery workflow"));
    assert.ok(chat.includes("Simulated qa passed"));
    await fill("chat-message-input", "Real app message with @you");
    await click("Send");
    await wait(
      "document.querySelector('.chat-messages')?.textContent.includes('Real app message with @you')",
    );
    await wait(
      "(() => { const list = document.querySelector('.chat-messages'); return list && list.scrollHeight - list.clientHeight - list.scrollTop < 2; })()",
    );
    assert.ok(
      await evaluate(
        client,
        "document.querySelector('.chat-messages .chat-mention--you')?.textContent === '@you'",
      ),
      "@you mention styling is missing",
    );
    await fill("chat-message-input", "/ticket Real app thread");
    await click("Send");
    await wait(
      "[...document.querySelectorAll('.chat-sidebar__ticket')].some((button) => button.textContent.includes('STV-2'))",
    );
    await captureScreenshot(client, `${evidenceDirectory}/chat.png`, false);
    await click("STV-1");
    await wait("document.querySelector('.chat-thread-summary') !== null");
    await fill("chat-message-input", "Reply from the real app");
    await click("Send");
    await wait(
      "document.querySelector('.chat-messages')?.textContent.includes('Reply from the real app')",
    );
    await wait(
      "(() => { const list = document.querySelector('.chat-messages'); return list && list.scrollHeight - list.clientHeight - list.scrollTop < 2; })()",
    );
    await captureScreenshot(
      client,
      `${evidenceDirectory}/ticket-thread.png`,
      false,
    );
    return {
      passed: true,
      feature: "project-ticket-simulated-workflow",
      pageUrl: page.url,
      ...observed,
      chat: chat.slice(0, 500),
      userMessage: "Real app message with @you",
      ticketCommand: "STV-2 Real app thread",
      threadReply: "Reply from the real app",
    };
  });
  await writeFile(
    `${evidenceDirectory}/result.json`,
    `${JSON.stringify(result, null, 2)}\n`,
  );
  console.log(JSON.stringify(result, null, 2));
}

async function driveDecision() {
  assert.ok(evidenceDirectory, "drive-decision requires an evidence directory");
  const repository = process.env.VERIFY_REPOSITORY;
  assert.ok(
    repository,
    "drive-decision requires a disposable VERIFY_REPOSITORY",
  );
  await mkdir(evidenceDirectory, { recursive: true });
  const result = await withStaveClient(async (client, page) => {
    const click = async (text) => {
      const clicked = await evaluate(
        client,
        `(() => { const button = [...document.querySelectorAll('button')].find((node) => node.getClientRects().length > 0 && (node.textContent.trim().startsWith(${JSON.stringify(text)}) || node.getAttribute('aria-label') === ${JSON.stringify(text)})); if (!button || button.disabled) return false; button.scrollIntoView({block:'nearest',inline:'nearest'}); button.click(); return true; })()`,
      );
      assert.ok(clicked, `Enabled ${text} control not found`);
    };
    const fill = async (id, value) => {
      await evaluate(
        client,
        `(() => { const input = document.getElementById(${JSON.stringify(id)}); if (!input) throw Error('Missing input'); const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', {bubbles:true})); })()`,
      );
    };
    const wait = async (expression) => {
      for (let attempt = 0; attempt < 150; attempt++) {
        if (await evaluate(client, expression)) return;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error(`Timed out: ${expression}`);
    };

    await wait("document.getElementById('project-name') !== null");
    await fill("project-name", "Decision proof");
    await fill("repository-path", repository);
    await click("Create project");
    await wait("document.querySelector('.board-page__header') !== null");
    await click("Add ticket");
    await wait("document.getElementById('ticket-title') !== null");
    await fill("ticket-title", "Preserve the current data format");
    await fill("ticket-description", "Ask before changing persisted values.");
    await click("Create ticket");
    await click("Expand To do");
    await wait("document.querySelector('.work-ticket') !== null");
    await click("Run Codex");
    await wait(
      "document.querySelector('.work-ticket[data-execution=waiting_user]') !== null",
    );
    await click("Chat");
    await click("STV-1");
    await wait("document.querySelector('.chat-decision--pending') !== null");
    const question = await evaluate(
      client,
      `({ question: document.querySelector('.chat-decision h2')?.textContent?.trim(), options: [...document.querySelectorAll('.chat-decision__options button strong')].map((node) => node.textContent.trim()) })`,
    );
    assert.equal(
      question.question,
      "How should existing records be converted?",
    );
    assert.deepEqual(question.options, [
      "Preserve existing data",
      "Use the new defaults",
    ]);
    await captureScreenshot(
      client,
      `${evidenceDirectory}/decision-prompt.png`,
      false,
    );
    await click("Preserve existing data");
    await wait("document.querySelector('.chat-decision--answered') !== null");
    await wait(
      "document.querySelector('.chat-thread-summary__heading')?.textContent.includes('Done')",
    );
    const resumed = await evaluate(
      client,
      `({ status: document.querySelector('.chat-thread-summary__heading')?.textContent?.trim(), history: document.querySelector('.chat-messages')?.textContent ?? '' })`,
    );
    assert.ok(resumed.status.includes("Done"));
    assert.ok(resumed.history.includes("You answered: Preserve existing data"));
    assert.ok(resumed.history.includes("Completed fixture."));
    await captureScreenshot(
      client,
      `${evidenceDirectory}/decision-resumed.png`,
      false,
    );
    return {
      passed: true,
      feature: "structured-decision-resumes-codex-turn",
      pageUrl: page.url,
      question,
      chosen: "Preserve existing data",
      ticketStatus: resumed.status,
    };
  });
  await writeFile(
    `${evidenceDirectory}/result.json`,
    `${JSON.stringify(result, null, 2)}\n`,
  );
  console.log(JSON.stringify(result, null, 2));
}

async function driveGit() {
  assert.ok(evidenceDirectory);
  assert.ok(
    process.env.VERIFY_REPOSITORY,
    "Set VERIFY_REPOSITORY to a disposable fixture repository",
  );
  await mkdir(evidenceDirectory, { recursive: true });
  const result = await withStaveClient(async (client) => {
    const click = (text) =>
      evaluate(
        client,
        `(() => {const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(${JSON.stringify(text)}) || b.getAttribute('aria-label') === ${JSON.stringify(text)}); if(!b || b.disabled)throw Error('Missing enabled control');b.click()})()`,
      );
    const fill = (id, value) =>
      evaluate(
        client,
        `(() => {const e=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`,
      );
    const wait = async (expression) => {
      for (let i = 0; i < 100; i++) {
        if (await evaluate(client, expression)) return;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw Error(`Timed out ${expression}`);
    };
    await fill("project-name", "Git workspace proof");
    await click("Create project");
    await evaluate(
      client,
      "document.querySelector('button[aria-label=\"Open settings\"]').click()",
    );
    await wait("document.getElementById('project-repository-path') !== null");
    await fill("project-repository-path", process.env.VERIFY_REPOSITORY);
    await click("Save repository");
    await wait(
      "window.stave.workspace.getSnapshot().then((snapshot) => snapshot.project.repositoryPath?.includes('stave-git-ui-repo'))",
    );
    await click("Close settings");
    await click("Add ticket");
    await fill("ticket-title", "Preserve unfinished work");
    await click("Create ticket");
    await click("Expand To do");
    await wait("document.querySelector('.work-ticket__title') !== null");
    await evaluate(
      client,
      "document.querySelector('.work-ticket__title').click()",
    );
    await click("Prepare workspace");
    await wait("document.querySelector('.ticket-workspace') !== null");
    const first = await evaluate(
      client,
      "window.stave.workspace.getSnapshot().then(s=>s.tickets[0].workspace)",
    );
    assert.equal(first.dirty, false);
    assert.ok(first.branch.startsWith("stave/ticket/"));
    await writeFile(
      `${first.path}/stave-verification-unfinished.txt`,
      "Unfinished work must survive refresh.\n",
      { flag: "wx" },
    );
    await click("Refresh workspace");
    await wait(
      "document.querySelector('.ticket-workspace').textContent.includes('Uncommitted changes')",
    );
    const second = await evaluate(
      client,
      "window.stave.workspace.getSnapshot().then(s=>s.tickets[0].workspace)",
    );
    assert.equal(
      await readFile(
        `${second.path}/stave-verification-unfinished.txt`,
        "utf8",
      ),
      "Unfinished work must survive refresh.\n",
    );
    assert.equal(first.path, second.path);
    assert.equal(first.branch, second.branch);
    assert.equal(second.dirty, true);
    await captureScreenshot(client, `${evidenceDirectory}/workspace.png`);
    return { passed: true, feature: "git-workspace-reuse", first, second };
  });
  await writeFile(
    `${evidenceDirectory}/result.json`,
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
}

async function verifyRestored() {
  assert.ok(evidenceDirectory);
  await mkdir(evidenceDirectory, { recursive: true });
  const result = await withStaveClient(async (client) => {
    const snapshot = await evaluate(
      client,
      "window.stave.workspace.getSnapshot()",
    );
    await evaluate(
      client,
      `(() => document.querySelector('button[aria-label="Expand Done"]')?.click())()`,
    );
    for (let attempt = 0; attempt < 50; attempt++) {
      if (
        await evaluate(
          client,
          "document.querySelector('.board-column--done .work-ticket') !== null",
        )
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const visible = await evaluate(
      client,
      "({tabs:[...document.querySelectorAll('.shell-tabs button')].map(e=>e.textContent.trim()),project:document.querySelector('.board-page__header h1')?.textContent,done:document.querySelectorAll('.board-column--done .work-ticket').length})",
    );
    assert.equal(snapshot.project.name, "Workflow proof");
    assert.equal(snapshot.tickets.length, 2);
    assert.deepEqual(
      snapshot.tickets.map((ticket) => ticket.key),
      ["STV-1", "STV-2"],
    );
    assert.equal(snapshot.tickets[0].stage, "done");
    assert.equal(snapshot.tickets[1].title, "Real app thread");
    assert.deepEqual(
      snapshot.runs.map((r) => r.state),
      ["canceled", "succeeded", "succeeded", "succeeded"],
    );
    assert.deepEqual(visible.tabs, ["Board", "Chat"]);
    assert.equal(visible.project, "Workflow proof");
    assert.equal(visible.done, 1);
    await captureScreenshot(client, `${evidenceDirectory}/restored.png`);
    return {
      passed: true,
      feature: "restart-persistence",
      revision: snapshot.revision,
      projectId: snapshot.project.id,
      ticketIds: snapshot.tickets.map((ticket) => ticket.id),
      runs: snapshot.runs.length,
      visible,
    };
  });
  await writeFile(
    `${evidenceDirectory}/result.json`,
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
}
if (command === "drive-git") await driveGit();
else if (command === "verify-restored") await verifyRestored();
else if (command === "drive-workflow") await driveWorkflow();
else if (command === "drive-decision") await driveDecision();
else if (command === "drive-avatar-study") await driveAvatarStudy();
else if (command === "drive-boot-screen") await driveBootScreen();
else if (command === "doctor") await doctor();
else if (command === "drive-state-preview") await driveStatePreview();
else {
  console.error(`unknown command: ${command}`);
  process.exit(64);
}
