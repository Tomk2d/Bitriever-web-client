export interface EconomicEventValueResponse {
  id: number;
  ric: string;
  unit: string;
  unitPrefix: string;
  actual: number | null;
  forecast: number | null;
  actualForecastDiff: number | null;
  historical: number | null;
  time: string | null;
  preAnnouncementWording: string | null;
}

export interface EconomicEventResponse {
  id: number;
  uniqueName: string;
  eventDate: string; // LocalDate -> "YYYY-MM-DD"
  title: string;
  subtitleText: string | null;
  countryType: string;
  excludeFromAll: boolean;
  economicEventValue: EconomicEventValueResponse | null;
  createdAt: string; // LocalDateTime
  updatedAt: string; // LocalDateTime
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    field?: string;
  };
  message?: string;
  timestamp?: string;
}
