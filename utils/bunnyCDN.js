const axios = require('axios');
const logger = require('./logger');


// .env dosyasından gelenler
const STORAGE_ZONE_NAME = 'filechat';
const ACCESS_KEY = 'a93d9844-c099-4bcd-beccf33b6dab-d0d8-4338';
const PULL_ZONE_URL ='filechat.b-cdn.net'; // filechat.b-cdn.net

/**
 * Dosyayı BunnyCDN'e yükler ve erişim linkini döner.
 * @param {Buffer} fileBuffer - Dosyanın binary verisi
 * @param {string} fileName - Dosya adı
 */
async function uploadToBunny(fileBuffer, fileName) {
    try {
        // Çakışmayı önlemek için benzersiz isim
        const uniqueFileName = `${Date.now()}-${fileName.replace(/\s+/g, '_')}`;

        // BunnyCDN Storage API Endpoint (Varsayılan)
        const uploadUrl = `https://storage.bunnycdn.com/${STORAGE_ZONE_NAME}/${uniqueFileName}`;

        const response = await axios.put(uploadUrl, fileBuffer, {
            headers: {
                'AccessKey': ACCESS_KEY,
                'Content-Type': 'application/octet-stream',
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (response.status === 201 || response.status === 200) {
            // Public (Erişilebilir) URL
            const publicUrl = `https://${PULL_ZONE_URL}/${uniqueFileName}`;
            logger.info(`BunnyCDN Upload Success: ${publicUrl}`);
            return publicUrl;
        }
    } catch (error) {
        logger.error('BunnyCDN Upload Error:', error.response?.data || error.message);
        throw new Error('Dosya sunucuya yüklenirken hata oluştu.');
    }
}

module.exports = { uploadToBunny };