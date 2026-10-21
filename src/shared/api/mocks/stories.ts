import type { StoryGroupDto } from '../generated/model';

export const demoStories = [
  {
    id: '8df85ad3-d90e-4c8a-b0e7-987130c5cdce',
    title: 'Знакомство · демо',
    slides: [
      {
        id: 'bd1f56bb-2092-4e9e-9e1e-1f0401566db6',
        type: 'image',
        caption: 'Привет! Это тестовая подборка.\nСледом — короткое видео.',
        enabled: true,
        linkUrl: '/about/',
        mediaId: 'eb2393c2-be85-40af-8253-fd3edf82d615',
        linkLabel: 'Обо мне',
        durationSeconds: 6,
      },
      {
        id: 'adea37ab-3675-4806-82bc-779ead02ef9e',
        type: 'video',
        caption:
          'Тестовый ролик · 8 секунд\nМожно включить звук и поставить на паузу.',
        enabled: true,
        linkUrl: '/coaching/',
        mediaId: 'b17a5e77-d315-46dc-a030-a4e2edcf4b90',
        linkLabel: 'Как проходит работа',
        durationSeconds: 6,
      },
    ],
    enabled: true,
    coverMediaId: 'eb2393c2-be85-40af-8253-fd3edf82d615',
  },
  {
    id: 'c1f01555-c522-405b-85f7-47411ae175d6',
    title: 'Арт-практика · демо',
    slides: [
      {
        id: '51f49115-3aef-43e7-89b5-92b5269d793e',
        type: 'image',
        caption:
          'Тестовая подборка об арт-практике.\nФото и видео в одном формате.',
        enabled: true,
        linkUrl: '',
        mediaId: '9c56917e-debe-4916-ad6c-2ea702cf7770',
        linkLabel: '',
        durationSeconds: 6,
      },
      {
        id: '538b4a8d-cf4c-4a90-bfbb-ab991f8c2a5c',
        type: 'video',
        caption:
          'Немного движения и спокойствия.\nПроверьте паузу, звук и переключение.',
        enabled: true,
        linkUrl: '/coaching/',
        mediaId: '886a6526-4ca4-4504-8096-1e32e7e6cefd',
        linkLabel: 'Посмотреть коучинг',
        durationSeconds: 6,
      },
    ],
    enabled: true,
    coverMediaId: '9c56917e-debe-4916-ad6c-2ea702cf7770',
  },
] satisfies StoryGroupDto[];
