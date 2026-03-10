/**
 * AI Chat Service
 * =================
 * Handles AI query operations.
 * 
 * SECURITY: The AI only uses documents from the current user's namespace.
 * 
 * @author College Project
 */

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// Chat message interface
export interface ChatMessage {
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
    sources?: string[];
    isLoading?: boolean;
}

// AI response interface
interface AIResponse {
    success: boolean;
    answer: string;
    sources: string[];
    metadata?: {
        matchCount: number;
        topScore: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private _messages = signal<ChatMessage[]>([]);
    private _isLoading = signal<boolean>(false);

    // Public computed values
    readonly messages = computed(() => this._messages());
    readonly isLoading = computed(() => this._isLoading());

    constructor(private http: HttpClient) {
        // Initialize with welcome message
        this.addWelcomeMessage();
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
1. Upload your documents (PDF, DOCX, TXT, PPT, Image, Audio) in the Documents section
2. Ask me any question about your documents
3. I'll search through your files and provide relevant answers

**Important:** I only have access to YOUR documents. Your data is private and secure.

What would you like to know?`,
            timestamp: new Date(),
            sources: []
        }]);
    }

    /**
     * Send a question to the AI
     */
    async sendMessage(question: string): Promise<void> {
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
        const loadingMessage: ChatMessage = {
            id: 'loading',
            type: 'ai',
            content: '',
            timestamp: new Date(),
            isLoading: true
        };
        this._messages.update(messages => [...messages, loadingMessage]);

        this._isLoading.set(true);

        try {
            const response = await this.http.post<AIResponse>(
                `${environment.apiUrl}/ai/query`,
                { question }
            ).toPromise();

            // Remove loading message and add AI response
            this._messages.update(messages => {
                const filtered = messages.filter(m => m.id !== 'loading');
                return [...filtered, {
                    id: this.generateId(),
                    type: 'ai',
                    content: response?.answer || 'Sorry, I could not generate a response.',
                    timestamp: new Date(),
                    sources: response?.sources || []
                }];
            });

        } catch (error: any) {
            // Remove loading message and add error message
            this._messages.update(messages => {
                const filtered = messages.filter(m => m.id !== 'loading');
                return [...filtered, {
                    id: this.generateId(),
                    type: 'ai',
                    content: `❌ Sorry, I encountered an error: ${error.message || 'Unable to process your request'}. Please try again.`,
                    timestamp: new Date(),
                    sources: []
                }];
            });
        } finally {
            this._isLoading.set(false);
        }
    }

    /**
     * Clear chat history
     */
    clearChat(): void {
        this._messages.set([]);
        this.addWelcomeMessage();
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
