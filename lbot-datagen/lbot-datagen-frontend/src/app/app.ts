import { Component, signal } from '@angular/core';
import { LbotChat } from './components/lbot-chat/lbot-chat';
import { SimulatorFrameComponent } from './components/simulator-frame/simulator-frame';

@Component({
  selector: 'app-root',
  imports: [LbotChat, SimulatorFrameComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('lbot-datagen-frontend');
}
