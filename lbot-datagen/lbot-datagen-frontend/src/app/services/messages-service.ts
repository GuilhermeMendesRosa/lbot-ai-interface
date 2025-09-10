import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatDto {
  id: string;
  createdAt: string;
  messages: MessageDto[];
  observation: string | null;
}

export interface MessageDto {
  id: string;
  prompt: string;
  normalizedPrompt: string;
  output: string;
  grade: number | null;
  chatId: string;
}

export interface MessageRequest {
  prompt: string;
  chatId: string;
}

export interface EvaluateRequest {
  messageId: string;
  grade: number;
}

export interface EvaluateResponse {
  success: boolean;
  message?: string;
  // adicione outros campos conforme a resposta da sua API de avaliação
}

@Injectable({
  providedIn: 'root'
})
export class MessagesService {
  private baseUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  // Iniciar um novo chat
  startChat(): Observable<ChatDto> {
    return this.http.get<ChatDto>(`${this.baseUrl}/chats`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Enviar mensagem
  sendMessage(request: MessageRequest): Observable<MessageDto> {
    return this.http.post<MessageDto>(`${this.baseUrl}/messages`, request, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Avaliar mensagem
  evaluateMessage(request: EvaluateRequest): Observable<EvaluateResponse> {
    return this.http.post<EvaluateResponse>(`${this.baseUrl}/messages/evaluate`, request, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
