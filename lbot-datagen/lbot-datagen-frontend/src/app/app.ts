import { Component } from '@angular/core';
import { LbotChat } from './components/lbot-chat/lbot-chat';
import { RoboSimulatorComponent } from './components/robo-simulator/robo-simulator';
import { VirtualControlsComponent } from './components/virtual-controls/virtual-controls';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, MessageCircle, Gamepad2 } from 'lucide-angular';

/**
 * Root component of the LBot DataGen application.
 * Provides the main layout structure with simulator and chat interface.
 */
@Component({
  selector: 'app-root',
  imports: [CommonModule, LbotChat, RoboSimulatorComponent, VirtualControlsComponent, LucideAngularModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone: true
})
export class AppComponent {
  protected readonly appTitle = 'LBot DataGen Frontend';
  public currentMode: 'chat' | 'controls' = 'chat';

  // Lucide icons
  protected readonly MessageCircleIcon = MessageCircle;
  protected readonly Gamepad2Icon = Gamepad2;

  /**
   * Switches between chat mode and virtual controls mode.
   * @param mode - The mode to switch to
   */
  public switchMode(mode: 'chat' | 'controls'): void {
    this.currentMode = mode;
  }
}
