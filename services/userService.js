const userRepository = require('../repositories/userRepository');

class UserService {
    async loginByDevice(deviceId) {
        // 1. Önce veritabanında bu cihaz var mı kontrol et
        let user = await userRepository.findByDeviceId(deviceId);

        if (!user) {
            // 2. Eğer yoksa, yeni bir kullanıcı kaydı oluştur
            const newUserId = await userRepository.create(deviceId);

            // 3. Yeni oluşturulan kullanıcıyı veritabanından çek (Full model dönmesi için)
            user = await userRepository.findById(newUserId);
        }

        // 4. Kullanıcıyı Controller'a teslim et
        return user;
    }
    async upgradeToPremium(deviceId) {
        // 1. Önce kullanıcıyı premium yap (true / 1)
        await userRepository.updatePremiumStatus(deviceId, true);

        // 2. Güncel kullanıcı verisini çekip döndür (UI'da anlık güncelleme için)
        const updatedUser = await userRepository.findByDeviceId(deviceId);
        return updatedUser;
    }
    async downgradeToFree(deviceId) {
        // 1. Kullanıcıyı free yap (false / 0)
        // Repository'deki metodun zaten parametre alıyor, yeniden yazmaya gerek yok.
        await userRepository.updatePremiumStatus(deviceId, false);

        // 2. Güncel kullanıcı verisini çekip döndür
        const updatedUser = await userRepository.findByDeviceId(deviceId);
        return updatedUser;
    }
}

module.exports = new UserService();