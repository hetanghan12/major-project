const { Server } = require('socket.io');
const { getGlobalStats, getDailyStats } = require('./dashboard-stats.service');

let io;
let pollingInterval = null;
let pollErrorCount = 0;
const MAX_POLL_ERRORS = 5; // Stop logging after 5 consecutive errors

const initWebSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Admin Socket connected: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`🔌 Admin Socket disconnected: ${socket.id}`);
        });
    });

    startDashboardPolling();
    return io;
};

// Poll dashboard stats and broadcast to connected admin clients
const startDashboardPolling = () => {
    if (pollingInterval) clearInterval(pollingInterval);

    pollingInterval = setInterval(async () => {
        try {
            // Skip polling if no clients are connected
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
            pollErrorCount = 0; // Reset on success
        } catch (err) {
            pollErrorCount++;
            if (pollErrorCount <= MAX_POLL_ERRORS) {
                console.error('Socket Polling Error:', err.message);
            }
            if (pollErrorCount === MAX_POLL_ERRORS) {
                console.warn('⚠️  Suppressing further socket polling errors (too many failures).');
            }
        }
    }, 30000); // 30 seconds interval (was 5s — too aggressive)
};

module.exports = { initWebSocket, io: () => io };

