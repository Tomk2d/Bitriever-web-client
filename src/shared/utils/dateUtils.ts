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

export interface DateRange {
  startDate: string;
  endDate: string;
}

export const calculateChartDateRange = (selectedDate: string, monthsRange: number = 6): DateRange => {
  const selected = new Date(selectedDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  const selectedDateOnly = new Date(selected);
  selectedDateOnly.setHours(0, 0, 0, 0);
  
  const todayDateOnly = new Date(today);
  todayDateOnly.setHours(0, 0, 0, 0);
  
  const halfRangeMonths = Math.floor(monthsRange / 2);
  
  let startDate = new Date(selectedDateOnly);
  startDate.setMonth(startDate.getMonth() - halfRangeMonths);
  startDate.setHours(0, 0, 0, 0);
  
  let endDate = new Date(selectedDateOnly);
  endDate.setMonth(endDate.getMonth() + halfRangeMonths);
  endDate.setHours(23, 59, 59, 999);
  
  const isSelectedDateTodayOrFuture = selectedDateOnly >= todayDateOnly;
  const isEndDateAfterToday = endDate > today;
  
  if (isSelectedDateTodayOrFuture || isEndDateAfterToday) {
    endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);
    
    startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - monthsRange);
    startDate.setHours(0, 0, 0, 0);
  }
  
  return {
    startDate: formatDateToISO8601(startDate),
    endDate: formatDateToISO8601(endDate),
  };
};

