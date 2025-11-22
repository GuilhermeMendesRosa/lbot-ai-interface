import { Injectable } from '@angular/core';
import { LbmlParserService } from './lbml-parser.service';
import { ParsedCommand } from '../models/lbml-command.model';

/**
 * Represents the accumulated state from virtual control inputs.
 */
export interface ControlState {
  /** Forward movement in cm */
  forward: number;
  /** Backward movement in cm */
  backward: number;
  /** Left movement in cm */
  left: number;
  /** Right movement in cm */
  right: number;
  /** Left rotation in degrees */
  rotateLeft: number;
  /** Right rotation in degrees */
  rotateRight: number;
}

/**
 * Service responsible for building LBML commands from virtual control state
 * and generating natural language descriptions of movements.
 */
@Injectable({
  providedIn: 'root'
})
export class CommandBuilderService {
  constructor(private lbmlParser: LbmlParserService) {}

  /**
   * Builds an LBML command sequence from the accumulated control state.
   * @param state - The accumulated control state
   * @returns LBML command string (e.g., "D20F;R90L;D10R;")
   */
  public buildLbmlFromControls(state: ControlState): string {
    const commands: ParsedCommand[] = [];

    // Add movement commands in order of priority
    if (state.forward > 0) {
      commands.push({ type: 'D', value: state.forward, direction: 'F' });
    }
    if (state.backward > 0) {
      commands.push({ type: 'D', value: state.backward, direction: 'B' });
    }
    if (state.left > 0) {
      commands.push({ type: 'D', value: state.left, direction: 'L' });
    }
    if (state.right > 0) {
      commands.push({ type: 'D', value: state.right, direction: 'R' });
    }

    // Add rotation commands
    if (state.rotateLeft > 0) {
      commands.push({ type: 'R', value: state.rotateLeft, direction: 'L' });
    }
    if (state.rotateRight > 0) {
      commands.push({ type: 'R', value: state.rotateRight, direction: 'R' });
    }

    // Convert to LBML string
    return commands.map(cmd => this.lbmlParser.formatCommand(cmd) + ';').join('');
  }

  /**
   * Generates a natural language description of a movement from LBML.
   * @param lbml - The LBML command string
   * @returns Portuguese description of the movement
   */
  public describeMovement(lbml: string): string {
    const commands = this.lbmlParser.parseCommandSequence(lbml);
    
    if (!commands || commands.length === 0) {
      return 'Nenhum movimento realizado.';
    }

    const descriptions: string[] = commands.map(cmd => this.describeCommand(cmd));
    
    if (descriptions.length === 1) {
      return `O robô ${descriptions[0]}.`;
    }

    // Join multiple descriptions with commas and "e" before the last one
    const lastDescription = descriptions.pop();
    return `O robô ${descriptions.join(', ')} e ${lastDescription}.`;
  }

  /**
   * Describes a single parsed command in Portuguese.
   * @param cmd - The parsed command
   * @returns Description string
   */
  private describeCommand(cmd: ParsedCommand): string {
    if (cmd.type === 'D') {
      const directionMap: Record<string, string> = {
        'F': 'frente',
        'B': 'trás',
        'L': 'esquerda',
        'R': 'direita'
      };
      return `moveu ${cmd.value}cm para ${directionMap[cmd.direction]}`;
    } else {
      const directionMap: Record<string, string> = {
        'L': 'esquerda',
        'R': 'direita'
      };
      return `girou ${cmd.value}° para a ${directionMap[cmd.direction]}`;
    }
  }

  /**
   * Creates an empty control state.
   * @returns Empty control state with all values set to 0
   */
  public createEmptyState(): ControlState {
    return {
      forward: 0,
      backward: 0,
      left: 0,
      right: 0,
      rotateLeft: 0,
      rotateRight: 0
    };
  }

  /**
   * Checks if the control state has any accumulated values.
   * @param state - The control state to check
   * @returns True if any value is greater than 0
   */
  public hasMovement(state: ControlState): boolean {
    return state.forward > 0 || 
           state.backward > 0 || 
           state.left > 0 || 
           state.right > 0 || 
           state.rotateLeft > 0 || 
           state.rotateRight > 0;
  }
}
