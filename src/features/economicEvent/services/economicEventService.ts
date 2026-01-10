import { apiClient } from '@/lib/axios';
import { EconomicEventResponse, ApiResponse } from '../types';

export const economicEventService = {
  getUpcomingEvents: async (limit: number = 5): Promise<EconomicEventResponse[]> => {
    const url = `/api/economic-events/upcoming`;
    
    try {
      const response = await apiClient.get<ApiResponse<EconomicEventResponse[]>>(url, {
        params: { limit },
      });
      return response.data.data || [];
    } catch (error: any) {
      console.error('[EconomicEvent] Error:', {
        limit,
        url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      throw error;
    }
  },
  
  getTodayEventCount: async (): Promise<number> => {
    const url = `/api/economic-events/today/count`;
    
    try {
      const response = await apiClient.get<ApiResponse<number>>(url);
      return response.data.data || 0;
    } catch (error: any) {
      console.error('[EconomicEvent] Error getting today count:', {
        url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      throw error;
    }
  },
  
  getEventsByYearMonth: async (yearMonth: string): Promise<EconomicEventResponse[]> => {
    const url = `/api/economic-events/month/${yearMonth}`;
    
    try {
      const response = await apiClient.get<ApiResponse<EconomicEventResponse[]>>(url);
      return response.data.data || [];
    } catch (error: any) {
      console.error('[EconomicEvent] Error getting events by yearMonth:', {
        yearMonth,
        url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      throw error;
    }
  },
};
