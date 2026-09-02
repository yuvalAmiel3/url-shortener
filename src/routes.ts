import { Router, Request, Response } from 'express';
import { Url } from './mongo';
import { redisClient } from './redis';
import crypto from 'crypto';

const router = Router();

// POST /shorten - create a short URL
router.post('/shorten', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const shortCode = crypto.randomBytes(4).toString('hex');

  const newUrl = new Url({ shortCode, originalUrl: url });
  await newUrl.save();

  await redisClient.set(shortCode, url);

  res.json({ shortCode, shortUrl: `http://localhost:3000/${shortCode}` });
});

// GET /:code - redirect to original URL
router.get('/:code', async (req: Request, res: Response) => {
  const { code } = req.params;

  // Check Redis cache first
  const cached = await redisClient.get(code);
  if (cached) {
    await Url.findOneAndUpdate({ shortCode: code }, { $inc: { clicks: 1 } });
    return res.redirect(cached);
  }

  // Fallback to MongoDB
  const urlDoc = await Url.findOne({ shortCode: code });
  if (!urlDoc) return res.status(404).json({ error: 'URL not found' });

  await Url.findOneAndUpdate({ shortCode: code }, { $inc: { clicks: 1 } });
  res.redirect(urlDoc.originalUrl);
});

// GET /stats/:code - get click stats
router.get('/stats/:code', async (req: Request, res: Response) => {
  const { code } = req.params;
  const urlDoc = await Url.findOne({ shortCode: code });
  if (!urlDoc) return res.status(404).json({ error: 'URL not found' });

  res.json({
    shortCode: code,
    originalUrl: urlDoc.originalUrl,
    clicks: urlDoc.clicks,
    createdAt: urlDoc.createdAt,
  });
});

router.delete('/:code', async (req: Request, res: Response) => {
  const { code } = req.params;
  const urlDoc = await Url.findOne({ shortCode: code });
  if (!urlDoc) return res.status(404).json({ error: 'URL not found' });

  await urlDoc.deleteOne();
  await redisClient.del(code);
  res.status(200).json({ message: 'URL deleted successfully' });
});

export default router;