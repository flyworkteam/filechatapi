const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// Create connection pool for better performance and scalability
const pool = mysql.createPool({
    host: '5.39.8.160',
    port: 3306,
    user: 'flywork1_filechatUser',
    password: '!TEoK!ClivggtK^#',
    database: 'flywork1_filechat',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4',
    timezone: '+00:00', // UTC
});

// Test database connection
pool.getConnection()
    .then((connection) => {
        logger.info('Database connected successfully');
        connection.release();
    })
    .catch((error) => {
        logger.error('Database connection failed:', error);
        process.exit(1);
    });

// Handle pool errors
pool.on('error', (err) => {
    logger.error('Database pool error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        logger.info('Attempting to reconnect to database...');
    } else {
        throw err;
    }
});

/**
 * Execute a query with error handling
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
async function query(query, params = []) {
    const start = Date.now();
    try {
        const [results] = await pool.execute(query, params);
        const duration = Date.now() - start;

        // Log slow queries (> 100ms)
        if (duration > 100) {
            logger.warn(`Slow query detected (${duration}ms):`, query.substring(0, 100));
        }

        return results;
    } catch (error) {
        logger.error('Database query error:', {
            query: query.substring(0, 100),
            error: error.message,
        });
        throw error;
    }
}

/**
 * Execute a transaction
 * @param {Function} callback - Transaction callback
 * @returns {Promise} Transaction result
 */
async function transaction(callback) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Get a connection from the pool (for special cases)
 * @returns {Promise} Connection
 */
async function getConnection() {
    return await pool.getConnection();
}

module.exports = {
    pool,
    query,
    transaction,
    getConnection,
};