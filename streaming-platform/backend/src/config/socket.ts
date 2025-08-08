import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { verifyToken } from '../middleware/auth';
import { chatService } from '../services/chatService';
import { streamService } from '../services/streamService';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  streamId?: string;
}

export const initializeSocket = (io: SocketIOServer): void => {
  // Middleware de autenticação para Socket.IO
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = await verifyToken(token);
      socket.userId = decoded.userId;
      
      logger.info(`Socket authenticated for user: ${socket.userId}`);
      next();
    } catch (error) {
      logger.error('Socket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`User ${socket.userId} connected via Socket.IO`);

    // Entrar em uma sala de stream
    socket.on('join-stream', async (streamId: string) => {
      try {
        socket.streamId = streamId;
        await socket.join(`stream:${streamId}`);
        
        // Notificar outros usuários na sala
        socket.to(`stream:${streamId}`).emit('user-joined', {
          userId: socket.userId,
          timestamp: new Date().toISOString()
        });

        // Enviar estado atual do stream
        const streamStatus = await streamService.getStreamStatus(streamId);
        socket.emit('stream-status', streamStatus);

        logger.info(`User ${socket.userId} joined stream ${streamId}`);
      } catch (error) {
        logger.error('Error joining stream:', error);
        socket.emit('error', { message: 'Failed to join stream' });
      }
    });

    // Sair de uma sala de stream
    socket.on('leave-stream', async (streamId: string) => {
      try {
        await socket.leave(`stream:${streamId}`);
        
        // Notificar outros usuários na sala
        socket.to(`stream:${streamId}`).emit('user-left', {
          userId: socket.userId,
          timestamp: new Date().toISOString()
        });

        logger.info(`User ${socket.userId} left stream ${streamId}`);
      } catch (error) {
        logger.error('Error leaving stream:', error);
      }
    });

    // Enviar mensagem de chat
    socket.on('send-chat-message', async (data: { streamId: string; message: string }) => {
      try {
        const chatMessage = await chatService.createMessage({
          streamId: data.streamId,
          userId: socket.userId!,
          message: data.message,
          platform: 'internal'
        });

        // Enviar mensagem para todos na sala
        io.to(`stream:${data.streamId}`).emit('chat-message', chatMessage);

        logger.info(`Chat message sent by ${socket.userId} in stream ${data.streamId}`);
      } catch (error) {
        logger.error('Error sending chat message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // WebRTC signaling
    socket.on('webrtc-offer', (data: { streamId: string; offer: any; targetUserId?: string }) => {
      if (data.targetUserId) {
        // Enviar para usuário específico
        socket.to(`stream:${data.streamId}`).emit('webrtc-offer', {
          offer: data.offer,
          fromUserId: socket.userId
        });
      } else {
        // Broadcast para todos na sala
        socket.to(`stream:${data.streamId}`).emit('webrtc-offer', {
          offer: data.offer,
          fromUserId: socket.userId
        });
      }
    });

    socket.on('webrtc-answer', (data: { streamId: string; answer: any; targetUserId: string }) => {
      socket.to(`stream:${data.streamId}`).emit('webrtc-answer', {
        answer: data.answer,
        fromUserId: socket.userId
      });
    });

    socket.on('webrtc-ice-candidate', (data: { streamId: string; candidate: any; targetUserId?: string }) => {
      if (data.targetUserId) {
        socket.to(`stream:${data.streamId}`).emit('webrtc-ice-candidate', {
          candidate: data.candidate,
          fromUserId: socket.userId
        });
      } else {
        socket.to(`stream:${data.streamId}`).emit('webrtc-ice-candidate', {
          candidate: data.candidate,
          fromUserId: socket.userId
        });
      }
    });

    // Controles de stream (apenas para o dono do stream)
    socket.on('start-stream', async (streamId: string) => {
      try {
        await streamService.startStream(streamId, socket.userId!);
        io.to(`stream:${streamId}`).emit('stream-started', {
          streamId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Error starting stream:', error);
        socket.emit('error', { message: 'Failed to start stream' });
      }
    });

    socket.on('stop-stream', async (streamId: string) => {
      try {
        await streamService.stopStream(streamId, socket.userId!);
        io.to(`stream:${streamId}`).emit('stream-stopped', {
          streamId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Error stopping stream:', error);
        socket.emit('error', { message: 'Failed to stop stream' });
      }
    });

    // Compartilhamento de tela
    socket.on('start-screen-share', (data: { streamId: string }) => {
      socket.to(`stream:${data.streamId}`).emit('screen-share-started', {
        userId: socket.userId,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('stop-screen-share', (data: { streamId: string }) => {
      socket.to(`stream:${data.streamId}`).emit('screen-share-stopped', {
        userId: socket.userId,
        timestamp: new Date().toISOString()
      });
    });

    // Atualização de status de convidado
    socket.on('guest-status-update', (data: { streamId: string; status: string }) => {
      socket.to(`stream:${data.streamId}`).emit('guest-status-changed', {
        userId: socket.userId,
        status: data.status,
        timestamp: new Date().toISOString()
      });
    });

    // Desconexão
    socket.on('disconnect', () => {
      logger.info(`User ${socket.userId} disconnected from Socket.IO`);
      
      if (socket.streamId) {
        socket.to(`stream:${socket.streamId}`).emit('user-left', {
          userId: socket.userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Tratamento de erros
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  logger.info('Socket.IO server initialized successfully');
};

