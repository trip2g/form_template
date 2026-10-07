import { expect, test } from '@playwright/test';
import { fieldError, marker, submitButton, submitsWith } from './stand';

test('a Russian note gets Russian buttons and messages', async ({ page }) => {
  await page.goto('/ru');
  const button = submitButton(page, 'Отправить');
  await expect(button).toBeVisible();

  await button.click();
  await expect(fieldError(page, 'Как настроение?')).toHaveText('Ответьте на этот вопрос.');
  await expect(page.locator('.survey__status')).toHaveText('Проверьте отмеченный вопрос.');

  await page.getByRole('group', { name: 'Как настроение?' }).getByText('5', { exact: true }).click();
  await page.getByLabel('Почта').fill('не почта');
  await button.click();
  await expect(fieldError(page, 'Почта')).toHaveText('Введите адрес почты, например name@example.com.');

  const mail = `${marker('ru')}@example.com`;
  await page.getByLabel('Почта').fill(mail);
  await page.getByLabel('О себе').fill('абв');
  await button.click();
  await expect(fieldError(page, 'О себе')).toHaveText('Слишком коротко: не меньше 5 символов.');

  await page.getByLabel('О себе').fill('Разработчик');
  await button.click();
  await expect(page.getByRole('heading', { name: 'Спасибо!' })).toBeVisible();
  await expect(page.getByText('Ответ записан.')).toBeVisible();
  const [stored] = await submitsWith(mail);
  expect(stored.values).toEqual({ mood: 5, mail, about: 'Разработчик' });
});

test('a Russian guest is told an admin-only form is closed to them in Russian', async ({ page }) => {
  await page.route('**/_system/graphql', (route) =>
    route.fulfill({ json: { data: { submitForm: { __typename: 'FormSubmitDeniedPayload', reason: 'admin_required' } } } }),
  );
  await page.goto('/ru');
  await page.getByRole('group', { name: 'Как настроение?' }).getByText('1', { exact: true }).click();
  await submitButton(page, 'Отправить').click();
  await expect(page.locator('.survey__status')).toHaveText(
    'Эту форму может отправить только администратор сайта. Войдите кнопкой вверху страницы.',
  );
});
