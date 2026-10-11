# Юлия Валишина — API сайта и админки

Сгенерировано из `openapi/openapi.json`. Не редактировать вручную.

Заявки, уведомления Telegram, статьи, программы и контактные данные.

## Методы

| Метод | Путь                  | Назначение                     | operationId          |
| ----- | --------------------- | ------------------------------ | -------------------- |
| GET   | `/v1/site`            | Настройки сайта                | `getSiteSettings`    |
| GET   | `/v1/contacts`        | Контактные данные              | `getContacts`        |
| GET   | `/v1/home`            | Контент главной                | `getHomePage`        |
| GET   | `/v1/services`        | Опубликованные программы       | `getServices`        |
| GET   | `/v1/articles`        | Опубликованные статьи          | `getArticles`        |
| GET   | `/v1/articles/{slug}` | Опубликованная статья          | `getArticle`         |
| GET   | `/v1/faq`             | Частые вопросы                 | `getFaq`             |
| GET   | `/v1/social-links`    | Социальные сети                | `getSocialLinks`     |
| POST  | `/v1/consultations`   | Сохранить заявку на знакомство | `createConsultation` |

## Модели

### SiteSettingsDto

| Поле          | Тип                 | Обязательно |
| ------------- | ------------------- | ----------- |
| `description` | string              | да          |
| `name`        | string              | да          |
| `navigation`  | NavigationItemDto[] | да          |
| `profession`  | string              | да          |

### NavigationItemDto

| Поле    | Тип    | Обязательно |
| ------- | ------ | ----------- |
| `href`  | string | да          |
| `label` | string | да          |

### ContactDetailsDto

| Поле          | Тип           | Обязательно |
| ------------- | ------------- | ----------- |
| `address`     | string / null | да          |
| `email`       | string / null | да          |
| `phone`       | string / null | да          |
| `telegramUrl` | string / null | да          |

### HomePageDto

| Поле          | Тип            | Обязательно |
| ------------- | -------------- | ----------- |
| `about`       | AboutDto       | да          |
| `approach`    | ApproachDto    | да          |
| `artPractice` | ArtPracticeDto | да          |
| `caseStudies` | CaseStudyDto[] | да          |
| `concerns`    | ConcernDto[]   | да          |
| `hero`        | HeroDto        | да          |
| `process`     | StepDto[]      | да          |
| `products`    | ProductDto[]   | да          |

### AboutDto

| Поле         | Тип      | Обязательно |
| ------------ | -------- | ----------- |
| `eyebrow`    | string   | да          |
| `paragraphs` | string[] | да          |
| `title`      | string   | да          |

### ApproachDto

| Поле          | Тип       | Обязательно |
| ------------- | --------- | ----------- |
| `description` | string    | да          |
| `eyebrow`     | string    | да          |
| `quote`       | string    | да          |
| `steps`       | StepDto[] | да          |
| `title`       | string    | да          |

### StepDto

| Поле          | Тип    | Обязательно |
| ------------- | ------ | ----------- |
| `description` | string | да          |
| `title`       | string | да          |

### ArtPracticeDto

| Поле          | Тип      | Обязательно |
| ------------- | -------- | ----------- |
| `description` | string   | да          |
| `details`     | string[] | да          |
| `eyebrow`     | string   | да          |
| `title`       | string   | да          |

### CaseStudyDto

| Поле          | Тип    | Обязательно |
| ------------- | ------ | ----------- |
| `details`     | string | да          |
| `exploration` | string | да          |
| `id`          | string | да          |
| `request`     | string | да          |
| `result`      | string | да          |
| `title`       | string | да          |

### ConcernDto

| Поле          | Тип    | Обязательно |
| ------------- | ------ | ----------- |
| `description` | string | да          |
| `id`          | string | да          |
| `title`       | string | да          |

### HeroDto

| Поле           | Тип      | Обязательно |
| -------------- | -------- | ----------- |
| `description`  | string   | да          |
| `eyebrow`      | string   | да          |
| `headingLines` | string[] | да          |
| `meetingNote`  | string   | да          |

### ProductDto

| Поле          | Тип    | Обязательно |
| ------------- | ------ | ----------- |
| `actionLabel` | string | да          |
| `description` | string | да          |
| `eyebrow`     | string | да          |
| `id`          | string | да          |
| `title`       | string | да          |

### ServiceDto

| Поле          | Тип      | Обязательно |
| ------------- | -------- | ----------- |
| `description` | string   | да          |
| `eyebrow`     | string   | да          |
| `features`    | string[] | да          |
| `id`          | string   | да          |
| `price`       | number   | да          |
| `priceNote`   | string   | да          |
| `title`       | string   | да          |

### ArticleDto

| Поле                 | Тип                 | Обязательно |
| -------------------- | ------------------- | ----------- |
| `bodyMarkdown`       | string              | нет         |
| `coverAlt`           | string              | да          |
| `coverImage`         | string              | да          |
| `ctaDescription`     | string              | да          |
| `ctaTitle`           | string              | да          |
| `description`        | string              | да          |
| `intro`              | string              | да          |
| `listingDescription` | string              | нет         |
| `practiceQuestions`  | string[]            | да          |
| `practiceTitle`      | string              | да          |
| `previewDescription` | string              | нет         |
| `previewTitle`       | string              | нет         |
| `quote`              | string              | да          |
| `quoteNote`          | string              | да          |
| `sections`           | ArticleSectionDto[] | да          |
| `slug`               | string              | да          |
| `story`              | string[]            | да          |
| `storyTitle`         | string              | да          |
| `title`              | string              | да          |
| `topic`              | string              | да          |
| `topicLabel`         | string              | да          |

### ArticleSectionDto

| Поле         | Тип      | Обязательно |
| ------------ | -------- | ----------- |
| `id`         | string   | да          |
| `paragraphs` | string[] | да          |
| `summary`    | string   | да          |
| `title`      | string   | да          |

### ProblemResponseDto

| Поле        | Тип    | Обязательно |
| ----------- | ------ | ----------- |
| `code`      | string | да          |
| `detail`    | string | да          |
| `instance`  | string | да          |
| `requestId` | string | да          |
| `status`    | number | да          |
| `title`     | string | да          |
| `type`      | string | да          |

### FaqItemDto

| Поле       | Тип    | Обязательно |
| ---------- | ------ | ----------- |
| `answer`   | string | да          |
| `id`       | string | да          |
| `question` | string | да          |

### SocialLinkDto

| Поле    | Тип           | Обязательно |
| ------- | ------------- | ----------- |
| `id`    | string        | да          |
| `label` | string        | да          |
| `url`   | string / null | да          |

### ConsultationRequestDto

| Поле        | Тип     | Обязательно |
| ----------- | ------- | ----------- |
| `consent`   | boolean | да          |
| `contact`   | string  | да          |
| `message`   | string  | нет         |
| `name`      | string  | да          |
| `serviceId` | string  | нет         |

### ConsultationResultDto

| Поле      | Тип    | Обязательно |
| --------- | ------ | ----------- |
| `message` | string | да          |
| `status`  | string | да          |

### ValidationProblemResponseDto

| Поле        | Тип                            | Обязательно |
| ----------- | ------------------------------ | ----------- |
| `code`      | string                         | да          |
| `detail`    | string                         | да          |
| `errors`    | ProblemFieldErrorResponseDto[] | да          |
| `instance`  | string                         | да          |
| `requestId` | string                         | да          |
| `status`    | number                         | да          |
| `title`     | string                         | да          |
| `type`      | string                         | да          |

### ProblemFieldErrorResponseDto

| Поле      | Тип    | Обязательно |
| --------- | ------ | ----------- |
| `code`    | string | да          |
| `detail`  | string | да          |
| `pointer` | string | да          |
