// POST /api/import - 从备份恢复（支持全量备份 / 批量导出格式）

import { uploadToTelegram } from '../../utils/telegram.js';
import { normalizeTags } from '../cards/index.js';

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
        const tags = Array.isArray(payload.tags) ? payload.tags : [];

        let importedCards = 0, skippedCards = 0;

        for (const card of cards) {
            if (!card || !card.id) continue;
            if (await context.env.CARDS_KV.get(`card:${card.id}`)) {
                skippedCards++;
                continue;
            }

            const index = { ...card };
            delete index.fileData;
            index.tags = normalizeTags(card.tags);
            index.userTags = normalizeTags(card.userTags);

            // 备份携带文件数据时重新上传（换号迁移到新频道，旧 fileId 已失效）；
            // 无 fileData 则沿用原 telegramFileId 引用（同一 TG 存储恢复时仍有效）
            if (Array.isArray(card.fileData) && card.fileData.length > 0) {
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

        // 合并标签（含卡片自定义标签）
        if (tags.length > 0) {
            const existingTags = await context.env.CARDS_KV.get('tags', { type: 'json' }) || [];
            await context.env.CARDS_KV.put('tags', JSON.stringify([...new Set([...existingTags, ...tags])]));
        }
        const userTags = cards.flatMap(c => normalizeTags(c.userTags));
        if (userTags.length > 0) {
            const existingTags = await context.env.CARDS_KV.get('tags', { type: 'json' }) || [];
            await context.env.CARDS_KV.put('tags', JSON.stringify([...new Set([...existingTags, ...userTags])]));
        }

        return new Response(JSON.stringify({
            ok: true,
            data: { importedCards, skippedCards }
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
