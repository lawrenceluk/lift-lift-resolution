import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);

/**
 * The "git seam" — this frontend is a thin limb of a separate brain (Point One),
 * whose canonical state is a git repo. The brain writes the program (the plan);
 * the frontend reads it and appends performed sessions (actuals) back.
 *
 * Canonical data is JSON-in-git. Actuals are append-only (one file per performed
 * session). The frontend must never block on the brain — these are simple
 * synchronous fs/git ops.
 */
export interface PointOneStore {
  /** Read + parse the program (the plan) the brain wrote. */
  readProgram(): Promise<unknown>;
  /** Append a performed session (actuals). Returns the written path + whether it committed. */
  writeSession(session: unknown): Promise<{ path: string; committed: boolean }>;
}

const DEFAULT_REPO = "/Users/law/Documents/Claude Cowork/Point One";

/** Path of the program file, relative to the repo root. */
const PROGRAM_REL = path.join("point-one", "workout", "program.json");
/** Directory actuals are written into, relative to the repo root. */
const LOG_REL = path.join("point-one", "workout", "log");

/** POSIX-join workout path + "log" + filename, asserting the filename can't
 *  escape the log dir. Shared by both stores so their layout can't drift. The
 *  filename is already slugified (no `/`, `\`, `.`), but we re-assert here as
 *  defense in depth in case the slug logic ever changes. */
function logRelPath(workoutPath: string, fileName: string): string {
  if (fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
    throw new Error(`Refusing to write session to unsafe filename: ${fileName}`);
  }
  return `${workoutPath.replace(/\/+$/, "")}/log/${fileName}`;
}

/** Build the `<date>-<slug>.json` filename for a performed session. Shared by
 *  both stores so the naming (and its path-traversal guard via slugify) can't
 *  drift between local and remote backends. */
function sessionFileName(session: SessionLike): string {
  const date = sessionDate(session);
  const slug = slugify(String(session.name));
  return `${date}-${slug}.json`;
}

/** A workout session, minimally — only what the store needs to name + date the file. */
interface SessionLike {
  name: string;
  completedAt?: string;
  completedDate?: string;
  date?: string;
}

/**
 * Slugify a session name into a filesystem-safe token. Lowercase, alphanumerics
 * and dashes only; collapses runs of other chars to a single dash. This also
 * defends against path traversal — the result can never contain `/`, `\`, or `.`.
 */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "session";
}

/** Resolve the YYYY-MM-DD date for a session: its completion date, else today. */
function sessionDate(session: SessionLike): string {
  const raw = session.completedAt ?? session.completedDate ?? session.date;
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * Local-git implementation: reads/writes files on disk and commits via the `git`
 * CLI against a local clone of the Point One repo.
 *
 * Structured so a GitHubApiPointOneStore (Octokit / contents API) could be
 * swapped in for a remote deploy where there is no local checkout — it would
 * implement the same PointOneStore interface, reading via GET contents and
 * writing via PUT contents (which commits in one call). Routes depend only on
 * the interface, never on this class.
 */
export class LocalGitPointOneStore implements PointOneStore {
  private readonly repo: string;

  constructor(repo: string = process.env.POINT_ONE_REPO ?? DEFAULT_REPO) {
    this.repo = repo;
  }

  async readProgram(): Promise<unknown> {
    const programPath = path.join(this.repo, PROGRAM_REL);
    let raw: string;
    try {
      raw = await readFile(programPath, "utf8");
    } catch (err) {
      throw new Error(
        `Program file not found at ${programPath}. The brain (Point One) has not written a program yet, or POINT_ONE_REPO is misconfigured.`,
      );
    }
    try {
      return JSON.parse(raw);
    } catch (err) {
      throw new Error(
        `Program file at ${programPath} is not valid JSON: ${(err as Error).message}`,
      );
    }
  }

  async writeSession(
    session: unknown,
  ): Promise<{ path: string; committed: boolean }> {
    const s = session as SessionLike;
    const date = sessionDate(s);
    const fileName = sessionFileName(s);

    const logDir = path.join(this.repo, LOG_REL);

    // Resolve + assert the target stays inside the log dir (defense in depth on
    // top of slugify, in case the slug logic ever changes).
    const filePath = path.resolve(logDir, fileName);
    const logDirResolved = path.resolve(logDir);
    if (
      filePath !== path.join(logDirResolved, fileName) ||
      !filePath.startsWith(logDirResolved + path.sep)
    ) {
      throw new Error(`Refusing to write session outside ${logDirResolved}`);
    }

    await mkdir(logDir, { recursive: true });
    // Overwrite if the same date+slug already exists — it's the same session re-saved.
    await writeFile(filePath, JSON.stringify(session, null, 2) + "\n", "utf8");

    const committed = await this.commitFile(filePath, String(s.name), date);
    return { path: filePath, committed };
  }

  /**
   * Commit ONLY the one file via pathspec. Never `git add -A`, never touch
   * program.json or other files, never push. If anything goes wrong (nothing to
   * commit, not a git repo, etc.) leave the file written and return false.
   */
  private async commitFile(
    filePath: string,
    name: string,
    date: string,
  ): Promise<boolean> {
    try {
      await execFileAsync("git", ["-C", this.repo, "add", "--", filePath]);
      await execFileAsync("git", [
        "-C",
        this.repo,
        "commit",
        "-m",
        `workout: log ${name} ${date}`,
        "--",
        filePath,
      ]);
      return true;
    } catch (err) {
      const reason =
        (err as { stderr?: string; message?: string }).stderr ||
        (err as Error).message;
      // Non-fatal: the file is on disk; the brain can pick it up on next sync.
      console.warn(
        `[point-one-store] git commit skipped for ${filePath}: ${String(reason).trim()}`,
      );
      return false;
    }
  }
}

/**
 * GitHub contents-API implementation: reads/writes the same files as
 * LocalGitPointOneStore, but against a remote GitHub repo over HTTPS instead of
 * a local checkout — for deploys (e.g. Railway) where there is no local clone or
 * `git` CLI. Uses the global `fetch` (Node 22), no octokit, no new deps.
 *
 * Reads the program via GET /contents (base64-decode + parse). Appends a
 * performed session via PUT /contents, which commits in a single call. Same
 * append-only contract: only ever writes under `<workoutPath>/log/`, never
 * touches program.json. Routes depend only on the PointOneStore interface.
 */
export class GitHubApiPointOneStore implements PointOneStore {
  private readonly token: string;
  private readonly repo: string;
  private readonly branch: string;
  private readonly workoutPath: string;
  private readonly apiBase = "https://api.github.com";

  constructor() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error(
        "GITHUB_TOKEN is required for the GitHub store (POINT_ONE_STORE=github) but is not set.",
      );
    }
    this.token = token;
    this.repo = process.env.GITHUB_REPO ?? "lawrenceluk/point-one";
    this.branch = process.env.GITHUB_BRANCH ?? "main";
    // Strip any leading/trailing slashes so we control all path joins.
    this.workoutPath = (process.env.POINT_ONE_WORKOUT_PATH ?? "point-one/workout")
      .replace(/^\/+|\/+$/g, "");
  }

  /** Headers required on every GitHub API call. */
  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "point-one-fitness",
    };
  }

  async readProgram(): Promise<unknown> {
    const programPath = `${this.workoutPath}/program.json`;
    const url = `${this.apiBase}/repos/${this.repo}/contents/${programPath}?ref=${encodeURIComponent(
      this.branch,
    )}`;
    const res = await fetch(url, { headers: this.headers() });

    if (res.status === 404) {
      throw new Error(
        `program.json not found in ${this.repo}@${this.branch} (at ${programPath}). The brain (Point One) has not written a program yet, or GITHUB_REPO/GITHUB_BRANCH/POINT_ONE_WORKOUT_PATH is misconfigured.`,
      );
    }
    if (!res.ok) {
      const snippet = (await res.text()).slice(0, 300);
      throw new Error(
        `GitHub GET contents for program.json failed: ${res.status} ${res.statusText}. ${snippet}`,
      );
    }

    const body = (await res.json()) as { content?: string; encoding?: string };
    if (typeof body.content !== "string") {
      throw new Error(
        `GitHub GET contents for program.json returned no content (is ${programPath} a directory?).`,
      );
    }
    const decoded = Buffer.from(body.content, "base64").toString("utf8");
    try {
      return JSON.parse(decoded);
    } catch (err) {
      throw new Error(
        `Program file ${programPath} in ${this.repo}@${this.branch} is not valid JSON: ${(err as Error).message}`,
      );
    }
  }

  async writeSession(
    session: unknown,
  ): Promise<{ path: string; committed: boolean }> {
    const s = session as SessionLike;
    const date = sessionDate(s);
    const fileName = sessionFileName(s);
    // Append-only: always under `<workoutPath>/log/`, never program.json.
    const targetPath = logRelPath(this.workoutPath, fileName);
    const url = `${this.apiBase}/repos/${this.repo}/contents/${targetPath}`;

    // Create-or-update: the contents API needs the existing blob `sha` to update
    // a file in place; omitting it creates a new file. Look it up first.
    const sha = await this.fileSha(targetPath);

    const content = Buffer.from(JSON.stringify(session, null, 2)).toString("base64");
    const putBody: Record<string, unknown> = {
      message: `workout: log ${String(s.name)} ${date}`,
      content,
      branch: this.branch,
    };
    if (sha) {
      putBody.sha = sha;
    }

    const res = await fetch(url, {
      method: "PUT",
      headers: { ...this.headers(), "Content-Type": "application/json" },
      body: JSON.stringify(putBody),
    });
    if (!res.ok) {
      const snippet = (await res.text()).slice(0, 300);
      throw new Error(
        `GitHub PUT contents for ${targetPath} failed: ${res.status} ${res.statusText}. ${snippet}`,
      );
    }

    // PUT contents commits in a single call — no separate git step.
    return { path: targetPath, committed: true };
  }

  /** Return the blob sha of an existing file, or undefined if it doesn't exist
   *  (404). Any other non-2xx is an error worth surfacing. */
  private async fileSha(filePath: string): Promise<string | undefined> {
    const url = `${this.apiBase}/repos/${this.repo}/contents/${filePath}?ref=${encodeURIComponent(
      this.branch,
    )}`;
    const res = await fetch(url, { headers: this.headers() });
    if (res.status === 404) {
      return undefined;
    }
    if (!res.ok) {
      const snippet = (await res.text()).slice(0, 300);
      throw new Error(
        `GitHub GET contents (sha lookup) for ${filePath} failed: ${res.status} ${res.statusText}. ${snippet}`,
      );
    }
    const body = (await res.json()) as { sha?: string };
    return body.sha;
  }
}

/**
 * Default store used by the routes. Selected by POINT_ONE_STORE:
 *   - "github" → GitHubApiPointOneStore (remote deploy; needs GITHUB_TOKEN).
 *   - anything else / unset → LocalGitPointOneStore (local dev — unchanged).
 */
export const pointOneStore: PointOneStore =
  process.env.POINT_ONE_STORE === "github"
    ? new GitHubApiPointOneStore()
    : new LocalGitPointOneStore();
