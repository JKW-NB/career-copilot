import { test, expect } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('/');
});

test('opens a docked panel without navigation and keeps conversation when collapsed', async ({ page }) => {
  const entry = page.getByRole('switch', { name: 'AI 助手' });
  const panel = page.getByRole('complementary', { name: 'AI 助手面板' });
  await expect(panel).toBeHidden();
  await expect(entry).not.toBeChecked();
  await expect(page.getByRole('navigation').getByText('AI 助手')).toHaveCount(0);
  expect(await entry.evaluate(element => element.closest('.sidebar-bottom') !== null)).toBe(true);
  const before = await page.locator('.workspace').boundingBox();
  await entry.click();
  await expect(entry).toBeChecked();
  await expect(page.getByRole('heading', { name: '岗位能力要求' })).toBeVisible();
  const workspace = await page.locator('.workspace').boundingBox();
  const bounds = await panel.boundingBox();
  expect(workspace!.width).toBeLessThan(before!.width);
  expect(workspace!.x + workspace!.width).toBeLessThanOrEqual(bounds!.x + 1);
  await panel.getByLabel('发送给 AI 助手的内容').fill('这个岗位需要什么能力？');
  await panel.getByRole('button', { name: '发送', exact: true }).click();
  await expect(panel.locator('.proposal')).toHaveCount(0);
  await panel.getByRole('button', { name: '收起 AI 助手' }).click();
  await expect(panel).toBeHidden();
  await expect(entry).not.toBeChecked();
  await entry.click();
  await expect(panel.getByRole('log')).toContainText('这个岗位需要什么能力？');
  await entry.click();
  await expect(entry).not.toBeChecked();
  await expect(panel).toBeHidden();
  await entry.click();
  await expect(panel.getByRole('log')).toContainText('这个岗位需要什么能力？');
  await page.getByTestId('requirement-ai').getByRole('combobox').selectOption('辅助');
  await expect(page.getByTestId('requirement-ai').getByRole('combobox')).toHaveValue('辅助');
  await page.screenshot({ path: path.join(os.tmpdir(), 'career-copilot-side-panel-desktop.png') });
});

test('requires an explicit target then applies and undoes only its bullet', async ({ page }) => {
  await page.getByRole('tab', { name: /贡献组合/ }).click();
  await page.getByRole('button', { name: '确认组合，进入简历' }).click();
  const first = page.getByTestId('content-agent').locator('.content-text');
  const second = page.getByTestId('content-research').locator('.content-text');
  const original = await first.innerText(); const untouched = await second.innerText();
  await page.getByRole('switch', { name: 'AI 助手' }).click();
  const panel = page.getByRole('complementary', { name: 'AI 助手面板' });
  await panel.getByRole('button', { name: '重写内容', exact: true }).click();
  await panel.getByRole('button', { name: '发送', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('请选择');
  await panel.getByLabel('AI 修改目标').selectOption('bullet:content-agent');
  await panel.getByRole('button', { name: '发送', exact: true }).click();
  await expect(panel.locator('.proposal')).toContainText('星河科技 > 智能助手方案与效果评估 > 简历 Bullet');
  await expect(first).toHaveText(original);
  await panel.getByRole('button', { name: '应用修改' }).click();
  await expect(first).not.toHaveText(original);
  await expect(second).toHaveText(untouched);
  await expect(first).toContainText('10%');
  await panel.getByRole('button', { name: '撤销修改' }).click();
  await expect(first).toHaveText(original);
  await expect(panel.locator('.proposal')).toContainText('已撤销');
  await page.setViewportSize({ width: 1080, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('project description updates immediately and page switches never retarget old proposals', async ({ page }) => {
  await page.getByRole('navigation').getByRole('button', { name: /职业资产/ }).click();
  const asset = page.locator('[data-ai-target="description:agent"]');
  const description = asset.locator('.asset-card-top p');
  const original = await description.innerText();
  await asset.getByRole('button', { name: /查看.*详情/ }).click();
  await page.getByRole('switch', { name: 'AI 助手' }).click();
  const panel = page.getByRole('complementary', { name: 'AI 助手面板' });
  await expect(panel.getByLabel('AI 修改目标')).toHaveValue('description:agent');
  await panel.getByRole('button', { name: '重写内容', exact: true }).click();
  await panel.getByRole('button', { name: '发送', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: /求职工作区/ }).click();
  await expect(panel.getByLabel('当前上下文')).toContainText('岗位策略');
  await expect(panel.locator('.proposal')).toContainText('青禾实验室 > 智能助手方案与效果评估 > 项目描述');
  await panel.getByRole('button', { name: '应用修改' }).click();
  await page.getByRole('navigation').getByRole('button', { name: /职业资产/ }).click();
  await expect(description).not.toHaveText(original);
  await panel.getByRole('button', { name: '撤销修改' }).click();
  await expect(description).toHaveText(original);
});

test('narrow screens retain usable content and a visible collapse control', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('switch', { name: 'AI 助手' }).click();
  const panel = page.getByRole('complementary', { name: 'AI 助手面板' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const rect = await panel.boundingBox();
  expect(rect!.y).toBeGreaterThan(250);
  await expect(panel.getByRole('button', { name: '收起 AI 助手' })).toBeVisible();
  await expect(panel.getByLabel('发送给 AI 助手的内容')).toBeInViewport();
  await page.screenshot({ path: path.join(os.tmpdir(), 'career-copilot-side-panel-mobile.png') });
  await panel.getByRole('button', { name: '收起 AI 助手' }).click();
  await expect(panel).toBeHidden();
});
