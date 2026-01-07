import { apiClient } from '@/lib/axios';
import { EconomicIndexType, EconomicIndexResponse, ApiResponse } from '../types';

export const economicIndexService = {
  getEconomicIndexByType: async (
    type: EconomicIndexType
  ): Promise<EconomicIndexResponse[]> => {
    // enum 값을 명시적으로 문자열로 변환하여 전송
    const typeString = String(type);
    const url = `/api/economic-indices/${typeString}`;
    
    console.log('[EconomicIndex] Fetching:', { type, typeString, url });
    
    try {
      const response = await apiClient.get<ApiResponse<EconomicIndexResponse[]>>(url);
      console.log('[EconomicIndex] Success:', { type, dataLength: response.data.data?.length });
      return response.data.data || [];
    } catch (error: any) {
      console.error('[EconomicIndex] Error:', { 
        type, 
        typeString, 
        url, 
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      throw error;
    }
  },
};

