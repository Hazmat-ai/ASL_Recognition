import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('learner navigation, search, camera opt-in and local partner round',async({page})=>{
 await page.goto('/');await expect(page.getByText(/Progress (connected|saved)/)).toBeVisible();
 await page.getByRole('button',{name:'Explore',exact:true}).click();await page.getByRole('textbox',{name:'Search signs'}).fill('Hello');
 await expect(page.getByRole('button',{name:/Hello/})).toHaveCount(1);await page.getByRole('button',{name:/Hello/}).click();
 await expect(page.getByRole('button',{name:'Turn on camera for practice'})).toBeVisible();
 await page.getByRole('button',{name:'Partner',exact:true}).click();await page.getByRole('button',{name:'Hello',exact:true}).click();await page.getByRole('button',{name:'Hello',exact:true}).click();await page.getByRole('button',{name:'Reveal the answer'}).click();await expect(page.getByText('You got it — switch roles and try another.')).toBeVisible();
 await page.getByRole('button',{name:'Progress',exact:true}).click();await expect(page.getByRole('heading',{name:'Progress, one sign at a time.'})).toBeVisible();
});
test('main learner screens have no serious automated accessibility violations',async({page})=>{
 await page.goto('/');for(const name of ['Learn','Explore','Practice','Progress','Partner']){await page.getByRole('button',{name,exact:true}).click();const results=await new AxeBuilder({page}).analyze();expect(results.violations.filter(v=>['critical','serious'].includes(v.impact??''))).toEqual([]);}
});
test('settings keyboard dismissal restores focus',async({page})=>{await page.goto('/');const settings=page.getByRole('button',{name:'Open settings'});await settings.click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(settings).toBeFocused();});
