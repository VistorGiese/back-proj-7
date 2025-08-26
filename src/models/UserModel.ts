// src/models/UserModel.ts
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export enum UserType {
  COMUM = 'comum',
  BANDA = 'banda',
  ESTABELECIMENTO = 'estabelecimento'
}

class UserModel extends Model {
  id!: number;
  email!: string;
  senha!: string;
  nome!: string;
  telefone?: string;
  foto_perfil?: string;
  tipo_usuario!: UserType;
  ativo!: boolean;
  data_criacao!: Date;
  data_atualizacao!: Date;
}

UserModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    senha: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    nome: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    telefone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    foto_perfil: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    tipo_usuario: {
      type: DataTypes.ENUM(...Object.values(UserType)),
      allowNull: false,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    data_criacao: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    data_atualizacao: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'usuarios',
    timestamps: true,
    createdAt: 'data_criacao',
    updatedAt: 'data_atualizacao',
  }
);

export default UserModel;