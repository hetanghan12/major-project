/**
 * Environment Configuration
 * ==========================
 * Centralized configuration for API URLs and Firebase.
 * 
 * PORT ARCHITECTURE:
 * - Frontend: http://localhost:4200
 * - Backend:  http://localhost:5000
 */

export const environment = {
    production: false,

    // Backend API URL (Backend runs on port 5000)
    apiUrl: 'http://localhost:5000/api',

    // Firebase Configuration
    // Get these values from Firebase Console → Project Settings → General → Your apps
    firebase: {
        apiKey: "AIzaSyCcvTyhcXlZ8cVcmAmb6vWd0eTkRZgaw4s",
        authDomain: "cloud-space-7802f.firebaseapp.com",
        projectId: "cloud-space-7802f",
        storageBucket: "cloud-space-7802f.firebasestorage.app",
        messagingSenderId: "912681941900",
        appId: "1:912681941900:web:65090fa388eb927d08f4a9"
    },

    // Test user credentials (for demo purposes only)
    testUser: {
        email: 'testuser@collegeproject.com',
        password: 'Test@12345'
    }
};
