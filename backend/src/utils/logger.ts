import fs from 'fs';
import path from 'path';

// Criar diretório de logs se não existir
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class Logger {
  private logLevel: LogLevel;
  private logFile: string;

  constructor() {
    this.logLevel = this.getLogLevel();
    this.logFile = path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`);
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    switch (level) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  }

  private writeToFile(message: string): void {
    try {
      fs.appendFileSync(this.logFile, message + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private log(level: LogLevel, levelName: string, message: string, meta?: any): void {
    if (level <= this.logLevel) {
      const formattedMessage = this.formatMessage(levelName, message, meta);
      
      // Console output com cores
      if (process.env.NODE_ENV === 'development') {
        const colors = {
          ERROR: '\x1b[31m', // Red
          WARN: '\x1b[33m',  // Yellow
          INFO: '\x1b[36m',  // Cyan
          DEBUG: '\x1b[35m'  // Magenta
        };
        const reset = '\x1b[0m';
        console.log(`${colors[levelName as keyof typeof colors]}${formattedMessage}${reset}`);
      } else {
        console.log(formattedMessage);
      }

      // Escrever no arquivo em produção
      if (process.env.NODE_ENV === 'production') {
        this.writeToFile(formattedMessage);
      }
    }
  }

  error(message: string, meta?: any): void {
    this.log(LogLevel.ERROR, 'ERROR', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, 'WARN', message, meta);
  }

  info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, 'INFO', message, meta);
  }

  debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, meta);
  }

  // Método para logs de requisições HTTP
  http(method: string, url: string, statusCode: number, responseTime: number, userAgent?: string): void {
    const message = `${method} ${url} ${statusCode} ${responseTime}ms`;
    const meta = userAgent ? { userAgent } : undefined;
    this.info(message, meta);
  }

  // Método para logs de performance
  performance(operation: string, duration: number, meta?: any): void {
    this.info(`Performance: ${operation} took ${duration}ms`, meta);
  }

  // Método para logs de segurança
  security(event: string, details: any): void {
    this.warn(`Security Event: ${event}`, details);
  }
}

export const logger = new Logger();

