import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommandBuilderService, ControlState } from '../../services/command-builder.service';
import { SimulatorBridgeService } from '../../services/simulator-bridge.service';

@Component({
  selector: 'app-virtual-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './virtual-controls.html',
  styleUrls: ['./virtual-controls.css']
})
export class VirtualControlsComponent implements OnInit {
  public controlState: ControlState;
  public lastDescription: string = '';
  public isExecuting: boolean = false;
  
  // Increment values
  public readonly DISTANCE_INCREMENT = 10; // 10cm
  public readonly ROTATION_INCREMENT = 10; // 10 degrees

  constructor(
    private commandBuilder: CommandBuilderService,
    private simulatorBridge: SimulatorBridgeService
  ) {
    this.controlState = this.commandBuilder.createEmptyState();
  }

  ngOnInit(): void {
    // Reset state on init
    this.reset();
  }

  /**
   * Increments forward movement by 10cm.
   */
  public moveForward(): void {
    this.controlState.forward += this.DISTANCE_INCREMENT;
  }

  /**
   * Increments backward movement by 10cm.
   */
  public moveBackward(): void {
    this.controlState.backward += this.DISTANCE_INCREMENT;
  }

  /**
   * Increments left movement by 10cm.
   */
  public moveLeft(): void {
    this.controlState.left += this.DISTANCE_INCREMENT;
  }

  /**
   * Increments right movement by 10cm.
   */
  public moveRight(): void {
    this.controlState.right += this.DISTANCE_INCREMENT;
  }

  /**
   * Increments left rotation by 10 degrees.
   */
  public rotateLeft(): void {
    this.controlState.rotateLeft += this.ROTATION_INCREMENT;
  }

  /**
   * Increments right rotation by 10 degrees.
   */
  public rotateRight(): void {
    this.controlState.rotateRight += this.ROTATION_INCREMENT;
  }

  /**
   * Decrements forward movement by 10cm (undo).
   */
  public undoForward(): void {
    if (this.controlState.forward >= this.DISTANCE_INCREMENT) {
      this.controlState.forward -= this.DISTANCE_INCREMENT;
    }
  }

  /**
   * Decrements backward movement by 10cm (undo).
   */
  public undoBackward(): void {
    if (this.controlState.backward >= this.DISTANCE_INCREMENT) {
      this.controlState.backward -= this.DISTANCE_INCREMENT;
    }
  }

  /**
   * Decrements left movement by 10cm (undo).
   */
  public undoLeft(): void {
    if (this.controlState.left >= this.DISTANCE_INCREMENT) {
      this.controlState.left -= this.DISTANCE_INCREMENT;
    }
  }

  /**
   * Decrements right movement by 10cm (undo).
   */
  public undoRight(): void {
    if (this.controlState.right >= this.DISTANCE_INCREMENT) {
      this.controlState.right -= this.DISTANCE_INCREMENT;
    }
  }

  /**
   * Decrements left rotation by 10 degrees (undo).
   */
  public undoRotateLeft(): void {
    if (this.controlState.rotateLeft >= this.ROTATION_INCREMENT) {
      this.controlState.rotateLeft -= this.ROTATION_INCREMENT;
    }
  }

  /**
   * Decrements right rotation by 10 degrees (undo).
   */
  public undoRotateRight(): void {
    if (this.controlState.rotateRight >= this.ROTATION_INCREMENT) {
      this.controlState.rotateRight -= this.ROTATION_INCREMENT;
    }
  }

  /**
   * Executes the accumulated movement commands.
   */
  public async execute(): Promise<void> {
    if (!this.hasMovement() || this.isExecuting) {
      return;
    }

    this.isExecuting = true;
    this.lastDescription = '';

    try {
      // Build LBML from control state
      const lbml = this.commandBuilder.buildLbmlFromControls(this.controlState);
      
      console.log('[VirtualControls] Executing LBML:', lbml);

      // Execute the LBML command
      this.simulatorBridge.executeLbml(lbml);

      // Wait for execution to complete (approximate timing based on command complexity)
      const executionTime = this.estimateExecutionTime(lbml);
      await this.delay(executionTime);

      // Generate and display description
      this.lastDescription = this.commandBuilder.describeMovement(lbml);
      
      console.log('[VirtualControls] Description:', this.lastDescription);

      // Reset state after successful execution
      this.reset();
    } catch (error) {
      console.error('[VirtualControls] Execution error:', error);
      this.lastDescription = 'Erro ao executar o movimento.';
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Resets all accumulated values to zero.
   */
  public reset(): void {
    this.controlState = this.commandBuilder.createEmptyState();
  }

  /**
   * Checks if there are any accumulated movements.
   */
  public hasMovement(): boolean {
    return this.commandBuilder.hasMovement(this.controlState);
  }

  /**
   * Gets the total accumulated distance movement.
   */
  public getTotalDistance(): number {
    return this.controlState.forward + 
           this.controlState.backward + 
           this.controlState.left + 
           this.controlState.right;
  }

  /**
   * Gets the total accumulated rotation.
   */
  public getTotalRotation(): number {
    return this.controlState.rotateLeft + this.controlState.rotateRight;
  }

  /**
   * Estimates execution time based on LBML complexity.
   * @param lbml - The LBML command string
   * @returns Estimated time in milliseconds
   */
  private estimateExecutionTime(lbml: string): number {
    // Count commands (each command separated by semicolon)
    const commandCount = (lbml.match(/;/g) || []).length;
    // Base time per command + 300ms delay between commands (from robo-simulator.ts)
    return commandCount * 1000 + (commandCount - 1) * 300 + 500; // Extra 500ms buffer
  }

  /**
   * Utility function to delay execution.
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
