export interface ParsedCommand {
  type: string;
  value: number;
  direction: string;
}

export interface CommandExecutionResult {
  success: boolean;
  blocked?: boolean;
  error?: string;
}
