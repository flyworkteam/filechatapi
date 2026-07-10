const { query } = require('../config/database');

class ChatRepository {
    async findByClientChatId(userId, clientChatId) {
        const sql = `
            SELECT * FROM chat_history
            WHERE user_id = ? AND client_chat_id = ?
            LIMIT 1
        `;
        const rows = await query(sql, [userId, clientChatId]);
        return rows[0] || null;
    }

    async findByUserId(userId) {
        const sql = `
            SELECT id, user_id, client_chat_id, document_id, chat_title,
                   chat_content, last_message_at, message_count
            FROM chat_history
            WHERE user_id = ?
            ORDER BY last_message_at DESC
        `;
        return query(sql, [userId]);
    }

    async create({
        user_id,
        client_chat_id,
        document_id,
        chat_title,
        chat_content,
        message_count = 0,
    }) {
        const sql = `
            INSERT INTO chat_history
            (user_id, client_chat_id, document_id, chat_title, chat_content, message_count, last_message_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;
        const result = await query(sql, [
            user_id,
            client_chat_id,
            document_id || null,
            chat_title || null,
            JSON.stringify(chat_content || []),
            message_count,
        ]);

        return this.findById(result.insertId);
    }

    async findById(id) {
        const sql = 'SELECT * FROM chat_history WHERE id = ? LIMIT 1';
        const rows = await query(sql, [id]);
        return rows[0] || null;
    }

    async updateChat(id, { chat_title, chat_content, message_count }) {
        const sql = `
            UPDATE chat_history
            SET chat_title = ?, chat_content = ?, message_count = ?, last_message_at = NOW()
            WHERE id = ?
        `;
        await query(sql, [
            chat_title,
            JSON.stringify(chat_content),
            message_count,
            id,
        ]);

        return this.findById(id);
    }
}

module.exports = new ChatRepository();
