import { spawn, ChildProcess } from 'child_process';
import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { CustomError } from '../middleware/errorHandler';
import { query } from '../config/database';
import { storageService } from './storageService';
import { rtmpService } from './rtmpService';

interface ScheduledVideo {
  id: string;
  userId: string;
  videoId: string;
  title: string;
  scheduledAt: Date;
  duration: number; // em segundos
  status: 'scheduled' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  streamKey?: string;
  multistream?: boolean;
  overlays?: any[];
  createdAt: Date;
  updatedAt: Date;
}

interface PlaylistItem {
  id: string;
  videoId: string;
  title: string;
  duration: number;
  filePath: string;
  thumbnailPath?: string;
  order: number;
}

interface TVChannel {
  id: string;
  userId: string;
  name: string;
  description: string;
  isActive: boolean;
  streamKey: string;
  playlist: PlaylistItem[];
  currentVideoIndex: number;
  loopPlaylist: boolean;
  multistream: boolean;
  overlays: any[];
  createdAt: Date;
  updatedAt: Date;
}

class SchedulerService {
  private activeStreams: Map<string, ChildProcess> = new Map();
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();
  private tvChannels: Map<string, TVChannel> = new Map();
  private channelProcesses: Map<string, ChildProcess> = new Map();

  constructor() {
    this.initializeScheduler();
    this.loadTVChannels();
  }

  // Inicializar scheduler e carregar agendamentos existentes
  private async initializeScheduler() {
    try {
      // Carregar agendamentos pendentes do banco
      const result = await query(`
        SELECT * FROM scheduled_videos 
        WHERE status = 'scheduled' AND scheduled_at > NOW()
        ORDER BY scheduled_at ASC
      `);

      for (const schedule of result.rows) {
        await this.scheduleVideo(schedule);
      }

      logger.info(`Loaded ${result.rows.length} scheduled videos`);
    } catch (error) {
      logger.error('Failed to initialize scheduler:', error);
    }
  }

  // Carregar canais de TV ativos
  private async loadTVChannels() {
    try {
      const result = await query(`
        SELECT tc.*, 
               json_agg(
                 json_build_object(
                   'id', pi.id,
                   'videoId', pi.video_id,
                   'title', v.title,
                   'duration', v.duration,
                   'filePath', v.file_key,
                   'thumbnailPath', v.thumbnail_key,
                   'order', pi.order_index
                 ) ORDER BY pi.order_index
               ) as playlist
        FROM tv_channels tc
        LEFT JOIN playlist_items pi ON tc.id = pi.channel_id
        LEFT JOIN videos v ON pi.video_id = v.id
        WHERE tc.is_active = true
        GROUP BY tc.id
      `);

      for (const channel of result.rows) {
        this.tvChannels.set(channel.id, {
          ...channel,
          playlist: channel.playlist.filter((item: any) => item.videoId !== null)
        });

        // Iniciar canal se estiver ativo
        if (channel.is_active) {
          await this.startTVChannel(channel.id);
        }
      }

      logger.info(`Loaded ${result.rows.length} TV channels`);
    } catch (error) {
      logger.error('Failed to load TV channels:', error);
    }
  }

  // Agendar um vídeo específico
  async scheduleVideo(videoData: any): Promise<string> {
    try {
      const scheduleId = uuidv4();
      const scheduledAt = new Date(videoData.scheduledAt);

      // Validar se a data é futura
      if (scheduledAt <= new Date()) {
        throw new CustomError('Scheduled time must be in the future', 400);
      }

      // Obter informações do vídeo
      const videoResult = await query(
        'SELECT * FROM videos WHERE id = $1 AND user_id = $2',
        [videoData.videoId, videoData.userId]
      );

      if (videoResult.rows.length === 0) {
        throw new CustomError('Video not found', 404);
      }

      const video = videoResult.rows[0];

      // Salvar agendamento no banco
      await query(`
        INSERT INTO scheduled_videos (
          id, user_id, video_id, title, scheduled_at, duration, 
          status, stream_key, multistream, overlays
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        scheduleId,
        videoData.userId,
        videoData.videoId,
        videoData.title || video.title,
        scheduledAt,
        video.duration,
        'scheduled',
        videoData.streamKey || `scheduled_${scheduleId}`,
        videoData.multistream || false,
        JSON.stringify(videoData.overlays || [])
      ]);

      // Criar job do cron
      const cronExpression = this.dateToCron(scheduledAt);
      const job = cron.schedule(cronExpression, async () => {
        await this.executeScheduledVideo(scheduleId);
      }, {
        scheduled: false,
        timezone: 'America/Sao_Paulo'
      });

      job.start();
      this.scheduledJobs.set(scheduleId, job);

      logger.info(`Video scheduled: ${scheduleId} at ${scheduledAt}`);
      return scheduleId;
    } catch (error) {
      logger.error('Failed to schedule video:', error);
      throw new CustomError('Failed to schedule video', 500);
    }
  }

  // Executar vídeo agendado
  private async executeScheduledVideo(scheduleId: string) {
    try {
      // Obter dados do agendamento
      const result = await query(
        'SELECT sv.*, v.file_key, v.title as video_title FROM scheduled_videos sv JOIN videos v ON sv.video_id = v.id WHERE sv.id = $1',
        [scheduleId]
      );

      if (result.rows.length === 0) {
        logger.error(`Scheduled video not found: ${scheduleId}`);
        return;
      }

      const schedule = result.rows[0];

      // Atualizar status para streaming
      await query(
        'UPDATE scheduled_videos SET status = $1, updated_at = NOW() WHERE id = $2',
        ['streaming', scheduleId]
      );

      // Obter URL do vídeo do storage
      const videoUrl = await storageService.generateDownloadUrl(schedule.file_key);

      // Iniciar stream do vídeo
      await this.startVideoStream(scheduleId, videoUrl, schedule);

      logger.info(`Started scheduled video stream: ${scheduleId}`);
    } catch (error) {
      logger.error(`Failed to execute scheduled video ${scheduleId}:`, error);
      
      // Atualizar status para failed
      await query(
        'UPDATE scheduled_videos SET status = $1, updated_at = NOW() WHERE id = $2',
        ['failed', scheduleId]
      );
    }
  }

  // Iniciar stream de vídeo
  private async startVideoStream(scheduleId: string, videoUrl: string, schedule: any) {
    try {
      const outputRtmpUrl = `rtmp://localhost:1935/live/${schedule.stream_key}`;

      // Construir comando FFmpeg
      const ffmpegArgs = [
        '-re', // Read input at native frame rate
        '-i', videoUrl,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-preset', 'veryfast',
        '-tune', 'zerolatency',
        '-f', 'flv',
        outputRtmpUrl
      ];

      // Adicionar overlays se especificados
      if (schedule.overlays && schedule.overlays.length > 0) {
        // Implementar lógica de overlays aqui
        // Por exemplo: -vf "drawtext=text='LIVE':x=10:y=10:fontsize=24:fontcolor=red"
      }

      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

      ffmpegProcess.stdout.on('data', (data) => {
        logger.debug(`FFmpeg stdout: ${data}`);
      });

      ffmpegProcess.stderr.on('data', (data) => {
        logger.debug(`FFmpeg stderr: ${data}`);
      });

      ffmpegProcess.on('close', async (code) => {
        logger.info(`Scheduled video stream ended: ${scheduleId}, code: ${code}`);
        
        // Atualizar status para completed
        await query(
          'UPDATE scheduled_videos SET status = $1, updated_at = NOW() WHERE id = $2',
          ['completed', scheduleId]
        );

        // Remover do mapa de streams ativos
        this.activeStreams.delete(scheduleId);
      });

      ffmpegProcess.on('error', async (error) => {
        logger.error(`FFmpeg process error for ${scheduleId}:`, error);
        
        // Atualizar status para failed
        await query(
          'UPDATE scheduled_videos SET status = $1, updated_at = NOW() WHERE id = $2',
          ['failed', scheduleId]
        );

        this.activeStreams.delete(scheduleId);
      });

      // Armazenar processo ativo
      this.activeStreams.set(scheduleId, ffmpegProcess);

    } catch (error) {
      logger.error(`Failed to start video stream for ${scheduleId}:`, error);
      throw error;
    }
  }

  // Criar canal de TV 24h
  async createTVChannel(channelData: any): Promise<string> {
    try {
      const channelId = uuidv4();
      const streamKey = `tv_${channelId}`;

      // Salvar canal no banco
      await query(`
        INSERT INTO tv_channels (
          id, user_id, name, description, is_active, stream_key,
          loop_playlist, multistream, overlays
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        channelId,
        channelData.userId,
        channelData.name,
        channelData.description,
        false, // Inicialmente inativo
        streamKey,
        channelData.loopPlaylist || true,
        channelData.multistream || false,
        JSON.stringify(channelData.overlays || [])
      ]);

      // Adicionar vídeos à playlist se fornecidos
      if (channelData.playlist && channelData.playlist.length > 0) {
        for (let i = 0; i < channelData.playlist.length; i++) {
          const video = channelData.playlist[i];
          await query(`
            INSERT INTO playlist_items (id, channel_id, video_id, order_index)
            VALUES ($1, $2, $3, $4)
          `, [uuidv4(), channelId, video.videoId, i]);
        }
      }

      logger.info(`TV Channel created: ${channelId}`);
      return channelId;
    } catch (error) {
      logger.error('Failed to create TV channel:', error);
      throw new CustomError('Failed to create TV channel', 500);
    }
  }

  // Iniciar canal de TV
  async startTVChannel(channelId: string) {
    try {
      const channel = this.tvChannels.get(channelId);
      if (!channel) {
        throw new CustomError('TV Channel not found', 404);
      }

      if (channel.playlist.length === 0) {
        throw new CustomError('TV Channel playlist is empty', 400);
      }

      // Atualizar status no banco
      await query(
        'UPDATE tv_channels SET is_active = true, updated_at = NOW() WHERE id = $1',
        [channelId]
      );

      // Iniciar reprodução contínua
      await this.playNextVideo(channelId);

      logger.info(`TV Channel started: ${channelId}`);
    } catch (error) {
      logger.error(`Failed to start TV channel ${channelId}:`, error);
      throw error;
    }
  }

  // Reproduzir próximo vídeo do canal
  private async playNextVideo(channelId: string) {
    try {
      const channel = this.tvChannels.get(channelId);
      if (!channel || !channel.isActive) {
        return;
      }

      const currentVideo = channel.playlist[channel.currentVideoIndex];
      if (!currentVideo) {
        logger.warn(`No video found at index ${channel.currentVideoIndex} for channel ${channelId}`);
        return;
      }

      // Obter URL do vídeo
      const videoUrl = await storageService.generateDownloadUrl(currentVideo.filePath);

      // Iniciar stream
      await this.startChannelVideoStream(channelId, videoUrl, currentVideo);

      // Agendar próximo vídeo
      setTimeout(() => {
        this.moveToNextVideo(channelId);
      }, (currentVideo.duration + 2) * 1000); // +2 segundos de buffer

    } catch (error) {
      logger.error(`Failed to play next video for channel ${channelId}:`, error);
      
      // Tentar próximo vídeo em caso de erro
      setTimeout(() => {
        this.moveToNextVideo(channelId);
      }, 5000);
    }
  }

  // Mover para próximo vídeo na playlist
  private async moveToNextVideo(channelId: string) {
    const channel = this.tvChannels.get(channelId);
    if (!channel) return;

    // Parar stream atual se existir
    const currentProcess = this.channelProcesses.get(channelId);
    if (currentProcess) {
      currentProcess.kill('SIGTERM');
      this.channelProcesses.delete(channelId);
    }

    // Avançar para próximo vídeo
    channel.currentVideoIndex++;

    // Verificar se chegou ao fim da playlist
    if (channel.currentVideoIndex >= channel.playlist.length) {
      if (channel.loopPlaylist) {
        channel.currentVideoIndex = 0; // Reiniciar playlist
      } else {
        // Parar canal
        await this.stopTVChannel(channelId);
        return;
      }
    }

    // Atualizar índice no banco
    await query(
      'UPDATE tv_channels SET current_video_index = $1 WHERE id = $2',
      [channel.currentVideoIndex, channelId]
    );

    // Reproduzir próximo vídeo
    await this.playNextVideo(channelId);
  }

  // Iniciar stream de vídeo do canal
  private async startChannelVideoStream(channelId: string, videoUrl: string, video: PlaylistItem) {
    try {
      const channel = this.tvChannels.get(channelId);
      if (!channel) return;

      const outputRtmpUrl = `rtmp://localhost:1935/live/${channel.streamKey}`;

      const ffmpegArgs = [
        '-re',
        '-i', videoUrl,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-preset', 'veryfast',
        '-tune', 'zerolatency',
        '-f', 'flv',
        outputRtmpUrl
      ];

      // Adicionar overlays do canal
      if (channel.overlays && channel.overlays.length > 0) {
        // Implementar overlays específicos do canal
      }

      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

      ffmpegProcess.on('error', (error) => {
        logger.error(`Channel video stream error for ${channelId}:`, error);
      });

      this.channelProcesses.set(channelId, ffmpegProcess);

      logger.info(`Playing video "${video.title}" on channel ${channelId}`);
    } catch (error) {
      logger.error(`Failed to start channel video stream:`, error);
      throw error;
    }
  }

  // Parar canal de TV
  async stopTVChannel(channelId: string) {
    try {
      // Parar processo FFmpeg
      const process = this.channelProcesses.get(channelId);
      if (process) {
        process.kill('SIGTERM');
        this.channelProcesses.delete(channelId);
      }

      // Atualizar status no banco
      await query(
        'UPDATE tv_channels SET is_active = false, updated_at = NOW() WHERE id = $1',
        [channelId]
      );

      // Atualizar cache local
      const channel = this.tvChannels.get(channelId);
      if (channel) {
        channel.isActive = false;
      }

      logger.info(`TV Channel stopped: ${channelId}`);
    } catch (error) {
      logger.error(`Failed to stop TV channel ${channelId}:`, error);
      throw error;
    }
  }

  // Cancelar vídeo agendado
  async cancelScheduledVideo(scheduleId: string, userId: string) {
    try {
      // Verificar se o agendamento existe e pertence ao usuário
      const result = await query(
        'SELECT * FROM scheduled_videos WHERE id = $1 AND user_id = $2',
        [scheduleId, userId]
      );

      if (result.rows.length === 0) {
        throw new CustomError('Scheduled video not found', 404);
      }

      const schedule = result.rows[0];

      // Parar stream se estiver ativo
      const activeProcess = this.activeStreams.get(scheduleId);
      if (activeProcess) {
        activeProcess.kill('SIGTERM');
        this.activeStreams.delete(scheduleId);
      }

      // Cancelar job do cron
      const cronJob = this.scheduledJobs.get(scheduleId);
      if (cronJob) {
        cronJob.stop();
        cronJob.destroy();
        this.scheduledJobs.delete(scheduleId);
      }

      // Atualizar status no banco
      await query(
        'UPDATE scheduled_videos SET status = $1, updated_at = NOW() WHERE id = $2',
        ['cancelled', scheduleId]
      );

      logger.info(`Scheduled video cancelled: ${scheduleId}`);
    } catch (error) {
      logger.error(`Failed to cancel scheduled video ${scheduleId}:`, error);
      throw error;
    }
  }

  // Obter agendamentos do usuário
  async getUserScheduledVideos(userId: string) {
    try {
      const result = await query(`
        SELECT sv.*, v.title as video_title, v.thumbnail_key
        FROM scheduled_videos sv
        JOIN videos v ON sv.video_id = v.id
        WHERE sv.user_id = $1
        ORDER BY sv.scheduled_at DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get user scheduled videos:', error);
      throw new CustomError('Failed to get scheduled videos', 500);
    }
  }

  // Obter canais de TV do usuário
  async getUserTVChannels(userId: string) {
    try {
      const result = await query(`
        SELECT tc.*, 
               COUNT(pi.id) as video_count,
               COALESCE(SUM(v.duration), 0) as total_duration
        FROM tv_channels tc
        LEFT JOIN playlist_items pi ON tc.id = pi.channel_id
        LEFT JOIN videos v ON pi.video_id = v.id
        WHERE tc.user_id = $1
        GROUP BY tc.id
        ORDER BY tc.created_at DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get user TV channels:', error);
      throw new CustomError('Failed to get TV channels', 500);
    }
  }

  // Converter data para expressão cron
  private dateToCron(date: Date): string {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    
    return `${minute} ${hour} ${day} ${month} *`;
  }

  // Limpar recursos
  cleanup() {
    // Parar todos os jobs do cron
    for (const [id, job] of this.scheduledJobs) {
      job.stop();
      job.destroy();
    }
    this.scheduledJobs.clear();

    // Parar todos os streams ativos
    for (const [id, process] of this.activeStreams) {
      process.kill('SIGTERM');
    }
    this.activeStreams.clear();

    // Parar todos os canais de TV
    for (const [id, process] of this.channelProcesses) {
      process.kill('SIGTERM');
    }
    this.channelProcesses.clear();

    logger.info('Scheduler service cleaned up');
  }
}

export const schedulerService = new SchedulerService();

// Cleanup ao sair da aplicação
process.on('SIGTERM', () => {
  schedulerService.cleanup();
});

process.on('SIGINT', () => {
  schedulerService.cleanup();
});

