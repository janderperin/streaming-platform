import { Router } from 'express';
import { restreamController } from '../controllers/restreamController';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Criar novo re-stream do YouTube
router.post('/youtube', asyncHandler(restreamController.createYouTubeRestream));

// Listar re-streams do usuário
router.get('/', asyncHandler(restreamController.getUserRestreams));

// Obter informações de vídeo do YouTube (preview)
router.get('/youtube/info', asyncHandler(restreamController.getYouTubeVideoInfo));

// Obter re-stream específico
router.get('/:id', asyncHandler(restreamController.getRestream));

// Parar re-stream
router.post('/:id/stop', asyncHandler(restreamController.stopRestream));

// Deletar re-stream
router.delete('/:id', asyncHandler(restreamController.deleteRestream));

// Obter estatísticas do re-stream
router.get('/:id/stats', asyncHandler(restreamController.getRestreamStats));

// Configurar overlays
router.post('/:id/overlays', asyncHandler(restreamController.configureOverlays));

// Webhook para notificações do processo de captura (não requer autenticação)
router.post('/webhook/capture', asyncHandler(restreamController.captureWebhook));

// Listar re-streams públicos (não requer autenticação específica)
router.get('/public/list', asyncHandler(restreamController.getPublicRestreams));

export default router;

