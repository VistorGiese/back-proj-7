/**
 * Validações para o sistema Toca Aqui
 */

/**
 * Validar formato de email
 */
export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  /**
   * Validar senha (mínimo 6 caracteres)
   */
  export const validatePassword = (password: string): boolean => {
    return password && password.length >= 6;
  };
  
  /**
   * Validar nome (mínimo 2 caracteres)
   */
  export const validateName = (name: string): boolean => {
    if (!name || name.trim().length < 2) {
      return false;
    }
    
    const nameRegex = /^[a-zA-ZÀ-ÿ\s]+$/;
    return nameRegex.test(name.trim());
  };
  
  /**
   * Validar telefone brasileiro
   */
  export const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Telefone é opcional
    
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
  };
  
  /**
   * Validar CEP brasileiro
   */
  export const validateCEP = (cep: string): boolean => {
    if (!cep) return false;
    
    const cleanCEP = cep.replace(/\D/g, '');
    return cleanCEP.length === 8;
  };
  
  /**
   * Validar CNPJ
   */
  export const validateCNPJ = (cnpj: string): boolean => {
    if (!cnpj) return true; // CNPJ é opcional
    
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    return cleanCNPJ.length === 14;
  };
  
  /**
   * Validar valores monetários
   */
  export const validateMoneyValue = (value: number): boolean => {
    return value >= 0 && Number.isFinite(value);
  };
  
  /**
   * Validar duração em minutos
   */
  export const validateDuration = (minutes: number): boolean => {
    return Number.isInteger(minutes) && minutes >= 30 && minutes <= 480; // 30min a 8h
  };
  
  /**
   * Validar data futura
   */
  export const validateFutureDate = (date: Date | string): boolean => {
    const targetDate = new Date(date);
    const now = new Date();
    return targetDate > now;
  };
  
  /**
   * Validar porcentagem (0-100)
   */
  export const validatePercentage = (value: number): boolean => {
    return Number.isFinite(value) && value >= 0 && value <= 100;
  };
  
  /**
   * Validar formato de horário (HH:MM)
   */
  export const validateTimeFormat = (time: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };
  
  /**
   * Validar ID numérico positivo
   */
  export const validateId = (id: number | string): boolean => {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    return Number.isInteger(numId) && numId > 0;
  };
  
  /**
   * Sanitizar string (remover caracteres especiais)
   */
  export const sanitizeString = (input: string): string => {
    return input.trim().replace(/[<>]/g, '');
  };