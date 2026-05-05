const { Server } = require('socket.io');
const { getGlobalStats, getDailyStats } = require('./dashboard-stats.service');
const {
    decodeFirebaseToken,
    buildRequestUser,
    isAdminUser
} = require('../middlewares/auth.middleware');

let io = null;
let pollingInterval = null;
let pollErrorCount = 0;
const MAX_POLL_ERRORS = 5;
const isProduction = process.env.NODE_ENV === 'production';

function parseAllowedOrigins() {
    return (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);
}

function getSocketOrigins() {
    const allowedOrigins = parseAllowedOrigins();

    if (!isProduction) {
        return true;
    }

    return allowedOrigins.length > 0 ? allowedOrigins : false;
}

function extractSocketToken(socket) {
    const authHeader = socket.handshake.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice('Bearer '.length).trim();
        if (token) {
            return token;
        }
    }

    if (typeof socket.handshake.auth?.token === 'string' && socket.handshake.auth.token.trim()) {
        return socket.handshake.auth.token.trim();
    }

    if (typeof socket.handshake.query?.token === 'string' && socket.handshake.query.token.trim()) {
        return socket.handshake.query.token.trim();
    }

    return null;
}

const initWebSocket = (server) => {
    if (io) {
        return io;
    }

    io = new Server(server, {
        cors: {
            origin: getSocketOrigins(),
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.use(async (socket, next) => {
        try {
            const token = extractSocketToken(socket);

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decodedToken = await decodeFirebaseToken(token);
            const user = buildRequestUser(decodedToken);

            if (!(await isAdminUser(user))) {
                return next(new Error('Admin access required'));
            }

            socket.user = user;
            return next();
        } catch (error) {
            console.error('Socket authentication failed:', error.message);
            return next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        const identifier = socket.user?.email || socket.user?.uid || socket.id;
        console.log(`🔌 Admin Socket connected: ${identifier}`);

        socket.on('disconnect', () => {
            console.log(`🔌 Admin Socket disconnected: ${identifier}`);
        });
    });

    startDashboardPolling();
    return io;
};

const startDashboardPolling = () => {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }

    pollingInterval = setInterval(async () => {
        try {
            if (!io || io.engine.clientsCount === 0) return;

            const globalStats = await getGlobalStats();
            const dailyStats = await getDailyStats(7);

            const data = {
                stats: {
                    totalUsers: globalStats.totalUsers || 0,
                    totalFiles: globalStats.totalFiles || 0,
                    totalStorageBytes: globalStats.totalStorageUsed || 0,
                    uploadsToday: globalStats.uploadsToday || 0,
                    aiRequestsToday: globalStats.aiRequestsToday || 0
                },
                storageActivity: dailyStats.map(d => ({
                    label: d.day,
                    value: ((d.storageUsed || 0) / (1024 * 1024)).toFixed(2)
                })),
                lastSynced: new Date().toISOString()
            };

            io.emit('dashboard_update', data);
            pollErrorCount = 0;
        } catch (err) {
            pollErrorCount++;
            if (pollErrorCount <= MAX_POLL_ERRORS) {
                console.error('Socket Polling Error:', err.message);
            }
            if (pollErrorCount === MAX_POLL_ERRORS) {
                console.warn('⚠️ Suppressing further socket polling errors (too many failures).');
            }
        }
    }, 30000);
};

async function shutdownWebSocket() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }

    if (io) {
        await new Promise(resolve => io.close(() => resolve()));
        io = null;
    }
}

module.exports = { initWebSocket, shutdownWebSocket, io: () => io };
