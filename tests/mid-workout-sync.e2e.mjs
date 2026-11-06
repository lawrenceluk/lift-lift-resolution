// Mid-workout safety: a new program generation must not disturb the session
// he's on. Real browser, real app server, throwaway git repo (never his data).
// Run: npm run test:e2e
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const PORT = 5077;
const BASE = `http://localhost:${PORT}`;
const STORE = 'po_workout_v2';
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

const exercise = (sid, n, name, sets = []) => ({
  id: `${sid}-e${n}`, name, groupLabel: `A${n}`, warmupSets: 0, workingSets: 2,
  reps: '8-10', targetLoad: '2 RIR', restSeconds: 60, notes: `${sid} note`, sets,
});
const session = (sid, name, sets = []) => ({
  id: sid, theme: 'full', name, warmup: ['2 min bike'], notes: `${sid} notes`,
  exercises: [exercise(sid, 1, 'Barbell RDL', sets), exercise(sid, 2, 'Flat Barbell Bench Press')],
});
const envelope = (generation, queue, extra = {}) => ({
  schema: 2, generation, generatedAt: new Date().toISOString(), basedOn: [],
  changelog: `generation ${generation} changelog`, block: { focus: 'Test', startedOn: today },
  queue, history: [], ...extra,
});
const logged = (n) => ({
  setNumber: n, reps: 10, weight: 160 + n, weightUnit: 'lbs', rir: 2, completed: true,
  loggedAt: new Date().toISOString(),
});
const record = (sid, name, sets) => ({
  ...session(sid, name, sets), performedDate: today, startedAt: new Date().toISOString(),
});

const repo = mkdtempSync(path.join(tmpdir(), 'llr-e2e-'));
const workout = path.join(repo, 'point-one', 'workout');
mkdirSync(path.join(workout, 'log'), { recursive: true });
execFileSync('git', ['init', '-q'], { cwd: repo });
execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repo });
execFileSync('git', ['config', 'user.name', 'test'], { cwd: repo });
const publish = (env) => writeFileSync(path.join(workout, 'program.json'), JSON.stringify(env));
publish(envelope(1, [session('s-gen1-b', 'Session B')]));

const server = spawn('npm', ['run', 'dev'], {
  env: { ...process.env, PORT: String(PORT), NODE_ENV: 'development', POINT_ONE_REPO: repo, POINT_ONE_STORE: '', APP_SECRET: '' },
  stdio: 'ignore', detached: true,
});
const stop = () => { try { process.kill(-server.pid); } catch {} rmSync(repo, { recursive: true, force: true }); };
for (let i = 0; ; i++) {
  try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch {}
  if (i > 120) { stop(); throw new Error('server did not start'); }
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch();
const results = [];
const scenario = async (name, fn) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  // The local server has no gate; any stored value gets the client past its prompt.
  await context.addInitScript(() => localStorage.setItem('app_secret', 'local-test'));
  const page = await context.newPage();
  try {
    await fn(page);
    results.push(['PASS', name]);
  } catch (err) {
    results.push(['FAIL', name, err.message.split('\n')[0]]);
  }
  await context.close();
};
const check = (cond, msg) => { if (!cond) throw new Error(msg); };
const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), STORE);
// Seed before any app code runs, once, so a booting app can't overwrite it.
const seed = (page, state) =>
  page.addInitScript(([k, v]) => {
    if (!localStorage.getItem('e2e-seeded')) {
      localStorage.setItem('e2e-seeded', '1');
      localStorage.setItem(k, v);
    }
  }, [STORE, JSON.stringify(state)]);
/** Let the sync loop see the new generation: 'online' forces a tick past the throttle. */
const syncTick = async (page) => {
  const done = page.waitForResponse((r) => r.url().endsWith('/api/program'), { timeout: 5000 });
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await done;
  await page.waitForTimeout(300);
};
const seedState = (local = {}) => ({
  program: envelope(1, [session('s-gen1-b', 'Session B')]),
  local, lastFetchedAt: null, lastSeenGeneration: 1,
});
const genTwo = (extra) => envelope(2, [session('s-gen2-b', 'Session B'), session('s-gen2-c', 'Session C')], extra);

await scenario('session open, no sets yet (PT block): stays on it, applies after leaving', async (page) => {
  publish(envelope(1, [session('s-gen1-b', 'Session B')]));
  await seed(page, seedState());
  await page.goto(`${BASE}/s-gen1-b`);
  await page.getByText('Barbell RDL').first().waitFor();
  publish(genTwo());
  await syncTick(page);
  check(await page.getByText('Workout Not Found').count() === 0, 'kicked to Workout Not Found');
  check(await page.getByText('Barbell RDL').count() > 0, 'session left the screen');
  check((await stored(page)).program.generation === 1, 'generation applied mid-session');
  await page.locator('button:has(svg)').first().click();
  await page.waitForURL(`${BASE}/`);
  await page.waitForFunction((k) => JSON.parse(localStorage.getItem(k)).program.generation === 2, STORE, { timeout: 5000 });
});

await scenario('sets logged, revised generation lands: every set and the session stay until done', async (page) => {
  publish(envelope(1, [session('s-gen1-b', 'Session B')]));
  await seed(page, seedState({ 's-gen1-b': { record: record('s-gen1-b', 'Session B', [logged(1), logged(2)]), delivery: 'saved' } }));
  await page.goto(`${BASE}/s-gen1-b`);
  await page.getByText('Barbell RDL').first().waitFor();
  publish(genTwo());
  await syncTick(page);
  const s = await stored(page);
  check(s.local['s-gen1-b']?.record.exercises[0].sets.length === 2, 'logged sets lost');
  check(s.program.generation === 1, 'generation applied mid-session');
  check(page.url().endsWith('/s-gen1-b') && await page.getByText('Workout Not Found').count() === 0, 'left the session');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.reload();
  await page.getByText('Barbell RDL').first().waitFor();
  await page.waitForTimeout(800);
  check((await stored(page)).local['s-gen1-b']?.record.exercises[0].sets.length === 2, 'sets lost on reload');
  check((await stored(page)).program.generation === 1, 'generation applied on reload mid-session');
});

await scenario('leaving to home with sets logged keeps holding until the session is finished', async (page) => {
  publish(genTwo());
  await seed(page, seedState({ 's-gen1-b': { record: record('s-gen1-b', 'Session B', [logged(1)]), delivery: 'saved' } }));
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(800);
  check((await stored(page)).program.generation === 1, 'generation applied with a session in progress');
  check((await stored(page)).local['s-gen1-b'], 'in-progress record lost');
});

await scenario('same-day reopen: ingestion must not drop new sets on an unsealed session', async (page) => {
  const file = `${today}-session-b.json`;
  await seed(page, seedState({
    's-gen1-b': { record: record('s-gen1-b', 'Session B', [logged(1), logged(2), logged(3)]), delivery: 'saved', deliveredAs: file },
  }));
  publish(genTwo({ basedOn: [file], history: [record('s-gen1-b', 'Session B', [logged(1), logged(2)])] }));
  await page.goto(`${BASE}/s-gen1-b`);
  await page.getByText('Barbell RDL').first().waitFor();
  await page.waitForTimeout(800);
  check((await stored(page)).local['s-gen1-b']?.record.exercises[0].sets.length === 3, 'amended sets dropped by truth-transfer');
});

await scenario('after departure the record delivers and the new generation applies', async (page) => {
  publish(envelope(1, [session('s-gen1-b', 'Session B')]));
  await seed(page, seedState({ 's-gen1-b': { record: record('s-gen1-b', 'Session B', [logged(1)]), delivery: 'saved' } }));
  await page.goto(`${BASE}/s-gen1-b`);
  await page.getByText('Barbell RDL').first().waitFor();
  publish(genTwo());
  await syncTick(page);
  let posts = 0;
  page.on('request', (r) => { if (r.url().endsWith('/api/session')) posts++; });
  const thumb = page.locator('[data-swipe-thumb]').first();
  await thumb.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const box = await thumb.boundingBox().catch(() => null);
  check(box, 'swipe thumb not found');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(380, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForFunction((k) => JSON.parse(localStorage.getItem(k)).local['s-gen1-b']?.record.sealed, STORE, { timeout: 5000 }).catch(() => { throw new Error('swipe did not seal'); });
  await page.waitForFunction((k) => JSON.parse(localStorage.getItem(k)).program.generation === 2, STORE, { timeout: 8000 });
  const s = await stored(page);
  await page.waitForTimeout(1500);
  check(posts === 1, `delivered ${posts} times`);
  check(s.local['s-gen1-b']?.record.sealed === 'departure', 'record not sealed');
  check(s.local['s-gen1-b']?.record.exercises[0].sets.length === 1, 'sets lost at departure');
});

await scenario('fresh device still hydrates from the seam (D13)', async (page) => {
  publish(genTwo());
  await page.goto(`${BASE}/s-gen2-b`);
  await page.getByText('Barbell RDL').first().waitFor();
  check((await stored(page)).program.generation === 2, 'fresh device did not hydrate');
});

await browser.close();
stop();
for (const r of results) console.log(r.join(' | '));
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
