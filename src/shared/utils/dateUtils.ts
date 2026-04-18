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

/** 오늘 날짜(UTC) YYYY-MM-DD. 차트 당일 봉 키/비교용 */
export const getTodayUtcString = (): string => {
  return new Date().toISOString().slice(0, 10);
};

export interface DateRange {
  startDate: string;
  endDate: string;
}

/** 해당 날짜(23:59:59) 기준 이전 6개월 구간 (startDate ~ endDate, ISO8601: YYYY-MM-DDTHH:mm:ss) */
export const getSixMonthRangeBefore = (targetDateStr: string): { startDate: string; endDate: string } => {
  const end = new Date(targetDateStr.trim().slice(0, 10) + 'T23:59:59');
  const start = new Date(end);
  start.setMonth(start.getMonth() - 6);
  start.setHours(0, 0, 0, 0);
  return {
    startDate: formatDateToISO8601(start),
    endDate: formatDateToISO8601(end),
  };
};

export const calculateChartDateRange = (selectedDate: string, monthsRange: number = 6): DateRange => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const parsedSelected = new Date(selectedDate);
  const isInvalidSelected = Number.isNaN(parsedSelected.getTime());

  // selectedDate가 비정상 값이면 오늘 날짜를 기준으로 fallback
  const safeSelectedDate = isInvalidSelected ? new Date(today) : parsedSelected;
  safeSelectedDate.setHours(0, 0, 0, 0);

  // 미래 날짜를 선택했을 때는 오늘까지로 보정
  const endDate = safeSelectedDate > today ? new Date(today) : new Date(safeSelectedDate);
  endDate.setHours(23, 59, 59, 999);

  const safeMonthsRange = Number.isFinite(monthsRange) && monthsRange > 0 ? Math.floor(monthsRange) : 6;
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - safeMonthsRange);
  startDate.setHours(0, 0, 0, 0);

  return {
    startDate: formatDateToISO8601(startDate),
    endDate: formatDateToISO8601(endDate),
  };
};

