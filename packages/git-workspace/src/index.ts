import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

export interface WorkspaceRequest {
  readonly repositoryPath: string;
  readonly workspaceRoot: string;
  readonly ticketId: string;
}

export interface GitWorkspace {
  readonly path: string;
  readonly branch: string;
  readonly dirty: boolean;
}

export type GitWorkspaceErrorCode =
  | "invalid-input"
  | "invalid-repository"
  | "unsafe-path"
  | "workspace-conflict"
  | "git-failed";

export class GitWorkspaceError extends Error {
  constructor(
    readonly code: GitWorkspaceErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "GitWorkspaceError";
  }
}

const execute = promisify(execFile);

function gitEnvironment(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
  );
}

async function git(
  repositoryPath: string,
  args: readonly string[],
): Promise<string> {
  try {
    const result = await execute(
      "git",
      [
        "-c",
        "core.hooksPath=/dev/null",
        "-c",
        "core.fsmonitor=false",
        "-C",
        repositoryPath,
        ...args,
      ],
      {
        encoding: "utf8",
        env: gitEnvironment(),
        maxBuffer: 4 * 1024 * 1024,
        timeout: 30_000,
      },
    );
    return result.stdout;
  } catch (cause) {
    throw new GitWorkspaceError(
      "git-failed",
      "Git could not complete the workspace operation.",
      { cause },
    );
  }
}

async function statIfPresent(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return null;
    throw error;
  }
}

function isWithin(root: string, path: string): boolean {
  const difference = relative(root, path);
  return (
    difference === "" ||
    (difference !== ".." &&
      !difference.startsWith(`..${sep}`) &&
      !isAbsolute(difference))
  );
}

function validateInput(request: WorkspaceRequest): void {
  for (const [label, value] of Object.entries({
    repositoryPath: request.repositoryPath,
    workspaceRoot: request.workspaceRoot,
    ticketId: request.ticketId,
  })) {
    if (
      typeof value !== "string" ||
      !value.trim() ||
      /[\x00-\x1f\x7f]/u.test(value)
    ) {
      throw new GitWorkspaceError(
        "invalid-input",
        `${label} must be a nonempty string without control characters.`,
      );
    }
  }
  if (
    !isAbsolute(request.repositoryPath) ||
    !isAbsolute(request.workspaceRoot)
  ) {
    throw new GitWorkspaceError(
      "invalid-input",
      "Repository and workspace root paths must be absolute.",
    );
  }
  if (request.ticketId.length > 200) {
    throw new GitWorkspaceError(
      "invalid-input",
      "Ticket ids must be 200 characters or fewer.",
    );
  }
}

async function inspectRepository(
  repositoryPath: string,
): Promise<{ path: string; commonDirectory: string }> {
  try {
    const path = await realpath(repositoryPath);
    if (
      (await git(path, ["rev-parse", "--is-inside-work-tree"])).trim() !==
      "true"
    ) {
      throw new Error("The repository must have a working tree.");
    }
    const topLevel = await realpath(
      (await git(path, ["rev-parse", "--show-toplevel"])).trim(),
    );
    if (path !== topLevel)
      throw new Error("The path must identify the repository root.");
    await git(path, ["rev-parse", "--verify", "HEAD"]);
    const commonDirectory = await realpath(
      (
        await git(path, [
          "rev-parse",
          "--path-format=absolute",
          "--git-common-dir",
        ])
      ).trim(),
    );
    return { path, commonDirectory };
  } catch (cause) {
    throw new GitWorkspaceError(
      "invalid-repository",
      "Select the root of a Git repository with at least one commit.",
      { cause },
    );
  }
}

interface RegisteredWorktree {
  readonly path: string;
  readonly branch: string | null;
}

function parseWorktrees(output: string): RegisteredWorktree[] {
  return output
    .split("\0\0")
    .filter(Boolean)
    .map((record) => {
      const fields = record.split("\0");
      const pathField = fields.find((field) => field.startsWith("worktree "));
      if (!pathField)
        throw new GitWorkspaceError(
          "git-failed",
          "Git returned an invalid worktree listing.",
        );
      const branchField = fields.find((field) => field.startsWith("branch "));
      return {
        path: pathField.slice("worktree ".length),
        branch: branchField?.slice("branch ".length) ?? null,
      };
    });
}

async function canonicalRoot(
  workspaceRoot: string,
  repositoryPath: string,
): Promise<string> {
  const requestedRoot = resolve(workspaceRoot);
  const existing = await statIfPresent(requestedRoot);
  if (existing?.isSymbolicLink() || (existing && !existing.isDirectory())) {
    throw new GitWorkspaceError(
      "unsafe-path",
      "The workspace root must be a directory, not a symbolic link.",
    );
  }
  // Resolve the existing parent before creating anything through an aliased path.
  const root = await realpath(requestedRoot).catch(async (error: unknown) => {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
    let ancestor = requestedRoot;
    const missing: string[] = [];
    while (!(await statIfPresent(ancestor))) {
      const parent = resolve(ancestor, "..");
      missing.unshift(relative(parent, ancestor));
      ancestor = parent;
    }
    return join(await realpath(ancestor), ...missing);
  });
  if (isWithin(repositoryPath, root)) {
    throw new GitWorkspaceError(
      "unsafe-path",
      "Store ticket workspaces outside the source repository.",
    );
  }
  await mkdir(root, { recursive: true });
  if ((await realpath(root)) !== root) {
    throw new GitWorkspaceError(
      "unsafe-path",
      "The workspace root changed while it was being prepared.",
    );
  }
  return root;
}

async function verifyWorkspace(
  path: string,
  root: string,
  commonDirectory: string,
  branch: string,
): Promise<GitWorkspace> {
  const entry = await statIfPresent(path);
  if (
    !entry?.isDirectory() ||
    entry.isSymbolicLink() ||
    (await realpath(path)) !== path ||
    !isWithin(root, path)
  ) {
    throw new GitWorkspaceError(
      "unsafe-path",
      "The ticket workspace must be a real directory inside its workspace root.",
    );
  }
  const repository = await inspectRepository(path);
  if (
    repository.commonDirectory !== commonDirectory ||
    (await git(path, ["symbolic-ref", "--quiet", "HEAD"])).trim() !==
      `refs/heads/${branch}`
  ) {
    throw new GitWorkspaceError(
      "workspace-conflict",
      "The ticket workspace belongs to another repository or branch.",
    );
  }
  return {
    path,
    branch,
    dirty:
      (
        await git(path, [
          "status",
          "--porcelain=v1",
          "--untracked-files=normal",
        ])
      ).length > 0,
  };
}

/** Creates a ticket worktree or reuses its matching registered worktree without discarding changes. */
export async function createOrReuseWorkspace(
  request: WorkspaceRequest,
): Promise<GitWorkspace> {
  validateInput(request);
  const repository = await inspectRepository(request.repositoryPath);
  const root = await canonicalRoot(request.workspaceRoot, repository.path);
  const slug =
    request.ticketId
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-|-$/gu, "")
      .slice(0, 48) || "ticket";
  const suffix = createHash("sha256")
    .update(JSON.stringify([repository.commonDirectory, request.ticketId]))
    .digest("hex")
    .slice(0, 20);
  const name = `${slug}-${suffix}`;
  const path = join(root, name);
  const branch = `stave/ticket/${name}`;
  const branchRef = `refs/heads/${branch}`;
  const worktrees = parseWorktrees(
    await git(repository.path, ["worktree", "list", "--porcelain", "-z"]),
  );
  const registered = worktrees.find(
    (worktree) => resolve(worktree.path) === path,
  );
  if (registered) {
    if (registered.branch !== branchRef) {
      throw new GitWorkspaceError(
        "workspace-conflict",
        "The ticket workspace is registered to a different branch.",
      );
    }
    return verifyWorkspace(path, root, repository.commonDirectory, branch);
  }
  if (await statIfPresent(path)) {
    throw new GitWorkspaceError(
      "workspace-conflict",
      "The ticket workspace path already exists and is not registered to this repository.",
    );
  }
  if (worktrees.some((worktree) => worktree.branch === branchRef)) {
    throw new GitWorkspaceError(
      "workspace-conflict",
      "The ticket branch is already checked out in another workspace.",
    );
  }
  const existingBranches = await git(repository.path, [
    "for-each-ref",
    "--format=%(refname)",
    branchRef,
  ]);
  const branchExists = existingBranches.split("\n").includes(branchRef);
  await git(
    repository.path,
    branchExists
      ? ["worktree", "add", "--", path, branch]
      : ["worktree", "add", "-b", branch, "--", path, "HEAD"],
  );
  return verifyWorkspace(path, root, repository.commonDirectory, branch);
}
