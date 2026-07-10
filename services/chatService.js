const chatRepository = require('../repositories/chatRepository');
const userRepository = require('../repositories/userRepository');
const geminiService = require('./geminiService');
const logger = require('../utils/logger');

function parseMessages(chatContent) {
    if (!chatContent) return [];
    if (Array.isArray(chatContent)) return chatContent;
    try {
        return JSON.parse(chatContent);
    } catch (error) {
        logger.warn('Chat content parse edilemedi.');
        return [];
    }
}

function countUserMessages(messages) {
    return messages.filter((message) => message.isUser).length;
}

function getDocumentContext(messages) {
    const summaryMessage = messages.find((message) => message.isFileSummary);
    return summaryMessage?.text || null;
}

class ChatService {
    async loadSession({
        userId,
        clientChatId,
        chatTitle,
        documentId,
        filePath,
        initialSummary,
        welcomeMessage,
    }) {
        const user = await userRepository.findById(userId);
        if (!user) throw new Error('Kullanıcı bulunamadı.');

        let chat = await chatRepository.findByClientChatId(userId, clientChatId);

        if (chat) {
            return {
                isNew: false,
                messages: parseMessages(chat.chat_content),
            };
        }

        const messages = [];
        const firstText = initialSummary || welcomeMessage;

        if (firstText) {
            messages.push({
                text: firstText,
                isUser: false,
                isFileSummary: Boolean(initialSummary),
                filePath: filePath || null,
            });
        }

        await chatRepository.create({
            user_id: userId,
            client_chat_id: clientChatId,
            document_id: documentId || null,
            chat_title: chatTitle || null,
            chat_content: messages,
            message_count: messages.length,
        });

        return { isNew: true, messages };
    }

    async sendMessage({
        userId,
        clientChatId,
        message,
        chatTitle,
        documentId,
        filePath,
    }) {
        const user = await userRepository.findById(userId);
        if (!user) throw new Error('Kullanıcı bulunamadı.');

        const trimmedMessage = message?.trim();
        if (!trimmedMessage) throw new Error('Mesaj boş olamaz.');

        let chat = await chatRepository.findByClientChatId(userId, clientChatId);
        let messages = chat ? parseMessages(chat.chat_content) : [];

        if (!user.is_premium && countUserMessages(messages) >= 3) {
            const error = new Error('LIMIT_EXCEEDED: Ücretsiz sohbet limitiniz doldu.');
            error.code = 'LIMIT_EXCEEDED';
            throw error;
        }

        if (!chat) {
            chat = await chatRepository.create({
                user_id: userId,
                client_chat_id: clientChatId,
                document_id: documentId || null,
                chat_title: chatTitle || null,
                chat_content: [],
                message_count: 0,
            });
            messages = [];
        }

        const documentContext = getDocumentContext(messages);
        const historyForGemini = messages.filter((item) => !item.isFileSummary);

        messages.push({ text: trimmedMessage, isUser: true, isFileSummary: false });

        const reply = await geminiService.sendChatMessage({
            history: historyForGemini,
            message: trimmedMessage,
            documentContext: historyForGemini.length === 0 ? documentContext : null,
        });

        messages.push({ text: reply, isUser: false, isFileSummary: false });

        await chatRepository.updateChat(chat.id, {
            chat_title: chatTitle || chat.chat_title,
            chat_content: messages,
            message_count: messages.length,
        });

        return { reply, messages };
    }

    async clearChat({ userId, clientChatId, welcomeMessage }) {
        const chat = await chatRepository.findByClientChatId(userId, clientChatId);
        if (!chat) {
            return {
                messages: welcomeMessage
                    ? [{ text: welcomeMessage, isUser: false, isFileSummary: false }]
                    : [],
            };
        }

        const messages = welcomeMessage
            ? [{ text: welcomeMessage, isUser: false, isFileSummary: false }]
            : [];

        await chatRepository.updateChat(chat.id, {
            chat_title: chat.chat_title,
            chat_content: messages,
            message_count: messages.length,
        });

        return { messages };
    }

    async getUserChats(userId) {
        const chats = await chatRepository.findByUserId(userId);

        return chats.map((chat) => {
            const messages = parseMessages(chat.chat_content);
            const lastMessage = messages.length > 0 ? messages[messages.length - 1].text : '';

            return {
                id: chat.id,
                client_chat_id: chat.client_chat_id,
                chat_title: chat.chat_title,
                last_message: lastMessage,
                last_message_at: chat.last_message_at,
                document_id: chat.document_id,
                file_path: messages.find((item) => item.filePath)?.filePath || null,
                message_count: chat.message_count,
            };
        });
    }
}

module.exports = new ChatService();
