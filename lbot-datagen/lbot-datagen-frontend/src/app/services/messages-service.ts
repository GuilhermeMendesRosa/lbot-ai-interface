import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Data Transfer Object for chat sessions.
 */
export interface ChatDto {
  id: string;
  createdAt: string;
  messages: MessageDto[];
  observation: string | null;
}

/**
 * Data Transfer Object for individual messages.
 */
export interface MessageDto {
  id: string;
  prompt: string;
  normalizedPrompt: string;
  output: string;
  grade: number | null;
  chatId: string;
}

/**
 * Request payload for sending a new message.
 */
export interface MessageRequest {
  prompt: string;
  chatId: string;
}

/**
 * Request payload for evaluating a message.
 */
export interface EvaluateRequest {
  messageId: string;
  grade: number;
}

/**
 * Response from message evaluation endpoint.
 */
export interface EvaluateResponse {
  success: boolean;
  message?: string;
}

/**
 * Service responsible for managing chat messages and communication with the backend API.
 * Handles chat initialization, message sending, and message evaluation.
 */
@Injectable({
  providedIn: 'root'
})
export class MessagesService {
  private readonly baseUrl = 'https://lbot-ai-interface-production.up.railway.app';
  private readonly defaultHeaders = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  constructor(private readonly http: HttpClient) { }

  /**
   * Initializes a new chat session.
   * @returns Observable with the created chat data
   */
  public startChat(): Observable<ChatDto> {
    return this.http.get<ChatDto>(`${this.baseUrl}/chats`, {
      headers: this.defaultHeaders
    });
  }

  /**
   * Sends a message to the backend for processing.
   * @param request - The message request containing prompt and chat ID
   * @returns Observable with the message response including LBML output
   */
  public sendMessage(request: MessageRequest): Observable<MessageDto> {
    return this.http.post<MessageDto>(
      `${this.baseUrl}/messages`,
      request,
      { headers: this.defaultHeaders }
    );
  }

  /**
   * Submits an evaluation/rating for a specific message.
   * @param request - The evaluation request with message ID and grade
   * @returns Observable with the evaluation response
   */
  public evaluateMessage(request: EvaluateRequest): Observable<EvaluateResponse> {
    return this.http.post<EvaluateResponse>(
      `${this.baseUrl}/messages/evaluate`,
      request,
      { headers: this.defaultHeaders }
    );
  }
}
