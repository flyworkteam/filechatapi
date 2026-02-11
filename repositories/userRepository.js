const db = require('../config/database'); // mysql2.createPool({ ... }).promise() olmalı
class UserRepository {
    // Cihaz ID'sine göre kullanıcıyı bulur
    async findByDeviceId(deviceId) {
        const sql = 'SELECT * FROM users WHERE device_id = ? LIMIT 1';
        const results = await db.query(sql, [deviceId]);
        return results[0]; // Liste döndüğü için ilk elemanı alıyoruz
    }

    // Yeni kullanıcı oluşturur
    async create(deviceId) {
        const sql = 'INSERT INTO users (device_id, created_at) VALUES (?, NOW())';
        const result = await db.query(sql, [deviceId]);

        // Eklenen kullanıcının ID'sini döndürür (Gerekirse)
        return result.insertId;
    }

    // ID'ye göre kullanıcıyı getirir (Insert sonrası güncel veriyi çekmek için)
    async findById(userId) {
        const sql = 'SELECT * FROM users WHERE id = ? LIMIT 1';
        const results = await db.query(sql, [userId]);
        return results[0];
    }

    async updatePremiumStatus(deviceId, isPremium) {
        const sql = 'UPDATE users SET is_premium = ? WHERE device_id = ?';
        // isPremium boolean ise 1 veya 0, değilse olduğu gibi gönderir
        await db.query(sql, [isPremium, deviceId]);
    }
}

module.exports = new UserRepository();