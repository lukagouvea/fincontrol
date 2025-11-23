/**
 * Pega uma string de data (ex: '2025-10-15' de um <input type="date">) e a converte
 * para um objeto Date que representa o início daquele dia no FUSO HORÁRIO LOCAL do usuário.
 * * @param dateString A data no formato 'YYYY-MM-DD'.
 * @returns Um objeto Date local (ex: 2025-10-15T00:00:00.000-03:00 no Brasil).
 */
export const parseDateInputToLocal = (dateString: string): Date => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    // Retorna uma data inválida se o formato estiver incorreto
    return new Date('invalid');
  }
  // Força a interpretação da string no fuso horário local, evitando o bug do UTC
  return new Date(`${dateString}T00:00:00`);
};

export const dateInputToUTCString = (dateString: string): string => {
  const localDate = parseDateInputToLocal(dateString);
  return convertDateToUTCISOString(localDate);
}

/**
 * Converte um objeto Date local para uma string no padrão ISO 8601 em UTC.
 * Este é o formato ideal para enviar para o backend e salvar no banco de dados.
 * * @param localDate O objeto Date local (pode ser `new Date()` ou o resultado de `parseDateInputToLocal`).
 * @returns A data/hora como uma string ISO 8601 em UTC (ex: "2025-10-15T03:00:00.000Z").
 */
export const convertDateToUTCISOString = (localDate: Date): string => {
  return localDate.toISOString();
};

/**
 * Pega uma string de data/hora em UTC (vinda do backend) e a formata para uma
 * representação legível no fuso horário e idioma LOCAL do usuário.
 * * @param utcDateString A string ISO 8601 em UTC (ex: "2025-10-15T03:00:00.000Z").
 * @param options Opções de formatação para Intl.DateTimeFormat (opcional).
 * @returns A data e/ou hora formatada para a localidade do usuário.
 */
export const formatUTCToLocal = (
  utcDateString: string,
  options?: Intl.DateTimeFormatOptions
): string => {
  const localDate = new Date(utcDateString);

  // Define opções padrão se nenhuma for fornecida
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };

  return localDate.toLocaleDateString('pt-BR', options || defaultOptions);
};

/**
 * Retorna a data ATUAL, no fuso horário local do usuário, já formatada como string 'YYYY-MM-DD'.
 * Ideal para definir o valor padrão de um <input type="date">.
 * * @returns {string} A data atual no formato 'YYYY-MM-DD'.
 * * @example
 * // Se hoje for 14 de Outubro de 2025:
 * getCurrentDateAsYYYYMMDD(); // Retorna "2025-10-14"
 */
export const getCurrentDateAsYYYYMMDD = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Converte um objeto Date do JavaScript para uma string no formato 'YYYY-MM-DD'.
 * Esta função respeita a data local do usuário, evitando bugs de fuso horário.
 * @param date O objeto Date a ser formatado.
 * @returns A data como uma string 'YYYY-MM-DD'.
 */
export const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};


/**
 * Converte uma string de data em formato ISO UTC para uma string de data local
 * no formato DD/MM/AAAA.
 *
 * @param utcDateString A data como uma string ISO 8601 UTC (ex: "2023-01-05T03:00:00.000Z").
 * @returns A data formatada como "DD/MM/AAAA" no fuso horário local, ou uma mensagem de erro.
 */
export const formatUTCToDDMMAAAA = (utcDateString: string): string => {
  if (!utcDateString) {
    return "Data inválida";
  }

  const date = new Date(utcDateString);

  // Verifica se a data criada é válida
  if (isNaN(date.getTime())) {
    return "Data inválida";
  }

  // toLocaleDateString converte para o fuso horário local do navegador
  // e formata de acordo com as opções.
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Compara uma string de data em formato ISO UTC com um objeto Date local
 * para verificar se ambos representam o mesmo dia, mês e ano no fuso horário local.
 *
 * @param utcDateString A data como uma string ISO 8601 UTC (ex: "2025-10-15T01:00:00.000Z").
 * @param localDate O objeto Date local para comparação (ex: new Date()).
 * @returns 'true' se corresponderem ao mesmo dia do calendário local, 'false' caso contrário.
 */
export const areSameDay = (utcDateString: string, localDate: Date): boolean => {
  if (!utcDateString || !localDate) {
    return false;
  }

  // 1. Cria um objeto Date a partir da string UTC. O JS armazena o ponto exato no tempo.
  const dateFromUTC = new Date(utcDateString);

  // Verifica se as datas são válidas
  if (isNaN(dateFromUTC.getTime()) || isNaN(localDate.getTime())) {
    return false;
  }

  // 2. Compara os componentes de ambas as datas no FUSO HORÁRIO LOCAL do navegador.
  //    Os métodos getFullYear(), getMonth() e getDate() sempre retornam os valores
  //    baseados na localidade do usuário.
  return (
    dateFromUTC.getFullYear() === localDate.getFullYear() &&
    dateFromUTC.getMonth() === localDate.getMonth() &&
    dateFromUTC.getDate() === localDate.getDate()
  );
};


export const getLocalDateYYYYMMDD = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


/**
 * Retorna o início exato da semana (segunda-feira, 00:00:00) para uma data.
 * @param date A data de referência.
 * @returns Um objeto Date para a segunda-feira daquela semana, às 00:00:00.
 */
export function getStartOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay(); // 0 = Domingo, 1 = Segunda

  const diff = day === 0 ? 6 : day - 1;

  result.setDate(result.getDate() - diff);
  
  // Zera a hora para o início do dia
  result.setHours(0, 0, 0, 0); 
  
  return result;
}

export function formatUTCStringToYYYYMMDD(utcDateString: string | undefined): string {
  if (!utcDateString) return '';
  const date = new Date(utcDateString);
  return formatDateToYYYYMMDD(date);
}

/**
 * Retorna o final exato da semana (domingo, 23:59:59) para uma data.
 * @param date A data de referência.
 * @returns Um objeto Date para o domingo daquela semana, às 23:59:59.
 */
export function getEndOfWeek(date: Date): Date {
  // Reutiliza a função getStartOfWeek para encontrar a segunda-feira às 00:00
  const start = getStartOfWeek(date);
  
  const end = new Date(start);
  
  // Adiciona 6 dias para chegar ao domingo
  end.setDate(end.getDate() + 6);
  
  // Define a hora para o último momento do dia
  end.setHours(23, 59, 59, 999);
  
  return end;
}