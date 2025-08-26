// src/models/index.ts
import sequelize from './config/database';
import { setupAssociations } from './models/associations';
import express, { Request, Response } from 'express';
// import { syncDatabase } from '../src/scripts/syncDatabase'; // Importa a função de sincronização

// Classe principal da aplicação
class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.config();
    this.routes();
  }

  // Configurações do Express
  private config(): void {
    // Middleware para permitir o parsing de JSON no corpo das requisições
    this.app.use(express.json());
  }

  // Define as rotas da aplicação
  private routes(): void {
    this.app.get('/', (_req: Request, res: Response) => {
      res.status(200).json({ message: 'API TocaAqui está no ar!' });
    });

    // Adicione outras rotas aqui no futuro
    // Ex: this.app.use('/users', userRoutes);
  }

  // Inicia o servidor e sincroniza o banco de dados
  public async start(port: number): Promise<void> {
    try {
      // Sincroniza o banco de dados. 
      // O 'force: true' é útil em desenvolvimento para recriar as tabelas a cada reinicialização.
      // Em produção, você deve usar 'force: false'.
      await syncDatabase(true); 

      this.app.listen(port, () => {
        console.log(`🚀 Servidor rodando na porta ${port}`);
        console.log(`🔗 Acesse em http://localhost:${port}`);
      });
    } catch (error) {
      console.error('❌ Falha ao iniciar o servidor:', error);
      // Encerra o processo se não conseguir conectar ao banco
      process.exit(1); 
    }
  }
}

// --- Ponto de Entrada da Aplicação ---

// Define a porta do servidor
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Cria uma instância da aplicação
const server = new App();

// Inicia o servidor
server.start(PORT);

// Importar todos os models
import UserModel from './models/UserModel';
import AddressModel from './models/AddressModel';
import GenreModel from './models/GenreModel';
import InstrumentModel from './models/InstrumentModel';
import EstablishmentModel from './models/EstablishmentModel';
import BandModel from './models/BandModel';
import CommonUserModel from './models/CommonUserModel';
import EstablishmentScheduleModel from './models/EstablishmentScheduleModel';
import BandAvailabilityModel from './models/BandAvailabilityModel';
import { BandBlockModel, EstablishmentBlockModel } from './models/BlockModels';
import BookingModel from './models/BookingModel';
import ContractModel from './models/ContractModel';
import PaymentModel from './models/PaymentModel';
import BandMemberModel from './models/BandMemberModel';
import RatingModel from './models/RatingModel';
import CommentModel from './models/CommentModel';
import FavoriteModel from './models/FavoriteModel';
import {
  BandGenreModel,
  EstablishmentGenreModel,
  BandInstrumentModel,
  EstablishmentInstrumentModel,
} from './models/JunctionModels';
import {
  CompletedShowModel,
  TicketModel,
  BookingHistoryModel,
  CounterProposalModel,
} from './models/ComplementaryModels';

// Configurar associações
setupAssociations();

// Função para sincronizar o banco de dados
export async function syncDatabase(force: boolean = true) {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso.');
    
    await sequelize.sync({ force });
    console.log(`✅ Banco de dados sincronizado ${force ? '(recriado)' : ''}`);
  
    
    // Se for para recriar, inserir dados básicos
    if (force) {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    }
  } catch (error) {
    console.error('❌ Erro ao conectar/sincronizar banco de dados:', error);
    throw error;
  }
}

/*// Função para inserir dados básicos
async function seedDatabase() {
  try {
    // Inserir gêneros básicos
    const genres = [
      { nome: 'Rock', descricao: 'Gênero musical caracterizado por guitarra elétrica, baixo e bateria' },
      { nome: 'Pop', descricao: 'Música popular contemporânea' },
      { nome: 'Jazz', descricao: 'Gênero musical que se originou nas comunidades afro-americanas' },
      { nome: 'Blues', descricao: 'Gênero musical originário do sul dos Estados Unidos' },
      { nome: 'Reggae', descricao: 'Gênero musical que se originou na Jamaica' },
      { nome: 'Country', descricao: 'Gênero musical que se originou no sul dos Estados Unidos' },
      { nome: 'Folk', descricao: 'Música tradicional de um povo ou país' },
      { nome: 'Eletrônica', descricao: 'Música criada usando instrumentos eletrônicos' },
      { nome: 'Hip Hop', descricao: 'Gênero musical que se originou nas comunidades afro-americanas' },
      { nome: 'Funk', descricao: 'Gênero musical que se originou nas comunidades afro-americanas' },
      { nome: 'MPB', descricao: 'Música Popular Brasileira' },
      { nome: 'Samba', descricao: 'Gênero musical brasileiro' },
      { nome: 'Forró', descricao: 'Gênero musical popular no Nordeste do Brasil' },
      { nome: 'Sertanejo', descricao: 'Gênero musical popular no Brasil' },
      { nome: 'Pagode', descricao: 'Subgênero do samba' },
      { nome: 'Axé', descricao: 'Gênero musical popular na Bahia' },
    ];
    
    await GenreModel.bulkCreate(genres);
    console.log('✅ Gêneros musicais inseridos');
    
    // Inserir instrumentos básicos
    const instruments = [
      { nome: 'Guitarra', categoria: 'cordas' },
      { nome: 'Baixo', categoria: 'cordas' },
      { nome: 'Bateria', categoria: 'percussao' },
      { nome: 'Violão', categoria: 'cordas' },
      { nome: 'Teclado', categoria: 'teclas' },
      { nome: 'Piano', categoria: 'teclas' },
      { nome: 'Saxofone', categoria: 'sopro' },
      { nome: 'Trompete', categoria: 'sopro' },
      { nome: 'Violino', categoria: 'cordas' },
      { nome: 'Flauta', categoria: 'sopro' },
      { nome: 'Harmônica', categoria: 'sopro' },
      { nome: 'Cajón', categoria: 'percussao' },
      { nome: 'Pandeiro', categoria: 'percussao' },
      { nome: 'Triângulo', categoria: 'percussao' },
      { nome: 'Acordeon', categoria: 'teclas' },
      { nome: 'Microfone', categoria: 'audio' },
      { nome: 'Mesa de Som', categoria: 'audio' },
      { nome: 'Amplificador', categoria: 'audio' },
    ];
    
    await InstrumentModel.bulkCreate(instruments);
    console.log('✅ Instrumentos inseridos');
    
  } catch (error) {
    console.error('❌ Erro ao inserir dados básicos:', error);
    throw error;
  }
}*/

// Exportar todos os models
export {
  sequelize,
  UserModel,
  AddressModel,
  GenreModel,
  InstrumentModel,
  EstablishmentModel,
  BandModel,
  CommonUserModel,
  EstablishmentScheduleModel,
  BandAvailabilityModel,
  BandBlockModel,
  EstablishmentBlockModel,
  BookingModel,
  ContractModel,
  PaymentModel,
  BandMemberModel,
  RatingModel,
  CommentModel,
  FavoriteModel,
  BandGenreModel,
  EstablishmentGenreModel,
  BandInstrumentModel,
  EstablishmentInstrumentModel,
  CompletedShowModel,
  TicketModel,
  BookingHistoryModel,
  CounterProposalModel,
};

// Exportar tipos e enums
export { UserType } from './models/UserModel';
export { InstrumentCategory } from './models/InstrumentModel';
export { WeekDay } from './models/EstablishmentScheduleModel';
export { 
  BookingStatus, 
  BookingRequestType, 
  PaymentMethod 
} from './models/BookingModel';
export { ContractStatus } from './models/ContractModel';
export { PaymentType, PaymentStatus } from './models/PaymentModel';
export { RatingTargetType } from './models/RatingModel';
export { InstrumentCondition } from './models/JunctionModels';
export { 
  TicketType, 
  TicketStatus, 
  CounterProposalStatus 
} from './models/ComplementaryModels';