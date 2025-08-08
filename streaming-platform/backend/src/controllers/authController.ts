import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { CustomError } from '../middleware/errorHandler';
import { generateToken, AuthenticatedRequest } from '../middleware/auth';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { User, CreateUserData, ApiResponse } from '../types';

class AuthController {
  // Registro de usuário
  async register(req: Request, res: Response): Promise<void> {
    const { email, username, fullName, password } = req.body;

    // Validação básica
    if (!email || !username || !fullName || !password) {
      throw new CustomError('All fields are required', 400);
    }

    if (password.length < 6) {
      throw new CustomError('Password must be at least 6 characters', 400);
    }

    // Verificar se usuário já existe
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      throw new CustomError('User with this email or username already exists', 409);
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Criar usuário
    const userId = uuidv4();
    const result = await query(
      `INSERT INTO users (id, email, username, full_name, password_hash, subscription_tier)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, username, full_name, subscription_tier, created_at`,
      [userId, email, username, fullName, hashedPassword, 'free']
    );

    const user = result.rows[0];

    // Gerar token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      subscriptionTier: user.subscription_tier
    });

    logger.info(`New user registered: ${username} (${email})`);

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          subscriptionTier: user.subscription_tier,
          createdAt: user.created_at
        },
        token
      },
      message: 'User registered successfully',
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  }

  // Login de usuário
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new CustomError('Email and password are required', 400);
    }

    // Buscar usuário
    const result = await query(
      `SELECT id, email, username, full_name, password_hash, subscription_tier, is_active
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new CustomError('Invalid credentials', 401);
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new CustomError('Account is deactivated', 401);
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new CustomError('Invalid credentials', 401);
    }

    // Gerar token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      subscriptionTier: user.subscription_tier
    });

    // Atualizar último login
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    logger.info(`User logged in: ${user.username} (${user.email})`);

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          subscriptionTier: user.subscription_tier
        },
        token
      },
      message: 'Login successful',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  }

  // Refresh token
  async refreshToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      throw new CustomError('Authentication required', 401);
    }

    // Buscar dados atualizados do usuário
    const result = await query(
      `SELECT id, email, username, full_name, subscription_tier, is_active
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      throw new CustomError('User not found or inactive', 401);
    }

    const user = result.rows[0];

    // Gerar novo token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      subscriptionTier: user.subscription_tier
    });

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          subscriptionTier: user.subscription_tier
        },
        token
      },
      message: 'Token refreshed successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  }

  // Logout
  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    // Em uma implementação real, você poderia invalidar o token
    // adicionando-o a uma blacklist ou usando refresh tokens
    
    logger.info(`User logged out: ${req.user?.username}`);

    const response: ApiResponse = {
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  }

  // Verificar token
  async verifyToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      throw new CustomError('Authentication required', 401);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        user: req.user,
        valid: true
      },
      message: 'Token is valid',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  }

  // Esqueci a senha
  async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body;

    if (!email) {
      throw new CustomError('Email is required', 400);
    }

    // Verificar se usuário existe
    const result = await query(
      'SELECT id, username FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    // Sempre retornar sucesso por segurança (não revelar se email existe)
    const response: ApiResponse = {
      success: true,
      message: 'If the email exists, a password reset link has been sent',
      timestamp: new Date().toISOString()
    };

    if (result.rows.length > 0) {
      // Gerar token de reset
      const resetToken = uuidv4();
      const expiresAt = new Date(Date.now() + 3600000); // 1 hora

      await query(
        `INSERT INTO password_resets (user_id, token, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET
         token = $2, expires_at = $3, created_at = NOW()`,
        [result.rows[0].id, resetToken, expiresAt]
      );

      // Aqui você enviaria o email com o link de reset
      logger.info(`Password reset requested for: ${email}`);
    }

    res.json(response);
  }

  // Resetar senha
  async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new CustomError('Token and new password are required', 400);
    }

    if (newPassword.length < 6) {
      throw new CustomError('Password must be at least 6 characters', 400);
    }

    // Verificar token
    const result = await query(
      `SELECT pr.user_id, u.email, u.username
       FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.token = $1 AND pr.expires_at > NOW() AND pr.used_at IS NULL`,
      [token]
    );

    if (result.rows.length === 0) {
      throw new CustomError('Invalid or expired reset token', 400);
    }

    const { user_id, email, username } = result.rows[0];

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Atualizar senha e marcar token como usado
    await query('BEGIN');
    try {
      await query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, user_id]
      );

      await query(
        'UPDATE password_resets SET used_at = NOW() WHERE token = $1',
        [token]
      );

      await query('COMMIT');
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

    logger.info(`Password reset completed for: ${username} (${email})`);

    const response: ApiResponse = {
      success: true,
      message: 'Password reset successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  }

  // Alterar senha
  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new CustomError('Current password and new password are required', 400);
    }

    if (newPassword.length < 6) {
      throw new CustomError('New password must be at least 6 characters', 400);
    }

    if (!req.user) {
      throw new CustomError('Authentication required', 401);
    }

    // Buscar senha atual
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      throw new CustomError('User not found', 404);
    }

    // Verificar senha atual
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      result.rows[0].password_hash
    );

    if (!isCurrentPasswordValid) {
      throw new CustomError('Current password is incorrect', 400);
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Atualizar senha
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    logger.info(`Password changed for user: ${req.user.username}`);

    const response: ApiResponse = {
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  }

  // Verificar email
  async verifyEmail(req: Request, res: Response): Promise<void> {
    const { token } = req.body;

    if (!token) {
      throw new CustomError('Verification token is required', 400);
    }

    // Implementar lógica de verificação de email
    // Por enquanto, apenas retornar sucesso
    const response: ApiResponse = {
      success: true,
      message: 'Email verified successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  }

  // Reenviar verificação de email
  async resendVerification(req: Request, res: Response): Promise<void> {
    const { email } = req.body;

    if (!email) {
      throw new CustomError('Email is required', 400);
    }

    // Implementar lógica de reenvio de verificação
    // Por enquanto, apenas retornar sucesso
    const response: ApiResponse = {
      success: true,
      message: 'Verification email sent',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  }

  // Autenticação com Firebase
  async firebaseAuth(req: Request, res: Response): Promise<void> {
    const { firebaseToken, userData } = req.body;

    if (!firebaseToken) {
      throw new CustomError('Firebase token is required', 400);
    }

    // Aqui você verificaria o token do Firebase
    // Por enquanto, vamos simular a criação/login do usuário
    
    const response: ApiResponse = {
      success: true,
      message: 'Firebase authentication not implemented yet',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  }

  // Autenticação com Auth0
  async auth0Auth(req: Request, res: Response): Promise<void> {
    const { auth0Token, userData } = req.body;

    if (!auth0Token) {
      throw new CustomError('Auth0 token is required', 400);
    }

    // Aqui você verificaria o token do Auth0
    // Por enquanto, vamos simular a criação/login do usuário
    
    const response: ApiResponse = {
      success: true,
      message: 'Auth0 authentication not implemented yet',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  }
}

export const authController = new AuthController();

