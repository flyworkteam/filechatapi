const express = require('express');
const router = express.Router();
const multer = require('multer');
const documentController = require('../controllers/documentController');


// Multer Konfigürasyonu (RAM'de tutar, diske yazmaz - Hız için)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB Limit
    }
});

// POST -> /api/documents/upload
// "file" parametresi ile dosya, "userId" body ile gönderilmeli
router.post('/upload', upload.single('file'), documentController.uploadDocument);
router.get('/user/:userId', documentController.getUserDocuments);

module.exports = router;