import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createOrReuseWorkspace, type WorkspaceRequest } from "../src/index";

const execute = promisify(execFile);
let fixtureRoot: string;
let request: WorkspaceRequest;

async function git(path: string, args: string[]): Promise<string> {
  const result = await execute("git", ["-C", path, ...args], {
    encoding: "utf8",
    env: Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
    ),
  });
  return result.stdout.trim();
}

beforeEach(async () => {
  fixtureRoot = await realpath(
    await mkdtemp(join(tmpdir(), "stave-git-workspace-")),
  );
  const repositoryPath = join(fixtureRoot, "source repo");
  await mkdir(repositoryPath);
  await git(repositoryPath, ["init", "--initial-branch=main"]);
  await git(repositoryPath, ["config", "user.name", "Workspace fixture"]);
  await git(repositoryPath, [
    "config",
    "user.email",
    "fixture@example.invalid",
  ]);
  await writeFile(join(repositoryPath, "README.md"), "Source content\n");
  await git(repositoryPath, ["add", "README.md"]);
  await git(repositoryPath, ["commit", "-m", "Initial fixture"]);
  request = {
    repositoryPath,
    workspaceRoot: join(fixtureRoot, "workspaces"),
    ticketId: "STAVE-42",
  };
});

afterEach(async () => {
  await rm(fixtureRoot, { recursive: true, force: true });
});

describe("createOrReuseWorkspace", () => {
  it("creates an isolated, clean worktree on a deterministic ticket branch", async () => {
    const workspace = await createOrReuseWorkspace(request);
    expect(workspace.dirty).toBe(false);
    expect(relative(request.workspaceRoot, workspace.path)).toMatch(
      /^stave-42-[a-f0-9]{20}$/u,
    );
    expect(workspace.branch).toBe(
      `stave/ticket/${relative(request.workspaceRoot, workspace.path)}`,
    );
    expect(await git(workspace.path, ["branch", "--show-current"])).toBe(
      workspace.branch,
    );
    expect(await readFile(join(workspace.path, "README.md"), "utf8")).toBe(
      "Source content\n",
    );
    expect(
      await git(request.repositoryPath, ["branch", "--show-current"]),
    ).toBe("main");
    expect(await createOrReuseWorkspace(request)).toEqual(workspace);
  });

  it("reports and preserves tracked, staged, and untracked changes when reusing a worktree", async () => {
    const workspace = await createOrReuseWorkspace(request);
    await writeFile(join(workspace.path, "README.md"), "Ticket work\n");
    await git(workspace.path, ["add", "README.md"]);
    await writeFile(join(workspace.path, "draft.txt"), "Keep me\n");
    expect(await createOrReuseWorkspace(request)).toEqual({
      ...workspace,
      dirty: true,
    });
    expect(await readFile(join(workspace.path, "draft.txt"), "utf8")).toBe(
      "Keep me\n",
    );
    expect(await git(workspace.path, ["diff", "--cached", "--name-only"])).toBe(
      "README.md",
    );
    expect(
      await readFile(join(request.repositoryPath, "README.md"), "utf8"),
    ).toBe("Source content\n");
  });

  it("refuses nonrepositories, repository subdirectories, and repositories without commits", async () => {
    const nonrepository = join(fixtureRoot, "not-a-repo");
    await mkdir(nonrepository);
    await expect(
      createOrReuseWorkspace({ ...request, repositoryPath: nonrepository }),
    ).rejects.toMatchObject({ code: "invalid-repository" });
    await mkdir(join(request.repositoryPath, "nested"));
    await expect(
      createOrReuseWorkspace({
        ...request,
        repositoryPath: join(request.repositoryPath, "nested"),
      }),
    ).rejects.toMatchObject({ code: "invalid-repository" });
    await git(nonrepository, ["init", "--initial-branch=main"]);
    await expect(
      createOrReuseWorkspace({ ...request, repositoryPath: nonrepository }),
    ).rejects.toMatchObject({ code: "invalid-repository" });
  });

  it("keeps path syntax and shell punctuation in ticket ids inert", async () => {
    const workspace = await createOrReuseWorkspace({
      ...request,
      ticketId: "../../outside;$(touch injected)",
    });
    expect(relative(request.workspaceRoot, workspace.path)).toMatch(
      /^outside-touch-injected-[a-f0-9]{20}$/u,
    );
    expect(workspace.dirty).toBe(false);
    await expect(readFile(join(fixtureRoot, "injected"))).rejects.toMatchObject(
      { code: "ENOENT" },
    );
  });

  it("rejects invalid ids and relative paths before creating a workspace", async () => {
    for (const ticketId of ["", "  ", "unsafe\nname", "x".repeat(201)]) {
      await expect(
        createOrReuseWorkspace({ ...request, ticketId }),
      ).rejects.toMatchObject({ code: "invalid-input" });
    }
    await expect(
      createOrReuseWorkspace({ ...request, workspaceRoot: "relative" }),
    ).rejects.toMatchObject({ code: "invalid-input" });
  });

  it("separates ids that normalize to the same slug", async () => {
    const first = await createOrReuseWorkspace({ ...request, ticketId: "a/b" });
    const second = await createOrReuseWorkspace({
      ...request,
      ticketId: "a b",
    });
    expect(first.path).not.toBe(second.path);
    expect(first.branch).not.toBe(second.branch);
  });

  it("uses the same identity through a repository alias or linked source worktree", async () => {
    const workspace = await createOrReuseWorkspace(request);
    const alias = join(fixtureRoot, "source-alias");
    await symlink(request.repositoryPath, alias, "dir");
    expect(
      await createOrReuseWorkspace({ ...request, repositoryPath: alias }),
    ).toEqual(workspace);
    const linked = join(fixtureRoot, "linked-source");
    await git(request.repositoryPath, [
      "worktree",
      "add",
      "-b",
      "other-source",
      "--",
      linked,
      "HEAD",
    ]);
    expect(
      await createOrReuseWorkspace({ ...request, repositoryPath: linked }),
    ).toEqual(workspace);
  });

  it("refuses an occupied, unregistered path and preserves its content", async () => {
    const workspace = await createOrReuseWorkspace(request);
    await git(request.repositoryPath, ["worktree", "remove", workspace.path]);
    await mkdir(workspace.path);
    await writeFile(join(workspace.path, "foreign.txt"), "Unrelated work\n");
    await expect(createOrReuseWorkspace(request)).rejects.toMatchObject({
      code: "workspace-conflict",
    });
    expect(await readFile(join(workspace.path, "foreign.txt"), "utf8")).toBe(
      "Unrelated work\n",
    );
  });

  it("refuses a symlink at the ticket path without touching its target", async () => {
    const workspace = await createOrReuseWorkspace(request);
    await git(request.repositoryPath, ["worktree", "remove", workspace.path]);
    const external = join(fixtureRoot, "external");
    await mkdir(external);
    await writeFile(join(external, "keep.txt"), "Keep\n");
    await symlink(external, workspace.path, "dir");
    await expect(createOrReuseWorkspace(request)).rejects.toMatchObject({
      code: "workspace-conflict",
    });
    expect(await readFile(join(external, "keep.txt"), "utf8")).toBe("Keep\n");
  });

  it("refuses a registered path that was replaced with another repository", async () => {
    const workspace = await createOrReuseWorkspace(request);
    await rm(workspace.path, { recursive: true });
    await mkdir(workspace.path);
    await git(workspace.path, ["init", "--initial-branch=main"]);
    await writeFile(
      join(workspace.path, "foreign.txt"),
      "Foreign repository\n",
    );
    await git(workspace.path, ["add", "foreign.txt"]);
    await git(workspace.path, [
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "-m",
      "Foreign work",
    ]);
    await expect(createOrReuseWorkspace(request)).rejects.toMatchObject({
      code: "workspace-conflict",
    });
    expect(await readFile(join(workspace.path, "foreign.txt"), "utf8")).toBe(
      "Foreign repository\n",
    );
  });

  it("reports stale registration without recreating or pruning the missing workspace", async () => {
    const workspace = await createOrReuseWorkspace(request);
    await rm(workspace.path, { recursive: true });
    await expect(createOrReuseWorkspace(request)).rejects.toMatchObject({
      code: "unsafe-path",
    });
    expect(
      await git(request.repositoryPath, ["worktree", "list", "--porcelain"]),
    ).toContain(workspace.path);
    await expect(
      readFile(join(workspace.path, "README.md")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects a symlink root and a root inside the source repository", async () => {
    const external = join(fixtureRoot, "external");
    await mkdir(external);
    await symlink(external, request.workspaceRoot, "dir");
    await expect(createOrReuseWorkspace(request)).rejects.toMatchObject({
      code: "unsafe-path",
    });
    await expect(
      createOrReuseWorkspace({
        ...request,
        workspaceRoot: join(request.repositoryPath, "workspaces"),
      }),
    ).rejects.toMatchObject({ code: "unsafe-path" });
  });

  it("refuses to reuse a registered worktree whose branch was changed", async () => {
    const workspace = await createOrReuseWorkspace(request);
    await git(workspace.path, ["switch", "-c", "unrelated"]);
    await writeFile(join(workspace.path, "keep.txt"), "Still here\n");
    await expect(createOrReuseWorkspace(request)).rejects.toMatchObject({
      code: "workspace-conflict",
    });
    expect(await readFile(join(workspace.path, "keep.txt"), "utf8")).toBe(
      "Still here\n",
    );
  });

  it("refuses to attach a ticket branch already checked out elsewhere", async () => {
    const workspace = await createOrReuseWorkspace(request);
    await git(request.repositoryPath, ["worktree", "remove", workspace.path]);
    const elsewhere = join(fixtureRoot, "elsewhere");
    await git(request.repositoryPath, [
      "worktree",
      "add",
      "--",
      elsewhere,
      workspace.branch,
    ]);
    await expect(createOrReuseWorkspace(request)).rejects.toMatchObject({
      code: "workspace-conflict",
    });
    expect(await git(elsewhere, ["branch", "--show-current"])).toBe(
      workspace.branch,
    );
  });

  it("reattaches an existing free ticket branch without resetting its commits", async () => {
    const workspace = await createOrReuseWorkspace(request);
    await writeFile(
      join(workspace.path, "ticket.txt"),
      "Completed ticket work\n",
    );
    await git(workspace.path, ["add", "ticket.txt"]);
    await git(workspace.path, ["commit", "-m", "Ticket work"]);
    const ticketHead = await git(workspace.path, ["rev-parse", "HEAD"]);
    await git(request.repositoryPath, ["worktree", "remove", workspace.path]);
    const resumed = await createOrReuseWorkspace(request);
    expect(resumed).toEqual(workspace);
    expect(await git(resumed.path, ["rev-parse", "HEAD"])).toBe(ticketHead);
    expect(await readFile(join(resumed.path, "ticket.txt"), "utf8")).toBe(
      "Completed ticket work\n",
    );
  });
});
