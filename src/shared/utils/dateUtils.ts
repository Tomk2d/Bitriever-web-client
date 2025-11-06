export const getMonthStartDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startDate = new Date(year, month, 1, 0, 0, 0, 0);
  return formatDateToISO8601(startDate);
};

export const getMonthEndDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return formatDateToISO8601(endDate);
};

const formatDateToISO8601 = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

export const formatDateToISO = (date: Date): string => {
  return date.toISOString();
};

export const getDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

