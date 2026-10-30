import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const LOGO = fileURLToPath(new URL('./fixtures/logo.svg', import.meta.url));

async function setRole(page: Page, role: 'customer' | 'manager' | 'admin') {
  await page.getByLabel('Роль').selectOption(role);
}

/**
 * Головний сценарій (Phase 4): каталог → кастомізація → кошик → оформлення → оплата →
 * перевірка макета менеджером → друк → відправка з ТТН. Сторонні сервіси працюють як dev-заглушки бекенду.
 */
test('customer orders custom merch and the manager ships it', async ({ page }) => {
  // 1. Каталог → товар
  await page.goto('/catalog');
  await page.getByRole('button', { name: 'Білий' }).click();
  await expect(page).toHaveURL(/color=white/);
  await page.getByRole('link', { name: /Футболка базова/ }).click();
  await expect(page.getByRole('heading', { name: 'Футболка базова' })).toBeVisible();
  await page.getByRole('link', { name: 'Створити дизайн' }).click();

  // 2. Конструктор: принт на груди, зсув стрілками, збереження
  await expect(page.getByRole('tab', { name: 'Груди' })).toHaveAttribute('aria-selected', 'true');
  await page.getByLabel('Файл принта для зони «Груди»').setInputFiles(LOGO);
  const print = page.getByTestId('print-CHEST');
  await expect(print).toBeVisible();
  await print.focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByText('Зміщення по Y: -5 мм')).toBeVisible();
  await page.getByRole('button', { name: 'Зберегти дизайн' }).click();
  await expect(page.getByText('Дизайн збережено.')).toBeVisible();
  const productTotal = (await page.getByTestId('saved-total').textContent()) ?? '';

  // 3. Кошик
  await page.getByRole('button', { name: 'Додати в кошик' }).click();
  await page.getByRole('link', { name: 'Перейти в кошик' }).click();
  await expect(page.getByTestId('cart-total')).toHaveText(productTotal);
  await page.getByRole('button', { name: 'Оформити замовлення' }).click();

  // 4. Оформлення
  await page.getByLabel('Прізвище та імʼя').fill('Шевченко Тарас');
  await page.getByLabel('Телефон').fill('050 123 45 67');
  await page.getByLabel('Email').fill('taras@example.com');
  await page.getByLabel('Місто').fill('Київ');
  await page.getByLabel('Відділення Нової Пошти №').fill('12');
  await expect(page.getByTestId('shipping-cost')).toContainText('70');
  await page.getByRole('button', { name: 'Підтвердити замовлення' }).click();
  await expect(page).toHaveURL(/\/orders\//);
  const orderId = page.url().split('/').pop() ?? '';
  await expect(page.locator('[aria-current=step]')).toHaveText('Створено');

  // 5. Оплата: заглушка LiqPay сама підтверджує платіж через 1–5 с
  await page.getByRole('button', { name: 'Оплатити через LiqPay' }).click();
  await expect(page).toHaveURL(new RegExp(`/payment-result\\?orderId=${orderId}`));
  await expect(page.getByText(/Оплату .* отримано/)).toBeVisible({ timeout: 15_000 });

  // 6. Менеджер: перевірка макета → друк → відправка
  await page.goto('/manager');
  await setRole(page, 'manager');
  const card = page.getByRole('article', { name: `Замовлення ${orderId}` });
  await card.getByRole('button', { name: 'Схвалити макет' }).click();
  await expect(page.getByRole('status').filter({ hasText: orderId })).toContainText('У друці');

  await page.getByRole('tab', { name: 'У друці' }).click();
  await page
    .getByRole('article', { name: `Замовлення ${orderId}` })
    .getByRole('button', { name: 'Передати в Нову Пошту' })
    .click();
  await expect(page.getByRole('status').filter({ hasText: orderId })).toContainText('ТТН DEV-');

  // 7. Покупець бачить фінальний статус і ТТН
  await setRole(page, 'customer');
  await page.goto(`/orders/${orderId}`);
  await expect(page.locator('.timeline__step--done')).toHaveCount(5);
  await expect(page.getByTestId('ttn')).toContainText('DEV-');
});

test('manager rejects a mockup and the order is cancelled', async ({ page, request }) => {
  // швидке замовлення через API, щоб перевірити саме гілку відхилення
  const upload = await request.post('http://localhost:3100/customizer/uploads', {
    multipart: {
      file: {
        name: 'logo.svg',
        mimeType: 'image/svg+xml',
        buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      },
    },
  });
  const { printFileUrl } = (await upload.json()) as { printFileUrl: string };
  const product = await request.post('http://localhost:3100/customizer/products', {
    data: {
      baseItemId: 'mug-white',
      prints: [
        {
          printFileUrl,
          placement: 'ACCESSORY_FRONT',
          technology: 'SUBLIMATION',
          widthMm: 80,
          heightMm: 80,
        },
      ],
    },
  });
  const { id: customProductId } = (await product.json()) as { id: string };
  const order = await request.post('http://localhost:3100/orders', {
    data: {
      items: [{ customProductId, quantity: 1 }],
      recipient: {
        fullName: 'Косач Леся',
        phone: '0671112233',
        email: 'l@example.com',
        city: 'Луцьк',
        warehouse: '3',
      },
    },
  });
  const { id: orderId } = (await order.json()) as { id: string };
  // рахунок на оплату: заглушка LiqPay підтвердить його сама через 1–5 с
  const invoice = await request.post(`http://localhost:3100/orders/${orderId}/checkout`);
  const { checkoutUrl } = (await invoice.json()) as { checkoutUrl: string };

  await page.goto(checkoutUrl);
  await expect(page.getByText(/Оплату .* отримано/)).toBeVisible({ timeout: 15_000 });

  await page.goto('/manager');
  await setRole(page, 'manager');
  const card = page.getByRole('article', { name: `Замовлення ${orderId}` });
  await card.getByRole('button', { name: 'Відхилити' }).click();
  await card.getByRole('button', { name: 'Так, відхилити' }).click();
  await expect(page.getByRole('status').filter({ hasText: orderId })).toContainText('Скасовано');

  await setRole(page, 'customer');
  await page.goto(`/orders/${orderId}`);
  await expect(page.getByText('Замовлення скасовано', { exact: true })).toBeVisible();
});
