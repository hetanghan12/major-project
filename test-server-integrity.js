try {
    console.log('Checking auth middleware...');
    require('./backend/middlewares/auth.middleware.js');
    console.log('Auth middleware OK.');

    console.log('Checking secure routes...');
    require('./backend/routes/secure-document.routes.js');
    console.log('Secure routes OK.');
} catch (e) {
    console.error('FATAL ERROR:', e);
}
