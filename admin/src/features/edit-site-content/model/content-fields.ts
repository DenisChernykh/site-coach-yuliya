import type { ArticleDto, ServiceDto } from '@/shared/api'

export type ContentValue =
  | string
  | number
  | boolean
  | null
  | ContentValue[]
  | { [key: string]: ContentValue }

export const fieldLabels: Record<string, string> = {
  name: 'Имя',
  profession: 'Специализация',
  description: 'Описание',
  navigation: 'Навигация',
  label: 'Название',
  href: 'Ссылка',
  id: 'Идентификатор',
  email: 'Email',
  phone: 'Телефон',
  telegramUrl: 'Ссылка на Telegram',
  address: 'Адрес',
  title: 'Заголовок',
  slug: 'Адрес статьи',
  topic: 'Тема',
  topicLabel: 'Название темы',
  previewTitle: 'Заголовок карточки на главной',
  previewDescription: 'Описание карточки на главной',
  listingDescription: 'Описание в журнале',
  coverImage: 'Обложка',
  coverAlt: 'Описание изображения',
  intro: 'Вступление',
  storyTitle: 'Заголовок истории',
  story: 'История',
  quote: 'Цитата',
  quoteNote: 'Подпись к цитате',
  sections: 'Разделы статьи',
  paragraphs: 'Абзацы',
  summary: 'Краткое описание',
  practiceTitle: 'Заголовок практики',
  practiceQuestions: 'Вопросы для практики',
  ctaTitle: 'Заголовок приглашения',
  ctaDescription: 'Текст приглашения',
  price: 'Стоимость, ₽',
  priceNote: 'Подпись к цене',
  features: 'Что входит',
  eyebrow: 'Надзаголовок',
  featured: 'Выделить программу',
  question: 'Вопрос',
  answer: 'Ответ',
  url: 'Ссылка',
  hero: 'Первый экран',
  headingLines: 'Строки заголовка',
  meetingNote: 'Подпись о встрече',
  concerns: 'Запросы клиентов',
  about: 'О специалисте',
  approach: 'Подход',
  artPractice: 'Арт-практика',
  process: 'Этапы работы',
  caseStudies: 'Истории клиентов',
  products: 'Другие продукты',
  subtitle: 'Подзаголовок',
  body: 'Текст',
  text: 'Текст',
  paragraphsTitle: 'Заголовок',
  bullets: 'Пункты',
  quoteLabel: 'Подпись к цитате',
  result: 'Результат',
  role: 'Роль',
  duration: 'Длительность',
  number: 'Номер',
  image: 'Изображение',
  imageAlt: 'Описание изображения',
  buttonLabel: 'Текст кнопки',
  buttonHref: 'Ссылка кнопки',
  items: 'Частые вопросы',
  links: 'Социальные сети',
  benefits: 'Преимущества',
  steps: 'Этапы',
  request: 'Запрос клиента',
  exploration: 'Что исследовали',
  details: 'Подробности',
  actionLabel: 'Текст кнопки',
}

export const itemTemplates: Record<string, ContentValue> = {
  sections: { id: '', title: '', summary: '', paragraphs: [] },
  items: { id: '', question: '', answer: '' },
  navigation: { label: '', href: '/' },
  links: { id: 'telegram', label: 'Telegram', url: null },
  concerns: { id: '', title: '', description: '' },
  steps: { title: '', description: '' },
  process: { title: '', description: '' },
  caseStudies: {
    id: '',
    title: '',
    request: '',
    exploration: '',
    result: '',
    details: '',
  },
  products: {
    id: '',
    eyebrow: '',
    title: '',
    description: '',
    actionLabel: '',
  },
}

export const newArticle: ArticleDto = {
  slug: '',
  title: '',
  topic: 'finding-work',
  topicLabel: 'Поиск своего дела',
  description: '',
  previewTitle: '',
  previewDescription: '',
  listingDescription: '',
  coverImage: 'art',
  coverAlt: '',
  intro: '',
  storyTitle: '',
  story: [],
  quote: '',
  quoteNote: '',
  sections: [],
  practiceTitle: '',
  practiceQuestions: [],
  ctaTitle: '',
  ctaDescription: '',
}
export const newProgram: ServiceDto = {
  id: '',
  title: '',
  description: '',
  eyebrow: '',
  price: 0,
  priceNote: '',
  features: [],
  featured: false,
}

export function labelFor(key: string): string {
  return fieldLabels[key] ?? key
}

export function blankItem(template: ContentValue): ContentValue {
  if (Array.isArray(template)) return []
  if (template && typeof template === 'object') {
    return Object.fromEntries(
      Object.entries(template).map(([key, value]) => [
        key,
        key === 'id' ? '' : blankItem(value),
      ]),
    )
  }
  return typeof template === 'boolean'
    ? false
    : typeof template === 'number'
      ? 0
      : template === null
        ? null
        : ''
}
