const winston = require('winston');
const path = require('path');
const fs = require('fs');

const logLevel = process.env.LOG_LEVEL || 'info';

// Log dizini kontrolü
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Hata veya Meta objelerini temizleyen yardımcı fonksiyon
 * Harf harf parçalanmış verileri birleştirir.
 */
const formatMeta = (meta) => {
    if (!meta || Object.keys(meta).length === 0) return '';

    // Eğer winston objeyi { "0": "H", "1": "o" ... } şeklinde parçaladıysa birleştir
    if (meta[0] !== undefined) {
        return Object.values(meta).join('');
    }

    // Normal obje ise JSON'a çevir
    try {
        return JSON.stringify(meta, null, 2);
    } catch (e) {
        return '[Unserializable Metadata]';
    }
};

const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'filechat-api' },
    transports: [
        // Konsol Çıktısı
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
                    const metaContent = formatMeta(meta);
                    const serviceTag = service ? `[${service}]` : '';
                    return `${timestamp} [${level}] ${serviceTag}: ${message} ${metaContent ? '\n' + metaContent : ''}`;
                })
            ),
        }),
        // Hata dosyası
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5,
        }),
        // Genel log dosyası
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880,
            maxFiles: 5,
        }),
    ],
});

module.exports = logger;