import { test, expect, type Page } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

async function openPortfolio(page: Page) {
  await page.getByRole('tab', { name: /贡献组合/ }).click();
}
async function openResume(page: Page) {
  await openPortfolio(page);
  await page.getByRole('button', { name: '确认组合，进入简历' }).click();
  await expect(page.getByTestId('content-agent')).toBeVisible();
}
test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('strategy provides evidence context, working navigation and accessible modal', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await expect(page.getByRole('heading', { name: '岗位能力要求' })).toBeVisible();
  await page.getByRole('button', { name: '查看AI 行业与竞品视野依据' }).click();
  await expect(page.getByRole('complementary', { name: '依据与上下文' })).toContainText('可以保留的真实缺口');
  await page.getByRole('button', { name: '查看岗位原文' }).click();
  await expect(page.getByRole('dialog')).toContainText('不对应真实招聘信息');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: '查看AI 产品与系统理解依据' }).click();
  await page.screenshot({ path: path.join(os.tmpdir(), 'career-copilot-strategy-desktop.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('portfolio shows coverage loss and blocks uncertain planned facts', async ({ page }) => {
  await openPortfolio(page);
  await page.getByRole('button', { name: '移除用户研究与需求优先级' }).click();
  await expect(page.getByLabel('组合覆盖').getByRole('button', { name: /用户洞察/ })).toContainText('待补充');
  await page.getByRole('button', { name: '添加用户研究与需求优先级' }).click();
  const card = page.getByTestId('portfolio-agent');
  await card.getByText('计划使用的事实', { exact: false }).click();
  await card.getByRole('checkbox', { name: '独立主导整个智能助手项目' }).check();
  await page.getByRole('button', { name: '确认组合，进入简历' }).click();
  await expect(page.getByRole('alert').last()).toContainText('未确认');
  await expect(page.getByRole('tab', { name: /贡献组合/ })).toHaveAttribute('aria-selected', 'true');
  await card.getByRole('checkbox', { name: '独立主导整个智能助手项目' }).uncheck();
  await page.screenshot({ path: path.join(os.tmpdir(), 'career-copilot-portfolio-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: '确认组合，进入简历' }).click();
  await expect(page.getByTestId('content-agent')).toContainText('10%');
});

test('edited metrics enter review and old content survives', async ({ page }) => {
  await openResume(page);
  const card = page.getByTestId('content-agent');
  await card.getByRole('button', { name: '编辑', exact: true }).click();
  const editor = page.getByLabel('简历文字');
  await editor.fill((await editor.inputValue()).replace('10%', '15%'));
  await page.getByRole('button', { name: '保存并检查' }).click();
  await expect(page.getByRole('dialog', { name: '这次编辑，需要事实审查' })).toContainText('15%');
  await page.getByRole('button', { name: '恢复原文' }).click();
  await expect(card).toContainText('10%');
  await expect(card).not.toContainText('15%');
  await page.getByRole('button', { name: '纯净预览' }).click();
  await expect(page.getByRole('dialog')).not.toContainText('证明责任');
  await page.getByRole('button', { name: '复制全部内容' }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(/已复制|剪贴板不可用/);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: path.join(os.tmpdir(), 'career-copilot-resume-desktop.png'), fullPage: true });
});

test('upstream replacement updates only affected content and keeps pinned facts', async ({ page }) => {
  await openResume(page);
  const agent = page.getByTestId('content-agent');
  await agent.getByRole('button', { name: '紧凑表达' }).click();
  await agent.getByText('使用的事实与固定项', { exact: false }).click();
  await agent.getByRole('button', { name: '固定测试集回答准确率相对提升约 10%', exact: true }).click();
  const text = await agent.locator('.content-text').innerText();
  await openPortfolio(page);
  await page.getByTestId('portfolio-research').getByRole('button', { name: '替换', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /AI 应用竞品观察/ }).click();
  await page.getByRole('button', { name: '确认组合，进入简历' }).click();
  await expect(page.getByText('2 项贡献的内容需要更新')).toBeVisible();
  await page.getByRole('button', { name: '更新受影响内容', exact: true }).click();
  await expect(page.getByTestId('content-research')).toHaveCount(0);
  await expect(page.getByTestId('content-insight')).toBeVisible();
  await expect(agent.locator('.content-text')).toHaveText(text);
  await expect(agent.getByText('3 条事实 · 1 项固定')).toBeVisible();
});

test('ready content creates sample records with permanent usage lock, then reset clears them', async ({ page }) => {
  await openResume(page);
  await page.getByRole('button', { name: '确认内容，保存版本' }).click();
  await page.getByRole('button', { name: '保存最终文件样例' }).click();
  await page.getByRole('button', { name: '模拟投递', exact: true }).click();
  await page.getByRole('button', { name: '归档', exact: true }).click();
  await page.getByRole('button', { name: '尝试替换', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('永久冻结');
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: /版本资料库/ }).click();
  await expect(page.getByRole('heading', { name: '星河科技 · 内容 V1' })).toBeVisible();
  await page.getByRole('button', { name: '重置演示', exact: true }).click();
  await page.getByRole('button', { name: '恢复初始演示', exact: true }).click();
  await expect(page.getByRole('tab', { name: /岗位策略/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: /最终版本/ }).click();
  await expect(page.getByRole('heading', { name: '尚无已确认内容' })).toBeVisible();
});

test('mobile supports navigation/search without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(os.tmpdir(), 'career-copilot-strategy-mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: /职业资产/ }).click();
  await page.getByRole('textbox', { name: '搜索职业资产' }).fill('竞品');
  await expect(page.locator('.asset-card')).toHaveCount(1);
  await page.getByRole('textbox', { name: '搜索职业资产' }).fill('没有这个项目');
  await expect(page.getByText('没有找到相关资产，换一个关键词试试。')).toBeVisible();
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: /求职工作区/ }).click();
  await openResume(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: path.join(os.tmpdir(), 'career-copilot-resume-mobile.png'), fullPage: true });
});
