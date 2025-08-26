import UserModel, { UserType } from '@models/UserModel';
import { AuthService } from './authService';
import { getAuthUrl } from '@config/google';
import { GoogleTokens, GoogleAuthResponse } from '@interfaces/google-calendar';

export class GoogleOAuthService {
  /**
   * Obter URL de autorização do Google
   */
  static getAuthorizationUrl(): string {
    return getAuthUrl();
  }

  /**
   * Processar callback do Google OAuth2 (novo usuário ou login)
   */
  static async handleGoogleCallback(code: string): Promise<GoogleAuthResponse> {
    try {
      // Obter tokens do Google
      const tokens = await AuthService.getGoogleTokens(code);
      
      // Obter informações do usuário do Google
      const userInfo = await AuthService.getGoogleUserInfo(tokens.access_token);
      
      // Verificar se usuário já existe no sistema
      let user = await AuthService.findUserByEmail(userInfo.email);
      
      if (!user) {
        // Criar novo usuário se não existir
        user = await this.createUserFromGoogle(userInfo, tokens);
      } else {
        // Atualizar tokens Google do usuário existente
        await AuthService.saveGoogleTokens(user.id, tokens);
        
        // Atualizar informações básicas se necessário
        if (user.nome !== userInfo.name || !user.foto_perfil) {
          await UserModel.update({
            nome: userInfo.name,
            foto_perfil: userInfo.picture || user.foto_perfil
          }, {
            where: { id: user.id }
          });
        }
      }

      // Gerar token JWT
      const jwtToken = AuthService.generateJWT({
        id: user.id,
        email: user.email,
        tipo_usuario: user.tipo_usuario
      });

      // Recarregar usuário com dados atualizados
      const updatedUser = await AuthService.findUserById(user.id);
      if (!updatedUser) {
        throw new Error('Erro ao recarregar dados do usuário');
      }

      return {
        success: true,
        message: 'Autenticação Google realizada com sucesso',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          googleConnected: true
        },
        token: jwtToken
      };
    } catch (error: any) {
      console.error('Erro no callback Google:', error);
      return {
        success: false,
        message: `Erro na autenticação Google: ${error.message}`
      };
    }
  }

  /**
   * Conectar Google Calendar a usuário existente (logado)
   */
  static async connectGoogleCalendar(userId: number, code: string): Promise<GoogleAuthResponse> {
    try {
      const user = await AuthService.findUserById(userId);
      if (!user) {
        return {
          success: false,
          message: 'Usuário não encontrado'
        };
      }

      // Obter tokens do Google
      const tokens = await AuthService.getGoogleTokens(code);
      
      // Salvar tokens no usuário
      const saved = await AuthService.saveGoogleTokens(userId, tokens);
      if (!saved) {
        throw new Error('Erro ao salvar tokens Google');
      }

      return {
        success: true,
        message: 'Google Calendar conectado com sucesso',
        user: {
          id: user.id,
          email: user.email,
          googleConnected: true
        }
      };
    } catch (error: any) {
      console.error('Erro ao conectar Google Calendar:', error);
      return {
        success: false,
        message: `Erro ao conectar Google Calendar: ${error.message}`
      };
    }
  }

  /**
   * Desconectar Google Calendar do usuário
   */
  static async disconnectGoogleCalendar(userId: number): Promise<GoogleAuthResponse> {
    try {
      const success = await AuthService.disconnectGoogleCalendar(userId);
      
      if (!success) {
        throw new Error('Erro ao desconectar Google Calendar');
      }

      const user = await AuthService.findUserById(userId);
      if (!user) {
        throw new Error('Usuário não encontrado após desconexão');
      }

      return {
        success: true,
        message: 'Google Calendar desconectado com sucesso',
        user: {
          id: user.id,
          email: user.email,
          googleConnected: false
        }
      };
    } catch (error: any) {
      console.error('Erro ao desconectar Google Calendar:', error);
      return {
        success: false,
        message: `Erro ao desconectar Google Calendar: ${error.message}`
      };
    }
  }

  /**
   * Verificar status da conexão Google Calendar
   */
  static async getGoogleConnectionStatus(userId: number): Promise<{
    connected: boolean;
    tokenValid: boolean;
    expiresAt?: Date;
  }> {
    try {
      const user = await AuthService.findUserById(userId);
      if (!user) {
        return { connected: false, tokenValid: false };
      }

      const connected = !!user.google_token_atualizado;
      if (!connected) {
        return { connected: false, tokenValid: false };
      }

      // Verificar se token ainda é válido
      const now = new Date();
      const expiresAt = user.google_token_atualizado;
      const tokenValid = !expiresAt || now < expiresAt;

      return {
        connected: true,
        tokenValid,
        expiresAt: expiresAt || undefined
      };
    } catch (error) {
      console.error('Erro ao verificar status da conexão Google:', error);
      return { connected: false, tokenValid: false };
    }
  }

  /**
   * Criar usuário a partir dos dados do Google
   */
  private static async createUserFromGoogle(
    googleUser: {
      id: string;
      email: string;
      name: string;
      picture?: string;
    },
    tokens: GoogleTokens
  ): Promise<UserModel> {
    try {
      // Gerar senha temporária (usuário pode alterar depois)
      const temporaryPassword = Math.random().toString(36).substring(2, 15);
      const hashedPassword = await AuthService.hashPassword(temporaryPassword);

      const expiresAt = tokens.expiry_date 
        ? new Date(tokens.expiry_date) 
        : new Date(Date.now() + 3600 * 1000);

      // Criar usuário com tipo padrão 'comum'
      const newUser = await UserModel.create({
        email: googleUser.email,
        senha: hashedPassword,
        nome: googleUser.name,
        foto_perfil: googleUser.picture || null,
        tipo_usuario: UserType.COMUM, // Padrão para novos usuários Google
        ativo: true,
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token || null,
        google_token_expires_at: expiresAt
      });

      return newUser;
    } catch (error) {
      console.error('Erro ao criar usuário do Google:', error);
      throw new Error('Erro ao criar usuário');
    }
  }

  /**
   * Renovar token Google se necessário
   */
  static async ensureValidGoogleToken(userId: number): Promise<GoogleTokens | null> {
    try {
      return await AuthService.getValidGoogleTokens(userId);
    } catch (error) {
      console.error('Erro ao garantir token válido:', error);
      return null;
    }
  }
}