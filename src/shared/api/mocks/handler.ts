import { ApiError } from '../client/api-fetch';
import {
  articles,
  faq,
  homePage,
  services,
  siteSettings,
  socialLinks,
} from './data';
import type { ConsultationRequestDto } from '../generated/model';

export async function handleMockRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  options?.signal?.throwIfAborted();
  const url = new URL(path, 'https://mock.invalid');
  const method = options?.method?.toUpperCase() ?? 'GET';
  let result: unknown;

  if (method === 'GET') {
    switch (url.pathname) {
      case '/v1/site':
        result = siteSettings;
        break;
      case '/v1/contacts':
        result = { email: null, phone: null, telegramUrl: null, address: null };
        break;
      case '/v1/home':
        result = homePage;
        break;
      case '/v1/services':
        result = services;
        break;
      case '/v1/faq':
        result = faq;
        break;
      case '/v1/social-links':
        result = socialLinks;
        break;
      case '/v1/articles': {
        const topic = url.searchParams.get('topic');
        result = topic
          ? articles.filter((article) => article.topic === topic)
          : articles;
        break;
      }
      default: {
        if (url.pathname.startsWith('/v1/articles/')) {
          const slug = decodeURIComponent(
            url.pathname.slice('/v1/articles/'.length),
          );
          result = articles.find((article) => article.slug === slug);
        }
      }
    }
  } else if (method === 'POST' && url.pathname === '/v1/consultations') {
    let input: ConsultationRequestDto;
    try {
      input = JSON.parse(String(options?.body));
    } catch {
      throw new ApiError('INVALID_INPUT', 'Проверь поля заявки.', 400);
    }
    if (
      !input ||
      typeof input !== 'object' ||
      Array.isArray(input) ||
      typeof input.name !== 'string' ||
      input.name.trim().length < 2 ||
      input.name.length > 80 ||
      typeof input.contact !== 'string' ||
      input.contact.trim().length < 5 ||
      input.contact.length > 120 ||
      input.consent !== true ||
      (input.message !== undefined &&
        (typeof input.message !== 'string' || input.message.length > 2000)) ||
      (input.serviceId !== undefined &&
        (typeof input.serviceId !== 'string' || input.serviceId.length > 100))
    ) {
      throw new ApiError(
        'INVALID_INPUT',
        'Проверь поля заявки и согласие.',
        400,
      );
    }
    result = {
      status: 'preview',
      message:
        'Это демонстрация формы. Заявка не отправлена, данные не сохранены. Запись появится после подключения сервиса.',
    };
  }
  if (result === undefined) {
    throw new ApiError('NOT_FOUND', 'Материал не найден.', 404);
  }
  return structuredClone(result) as T;
}
