// GET /api/cards/:id/thumb - 获取缩略图

import { getTelegramFileUrl } from '../../../utils/telegram.js';

export async function onRequestGet(context) {
    try {
        const id = context.params.id;
        const card = await context.env.CARDS_KV.get(`card:${id}`, { type: 'json' });

        if (!card || !card.telegramFileId) {
            return new Response(null, { status: 404 });
        }

        const tgBotToken = context.env.TG_BOT_TOKEN;
        if (!tgBotToken) {
            return new Response(null, { status: 500 });
        }

        const fileUrl = await getTelegramFileUrl(tgBotToken, card.telegramFileId);
        const response = await fetch(fileUrl);

        if (!response.ok) {
            return new Response(null, { status: 500 });
        }

        return new Response(response.body, {
            headers: { 'Content-Type': 'image/png' }
        });
    } catch (error) {
        return new Response(null, { status: 500 });
    }
}