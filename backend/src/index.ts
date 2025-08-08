import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { initializeSocket } from './config/socket';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';

// Carregar variáveis de ambiente
dotenv.config();

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
  try {
    // Conectar ao banco de dados
    await connectDatabase();
    logger.info('Database connected successfully');

    // Criar servidor HTTP
    const server = createServer(app);

    // Configurar Socket.IO
    const io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Inicializar Socket.IO
    initializeSocket(io);

    // Iniciar servidor
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
      logger.info(`📡 Socket.IO server initialized`);
      
      if (NODE_ENV === 'development') {
        logger.info(`🌐 API available at: http://localhost:${PORT}`);
        logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Iniciar servidor
startServer();

