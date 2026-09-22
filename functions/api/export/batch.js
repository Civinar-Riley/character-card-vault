// POST /api/export/batch - 批量导出

import { downloadFromTelegram } from '../../utils/telegram.js';

export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const { cardIds } = body;

        if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
            return new Response(JSON.stringify({ ok: false, error: '请选择要导出的角色卡' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const tgBotToken = context.env.TG_BOT_TOKEN;

        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            cards: []
        };

        for (const id of cardIds) {
            const card = await context.env.CARDS_KV.get(`card:${id}`, { type: 'json' });
            if (card) {
                let fileData = null;
                
                // 从 Telegram 下载文件
                if (card.telegramFileId && tgBotToken) {
                    try {
                        const response = await downloadFromTelegram(tgBotToken, card.telegramFileId);
                        if (response.ok) {
                            const buffer = await response.arrayBuffer();
                            fileData = Array.from(new Uint8Array(buffer));
                        }
                    } catch (error) {
                        console.error(`Failed to download card ${id} from Telegram:`, error);
                    }
                }

                exportData.cards.push({
                    ...card,
                    fileData
                });
            }
        }

        return new Response(JSON.stringify({ ok: true, data: exportData }), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="character-cards-batch-${Date.now()}.json"`
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}