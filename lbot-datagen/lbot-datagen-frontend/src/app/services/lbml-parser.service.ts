import { Injectable } from '@angular/core';
import { ParsedCommand } from '../models/lbml-command.model';

@Injectable({
  providedIn: 'root'
})
export class LbmlParserService {

  /**
   * Parses a single LBML command string
   * Format: [D|R][number][F|B|L|R];
   * Examples: D10F; (move 10 units forward), R90L; (rotate 90 degrees left)
   */
  parseCommand(command: string): ParsedCommand | null {
    const regex = /^([DR])(\d+)([FBLR]);$/;
    const match = command.match(regex);
    
    if (!match) return null;

    const [, prefix, value, direction] = match;
    const numValue = parseInt(value, 10);

    // Validate command combinations
    if (prefix === 'D' && !['F', 'B', 'L', 'R'].includes(direction)) {
      return null;
    }
    if (prefix === 'R' && !['L', 'R'].includes(direction)) {
      return null;
    }

    return { 
      type: prefix, 
      value: numValue, 
      direction 
    };
  }

  /**
   * Parses a sequence of LBML commands separated by semicolons
   * Example: "D10F;R90L;D20B;"
   */
  parseCommandSequence(input: string): ParsedCommand[] | null {
    const commands = (input || '')
      .split(';')
      .filter(cmd => cmd.trim())
      .map(cmd => cmd.trim() + ';');

    const parsedCommands: ParsedCommand[] = [];

    for (const cmd of commands) {
      const parsed = this.parseCommand(cmd);
      if (!parsed) {
        return null; // Invalid command found
      }
      parsedCommands.push(parsed);
    }

    return parsedCommands;
  }

  /**
   * Validates if a command string is well-formed
   */
  isValidCommand(command: string): boolean {
    return this.parseCommand(command) !== null;
  }

  /**
   * Formats a parsed command back to string
   */
  formatCommand(cmd: ParsedCommand): string {
    return `${cmd.type}${cmd.value}${cmd.direction}`;
  }
}
