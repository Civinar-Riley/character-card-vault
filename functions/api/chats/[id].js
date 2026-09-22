// GET /api/chats/:id - 聊天记录详情
// PUT /api/chats/:id - 更新聊天记录
// DELETE /api/chats/:id - 删除聊天记录

import { downloadFromTelegram, uploadToTelegram } from '../../utils/telegram.js';

export async function onRequestGet(context) {
    try {
        const id = context.params.id;

        const chatList = await context.env.CARDS_KV.list({ prefix: 'chat:' });
        let chatIndex = null;

        for (const key of chatList.keys) {
            const chat = await context.env.CARDS_KV.get(key.name, { type: 'json' });
            if (chat && chat.id === id) {
                chatIndex = chat;
                break;
            }
        }

        if (!chatIndex) {
            return new Response(JSON.stringify({ ok: false, error: '聊天记录不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 从 Telegram 获取消息内容
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

        return new Response(JSON.stringify({
            ok: true,
            data: {
                ...chatIndex,
                messages
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPut(context) {
    try {
        const id = context.params.id;
        const body = await context.request.json();

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

        if (body.title !== undefined) {
            chatIndex.title = body.title;
        }

        // 如果更新消息，需要重新上传到 Telegram
        if (body.messages !== undefined) {
            const tgBotToken = context.env.TG_BOT_TOKEN;
            const tgChatId = context.env.TG_CHAT_ID;

            if (tgBotToken && tgChatId) {
                const jsonlContent = body.messages.map(m => JSON.stringify(m)).join('\n');
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
                chatIndex.msgCount = body.messages.length;
                chatIndex.fileSize = new TextEncoder().encode(jsonlContent).length;
            }
        }

        await context.env.CARDS_KV.put(chatKey, JSON.stringify(chatIndex));

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

export async function onRequestDelete(context) {
    try {
        const id = context.params.id;

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

        // 删除 Telegram 消息
        const tgBotToken = context.env.TG_BOT_TOKEN;
        const tgChatId = context.env.TG_CHAT_ID;

        if (tgBotToken && tgChatId && chatIndex.telegramMessageId) {
            await deleteTelegramMessage(tgBotToken, tgChatId, chatIndex.telegramMessageId);
        }

        // 删除 KV 索引
        await context.env.CARDS_KV.delete(chatKey);

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