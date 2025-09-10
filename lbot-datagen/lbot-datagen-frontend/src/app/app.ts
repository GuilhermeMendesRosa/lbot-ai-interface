import { Component, signal } from '@angular/core';
import { LbotChat } from './components/lbot-chat/lbot-chat';

@Component({
  selector: 'app-root',
  imports: [LbotChat],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('lbot-datagen-frontend');
}
