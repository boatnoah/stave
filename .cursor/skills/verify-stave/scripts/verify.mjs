#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";

const [, , command, portValue, evidenceDirectory] = process.argv;
const port = Number(portValue);

if (!command || !Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error("usage: verify.mjs <doctor|drive-state-preview> <port> [evidence-dir]");
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
    throw new Error(result.exceptionDetails.text ?? "renderer evaluation failed");
  }
  return result.result.value;
}

async function captureScreenshot(client, path) {
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
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
    assert.ok(await evaluate(client, "document.querySelector('.workspace') !== null || document.querySelector('.avatar-lab') !== null"), "Stave product surface is missing");
    return { ready: true, url: page.url, ...surface };
  });
  console.log(JSON.stringify(result, null, 2));
}

async function driveStatePreview() {
  assert.ok(evidenceDirectory, "drive-state-preview requires an evidence directory");
  await mkdir(evidenceDirectory, { recursive: true });

  const result = await withStaveClient(async (client, page) => {
    await evaluate(client, "[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Avatar lab')?.click()");
    await new Promise(resolve => setTimeout(resolve, 100));
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
    assert.ok(after.labels.every((label) => label === "Blocked"), "not every card reports Blocked");
    assert.equal(after.avatarLabels.length, 10, "expected ten accessible avatar labels");
    assert.ok(
      after.avatarLabels.every((label) => label?.endsWith(", blocked")),
      "not every accessible avatar reports blocked",
    );

    await captureScreenshot(client, `${evidenceDirectory}/after.png`);
    return {
      passed: true,
      feature: "avatar-state-preview",
      pageUrl: page.url,
      action,
      before,
      after,
    };
  });

  await writeFile(`${evidenceDirectory}/result.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

async function driveWorkflow() {
  assert.ok(evidenceDirectory, "drive-workflow requires evidence directory");
  await mkdir(evidenceDirectory, { recursive: true });
  const result = await withStaveClient(async (client, page) => {
    const click = async text => {
      const clicked = await evaluate(client, `(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(${JSON.stringify(text)})); if (!b || b.disabled) return false; b.click(); return true; })()`);
      assert.ok(clicked, `Enabled ${text} control not found`);
    };
    const fill = async (id, value) => {
      await evaluate(client, `(() => {const e=document.getElementById(${JSON.stringify(id)}); if(!e) throw Error('Missing input'); const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)}); e.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    };
    const wait = async expression => {
      for (let i=0;i<100;i++) { if(await evaluate(client, expression)) return; await new Promise(r=>setTimeout(r,100)); }
      throw new Error(`Timed out: ${expression}`);
    };
    await wait("document.getElementById('project-name') !== null");
    await captureScreenshot(client, `${evidenceDirectory}/before.png`);
    await fill('project-name','Workflow proof');
    await click('Create project');
    await wait("document.querySelectorAll('.crew-member').length === 3");
    await click('Add ticket');
    await fill('ticket-title','Verify delivery workflow');
    await fill('ticket-description','Pass implementation, review, and QA.');
    await click('Create ticket');
    await wait("document.querySelectorAll('.work-ticket').length === 1");
    await click('Run simulation');
    await wait("document.querySelector('.work-ticket[data-execution=running]') !== null");
    await click('Cancel');
    await wait("document.querySelector('.work-ticket[data-execution=canceled]') !== null");
    await click('Run simulation');
    await wait("document.querySelector('.board-column--done .work-ticket') !== null");
    const observed = await evaluate(client, `({team:[...document.querySelectorAll('.crew-member h3')].map(e=>e.textContent),done:document.querySelectorAll('.board-column--done .work-ticket').length,activity:document.querySelector('.activity-list').textContent})`);
    assert.deepEqual(observed.team,['Maya','Alex','Sam']);
    assert.equal(observed.done,1);
    assert.ok(observed.activity.includes('Simulation canceled'));
    assert.ok(observed.activity.includes('Simulated qa passed'));
    await captureScreenshot(client, `${evidenceDirectory}/after.png`);
    return {passed:true,feature:'project-ticket-simulated-workflow',pageUrl:page.url,...observed};
  });
  await writeFile(`${evidenceDirectory}/result.json`, `${JSON.stringify(result,null,2)}\n`);
  console.log(JSON.stringify(result,null,2));
}

async function driveGit() {
  assert.ok(evidenceDirectory);
  assert.ok(process.env.VERIFY_REPOSITORY, "Set VERIFY_REPOSITORY to a disposable fixture repository");
  await mkdir(evidenceDirectory, {recursive:true});
  const result = await withStaveClient(async client => {
    const click = text => evaluate(client, `(() => {const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(${JSON.stringify(text)})); if(!b || b.disabled)throw Error('Missing enabled control');b.click()})()`);
    const fill = (id,value) => evaluate(client, `(() => {const e=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    const wait = async expression => {for(let i=0;i<100;i++){if(await evaluate(client,expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out '+expression);};
    await fill('project-name','Git workspace proof');await click('Create project');
    await wait("document.getElementById('project-repository-path') !== null");
    await fill('project-repository-path',process.env.VERIFY_REPOSITORY);await click('Save repository');
    await wait("document.querySelector('.project-heading').textContent.includes('stave-git-ui-repo')");
    await click('Add ticket');await fill('ticket-title','Preserve unfinished work');await click('Create ticket');
    await wait("document.querySelector('.work-ticket__title') !== null");
    await evaluate(client,"document.querySelector('.work-ticket__title').click()");
    await click('Prepare workspace');
    await wait("document.querySelector('.ticket-workspace') !== null");
    const first = await evaluate(client,"window.stave.workspace.getSnapshot().then(s=>s.tickets[0].workspace)");
    assert.equal(first.dirty,false);assert.ok(first.branch.startsWith('stave/ticket/'));
    await writeFile(`${first.path}/stave-verification-unfinished.txt`,'Unfinished work must survive refresh.\n',{flag:'wx'});
    await click('Refresh workspace');
    await wait("document.querySelector('.ticket-workspace').textContent.includes('Uncommitted changes')");
    const second = await evaluate(client,"window.stave.workspace.getSnapshot().then(s=>s.tickets[0].workspace)");
    assert.equal(first.path,second.path);assert.equal(first.branch,second.branch);assert.equal(second.dirty,true);
    await captureScreenshot(client,`${evidenceDirectory}/workspace.png`);
    return {passed:true,feature:'git-workspace-reuse',first,second};
  });
  await writeFile(`${evidenceDirectory}/result.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}

async function verifyRestored() {
  assert.ok(evidenceDirectory);
  await mkdir(evidenceDirectory, {recursive:true});
  const result = await withStaveClient(async client => {
    const snapshot = await evaluate(client, "window.stave.workspace.getSnapshot()");
    const visible = await evaluate(client, "({team:[...document.querySelectorAll('.crew-member h3')].map(e=>e.textContent),done:document.querySelectorAll('.board-column--done .work-ticket').length})");
    assert.equal(snapshot.project.name, 'Workflow proof');
    assert.equal(snapshot.tickets.length, 1);
    assert.equal(snapshot.tickets[0].stage, 'done');
    assert.deepEqual(snapshot.runs.map(r=>r.state), ['canceled','succeeded','succeeded','succeeded']);
    assert.deepEqual(visible.team, ['Maya','Alex','Sam']);
    assert.equal(visible.done,1);
    await captureScreenshot(client, `${evidenceDirectory}/restored.png`);
    return {passed:true,feature:'restart-persistence',revision:snapshot.revision,projectId:snapshot.project.id,ticketId:snapshot.tickets[0].id,runs:snapshot.runs.length,visible};
  });
  await writeFile(`${evidenceDirectory}/result.json`,JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
}
if (command === "drive-git") await driveGit();
else if (command === "verify-restored") await verifyRestored();
else if (command === "drive-workflow") await driveWorkflow();
else if (command === "doctor") await doctor();
else if (command === "drive-state-preview") await driveStatePreview();
else {
  console.error(`unknown command: ${command}`);
  process.exit(64);
}
