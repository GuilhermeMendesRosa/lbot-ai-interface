import { Component, signal } from '@angular/core';
import { LbotChat } from './components/lbot-chat/lbot-chat';
import { RoboSimulatorComponent } from './components/robo-simulator/robo-simulator';

@Component({
  selector: 'app-root',
  imports: [LbotChat, RoboSimulatorComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('lbot-datagen-frontend');
}
