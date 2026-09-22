// PUT /api/chats/:id/messages - 更新单条消息

import { downloadFromTelegram, uploadToTelegram } from '../../../utils/telegram.js';

export async function onRequestPut(context) {
    try {
        const id = context.params.id;
        const body = await context.request.json();
        const { index, message } = body;

        if (index === undefined || !message) {
            return new Response(JSON.stringify({ ok: false, error: '参数错误' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const chatList = await context.env.CARDS_KV.list({ prefix: 'chat:' });
        let chatKey = null;
        let chatIndex = null;

        for (const key of chatList.keys) {
            const chat = await context.env.CARDS_KV.get(key.name, { type: 'json' });
            if (chat && chat.id === id) {
                chatIndex = chat;
                chatKey = key.name;
                break;
            }
        }

        if (!chatIndex || !chatKey) {
            return new Response(JSON.stringify({ ok: false, error: '聊天记录不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 从 Telegram 获取当前消息
        let messages = [];
        if (chatIndex.telegramFileId) {
            const tgBotToken = context.env.TG_BOT_TOKEN;
            if (tgBotToken) {
                try {
                    const response = await downloadFromTelegram(tgBotToken, chatIndex.telegramFileId);
                    if (response.ok) {
                        const text = await response.text();
                        messages = text.split('\n')
                            .filter(line => line.trim())
                            .map(line => {
                                try {
                                    return JSON.parse(line);
                                } catch (e) {
                                    return null;
                                }
                            })
                            .filter(Boolean);
                    }
                } catch (error) {
                    console.error('Failed to download chat from Telegram:', error);
                }
            }
        }

        // 更新指定消息
        if (index >= 0 && index < messages.length) {
            messages[index] = message;
        } else {
            return new Response(JSON.stringify({ ok: false, error: '消息索引无效' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 重新上传到 Telegram
        const tgBotToken = context.env.TG_BOT_TOKEN;
        const tgChatId = context.env.TG_CHAT_ID;

        if (tgBotToken && tgChatId) {
            const jsonlContent = messages.map(m => JSON.stringify(m)).join('\n');
            const chatFile = new File([jsonlContent], `${chatIndex.id}.jsonl`, { type: 'application/jsonl' });
            
            const uploadResult = await uploadToTelegram(
                tgBotToken,
                tgChatId,
                chatFile,
                `聊天记录更新: ${chatIndex.title}`
            );

            chatIndex.telegramFileId = uploadResult.fileId;
            chatIndex.telegramFileName = uploadResult.fileName;
            chatIndex.telegramMessageId = uploadResult.messageId;
            chatIndex.fileSize = new TextEncoder().encode(jsonlContent).length;
            
            await context.env.CARDS_KV.put(chatKey, JSON.stringify(chatIndex));
        }

        return new Response(JSON.stringify({ ok: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}