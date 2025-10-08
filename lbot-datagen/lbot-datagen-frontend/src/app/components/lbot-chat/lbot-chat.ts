// lbot-chat.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatDto, EvaluateResponse, MessageDto, MessagesService } from '../../services/messages-service';
import { SimulatorBridgeService } from '../../services/simulator-bridge.service';

interface Message {
  text: string;
  type: 'user' | 'bot' | 'error';
  messageId?: string;
  normalizedPrompt?: string;
  output?: string;
  rated?: boolean;
  rating?: number;
}

@Component({
  selector: 'app-lbot-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lbot-chat.html',
  styleUrls: ['./lbot-chat.css']
})
export class LbotChat implements OnInit, OnDestroy {
  messages: Message[] = [
    { text: 'Olá! Digite um comando em português e eu traduzo para LBML.', type: 'bot' }
  ];
  messageInput = '';
  isLoading = false;


  // Variáveis para o popup de observação (ao finalizar)
  showObservation = false;
  observation = '';

  // Array para armazenar todas as avaliações
  ratings: number[] = [];

  // ID do chat atual
  chatId = '';

  constructor(private messagesService: MessagesService, private simulatorBridge: SimulatorBridgeService) { }

  ngOnInit(): void {
    this.initializeChat();
  }

  initializeChat(): void {
    this.messagesService.startChat().subscribe({
      next: (response: ChatDto) => {
        this.chatId = response.id;
        console.log('Chat iniciado:', response);
        console.log('Chat ID:', this.chatId);
        console.log('Data de criação:', response.createdAt);
      },
      error: (error: any) => {
        console.error('Erro ao iniciar chat:', error);
        this.messages.push({
          text: 'Erro ao iniciar o chat. Tente novamente.',
          type: 'error'
        });
      }
    });
  }

  sendMessage(): void {
    const command = this.messageInput.trim();
    if (!command || this.isLoading || !this.chatId) return;

    // Adicionar mensagem do usuário
    this.messages.push({ text: command, type: 'user' });
    this.messageInput = '';
    this.isLoading = true;
    this.scrollToBottom();

    // Enviar mensagem para a API
    this.messagesService.sendMessage({
      prompt: command,
      chatId: this.chatId
    }).subscribe({
      next: (response: MessageDto) => {
        console.log('Resposta da API:', response);

        // Mostrar apenas o output, sem formatação adicional
        const botMessage = response.output || 'Comando processado com sucesso!';

        // Adicionar resposta do bot
        this.messages.push({
          text: botMessage,
          type: 'bot',
          messageId: response.id,
          normalizedPrompt: response.normalizedPrompt,
          output: response.output
        });

        this.isLoading = false;
        this.scrollToBottom();

        // Enviar o output LBML para o simulador
        if (response.output) {
          this.simulatorBridge.executeLbml(response.output);
        }
      },
      error: (error: any) => {
        console.error('Erro ao enviar mensagem:', error);
        this.messages.push({
          text: 'Erro ao processar sua mensagem. Tente novamente.',
          type: 'error'
        });
        this.isLoading = false;
        this.scrollToBottom();
      }
    });
  }

  // Método para retornar o título da estrela
  getStarTitle(star: number): string {
    const titles = [
      'Muito ruim',
      'Ruim',
      'Ok',
      'Bom',
      'Excelente'
    ];
    return titles[star - 1] || 'Avaliar';
  }

  // Método para avaliação com estrelas
  quickRate(messageId: string, rating: number, event?: MouseEvent | TouchEvent): void {
    if (event) {
      event.stopPropagation();
    }

    // Encontrar a mensagem e marcá-la como avaliada
    const message = this.messages.find(m => m.messageId === messageId);
    if (message) {
      message.rated = true;
      message.rating = rating;
    }

    // Enviar avaliação para a API
    this.messagesService.evaluateMessage({
      messageId: messageId,
      grade: rating
    }).subscribe({
      next: (response: EvaluateResponse) => {
        console.log('Avaliação enviada com sucesso:', response);
        console.log(`Mensagem ${messageId} avaliada com nota ${rating}`);

        // Armazenar a avaliação localmente
        this.ratings.push(rating);
        console.log('Todas as avaliações:', this.ratings);
      },
      error: (error: any) => {
        console.error('Erro ao enviar avaliação:', error);
        // Mesmo com erro, armazenar localmente e manter a UI atualizada
        this.ratings.push(rating);
      }
    });
  }

  // Método para retornar o emoji correspondente à avaliação
  getRatingEmoji(rating: number): string {
    switch (rating) {
      case 1: return '😞';
      case 2: return '😐';
      case 3: return '😊';
      case 4: return '😄';
      case 5: return '🤩';
      default: return '😊';
    }
  }

  showObservationPopup(): void {
    this.showObservation = true;
    this.observation = '';
  }

  closeObservationPopup(): void {
    this.showObservation = false;
    this.observation = '';
  }

  submitObservation(): void {
    // Calcular média das avaliações
    const averageRating = this.ratings.length > 0
      ? (this.ratings.reduce((sum, rating) => sum + rating, 0) / this.ratings.length).toFixed(1)
      : 'N/A';

    // Dados finais para envio
    const finalFeedback = {
      chatId: this.chatId,
      individualRatings: this.ratings,
      averageRating: averageRating,
      totalMessages: this.ratings.length,
      observation: this.observation.trim()
    };

    console.log('Feedback final do chat:', finalFeedback);

    // Mostrar mensagem de agradecimento
    let thankYouMessage = `Obrigado pelo feedback! `;

    if (this.ratings.length > 0) {
      thankYouMessage += `Média das avaliações: ${averageRating} estrelas (${this.ratings.length} mensagem${this.ratings.length > 1 ? 's' : ''} avaliada${this.ratings.length > 1 ? 's' : ''}). `;
    }

    if (this.observation.trim()) {
      thankYouMessage += 'Suas observações foram registradas.';
    }

    this.messages.push({
      text: thankYouMessage,
      type: 'bot'
    });

    this.closeObservationPopup();
    this.scrollToBottom();

    // Finalizar o chat após 2 segundos
    setTimeout(() => {
      this.messages.push({
        text: 'Chat finalizado. Até a próxima! 👋',
        type: 'bot'
      });
      this.scrollToBottom();

      // Limpar o chat após mais 2 segundos
      setTimeout(() => {
        this.clearChat();
      }, 2000);
    }, 2000);
  }

  clearChat(): void {
    // Limpar todas as variáveis do chat
    this.messages = [
      { text: 'Olá! Digite um comando em português e eu traduzo para LBML.', type: 'bot' }
    ];
    this.messageInput = '';
    this.isLoading = false;
    this.showObservation = false;
    this.observation = '';
    this.ratings = [];
    this.chatId = '';

    // Inicializar um novo chat
    this.initializeChat();

    console.log('Chat limpo e reiniciado');
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const messagesContainer = document.querySelector('.chat-messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  }

  ngOnDestroy(): void {
    // Cleanup se necessário
  }
}
