const axios = require('axios');
const logger = require('../utils/logger');

class N8nService {
    async processDocument(fileUrl, fileName) {
        try {
            const webhookUrl = 'http://89.252.179.227:5678/webhook/analyze-document';
            logger.info(`Sending file to n8n for analysis: ${fileUrl}`);

            const response = await axios.post(webhookUrl, { fileUrl, fileName });

            // Kontrolü gelen objeye göre esnetiyoruz
            if (!response.data || (!response.data.konu && !response.data[0]?.konu)) {
                throw new Error('n8n beklenen analiz verisini döndürmedi.');
            }

            // n8n bazen array içinde dönebilir, onu standardize edelim
            const data = Array.isArray(response.data) ? response.data[0] : response.data;

            return {
                konu: data.konu,
                ozet: data.ozet,
                tavsiye: data.tavsiye,
                kritik_noktalar: data.kritik_noktalar || []
            };
        } catch (error) {
            logger.error('n8n Service Error:', error.message);
            throw new Error('Doküman analiz edilirken n8n tarafında hata oluştu.');
        }
    }
}

module.exports = new N8nService();