import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CustomError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { ApiResponse, YouTubeRestream, CreateYouTubeRestreamData } from '../types';
import { restreamService } from '../services/restreamService';
import { streamService } from '../services/streamService';

class RestreamController {
  // Criar novo re-stream do YouTube
  async createYouTubeRestream(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { youtubeUrl, streamId } = req.body as CreateYouTubeRestreamData;
    const userId = req.user!.id;

    // Validação básica
    if (!youtubeUrl) {
      throw new CustomError('YouTube URL is required', 400);
    }

    // Validar URL do YouTube
    if (!restreamService.isValidYouTubeUrl(youtubeUrl)) {
      throw new CustomError('Invalid YouTube URL', 400);
    }

    // Se streamId for fornecido, verificar se o usuário é o dono
    if (streamId) {
      const ownership = await streamService.verifyStreamOwnership(streamId, userId);
      if (!ownership) {
        throw new CustomError('Stream not found or access denied', 404);
      }
    }

    // Extrair informações do vídeo do YouTube
    const videoInfo = await restreamService.getYouTubeVideoInfo(youtubeUrl);
    
    if (!videoInfo.isLive) {
      throw new CustomError('The provided YouTube URL is not a live stream', 400);
    }

    // Criar registro no banco
    const restreamId = uuidv4();
    const result = await query(
      `INSERT INTO youtube_restreams (
        id, user_id, stream_id, youtube_url, youtube_video_id, 
        title, description, thumbnail_url, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        restreamId,
        userId,
        streamId || null,
        youtubeUrl,
        videoInfo.videoId,
        videoInfo.title,
        videoInfo.description,
        videoInfo.thumbnail,
        'pending'
      ]
    );

    const restream = result.rows[0];

    // Iniciar processo de captura
    try {
      await restreamService.startYouTubeCapture(restreamId, youtubeUrl);
      
      // Atualizar status para capturing
      await query(
        'UPDATE youtube_restreams SET status = $1, started_at = NOW() WHERE id = $2',
        ['capturing', restreamId]
      );

      logger.info(`YouTube restream started: ${restreamId} for user ${userId}`);
    } catch (error) {
      // Atualizar status para error
      await query(
        'UPDATE youtube_restreams SET status = $1, error_message = $2 WHERE id = $3',
        ['error', error instanceof Error ? error.message : 'Unknown error', restreamId]
      );
      
      throw new CustomError('Failed to start YouTube capture', 500);
    }

    const response: ApiResponse<YouTubeRestream> = {
      success: true,
      data: {
        ...restream,
        status: 'capturing'
      },
      message: 'YouTube restream started successfully',
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  }

  // Listar re-streams do usuário
  async getUserRestreams(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { status, limit = 20, offset = 0 } = req.query;

    let query_text = `
      SELECT yr.*, s.title as stream_title
      FROM youtube_restreams yr
      LEFT JOIN streams s ON yr.stream_id = s.id
      WHERE yr.user_id = $1
    `;
    let params = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query_text += ` AND yr.status = $${paramCount}`;
      params.push(status as string);
    }

    query_text += ' ORDER BY yr.created_at DESC';

    if (limit) {
      paramCount++;
      query_text += ` LIMIT $${paramCount}`;
      params.push(Number(limit));

      if (offset) {
        paramCount++;
        query_text += ` OFFSET $${paramCount}`;
        params.push(Number(offset));
      }
    }

    const result = await query(query_text, params);

    const response: ApiResponse<YouTubeRestream[]> = {
      success: true,
      data: result.rows,
      message: 'Restreams retrieved successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  }

  // Obter re-stream específico
  async getRestream(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;

    const result = await query(
      `SELECT yr.*, s.title as stream_title, s.status as stream_status
       FROM youtube_restreams yr
       LEFT JOIN streams s ON yr.stream_id = s.id
       WHERE yr.id = $1 AND yr.user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new CustomError('Restream not found', 404);
    }

    const restream = result.rows[0];

    // Obter estatísticas em tempo real se estiver ativo
    if (restream.status === 'streaming') {
      const stats = await restreamService.getRestreamStats(id);
      restream.stats = stats;
    }

    const response: ApiResponse<YouTubeRestream> = {
      success: true,
      data: restream,
      message: 'Restream retrieved successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  }

  // Parar re-stream
  async stopRestream(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verificar se o re-stream existe e pertence ao usuário
    const result = await query(
      'SELECT * FROM youtube_restreams WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new CustomError('Restream not found', 404);
    }

    const restream = result.rows[0];

    if (!['capturing', 'streaming'].includes(restream.status)) {
      throw new CustomError('Restream is not active', 400);
    }

    try {
      // Parar processo de captura
      await restreamService.stopYouTubeCapture(id);

      // Atualizar status no banco
      await query(
        'UPDATE youtube_restreams SET status = $1, ended_at = NOW() WHERE id = $2',
        ['ended', id]
      );

      logger.info(`YouTube restream stopped: ${id} by user ${userId}`);

      const response: ApiResponse = {
        success: true,
        message: 'Restream stopped successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error(`Failed to stop restream ${id}:`, error);
      throw new CustomError('Failed to stop restream', 500);
    }
  }

  // Deletar re-stream
  async deleteRestream(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verificar se o re-stream existe e pertence ao usuário
    const result = await query(
      'SELECT * FROM youtube_restreams WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new CustomError('Restream not found', 404);
    }

    const restream = result.rows[0];

    // Não permitir deletar re-streams ativos
    if (['capturing', 'streaming'].includes(restream.status)) {
      throw new CustomError('Cannot delete active restream. Stop it first.', 400);
    }

    await query('DELETE FROM youtube_restreams WHERE id = $1', [id]);

    logger.info(`YouTube restream deleted: ${id} by user ${userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Restream deleted successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  }

  // Obter informações de um vídeo do YouTube (preview)
  async getYouTubeVideoInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      throw new CustomError('YouTube URL is required', 400);
    }

    if (!restreamService.isValidYouTubeUrl(url)) {
      throw new CustomError('Invalid YouTube URL', 400);
    }

    try {
      const videoInfo = await restreamService.getYouTubeVideoInfo(url);

      const response: ApiResponse = {
        success: true,
        data: videoInfo,
        message: 'Video information retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to get YouTube video info:', error);
      throw new CustomError('Failed to retrieve video information', 500);
    }
  }

  // Obter estatísticas de re-stream
  async getRestreamStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verificar se o re-stream existe e pertence ao usuário
    const result = await query(
      'SELECT * FROM youtube_restreams WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new CustomError('Restream not found', 404);
    }

    try {
      const stats = await restreamService.getRestreamStats(id);

      const response: ApiResponse = {
        success: true,
        data: stats,
        message: 'Restream statistics retrieved successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error(`Failed to get restream stats for ${id}:`, error);
      throw new CustomError('Failed to retrieve statistics', 500);
    }
  }

  // Configurar overlays para re-stream
  async configureOverlays(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { overlays } = req.body;
    const userId = req.user!.id;

    // Verificar se o re-stream existe e pertence ao usuário
    const result = await query(
      'SELECT * FROM youtube_restreams WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new CustomError('Restream not found', 404);
    }

    try {
      await restreamService.configureOverlays(id, overlays);

      const response: ApiResponse = {
        success: true,
        message: 'Overlays configured successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      logger.error(`Failed to configure overlays for restream ${id}:`, error);
      throw new CustomError('Failed to configure overlays', 500);
    }
  }

  // Webhook para notificações do processo de captura
  async captureWebhook(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { restreamId, event, data } = req.body;

    try {
      switch (event) {
        case 'capture_started':
          await query(
            'UPDATE youtube_restreams SET status = $1 WHERE id = $2',
            ['streaming', restreamId]
          );
          break;

        case 'capture_ended':
          await query(
            'UPDATE youtube_restreams SET status = $1, ended_at = NOW() WHERE id = $2',
            ['ended', restreamId]
          );
          break;

        case 'capture_error':
          await query(
            'UPDATE youtube_restreams SET status = $1, error_message = $2 WHERE id = $3',
            ['error', data.error, restreamId]
          );
          break;

        default:
          logger.warn(`Unknown capture webhook event: ${event}`);
      }

      logger.info(`Capture webhook processed: ${event} for restream ${restreamId}`);

      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to process capture webhook:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  // Listar re-streams públicos (para visualização)
  async getPublicRestreams(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { limit = 20, offset = 0 } = req.query;

    const result = await query(
      `SELECT yr.id, yr.title, yr.description, yr.thumbnail_url, yr.started_at,
              u.username, u.full_name
       FROM youtube_restreams yr
       JOIN users u ON yr.user_id = u.id
       WHERE yr.status = 'streaming'
       ORDER BY yr.started_at DESC
       LIMIT $1 OFFSET $2`,
      [Number(limit), Number(offset)]
    );

    const response: ApiResponse = {
      success: true,
      data: result.rows,
      message: 'Public restreams retrieved successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  }
}

export const restreamController = new RestreamController();

