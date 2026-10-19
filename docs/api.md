# Юлия Валишина — API сайта и админки

Сгенерировано из `openapi/openapi.json`. Не редактировать вручную.

Заявки, уведомления Telegram, статьи, программы и контактные данные.

## Методы

| Метод | Путь                   | Назначение                                | operationId          |
| ----- | ---------------------- | ----------------------------------------- | -------------------- |
| GET   | `/v1/story-media/{id}` | Фото или видео сторис с поддержкой Range  | `getStoryMedia`      |
| GET   | `/v1/page-layouts`     | Опубликованный порядок и видимость секций | `getPageLayouts`     |
| GET   | `/v1/site`             | Настройки сайта                           | `getSiteSettings`    |
| GET   | `/v1/seo`              | SEO сайта и страниц                       | `getSeoSettings`     |
| GET   | `/v1/contacts`         | Контактные данные                         | `getContacts`        |
| GET   | `/v1/home`             | Контент главной                           | `getHomePage`        |
| GET   | `/v1/services`         | Опубликованные программы                  | `getServices`        |
| GET   | `/v1/articles`         | Опубликованные статьи                     | `getArticles`        |
| GET   | `/v1/articles/{slug}`  | Опубликованная статья                     | `getArticle`         |
| GET   | `/v1/faq`              | Частые вопросы                            | `getFaq`             |
| GET   | `/v1/social-links`     | Социальные сети                           | `getSocialLinks`     |
| POST  | `/v1/consultations`    | Сохранить заявку на знакомство            | `createConsultation` |

## Модели

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

### CmsPageDto

| Поле     | Тип           | Обязательно |
| -------- | ------------- | ----------- |
| `blocks` | CmsBlockDto[] | да          |
| `key`    | string        | да          |

### CmsBlockDto

| Поле          | Тип     | Обязательно |
| ------------- | ------- | ----------- |
| `description` | string  | нет         |
| `enabled`     | boolean | да          |
| `eyebrow`     | string  | нет         |
| `id`          | string  | да          |
| `note`        | string  | нет         |
| `title`       | string  | нет         |

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

### SeoSettingsDto

| Поле              | Тип           | Обязательно |
| ----------------- | ------------- | ----------- |
| `allowIndexing`   | boolean       | да          |
| `defaultImage`    | string        | да          |
| `defaultImageAlt` | string        | да          |
| `pages`           | SeoPagesDto   | да          |
| `siteName`        | string        | да          |
| `siteUrl`         | string / null | да          |

### SeoPagesDto

| Поле       | Тип        | Обязательно |
| ---------- | ---------- | ----------- |
| `about`    | PageSeoDto | да          |
| `coaching` | PageSeoDto | да          |
| `contacts` | PageSeoDto | да          |
| `home`     | PageSeoDto | да          |
| `journal`  | PageSeoDto | да          |
| `privacy`  | PageSeoDto | да          |

### PageSeoDto

| Поле            | Тип     | Обязательно |
| --------------- | ------- | ----------- |
| `description`   | string  | да          |
| `noIndex`       | boolean | да          |
| `ogDescription` | string  | да          |
| `ogImage`       | string  | да          |
| `ogImageAlt`    | string  | да          |
| `ogTitle`       | string  | да          |
| `title`         | string  | да          |

### ContactDetailsDto

| Поле          | Тип           | Обязательно |
| ------------- | ------------- | ----------- |
| `address`     | string / null | да          |
| `email`       | string / null | да          |
| `phone`       | string / null | да          |
| `telegramUrl` | string / null | да          |

### HomePageDto

| Поле          | Тип             | Обязательно |
| ------------- | --------------- | ----------- |
| `about`       | AboutDto        | да          |
| `approach`    | ApproachDto     | да          |
| `artPractice` | ArtPracticeDto  | да          |
| `caseStudies` | CaseStudyDto[]  | да          |
| `concerns`    | ConcernDto[]    | да          |
| `hero`        | HeroDto         | да          |
| `process`     | StepDto[]       | да          |
| `products`    | ProductDto[]    | да          |
| `stories`     | StoryGroupDto[] | нет         |

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

### StoryGroupDto

| Поле           | Тип             | Обязательно |
| -------------- | --------------- | ----------- |
| `coverMediaId` | string          | да          |
| `enabled`      | boolean         | да          |
| `id`           | string          | да          |
| `slides`       | StorySlideDto[] | да          |
| `title`        | string          | да          |

### StorySlideDto

| Поле              | Тип     | Обязательно |
| ----------------- | ------- | ----------- |
| `caption`         | string  | да          |
| `durationSeconds` | number  | да          |
| `enabled`         | boolean | да          |
| `id`              | string  | да          |
| `linkLabel`       | string  | да          |
| `linkUrl`         | string  | да          |
| `mediaId`         | string  | да          |
| `type`            | string  | да          |

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
| `seo`                | PageSeoDto          | нет         |
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
| `source`    | string  | нет         |
| `website`   | string  | нет         |

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
