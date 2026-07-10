const chatService = require('../services/chatService');
const logger = require('../utils/logger');

class ChatController {
    async loadSession(req, res) {
        try {
            const {
                userId,
                clientChatId,
                chatTitle,
                documentId,
                filePath,
                initialSummary,
                welcomeMessage,
            } = req.body;

            if (!userId || !clientChatId) {
                return res.status(400).json({
                    success: false,
                    message: 'userId ve clientChatId gerekli.',
                });
            }

            const result = await chatService.loadSession({
                userId,
                clientChatId,
                chatTitle,
                documentId,
                filePath,
                initialSummary,
                welcomeMessage,
            });

            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            logger.error('Chat Session Error:', error.message);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async sendMessage(req, res) {
        try {
            const { userId, clientChatId, message, chatTitle, documentId, filePath } = req.body;

            if (!userId || !clientChatId || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'userId, clientChatId ve message gerekli.',
                });
            }

            const result = await chatService.sendMessage({
                userId,
                clientChatId,
                message,
                chatTitle,
                documentId,
                filePath,
            });

            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            logger.error('Chat Send Error:', error.message);

            if (error.code === 'LIMIT_EXCEEDED') {
                return res.status(403).json({
                    success: false,
                    message: error.message,
                    data: 'PREMIUM_REQUIRED',
                });
            }

            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async clearChat(req, res) {
        try {
            const { userId, clientChatId, welcomeMessage } = req.body;

            if (!userId || !clientChatId) {
                return res.status(400).json({
                    success: false,
                    message: 'userId ve clientChatId gerekli.',
                });
            }

            const result = await chatService.clearChat({
                userId,
                clientChatId,
                welcomeMessage,
            });

            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            logger.error('Chat Clear Error:', error.message);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async getUserChats(req, res) {
        try {
            const userId = Number(req.params.userId);
            if (!userId) {
                return res.status(400).json({ success: false, message: 'User ID gerekli.' });
            }

            const chats = await chatService.getUserChats(userId);
            return res.status(200).json({ success: true, data: chats });
        } catch (error) {
            logger.error('Get Chats Error:', error.message);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new ChatController();
