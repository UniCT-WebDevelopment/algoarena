import { AfterViewChecked, Component, ElementRef, ViewChild } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ChatService } from '../../../core/services/chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-assistant-chat',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, FormsModule],
  templateUrl: './assistant-chat.html',
  styleUrl: './assistant-chat.scss',
})
export class AssistantChatComponent implements AfterViewChecked {
  isOpen = false;
  isLoading = false;
  input = '';
  private readonly initialMessages: ChatMessage[] = [
    {
      role: 'assistant',
      content: 'Ciao! Sono il tutor di algoritmi. Chiedimi pure qualcosa.',
    },
  ];
  messages: ChatMessage[] = [...this.initialMessages];
  private requestId = 0;
  private shouldScroll = false;
  @ViewChild('chatBody') chatBody?: ElementRef<HTMLDivElement>;

  constructor(private chatService: ChatService) {}

  toggle(): void {
    this.isOpen = !this.isOpen;
    this.shouldScroll = true;
  }

  send(): void {
    const question = this.input.trim();
    if (!question || this.isLoading) return;
    const requestId = ++this.requestId;
    const history = this.messages.slice(-6);
    this.messages = [...this.messages, { role: 'user', content: question }];
    this.input = '';
    this.isLoading = true;
    this.shouldScroll = true;

    this.chatService
      .ask(question, history)
      .pipe(finalize(() => {
        if (requestId === this.requestId) {
          this.isLoading = false;
        }
      }))
      .subscribe({
        next: (response) => {
          if (requestId !== this.requestId) return;
          this.messages = [...this.messages, { role: 'assistant', content: response.answer }];
          this.shouldScroll = true;
        },
        error: () => {
          if (requestId !== this.requestId) return;
          this.messages = [
            ...this.messages,
            { role: 'assistant', content: 'Errore nel contattare il tutor. Riprova tra poco.' },
          ];
          this.shouldScroll = true;
        },
      });
  }

  resetChat(): void {
    this.requestId += 1;
    this.isLoading = false;
    this.input = '';
    this.messages = [...this.initialMessages];
    this.shouldScroll = true;
  }

  ngAfterViewChecked(): void {
    if (!this.shouldScroll) return;
    const body = this.chatBody?.nativeElement;
    if (body) {
      body.scrollTop = body.scrollHeight;
    }
    this.shouldScroll = false;
  }
}
