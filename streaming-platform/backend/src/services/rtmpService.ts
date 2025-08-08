import axios from 'axios';
import { spawn, ChildProcess } from 'child_process';
import { logger } from '../utils/logger';
import { CustomError } from '../middleware/errorHandler';

interface RTMPStats {
  isLive: boolean;
  viewerCount: number;
  bitrate: number;
  fps: number;
  resolution: string;
  duration: number;
}

class RTMPService {
  private nginxStatsUrl: string;
  private activeStreams: Map<string, ChildProcess> = new Map();

  constructor() {
    this.nginxStatsUrl = process.env.NGINX_STATS_URL || 'http://localhost:8080/stat';
  }

  // Iniciar stream
  async startStream(streamKey: string): Promise<void> {
    try {
      // Notificar Nginx RTMP sobre o início do stream
      logger.info(`Starting stream: ${streamKey}`);
      
      // Aqui você pode adicionar lógica adicional para configurar o stream
      // Por exemplo, configurar gravação, multistream, etc.
      
    } catch (error) {
      logger.error(`Failed to start stream ${streamKey}:`, error);
      throw new CustomError('Failed to start stream', 500);
    }
  }

  // Parar stream
  async stopStream(streamKey: string): Promise<void> {
    try {
      logger.info(`Stopping stream: ${streamKey}`);
      
      // Parar processo de captura se existir
      const process = this.activeStreams.get(streamKey);
      if (process) {
        process.kill('SIGTERM');
        this.activeStreams.delete(streamKey);
      }
      
    } catch (error) {
      logger.error(`Failed to stop stream ${streamKey}:`, error);
      throw new CustomError('Failed to stop stream', 500);
    }
  }

  // Obter estatísticas do stream
  async getStreamStats(streamKey: string): Promise<RTMPStats> {
    try {
      const response = await axios.get(this.nginxStatsUrl, {
        timeout: 5000
      });

      const stats = this.parseNginxStats(response.data, streamKey);
      return stats;
      
    } catch (error) {
      logger.error(`Failed to get stream stats for ${streamKey}:`, error);
      
      // Retornar stats padrão em caso de erro
      return {
        isLive: false,
        viewerCount: 0,
        bitrate: 0,
        fps: 0,
        resolution: '0x0',
        duration: 0
      };
    }
  }

  // Configurar gravação
  async startRecording(streamKey: string, outputPath: string): Promise<void> {
    try {
      const rtmpUrl = `rtmp://localhost:1935/live/${streamKey}`;
      
      const ffmpegArgs = [
        '-i', rtmpUrl,
        '-c', 'copy',
        '-f', 'mp4',
        outputPath
      ];

      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
      
      ffmpegProcess.stdout.on('data', (data) => {
        logger.debug(`FFmpeg stdout: ${data}`);
      });

      ffmpegProcess.stderr.on('data', (data) => {
        logger.debug(`FFmpeg stderr: ${data}`);
      });

      ffmpegProcess.on('close', (code) => {
        logger.info(`Recording process exited with code ${code}`);
        this.activeStreams.delete(`recording_${streamKey}`);
      });

      this.activeStreams.set(`recording_${streamKey}`, ffmpegProcess);
      
      logger.info(`Recording started for stream: ${streamKey}`);
      
    } catch (error) {
      logger.error(`Failed to start recording for ${streamKey}:`, error);
      throw new CustomError('Failed to start recording', 500);
    }
  }

  // Parar gravação
  async stopRecording(streamKey: string): Promise<void> {
    try {
      const recordingKey = `recording_${streamKey}`;
      const process = this.activeStreams.get(recordingKey);
      
      if (process) {
        process.kill('SIGTERM');
        this.activeStreams.delete(recordingKey);
        logger.info(`Recording stopped for stream: ${streamKey}`);
      }
      
    } catch (error) {
      logger.error(`Failed to stop recording for ${streamKey}:`, error);
      throw new CustomError('Failed to stop recording', 500);
    }
  }

  // Configurar multistream
  async setupMultistream(streamKey: string, destinations: Array<{platform: string, rtmpUrl: string, streamKey: string}>): Promise<void> {
    try {
      const inputUrl = `rtmp://localhost:1935/live/${streamKey}`;
      
      for (const dest of destinations) {
        const outputUrl = `${dest.rtmpUrl}/${dest.streamKey}`;
        
        const ffmpegArgs = [
          '-i', inputUrl,
          '-c', 'copy',
          '-f', 'flv',
          outputUrl
        ];

        const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
        
        ffmpegProcess.stdout.on('data', (data) => {
          logger.debug(`Multistream ${dest.platform} stdout: ${data}`);
        });

        ffmpegProcess.stderr.on('data', (data) => {
          logger.debug(`Multistream ${dest.platform} stderr: ${data}`);
        });

        ffmpegProcess.on('close', (code) => {
          logger.info(`Multistream ${dest.platform} process exited with code ${code}`);
          this.activeStreams.delete(`multistream_${streamKey}_${dest.platform}`);
        });

        this.activeStreams.set(`multistream_${streamKey}_${dest.platform}`, ffmpegProcess);
      }
      
      logger.info(`Multistream configured for stream: ${streamKey} to ${destinations.length} destinations`);
      
    } catch (error) {
      logger.error(`Failed to setup multistream for ${streamKey}:`, error);
      throw new CustomError('Failed to setup multistream', 500);
    }
  }

  // Parar multistream
  async stopMultistream(streamKey: string): Promise<void> {
    try {
      const keysToRemove: string[] = [];
      
      for (const [key, process] of this.activeStreams) {
        if (key.startsWith(`multistream_${streamKey}_`)) {
          process.kill('SIGTERM');
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => this.activeStreams.delete(key));
      
      logger.info(`Multistream stopped for stream: ${streamKey}`);
      
    } catch (error) {
      logger.error(`Failed to stop multistream for ${streamKey}:`, error);
      throw new CustomError('Failed to stop multistream', 500);
    }
  }

  // Capturar stream do YouTube
  async captureYouTubeStream(youtubeUrl: string, outputStreamKey: string): Promise<ChildProcess> {
    try {
      const ytDlpPath = process.env.YOUTUBE_DL_PATH || 'yt-dlp';
      const outputRtmpUrl = `rtmp://localhost:1935/live/${outputStreamKey}`;
      
      // Primeiro, obter a URL do stream
      const getUrlProcess = spawn(ytDlpPath, [
        '--get-url',
        '--format', 'best[ext=mp4]',
        youtubeUrl
      ]);

      let streamUrl = '';
      
      getUrlProcess.stdout.on('data', (data) => {
        streamUrl += data.toString();
      });

      return new Promise((resolve, reject) => {
        getUrlProcess.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Failed to get YouTube stream URL, exit code: ${code}`));
            return;
          }

          streamUrl = streamUrl.trim();
          
          // Agora, capturar e retransmitir o stream
          const ffmpegArgs = [
            '-i', streamUrl,
            '-c', 'copy',
            '-f', 'flv',
            outputRtmpUrl
          ];

          const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
          
          ffmpegProcess.stdout.on('data', (data) => {
            logger.debug(`YouTube capture stdout: ${data}`);
          });

          ffmpegProcess.stderr.on('data', (data) => {
            logger.debug(`YouTube capture stderr: ${data}`);
          });

          ffmpegProcess.on('close', (code) => {
            logger.info(`YouTube capture process exited with code ${code}`);
            this.activeStreams.delete(`youtube_${outputStreamKey}`);
          });

          this.activeStreams.set(`youtube_${outputStreamKey}`, ffmpegProcess);
          
          logger.info(`YouTube stream capture started: ${youtubeUrl} -> ${outputStreamKey}`);
          resolve(ffmpegProcess);
        });
      });
      
    } catch (error) {
      logger.error(`Failed to capture YouTube stream:`, error);
      throw new CustomError('Failed to capture YouTube stream', 500);
    }
  }

  // Parar captura do YouTube
  async stopYouTubeCapture(streamKey: string): Promise<void> {
    try {
      const captureKey = `youtube_${streamKey}`;
      const process = this.activeStreams.get(captureKey);
      
      if (process) {
        process.kill('SIGTERM');
        this.activeStreams.delete(captureKey);
        logger.info(`YouTube capture stopped for stream: ${streamKey}`);
      }
      
    } catch (error) {
      logger.error(`Failed to stop YouTube capture for ${streamKey}:`, error);
      throw new CustomError('Failed to stop YouTube capture', 500);
    }
  }

  // Verificar se stream está ativo
  async isStreamActive(streamKey: string): Promise<boolean> {
    try {
      const stats = await this.getStreamStats(streamKey);
      return stats.isLive;
    } catch (error) {
      return false;
    }
  }

  // Obter lista de streams ativos
  async getActiveStreams(): Promise<string[]> {
    try {
      const response = await axios.get(this.nginxStatsUrl, {
        timeout: 5000
      });

      return this.parseActiveStreams(response.data);
      
    } catch (error) {
      logger.error('Failed to get active streams:', error);
      return [];
    }
  }

  // Parsear estatísticas do Nginx
  private parseNginxStats(xmlData: string, streamKey: string): RTMPStats {
    // Esta é uma implementação simplificada
    // Em uma implementação real, você parsearia o XML retornado pelo Nginx
    
    const defaultStats: RTMPStats = {
      isLive: false,
      viewerCount: 0,
      bitrate: 0,
      fps: 0,
      resolution: '0x0',
      duration: 0
    };

    try {
      // Simular parsing do XML
      // O Nginx RTMP retorna estatísticas em formato XML
      const isLive = xmlData.includes(`<name>${streamKey}</name>`);
      
      if (isLive) {
        return {
          isLive: true,
          viewerCount: Math.floor(Math.random() * 100), // Placeholder
          bitrate: 2500, // Placeholder
          fps: 30, // Placeholder
          resolution: '1920x1080', // Placeholder
          duration: 0 // Placeholder
        };
      }

      return defaultStats;
      
    } catch (error) {
      logger.error('Failed to parse Nginx stats:', error);
      return defaultStats;
    }
  }

  // Parsear streams ativos
  private parseActiveStreams(xmlData: string): string[] {
    try {
      // Implementação simplificada
      // Em uma implementação real, você parsearia o XML para extrair os nomes dos streams
      const streams: string[] = [];
      
      // Placeholder - extrair nomes de streams do XML
      const streamMatches = xmlData.match(/<name>([^<]+)<\/name>/g);
      if (streamMatches) {
        streamMatches.forEach(match => {
          const streamName = match.replace(/<\/?name>/g, '');
          if (streamName.startsWith('stream_')) {
            streams.push(streamName);
          }
        });
      }

      return streams;
      
    } catch (error) {
      logger.error('Failed to parse active streams:', error);
      return [];
    }
  }

  // Limpar processos órfãos
  cleanup(): void {
    for (const [key, process] of this.activeStreams) {
      try {
        process.kill('SIGTERM');
        logger.info(`Cleaned up process: ${key}`);
      } catch (error) {
        logger.error(`Failed to cleanup process ${key}:`, error);
      }
    }
    this.activeStreams.clear();
  }
}

export const rtmpService = new RTMPService();

// Cleanup ao sair da aplicação
process.on('SIGTERM', () => {
  rtmpService.cleanup();
});

process.on('SIGINT', () => {
  rtmpService.cleanup();
});

