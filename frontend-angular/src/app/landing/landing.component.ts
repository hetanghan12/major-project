import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html',
  styles: [`
    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
      100% { transform: translateY(0px); }
    }
    .float-animation {
      animation: float 6s ease-in-out infinite;
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .gradient-text {
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  `]
})
export class LandingComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  isMenuOpen = false;

  features = [
    {
      title: 'AI Document Intelligence',
      description: 'Upload your documents and chat with them. Our AI understands context and provides accurate answers.',
      icon: 'brain-circuit'
    },
    {
      title: 'Secure Cloud Storage',
      description: 'Your files are encrypted and stored securely. Access them from anywhere, anytime.',
      icon: 'shield-check'
    },
    {
      title: 'Advanced Search',
      description: 'Find any document in seconds with our powerful AI-driven search capabilities.',
      icon: 'search'
    },
    {
      title: 'Seamless Collaboration',
      description: 'Share documents with your team and work together in real-time.',
      icon: 'users'
    }
  ];

  ngOnInit() {
    console.log('🚀 LandingComponent Initialized');
    // Temporarily disabled redirect to troubleshoot
    /*
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
    */
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }
}
