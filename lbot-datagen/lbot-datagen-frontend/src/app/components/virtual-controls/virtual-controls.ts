import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommandBuilderService, TimelineCommand } from '../../services/command-builder.service';
import { SimulatorBridgeService } from '../../services/simulator-bridge.service';

@Component({
  selector: 'app-virtual-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './virtual-controls.html',
  styleUrls: ['./virtual-controls.css']
})
export class VirtualControlsComponent implements OnInit {
  public timeline: TimelineCommand[] = [];
  public userDescription: string = '';
  public isExecuting: boolean = false;
  public generatedLbml: string = '';

  // Increment values
  public readonly DISTANCE_INCREMENT = 10; // 10cm
  public readonly ROTATION_INCREMENT = 10; // 10 degrees

  constructor(
    private commandBuilder: CommandBuilderService,
    private simulatorBridge: SimulatorBridgeService
  ) {}

  ngOnInit(): void {
    this.reset();
  }

  /**
   * Adds a movement command to the timeline.
   * @param direction - Movement direction
   */
  public addMovement(direction: 'F' | 'B' | 'L' | 'R'): void {
    const lastCommand = this.timeline[this.timeline.length - 1];
    if (lastCommand && lastCommand.command.type === 'D' && lastCommand.command.direction === direction) {
      lastCommand.command.value += this.DISTANCE_INCREMENT;
      const directionMap: Record<string, string> = { 'F': 'frente', 'B': 'trás', 'L': 'esquerda', 'R': 'direita' };
      lastCommand.description = `Mover ${lastCommand.command.value}cm para ${directionMap[direction]}`;
    } else {
      const command = this.commandBuilder.createMovementCommand(
        direction,
        this.DISTANCE_INCREMENT,
        ''
      );
      this.timeline.push(command);
    }
    this.updateGeneratedLbml();
  }

  /**
   * Adds a rotation command to the timeline.
   * @param direction - Rotation direction
   */
  public addRotation(direction: 'L' | 'R'): void {
    const lastCommand = this.timeline[this.timeline.length - 1];
    if (lastCommand && lastCommand.command.type === 'R' && lastCommand.command.direction === direction) {
      lastCommand.command.value += this.ROTATION_INCREMENT;
      const directionMap: Record<string, string> = { 'L': 'esquerda', 'R': 'direita' };
      lastCommand.description = `Girar ${lastCommand.command.value}° para ${directionMap[direction]}`;
    } else {
      const command = this.commandBuilder.createRotationCommand(
        direction,
        this.ROTATION_INCREMENT,
        ''
      );
      this.timeline.push(command);
    }
    this.updateGeneratedLbml();
  }

  /**
   * Removes a command from the timeline.
   * @param index - Index of the command to remove
   */
  public removeCommand(index: number): void {
    this.timeline = this.commandBuilder.removeCommand(this.timeline, index);
    this.updateGeneratedLbml();
  }

  /**
   * Updates the description of a command in the timeline.
   * @param index - Index of the command
   * @param description - New description
   */
  public updateCommandDescription(index: number, description: string): void {
    this.timeline = this.commandBuilder.updateCommandDescription(
      this.timeline,
      index,
      description
    );
  }

  /**
   * Executes the accumulated commands in the timeline.
   */
  public async execute(): Promise<void> {
    if (!this.hasCommands() || this.isExecuting || !this.userDescription.trim()) {
      return;
    }

    this.isExecuting = true;

    try {
      // Build LBML from timeline
      const lbml = this.commandBuilder.buildLbmlFromTimeline(this.timeline);

      console.log('[VirtualControls] Executing LBML:', lbml);

      // Execute the LBML command
      this.simulatorBridge.executeLbml(lbml);

      // Wait for execution to complete
      const executionTime = this.estimateExecutionTime(this.timeline);
      await this.delay(executionTime);

      console.log('[VirtualControls] Execution completed');

      // Reset timeline after successful execution
      this.reset();
    } catch (error) {
      console.error('[VirtualControls] Execution error:', error);
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Resets the timeline and clears all data.
   */
  public reset(): void {
    this.timeline = [];
    this.userDescription = '';
    this.generatedLbml = '';
  }

  /**
   * Checks if the timeline has any commands.
   */
  public hasCommands(): boolean {
    return this.commandBuilder.hasCommands(this.timeline);
  }

  /**
   * Gets the total distance accumulated in the timeline.
   */
  public getTotalDistance(): number {
    return this.timeline
      .filter(item => item.command.type === 'D')
      .reduce((total, item) => total + item.command.value, 0);
  }

  /**
   * Gets the total rotation accumulated in the timeline.
   */
  public getTotalRotation(): number {
    return this.timeline
      .filter(item => item.command.type === 'R')
      .reduce((total, item) => total + item.command.value, 0);
  }

  /**
   * Gets a human-readable label for a command direction.
   * @param command - The parsed command
   * @returns Direction label
   */
  public getDirectionLabel(command: { type: string; direction: string }): string {
    if (command.type === 'D') {
      const labels: Record<string, string> = { 'F': 'Frente', 'B': 'Trás', 'L': 'Esquerda', 'R': 'Direita' };
      return labels[command.direction] || command.direction;
    } else {
      const labels: Record<string, string> = { 'L': 'Girar Esq.', 'R': 'Girar Dir.' };
      return labels[command.direction] || command.direction;
    }
  }

  /**
   * Updates the generated LBML string.
   */
  private updateGeneratedLbml(): void {
    this.generatedLbml = this.commandBuilder.buildLbmlFromTimeline(this.timeline);
  }

  /**
   * Estimates execution time based on timeline length.
   * @param timeline - The command timeline
   * @returns Estimated time in milliseconds
   */
  private estimateExecutionTime(timeline: TimelineCommand[]): number {
    // Base time per command + 300ms delay between commands (from robo-simulator.ts)
    return timeline.length * 1000 + (timeline.length - 1) * 300 + 500; // Extra 500ms buffer
  }

  /**
   * TrackBy function for ngFor to improve performance.
   */
  public trackByIndex(index: number): number {
    return index;
  }

  /**
   * Utility function to delay execution.
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
