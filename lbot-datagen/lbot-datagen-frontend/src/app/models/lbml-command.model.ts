/**
 * Valid command types in LBML.
 */
export type LbmlCommandType = 'D' | 'R';

/**
 * Valid directions for movement commands.
 */
export type MovementDirection = 'F' | 'B' | 'L' | 'R';

/**
 * Valid directions for rotation commands.
 */
export type RotationDirection = 'L' | 'R';

/**
 * Union type for all valid directions.
 */
export type CommandDirection = MovementDirection | RotationDirection;

/**
 * Represents a parsed LBML command.
 * 
 * @example
 * // Distance command: move forward 10 units
 * { type: 'D', value: 10, direction: 'F' }
 * 
 * @example
 * // Rotation command: rotate left 90 degrees
 * { type: 'R', value: 90, direction: 'L' }
 */
export interface ParsedCommand {
  /** Command type: 'D' for distance/movement, 'R' for rotation */
  type: LbmlCommandType;
  /** Numeric value: distance in units or angle in degrees */
  value: number;
  /** Direction of the command execution */
  direction: CommandDirection;
}

/**
 * Result of a command execution in the simulator.
 */
export interface CommandExecutionResult {
  /** Whether the command executed successfully */
  success: boolean;
  /** Whether the command was blocked by an obstacle */
  blocked?: boolean;
  /** Error message if command failed */
  error?: string;
}
