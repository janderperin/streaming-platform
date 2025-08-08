import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { CustomError } from '../middleware/errorHandler';
import { Stream, CreateStreamData, UpdateStreamData } from '../types';
import { rtmpService } from './rtmpService';

class StreamService {
  // Criar novo stream
  async createStream(userId: string, data: CreateStreamData): Promise<Stream> {
    const streamId = uuidv4();
    const streamKey = this.generateStreamKey();

    const result = await query(
      `INSERT INTO streams (id, user_id, title, description, thumbnail_url, stream_key, scheduled_start_at, is_recording)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        streamId,
        userId,
        data.title,
        data.description || null,
        data.thumbnailUrl || null,
        streamKey,
        data.scheduledStartAt || null,
        data.isRecording !== undefined ? data.isRecording : true
      ]
    );

    const stream = result.rows[0];
    
    // Gerar URLs RTMP
    const rtmpUrls = this.generateRTMPUrls(streamKey);
    
    // Atualizar com URLs RTMP
    await query(
      'UPDATE streams SET rtmp_url = $1 WHERE id = $2',
      [rtmpUrls.ingest, streamId]
    );

    logger.info(`Stream created: ${stream.title} (${streamId}) by user ${userId}`);

    return {
      ...stream,
      rtmpUrl: rtmpUrls.ingest,
      hlsUrl: rtmpUrls.hls,
      dashUrl: rtmpUrls.dash
    };
  }

  // Obter stream por ID
  async getStreamById(streamId: string, userId?: string): Promise<Stream | null> {
    let query_text = `
      SELECT s.*, u.username, u.full_name as user_full_name
      FROM streams s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `;
    let params = [streamId];

    // Se userId for fornecido, verificar se é o dono ou se o stream é público
    if (userId) {
      query_text += ' AND (s.user_id = $2 OR s.status IN (\'live\', \'ended\'))';
      params.push(userId);
    } else {
      query_text += ' AND s.status IN (\'live\', \'ended\')';
    }

    const result = await query(query_text, params);

    if (result.rows.length === 0) {
      return null;
    }

    const stream = result.rows[0];
    const rtmpUrls = this.generateRTMPUrls(stream.stream_key);

    return {
      ...stream,
      rtmpUrl: rtmpUrls.ingest,
      hlsUrl: rtmpUrls.hls,
      dashUrl: rtmpUrls.dash
    };
  }

  // Listar streams do usuário
  async getUserStreams(userId: string, filters: any = {}): Promise<Stream[]> {
    let query_text = `
      SELECT s.*, COUNT(g.id) as guest_count
      FROM streams s
      LEFT JOIN guests g ON s.id = g.stream_id AND g.status = 'joined'
      WHERE s.user_id = $1
    `;
    let params = [userId];
    let paramCount = 1;

    // Filtros
    if (filters.status) {
      paramCount++;
      query_text += ` AND s.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.search) {
      paramCount++;
      query_text += ` AND (s.title ILIKE $${paramCount} OR s.description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    query_text += ' GROUP BY s.id ORDER BY s.created_at DESC';

    // Paginação
    if (filters.limit) {
      paramCount++;
      query_text += ` LIMIT $${paramCount}`;
      params.push(filters.limit);

      if (filters.offset) {
        paramCount++;
        query_text += ` OFFSET $${paramCount}`;
        params.push(filters.offset);
      }
    }

    const result = await query(query_text, params);

    return result.rows.map(stream => {
      const rtmpUrls = this.generateRTMPUrls(stream.stream_key);
      return {
        ...stream,
        rtmpUrl: rtmpUrls.ingest,
        hlsUrl: rtmpUrls.hls,
        dashUrl: rtmpUrls.dash
      };
    });
  }

  // Atualizar stream
  async updateStream(streamId: string, userId: string, data: UpdateStreamData): Promise<Stream> {
    // Verificar se o usuário é o dono do stream
    const ownership = await this.verifyStreamOwnership(streamId, userId);
    if (!ownership) {
      throw new CustomError('Stream not found or access denied', 404);
    }

    const updateFields = [];
    const params = [];
    let paramCount = 0;

    if (data.title !== undefined) {
      paramCount++;
      updateFields.push(`title = $${paramCount}`);
      params.push(data.title);
    }

    if (data.description !== undefined) {
      paramCount++;
      updateFields.push(`description = $${paramCount}`);
      params.push(data.description);
    }

    if (data.thumbnailUrl !== undefined) {
      paramCount++;
      updateFields.push(`thumbnail_url = $${paramCount}`);
      params.push(data.thumbnailUrl);
    }

    if (data.scheduledStartAt !== undefined) {
      paramCount++;
      updateFields.push(`scheduled_start_at = $${paramCount}`);
      params.push(data.scheduledStartAt);
    }

    if (data.isRecording !== undefined) {
      paramCount++;
      updateFields.push(`is_recording = $${paramCount}`);
      params.push(data.isRecording);
    }

    if (updateFields.length === 0) {
      throw new CustomError('No fields to update', 400);
    }

    paramCount++;
    updateFields.push(`updated_at = NOW()`);
    params.push(streamId);

    const result = await query(
      `UPDATE streams SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    const stream = result.rows[0];
    const rtmpUrls = this.generateRTMPUrls(stream.stream_key);

    logger.info(`Stream updated: ${streamId} by user ${userId}`);

    return {
      ...stream,
      rtmpUrl: rtmpUrls.ingest,
      hlsUrl: rtmpUrls.hls,
      dashUrl: rtmpUrls.dash
    };
  }

  // Deletar stream
  async deleteStream(streamId: string, userId: string): Promise<void> {
    // Verificar se o usuário é o dono do stream
    const ownership = await this.verifyStreamOwnership(streamId, userId);
    if (!ownership) {
      throw new CustomError('Stream not found or access denied', 404);
    }

    // Verificar se o stream não está ativo
    const stream = await this.getStreamById(streamId, userId);
    if (stream && stream.status === 'live') {
      throw new CustomError('Cannot delete an active stream', 400);
    }

    await query('DELETE FROM streams WHERE id = $1', [streamId]);

    logger.info(`Stream deleted: ${streamId} by user ${userId}`);
  }

  // Iniciar transmissão
  async startStream(streamId: string, userId: string): Promise<void> {
    // Verificar se o usuário é o dono do stream
    const ownership = await this.verifyStreamOwnership(streamId, userId);
    if (!ownership) {
      throw new CustomError('Stream not found or access denied', 404);
    }

    const stream = await this.getStreamById(streamId, userId);
    if (!stream) {
      throw new CustomError('Stream not found', 404);
    }

    if (stream.status === 'live') {
      throw new CustomError('Stream is already live', 400);
    }

    // Atualizar status para live
    await query(
      `UPDATE streams SET 
        status = 'live', 
        started_at = NOW(), 
        updated_at = NOW() 
       WHERE id = $1`,
      [streamId]
    );

    // Notificar serviço RTMP
    await rtmpService.startStream(stream.streamKey);

    logger.info(`Stream started: ${streamId} by user ${userId}`);
  }

  // Parar transmissão
  async stopStream(streamId: string, userId: string): Promise<void> {
    // Verificar se o usuário é o dono do stream
    const ownership = await this.verifyStreamOwnership(streamId, userId);
    if (!ownership) {
      throw new CustomError('Stream not found or access denied', 404);
    }

    const stream = await this.getStreamById(streamId, userId);
    if (!stream) {
      throw new CustomError('Stream not found', 404);
    }

    if (stream.status !== 'live') {
      throw new CustomError('Stream is not live', 400);
    }

    // Calcular duração
    const duration = stream.startedAt 
      ? Math.floor((Date.now() - new Date(stream.startedAt).getTime()) / 1000)
      : 0;

    // Atualizar status para ended
    await query(
      `UPDATE streams SET 
        status = 'ended', 
        ended_at = NOW(), 
        duration_seconds = $2,
        updated_at = NOW() 
       WHERE id = $1`,
      [streamId, duration]
    );

    // Notificar serviço RTMP
    await rtmpService.stopStream(stream.streamKey);

    logger.info(`Stream stopped: ${streamId} by user ${userId}, duration: ${duration}s`);
  }

  // Obter status do stream
  async getStreamStatus(streamId: string): Promise<any> {
    const result = await query(
      `SELECT status, viewer_count, started_at, duration_seconds
       FROM streams WHERE id = $1`,
      [streamId]
    );

    if (result.rows.length === 0) {
      throw new CustomError('Stream not found', 404);
    }

    const stream = result.rows[0];
    
    // Obter estatísticas em tempo real do RTMP
    const rtmpStats = await rtmpService.getStreamStats(streamId);

    return {
      status: stream.status,
      viewerCount: stream.viewer_count,
      startedAt: stream.started_at,
      durationSeconds: stream.duration_seconds,
      rtmpStats
    };
  }

  // Regenerar chave de stream
  async regenerateStreamKey(streamId: string, userId: string): Promise<string> {
    // Verificar se o usuário é o dono do stream
    const ownership = await this.verifyStreamOwnership(streamId, userId);
    if (!ownership) {
      throw new CustomError('Stream not found or access denied', 404);
    }

    const stream = await this.getStreamById(streamId, userId);
    if (stream && stream.status === 'live') {
      throw new CustomError('Cannot regenerate key for an active stream', 400);
    }

    const newStreamKey = this.generateStreamKey();
    const rtmpUrls = this.generateRTMPUrls(newStreamKey);

    await query(
      `UPDATE streams SET 
        stream_key = $1, 
        rtmp_url = $2, 
        updated_at = NOW() 
       WHERE id = $3`,
      [newStreamKey, rtmpUrls.ingest, streamId]
    );

    logger.info(`Stream key regenerated for stream: ${streamId}`);

    return newStreamKey;
  }

  // Verificar propriedade do stream
  async verifyStreamOwnership(streamId: string, userId: string): Promise<boolean> {
    const result = await query(
      'SELECT id FROM streams WHERE id = $1 AND user_id = $2',
      [streamId, userId]
    );

    return result.rows.length > 0;
  }

  // Gerar chave de stream única
  private generateStreamKey(): string {
    return `stream_${uuidv4().replace(/-/g, '')}`;
  }

  // Gerar URLs RTMP
  private generateRTMPUrls(streamKey: string) {
    const rtmpHost = process.env.NGINX_RTMP_HOST || 'localhost';
    const rtmpPort = process.env.NGINX_RTMP_PORT || '1935';
    
    return {
      ingest: `rtmp://${rtmpHost}:${rtmpPort}/live/${streamKey}`,
      hls: `http://${rtmpHost}:8080/hls/${streamKey}.m3u8`,
      dash: `http://${rtmpHost}:8080/dash/${streamKey}.mpd`
    };
  }

  // Obter streams públicos
  async getPublicStreams(filters: any = {}): Promise<Stream[]> {
    let query_text = `
      SELECT s.*, u.username, u.full_name as user_full_name,
             COUNT(g.id) as guest_count
      FROM streams s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN guests g ON s.id = g.stream_id AND g.status = 'joined'
      WHERE s.status = 'live'
    `;
    let params: any[] = [];
    let paramCount = 0;

    if (filters.search) {
      paramCount++;
      query_text += ` AND (s.title ILIKE $${paramCount} OR s.description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    query_text += ' GROUP BY s.id, u.username, u.full_name ORDER BY s.viewer_count DESC, s.started_at DESC';

    if (filters.limit) {
      paramCount++;
      query_text += ` LIMIT $${paramCount}`;
      params.push(filters.limit);

      if (filters.offset) {
        paramCount++;
        query_text += ` OFFSET $${paramCount}`;
        params.push(filters.offset);
      }
    }

    const result = await query(query_text, params);

    return result.rows.map(stream => {
      const rtmpUrls = this.generateRTMPUrls(stream.stream_key);
      return {
        ...stream,
        // Não expor URLs RTMP para streams públicos
        hlsUrl: rtmpUrls.hls,
        dashUrl: rtmpUrls.dash
      };
    });
  }

  // Atualizar contador de visualizadores
  async updateViewerCount(streamId: string, count: number): Promise<void> {
    await query(
      `UPDATE streams SET 
        viewer_count = $2,
        max_viewers = GREATEST(max_viewers, $2),
        updated_at = NOW()
       WHERE id = $1`,
      [streamId, count]
    );
  }
}

export const streamService = new StreamService();

