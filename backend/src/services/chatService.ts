import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { CustomError } from '../middleware/errorHandler';
import { ChatMessage, CreateChatMessageData } from '../types';

class ChatService {
  // Criar mensagem de chat
  async createMessage(data: CreateChatMessageData): Promise<ChatMessage> {
    const messageId = uuidv4();
    
    // Buscar informações do usuário se for mensagem interna
    let username = data.username;
    if (data.platform === 'internal' && data.userId) {
      const userResult = await query(
        'SELECT username FROM users WHERE id = $1',
        [data.userId]
      );
      
      if (userResult.rows.length > 0) {
        username = userResult.rows[0].username;
      }
    }

    const result = await query(
      `INSERT INTO chat_messages (
        id, stream_id, platform, platform_user_id, username, message,
        is_moderator, is_subscriber, badges, emotes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        messageId,
        data.streamId,
        data.platform,
        data.platformUserId || null,
        username,
        data.message,
        data.isModerator || false,
        data.isSubscriber || false,
        JSON.stringify(data.badges || []),
        JSON.stringify(data.emotes || [])
      ]
    );

    const message = result.rows[0];
    
    logger.debug(`Chat message created: ${messageId} in stream ${data.streamId}`);

    return {
      ...message,
      badges: JSON.parse(message.badges),
      emotes: JSON.parse(message.emotes)
    };
  }

  // Obter mensagens de chat de um stream
  async getStreamMessages(streamId: string, filters: any = {}): Promise<ChatMessage[]> {
    let query_text = `
      SELECT * FROM chat_messages 
      WHERE stream_id = $1
    `;
    let params = [streamId];
    let paramCount = 1;

    // Filtro por plataforma
    if (filters.platform) {
      paramCount++;
      query_text += ` AND platform = $${paramCount}`;
      params.push(filters.platform);
    }

    // Filtro por período
    if (filters.since) {
      paramCount++;
      query_text += ` AND timestamp >= $${paramCount}`;
      params.push(filters.since);
    }

    if (filters.until) {
      paramCount++;
      query_text += ` AND timestamp <= $${paramCount}`;
      params.push(filters.until);
    }

    // Ordenação
    query_text += ' ORDER BY timestamp DESC';

    // Limite
    if (filters.limit) {
      paramCount++;
      query_text += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    } else {
      query_text += ' LIMIT 100'; // Limite padrão
    }

    const result = await query(query_text, params);

    return result.rows.map(message => ({
      ...message,
      badges: JSON.parse(message.badges),
      emotes: JSON.parse(message.emotes)
    })).reverse(); // Retornar em ordem cronológica
  }

  // Deletar mensagem de chat
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    // Verificar se o usuário tem permissão para deletar a mensagem
    const result = await query(
      `SELECT cm.*, s.user_id as stream_owner_id
       FROM chat_messages cm
       JOIN streams s ON cm.stream_id = s.id
       WHERE cm.id = $1`,
      [messageId]
    );

    if (result.rows.length === 0) {
      throw new CustomError('Message not found', 404);
    }

    const message = result.rows[0];
    
    // Apenas o dono do stream pode deletar mensagens
    if (message.stream_owner_id !== userId) {
      throw new CustomError('Permission denied', 403);
    }

    await query('DELETE FROM chat_messages WHERE id = $1', [messageId]);
    
    logger.info(`Chat message deleted: ${messageId} by user ${userId}`);
  }

  // Banir usuário do chat
  async banUser(streamId: string, username: string, moderatorUserId: string): Promise<void> {
    // Verificar se o moderador é o dono do stream
    const streamResult = await query(
      'SELECT user_id FROM streams WHERE id = $1',
      [streamId]
    );

    if (streamResult.rows.length === 0) {
      throw new CustomError('Stream not found', 404);
    }

    if (streamResult.rows[0].user_id !== moderatorUserId) {
      throw new CustomError('Permission denied', 403);
    }

    // Adicionar à lista de banidos (implementar tabela de banidos se necessário)
    // Por enquanto, apenas deletar mensagens do usuário
    await query(
      'DELETE FROM chat_messages WHERE stream_id = $1 AND username = $2',
      [streamId, username]
    );

    logger.info(`User banned from chat: ${username} in stream ${streamId} by ${moderatorUserId}`);
  }

  // Obter estatísticas de chat
  async getChatStats(streamId: string): Promise<any> {
    const result = await query(
      `SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT username) as unique_users,
        COUNT(DISTINCT platform) as platforms_count,
        AVG(LENGTH(message)) as avg_message_length
       FROM chat_messages 
       WHERE stream_id = $1`,
      [streamId]
    );

    const stats = result.rows[0];

    // Obter mensagens por plataforma
    const platformResult = await query(
      `SELECT platform, COUNT(*) as count
       FROM chat_messages 
       WHERE stream_id = $1
       GROUP BY platform`,
      [streamId]
    );

    const platformStats = platformResult.rows.reduce((acc, row) => {
      acc[row.platform] = parseInt(row.count);
      return acc;
    }, {});

    // Obter usuários mais ativos
    const activeUsersResult = await query(
      `SELECT username, COUNT(*) as message_count
       FROM chat_messages 
       WHERE stream_id = $1
       GROUP BY username
       ORDER BY message_count DESC
       LIMIT 10`,
      [streamId]
    );

    return {
      totalMessages: parseInt(stats.total_messages),
      uniqueUsers: parseInt(stats.unique_users),
      platformsCount: parseInt(stats.platforms_count),
      avgMessageLength: parseFloat(stats.avg_message_length) || 0,
      platformStats,
      topUsers: activeUsersResult.rows
    };
  }

  // Processar mensagem de chat externa (webhook)
  async processExternalMessage(data: any): Promise<ChatMessage | null> {
    try {
      // Mapear dados da plataforma externa para nosso formato
      const messageData: CreateChatMessageData = {
        streamId: data.streamId,
        platform: data.platform,
        platformUserId: data.platformUserId,
        username: data.username,
        message: data.message,
        isModerator: data.isModerator || false,
        isSubscriber: data.isSubscriber || false,
        badges: data.badges || [],
        emotes: data.emotes || []
      };

      // Filtrar mensagens spam ou inadequadas
      if (this.isSpamMessage(messageData.message)) {
        logger.warn(`Spam message filtered: ${messageData.message}`);
        return null;
      }

      const message = await this.createMessage(messageData);
      
      logger.debug(`External chat message processed: ${data.platform} - ${data.username}`);
      
      return message;
      
    } catch (error) {
      logger.error('Failed to process external chat message:', error);
      return null;
    }
  }

  // Filtro anti-spam simples
  private isSpamMessage(message: string): boolean {
    // Implementar lógica anti-spam
    const spamPatterns = [
      /(.)\1{10,}/, // Caracteres repetidos
      /https?:\/\/[^\s]+/gi, // URLs (pode ser configurável)
      /\b(spam|bot|fake)\b/gi // Palavras suspeitas
    ];

    return spamPatterns.some(pattern => pattern.test(message));
  }

  // Obter mensagens recentes para um usuário específico
  async getUserRecentMessages(streamId: string, username: string, limit: number = 10): Promise<ChatMessage[]> {
    const result = await query(
      `SELECT * FROM chat_messages 
       WHERE stream_id = $1 AND username = $2
       ORDER BY timestamp DESC
       LIMIT $3`,
      [streamId, username, limit]
    );

    return result.rows.map(message => ({
      ...message,
      badges: JSON.parse(message.badges),
      emotes: JSON.parse(message.emotes)
    }));
  }

  // Limpar mensagens antigas
  async cleanupOldMessages(daysOld: number = 30): Promise<number> {
    const result = await query(
      `DELETE FROM chat_messages 
       WHERE timestamp < NOW() - INTERVAL '${daysOld} days'
       RETURNING id`,
      []
    );

    const deletedCount = result.rows.length;
    
    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} old chat messages (older than ${daysOld} days)`);
    }

    return deletedCount;
  }

  // Exportar chat de um stream
  async exportStreamChat(streamId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    const messages = await this.getStreamMessages(streamId, { limit: 10000 });

    if (format === 'csv') {
      const csvHeader = 'timestamp,platform,username,message,is_moderator,is_subscriber\n';
      const csvRows = messages.map(msg => 
        `"${msg.timestamp}","${msg.platform}","${msg.username}","${msg.message.replace(/"/g, '""')}","${msg.isModerator}","${msg.isSubscriber}"`
      ).join('\n');
      
      return csvHeader + csvRows;
    }

    return JSON.stringify(messages, null, 2);
  }
}

export const chatService = new ChatService();

