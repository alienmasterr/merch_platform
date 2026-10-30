# Merch Platform

Веб-платформа для створення та замовлення кастомного мерчу: користувач обирає базовий виріб, завантажує власний принт, позиціонує його в конструкторі, оформлює замовлення й оплачує його онлайн.

Навчальний проєкт (Практична робота №1, об'єктно-орієнтований аналіз і дизайн). Мета: реалізувати в коді архітектуру з C4-діаграм із застосуванням принципів ООП, SOLID, патернів проєктування та unit-тестів.

**Команда:** Харченко Аліна, Черненко Андрій, Семенюк Максим.

## Архітектура

Модульний моноліт на Node.js + SPA на React. Модулі спілкуються лише через інтерфейси з пакета `contracts`.

| C4      | Що показує                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------- |
| Level 1 | Система, користувачі (Customer, Manager, Administrator), зовнішні сервіси (LiqPay, Нова Пошта, email) |
| Level 2 | SPA (React), Backend API (Node.js), PostgreSQL, об'єктне сховище                                      |
| Level 3 | Компоненти бекенду: Catalog, Customizer, Order, Payment, Notification                                 |
| Level 4 | UML-діаграма класів                                                                                   |

Діаграми лежать у `docs/diagrams/`.

### Структура репозиторію

```
packages/contracts/     спільні інтерфейси, enum'и, помилки, shared-kernel (MerchApparelItem та нащадки)
backend/src/
  modules/
    catalog/            каталог товарів, фільтрація
    customizer/         конфігурації принтів, Builder, сховище файлів, прев'ю
    delivery/           Нова Пошта (вартість, ТТН), Observer
    order/ payment/ notification/
  infra/                конфіг, БД і міграції, HTTP-утиліти, composition root (container.ts)
  app.ts                збирає всі модулі; main.ts: точка входу
frontend/
  src/api/              єдиний шар запитів до бекенду (типи з OpenAPI)
  src/features/         catalog, customizer, cart, checkout, orders, manager, admin
  src/app/ src/shared/  маршрути, шапка, провайдери; спільні компоненти
  e2e/                  Playwright-сценарії
docs/diagrams/          C4 та UML
```

Кожен модуль поділений на шари `domain` / `application` / `infrastructure`, тести лежать поруч у `__tests__/`.

### Патерни та принципи

| Патерн               | Де                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| Builder              | `CustomMerchBuilder`                                                                                 |
| Strategy             | `IPaymentStrategy` / `LiqPayPaymentStrategy`                                                         |
| Observer             | `Order` → `IOrderObserver` (`EmailNotificationObserver`, `NovaPoshtaDeliveryObserver`)               |
| Factory              | `createApparelItem`                                                                                  |
| Repository           | `ICatalogRepository`, `ICustomMerchRepository`, `IOrderRepository` (Postgres і in-memory реалізації) |
| Dependency Injection | конструкторна ін'єкція, конкретні класи створюються лише в `infra/config/container.ts`               |
| Поліморфізм          | `MerchApparelItem` → `TopWearItem`, `BottomWearItem`, `AccessoryItem`                                |

SOLID: кожен сервіс має одну відповідальність; нові типи одягу, сховища та способи оплати додаються новими класами; залежності спрямовані на абстракції (`contracts`).

## Швидкий старт

Потрібно: Node.js 22 (`.nvmrc`), npm, Docker.

```bash
git clone <url> && cd merch-platform
npm install
cp .env.example .env
docker compose up -d postgres mailpit   # БД і локальна пошта (листи: http://localhost:8025)
npm run migrate -w backend        # застосувати міграції
npm run seed -w backend           # стартові дані каталогу
npm run dev:backend               # http://localhost:3000/health
npm run dev:frontend              # http://localhost:5173 (в окремому терміналі)
```

Бекенд і фронтенд запускаються локально (Node), у Docker лише Postgres (і MinIO за потреби).

> Порт БД у `docker-compose.yml` і в `DATABASE_URL` (`.env`) мають збігатися. Якщо 5432 зайнятий локальним Postgres, змініть обидва.

### Режими роботи бекенду

Налаштовуються через `.env` (див. `.env.example`):

| Змінна                | Значення                                     | Опис                                                             |
| --------------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| `PERSISTENCE`         | `memory` (за замовчуванням) / `postgres`     | `memory` не потребує БД, дані скидаються при перезапуску         |
| `STORAGE_DRIVER`      | `local` (за замовчуванням) / `s3` / `memory` | `local` зберігає файли в `.data/uploads` і віддає їх на `/files` |
| `NOVA_POSHTA_API_KEY` | ключ або порожньо                            | без ключа працює заглушка (доставка 70 грн, ТТН `DEV-…`)         |
| `LIQPAY_PUBLIC_KEY`, `LIQPAY_PRIVATE_KEY` | ключі або порожньо           | без ключів dev-заглушка оплати: "оплата" одразу веде на `PAYMENT_RESULT_URL`, повернення коштів лише логуються |
| `APP_PUBLIC_URL` | `http://localhost:5173` (за замовчуванням) | адреса SPA для кнопки «Переглянути замовлення» в листах |
| `STUB_PAYMENT_AUTO_CONFIRM` | `true` (за замовчуванням) / `false` | заглушка сама підтверджує оплату через 1–5 с: шле підписаний callback на `/payments/webhook`, як LiqPay |
| `LIQPAY_SANDBOX`      | `true` (за замовчуванням) / `false`          | тестові платежі LiqPay; у `false` статус `sandbox` не вважається оплатою |
| `SMTP_HOST` (+ `SMTP_*`, `MAIL_FROM`) | хост або порожньо            | без SMTP листи клієнтам друкуються в консоль. Локально: `SMTP_HOST=localhost`, `SMTP_PORT=1025` (контейнер `mailpit`), усі листи у веб-інтерфейсі http://localhost:8025 |

## Тестування

```bash
npm run typecheck                         # TypeScript (бекенд, contracts, фронтенд)
npm run lint                              # ESLint (бекенд) + oxlint (фронтенд)
npm test                                  # усі unit-тести
npm run test:e2e -w frontend              # e2e (Playwright), див. розділ «Фронтенд»
npm run test:coverage -w backend          # покриття
TEST_DATABASE_URL=postgres://merch:merch@localhost:5432/merch npm test -w backend   # + тести на справжній БД
```

Без `TEST_DATABASE_URL` тести на БД пропускаються. Вимоги до тестів: покриття доменної логіки від 80%, у кожного публічного методу є щонайменше happy path і один негативний сценарій, зовнішні залежності (БД, S3, HTTP) підміняються fake-реалізаціями. CI запускає лінтер, typecheck і тести на кожен PR.

## Фронтенд

React 19 SPA: Vite, TypeScript (strict), React Router, TanStack Query, openapi-fetch. Інтерфейс українською, адаптивний (телефон/десктоп), світла й темна тема.

### Сторінки

| Шлях                        | Що там                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `/catalog`                  | вітрина: варіанти товару згруповані, фільтри (категорія, розмір, колір, ціна, наявність) зберігаються в URL |
| `/product/:id`              | деталі товару, вибір кольору й розміру, «Створити дизайн»                                                  |
| `/customizer?baseItemId=…`  | конструктор: завантаження принта (png/jpg/webp/svg до 20 МБ), зони друку, перетягування, масштаб, зсув X/Y |
| `/cart`                     | кошик (зберігається в браузері), кількість, сума                                                           |
| `/checkout`                 | дані отримувача з валідацією, вартість доставки Новою Поштою, створення замовлення                         |
| `/orders/:id`               | таймлайн статусу (автооновлення), позиції, ТТН, кнопка оплати                                               |
| `/payment-result?orderId=…` | повернення з LiqPay, очікування підтвердження оплати                                                       |
| `/manager`                  | перевірка макетів (схвалити / відхилити), відправка, скасування (роль manager)                             |
| `/admin`                    | додавання товарів, зміна цін і наявності (роль admin)                                                      |

### Як фронтенд працює з бекендом

- У розробці SPA шле запити на `/api/*`, Vite проксює їх на `http://localhost:3000` (CORS не потрібен). Інша адреса бекенду: змінна `BACKEND_URL` під час запуску `dev`.
- Усі запити йдуть лише через `frontend/src/api/`. Типи згенеровані з OpenAPI; після змін у `packages/contracts/openapi.yaml` виконайте `npm run gen:api -w frontend`.
- **Роль** обирається в шапці («Покупець / Менеджер / Адміністратор») і передається бекенду в заголовку `x-user-role` (тимчасово, як і на бекенді). Права перевіряє бекенд: без потрібної ролі сторінки менеджера й адміна покажуть 403.
- **Оплата без ключів LiqPay**: покупець потрапляє на `/payment-result`, а заглушка платіжки сама підтверджує оплату через 1–5 с (callback на webhook бекенду). Сторінка опитує статус щосекунди й показує «Оплату отримано», а чек приходить на email (локально в Mailpit).
- Межі зон друку, тарифи, правила файлів і отримувача продубльовані з бекенду для миттєвої перевірки на клієнті (у коді є посилання на файли-джерела). Остаточно все перевіряє й рахує бекенд.

### Скрипти (`npm run <script> -w frontend`)

| Скрипт                | Що робить                                                                          |
| --------------------- | ---------------------------------------------------------------------------------- |
| `dev`                 | dev-сервер на http://localhost:5173 (те саме, що `npm run dev:frontend` з кореня) |
| `build` / `preview`   | production-збірка в `frontend/dist` / її перегляд                                 |
| `typecheck` / `lint`  | TypeScript / oxlint                                                                |
| `test` / `test:watch` | Vitest + Testing Library + MSW (без бекенду)                                       |
| `test:e2e`            | Playwright: сам запускає бекенд (порт 3100, in-memory) і фронтенд (5180)           |
| `gen:api`             | типи `src/api/schema.d.ts` з OpenAPI                                               |

Перед першим запуском e2e: `cd frontend && npx playwright install chromium`. Сценарії: повний шлях «каталог → конструктор → кошик → оформлення → оплата → схвалення макета → відправка з ТТН» і відхилення макета менеджером.

## REST API (реалізовано)

| Метод       | Шлях                                   | Опис                                                                                         |
| ----------- | -------------------------------------- | -------------------------------------------------------------------------------------------- |
| GET         | `/health`                              | перевірка стану                                                                              |
| GET         | `/catalog`                             | список товарів; фільтри `categoryId`, `size`, `color`, `minPrice`, `maxPrice`, `inStockOnly` |
| GET         | `/catalog/:id`                         | деталі товару                                                                                |
| GET         | `/catalog/categories`                  | категорії                                                                                    |
| POST        | `/customizer/uploads`                  | завантаження принта (multipart, поле `file`; png/jpg/webp/svg до 20 МБ)                      |
| POST        | `/customizer/products`                 | створити кастомний виріб (повертає прев'ю та вартість)                                       |
| GET         | `/customizer/products/:id`             | отримати кастомний виріб                                                                     |
| GET         | `/delivery/shipping-cost`              | вартість доставки (`city`, `weightKg`)                                                       |
| POST        | `/orders`                              | створити замовлення з кастомних виробів і даних отримувача (ціни фіксуються, рахується доставка) |
| GET         | `/orders/:id`                          | замовлення (статус, сума, ТТН)                                                               |
| POST        | `/orders/:id/checkout`                 | рахунок LiqPay: `checkoutUrl` для редіректу або `data` + `signature` для POST-форми          |
| POST        | `/payments/webhook`                    | callback LiqPay (form-urlencoded `data`, `signature`), ідемпотентний                         |
| GET         | `/manager/orders?status=`              | замовлення за статусом, за замовчуванням `PENDING_REVIEW` (роль manager)                     |
| POST        | `/manager/orders/:id/verify-mockup`    | `{ approved }`: так → `PRINTING`, ні → повернення коштів і `CANCELLED` (роль manager)        |
| PATCH       | `/manager/orders/:id/status`           | ручна зміна статусу: `SHIPPED` (створює ТТН), `CANCELLED` (роль manager)                     |
| POST        | `/manager/orders/:id/notify`           | повторити сповіщення, якщо у відповіді були `warnings` (роль manager)                        |
| POST, PATCH | `/admin/catalog`, `/admin/catalog/:id` | керування каталогом (роль admin)                                                             |

Помилки повертаються у форматі `{ "error": "CODE", "message": "..." }` (400, 403, 404, 409, 413, 502).

Повна специфікація: [`packages/contracts/openapi.yaml`](packages/contracts/openapi.yaml). Типи для фронтенду: `npm run gen:api -w frontend`.

### Життєвий цикл замовлення

```
CREATED ──оплата (webhook)──▶ PAID ──▶ PENDING_REVIEW ──макет схвалено──▶ PRINTING ──▶ SHIPPED (ТТН)
   │                                        │
   └──────────────▶ CANCELLED ◀─────────────┘  (макет відхилено або скасування: оплачене повертається)
```

Спостерігачі `Order` підключені в `app.ts`: `NovaPoshtaDeliveryObserver` на `SHIPPED` створює ТТН і зберігає її в замовленні, `EmailNotificationObserver` надсилає чек на `PAID` і листи на `PRINTING`, `SHIPPED`, `CANCELLED`. Помилка спостерігача не відкочує статус: вона приходить менеджеру в `warnings`, а дію можна повторити через `/notify`.

Без ключів LiqPay оплата підтверджується автоматично (`STUB_PAYMENT_AUTO_CONFIRM=true`). Якщо автопідтвердження вимкнене, callback можна надіслати вручну:

```bash
npx tsx -e "import { StubPaymentStrategy as S } from './backend/src/modules/payment/infrastructure/stub-payment-strategy.ts'; console.log(new URLSearchParams(S.successCallback('<orderId>', <total>)).toString())" \
  | curl -s -X POST -H 'content-type: application/x-www-form-urlencoded' --data @- http://localhost:3000/payments/webhook
```

> Авторизація поки тимчасова: роль береться із заголовка `x-user-role`. Перед використанням поза розробкою її потрібно замінити на справжню автентифікацію.

## Розподіл роботи

| Зона      | Відповідальність                                                          | Статус   |
| --------- | ------------------------------------------------------------------------- | -------- |
| Frontend  | React SPA: вітрина, конструктор, кошик, чекаут, панелі менеджера й адміна | виконано |
| Backend 1 | Catalog, Customizer, Delivery, інфраструктура, composition root           | виконано |
| Backend 2 | Order, Payment (LiqPay), Notification                                     | виконано |

### Правила командної роботи

1. Один модуль має одного власника; чужі папки не редагуємо.
2. Модулі залежать лише від `packages/contracts`; зміни в ньому йдуть через PR із погодженням усіх трьох.
3. Гілки: `feat/<модуль>-<задача>`; пряме злиття в `main` заборонене, потрібні зелений CI та мінімум один approval.
4. Міграції БД: файли `001`–`009` належать Backend 1, `010` і далі Backend 2.
5. Нові модулі підключаються в `backend/src/app.ts` (composition root); зміни там робить одна людина, решта рев'юють.

## Відомі обмеження

- Інтеграція з Новою Поштою перевірена тільки на mock-HTTP; перед використанням потрібен тестовий ключ.
- Прев'ю макета це простий SVG-мокап, а не фотореалістичне зображення.
- Інтеграція з LiqPay (checkout, callback, refund) перевірена на тестових підписах; перед використанням потрібні sandbox-ключі.
- Вага посилки для доставки рахується як 0,5 кг на виріб.
