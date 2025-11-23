import { Injectable } from '@angular/core';
import { LbmlParserService } from './lbml-parser.service';
import { ParsedCommand } from '../models/lbml-command.model';

/**
 * Represents a single command in the movement timeline.
 */
export interface TimelineCommand {
  /** The parsed command */
  command: ParsedCommand;
  /** User-provided description for this command */
  description: string;
}

/**
 * Service responsible for building LBML commands from virtual control timeline
 * and managing command sequences.
 */
@Injectable({
  providedIn: 'root'
})
export class CommandBuilderService {
  constructor(private lbmlParser: LbmlParserService) {}

  /**
   * Builds an LBML command sequence from the timeline commands.
   * @param timeline - Array of timeline commands
   * @returns LBML command string (e.g., "D20F;D10B;R90L;")
   */
  public buildLbmlFromTimeline(timeline: TimelineCommand[]): string {
    if (!timeline || timeline.length === 0) {
      return '';
    }

    // Convert to LBML string
    return timeline.map(item => this.lbmlParser.formatCommand(item.command) + ';').join('');
  }

  /**
   * Creates a new timeline command for movement.
   * @param direction - Movement direction
   * @param value - Movement value in cm
   * @param description - User description
   * @returns Timeline command
   */
  public createMovementCommand(direction: 'F' | 'B' | 'L' | 'R', value: number, description: string): TimelineCommand {
    return {
      command: { type: 'D', value, direction },
      description: description || this.getDefaultMovementDescription(direction, value)
    };
  }

  /**
   * Creates a new timeline command for rotation.
   * @param direction - Rotation direction
   * @param value - Rotation value in degrees
   * @param description - User description
   * @returns Timeline command
   */
  public createRotationCommand(direction: 'L' | 'R', value: number, description: string): TimelineCommand {
    return {
      command: { type: 'R', value, direction },
      description: description || this.getDefaultRotationDescription(direction, value)
    };
  }

  /**
   * Gets default description for movement commands.
   * @param direction - Movement direction
   * @param value - Movement value
   * @returns Default description
   */
  private getDefaultMovementDescription(direction: string, value: number): string {
    const directionMap: Record<string, string> = {
      'F': 'frente',
      'B': 'trás',
      'L': 'esquerda',
      'R': 'direita'
    };
    return `Mover ${value}cm para ${directionMap[direction]}`;
  }

  /**
   * Gets default description for rotation commands.
   * @param direction - Rotation direction
   * @param value - Rotation value
   * @returns Default description
   */
  private getDefaultRotationDescription(direction: string, value: number): string {
    const directionMap: Record<string, string> = {
      'L': 'esquerda',
      'R': 'direita'
    };
    return `Girar ${value}° para ${directionMap[direction]}`;
  }

  /**
   * Checks if the timeline has any commands.
   * @param timeline - The timeline to check
   * @returns True if timeline has commands
   */
  public hasCommands(timeline: TimelineCommand[]): boolean {
    return timeline && timeline.length > 0;
  }

  /**
   * Removes a command from the timeline at the specified index.
   * @param timeline - The timeline
   * @param index - Index to remove
   * @returns New timeline without the command
   */
  public removeCommand(timeline: TimelineCommand[], index: number): TimelineCommand[] {
    return timeline.filter((_, i) => i !== index);
  }

  /**
   * Updates a command's description in the timeline.
   * @param timeline - The timeline
   * @param index - Index to update
   * @param description - New description
   * @returns Updated timeline
   */
  public updateCommandDescription(timeline: TimelineCommand[], index: number, description: string): TimelineCommand[] {
    return timeline.map((item, i) =>
      i === index ? { ...item, description } : item
    );
  }
}
