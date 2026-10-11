# Админка сайта Юлии Валишиной

Основа: `/Users/denischernykh/projects/starters/react-starter`, commit
`258b4e0a21022fc0894701e52885fd39b40469ee`. Структура FSD и библиотеки стартера
сохранены: React, React Router, Axios, TanStack Query, React Hook Form, Zod,
Orval, shadcn/Base UI, Tailwind, Vitest, MSW и Testing Library.

Добавлен Tiptap 3 с официальным Markdown extension. Визуальный редактор
поддерживает заголовки, выделение текста, списки, цитаты, ссылки и undo/redo.
Текст хранится в `bodyMarkdown`; Astro безопасно преобразует его в HTML во
время статической сборки, без выполнения HTML из контента.

## Запуск

Нужны Node **24.18.0**, pnpm **11.15.1** и работающий NestJS из `../backend`.

```sh
node --version
pnpm --version
pnpm install
pnpm dev
```

Открыть `http://localhost:5173/admin/`. Вход по email и паролю из
`../backend/.admin-credentials.json`; файл исключён из Git. Регистрации нет.
Vite проксирует `/v1` в `http://localhost:3000`. Другой адрес задаётся через
`DEV_API_PROXY_TARGET` в `.env.local`; backend должен разрешать browser Origin.

## Возможности

- Заявки: поиск, фильтр статуса, страницы списка, подробности, статус и заметка.
- Telegram: статус доставки и ручной повтор неудачной отправки.
- Статьи: визуальный редактор, адрес, тема, обложка, карточки, черновики,
  публикация, порядок и удаление с подтверждением.
- Программы: описание, стоимость, состав, выделение, черновики и публикация.
- Контакты, тексты главной, FAQ, соцсети и настройки сайта.
- Статус автоматической пересборки, ссылка на GitHub Actions и повтор ошибки.
- Защита от ухода с несохранёнными изменениями и мобильная навигация.

Cookie сессии — HttpOnly, CSRF хранится только в памяти. Приватные маршруты
проверяют живую сессию до загрузки данных; истечение сессии возвращает на вход.
Wire DTO, query keys и схемы Zod генерируются из OpenAPI NestJS.

## Проверки и размещение

```sh
pnpm api:update
pnpm check
```

`check`: воспроизводимость Orval, форматирование, ESLint, FSD, тесты и сборка.
Предупреждения Steiger о slices с единственным потребителем допустимы для
сохранённых границ FSD. Тяжёлый редактор загружается отдельно при открытии статьи.

Результат — `dist/`. Workflow `../.github/workflows/deploy-netangels.yml`
включает его в релиз NestJS как `admin-ui/`. Бэкенд раздаёт `/admin/` и
обрабатывает глубокие ссылки SPA; `/v1` остаётся API. Новый серверный процесс
для React не нужен. См. [инструкцию NetAngels](../backend/docs/netangels.md).

Исходные инструкции основы сохранены в [STARTER-README.md](STARTER-README.md).
Пример согласований перенесён в `reference/approval-requests/`. Исходники и
тесты дополнительных auth/account features сохранены, но их маршруты не
подключены к продукту. Docker/Caddy runbooks стартера — справка по основе,
production этого проекта использует NetAngels.
