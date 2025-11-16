import { Component } from '@angular/core';
import { LbotChat } from './components/lbot-chat/lbot-chat';
import { RoboSimulatorComponent } from './components/robo-simulator/robo-simulator';

/**
 * Root component of the LBot DataGen application.
 * Provides the main layout structure with simulator and chat interface.
 */
@Component({
  selector: 'app-root',
  imports: [LbotChat, RoboSimulatorComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone: true
})
export class AppComponent {
  protected readonly appTitle = 'LBot DataGen Frontend';
}
