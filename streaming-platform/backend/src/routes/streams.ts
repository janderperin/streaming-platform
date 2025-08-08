import { Router } from 'express';
import { streamController } from '../controllers/streamController';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Listar streams do usuário
router.get('/', asyncHandler(streamController.getUserStreams));

// Criar novo stream
router.post('/', asyncHandler(streamController.createStream));

// Obter stream específico
router.get('/:id', asyncHandler(streamController.getStream));

// Atualizar stream
router.put('/:id', asyncHandler(streamController.updateStream));

// Deletar stream
router.delete('/:id', asyncHandler(streamController.deleteStream));

// Iniciar transmissão
router.post('/:id/start', asyncHandler(streamController.startStream));

// Parar transmissão
router.post('/:id/stop', asyncHandler(streamController.stopStream));

// Obter status do stream
router.get('/:id/status', asyncHandler(streamController.getStreamStatus));

// Obter estatísticas do stream
router.get('/:id/stats', asyncHandler(streamController.getStreamStats));

// Gerar nova chave de stream
router.post('/:id/regenerate-key', asyncHandler(streamController.regenerateStreamKey));

// Obter configurações RTMP
router.get('/:id/rtmp-config', asyncHandler(streamController.getRTMPConfig));

// Atualizar thumbnail
router.post('/:id/thumbnail', asyncHandler(streamController.updateThumbnail));

// Listar streams públicos (não requer autenticação específica)
router.get('/public/list', asyncHandler(streamController.getPublicStreams));

// Obter stream público para visualização
router.get('/public/:id', asyncHandler(streamController.getPublicStream));

// Rotas para convidados
router.get('/:id/guests', asyncHandler(streamController.getStreamGuests));
router.post('/:id/guests', asyncHandler(streamController.inviteGuest));
router.put('/:id/guests/:guestId', asyncHandler(streamController.updateGuest));
router.delete('/:id/guests/:guestId', asyncHandler(streamController.removeGuest));

// Rotas para overlays
router.get('/:id/overlays', asyncHandler(streamController.getStreamOverlays));
router.post('/:id/overlays', asyncHandler(streamController.addOverlay));
router.put('/:id/overlays/:overlayId', asyncHandler(streamController.updateStreamOverlay));
router.delete('/:id/overlays/:overlayId', asyncHandler(streamController.removeOverlay));

// Rotas para gravações
router.get('/:id/recordings', asyncHandler(streamController.getStreamRecordings));
router.post('/:id/recordings/start', asyncHandler(streamController.startRecording));
router.post('/:id/recordings/stop', asyncHandler(streamController.stopRecording));

// Rotas para multistream
router.get('/:id/multistream', asyncHandler(streamController.getMultistreamConfig));
router.post('/:id/multistream', asyncHandler(streamController.configureMultistream));
router.put('/:id/multistream/:configId', asyncHandler(streamController.updateMultistreamConfig));
router.delete('/:id/multistream/:configId', asyncHandler(streamController.removeMultistreamConfig));

// Webhook para notificações do Nginx RTMP
router.post('/webhook/rtmp/:action', asyncHandler(streamController.rtmpWebhook));

export default router;

