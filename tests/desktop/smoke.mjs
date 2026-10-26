import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const executable = path.join(root, 'src-tauri/target/debug/career-copilot.exe');
const dev = process.argv.includes('--dev');
if (dev) assert.ok(process.env.npm_execpath, 'Run the development smoke via npm run test:desktop -- --dev.');
assert.equal(process.platform, 'win32', 'This smoke test currently targets Windows WebView2.');
assert.ok(existsSync(executable), 'Run npm run tauri build -- --debug --no-bundle first.');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const exec = promisify(execFile);
const temporaryServer = createServer();
temporaryServer.listen(0, '127.0.0.1');
await once(temporaryServer, 'listening');
const port = temporaryServer.address().port;
await new Promise(resolve => temporaryServer.close(resolve));
let persistentWorkspace;
const smokeRoot = await mkdtemp(path.join(os.tmpdir(), 'career-demo-smoke-'));

// Only this test child gets a local debugging port. It is never part of app config.
for (let cycle = 1; cycle <= 2; cycle++) {
  const child = spawn(dev ? process.execPath : executable, dev ? [process.env.npm_execpath, 'run', 'tauri', '--', 'dev', '--no-watch'] : [], {
    cwd: root, windowsHide: true,
    env: { ...process.env, CAREER_COPILOT_WORKSPACE: path.join(smokeRoot, 'com.careercopilot.desktop', 'workspace'), WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-address=127.0.0.1 --remote-debugging-port=' + port },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = [];
  child.stdout.on('data', data => output.push(data.toString()));
  child.stderr.on('data', data => output.push(data.toString()));
  let launchError;
  child.on('error', error => { launchError = error; });
  let browser;
  let windowPid = child.pid;
  try {
    const deadline = Date.now() + (dev ? 180000 : 45000);
    let endpoint;
    while (Date.now() < deadline) {
      if (launchError) throw launchError;
      if (child.exitCode !== null) throw new Error('Desktop exited before startup: ' + output.join(''));
      try {
        const response = await fetch('http://127.0.0.1:' + port + '/json/version', { signal: AbortSignal.timeout(1000) });
        endpoint = (await response.json()).webSocketDebuggerUrl;
        if (endpoint) break;
      } catch { /* WebView2 is still starting. */ }
      await delay(250);
    }
    assert.ok(endpoint, 'WebView2 debugging endpoint did not start.');
    browser = await chromium.connectOverCDP(endpoint);
    let page;
    await expect.poll(() => {
      page = browser.contexts().flatMap(context => context.pages()).find(candidate => candidate.url().includes(dev ? '127.0.0.1:1420' : 'tauri.localhost'));
      return Boolean(page);
    }, { timeout: 15000 }).toBe(true);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.getByRole('button', { name: '查看交互演示', exact: true }).click();
    await expect(page.getByRole('heading', { name: '岗位能力要求' })).toBeVisible();
    assert.ok(await page.evaluate(() => Boolean(window.__TAURI_INTERNALS__)), 'Page is not hosted by Tauri.');
    assert.equal(new URL(page.url()).hostname, dev ? '127.0.0.1' : 'tauri.localhost');
    if (dev) {
      const result = await exec('powershell.exe', ['-NoProfile', '-Command', 'Get-CimInstance Win32_Process -Filter "Name = \'career-copilot.exe\'" | Select-Object ProcessId,ExecutablePath | ConvertTo-Json -Compress'], { windowsHide: true });
      const parsed = JSON.parse(result.stdout);
      const owned = (Array.isArray(parsed) ? parsed : [parsed]).filter(item => item.ExecutablePath?.toLowerCase() === executable.toLowerCase());
      assert.equal(owned.length, 1, 'Expected exactly one app process from this checkout.');
      windowPid = owned[0].ProcessId;
    }
    for (const name of ['今日概览', '职业资产', '版本资料库', '求职工作区']) {
      const nav = page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: new RegExp(name) });
      await nav.click();
      await expect(nav).toHaveAttribute('aria-current', 'page');
    }
    await page.getByRole('button', { name: '设置与演示说明' }).click();
    await expect(page.getByRole('heading', { name: '设置与数据' })).toBeVisible();
    const storagePath = await page.getByTestId('storage-path').textContent();
    const workspace = await page.getByTestId('workspace-id').textContent();
    assert.ok(storagePath?.endsWith(path.join('com.careercopilot.desktop', 'workspace')), 'Unexpected isolated workspace path: ' + storagePath);
    assert.ok(existsSync(path.join(storagePath, 'app.db')), 'Desktop database was not created.');
    assert.match(workspace, /Schema V2 · Workspace [a-f0-9]{32}/);
    if (persistentWorkspace) assert.equal(workspace, persistentWorkspace, 'Workspace identity changed after restart.');
    persistentWorkspace = workspace;
    const toggle = page.getByRole('switch', { name: 'AI 助手' });
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await expect(page.getByRole('complementary', { name: 'AI 助手面板' })).toBeVisible();
    await page.getByRole('button', { name: '收起 AI 助手' }).click();
    await expect(toggle).not.toBeChecked();
    await page.getByRole('navigation').getByRole('button', { name: /求职工作区/ }).click();
    await page.getByRole('tab', { name: /贡献组合/ }).click();
    await page.getByRole('button', { name: '确认组合，进入简历' }).click();
    await expect(page.getByTestId('content-agent')).toContainText('10%');
    await page.screenshot({ path: path.join(os.tmpdir(), 'career-copilot-desktop-' + (dev ? 'dev-' : '') + cycle + '.png') });
    assert.deepEqual(errors, []);
    console.log('PASS: native desktop ' + (dev ? 'development' : 'bundled') + ' launch, navigation, AI toggle and resume flow; cycle ' + cycle);
  } finally {
    if (browser) await browser.close();
    if (child.exitCode === null && child.pid) {
      await exec('powershell.exe', ['-NoProfile', '-Command', '(Get-Process -Id ' + windowPid + ').CloseMainWindow()'], { windowsHide: true }).catch(() => {});
      const closeDeadline = Date.now() + 10000;
      while (child.exitCode === null && Date.now() < closeDeadline) await delay(100);
      if (child.exitCode === null) {
        await exec('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }).catch(() => {});
        throw new Error('Desktop failed to close gracefully. ' + output.join(''));
      }
    }
    await delay(300);
  }
}
