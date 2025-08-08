import { Request, Response } from 'express';
import { schedulerService } from '../services/schedulerService';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

export class SchedulerController {
  // Agendar um vídeo específico
  async scheduleVideo(req: AuthenticatedRequest, res: Response) {
    try {
      const { videoId, scheduledAt, title, multistream, overlays } = req.body;
      const userId = req.user!.id;

      if (!videoId || !scheduledAt) {
        throw new CustomError('Video ID and scheduled time are required', 400);
      }

      const scheduleId = await schedulerService.scheduleVideo({
        userId,
        videoId,
        scheduledAt,
        title,
        multistream,
        overlays
      });

      res.json({
        success: true,
        data: {
          scheduleId,
          message: 'Video scheduled successfully'
        }
      });
    } catch (error) {
      logger.error('Failed to schedule video:', error);
      throw error;
    }
  }

  // Listar vídeos agendados do usuário
  async getUserScheduledVideos(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const scheduledVideos = await schedulerService.getUserScheduledVideos(userId);

      res.json({
        success: true,
        data: scheduledVideos
      });
    } catch (error) {
      logger.error('Failed to get scheduled videos:', error);
      throw error;
    }
  }

  // Cancelar vídeo agendado
  async cancelScheduledVideo(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      await schedulerService.cancelScheduledVideo(id, userId);

      res.json({
        success: true,
        message: 'Scheduled video cancelled successfully'
      });
    } catch (error) {
      logger.error('Failed to cancel scheduled video:', error);
      throw error;
    }
  }

  // Criar canal de TV 24h
  async createTVChannel(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, description, playlist, loopPlaylist, multistream, overlays } = req.body;
      const userId = req.user!.id;

      if (!name) {
        throw new CustomError('Channel name is required', 400);
      }

      const channelId = await schedulerService.createTVChannel({
        userId,
        name,
        description,
        playlist,
        loopPlaylist,
        multistream,
        overlays
      });

      res.json({
        success: true,
        data: {
          channelId,
          message: 'TV Channel created successfully'
        }
      });
    } catch (error) {
      logger.error('Failed to create TV channel:', error);
      throw error;
    }
  }

  // Listar canais de TV do usuário
  async getUserTVChannels(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const channels = await schedulerService.getUserTVChannels(userId);

      res.json({
        success: true,
        data: channels
      });
    } catch (error) {
      logger.error('Failed to get TV channels:', error);
      throw error;
    }
  }

  // Iniciar canal de TV
  async startTVChannel(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Verificar se o canal pertence ao usuário
      const channels = await schedulerService.getUserTVChannels(userId);
      const channel = channels.find(c => c.id === id);

      if (!channel) {
        throw new CustomError('TV Channel not found', 404);
      }

      await schedulerService.startTVChannel(id);

      res.json({
        success: true,
        message: 'TV Channel started successfully'
      });
    } catch (error) {
      logger.error('Failed to start TV channel:', error);
      throw error;
    }
  }

  // Parar canal de TV
  async stopTVChannel(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Verificar se o canal pertence ao usuário
      const channels = await schedulerService.getUserTVChannels(userId);
      const channel = channels.find(c => c.id === id);

      if (!channel) {
        throw new CustomError('TV Channel not found', 404);
      }

      await schedulerService.stopTVChannel(id);

      res.json({
        success: true,
        message: 'TV Channel stopped successfully'
      });
    } catch (error) {
      logger.error('Failed to stop TV channel:', error);
      throw error;
    }
  }

  // Obter detalhes de um canal específico
  async getTVChannelDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Verificar se o canal pertence ao usuário
      const channels = await schedulerService.getUserTVChannels(userId);
      const channel = channels.find(c => c.id === id);

      if (!channel) {
        throw new CustomError('TV Channel not found', 404);
      }

      // Obter playlist detalhada
      const playlistResult = await query(`
        SELECT pi.*, v.title, v.duration, v.thumbnail_key, v.file_key
        FROM playlist_items pi
        JOIN videos v ON pi.video_id = v.id
        WHERE pi.channel_id = $1
        ORDER BY pi.order_index
      `, [id]);

      const channelDetails = {
        ...channel,
        playlist: playlistResult.rows
      };

      res.json({
        success: true,
        data: channelDetails
      });
    } catch (error) {
      logger.error('Failed to get TV channel details:', error);
      throw error;
    }
  }

  // Atualizar playlist do canal
  async updateChannelPlaylist(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { playlist } = req.body;
      const userId = req.user!.id;

      // Verificar se o canal pertence ao usuário
      const channels = await schedulerService.getUserTVChannels(userId);
      const channel = channels.find(c => c.id === id);

      if (!channel) {
        throw new CustomError('TV Channel not found', 404);
      }

      // Remover itens existentes da playlist
      await query('DELETE FROM playlist_items WHERE channel_id = $1', [id]);

      // Adicionar novos itens
      for (let i = 0; i < playlist.length; i++) {
        const video = playlist[i];
        await query(`
          INSERT INTO playlist_items (id, channel_id, video_id, order_index)
          VALUES ($1, $2, $3, $4)
        `, [uuidv4(), id, video.videoId, i]);
      }

      res.json({
        success: true,
        message: 'Channel playlist updated successfully'
      });
    } catch (error) {
      logger.error('Failed to update channel playlist:', error);
      throw error;
    }
  }

  // Obter estatísticas de agendamento
  async getSchedulingStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;

      const stats = await query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count,
          COUNT(*) FILTER (WHERE status = 'streaming') as streaming_count,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
          COALESCE(SUM(duration) FILTER (WHERE status = 'completed'), 0) as total_streamed_duration
        FROM scheduled_videos
        WHERE user_id = $1
      `, [userId]);

      const channelStats = await query(`
        SELECT 
          COUNT(*) as total_channels,
          COUNT(*) FILTER (WHERE is_active = true) as active_channels,
          COALESCE(SUM(video_count), 0) as total_videos_in_playlists
        FROM (
          SELECT tc.id, tc.is_active, COUNT(pi.id) as video_count
          FROM tv_channels tc
          LEFT JOIN playlist_items pi ON tc.id = pi.channel_id
          WHERE tc.user_id = $1
          GROUP BY tc.id, tc.is_active
        ) as channel_summary
      `, [userId]);

      res.json({
        success: true,
        data: {
          scheduledVideos: stats.rows[0],
          tvChannels: channelStats.rows[0]
        }
      });
    } catch (error) {
      logger.error('Failed to get scheduling stats:', error);
      throw error;
    }
  }

  // Obter próximos agendamentos
  async getUpcomingSchedules(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await query(`
        SELECT sv.*, v.title as video_title, v.thumbnail_key
        FROM scheduled_videos sv
        JOIN videos v ON sv.video_id = v.id
        WHERE sv.user_id = $1 AND sv.status = 'scheduled' AND sv.scheduled_at > NOW()
        ORDER BY sv.scheduled_at ASC
        LIMIT $2
      `, [userId, limit]);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      logger.error('Failed to get upcoming schedules:', error);
      throw error;
    }
  }

  // Duplicar agendamento
  async duplicateSchedule(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { scheduledAt } = req.body;
      const userId = req.user!.id;

      if (!scheduledAt) {
        throw new CustomError('New scheduled time is required', 400);
      }

      // Obter agendamento original
      const result = await query(
        'SELECT * FROM scheduled_videos WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (result.rows.length === 0) {
        throw new CustomError('Scheduled video not found', 404);
      }

      const original = result.rows[0];

      // Criar novo agendamento
      const newScheduleId = await schedulerService.scheduleVideo({
        userId,
        videoId: original.video_id,
        scheduledAt,
        title: original.title,
        multistream: original.multistream,
        overlays: original.overlays
      });

      res.json({
        success: true,
        data: {
          scheduleId: newScheduleId,
          message: 'Schedule duplicated successfully'
        }
      });
    } catch (error) {
      logger.error('Failed to duplicate schedule:', error);
      throw error;
    }
  }
}

export const schedulerController = new SchedulerController();

