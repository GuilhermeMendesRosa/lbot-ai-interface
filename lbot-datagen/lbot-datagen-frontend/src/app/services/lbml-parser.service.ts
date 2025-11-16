import { Injectable } from '@angular/core';
import { ParsedCommand, LbmlCommandType, CommandDirection } from '../models/lbml-command.model';

/**
 * Service responsible for parsing and validating LBML (LBot Markup Language) commands.
 * 
 * LBML Format:
 * - Distance commands: D[number][F|B|L|R]; (e.g., D10F; - move 10 units forward)
 * - Rotation commands: R[number][L|R]; (e.g., R90L; - rotate 90 degrees left)
 */
@Injectable({
  providedIn: 'root'
})
export class LbmlParserService {
  private static readonly COMMAND_REGEX = /^([DR])(\d+)([FBLR]);$/;
  private static readonly VALID_DISTANCE_DIRECTIONS = ['F', 'B', 'L', 'R'] as const;
  private static readonly VALID_ROTATION_DIRECTIONS = ['L', 'R'] as const;

  /**
   * Parses a single LBML command string.
   * @param command - The command string to parse (e.g., "D10F;" or "R90L;")
   * @returns Parsed command object or null if invalid
   */
  public parseCommand(command: string): ParsedCommand | null {
    if (!command?.trim()) {
      return null;
    }

    const match = command.trim().match(LbmlParserService.COMMAND_REGEX);
    
    if (!match) {
      return null;
    }

    const [, commandType, valueStr, direction] = match;
    const value = parseInt(valueStr, 10);

    if (!this.isValidCommandCombination(commandType, direction)) {
      return null;
    }

    return { 
      type: commandType as LbmlCommandType, 
      value, 
      direction: direction as CommandDirection
    };
  }

  /**
   * Parses a sequence of LBML commands separated by semicolons.
   * @param input - The command sequence string (e.g., "D10F;R90L;D20B;")
   * @returns Array of parsed commands or null if any command is invalid
   */
  public parseCommandSequence(input: string): ParsedCommand[] | null {
    if (!input?.trim()) {
      return [];
    }

    const commandStrings = this.extractCommandStrings(input);
    const parsedCommands: ParsedCommand[] = [];

    for (const commandString of commandStrings) {
      const parsed = this.parseCommand(commandString);
      
      if (!parsed) {
        console.warn(`[LbmlParser] Invalid command in sequence: "${commandString}"`);
        return null;
      }
      
      parsedCommands.push(parsed);
    }

    return parsedCommands;
  }

  /**
   * Validates if a command string is well-formed.
   * @param command - The command string to validate
   * @returns True if command is valid, false otherwise
   */
  public isValidCommand(command: string): boolean {
    return this.parseCommand(command) !== null;
  }

  /**
   * Formats a parsed command back to its string representation.
   * @param cmd - The parsed command object
   * @returns Formatted command string (without semicolon)
   */
  public formatCommand(cmd: ParsedCommand): string {
    return `${cmd.type}${cmd.value}${cmd.direction}`;
  }

  /**
   * Extracts individual command strings from an input sequence.
   * @param input - The raw command sequence
   * @returns Array of command strings with semicolons
   */
  private extractCommandStrings(input: string): string[] {
    return input
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0)
      .map(cmd => `${cmd};`);
  }

  /**
   * Validates if a command type and direction combination is valid.
   * @param commandType - The command type ('D' or 'R')
   * @param direction - The direction ('F', 'B', 'L', or 'R')
   * @returns True if combination is valid
   */
  private isValidCommandCombination(commandType: string, direction: string): boolean {
    if (commandType === 'D') {
      return LbmlParserService.VALID_DISTANCE_DIRECTIONS.includes(direction as any);
    }
    
    if (commandType === 'R') {
      return LbmlParserService.VALID_ROTATION_DIRECTIONS.includes(direction as any);
    }
    
    return false;
  }
}
