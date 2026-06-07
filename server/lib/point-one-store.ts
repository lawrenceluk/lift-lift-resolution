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
    const slug = slugify(String(s.name));
    const fileName = `${date}-${slug}.json`;

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

/** Default store used by the routes. Swap construction here to change backends. */
export const pointOneStore: PointOneStore = new LocalGitPointOneStore();
