const { query } = require('../config/database');

class DocumentRepository {
    // 🚀 İsim ve SQL sorgusu "Toplam Kayıt Sayısı"nı getirecek şekilde güncellendi
    async getTotalCountByUserId(userId) {
        const sql = `
            SELECT COUNT(*) as count 
            FROM documents 
            WHERE user_id = ?
        `;
        const result = await query(sql, [userId]);
        return result[0].count;
    }

    async create({ user_id, doc_name, doc_path, analysis_summary }) {
        const sql = `
            INSERT INTO documents (user_id, doc_name, doc_path, analysis_summary) 
            VALUES (?, ?, ?, ?)
        `;
        const result = await query(sql, [user_id, doc_name, doc_path, analysis_summary]);

        return {
            id: result.insertId,
            user_id,
            doc_name,
            doc_path, // Analiz edilmiş PDF Linki
            analysis_summary,
            created_at: new Date()
        };
    }

    async findByUserId(userId) {
        const sql = `
        SELECT id, doc_name, doc_path, analysis_summary, created_at 
        FROM documents 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    `;
        const rows = await query(sql, [userId]);
        return rows;
    }
}

module.exports = new DocumentRepository();

