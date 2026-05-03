import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  run: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  message = signal<string | null>(null);
  type = signal<ToastType>('success');
  action = signal<ToastAction | null>(null);
  private timeout: any;

  show(message: string, type: ToastType = 'success', duration: number = 3000, action: ToastAction | null = null) {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    
    this.message.set(message);
    this.type.set(type);
    this.action.set(action);

    const actualDuration = action ? Math.max(duration, 6000) : duration;

    this.timeout = setTimeout(() => {
      this.message.set(null);
      this.action.set(null);
    }, actualDuration);
  }

  success(message: string, action: ToastAction | null = null) { this.show(message, 'success', 3000, action); }
  error(message: string) { this.show(message, 'error'); }
  info(message: string) { this.show(message, 'info'); }
  warning(message: string) { this.show(message, 'warning'); }
}
