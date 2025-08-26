import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import UserModel, { UserType } from '@models/UserModel';
import { oauth2Client } from '@config/google';
import { GoogleTokens } from '@interfaces/google-calendar';

export interface JwtPayload {
  userId: number;
  email: string;
  tipo_usuario: UserType;
}

export class AuthService {
  /**
   * Gerar token JWT para usuário
   */
  static generateJWT(user: { id: number; email: string; tipo_usuario: UserType }): string {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET não configurado no .env');
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      tipo_usuario: user.tipo_usuario
    };

    return jwt.sign(payload, jwtSecret, {
      expiresIn: '7d',
    });
  }

  /**
   * Verificar token JWT
   */
  static verifyJWT(token: string): JwtPayload | null {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return null;
      }

      return jwt.verify(token, jwtSecret) as JwtPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Hash de senha
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verificar senha
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Buscar usuário por ID
   */
  static async findUserById(userId: number): Promise<UserModel | null> {
    try {
      return await UserModel.findByPk(userId);
    } catch (error) {
      console.error('Erro ao buscar usuário por ID:', error);
      return null;
    }
  }

  /**
   * Buscar usuário por email
   */
  static async findUserByEmail(email: string): Promise<UserModel | null> {
    try {
      return await UserModel.findOne({ where: { email } });
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error);
      return null;
    }
  }

  /**
   * Obter tokens do Google OAuth2 usando código de autorização
   */
  static async getGoogleTokens(code: string): Promise<GoogleTokens> {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      
      if (!tokens.access_token) {
        throw new Error('Token de acesso não recebido do Google');
      }

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || undefined,
        expiry_date: tokens.expiry_date || undefined
      };
    } catch (error: any) {
      console.error('Erro ao obter tokens do Google:', error);
      throw new Error(`Erro na autenticação Google: ${error.message}`);
    }
  }

  /**
   * Obter informações do usuário do Google
   */
  static async getGoogleUserInfo(accessToken: string): Promise<{
    id: string;
    email: string;
    name: string;
    picture?: string;
  }> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
      );
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const userInfo = await response.json();
      
      return {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
      };
    } catch (error: any) {
      console.error('Erro ao obter informações do usuário Google:', error);
      throw new Error(`Erro ao obter dados do usuário: ${error.message}`);
    }
  }

  /**
   * Salvar tokens Google no usuário
   */
  static async saveGoogleTokens(userId: number, tokens: GoogleTokens): Promise<boolean> {
    try {
      const expiresAt = tokens.expiry_date 
        ? new Date(tokens.expiry_date) 
        : new Date(Date.now() + 3600 * 1000);

      await UserModel.update(
        {
          google_access_token: tokens.access_token,
          google_refresh_token: tokens.refresh_token || null,
          google_token_expires_at: expiresAt
        },
        { where: { id: userId } }
      );

      return true;
    } catch (error) {
      console.error('Erro ao salvar tokens Google:', error);
      return false;
    }
  }

  /**
   * Renovar token de acesso Google
   */
  static async refreshGoogleToken(userId: number): Promise<GoogleTokens | null> {
    try {
      const user = await UserModel.findByPk(userId);
      
      if (!user?.google_token_atualizado) {
        return null;
      }

      oauth2Client.setCredentials({
        refresh_token: user.google_token_atualizado
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      
      if (!credentials.access_token) {
        throw new Error('Novo token de acesso não recebido');
      }

      const newTokens: GoogleTokens = {
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || user.google_token_atualizado,
        expiry_date: credentials.expiry_date
      };

      await this.saveGoogleTokens(userId, newTokens);
      
      return newTokens;
    } catch (error: any) {
      console.error('Erro ao renovar token Google:', error);
      return null;
    }
  }

  /**
   * Obter tokens válidos do Google (renovando se necessário)
   */
  static async getValidGoogleTokens(userId: number): Promise<GoogleTokens | null> {
    try {
      const user = await UserModel.findByPk(userId);
      
      if (!user?.google_token_acesso) {
        return null;
      }

      // Verificar se token ainda é válido
      const now = new Date();
      const expiresAt = user.google_token_atualizado;
      
      if (expiresAt && now >= expiresAt) {
        // Token expirado, tentar renovar
        return await this.refreshGoogleToken(userId);
      }

      // Token ainda válido
      return {
        access_token: user.google_token_acesso,
        refresh_token: user.google_token_atualizado || undefined,
        expiry_date: expiresAt ? expiresAt.getTime() : undefined
      };
    } catch (error) {
      console.error('Erro ao obter tokens válidos:', error);
      return null;
    }
  }

  /**
   * Verificar se usuário tem Google Calendar conectado
   */
  static async hasGoogleCalendarConnected(userId: number): Promise<boolean> {
    try {
      const user = await UserModel.findByPk(userId);
      return !!(user?.google_token_acesso);
    } catch (error) {
      return false;
    }
  }

  /**
   * Desconectar Google Calendar do usuário
   */
  static async disconnectGoogleCalendar(userId: number): Promise<boolean> {
    try {
      await UserModel.update(
        {
          google_access_token: null,
          google_refresh_token: null,
          google_token_expires_at: null
        },
        { where: { id: userId } }
      );

      return true;
    } catch (error) {
      console.error('Erro ao desconectar Google Calendar:', error);
      return false;
    }
  }
}