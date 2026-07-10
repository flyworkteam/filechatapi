const documentRepository = require("../repositories/documentRepository");
const userRepository = require("../repositories/userRepository");
const reportService = require("./reportService");
const { uploadToBunny } = require("../utils/bunnyCDN");
const geminiService = require("./geminiService");
const logger = require("../utils/logger");
const mammoth = require("mammoth"); // 🚀 DOCX -> TXT dönüşümü için

class DocumentService {
  async analyzeAndUpload(userId, file) {
    // 1. Kullanıcı Kontrolü
    const user = await userRepository.findById(userId);
    if (!user) throw new Error("Kullanıcı bulunamadı.");

    // 2. Limit Kontrolü (Premium değilse ve toplam 1 hakkını doldurmuşsa)
            if (!user.is_premium) {
    // 🚀 Artık getTotalCountByUserId fonksiyonunu çağırıyoruz
              const totalCount = await documentRepository.getTotalCountByUserId(userId);
            if (totalCount >= 1) {
    // 🚀 Hata mesajı güncellendi
               throw new Error('LIMIT_EXCEEDED: Ücretsiz kullanım limitiniz doldu. Lütfen Premium\'a geçin.');
            }
        }

    // 🚀 1. ADIM: DOSYA ADI DÜZELTME (Multer Türkçe Karakter Hatası Çözümü)
    let originalName = file.originalname;
    try {
      // Express/Multer dosya adındaki UTF-8 karakterleri bozar, bunu orijinaline çeviriyoruz:
      originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
    } catch (e) {
      logger.warn("Dosya adı decode edilemedi, orijinali kullanılıyor.");
    }

    // 🚀 2. ADIM: URL/CDN İÇİN GÜVENLİ DOSYA ADI OLUŞTURMA
    // Linklerin indirmelerde bozulmaması için Türkçe karakterleri ve boşlukları temizliyoruz
    let safeFileName = originalName
      .replace(/ğ/g, "g")
      .replace(/Ğ/g, "G")
      .replace(/ü/g, "u")
      .replace(/Ü/g, "U")
      .replace(/ş/g, "s")
      .replace(/Ş/g, "S")
      .replace(/ı/g, "i")
      .replace(/İ/g, "I")
      .replace(/ö/g, "o")
      .replace(/Ö/g, "O")
      .replace(/ç/g, "c")
      .replace(/Ç/g, "C")
      .replace(/\s+/g, "_") // Boşlukları alt çizgi yap
      .replace(/[^a-zA-Z0-9.\-_]/g, ""); // İngilizce harf, rakam, nokta, tire ve alt çizgi dışındakileri sil

    logger.info(
      `Starting process for User: ${userId}, File: ${originalName} (Safe: ${safeFileName})`,
    );

    // 🚀 FORMAT DÖNÜŞÜMÜ (DOCX -> TXT)
    let fileBuffer = file.buffer;
    const originalFileBuffer = file.buffer;
    let cdnFileName = safeFileName; // Arka plan işlemleri için GÜVENLİ İSMİ kullanacağız

    // Dosya uzantısı veya mimetype kontrolü yapıyoruz
    const isDocx =
      originalName.toLowerCase().endsWith(".docx") ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (isDocx) {
      logger.info(
        `Converting DOCX to TXT for Gemini compatibility: ${originalName}`,
      );
      try {
        // Mammoth ile docx içindeki saf metni çıkartıyoruz
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        const extractedText = result.value;

        if (!extractedText || extractedText.trim() === "") {
          throw new Error("DOCX dosyası boş veya metin okunamadı.");
        }

        // Buffer'ı ve güvenli dosya adını TXT olacak şekilde değiştiriyoruz
        fileBuffer = Buffer.from(extractedText, "utf-8");
        cdnFileName = cdnFileName.replace(/\.docx$/i, ".txt");
      } catch (error) {
        logger.error(`DOCX to TXT conversion failed: ${error.message}`);
        throw new Error("Dosya formatı dönüştürülürken bir hata oluştu.");
      }
    }

    // 3. ADIM A: Gemini ile analiz et (dosya buffer'ı doğrudan kullanılır)
    const analysisResult = await geminiService.analyzeDocument(
      fileBuffer,
      cdnFileName,
    );

    // 4. ADIM B: Orijinal dosyayı ve analiz TXT/PDF çıktısını BunnyCDN'e yükle
    const originalFileUrl = await uploadToBunny(
      originalFileBuffer,
      `original_${safeFileName}`,
    );
    await uploadToBunny(fileBuffer, `input_${cdnFileName}`);

    // JSON'dan PDF oluştur
    const pdfBuffer = await reportService.createPdfReport(analysisResult);
    // PDF'i Bunny'ye yükle (CDN linki için yine safeFileName kullanıyoruz)
    // Regex ile sonundaki uzantıyı silip .pdf ekliyoruz
    const baseName =
      safeFileName.substring(0, safeFileName.lastIndexOf(".")) || safeFileName;
    const analyzedPdfUrl = await uploadToBunny(
      pdfBuffer,
      `analyzed_${baseName}.pdf`,
    );

    const docxBuffer = await reportService.createDocxReport(analysisResult);
    const analyzedDocxUrl = await uploadToBunny(
      docxBuffer,
      `analyzed_${baseName}.docx`,
    );

    // Veritabanına özeti de string olarak kaydet
    const newDoc = await documentRepository.create({
      user_id: userId,
      doc_name: originalName,
      doc_path: analyzedPdfUrl,
      analyzed_docx_path: analyzedDocxUrl,
      original_doc_path: originalFileUrl,
      analysis_summary: JSON.stringify(analysisResult),
    });

    return {
      success: true,
      message: "Analiz başarıyla tamamlandı.",
      data: {
        id: newDoc.id,
        doc_name: newDoc.doc_name,
        doc_path: analyzedPdfUrl,
        pdf_url: analyzedPdfUrl,
        analyzed_docx_path: analyzedDocxUrl,
        original_doc_path: originalFileUrl,
        analysis: analysisResult,
        analysis_summary: analysisResult,
      },
    };
  }
  async getUserDocuments(userId) {
    try {
      const documents = await documentRepository.findByUserId(userId);

      return documents.map((doc) => ({
        ...doc,
        analysis_summary: JSON.parse(doc.analysis_summary),
      }));
    } catch (error) {
      logger.error(`Error fetching docs for user ${userId}:`, error.message);
      throw new Error("Dökümanlar getirilirken bir hata oluştu.");
    }
  }
}

module.exports = new DocumentService();
