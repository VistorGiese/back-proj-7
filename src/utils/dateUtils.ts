/**
 * Utilitários para manipulação de datas/horários - Toca Aqui
 */

// Timezone padrão do Brasil
export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converter data para formato Google Calendar (ISO com timezone)
 */
export const toGoogleCalendarFormat = (date: Date, timezone: string = BRAZIL_TIMEZONE): string => {
  return date.toISOString();
};

/**
 * Adicionar minutos a uma data
 */
export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + (minutes * 60 * 1000));
};

/**
 * Adicionar horas a uma data
 */
export const addHours = (date: Date, hours: number): Date => {
  return addMinutes(date, hours * 60);
};

/**
 * Adicionar dias a uma data
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Verificar se data está no passado
 */
export const isPastDate = (date: Date): boolean => {
  return date < new Date();
};

/**
 * Verificar se data está no futuro
 */
export const isFutureDate = (date: Date): boolean => {
  return date > new Date();
};

/**
 * Obter diferença em minutos entre duas datas
 */
export const getDifferenceInMinutes = (startDate: Date, endDate: Date): number => {
  return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
};

/**
 * Formatar data para string legível em português
 */
export const formatDateToPTBR = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Formatar data e hora para string legível em português
 */
export const formatDateTimeToPTBR = (date: Date): string => {
  return date.toLocaleString('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formatar apenas hora em formato brasileiro
 */
export const formatTimeToPTBR = (date: Date): string => {
  return date.toLocaleTimeString('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Obter início do dia para uma data
 */
export const getStartOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Obter final do dia para uma data
 */
export const getEndOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

/**
 * Verificar se duas datas são do mesmo dia
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

/**
 * Verificar se horário está dentro do range de funcionamento
 */
export const isWithinBusinessHours = (
  date: Date,
  startTime: string, // formato "HH:MM"
  endTime: string    // formato "HH:MM"
): boolean => {
  const timeStr = formatTimeToPTBR(date);
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const [currentHour, currentMin] = timeStr.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const currentMinutes = currentHour * 60 + currentMin;
  
  // Tratar caso onde endTime é menor que startTime (ex: 18:00 às 02:00)
  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

/**
 * Obter próximo dia útil (segunda a sexta)
 */
export const getNextBusinessDay = (date: Date): Date => {
  const result = new Date(date);
  do {
    result.setDate(result.getDate() + 1);
  } while (result.getDay() === 0 || result.getDay() === 6); // 0 = domingo, 6 = sábado
  
  return result;
};

/**
 * Verificar se é dia útil
 */
export const isBusinessDay = (date: Date): boolean => {
  const dayOfWeek = date.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5; // Segunda a sexta
};

/**
 * Converter minutos para string legível (ex: 90 -> "1h 30min")
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
};

/**
 * Criar data a partir de string de data e hora
 */
export const createDateFromDateTime = (dateStr: string, timeStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  
  return new Date(year, month - 1, day, hour, minute);
};