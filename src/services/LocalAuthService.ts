import UserModel, { UserType } from '@models/UserModel';
import { AuthService } from './authService';
import { validateEmail, validatePassword, validateName } from '@utils/validator';

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  userType: UserType;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    email: string;
    name: string;
    tipo_usuario: UserType;
    googleConnected: boolean;
  };
  token?: string;
}

export class LocalAuthService {
  /**
   * Registrar novo usuário
   */
  static async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Validações
      if (!validateEmail(data.email)) {
        return { success: false, message: 'Email inválido' };
      }

      if (!validatePassword(data.password)) {
        return { success: false, message: 'Senha deve ter no mínimo 6 caracteres' };
      }

      if (!validateName(data.name)) {
        return { success: false, message: 'Nome deve ter no mínimo 2 caracteres' };
      }

      // Verificar se email já existe
      const existingUser = await AuthService.findUserByEmail(data.email);
      if (existingUser) {
        return { success: false, message: 'Email já está em uso' };
      }

      // Hash da senha
      const hashedPassword = await AuthService.hashPassword(data.password);

      // Criar usuário
      const newUser = await UserModel.create({
        email: data.email,
        senha: hashedPassword,
        nome: data.name,
        telefone: data.phone || null,
        tipo_usuario: data.userType,
        ativo: true
      });

      // Gerar token JWT
      const token = AuthService.generateJWT({
        id: newUser.id,
        email: newUser.email,
        tipo_usuario: newUser.tipo_usuario
      });

      return {
        success: true,
        message: 'Usuário criado com sucesso',
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.nome,
          tipo_usuario: newUser.tipo_usuario,
          googleConnected: !!newUser.google_token_acesso
        },
        token
      };
    } catch (error: any) {
      console.error('Erro ao registrar usuário:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  /**
   * Login com email e senha
   */
  static async login(data: LoginData): Promise<AuthResponse> {
    try {
      // Validações básicas
      if (!validateEmail(data.email)) {
        return { success: false, message: 'Email inválido' };
      }

      if (!data.password) {
        return { success: false, message: 'Senha é obrigatória' };
      }

      // Buscar usuário
      const user = await AuthService.findUserByEmail(data.email);
      if (!user) {
        return { success: false, message: 'Email ou senha incorretos' };
      }

      // Verificar se usuário está ativo
      if (!user.ativo) {
        return { success: false, message: 'Conta desativada' };
      }

      // Verificar senha
      const passwordValid = await AuthService.comparePassword(data.password, user.senha);
      if (!passwordValid) {
        return { success: false, message: 'Email ou senha incorretos' };
      }

      // Gerar token JWT
      const token = AuthService.generateJWT({
        id: user.id,
        email: user.email,
        tipo_usuario: user.tipo_usuario
      });

      return {
        success: true,
        message: 'Login realizado com sucesso',
        user: {
          id: user.id,
          email: user.email,
          name: user.nome,
          tipo_usuario: user.tipo_usuario,
          googleConnected: !!user.google_token_acesso
        },
        token
      };
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  /**
   * Obter perfil do usuário
   */
  static async getProfile(userId: number): Promise<AuthResponse> {
    try {
      const user = await AuthService.findUserById(userId);
      if (!user) {
        return { success: false, message: 'Usuário não encontrado' };
      }

      return {
        success: true,
        message: 'Perfil obtido com sucesso',
        user: {
          id: user.id,
          email: user.email,
          name: user.nome,
          tipo_usuario: user.tipo_usuario,
          googleConnected: !!user.google_token_acesso
        }
      };
    } catch (error: any) {
      console.error('Erro ao obter perfil:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  /**
   * Atualizar perfil do usuário
   */
  static async updateProfile(
    userId: number,
    data: { name?: string; phone?: string }
  ): Promise<AuthResponse> {
    try {
      const user = await AuthService.findUserById(userId);
      if (!user) {
        return { success: false, message: 'Usuário não encontrado' };
      }

      // Validar dados se fornecidos
      if (data.name && !validateName(data.name)) {
        return { success: false, message: 'Nome deve ter no mínimo 2 caracteres' };
      }

      // Atualizar campos fornecidos
      const updateData: any = {};
      if (data.name) updateData.nome = data.name;
      if (data.phone !== undefined) updateData.telefone = data.phone;

      await UserModel.update(updateData, { where: { id: userId } });

      // Buscar usuário atualizado
      const updatedUser = await AuthService.findUserById(userId);
      if (!updatedUser) {
        throw new Error('Erro ao obter usuário atualizado');
      }

      return {
        success: true,
        message: 'Perfil atualizado com sucesso',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.nome,
          tipo_usuario: updatedUser.tipo_usuario,
          googleConnected: !!updatedUser.google_token_atualizado
        }
      };
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }

  /**
   * Alterar senha do usuário
   */
  static async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<AuthResponse> {
    try {
      const user = await AuthService.findUserById(userId);
      if (!user) {
        return { success: false, message: 'Usuário não encontrado' };
      }

      // Verificar senha atual
      const passwordValid = await AuthService.comparePassword(currentPassword, user.senha);
      if (!passwordValid) {
        return { success: false, message: 'Senha atual incorreta' };
      }

      // Validar nova senha
      if (!validatePassword(newPassword)) {
        return { success: false, message: 'Nova senha deve ter no mínimo 6 caracteres' };
      }

      // Hash da nova senha
      const hashedNewPassword = await AuthService.hashPassword(newPassword);

      // Atualizar senha
      await UserModel.update(
        { senha: hashedNewPassword },
        { where: { id: userId } }
      );

      return {
        success: true,
        message: 'Senha alterada com sucesso'
      };
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }
}