// POST /api/export/all - 全量备份

import { downloadFromTelegram } from '../../utils/telegram.js';

export async function onRequestPost(context) {
    try {
        const tgBotToken = context.env.TG_BOT_TOKEN;

        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            cards: [],
            tags: []
        };

        // 导出所有角色卡
        const cardList = await context.env.CARDS_KV.list({ prefix: 'card:' });
        for (const key of cardList.keys) {
            const card = await context.env.CARDS_KV.get(key.name, { type: 'json' });
            if (card) {
                let fileData = null;
                
                if (card.telegramFileId && tgBotToken) {
                    try {
                        const response = await downloadFromTelegram(tgBotToken, card.telegramFileId);
                        if (response.ok) {
                            const buffer = await response.arrayBuffer();
                            fileData = Array.from(new Uint8Array(buffer));
                        }
                    } catch (error) {
                        console.error(`Failed to download card from Telegram:`, error);
                    }
                }

                exportData.cards.push({
                    ...card,
                    fileData
                });
            }
        }

        const tags = await context.env.CARDS_KV.get('tags', { type: 'json' }) || [];
        exportData.tags = tags;

        return new Response(JSON.stringify({ ok: true, data: exportData }), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="character-cards-full-backup-${Date.now()}.json"`
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}