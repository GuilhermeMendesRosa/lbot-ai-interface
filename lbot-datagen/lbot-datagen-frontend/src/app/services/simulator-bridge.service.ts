import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Types of commands that can be sent to the simulator.
 */
export type SimulatorCommandType = 'lbml-exec' | 'lbml-reset';

/**
 * Represents a command to be executed in the simulator.
 */
export interface SimulatorCommand {
  type: SimulatorCommandType;
  payload?: string;
}

/**
 * Service that acts as a bridge between the chat interface and the robot simulator.
 * Handles communication of LBML commands and simulator control actions.
 */
@Injectable({ providedIn: 'root' })
export class SimulatorBridgeService {
  private readonly commandSubject = new Subject<SimulatorCommand>();

  /**
   * Observable stream of simulator commands.
   */
  public readonly commands$: Observable<SimulatorCommand> = this.commandSubject.asObservable();

  /**
   * Sends an LBML command sequence to the simulator for execution.
   * @param sequence - The LBML command sequence string
   */
  public executeLbml(sequence: string): void {
    if (!sequence?.trim()) {
      console.warn('[SimulatorBridge] Attempted to execute empty LBML sequence');
      return;
    }

    this.commandSubject.next({ 
      type: 'lbml-exec', 
      payload: sequence.trim() 
    });
  }

  /**
   * Sends a reset command to the simulator.
   */
  public reset(): void {
    this.commandSubject.next({ type: 'lbml-reset' });
  }
}


