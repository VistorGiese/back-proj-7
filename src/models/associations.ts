// src/models/associations.ts
import UserModel from './UserModel';
import AddressModel from './AddressModel';
import GenreModel from './GenreModel';
import InstrumentModel from './InstrumentModel';
import EstablishmentModel from './EstablishmentModel';
import BandModel from './BandModel';
import CommonUserModel from './CommonUserModel';
import EstablishmentScheduleModel from './EstablishmentScheduleModel';
import BandAvailabilityModel from './BandAvailabilityModel';
import { BandBlockModel, EstablishmentBlockModel } from './BlockModels';
import BookingModel from './BookingModel';
import ContractModel from './ContractModel';
import PaymentModel from './PaymentModel';
import BandMemberModel from './BandMemberModel';
import RatingModel from './RatingModel';
import CommentModel from './CommentModel';
import FavoriteModel from './FavoriteModel';
import {
  BandGenreModel,
  EstablishmentGenreModel,
  BandInstrumentModel,
  EstablishmentInstrumentModel,
} from './JunctionModels';
import {
  CompletedShowModel,
  TicketModel,
  BookingHistoryModel,
  CounterProposalModel,
} from './ComplementaryModels';

export function setupAssociations() {
  // ===== RELACIONAMENTOS PRINCIPAIS =====
  
  // User -> Band (1:1)
  UserModel.hasOne(BandModel, {
    foreignKey: 'usuario_id',
    as: 'banda',
  });
  BandModel.belongsTo(UserModel, {
    foreignKey: 'usuario_id',
    as: 'usuario',
  });

  // User -> Establishment (1:1)
  UserModel.hasOne(EstablishmentModel, {
    foreignKey: 'usuario_id',
    as: 'estabelecimento',
  });
  EstablishmentModel.belongsTo(UserModel, {
    foreignKey: 'usuario_id',
    as: 'usuario',
  });

  // User -> CommonUser (1:1)
  UserModel.hasOne(CommonUserModel, {
    foreignKey: 'usuario_id',
    as: 'usuarioComum',
  });
  CommonUserModel.belongsTo(UserModel, {
    foreignKey: 'usuario_id',
    as: 'usuario',
  });

  // Establishment -> Address (N:1)
  EstablishmentModel.belongsTo(AddressModel, {
    foreignKey: 'endereco_id',
    as: 'endereco',
  });
  AddressModel.hasMany(EstablishmentModel, {
    foreignKey: 'endereco_id',
    as: 'estabelecimentos',
  });

  // CommonUser -> Address (N:1)
  CommonUserModel.belongsTo(AddressModel, {
    foreignKey: 'endereco_id',
    as: 'endereco',
  });
  AddressModel.hasMany(CommonUserModel, {
    foreignKey: 'endereco_id',
    as: 'usuariosComuns',
  });

  // ===== RELACIONAMENTOS DE AGENDAMENTO =====
  
  // Booking -> Band (N:1)
  BookingModel.belongsTo(BandModel, {
    foreignKey: 'banda_id',
    as: 'banda',
  });
  BandModel.hasMany(BookingModel, {
    foreignKey: 'banda_id',
    as: 'agendamentos',
  });

  // Booking -> Establishment (N:1)
  BookingModel.belongsTo(EstablishmentModel, {
    foreignKey: 'estabelecimento_id',
    as: 'estabelecimento',
  });
  EstablishmentModel.hasMany(BookingModel, {
    foreignKey: 'estabelecimento_id',
    as: 'agendamentos',
  });

  // Booking -> User (solicitante) (N:1)
  BookingModel.belongsTo(UserModel, {
    foreignKey: 'usuario_solicitante_id',
    as: 'solicitante',
  });
  UserModel.hasMany(BookingModel, {
    foreignKey: 'usuario_solicitante_id',
    as: 'solicitacoes',
  });

  // ===== RELACIONAMENTOS DE CONTRATO E PAGAMENTO =====
  
  // Contract -> Booking (1:1)
  BookingModel.hasOne(ContractModel, {
    foreignKey: 'agendamento_id',
    as: 'contrato',
  });
  ContractModel.belongsTo(BookingModel, {
    foreignKey: 'agendamento_id',
    as: 'agendamento',
  });

  // Payment -> Contract (N:1)
  PaymentModel.belongsTo(ContractModel, {
    foreignKey: 'contrato_id',
    as: 'contrato',
  });
  ContractModel.hasMany(PaymentModel, {
    foreignKey: 'contrato_id',
    as: 'pagamentos',
  });

  // ===== RELACIONAMENTOS DE DISPONIBILIDADE =====
  
  // BandAvailability -> Band (N:1)
  BandAvailabilityModel.belongsTo(BandModel, {
    foreignKey: 'banda_id',
    as: 'banda',
  });
  BandModel.hasMany(BandAvailabilityModel, {
    foreignKey: 'banda_id',
    as: 'disponibilidades',
  });

  // BandBlock -> Band (N:1)
  BandBlockModel.belongsTo(BandModel, {
    foreignKey: 'banda_id',
    as: 'banda',
  });
  BandModel.hasMany(BandBlockModel, {
    foreignKey: 'banda_id',
    as: 'bloqueios',
  });

  // EstablishmentBlock -> Establishment (N:1)
  EstablishmentBlockModel.belongsTo(EstablishmentModel, {
    foreignKey: 'estabelecimento_id',
    as: 'estabelecimento',
  });
  EstablishmentModel.hasMany(EstablishmentBlockModel, {
    foreignKey: 'estabelecimento_id',
    as: 'bloqueios',
  });

  // EstablishmentSchedule -> Establishment (N:1)
  EstablishmentScheduleModel.belongsTo(EstablishmentModel, {
    foreignKey: 'estabelecimento_id',
    as: 'estabelecimento',
  });
  EstablishmentModel.hasMany(EstablishmentScheduleModel, {
    foreignKey: 'estabelecimento_id',
    as: 'horarios',
  });

  // ===== RELACIONAMENTOS MUITOS-PARA-MUITOS =====
  
  // Band <-> Genre (N:N)
  BandModel.belongsToMany(GenreModel, {
    through: BandGenreModel,
    foreignKey: 'banda_id',
    otherKey: 'genero_id',
    as: 'generos',
  });
  GenreModel.belongsToMany(BandModel, {
    through: BandGenreModel,
    foreignKey: 'genero_id',
    otherKey: 'banda_id',
    as: 'bandas',
  });

  // Establishment <-> Genre (N:N)
  EstablishmentModel.belongsToMany(GenreModel, {
    through: EstablishmentGenreModel,
    foreignKey: 'estabelecimento_id',
    otherKey: 'genero_id',
    as: 'generos',
  });
  GenreModel.belongsToMany(EstablishmentModel, {
    through: EstablishmentGenreModel,
    foreignKey: 'genero_id',
    otherKey: 'estabelecimento_id',
    as: 'estabelecimentos',
  });

  // Band <-> Instrument (N:N)
  BandModel.belongsToMany(InstrumentModel, {
    through: BandInstrumentModel,
    foreignKey: 'banda_id',
    otherKey: 'instrumento_id',
    as: 'instrumentos',
  });
  InstrumentModel.belongsToMany(BandModel, {
    through: BandInstrumentModel,
    foreignKey: 'instrumento_id',
    otherKey: 'banda_id',
    as: 'bandas',
  });

  // Establishment <-> Instrument (N:N)
  EstablishmentModel.belongsToMany(InstrumentModel, {
    through: EstablishmentInstrumentModel,
    foreignKey: 'estabelecimento_id',
    otherKey: 'instrumento_id',
    as: 'instrumentos',
  });
  InstrumentModel.belongsToMany(EstablishmentModel, {
    through: EstablishmentInstrumentModel,
    foreignKey: 'instrumento_id',
    otherKey: 'estabelecimento_id',
    as: 'estabelecimentos',
  });

  // ===== RELACIONAMENTOS DE MEMBROS =====
  
  // BandMember -> Band (N:1)
  BandMemberModel.belongsTo(BandModel, {
    foreignKey: 'banda_id',
    as: 'banda',
  });
  BandModel.hasMany(BandMemberModel, {
    foreignKey: 'banda_id',
    as: 'integrantes',
  });

  // ===== RELACIONAMENTOS DE AVALIAÇÃO E COMENTÁRIOS =====
  
  // Rating -> User (N:1)
  RatingModel.belongsTo(UserModel, {
    foreignKey: 'usuario_id',
    as: 'usuario',
  });
  UserModel.hasMany(RatingModel, {
    foreignKey: 'usuario_id',
    as: 'avaliacoes',
  });

  // Rating -> Booking (N:1)
  RatingModel.belongsTo(BookingModel, {
    foreignKey: 'agendamento_id',
    as: 'agendamento',
  });
  BookingModel.hasMany(RatingModel, {
    foreignKey: 'agendamento_id',
    as: 'avaliacoes',
  });

  // Comment -> User (N:1)
  CommentModel.belongsTo(UserModel, {
    foreignKey: 'usuario_id',
    as: 'usuario',
  });
  UserModel.hasMany(CommentModel, {
    foreignKey: 'usuario_id',
    as: 'comentarios',
  });

  // Comment -> Booking (N:1)
  CommentModel.belongsTo(BookingModel, {
    foreignKey: 'agendamento_id',
    as: 'agendamento',
  });
  BookingModel.hasMany(CommentModel, {
    foreignKey: 'agendamento_id',
    as: 'comentarios',
  });

  // ===== RELACIONAMENTOS DE FAVORITOS =====
  
  // Favorite -> User (N:1)
  FavoriteModel.belongsTo(UserModel, {
    foreignKey: 'usuario_id',
    as: 'usuario',
  });
  UserModel.hasMany(FavoriteModel, {
    foreignKey: 'usuario_id',
    as: 'favoritos',
  });

  // ===== RELACIONAMENTOS COMPLEMENTARES =====
  
  // CompletedShow -> Booking (1:1)
  BookingModel.hasOne(CompletedShowModel, {
    foreignKey: 'agendamento_id',
    as: 'showRealizado',
  });
  CompletedShowModel.belongsTo(BookingModel, {
    foreignKey: 'agendamento_id',
    as: 'agendamento',
  });

  // Ticket -> Booking (N:1)
  TicketModel.belongsTo(BookingModel, {
    foreignKey: 'agendamento_id',
    as: 'agendamento',
  });
  BookingModel.hasMany(TicketModel, {
    foreignKey: 'agendamento_id',
    as: 'ingressos',
  });

  // Ticket -> User (N:1)
  TicketModel.belongsTo(UserModel, {
    foreignKey: 'usuario_id',
    as: 'usuario',
  });
  UserModel.hasMany(TicketModel, {
    foreignKey: 'usuario_id',
    as: 'ingressos',
  });

  // BookingHistory -> Booking (N:1)
  BookingHistoryModel.belongsTo(BookingModel, {
    foreignKey: 'agendamento_id',
    as: 'agendamento',
  });
  BookingModel.hasMany(BookingHistoryModel, {
    foreignKey: 'agendamento_id',
    as: 'historico',
  });

  // BookingHistory -> User (N:1)
  BookingHistoryModel.belongsTo(UserModel, {
    foreignKey: 'usuario_id',
    as: 'usuario',
  });
  UserModel.hasMany(BookingHistoryModel, {
    foreignKey: 'usuario_id',
    as: 'alteracoesAgendamentos',
  });

  // CounterProposal -> Booking (N:1)
  CounterProposalModel.belongsTo(BookingModel, {
    foreignKey: 'agendamento_id',
    as: 'agendamento',
  });
  BookingModel.hasMany(CounterProposalModel, {
    foreignKey: 'agendamento_id',
    as: 'contrapropostas',
  });

  // CounterProposal -> User (N:1)
  CounterProposalModel.belongsTo(UserModel, {
    foreignKey: 'usuario_id',
    as: 'usuario',
  });
  UserModel.hasMany(CounterProposalModel, {
    foreignKey: 'usuario_id',
    as: 'contrapropostas',
  });
}