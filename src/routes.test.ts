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

vi.mock('./redis', () => ({
  redisClient: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  }
}));

import router from './routes';

const app = express();
app.use(express.json());
app.use('/', router);

describe('URL Shortener API', () => {

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
    // Tell findOne to return null (URL not found)
    const { Url } = await import('./mongo');
    vi.mocked(Url.findOne).mockResolvedValue(null);

    const response = await request(app)
      .delete('/someCode')
      .send({});

    expect(response.status).toBe(404);
  });

});