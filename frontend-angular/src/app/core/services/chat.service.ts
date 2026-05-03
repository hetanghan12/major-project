/**
 * AI Chat Service
 * =================
 * Handles AI query operations.
 * 
 * SECURITY: The AI only uses documents from the current user's namespace.
 * 
 * @author College Project
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';
import { DashboardService } from './dashboard.service';

// Chat message interface
export interface ChatMessage {
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
    sources?: string[];
    isLoading?: boolean;
}

// Chat session interface
export interface ChatHistoryItem {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    lastMessage?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private _messages = signal<ChatMessage[]>([]);
    private _isLoading = signal<boolean>(false);
    private _chatHistory = signal<ChatHistoryItem[]>([]);
    private _activeChatId = signal<string | null>(null);

    // Public computed values
    readonly messages = computed(() => this._messages());
    readonly isLoading = computed(() => this._isLoading());
    readonly chatHistory = computed(() => this._chatHistory());
    readonly activeChatId = computed(() => this._activeChatId());
    
    private notificationService = inject(NotificationService);
    private dashboardService = inject(DashboardService);
    private CACHE_KEY = 'cloudai_chat_history';

    constructor(private http: HttpClient) {
        // Load from cache first for instant UI
        this.loadFromCache();
        
        // Initialize with welcome message
        this.addWelcomeMessage();
    }

    /**
     * Load history from local cache
     */
    private loadFromCache(): void {
        const cached = localStorage.getItem(this.CACHE_KEY);
        if (cached) {
            try {
                const history = JSON.parse(cached);
                this._chatHistory.set(history);
                console.log(`[ChatService] Restored ${history.length} sessions from cache`);
            } catch (e) {
                console.warn('[ChatService] Failed to parse cached history');
            }
        }
    }

    /**
     * Save history to local cache
     */
    private saveToCache(history: ChatHistoryItem[]): void {
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(history));
    }

    /**
     * Add welcome message
     */
    private addWelcomeMessage(): void {
        this._messages.set([{
            id: 'welcome',
            type: 'ai',
            content: `👋 Hello! I'm your AI assistant. I can answer questions based on the documents you've uploaded.

**How to use:**
1. Upload your documents in the Documents section
2. Ask me any question about your documents
3. I'll search through your files and provide relevant answers

**Important:** I only have access to YOUR documents. Your data is private and secure.

What would you like to know?`,
            timestamp: new Date(),
            sources: []
        }]);
    }

    private lastFetchTime = 0;
    private readonly FETCH_COOLDOWN = 120000; // 2 minutes

    /**
     * Load chat history (Premium only)
     * @param force Force reload from server
     * @param limit Number of items to load
     * @param lastId ID of the last item for pagination
     */
    async loadChatHistory(force: boolean = false, limit: number = 20, lastId?: string): Promise<void> {
        const now = Date.now();
        
        // Skip if already loaded recently and not forced (only if no pagination params)
        if (!force && !lastId && (now - this.lastFetchTime < this.FETCH_COOLDOWN) && this._chatHistory().length > 0) {
            console.log('[ChatService] History is fresh, using cache');
            return;
        }

        console.log('[ChatService] Fetching history from API...');
        try {
            let url = `${environment.apiUrl}/ai/history?limit=${limit}`;
            if (lastId) url += `&lastId=${lastId}`;

            const response = await this.http.get<{success: boolean, history: ChatHistoryItem[]}>(url).toPromise();

            if (response?.success) {
                const newHistory = response.history || [];
                
                if (lastId) {
                    // Append for pagination
                    this._chatHistory.update(current => [...current, ...newHistory]);
                } else {
                    // Replace for fresh load
                    this._chatHistory.set(newHistory);
                    this.saveToCache(newHistory);
                    this.lastFetchTime = now;
                }
                
                console.log(`[ChatService] Success: Loaded ${newHistory.length} sessions`);
            }
        } catch (error) {
            console.error('[ChatService] Failed to load chat history:', error);
        }
    }

    /**
     * Load messages for a specific chat
     */
    async loadChatMessages(chatId: string): Promise<void> {
        this._isLoading.set(true);
        this._activeChatId.set(chatId);
        
        try {
            const response = await this.http.get<{success: boolean, messages: any[]}>(
                `${environment.apiUrl}/ai/history/${chatId}`
            ).toPromise();

            if (response?.success) {
                const mappedMessages: ChatMessage[] = response.messages.map(m => ({
                    id: m.id || `msg_${Date.now()}`,
                    type: m.role === 'assistant' ? 'ai' : 'user',
                    content: m.content,
                    timestamp: new Date(m.createdAt),
                    sources: m.sources || []
                }));
                this._messages.set(mappedMessages);
            }
        } catch (error: any) {
            console.error('Failed to load chat messages:', error);
        } finally {
            this._isLoading.set(false);
        }
    }

    /**
     * Send a question to the AI
     * @param question The user's question
     * @param fileName Optional file name to focus the query on
     * @param documentId Optional document ID to focus the query on
     */
    async sendMessage(question: string, fileName?: string, documentId?: string): Promise<void> {
        if (!question.trim()) return;

        // Add user message
        const userMessage: ChatMessage = {
            id: this.generateId(),
            type: 'user',
            content: question,
            timestamp: new Date()
        };
        this._messages.update(messages => [...messages, userMessage]);

        // Add loading message
        const loadingId = 'loading_' + Date.now();
        const loadingMessage: ChatMessage = {
            id: loadingId,
            type: 'ai',
            content: '',
            timestamp: new Date(),
            isLoading: true
        };
        this._messages.update(messages => [...messages, loadingMessage]);

        this._isLoading.set(true);

        try {
            const response = await this.http.post<any>(
                `${environment.apiUrl}/ai/query`,
                { 
                    question,
                    fileName,
                    documentId, // PASS THE UNIQUE ID HERE
                    chatId: this._activeChatId()
                }
            ).toPromise();

            // Store chatId if it's a new premium chat
            if (response?.isNewChat && response?.chatId) {
                this._activeChatId.set(response.chatId);
                // Refresh history list to show the new chat (force reload)
                this.loadChatHistory(true);
            }

            // Remove loading message and add AI response
            this._messages.update(messages => {
                const filtered = messages.filter(m => m.id !== loadingId);
                return [...filtered, {
                    id: this.generateId(),
                    type: 'ai',
                    content: response?.answer || 'Sorry, I could not generate a response.',
                    timestamp: new Date(),
                    sources: response?.sources || []
                }];
            });

            // Reload notifications and dashboard stats
            this.notificationService.loadNotifications().subscribe();
            this.dashboardService.refreshDashboard();

        } catch (error: any) {
            this._messages.update(messages => {
                const filtered = messages.filter(m => m.id !== loadingId);
                return [...filtered, {
                    id: this.generateId(),
                    type: 'ai',
                    content: `❌ Sorry, I encountered an error: ${error.message || 'Unable to process your request'}.`,
                    timestamp: new Date(),
                    sources: []
                }];
            });
        } finally {
            this._isLoading.set(false);
        }
    }

    /**
     * Delete a chat session
     */
    async deleteChat(chatId: string): Promise<void> {
        try {
            await this.http.delete(`${environment.apiUrl}/ai/history/${chatId}`).toPromise();
            
            // Remove from history list
            this._chatHistory.update(history => history.filter(c => c.id !== chatId));
            
            // If active chat was deleted, clear messages
            if (this._activeChatId() === chatId) {
                this.clearChat();
            }
        } catch (error) {
            console.error('Failed to delete chat:', error);
        }
    }

    /**
     * Clear chat history
     */
    clearChat(): void {
        this._messages.set([]);
        this._activeChatId.set(null);
        this.addWelcomeMessage();
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
