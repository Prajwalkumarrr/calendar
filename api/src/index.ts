import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db';
import { healthRouter } from './routes/health';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:3000';

app.use(cors({ origin: WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.json({
    service: 'elevaite-api',
    docs: 'try GET /api/health',
  });
});

app.use('/api/health', healthRouter);

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api error]', err);
  res.status(500).json({ error: 'internal_error' });
});

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[api] listening on http://localhost:${PORT}`);
    console.log(`[api] CORS origin: ${WEB_ORIGIN}`);
  });
}

start().catch((err) => {
  console.error('[api] failed to start:', err);
  process.exit(1);
});
