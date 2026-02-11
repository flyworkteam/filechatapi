const PDFDocument = require('pdfkit');
const path = require('path');

class ReportService {
    async createPdfReport(data) {
        return new Promise((resolve, reject) => {
            // Font yollarını belirle (fonts klasöründe olduklarını varsayıyoruz)
            const fontPath = path.resolve(process.cwd(), 'fonts', 'Roboto-Regular.ttf');
            const boldFontPath = path.resolve(process.cwd(), 'fonts', 'Roboto-Bold.ttf');

            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            let buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // --- TÜRKÇE FONTU KAYDET ---
            // Bu satır hayati önem taşıyor:
            doc.registerFont('TurkishFont', fontPath);
            doc.registerFont('TurkishFontBold', boldFontPath);

            // Başlık (Bold Font Kullanımı)
            doc.font('TurkishFontBold').fillColor('#1a5f7a').fontSize(22).text('ANALİZ RAPORU', { align: 'center' });
            doc.moveDown(1);

            doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#eeeeee').stroke();
            doc.moveDown(2);

            // Bölüm: Konu
            this._drawSection(doc, 'DOKÜMAN KONUSU', data.konu);

            // Bölüm: Özet
            this._drawSection(doc, 'ANALİZ ÖZETİ', data.ozet);

            // Bölüm: Kritik Noktalar
            if (data.kritik_noktalar && data.kritik_noktalar.length > 0) {
                doc.font('TurkishFontBold').fillColor('#1a5f7a').fontSize(14).text('🔑 KRİTİK BULGULAR', { underline: true });
                doc.moveDown(0.5);
                data.kritik_noktalar.forEach(item => {
                    doc.font('TurkishFont').fillColor('#333333').fontSize(11).text(`• ${item}`, { indent: 20 });
                    doc.moveDown(0.3);
                });
                doc.moveDown(1.5);
            }

            // Bölüm: Tavsiye
            this._drawSection(doc, 'AKSİYON ÖNERİSİ', data.tavsiye, '#d9534f');

            doc.end();
        });
    }

    _drawSection(doc, title, content, titleColor = '#1a5f7a') {
        if (!content) return;
        // Başlıklar için Bold, içerik için Normal font
        doc.font('TurkishFontBold').fillColor(titleColor).fontSize(14).text(title, { underline: true });
        doc.moveDown(0.5);
        doc.font('TurkishFont').fillColor('#333333').fontSize(11).text(content, { align: 'justify', lineGap: 2 });
        doc.moveDown(1.5);
    }
}

module.exports = new ReportService();