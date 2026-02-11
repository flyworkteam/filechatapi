const documentService = require('../services/documentService');
const logger = require('../utils/logger');

class DocumentController {

    async uploadDocument(req, res) {
        try {
            // Form-data'dan gelen veriler
            const userId = req.body.userId;
            const file = req.file;

            if (!userId) {
                return res.status(400).json({ success: false, message: 'User ID gerekli.' });
            }
            if (!file) {
                return res.status(400).json({ success: false, message: 'Dosya yüklenmedi.' });
            }

            // Servise gönder
            const result = await documentService.analyzeAndUpload(userId, file);

            return res.status(200).json({
                success: true,
                message: result.message || 'İşlem başarılı',
                data: result.data
            });

        } catch (error) {
            logger.error(`Document Upload Error (User: ${req.body.userId}):`, error.message);

            // Limit hatası mı yoksa genel hata mı?
            if (error.message.includes('LIMIT_EXCEEDED')) {
                return res.status(403).json({
                    success: false,
                    message: error.message,
                    data: 'PREMIUM_REQUIRED'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Sunucu hatası oluştu.'
            });
        }
    }


    async getUserDocuments(req, res) {
        try {
            // Genelde userId auth middleware'den (req.user.id) gelir 
            // veya body/params üzerinden alabilirsiniz
            const userId = req.params.userId || req.body.userId;

            if (!userId) {
                return res.status(400).json({ success: false, message: 'User ID gerekli.' });
            }

            const documents = await documentService.getUserDocuments(userId);

            return res.status(200).json({
                success: true,
                message: 'Dökümanlar başarıyla getirildi.',
                data: documents // Flutter fromJson(response.data['data']) ile bunu okuyacak
            });

        } catch (error) {
            logger.error(`Get Documents Error:`, error.message);
            return res.status(500).json({
                success: false,
                message: 'Sunucu hatası oluştu.'
            });
        }
    }
}

module.exports = new DocumentController();