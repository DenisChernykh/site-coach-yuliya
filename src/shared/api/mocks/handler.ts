import { defaultPageLayouts } from '@/shared/lib/page-layouts';
import { ApiProblemError } from '../client/api-errors';
import {
  articles,
  faq,
  homePage,
  services,
  siteSettings,
  seoSettings,
  socialLinks,
} from './data';
import {
  ConsultationRequestDtoSource,
  type ConsultationRequestDto,
} from '../generated/model';

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
      case '/v1/page-layouts':
        result = defaultPageLayouts();
        break;
      case '/v1/site':
        result = siteSettings;
        break;
      case '/v1/seo':
        result = seoSettings;
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
      throw mockProblem('VALIDATION_FAILED', url.pathname);
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
      (input.source !== undefined &&
        !Object.values(ConsultationRequestDtoSource).includes(input.source)) ||
      (input.website !== undefined &&
        (typeof input.website !== 'string' || input.website.length > 2000)) ||
      (input.message !== undefined &&
        (typeof input.message !== 'string' || input.message.length > 2000)) ||
      (input.serviceId !== undefined &&
        (typeof input.serviceId !== 'string' || input.serviceId.length > 100))
    ) {
      throw mockProblem('VALIDATION_FAILED', url.pathname);
    }
    result = {
      status: 'preview',
      message:
        'Это демонстрация формы. Заявка не отправлена, данные не сохранены. Запись появится после подключения сервиса.',
    };
  }
  if (result === undefined) {
    throw mockProblem('NOT_FOUND', url.pathname);
  }
  return structuredClone(result) as T;
}

function mockProblem(
  code: 'VALIDATION_FAILED' | 'NOT_FOUND',
  instance: string,
) {
  return new ApiProblemError(
    {
      type: `https://mock.invalid/problems/${code.toLowerCase().replaceAll('_', '-')}`,
      title: code === 'NOT_FOUND' ? 'Not found' : 'Validation failed',
      status: code === 'NOT_FOUND' ? 404 : 400,
      detail: code === 'NOT_FOUND' ? 'Resource not found.' : 'Invalid input.',
      instance,
      code,
      requestId: 'mock-request',
    },
    null,
  );
}
