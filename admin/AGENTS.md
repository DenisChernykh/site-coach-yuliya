# Админка Юлии Валишиной

Основа: react-starter 258b4e0a21022fc0894701e52885fd39b40469ee.
Git-порядок принадлежит родительскому AGENTS.md. Исходный starter read-only.

Сохранять FSD: app -> pages -> widgets -> features -> entities -> shared.
Slices потребляются через index.ts. Cache/query keys принадлежат entities,
mutations — features, composition/navigation — pages/widgets/app.
Использовать Axios, TanStack Query, React Router, React Hook Form, Zod, Orval,
shadcn/Base UI. Backend OpenAPI — единственный wire contract; generated source
не редактируется. Cookie HttpOnly; CSRF только в памяти. Problem Details
нормализуются transport. Raw backend detail не показывать пользователю.

В продукте нет регистрации и управления пользователями. Пример согласований
сохранён в reference/approval-requests; его routes не подключаются к продукту.
Production base /admin/; статика отдаётся тем же процессом NestJS.
Browser API всегда same-origin /v1; локально Vite proxy -> localhost:3000.

Перед dependencies/генерацией проверять Node 24 и pnpm 11.15.1, сохранять PATH.
Install — в host-capable контексте, без обхода allowBuilds/verifyDepsBeforeRun.
Перед завершением pnpm check и browser-проверка с настоящим backend.
Не изменять TSDoc без отдельного задания.
