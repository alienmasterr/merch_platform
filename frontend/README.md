# Merch Platform: frontend

React 19 SPA (Vite, TypeScript strict, React Router, TanStack Query). Покроковий звіт: [STEPS.md](STEPS.md).

## Запуск

```bash
# з кореня репозиторію, бекенд має працювати на :3000
npm run dev:backend
npm run dev:frontend   # http://localhost:5173, запити /api/* проксюються на бекенд
```

## Скрипти (`npm run <script> -w frontend`)

| Скрипт | Що робить |
| --- | --- |
| `dev` | Vite dev server на 5173 |
| `build` | typecheck + production-збірка |
| `typecheck` / `lint` | TypeScript / oxlint |
| `test` / `test:watch` | Vitest (jsdom + Testing Library + MSW) |
| `test:e2e` | Playwright, сам піднімає бекенд (3100, in-memory) і фронтенд (5180) |
| `gen:api` | типи `src/api/schema.d.ts` з `packages/contracts/openapi.yaml` |

## Структура

```
src/
  api/          єдиний шар запитів (openapi-fetch + ApiError), роль, dev-оплата
  app/          маршрути, Layout, провайдери, перемикач ролі, індикатор API
  features/
    catalog/    вітрина, фільтри (URL), сторінка товару
    customizer/ завантаження, позиціонування (clampToArea, calculatePosition), useCustomizer
    cart/       кошик (localStorage)
    checkout/   отримувач, доставка, створення замовлення
    orders/     сторінка замовлення (таймлайн, polling), результат оплати
    manager/    перевірка макетів, зміна статусів
    admin/      керування каталогом
  shared/       форматування, підписи, силуети виробів, спільні стани
  test/         MSW-сервер, фікстури, renderApp
e2e/            Playwright
```

Правила: компоненти не викликають `fetch` напряму (лише `src/api/*`), без `any`, кожен запит має стани loading/error.
