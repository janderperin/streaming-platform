import { Router } from 'express';
import { authController } from '../controllers/authController';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

// Registro de usuário
router.post('/register', asyncHandler(authController.register));

// Login de usuário
router.post('/login', asyncHandler(authController.login));

// Refresh token
router.post('/refresh', asyncHandler(authController.refreshToken));

// Logout
router.post('/logout', authenticate, asyncHandler(authController.logout));

// Verificar token
router.get('/verify', authenticate, asyncHandler(authController.verifyToken));

// Esqueci a senha
router.post('/forgot-password', asyncHandler(authController.forgotPassword));

// Resetar senha
router.post('/reset-password', asyncHandler(authController.resetPassword));

// Alterar senha
router.post('/change-password', authenticate, asyncHandler(authController.changePassword));

// Verificar email
router.post('/verify-email', asyncHandler(authController.verifyEmail));

// Reenviar verificação de email
router.post('/resend-verification', asyncHandler(authController.resendVerification));

// Login com Firebase
router.post('/firebase', asyncHandler(authController.firebaseAuth));

// Login com Auth0
router.post('/auth0', asyncHandler(authController.auth0Auth));

export default router;

