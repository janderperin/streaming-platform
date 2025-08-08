import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { CustomError } from '../middleware/errorHandler';
import { rtmpService } from './rtmpService';

interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  isLive: boolean;
  duration?: string;
  viewCount?: number;
  channelName?: string;
  channelId?: string;
}

interface RestreamStats {
  isActive: boolean;
  viewerCount: number;
  bitrate: number;
  fps: number;
  resolution: string;
  duration: number;
  bytesTransferred: number;
}

interface OverlayConfig {
  type: 'text' | 'image' | 'logo';
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style?: {
    fontSize?: number;
    fontColor?: string;
    backgroundColor?: string;
    opacity?: number;
  };
}

class RestreamService {
  private activeCaptures: Map<string, ChildProcess> = new Map();
  private captureStats: Map<string, RestreamStats> = new Map();

  // Verificar se URL do YouTube é válida
  isValidYouTubeUrl(url: string): boolean {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return youtubeRegex.test(url);
  }

  // Extrair ID do vídeo da URL
  extractVideoId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  // Obter informações do vídeo do YouTube
  async getYouTubeVideoInfo(url: string): Promise<YouTubeVideoInfo> {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      // Usar yt-dlp para obter informações do vídeo
      const ytDlpPath = process.env.YOUTUBE_DL_PATH || 'yt-dlp';
      
      return new Promise((resolve, reject) => {
        const process = spawn(ytDlpPath, [
          '--dump-json',
          '--no-download',
          url
        ]);

        let output = '';
        let errorOutput = '';

        process.stdout.on('data', (data) => {
          output += data.toString();
        });

        process.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        process.on('close', (code) => {
          if (code !== 0) {
            logger.error(`yt-dlp failed with code ${code}: ${errorOutput}`);
            reject(new Error(`Failed to get video info: ${errorOutput}`));
            return;
          }

          try {
            const videoData = JSON.parse(output);
            
            const videoInfo: YouTubeVideoInfo = {
              videoId: videoData.id || videoId,
              title: videoData.title || 'Unknown Title',
              description: videoData.description || '',
              thumbnail: videoData.thumbnail || '',
              isLive: videoData.is_live || false,
              duration: videoData.duration_string,
              viewCount: videoData.view_count,
              channelName: videoData.uploader || videoData.channel,
              channelId: videoData.channel_id
            };

            resolve(videoInfo);
          } catch (parseError) {
            logger.error('Failed to parse yt-dlp output:', parseError);
            reject(new Error('Failed to parse video information'));
          }
        });
      });
    } catch (error) {
      logger.error('Failed to get YouTube video info:', error);
      throw new CustomError('Failed to retrieve video information', 500);
    }
  }

  // Iniciar captura do YouTube
  async startYouTubeCapture(restreamId: string, youtubeUrl: string): Promise<void> {
    try {
      // Gerar chave de stream única para este restream
      const streamKey = `restream_${restreamId}`;
      const outputRtmpUrl = `rtmp://localhost:1935/live/${streamKey}`;

      // Primeiro, obter a URL do stream usando yt-dlp
      const ytDlpPath = process.env.YOUTUBE_DL_PATH || 'yt-dlp';
      
      const getUrlProcess = spawn(ytDlpPath, [
        '--get-url',
        '--format', 'best[ext=mp4]/best',
        youtubeUrl
      ]);

      let streamUrl = '';
      let errorOutput = '';

      getUrlProcess.stdout.on('data', (data) => {
        streamUrl += data.toString();
      });

      getUrlProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      return new Promise((resolve, reject) => {
        getUrlProcess.on('close', (code) => {
          if (code !== 0) {
            logger.error(`yt-dlp failed to get stream URL: ${errorOutput}`);
            reject(new Error(`Failed to get stream URL: ${errorOutput}`));
            return;
          }

          streamUrl = streamUrl.trim();
          
          if (!streamUrl) {
            reject(new Error('No stream URL found'));
            return;
          }

          // Agora, usar FFmpeg para capturar e retransmitir
          const ffmpegArgs = [
            '-i', streamUrl,
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-preset', 'veryfast',
            '-tune', 'zerolatency',
            '-f', 'flv',
            outputRtmpUrl
          ];

          const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
          
          ffmpegProcess.stdout.on('data', (data) => {
            logger.debug(`FFmpeg stdout: ${data}`);
          });

          ffmpegProcess.stderr.on('data', (data) => {
            const output = data.toString();
            logger.debug(`FFmpeg stderr: ${output}`);
            
            // Extrair estatísticas do FFmpeg
            this.parseFFmpegStats(restreamId, output);
          });

          ffmpegProcess.on('close', (code) => {
            logger.info(`YouTube capture process exited with code ${code}`);
            this.activeCaptures.delete(restreamId);
            this.captureStats.delete(restreamId);
            
            // Notificar sobre o fim da captura
            this.notifyWebhook(restreamId, 'capture_ended', { code });
          });

          ffmpegProcess.on('error', (error) => {
            logger.error(`FFmpeg process error: ${error}`);
            this.activeCaptures.delete(restreamId);
            this.captureStats.delete(restreamId);
            
            // Notificar sobre o erro
            this.notifyWebhook(restreamId, 'capture_error', { error: error.message });
          });

          // Armazenar processo ativo
          this.activeCaptures.set(restreamId, ffmpegProcess);
          
          // Inicializar estatísticas
          this.captureStats.set(restreamId, {
            isActive: true,
            viewerCount: 0,
            bitrate: 0,
            fps: 0,
            resolution: '0x0',
            duration: 0,
            bytesTransferred: 0
          });

          logger.info(`YouTube capture started: ${youtubeUrl} -> ${streamKey}`);
          
          // Notificar sobre o início da captura
          this.notifyWebhook(restreamId, 'capture_started', { streamKey });
          
          resolve();
        });
      });
    } catch (error) {
      logger.error(`Failed to start YouTube capture for ${restreamId}:`, error);
      throw new CustomError('Failed to start YouTube capture', 500);
    }
  }

  // Parar captura do YouTube
  async stopYouTubeCapture(restreamId: string): Promise<void> {
    try {
      const process = this.activeCaptures.get(restreamId);
      
      if (process) {
        process.kill('SIGTERM');
        this.activeCaptures.delete(restreamId);
        this.captureStats.delete(restreamId);
        
        logger.info(`YouTube capture stopped: ${restreamId}`);
      } else {
        logger.warn(`No active capture found for restream: ${restreamId}`);
      }
    } catch (error) {
      logger.error(`Failed to stop YouTube capture for ${restreamId}:`, error);
      throw new CustomError('Failed to stop YouTube capture', 500);
    }
  }

  // Obter estatísticas do restream
  async getRestreamStats(restreamId: string): Promise<RestreamStats> {
    const stats = this.captureStats.get(restreamId);
    
    if (!stats) {
      return {
        isActive: false,
        viewerCount: 0,
        bitrate: 0,
        fps: 0,
        resolution: '0x0',
        duration: 0,
        bytesTransferred: 0
      };
    }

    return { ...stats };
  }

  // Configurar overlays
  async configureOverlays(restreamId: string, overlays: OverlayConfig[]): Promise<void> {
    try {
      // Esta é uma implementação simplificada
      // Em uma implementação real, você reconfiguraria o FFmpeg com filtros de overlay
      
      logger.info(`Overlays configured for restream ${restreamId}:`, overlays);
      
      // Aqui você poderia:
      // 1. Parar o processo atual
      // 2. Recriar o comando FFmpeg com filtros de overlay
      // 3. Reiniciar o processo
      
      // Por enquanto, apenas log
      overlays.forEach((overlay, index) => {
        logger.info(`Overlay ${index + 1}: ${overlay.type} at (${overlay.position.x}, ${overlay.position.y})`);
      });
      
    } catch (error) {
      logger.error(`Failed to configure overlays for ${restreamId}:`, error);
      throw new CustomError('Failed to configure overlays', 500);
    }
  }

  // Verificar se restream está ativo
  isRestreamActive(restreamId: string): boolean {
    return this.activeCaptures.has(restreamId);
  }

  // Obter lista de restreams ativos
  getActiveRestreams(): string[] {
    return Array.from(this.activeCaptures.keys());
  }

  // Parsear estatísticas do FFmpeg
  private parseFFmpegStats(restreamId: string, output: string): void {
    const stats = this.captureStats.get(restreamId);
    if (!stats) return;

    try {
      // Extrair informações do output do FFmpeg
      const bitrateMatch = output.match(/bitrate=\s*([0-9.]+)kbits\/s/);
      const fpsMatch = output.match(/fps=\s*([0-9.]+)/);
      const sizeMatch = output.match(/size=\s*([0-9]+)kB/);
      const timeMatch = output.match(/time=([0-9:]+\.[0-9]+)/);

      if (bitrateMatch) {
        stats.bitrate = parseFloat(bitrateMatch[1]);
      }

      if (fpsMatch) {
        stats.fps = parseFloat(fpsMatch[1]);
      }

      if (sizeMatch) {
        stats.bytesTransferred = parseInt(sizeMatch[1]) * 1024; // Convert kB to bytes
      }

      if (timeMatch) {
        const timeParts = timeMatch[1].split(':');
        const hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1]);
        const seconds = parseFloat(timeParts[2]);
        stats.duration = hours * 3600 + minutes * 60 + seconds;
      }

      this.captureStats.set(restreamId, stats);
    } catch (error) {
      logger.debug(`Failed to parse FFmpeg stats: ${error}`);
    }
  }

  // Notificar webhook sobre eventos
  private async notifyWebhook(restreamId: string, event: string, data: any): Promise<void> {
    try {
      const webhookUrl = process.env.RESTREAM_WEBHOOK_URL;
      if (!webhookUrl) return;

      await axios.post(webhookUrl, {
        restreamId,
        event,
        data,
        timestamp: new Date().toISOString()
      }, {
        timeout: 5000
      });
    } catch (error) {
      logger.error(`Failed to send webhook notification: ${error}`);
    }
  }

  // Limpar processos órfãos
  cleanup(): void {
    for (const [restreamId, process] of this.activeCaptures) {
      try {
        process.kill('SIGTERM');
        logger.info(`Cleaned up restream process: ${restreamId}`);
      } catch (error) {
        logger.error(`Failed to cleanup restream process ${restreamId}:`, error);
      }
    }
    
    this.activeCaptures.clear();
    this.captureStats.clear();
  }

  // Obter informações de um canal do YouTube
  async getChannelInfo(channelId: string): Promise<any> {
    try {
      // Esta seria uma implementação usando a API do YouTube
      // Por enquanto, retornar dados simulados
      return {
        id: channelId,
        name: 'Canal Exemplo',
        description: 'Descrição do canal',
        subscriberCount: 1000,
        videoCount: 50,
        thumbnail: 'https://example.com/thumbnail.jpg'
      };
    } catch (error) {
      logger.error(`Failed to get channel info for ${channelId}:`, error);
      throw new CustomError('Failed to get channel information', 500);
    }
  }

  // Verificar se um stream do YouTube está ao vivo
  async isYouTubeLive(videoId: string): Promise<boolean> {
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const videoInfo = await this.getYouTubeVideoInfo(url);
      return videoInfo.isLive;
    } catch (error) {
      logger.error(`Failed to check if YouTube video ${videoId} is live:`, error);
      return false;
    }
  }

  // Obter qualidades disponíveis de um stream
  async getAvailableQualities(youtubeUrl: string): Promise<string[]> {
    try {
      const ytDlpPath = process.env.YOUTUBE_DL_PATH || 'yt-dlp';
      
      return new Promise((resolve, reject) => {
        const process = spawn(ytDlpPath, [
          '--list-formats',
          youtubeUrl
        ]);

        let output = '';
        
        process.stdout.on('data', (data) => {
          output += data.toString();
        });

        process.on('close', (code) => {
          if (code !== 0) {
            reject(new Error('Failed to get available qualities'));
            return;
          }

          // Parsear output para extrair qualidades
          const qualities = this.parseQualitiesFromOutput(output);
          resolve(qualities);
        });
      });
    } catch (error) {
      logger.error('Failed to get available qualities:', error);
      return ['best'];
    }
  }

  // Parsear qualidades do output do yt-dlp
  private parseQualitiesFromOutput(output: string): string[] {
    const qualities: string[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('mp4') && line.includes('video')) {
        const match = line.match(/(\d+p)/);
        if (match) {
          qualities.push(match[1]);
        }
      }
    }

    return qualities.length > 0 ? qualities : ['best'];
  }
}

export const restreamService = new RestreamService();

// Cleanup ao sair da aplicação
process.on('SIGTERM', () => {
  restreamService.cleanup();
});

process.on('SIGINT', () => {
  restreamService.cleanup();
});

