# Сайт Юлии Валишиной

Статический сайт на Astro: главная, индивидуальный коучинг, журнал и две статьи. Вёрстка по `yuliya-valishina.pen`, адаптивные страницы и React-острова для меню, фильтров, FAQ, диалогов и формы.

Стек: Astro, React, TypeScript, Tailwind CSS 4, оригинальные shadcn/ui на Base UI, TanStack Query и Orval. Структура FSD повторяет подход `react-starter`. Цвета макета назначены стандартным переменным shadcn без отдельного слоя темы.

## Локальный запуск

Нужны Node.js **24.18.0** и pnpm **11.15.1**.

```sh
pnpm install
pnpm dev --port 4321
```

Откройте [сайт](http://127.0.0.1:4321/). Astro запускает dev-сервер в фоне. Остановка и логи:

```sh
pnpm exec astro dev status
pnpm exec astro dev logs
pnpm exec astro dev stop
```

## Сборка и проверка

```sh
pnpm check
pnpm preview --port 4322
```

`pnpm check` проверяет воспроизводимость генерации API, форматирование, контракты моковых запросов, типы и статическую сборку. Результат сборки — `dist/`; Node-сервер для размещения сайта не нужен. `pnpm design:check` отдельно проверяет сохранённый графический прототип.

## Данные и NestJS backend

По умолчанию `PUBLIC_DATA_SOURCE=mock`: страницы получают типизированные данные на этапе сборки, форма и журнал используют сгенерированные Orval-хуки TanStack Query. Моки работают без сети. Форма показывает состояние демонстрации, ничего не отправляет и не сохраняет.

Контракт хранится в `openapi/openapi.json`. Он экспортируется из Swagger работающего NestJS backend в `backend/`. `.env.example` описывает параметры.

```sh
pnpm api:generate
OPENAPI_SPEC_SOURCE=backend/docs/api/public-openapi.json pnpm api:update
```

Orval генерирует клиент, модели и Query/Mutation hooks в `src/shared/api/generated`. Документация [docs/api.md](docs/api.md) строится из того же OpenAPI. Сгенерированные файлы вручную не редактируются.

Для сборки с настоящим API задайте `PUBLIC_DATA_SOURCE=api` и `PUBLIC_API_BASE_URL`. Сервер должен быть доступен при сборке: новые статьи и изменения контента появляются после повторной статической генерации. NestJS backend находится в `backend/`, графическая админка на React Starter — в `admin/`. Текст статей из Tiptap сохраняется в Markdown и превращается в HTML при сборке Astro.

## Бэкенд и NetAngels

Бэкенд на основе `nest-js-starter` сохраняет заявки в PostgreSQL, отправляет
уведомления в Telegram и предоставляет защищённый API редактирования контента.
Вход по email и паролю, регистрация отключена.

```sh
pnpm --dir backend install
pnpm --dir backend setup:local
pnpm --dir backend dev:host
```

Локальный администратор создаётся автоматически, данные для входа — в
`backend/.admin-credentials.json` (не в Git). В режиме API контент берётся
из локального NestJS при сборке и отправка формы сохраняет настоящую заявку.

Production рассчитан на управляемый хостинг **NetAngels**. Код выкладывается
кнопкой **Run workflow** в GitHub Actions. После изменения контента очередь
бэкенда автоматически запускает пересборку статического Astro-сайта через 30
секунд без новых правок. При ошибке остаётся предыдущая версия. Настройка
описана в [backend/docs/netangels.md](backend/docs/netangels.md), API и команды —
в [backend/README.md](backend/README.md).

## Админка

Основа — React Starter с его FSD, Axios, TanStack Query, React Router,
React Hook Form, Zod, Orval, shadcn/Base UI, Tailwind и тестовой инфраструктурой.
Добавлен Tiptap для визуального редактирования статей.

```sh
pnpm --dir admin install
pnpm --dir admin dev
```

Админка доступна на `http://localhost:5173/admin/`; локальный NestJS должен
работать на `localhost:3000`. Разделы: заявки и заметки, статьи, программы,
контакты, главная, FAQ, соцсети и настройки сайта. Статьи и программы можно
сохранять черновиками, публиковать и удалять. Подробности в [admin/README.md](admin/README.md).
На хостинге NestJS отдаёт её по адресу `https://api.example.ru/admin/`;
отдельный сервер для React не нужен.

## Структура

```text
backend/          # NestJS, PostgreSQL, Redis и очереди
admin/            # React Starter, FSD и Tiptap
src/
├── app/          # Astro srcDir: маршруты, layouts, providers, острова, стили
├── pages/        # FSD-композиции страниц
├── widgets/      # Шапка, подвал и секции страниц
├── features/     # Меню, FAQ, диалоги и заявка
├── entities/     # Материалы, услуги, FAQ и настройки сайта
└── shared/       # shadcn/ui, API, изображения, утилиты и маршруты
openapi/          # OpenAPI snapshot
scripts/openapi/  # Импорт контракта, документация, проверка генерации
tests/            # Проверки транспорта и мокового контракта
design/           # Исходные изображения, PNG и ранний графический прототип
yuliya-valishina.pen
```

Подробнее — [docs/architecture.md](docs/architecture.md). Плавающий блок социальных сетей адаптирован из `edge`: закреплён справа внизу, раскрывается при наведении, на мобильном — по нажатию. SVG взяты из ресурсов `edge`. Профили задаются через API админки; пока адрес равен null, ссылка отключена.

## Макет и контент

`.pen` — редактируемый источник дизайна. Его читают и меняют через MCP pen.dev; расположение файла сохраняет пути к `design/assets/`. Растровый прототип сохранён отдельно: `make preview`, `make build` и `make check` относятся к нему.

Исходное задание — [docs/brief.md](docs/brief.md), статусы материалов — [design/README.md](design/README.md). Портрет изображает сгенерированную модель. Реальные фотографии, видеообращение, профили соцсетей, юридические реквизиты и подтверждённые истории клиентов добавляются перед публикацией.
