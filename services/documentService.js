const documentRepository = require('../repositories/documentRepository');
const userRepository = require('../repositories/userRepository');
const reportService = require('./reportService');
const { uploadToBunny } = require('../utils/bunnyCDN');
const n8nService = require('./n8nService');
const logger = require('../utils/logger');

class DocumentService {
    async analyzeAndUpload(userId, file) {
        // 1. Kullanıcı Kontrolü
        const user = await userRepository.findById(userId); // findById eklediğini varsayıyorum
        if (!user) throw new Error('Kullanıcı bulunamadı.');

        // 2. Limit Kontrolü (Premium değilse)
        if (!user.is_premium) {
            const weeklyCount = await documentRepository.getWeeklyCountByUserId(userId);
            if (weeklyCount >= 1) {
                throw new Error('LIMIT_EXCEEDED: Günlük doküman limitiniz doldu.');
            }
        }

        logger.info(`Starting process for User: ${userId}, File: ${file.originalname}`);

        // 3. ADIM A: Ham dosyayı BunnyCDN'e yükle (n8n'in indirebilmesi için)
        // Dosya ismine 'input_' öneki ekliyoruz
        const inputUrl = await uploadToBunny(file.buffer, `input_${file.originalname}`);

        // 4. ADIM B: n8n'e gönder ve Analiz + Yeni PDF'i al
        const n8nResult = await n8nService.processDocument(inputUrl, file.originalname);

        // JSON'dan PDF oluştur
        const pdfBuffer = await reportService.createPdfReport(n8nResult);

        // PDF'i Bunny'ye yükle
        const analyzedPdfUrl = await uploadToBunny(pdfBuffer, `analyzed_${file.originalname}.pdf`);

        // Veritabanına özeti de string olarak kaydet
        const newDoc = await documentRepository.create({
            user_id: userId,
            doc_name: file.originalname,
            doc_path: analyzedPdfUrl,
            analysis_summary: JSON.stringify(n8nResult)
        });

        return {
            success: true,
            message: 'Analiz başarıyla tamamlandı.',
            data: {
                id: newDoc.id,
                doc_name: newDoc.doc_name,
                pdf_url: analyzedPdfUrl, // Flutter bu linki açacak
                analysis: n8nResult // Flutter bu JSON'u ekranda gösterecek
            }
        };
    }

    async getUserDocuments(userId) {
        try {
            const documents = await documentRepository.findByUserId(userId);

            // analysis_summary string olarak tutulduğu için 
            // Flutter'da kolay işlemek adına objeye geri çevirebiliriz
            return documents.map(doc => ({
                ...doc,
                analysis_summary: JSON.parse(doc.analysis_summary)
            }));
        } catch (error) {
            logger.error(`Error fetching docs for user ${userId}:`, error.message);
            throw new Error('Dökümanlar getirilirken bir hata oluştu.');
        }
    }
}

module.exports = new DocumentService();