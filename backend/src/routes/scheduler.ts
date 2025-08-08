import { Router } from 'express';
import { schedulerController } from '../controllers/schedulerController';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Rotas para agendamento de vídeos individuais
router.post('/videos', asyncHandler(schedulerController.scheduleVideo));
router.get('/videos', asyncHandler(schedulerController.getUserScheduledVideos));
router.delete('/videos/:id', asyncHandler(schedulerController.cancelScheduledVideo));
router.post('/videos/:id/duplicate', asyncHandler(schedulerController.duplicateSchedule));

// Rotas para canais de TV 24h
router.post('/channels', asyncHandler(schedulerController.createTVChannel));
router.get('/channels', asyncHandler(schedulerController.getUserTVChannels));
router.get('/channels/:id', asyncHandler(schedulerController.getTVChannelDetails));
router.post('/channels/:id/start', asyncHandler(schedulerController.startTVChannel));
router.post('/channels/:id/stop', asyncHandler(schedulerController.stopTVChannel));
router.put('/channels/:id/playlist', asyncHandler(schedulerController.updateChannelPlaylist));

// Rotas para estatísticas e informações
router.get('/stats', asyncHandler(schedulerController.getSchedulingStats));
router.get('/upcoming', asyncHandler(schedulerController.getUpcomingSchedules));

export default router;

