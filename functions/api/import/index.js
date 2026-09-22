// POST /api/import - 从备份恢复（支持全量备份 / 批量导出格式）

import { uploadToTelegram } from '../../utils/telegram.js';

export async function onRequestPost(context) {
    try {
        const tgBotToken = context.env.TG_BOT_TOKEN;
        const tgChatId = context.env.TG_CHAT_ID;

        if (!tgBotToken || !tgChatId) {
            return new Response(JSON.stringify({ ok: false, error: 'Telegram 配置未设置' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const body = await context.request.json();
        // 兼容全量备份文件（{ok, data:{...}} 包裹）和批量导出（{cards:[...]}）
        const payload = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : body;
        const cards = Array.isArray(payload.cards) ? payload.cards : [];
        const chats = Array.isArray(payload.chats) ? payload.chats : [];
        const tags = Array.isArray(payload.tags) ? payload.tags : [];

        let importedCards = 0, skippedCards = 0;
        let importedChats = 0, skippedChats = 0;

        for (const card of cards) {
            if (!card || !card.id) continue;
            if (await context.env.CARDS_KV.get(`card:${card.id}`)) {
                skippedCards++;
                continue;
            }

            const index = { ...card };
            delete index.fileData;

            // 仅在缺少 telegramFileId 时重新上传（同一 TG 存储恢复时旧 fileId 仍有效）
            if (!index.telegramFileId && Array.isArray(card.fileData) && card.fileData.length > 0) {
                const bytes = new Uint8Array(card.fileData);
                const fileName = card.telegramFileName || `${card.name || 'card'}.png`;
                const upload = await uploadToTelegram(
                    tgBotToken, tgChatId,
                    new File([bytes], fileName),
                    `角色卡恢复: ${card.name || ''}`
                );
                index.telegramFileId = upload.fileId;
                index.telegramFileName = upload.fileName;
                index.telegramMessageId = upload.messageId;
            }

            await context.env.CARDS_KV.put(`card:${card.id}`, JSON.stringify(index));
            importedCards++;
        }

        for (const chat of chats) {
            if (!chat || !chat.id || !chat.cardId) continue;
            const key = `chat:${chat.cardId}:${chat.id}`;
            if (await context.env.CARDS_KV.get(key)) {
                skippedChats++;
                continue;
            }

            const index = { ...chat };
            delete index.messages;

            if (Array.isArray(chat.messages)) {
                index.msgCount = chat.messages.length;
            }

            // 仅在缺少 telegramFileId 时重新上传消息
            if (!index.telegramFileId && Array.isArray(chat.messages) && chat.messages.length > 0) {
                const jsonlContent = chat.messages.map(m => JSON.stringify(m)).join('\n');
                const upload = await uploadToTelegram(
                    tgBotToken, tgChatId,
                    new File([jsonlContent], `${chat.id}.jsonl`, { type: 'application/jsonl' }),
                    `聊天记录恢复: ${chat.title || ''}`
                );
                index.telegramFileId = upload.fileId;
                index.telegramFileName = upload.fileName;
                index.telegramMessageId = upload.messageId;
                index.fileSize = new TextEncoder().encode(jsonlContent).length;
                index.msgCount = chat.messages.length;
            }

            await context.env.CARDS_KV.put(key, JSON.stringify(index));
            importedChats++;
        }

        // 合并标签（含卡片自定义标签）
        if (tags.length > 0) {
            const existingTags = await context.env.CARDS_KV.get('tags', { type: 'json' }) || [];
            await context.env.CARDS_KV.put('tags', JSON.stringify([...new Set([...existingTags, ...tags])]));
        }
        const userTags = cards.flatMap(c => Array.isArray(c.userTags) ? c.userTags : []);
        if (userTags.length > 0) {
            const existingTags = await context.env.CARDS_KV.get('tags', { type: 'json' }) || [];
            await context.env.CARDS_KV.put('tags', JSON.stringify([...new Set([...existingTags, ...userTags])]));
        }

        return new Response(JSON.stringify({
            ok: true,
            data: { importedCards, skippedCards, importedChats, skippedChats }
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
