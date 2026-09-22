// GET /api/cards/:id/download - 下载原始文件

import { downloadFromTelegram } from '../../../utils/telegram.js';

export async function onRequestGet(context) {
    try {
        const id = context.params.id;
        const card = await context.env.CARDS_KV.get(`card:${id}`, { type: 'json' });

        if (!card || !card.telegramFileId) {
            return new Response(JSON.stringify({ ok: false, error: '文件不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const tgBotToken = context.env.TG_BOT_TOKEN;
        if (!tgBotToken) {
            return new Response(JSON.stringify({ ok: false, error: 'Telegram 配置未设置' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const response = await downloadFromTelegram(tgBotToken, card.telegramFileId);

        if (!response.ok) {
            return new Response(JSON.stringify({ ok: false, error: '下载文件失败' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 根据原始文件名推导 MIME 类型和扩展名（PNG 卡 / JSON 卡）
        const isJson = (card.telegramFileName || '').toLowerCase().endsWith('.json');
        const contentType = isJson ? 'application/json' : 'image/png';
        const ext = isJson ? '.json' : '.png';

        return new Response(response.body, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${card.name || 'character'}${ext}"`
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}