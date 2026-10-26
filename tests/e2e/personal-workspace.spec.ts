import { test,expect } from '@playwright/test';
test('personal workspace in browser refuses persistence and offers isolated demo',async({page})=>{
 await page.goto('/workspace');
 await expect(page.getByRole('heading',{name:'为下一次机会做好准备'})).toBeVisible();
 await expect(page.getByText('个人数据只在桌面版保存。',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'新增职业资产',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'查看交互演示',exact:true}).first().click();
 await expect(page.getByRole('heading',{name:'岗位能力要求'})).toBeVisible();
 await page.getByRole('button',{name:'返回个人工作区'}).click();
 await expect(page.getByRole('heading',{name:'为下一次机会做好准备'})).toBeVisible();
});
test('personal workspace stays usable on a narrow screen',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/workspace');
 await expect(page.getByRole('navigation',{name:'个人工作区导航'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/personal-mobile.png',fullPage:true});
});
