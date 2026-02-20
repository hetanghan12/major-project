/**
 * Chat Component - CloudAI Smart Storage
 * ========================================
 * AI Chat interface matching CloudAI design.
 * Premium light theme with sidebar chat history.
 * 
 * @author CloudAI Team
 */

import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChatService, ChatMessage } from '../core/services/chat.service';
import { DocumentService } from '../core/services/document.service';

interface ChatSession {
  id: string;
  title: string;
  date: string;
  messageCount: number;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="chat-container animate-in">
      <div class="chat-wrapper">
        <!-- Chat Sidebar -->
        <aside class="chat-sidebar-panel">
          <!-- New Chat Button -->
          <div class="p-4">
            <button (click)="startNewChat()" class="btn-primary w-full">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              New Chat
            </button>
          </div>

          <!-- Recent Chats -->
          <div class="flex-1 overflow-y-auto px-3">
            <div 
              *ngFor="let session of chatSessions()"
              (click)="selectChat(session.id)"
              class="chat-history-item mb-1"
              [class.active]="selectedChatId() === session.id">
              <p class="chat-history-title">{{ session.title }}</p>
              <p class="chat-history-meta">{{ session.date }}</p>
            </div>

            <div *ngIf="chatSessions().length === 0" class="px-4 py-8 text-center">
              <p class="text-sm" style="color: var(--text-muted);">No chat history yet</p>
            </div>
          </div>
        </aside>

        <!-- Main Chat Area -->
        <div class="chat-main-panel">
          <!-- Chat Header -->
          <div class="chat-header-panel">
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <button class="btn-ghost p-2" title="Back">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
              </div>
              <div class="chat-header-avatar">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
              </div>
              <div>
                <h2 class="font-semibold" style="color: white;">Smart AI Assistant</h2>
                <div class="flex items-center gap-2 text-sm text-emerald-400">
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Ready
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button class="chat-header-btn" title="Saved items">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                </svg>
              </button>
              <button class="chat-header-btn" title="Refresh" (click)="clearChat()">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </button>
              <button class="chat-header-btn" title="Close">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- No Documents Warning -->
          <div *ngIf="documentCount === 0" class="mx-6 mt-4 p-4 rounded-xl" 
               style="background: var(--warning-bg); border: 1px solid rgba(245, 158, 11, 0.2);">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 mt-0.5" style="color: var(--warning);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <p class="font-medium" style="color: var(--warning);">No documents uploaded</p>
                <p class="text-sm mt-1" style="color: var(--text-muted);">
                  Upload documents first to ask questions. 
                  <a routerLink="/documents" class="link font-medium">Go to Documents →</a>
                </p>
              </div>
            </div>
          </div>

          <!-- Messages Area -->
          <div #chatContainer class="chat-messages-panel">
            <!-- Welcome Message -->
            <div *ngIf="chatService.messages().length === 0" class="chat-welcome-message">
              <p class="mb-3 font-medium">Welcome! I'm your Smart AI Assistant. I can help you:</p>
              <div class="space-y-2 mb-4">
                <div class="flex items-center gap-2">
                  <span>💾</span>
                  <span><strong>Save & remember</strong> your conversations</span>
                </div>
                <div class="flex items-center gap-2">
                  <span>📄</span>
                  <span><strong>Scan content</strong> - paste text, URLs, or file content</span>
                </div>
                <div class="flex items-center gap-2">
                  <span>🔍</span>
                  <span><strong>Search</strong> through everything you've saved</span>
                </div>
                <div class="flex items-center gap-2">
                  <span>💡</span>
                  <span><strong>Answer questions</strong> from your stored knowledge</span>
                </div>
                <div class="flex items-center gap-2">
                  <span>📊</span>
                  <span><strong>Summarize</strong> your documents</span>
                </div>
              </div>
              <p class="text-sm opacity-80 mb-4">
                All your data is stored <strong>locally in your browser</strong> by your username - completely private and FREE!
              </p>
              <div class="p-3 rounded-lg" style="background: rgba(255,255,255,0.1);">
                <p class="text-sm font-medium mb-2">Try these commands:</p>
                <p class="text-sm opacity-80">- Type <strong>"scan:"</strong> followed by any text to save it</p>
                <p class="text-sm opacity-80">- Type <strong>"search:"</strong> followed by keywords to find saved content</p>
                <p class="text-sm opacity-80">- Ask any question and I'll search your knowledge base!</p>
              </div>
              <p class="text-xs opacity-50 mt-3">{{ getCurrentTime() }}</p>
            </div>

            <!-- Messages -->
            <div *ngIf="chatService.messages().length > 0" class="space-y-4">
              <div 
                *ngFor="let message of chatService.messages()" 
                class="animate-in">
                
                <!-- User Message -->
                <div *ngIf="message.type === 'user'" class="flex justify-end mb-4">
                  <div class="chat-message-user">
                    <p class="whitespace-pre-wrap">{{ message.content }}</p>
                  </div>
                </div>

                <!-- AI Message -->
                <div *ngIf="message.type === 'ai'" class="flex items-start gap-3 mb-4">
                  <div class="chat-ai-avatar">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <div class="chat-message-ai">
                      <!-- Loading indicator -->
                      <div *ngIf="message.isLoading" class="flex items-center gap-3">
                        <div class="flex gap-1">
                          <div class="w-2 h-2 rounded-full animate-bounce" style="background: white; animation-delay: 0ms;"></div>
                          <div class="w-2 h-2 rounded-full animate-bounce" style="background: white; animation-delay: 150ms;"></div>
                          <div class="w-2 h-2 rounded-full animate-bounce" style="background: white; animation-delay: 300ms;"></div>
                        </div>
                        <span class="text-sm opacity-80">Searching your documents...</span>
                      </div>
                      <!-- Message content -->
                      <div *ngIf="!message.isLoading" class="prose prose-sm max-w-none">
                        <div [innerHTML]="formatMessage(message.content)"></div>
                      </div>
                    </div>
                    <!-- Sources -->
                    <div *ngIf="message.sources && message.sources.length > 0" class="mt-3 flex flex-wrap gap-2">
                      <span class="text-xs opacity-60">Sources:</span>
                      <span 
                        *ngFor="let source of message.sources" 
                        class="badge-primary text-xs">
                        📄 {{ source }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Saved Items Counter -->
          <div class="px-6 py-2 flex items-center gap-2 text-sm" style="color: rgba(255,255,255,0.6);">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
            </svg>
            <span>Saved: {{ savedItemsCount() }} items</span>
          </div>

          <!-- Quick Actions -->
          <div class="chat-actions-panel">
            <button class="chat-action-btn" (click)="sendQuickAction('scan')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Scan
            </button>
            <button class="chat-action-btn" (click)="sendQuickAction('search')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              Search
            </button>
            <button class="chat-action-btn" (click)="sendQuickAction('content')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h7"/>
              </svg>
              My Content
            </button>
            <button class="chat-action-btn" (click)="sendQuickAction('summary')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Summary
            </button>
            <button class="chat-action-btn" (click)="sendQuickAction('export')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              Export
            </button>
          </div>

          <!-- Input Area -->
          <div class="chat-input-panel">
            <form (ngSubmit)="sendMessage()" class="flex gap-3">
              <div class="flex-1 relative">
                <input
                  #messageInput
                  [(ngModel)]="userMessage"
                  name="message"
                  class="chat-input"
                  placeholder="Ask anything, or use 'scan:' to save content..."
                  [disabled]="chatService.isLoading() || documentCount === 0"
                  (keydown.enter)="onEnterPress($any($event))"
                />
              </div>
              <button 
                type="submit" 
                class="chat-send-btn"
                [disabled]="chatService.isLoading() || !userMessage.trim() || documentCount === 0">
                <svg *ngIf="!chatService.isLoading()" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
                <div *ngIf="chatService.isLoading()" class="spinner w-5 h-5" style="border-color: rgba(255,255,255,0.2); border-top-color: white;"></div>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: calc(100vh - 64px);
      margin: -24px;
    }
    
    .chat-container {
      height: 100%;
    }
    
    .chat-wrapper {
      display: flex;
      height: 100%;
    }
    
    .chat-sidebar-panel {
      width: 240px;
      display: flex;
      flex-direction: column;
      background: linear-gradient(180deg, #1E1B4B 0%, #312E81 100%);
      border-right: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .chat-main-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: linear-gradient(180deg, #312E81 0%, #4338CA 100%);
    }
    
    .chat-header-panel {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .chat-header-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #5B4EE8 0%, #8B5CF6 100%);
    }
    
    .chat-header-btn {
      padding: 8px;
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.6);
      transition: all 0.2s;
    }
    
    .chat-header-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
    
    .chat-messages-panel {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
    
    .chat-welcome-message {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 20px;
      color: white;
    }
    
    .chat-message-user {
      background: linear-gradient(135deg, #5B4EE8 0%, #8B5CF6 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 16px 16px 4px 16px;
      max-width: 80%;
    }
    
    .chat-ai-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #5B4EE8 0%, #8B5CF6 100%);
      flex-shrink: 0;
    }
    
    .chat-message-ai {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      padding: 12px 16px;
      border-radius: 16px 16px 16px 4px;
      max-width: 100%;
    }
    
    .chat-actions-panel {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 0 24px 16px;
    }
    
    .chat-action-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 500;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      transition: all 0.2s;
    }
    
    .chat-action-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    .chat-input-panel {
      padding: 16px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .chat-input {
      width: 100%;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      color: white;
      font-size: 14px;
    }
    
    .chat-input::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }
    
    .chat-input:focus {
      outline: none;
      border-color: rgba(255, 255, 255, 0.4);
    }
    
    .chat-send-btn {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #5B4EE8 0%, #8B5CF6 100%);
      color: white;
      transition: all 0.2s;
    }
    
    .chat-send-btn:hover:not(:disabled) {
      box-shadow: 0 4px 12px rgba(91, 78, 232, 0.4);
    }
    
    .chat-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .chat-history-item {
      padding: 12px 16px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .chat-history-item:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    
    .chat-history-item.active {
      background: linear-gradient(135deg, #5B4EE8 0%, #8B5CF6 100%);
    }
    
    .chat-history-title {
      font-weight: 500;
      font-size: 14px;
      color: white;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .chat-history-meta {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      margin-top: 2px;
    }
  `]
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  userMessage = '';
  documentCount = 0;
  savedItemsCount = signal(0);
  chatSessions = signal<ChatSession[]>([
    { id: '1', title: 'Conversation 30/12/2025', date: 'Yesterday', messageCount: 8 },
  ]);
  selectedChatId = signal<string | null>('1');
  private shouldScrollToBottom = true;

  constructor(
    public chatService: ChatService,
    private documentService: DocumentService
  ) {
    // CRITICAL FIX: Auto-sync document count when documents change
    // This ensures AI Assistant knows about newly uploaded documents
    effect(() => {
      const docs = this.documentService.documents();
      this.documentCount = docs.length;
      console.log('[Chat] Documents available for AI:', docs.length);
    });
  }

  ngOnInit(): void {
    this.loadDocumentCount();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
    }
  }

  async loadDocumentCount(): Promise<void> {
    try {
      await this.documentService.loadDocuments();
      this.documentCount = this.documentService.documents().length;
    } catch (error) {
      console.error('Failed to load document count:', error);
    }
  }

  startNewChat(): void {
    this.chatService.clearChat();
    const newId = Date.now().toString();
    const currentHistory = this.chatSessions();
    this.chatSessions.set([
      { id: newId, title: 'New Conversation', date: 'Just now', messageCount: 0 },
      ...currentHistory
    ]);
    this.selectedChatId.set(newId);
  }

  selectChat(chatId: string): void {
    this.selectedChatId.set(chatId);
  }

  sendQuickAction(action: string): void {
    switch (action) {
      case 'scan':
        this.userMessage = 'scan: ';
        break;
      case 'search':
        this.userMessage = 'search: ';
        break;
      case 'content':
        this.userMessage = 'Show me my saved content';
        break;
      case 'summary':
        this.userMessage = 'Summarize my documents';
        break;
      case 'export':
        this.userMessage = 'Export my saved items';
        break;
    }
    if (this.messageInput) {
      this.messageInput.nativeElement.focus();
    }
  }

  async sendMessage(): Promise<void> {
    const question = this.userMessage.trim();
    if (!question) return;

    this.userMessage = '';
    this.shouldScrollToBottom = true;
    await this.chatService.sendMessage(question);
  }

  onEnterPress(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (!keyEvent.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    this.chatService.clearChat();
  }

  getCurrentTime(): string {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  }

  formatMessage(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code style="background: rgba(255, 255, 255, 0.2); padding: 2px 6px; border-radius: 4px;">$1</code>')
      .replace(/\n/g, '<br>')
      .replace(/^- (.*)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>');
  }

  private scrollToBottom(): void {
    if (this.chatContainer) {
      const element = this.chatContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }
}
