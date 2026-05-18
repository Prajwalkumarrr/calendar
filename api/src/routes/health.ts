import { Router } from 'express';
import mongoose from 'mongoose';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'elevaite-api',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptimeSec: Math.round(process.uptime()),
  });
});
