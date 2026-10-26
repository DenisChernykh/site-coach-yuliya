import type { WriteArticleDto, WriteProgramDto } from '@/shared/api'

export type ContentValue =
  | string
  | number
  | boolean
  | null
  | ContentValue[]
  | { [key: string]: ContentValue }

const destinations: Record<string, string> = {
  '/': 'Главная страница.',
  '/about/': 'Отдельная страница «Обо мне».',
  '/coaching/': 'Отдельная страница «Коучинг».',
  '/journal/': 'Отдельная страница «Журнал».',
  '/contacts/': 'Отдельная страница «Контакты».',
  '/privacy/': 'Страница «Политика конфиденциальности».',
  '/#approach': 'Секция «Подход» на главной странице.',
}

export function navigationLinkDescription(href: string): string {
  return (
    destinations[href] ??
    (href.includes('#')
      ? 'Якорь ведёт к секции страницы. Например, /#approach — «Подход» на главной.'
      : 'Адрес страницы сайта, например /about/, или полная ссылка на другой сайт.')
  )
}

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
  education: 'Образование',
  organization: 'Организация',
  documentType: 'Документ и программа',
  year: 'Год',
  hours: 'Часы обучения',
  enabled: 'Показывать на сайте',
  format: 'Формат работы',
  review: 'Текст отзыва',
  reviewImage: 'Изображение отзыва',
  reviewImageAlt: 'Описание изображения отзыва',
  editorialNotes: 'Источники материалов',
  materialId: 'Идентификатор материала',
  source: 'Источник материала',
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
    format: '',
    enabled: false,
    review: '',
    reviewImage: '',
    reviewImageAlt: '',
  },
  education: {
    id: '',
    title: '',
    organization: '',
    documentType: '',
    year: '',
    hours: 0,
    image: '',
    imageAlt: '',
    enabled: false,
  },
  editorialNotes: { materialId: '', source: '' },
  products: {
    id: '',
    eyebrow: '',
    title: '',
    description: '',
    actionLabel: '',
  },
}

export const newArticle: WriteArticleDto['content'] = {
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
export const newProgram: WriteProgramDto['content'] = {
  title: '',
  description: '',
  eyebrow: '',
  price: 0,
  priceNote: '',
  features: [],
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
        key === 'id' ? crypto.randomUUID() : blankItem(value),
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
