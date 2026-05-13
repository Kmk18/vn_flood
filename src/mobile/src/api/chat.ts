import { api } from './client';

export interface ChatResponse {
  reply: string;
  sources: string[];
}

export const chatApi = {
  send: (message: string) =>
    api.post<ChatResponse>('/api/chat', { message }).then((r) => r.data),
};
