import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserType } from '../models/UserModel';

// Interface para requisições autenticadas
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    tipo_usuario: UserType;
    iat?: number;
    exp?: number;
  };
}

// Interface para payload do JWT
export interface JwtPayload {
  userId: number;
  email: string;
  tipo_usuario: UserType;
}

/**
 * Middleware para verificar token JWT
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Token de acesso requerido'
    });
    return;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET não configurado');
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload & { iat: number; exp: number };
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
      return;
    }
    
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Middleware para verificar tipos específicos de usuário
 */
export const authorizeUserType = (allowedTypes: UserType[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
      return;
    }

    if (!allowedTypes.includes(req.user.tipo_usuario)) {
      res.status(403).json({
        success: false,
        message: 'Acesso negado para este tipo de usuário'
      });
      return;
    }

    next();
  };
};

/**
 * Middleware opcional - não falha se não houver token
 */
export const optionalAuth = (
  req: AuthenticatedRequest,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      next();
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload & { iat: number; exp: number };
    req.user = decoded;
  } catch (error) {
    // Ignora erro e continua sem usuário
  }
  
  next();
};