const userService = require('../services/userService');

class UserController {
    async splashLogin(req, res) {
        try {
            const { device_id } = req.body;

            if (!device_id) {
                return res.status(400).json({
                    success: false,
                    message: "Device ID gereklidir."
                });
            }

            const userData = await userService.loginByDevice(device_id);

            // Flutter NetworkService'in beklediği format
            res.status(200).json({
                success: true,
                data: userData
            });
        } catch (error) {
            console.error('Splash Auth Error:', error);
            res.status(500).json({
                success: false,
                message: "Sunucu tarafında bir hata oluştu."
            });
        }
    }

    async enablePremium(req, res) {
        try {
            const { device_id } = req.body;

            if (!device_id) {
                return res.status(400).json({
                    success: false,
                    message: "Device ID gereklidir."
                });
            }

            // Servis katmanını çağır
            const updatedUser = await userService.upgradeToPremium(device_id);

            if (!updatedUser) {
                return res.status(404).json({
                    success: false,
                    message: "Kullanıcı bulunamadı."
                });
            }

            res.status(200).json({
                success: true,
                message: "Premium üyelik başarıyla aktif edildi.",
                data: updatedUser
            });

        } catch (error) {
            console.error('Premium Upgrade Error:', error);
            res.status(500).json({
                success: false,
                message: "Premium aktivasyonu sırasında hata oluştu."
            });
        }
    }

    async disablePremium(req, res) {
        try {
            const { device_id } = req.body;

            if (!device_id) {
                return res.status(400).json({
                    success: false,
                    message: "Device ID gereklidir."
                });
            }

            // Servis katmanını çağır (Premium'u kapat)
            const updatedUser = await userService.downgradeToFree(device_id);

            if (!updatedUser) {
                return res.status(404).json({
                    success: false,
                    message: "Kullanıcı bulunamadı."
                });
            }

            res.status(200).json({
                success: true,
                message: "Premium üyelik iptal edildi.",
                data: updatedUser
            });

        } catch (error) {
            console.error('Premium Downgrade Error:', error);
            res.status(500).json({
                success: false,
                message: "Premium iptali sırasında hata oluştu."
            });
        }
    }
}

module.exports = new UserController();