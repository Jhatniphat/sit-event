import apiClient from '@/shared/utils/FetchUtils';

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  link?: string;
  eventId?: string;
  backgroundType: 'PARTICLE' | 'IMAGE';
  backgroundImage?: string;
  icons: string[];
  announcementType: 'PRE_EVENT' | 'REGISTRATION' | 'IN_EVENT' | 'OTHERS';
  startDate: string;
  endDate: string;
  contentDate?: string;
  createdAt: string;
  updatedAt: string;
}

export const suggestionService = {
  createSuggestion: async (formData: FormData): Promise<Suggestion> => {
    return apiClient.post('/suggestions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getAllSuggestions: async (): Promise<Suggestion[]> => {
    return apiClient.get('/suggestions');
  },

  getActiveSuggestions: async (): Promise<Suggestion[]> => {
    return apiClient.get('/suggestions/active');
  },

  getSuggestionById: async (id: string): Promise<Suggestion> => {
    return apiClient.get(`/suggestions/${id}`);
  },

  updateSuggestion: async (id: string, formData: FormData): Promise<Suggestion> => {
    return apiClient.patch(`/suggestions/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  deleteSuggestion: async (id: string): Promise<void> => {
    return apiClient.delete(`/suggestions/${id}`);
  },
};
