const axios = require('axios');
const logger = require('../utils/logger');

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const ANALYSIS_PROMPT = `# ROL
Sen gelişmiş bir multimodal analiz asistanısın. Dosyaları yapısal olarak analiz edip sadece istenen formatta yanıt verirsin.

# GÖREV
Ekteki dosyayı incele ve içeriği tam olarak aşağıdaki başlıkları kullanarak analiz et:

[KONU]
Dosyanın ne olduğu ve temel amacını buraya yaz.

[OZET]
Dosya içeriğinin detaylı özetini buraya yaz.

[KRITIK_NOKTALAR]
- Önemli bilgi 1
- Önemli bilgi 2
(En kritik verileri ve rakamları madde işaretiyle buraya yaz.)

[TAVSIYE]
Dosya sonucuna göre yapılması gereken aksiyon önerisini buraya yaz.

# KURALLAR
- Başlıkları (örn: [KONU]) asla değiştirme, köşeli parantezleri aynen kullan.
- Çıktı dili, dökümanın dili ile aynı olmalı.
- Markdown formatını kullanma, sadece yukarıdaki başlık yapısına sadık kal.`;

const MIME_TYPES = {
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/plain',
    markdown: 'text/plain',
    csv: 'text/csv',
    tsv: 'text/tab-separated-values',
    json: 'application/json',
    xml: 'application/xml',
    plist: 'application/xml',
    rst: 'text/plain',
    org: 'text/plain',
    epub: 'application/epub+zip',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt: 'application/vnd.ms-powerpoint',
    msg: 'application/vnd.ms-outlook',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
};

function getMimeType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
}

function extractSection(text, startTag, endTag) {
    const start = text.indexOf(startTag);
    if (start === -1) return '';

    const startIndex = start + startTag.length;
    const end = endTag ? text.indexOf(endTag, startIndex) : text.length;

    return text.substring(startIndex, end).trim();
}

function parseGeminiResponse(rawText) {
    const result = {
        konu: extractSection(rawText, '[KONU]', '[OZET]'),
        ozet: extractSection(rawText, '[OZET]', '[KRITIK_NOKTALAR]'),
        tavsiye: extractSection(rawText, '[TAVSIYE]', null),
        kritik_noktalar: [],
    };

    const kritikSection = extractSection(rawText, '[KRITIK_NOKTALAR]', '[TAVSIYE]');
    if (kritikSection) {
        result.kritik_noktalar = kritikSection
            .split('\n')
            .map((line) => line.replace(/^[-*•]\s*/, '').trim())
            .filter((line) => line.length > 0);
    }

    return result;
}

class GeminiService {
    async analyzeDocument(fileBuffer, fileName) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY tanımlı değil.');
        }

        const mimeType = getMimeType(fileName);
        logger.info(`Sending file to Gemini for analysis: ${fileName} (${mimeType})`);

        try {
            const response = await axios.post(
                `${GEMINI_API_URL}?key=${apiKey}`,
                {
                    contents: [
                        {
                            parts: [
                                { text: ANALYSIS_PROMPT },
                                {
                                    inline_data: {
                                        mime_type: mimeType,
                                        data: fileBuffer.toString('base64'),
                                    },
                                },
                            ],
                        },
                    ],
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 120000,
                }
            );

            const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) {
                throw new Error('Gemini beklenen analiz verisini döndürmedi.');
            }

            const result = parseGeminiResponse(rawText);
            if (!result.konu) {
                throw new Error('Gemini yanıtı parse edilemedi.');
            }

            return result;
        } catch (error) {
            const geminiMessage = error.response?.data?.error?.message;
            logger.error('Gemini Service Error:', geminiMessage || error.message);
            throw new Error('Doküman analiz edilirken bir hata oluştu.');
        }
    }
}

module.exports = new GeminiService();
