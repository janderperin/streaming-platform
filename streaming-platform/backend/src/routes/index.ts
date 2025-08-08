import { Router } from 'express';
import authRoutes from './auth';
import streamRoutes from './streams';
import restreamRoutes from './restream';
import schedulerRoutes from './scheduler';

const router = Router();

// Rotas principais
router.use('/auth', authRoutes);
router.use('/streams', streamRoutes);
router.use('/restream', restreamRoutes);
router.use('/scheduler', schedulerRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

export default router;

