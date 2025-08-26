import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// Configuração OAuth2 para Google Calendar
export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Escopos necessários para Google Calendar
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

// Instância do Google Calendar API
export const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// URL de autorização
export const getAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    prompt: 'consent' // Força refresh_token sempre
  });
};

// Definir credenciais de acesso
export const setCredentials = (tokens: any) => {
  oauth2Client.setCredentials(tokens);
};

export default {
  oauth2Client,
  calendar,
  GOOGLE_SCOPES,
  getAuthUrl,
  setCredentials
};