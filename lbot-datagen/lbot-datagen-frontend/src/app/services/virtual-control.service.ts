import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TimelineCommand } from './command-builder.service';

/**
 * DTO for a single virtual control command.
 */
export interface VirtualControlCommandDto {
  id?: string;
  commandType: string;
  value: number;
  direction: string;
  description: string;
  sequenceOrder: number;
}

/**
 * DTO for a virtual control session.
 */
export interface VirtualControlSessionDto {
  id: string;
  createdAt: string;
  movementDescription: string;
  lbmlCommand: string;
  executedAt: string;
  commands: VirtualControlCommandDto[];
}

/**
 * Request payload for creating a new virtual control session.
 */
export interface CreateVirtualControlSessionRequest {
  movementDescription: string;
  lbmlCommand: string;
  commands: {
    commandType: string;
    value: number;
    direction: string;
    description: string;
    sequenceOrder: number;
  }[];
}

/**
 * Service for managing virtual control sessions and API communication.
 */
@Injectable({
  providedIn: 'root'
})
export class VirtualControlService {
  private readonly baseUrl = 'https://lbot-ai-interface-production.up.railway.app';
  private readonly defaultHeaders = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  constructor(private readonly http: HttpClient) {}

  /**
   * Creates a new virtual control session with commands.
   * @param movementDescription - User's description of the movement sequence
   * @param lbmlCommand - The generated LBML command string
   * @param timeline - The timeline of commands
   * @returns Observable with the created session
   */
  public createSession(
    movementDescription: string,
    lbmlCommand: string,
    timeline: TimelineCommand[]
  ): Observable<VirtualControlSessionDto> {
    const request: CreateVirtualControlSessionRequest = {
      movementDescription,
      lbmlCommand,
      commands: timeline.map((item, index) => ({
        commandType: item.command.type,
        value: item.command.value,
        direction: item.command.direction,
        description: item.description,
        sequenceOrder: index
      }))
    };

    return this.http.post<VirtualControlSessionDto>(
      `${this.baseUrl}/virtual-controls/sessions`,
      request,
      { headers: this.defaultHeaders }
    );
  }

  /**
   * Retrieves all virtual control sessions.
   * @returns Observable with array of sessions
   */
  public getAllSessions(): Observable<VirtualControlSessionDto[]> {
    return this.http.get<VirtualControlSessionDto[]>(
      `${this.baseUrl}/virtual-controls/sessions`,
      { headers: this.defaultHeaders }
    );
  }

  /**
   * Retrieves a specific virtual control session by ID.
   * @param id - The session ID
   * @returns Observable with the session data
   */
  public getSessionById(id: string): Observable<VirtualControlSessionDto> {
    return this.http.get<VirtualControlSessionDto>(
      `${this.baseUrl}/virtual-controls/sessions/${id}`,
      { headers: this.defaultHeaders }
    );
  }
}
