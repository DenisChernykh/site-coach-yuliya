import { readFile } from 'node:fs/promises'
import request from 'supertest'
import type { ArticleDto } from '@/modules/coach-site/domain/content'
import {
  createAuthTestRuntime,
  type AuthE2eRuntime,
} from '@test/e2e/support/create-auth-test-runtime'
import { assertOpenApiResponseConforms } from '@test/e2e/openapi/openapi-test-harness'

describe('coach site admin access over real HTTP', () => {
  let runtime: AuthE2eRuntime
  let baseUrl: string
  let adminCookie: string
  let csrfToken: string
  let outsiderCookie: string

  beforeAll(async () => {
    runtime = await createAuthTestRuntime(1)
    baseUrl = runtime.instances[0]!.baseUrl
    await runtime.createUser('admin@example.com')
    await runtime.createUser('outsider@example.com', undefined, [])
    const admin = await request(baseUrl)
      .post('/v1/auth/login')
      .set('Origin', baseUrl)
      .send({ email: 'admin@example.com', password: 'valid password' })
      .expect(200)
    const outsider = await request(baseUrl)
      .post('/v1/auth/login')
      .set('Origin', baseUrl)
      .send({ email: 'outsider@example.com', password: 'valid password' })
      .expect(200)
    adminCookie = admin.headers['set-cookie']![0]!.split(';', 1)[0]!
    outsiderCookie = outsider.headers['set-cookie']![0]!.split(';', 1)[0]!
    csrfToken = (admin.body as { csrfToken: string }).csrfToken
  })

  afterAll(async () => runtime.stop())

  it('requires a session and the content permission for admin lists', async () => {
    await request(baseUrl).get('/v1/admin/articles').expect(401)
    await request(baseUrl)
      .get('/v1/admin/articles')
      .set('Cookie', outsiderCookie)
      .expect(403)
    const articles = await request(baseUrl)
      .get('/v1/admin/articles')
      .set('Cookie', adminCookie)
      .expect(200)
    await assertOpenApiResponseConforms('adminListArticles', articles)
    expect(articles.body).toEqual([])
    const consultations = await request(baseUrl)
      .get('/v1/admin/consultations')
      .set('Cookie', adminCookie)
      .expect(200)
    await assertOpenApiResponseConforms('adminListConsultations', consultations)
  })

  it('requires CSRF for content mutations and preserves drafts', async () => {
    const initial = JSON.parse(
      await readFile('content/initial.json', 'utf8'),
    ) as { articles: ArticleDto[] }
    const input = {
      content: initial.articles[0],
      published: false,
      sortOrder: 0,
    }
    await request(baseUrl)
      .post('/v1/admin/articles')
      .set('Cookie', adminCookie)
      .set('Origin', baseUrl)
      .send(input)
      .expect(403)
    const created = await request(baseUrl)
      .post('/v1/admin/articles')
      .set('Cookie', adminCookie)
      .set('Origin', baseUrl)
      .set('X-CSRF-Token', csrfToken)
      .send(input)
      .expect(201)
    await assertOpenApiResponseConforms('adminCreateArticle', created)
    await request(baseUrl)
      .get(`/v1/articles/${initial.articles[0]!.slug}`)
      .expect(404)
    const publication = await request(baseUrl)
      .get('/v1/admin/publication')
      .set('Cookie', adminCookie)
      .expect(200)
    expect(publication.body).toMatchObject({
      status: 'PENDING',
      requestedRevision: 1,
      deployedRevision: 0,
    })
  })

  it('keeps the starter demo and registration endpoints out of the API', async () => {
    await request(baseUrl)
      .get('/v1/approval-requests')
      .set('Cookie', adminCookie)
      .expect(404)
    await request(baseUrl)
      .post('/v1/auth/register')
      .set('Origin', baseUrl)
      .send({ email: 'new@example.com', password: 'valid password' })
      .expect(404)
  })
})
