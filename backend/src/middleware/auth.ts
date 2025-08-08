import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CustomError } from './errorHandler';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    subscriptionTier: string;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  subscriptionTier: string;
  iat?: number;
  exp?: number;
}

export const verifyToken = async (token: string): Promise<JWTPayload> => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new CustomError('JWT secret not configured', 500);
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new CustomError('Invalid token', 401);
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new CustomError('Token expired', 401);
    }
    throw error;
  }
};

export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

  if (!jwtSecret) {
    throw new CustomError('JWT secret not configured', 500);
  }

  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
};

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new CustomError('Access token required', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = await verifyToken(token);

    // Adicionar informações do usuário à requisição
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      username: decoded.username,
      subscriptionTier: decoded.subscriptionTier
    };

    logger.debug(`User authenticated: ${decoded.username} (${decoded.userId})`);
    next();
  } catch (error) {
    logger.security('Authentication failed', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    next(error);
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new CustomError('Authentication required', 401);
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.subscriptionTier)) {
        logger.security('Authorization failed', {
          userId: req.user.id,
          requiredRoles: allowedRoles,
          userRole: req.user.subscriptionTier,
          url: req.url
        });
        throw new CustomError('Insufficient permissions', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware opcional de autenticação (não falha se não houver token)
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = await verifyToken(token);
      
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        username: decoded.username,
        subscriptionTier: decoded.subscriptionTier
      };
    }
    
    next();
  } catch (error) {
    // Em caso de erro, continua sem autenticação
    logger.debug('Optional authentication failed, continuing without auth');
    next();
  }
};

// Middleware para verificar se o usuário é dono do recurso
export const checkResourceOwnership = (resourceIdParam: string = 'id') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new CustomError('Authentication required', 401);
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        throw new CustomError('Resource ID required', 400);
      }

      // Esta verificação será implementada nos controladores específicos
      // pois cada recurso tem sua própria lógica de verificação de propriedade
      next();
    } catch (error) {
      next(error);
    }
  };
};

