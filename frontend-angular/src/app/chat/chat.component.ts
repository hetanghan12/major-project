/**
 * Chat Component - CloudAI Smart Storage
 * ========================================
 * AI Chat interface matching CloudAI design.
 * Premium light theme with sidebar chat history.
 * 
 * @author CloudAI Team
 */

import { Component, OnInit, ViewChild, ElementRef, signal, effect, ViewEncapsulation, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChatService, ChatMessage, ChatHistoryItem } from '../core/services/chat.service';
import { AuthService } from '../core/services/auth.service';
import { DocumentService } from '../core/services/document.service';
import { marked } from 'marked';

interface ChatSession {
  id: string;
  title: string;
  date: string;
  messageCount: number;
}

@Component({
  standalone: true,
  selector: 'app-chat',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="chat-container animate-in">
      <div class="chat-wrapper">
        <!-- Chat Sidebar -->
        <aside *ngIf="isPremium()" class="chat-sidebar-panel">
          <div class="px-4 pt-6 pb-2">
            <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conversation History</h3>
          </div>

          <!-- New Chat Button -->
          <div class="px-3 py-4">
            <button (click)="startNewChat()" class="btn-primary w-full shadow-sm flex items-center justify-center gap-2 py-3 rounded-xl transition-all hover:scale-[1.02]">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              <span>New Chat</span>
            </button>
          </div>

          <!-- History Groups -->
          <div class="flex-1 overflow-y-auto px-2 custom-scrollbar">
            <!-- Grouped History -->
            <div *ngFor="let group of historyGroups()" class="mb-6">
              <h3 class="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">{{ group.label }}</h3>
              
              <div 
                *ngFor="let session of group.chats"
                (click)="selectChat(session.id)"
                class="chat-history-item group relative"
                [class.active]="chatService.activeChatId() === session.id">
                <div class="flex-1 min-w-0 pr-6">
                  <p class="chat-history-title truncate text-sm">{{ session.title }}</p>
                </div>
                
                <button 
                  (click)="deleteChat($event, session.id)"
                  class="delete-chat-btn"
                  title="Delete Chat">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>

            <div *ngIf="chatService.chatHistory().length === 0" class="px-6 py-12 text-center">
              <div class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg class="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
              </div>
              <p class="text-sm text-slate-400">No conversations yet</p>
            </div>
          </div>
        </aside>

        <!-- Sidebar for Free Users (Locked) -->
        <aside *ngIf="!isPremium()" class="chat-sidebar-panel locked-sidebar italic">
            <div class="p-6 text-center h-full flex flex-col justify-center">
                <div class="premium-lock-icon mb-4">
                    <svg class="w-10 h-10 text-amber-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                </div>
                <h3 class="text-slate-900 font-semibold mb-2">Unlock History</h3>
                <p class="text-xs text-slate-500 leading-relaxed mb-6">
                    Chat history is available only for <strong>Pro</strong> and <strong>Professional</strong> plans.
                </p>
                <a routerLink="/pricing" class="btn-primary-outline text-xs">Upgrade Plan</a>
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
                <h2 class="font-semibold" style="color: var(--text-primary)">Smart AI Assistant</h2>
                <div class="flex items-center gap-2 text-sm text-emerald-500 font-medium">
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
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
              <div class="p-4 rounded-xl mt-4 bg-slate-50 border border-slate-100">
                <p class="text-sm font-semibold mb-2">Try these commands:</p>
                <p class="text-sm text-slate-600">- Type <strong>"scan:"</strong> followed by any text to save it</p>
                <p class="text-sm text-slate-600">- Type <strong>"search:"</strong> followed by keywords to find saved content</p>
                <p class="text-sm text-slate-600">- Ask any question and I'll search your knowledge base!</p>
              </div>
              <p class="text-xs text-slate-400 mt-3">{{ getCurrentTime() }}</p>
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
                          <div class="w-2 h-2 rounded-full animate-bounce" style="background: #6366f1; animation-delay: 0ms;"></div>
                          <div class="w-2 h-2 rounded-full animate-bounce" style="background: #6366f1; animation-delay: 150ms;"></div>
                          <div class="w-2 h-2 rounded-full animate-bounce" style="background: #6366f1; animation-delay: 300ms;"></div>
                        </div>
                        <span class="text-sm text-slate-500">Searching your documents...</span>
                      </div>
                      <!-- Message content -->
                      <div *ngIf="!message.isLoading" class="prose prose-sm max-w-none">
                        <div [innerHTML]="formatMessage(message.id, message.content)"></div>
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
          <div class="px-6 py-2 flex items-center gap-2 text-sm text-slate-500 font-medium">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
            </svg>
            <span>Saved: {{ savedItemsCount() }} items</span>
          </div>

          <!-- Quick Actions -->
          <!-- Document Selection & Input Area -->
          <div class="chat-input-panel">
            <!-- Document Quick Selector -->
            <div class="mb-3 flex items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Reference Document:</span>
              <div class="relative flex-1 group">
                <select 
                  [(ngModel)]="selectedDocumentId"
                  class="chat-select"
                >
                  <option value="">All Documents (General Query)</option>
                  <option *ngFor="let doc of userDocuments()" [value]="doc.documentId">
                     {{ doc.fileName }}
                  </option>
                </select>
                <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                  </svg>
                </div>
              </div>
              <button 
                *ngIf="selectedDocumentId" 
                (click)="selectedDocumentId = ''"
                class="p-1 text-slate-400 hover:text-red-500 transition-colors"
                title="Clear selection"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

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
      color: var(--text-primary);
    }
    
    .chat-container {
      height: 100%;
    }
    
    .chat-wrapper {
      display: flex;
      height: 100%;
      background-color: var(--bg-main);
    }
    
    .chat-sidebar-panel {
      width: 280px;
      min-width: 280px;
      display: flex;
      flex-direction: column;
      background: var(--bg-card);
      border-right: 1px solid var(--border-color);
      z-index: 10;
    }
    
    .chat-main-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--bg-main);
    }
    
    .chat-header-panel {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: var(--bg-card);
      border-bottom: 1px solid var(--border-color);
    }
    
    .chat-header-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    }
    
    .chat-header-btn {
      padding: 8px;
      border-radius: 8px;
      color: var(--text-muted);
      transition: all 0.2s;
    }
    
    .chat-header-btn:hover {
      background: var(--bg-elevated);
      color: var(--text-primary);
    }
    
    .chat-messages-panel {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
    
    .chat-welcome-message {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px;
      color: var(--text-primary);
      box-shadow: var(--shadow-sm);
    }
    
    .chat-message-user {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 16px 16px 4px 16px;
      max-width: 80%;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
    }
    
    .chat-ai-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      flex-shrink: 0;
    }
    
    .chat-message-ai {
      background: var(--bg-card);
      color: var(--text-primary);
      padding: 12px 16px;
      border-radius: 16px 16px 16px 4px;
      max-width: 100%;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
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
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      transition: all 0.2s;
    }
    
    .chat-action-btn:hover {
      background: var(--bg-elevated);
      color: var(--text-primary);
    }
    
    .chat-input-panel {
      padding: 16px 24px;
      background: var(--bg-card);
      border-top: 1px solid var(--border-color);
    }
    
    .chat-input {
      width: 100%;
      padding: 14px 16px;
      background: var(--bg-main);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      color: var(--text-primary);
      font-size: 14px;
      transition: all 0.2s;
    }
    
    .chat-input::placeholder {
      color: var(--text-muted);
    }
    
    .chat-input:focus {
      outline: none;
      border-color: var(--primary);
      background: var(--bg-card);
      box-shadow: 0 0 0 3px var(--primary-light);
    }

    .chat-select {
      width: 100%;
      padding: 8px 12px 8px 34px;
      font-size: 13px;
      background: var(--bg-main);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      color: var(--text-primary);
      appearance: none;
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 500;
    }

    .chat-select:hover {
      background: var(--bg-elevated);
      border-color: var(--text-muted);
    }

    .chat-select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 2px var(--primary-light);
    }

    /* Option styling for some browsers */
    .chat-select option {
      background: var(--bg-card);
      color: var(--text-primary);
    }
    
    .chat-send-btn {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      transition: all 0.2s;
    }
    
    .chat-send-btn:hover:not(:disabled) {
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }
    
    .chat-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .chat-history-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      color: var(--text-secondary);
      margin: 2px 0;
    }
    
    .chat-history-item:hover {
      background: var(--bg-elevated);
      color: var(--text-primary);
    }
    
    .chat-history-item.active {
      background: var(--primary-light);
      color: var(--primary);
      box-shadow: inset 0 0 0 1px var(--primary);
    }
    
    .chat-history-title {
      font-weight: 500;
      font-size: 13.5px;
    }

    .delete-chat-btn {
      position: absolute;
      right: 10px;
      opacity: 0;
      padding: 6px;
      border-radius: 6px;
      color: var(--text-muted);
      transition: all 0.2s;
      background: transparent;
    }

    .chat-history-item:hover .delete-chat-btn {
      opacity: 1;
    }

    .delete-chat-btn:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }
    
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: var(--border-color);
      border-radius: 10px;
    }
    
    .locked-sidebar {
        background: var(--bg-main);
        opacity: 0.8;
    }

    .btn-primary-outline {
        padding: 8px 16px;
        border-radius: 8px;
        border: 1px solid var(--primary);
        color: var(--primary);
        font-weight: 500;
        transition: all 0.2s;
    }
    .btn-primary-outline:hover {
        background: var(--primary);
        color: white;
    }
  `]
})
export class ChatComponent implements OnInit {
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  userMessage = '';
  documentCount = 0;
  savedItemsCount = signal(0);
  selectedDocumentId = '';

  // Get actual documents for selector (filtering out directories)
  userDocuments = computed(() => {
    return this.documentService.documents().filter(doc => !doc.isFolder);
  });

  // Use centralized logic from AuthService
  isPremium = computed(() => this.authService.isPremium());

  // Computed property for grouped history (Today, Yesterday, etc.)
  historyGroups = computed(() => {
    const history = this.chatService.chatHistory();
    const groups: { label: string, chats: ChatHistoryItem[] }[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);

    const todayChats = history.filter(c => new Date(c.updatedAt) >= today);
    const yesterdayChats = history.filter(c => {
      const d = new Date(c.updatedAt);
      return d >= yesterday && d < today;
    });
    const olderChats = history.filter(c => new Date(c.updatedAt) < yesterday);

    if (todayChats.length > 0) groups.push({ label: 'Today', chats: todayChats });
    if (yesterdayChats.length > 0) groups.push({ label: 'Yesterday', chats: yesterdayChats });
    if (olderChats.length > 0) groups.push({ label: 'Previous Days', chats: olderChats });

    return groups;
  });

  private parsedMessageCache = new Map<string, string>();

  constructor(
    public chatService: ChatService,
    private documentService: DocumentService,
    private authService: AuthService
  ) {
    // Use an effect to trigger actions when premium status changes
    effect(() => {
      const isPrem = this.isPremium();
      if (isPrem) {
        console.log('[Chat] Premium status confirmed, loading history...');
        this.chatService.loadChatHistory();
      }
    });

    // CRITICAL FIX: Auto-sync document count when documents change
    // This ensures AI Assistant knows about newly uploaded documents
    effect(() => {
      const docs = this.documentService.documents();
      this.documentCount = docs.length;
      this.savedItemsCount.set(docs.length);
      console.log('[Chat] Documents available for AI:', docs.length);
    });

    // Use an effect to cleanly listen for message array size changes and trigger a single forced scroll
    effect(() => {
      const msgs = this.chatService.messages();
      if (msgs.length > 0) {
        // Wait for the DOM to update with the new messages before scrolling
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });
  }

  ngOnInit(): void {
    this.loadDocumentCount();
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
  }

  selectChat(chatId: string): void {
    if (this.chatService.activeChatId() === chatId) return;
    this.chatService.loadChatMessages(chatId);
  }

  async deleteChat(event: Event, chatId: string): Promise<void> {
    event.stopPropagation(); // Prevent chat selection when clicking delete

    if (confirm('Are you sure you want to delete this conversation? This will permanently remove all messages.')) {
      await this.chatService.deleteChat(chatId);
    }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 86400000 && now.getDate() === date.getDate()) {
      return 'Today';
    } else if (diff < 172800000) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
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

    // Get selected file if any
    let selectedFile = null;
    if (this.selectedDocumentId) {
      selectedFile = this.userDocuments().find(d => d.documentId === this.selectedDocumentId);
    }

    this.userMessage = '';

    // If a specific file is selected, mention it in the UI search indicator or context
    await this.chatService.sendMessage(question, selectedFile?.fileName, selectedFile?.documentId);
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

  formatMessage(id: string, content: string): string {
    if (!content) return '';

    // Memoization: if already parsed this specific message ID and content is the same, return cached.
    const cacheKey = `${id}_${content.length}`;
    if (this.parsedMessageCache.has(cacheKey)) {
      return this.parsedMessageCache.get(cacheKey)!;
    }

    try {
      // In case n8n returned a string with literal string characters "\n" instead of actual newlines
      const processedContent = content.replace(/\\n/g, '\n');
      const parsed = marked.parse(processedContent) as string;
      this.parsedMessageCache.set(cacheKey, parsed);
      return parsed;
    } catch (e) {
      console.error('Markdown parsing error:', e);
      const fallback = content.replace(/\\n/g, '<br/>').replace(/\n/g, '<br/>');
      this.parsedMessageCache.set(cacheKey, fallback);
      return fallback;
    }
  }

  private scrollToBottom(): void {
    if (this.chatContainer) {
      const element = this.chatContainer.nativeElement;
      // Use smooth scroll to avoid abrupt jumping
      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
      });
    }
  }
}
