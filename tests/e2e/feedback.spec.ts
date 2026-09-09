import { test, expect } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('/');
});

test('capability priority, inclusion and addition are editable', async ({ page }) => {
  const industry = page.getByTestId('requirement-industry');
  await industry.getByRole('combobox').selectOption('核心');
  await expect(industry.getByRole('combobox')).toHaveValue('核心');
  await industry.getByRole('checkbox').uncheck();
  await expect(industry).toContainText('本次不纳入');
  await industry.getByRole('button', { name: /查看.*依据/ }).click();
  await expect(page.getByRole('complementary', { name: '依据与上下文' })).toContainText('本次不纳入');
  await expect(page.getByText('已覆盖 3 / 3 项纳入要求', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '添加能力', exact: true }).click();
  await page.getByLabel('能力名称').fill('跨团队沟通');
  await page.getByLabel('能力说明').fill('说明如何推进跨团队决策');
  await page.getByRole('button', { name: '保存能力' }).click();
  await expect(page.locator('.requirement-card').last()).toContainText('待补充');
  await expect(page.locator('.requirement-card').last()).toContainText('用户补充');
});

test('gap immediately opens actionable details and candidate changes coverage', async ({ page }) => {
  await page.getByTestId('requirement-industry').getByRole('button', { name: /待补充/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('当前组合没有可直接证明');
  await dialog.getByRole('button', { name: '加入当前组合' }).click();
  await expect(dialog).toContainText('当前有 1 条可信事实支撑');
  await expect(dialog).toHaveAccessibleName(/部分覆盖/);
  await dialog.getByRole('button', { name: '保留缺口并继续' }).click();
  await expect(page.getByTestId('requirement-industry')).toContainText('部分覆盖');
});

test('new assets can be created and found without becoming trusted resume facts', async ({ page }) => {
  await page.getByRole('navigation').getByRole('button', { name: /职业资产/ }).click();
  await page.getByRole('button', { name: /新增资产/ }).click();
  await page.getByLabel('资产名称', { exact: true }).fill('校园研究项目');
  await page.getByLabel('机构或项目').fill('学校');
  await page.getByLabel('经历描述').fill('整理访谈记录并提出建议');
  await page.getByRole('button', { name: '保存资产草稿' }).click();
  await page.getByRole('textbox', { name: '搜索职业资产', exact: true }).fill('校园研究');
  await expect(page.locator('.asset-card')).toHaveCount(1);
  await expect(page.locator('.asset-card')).toContainText('待审查草稿');
  await page.locator('.asset-card').getByRole('button', { name: /加入上下文/ }).click();
  await expect(page.getByLabel('已选 AI 上下文')).toContainText('校园研究项目');
});

test('assistant suggests asset creation, editing and dismissal without navigating', async ({ page }) => {
  await page.getByRole('navigation').getByRole('button', { name: /职业资产/ }).click();
  await page.getByRole('switch', { name: 'AI 助手' }).click();
  const panel = page.getByRole('complementary', { name: 'AI 助手面板' });
  await expect(page.getByRole('heading', { name: '职业资产', exact: true })).toBeVisible();
  await panel.getByText('附加上下文（0）').click();
  await panel.locator('.context-picker input').first().check();
  await panel.getByRole('button', { name: '新增资产', exact: true }).click();
  await panel.getByLabel('新增资产名称').fill('助手创建的草稿');
  await panel.getByLabel('发送给 AI 助手的内容').fill('整理调研资料');
  await panel.getByRole('button', { name: '发送', exact: true }).click();
  await expect(panel.locator('.chat-turn').last()).toContainText('本轮上下文（1）');
  await expect(page.locator('.asset-card').getByRole('heading', { name: '助手创建的草稿' })).toHaveCount(0);
  await panel.getByRole('button', { name: '应用修改' }).click();
  await expect(page.locator('.asset-card').getByRole('heading', { name: '助手创建的草稿' })).toBeVisible();
  await panel.getByLabel('AI 修改目标').selectOption({ label: '职业资产 > 助手创建的草稿 > 经历描述' });
  await panel.getByLabel('发送给 AI 助手的内容').fill('改为：整理调研资料与访谈记录');
  await panel.getByRole('button', { name: '发送', exact: true }).click();
  await panel.getByRole('button', { name: '应用修改' }).click();
  await expect(page.locator('.asset-card').getByText('整理调研资料与访谈记录', { exact: true })).toBeVisible();
  await panel.getByLabel('发送给 AI 助手的内容').fill('删除这项资产');
  await panel.getByRole('button', { name: '发送', exact: true }).click();
  await panel.getByRole('button', { name: '暂不应用', exact: true }).click();
  await expect(page.locator('.asset-card').getByText('整理调研资料与访谈记录', { exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(os.tmpdir(), 'career-copilot-assistant.png'), fullPage: true });
});

test('highlighted page text can be attached to a question', async ({ page }) => {
  const description = page.getByTestId('requirement-ai').locator('p').first();
  await description.evaluate(element => { const range = document.createRange(); range.selectNodeContents(element); const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range); });
  await description.dispatchEvent('mouseup');
  await page.getByRole('button', { name: '加入 AI 上下文', exact: true }).click();
  await expect(page.getByLabel('已选 AI 上下文')).toContainText('具体参与过方案设计');
  await page.getByLabel('发送给 AI 助手的内容').fill('这项能力如何补充？');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.locator('.chat-turn')).toContainText('示例分析');
});

test('readable type and single overview slogan work on mobile too', async ({ page }) => {
  expect(await page.getByTestId('requirement-ai').locator('p').first().evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(15);
  const sidebarLabel = page.getByRole('navigation').getByRole('button', { name: /求职工作区/ }).locator('> span');
  expect(await sidebarLabel.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBe(14);
  expect(await sidebarLabel.locator('small').evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBe(12);
  await expect(page.getByText('让真实经历，成为你的下一步。')).toHaveCount(0);
  await page.getByRole('navigation').getByRole('button', { name: /今日概览/ }).click();
  await expect(page.getByText('让真实经历，成为你的下一步。')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await sidebarLabel.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBe(12);
  await page.getByRole('switch', { name: 'AI 助手' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '收起 AI 助手' }).click();
  await page.getByRole('navigation').getByRole('button', { name: /求职工作区/ }).click();
  await page.getByTestId('requirement-industry').getByRole('button', { name: /待补充/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test('settings explains browser storage without pretending it is persistent', async ({ page }) => {
  await page.getByRole('button', { name: '设置与演示说明' }).click();

  await expect(page.getByRole('heading', { name: '设置与数据' })).toBeVisible();
  await expect(page.locator('.breadcrumbs strong')).toHaveText('设置与数据');
  await expect(page.getByTestId('storage-path')).toHaveText('浏览器演示不创建本地数据目录');
  await expect(page.getByText('现有演示资产仍保留在页面内存中')).toBeVisible();
});
