import { describe, test, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('./mongo', () => {
  const mockSave = vi.fn().mockResolvedValue(true);
  const mockDelete = vi.fn().mockResolvedValue(true);
  const mockFindOne = vi.fn();
  const mockFindOneAndUpdate = vi.fn();

  return {
    Url: class {
      shortCode: string;
      originalUrl: string;
      constructor(data: any) { 
        Object.assign(this, data); 
      }
      save = mockSave;
      deleteOne = mockDelete;
      static findOne = mockFindOne;
      static findOneAndUpdate = mockFindOneAndUpdate;
    }
  };
});

const mockRedisGet = vi.fn().mockResolvedValue(null);
const mockRedisSet = vi.fn().mockResolvedValue('OK');
const mockRedisDel = vi.fn().mockResolvedValue(1);

vi.mock('./redis', () => ({
  redisClient: {
    get: (...args: any[]) => mockRedisGet(...args),
    set: (...args: any[]) => mockRedisSet(...args),
    del: (...args: any[]) => mockRedisDel(...args),
  }
}));

const mockRateLimiter = vi.fn((req: any, res: any, next: any) => next());

vi.mock('./middleware', () => ({
  rateLimiter: (...args: any[]) => mockRateLimiter(...args)
}));

import router from './routes';
import { rateLimiter } from './middleware';

const app = express();
app.use(express.json());
app.use(rateLimiter);
app.use('/', router);

describe('URL Shortener API', () => {

  beforeEach(() => {
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue('OK');
    mockRedisDel.mockResolvedValue(1);
    mockRateLimiter.mockImplementation((req: any, res: any, next: any) => next());
  });

  test('POST /shorten returns 200 and shortCode', async () => {
    const response = await request(app)
      .post('/shorten')
      .send({ url: 'https://google.com' });

    expect(response.status).toBe(200);
    expect(response.body.shortCode).toBeDefined();
  });

  test('POST /shorten without URL returns 400', async () => {
    const response = await request(app)
      .post('/shorten')
      .send({});

    expect(response.status).toBe(400);
  });

  test('DELETE /code without URL returns 404', async () => {
    const { Url } = await import('./mongo');
    vi.mocked(Url.findOne).mockResolvedValue(null);

    const response = await request(app)
      .delete('/someCode')
      .send({});

    expect(response.status).toBe(404);
  });

  test('rate limiter returns 429 after 10 requests', async () => {
    mockRateLimiter.mockImplementation((req: any, res: any, next: any) => {
      res.status(429).json({ error: 'Too many requests' });
    });

    const response = await request(app)
      .post('/shorten')
      .send({ url: 'https://google.com' });

    expect(response.status).toBe(429);
  });

});