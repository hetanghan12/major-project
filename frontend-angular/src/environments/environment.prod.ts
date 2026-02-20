/**
 * Production Environment Configuration
 */

export const environment = {
    production: true,

    // Replace with your production API URL
    apiUrl: 'https://your-production-api.com/api',

    firebase: {
        apiKey: "AIzaSyCcvTyhcXlZ8cVcmAmb6vWd0eTkRZgaw4s",
        authDomain: "cloud-space-7802f.firebaseapp.com",
        projectId: "cloud-space-7802f",
        storageBucket: "cloud-space-7802f.firebasestorage.app",
        messagingSenderId: "912681941900",
        appId: "1:912681941900:web:65090fa388eb927d08f4a9"
    },

    testUser: {
        email: 'testuser@collegeproject.com',
        password: 'Test@12345'
    }
};
