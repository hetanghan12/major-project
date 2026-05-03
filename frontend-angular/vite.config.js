import { defineConfig } from 'vite';

/**
 * NOTE: For Angular 18+ projects using '@angular/build:dev-server', 
 * configuration is primarily managed in 'angular.json'.
 * However, if you are using a custom Vite setup or want a reference:
 */
export default defineConfig({
  server: {
    // Port should match your ng serve port (default is 4200)
    port: 4200,
    strictPort: true,

    // --- FLEXIBLE VERSION (Recommended for Ngrok dynamic URLs) ---
    // Setting to true or ["all"] allows any host to connect.
    allowedHosts: true, 

    // --- SECURE / STRICT VERSION (Specific Host Allowlist) ---
    /*
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.ngrok-free.app', // Wildcard for all ngrok subdomains
      'your-ngrok-subdomain.ngrok-free.app' // Specific host
    ],
    */
  },
});
