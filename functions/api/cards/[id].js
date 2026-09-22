// GET /api/cards/:id - 角色卡详情
// PUT /api/cards/:id - 更新角色卡
// DELETE /api/cards/:id - 删除角色卡

import { deleteTelegramMessage } from '../../utils/telegram.js';

export async function onRequestGet(context) {
    try {
        const id = context.params.id;
        const card = await context.env.CARDS_KV.get(`card:${id}`, { type: 'json' });

        if (!card) {
            return new Response(JSON.stringify({ ok: false, error: '角色卡不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const baseUrl = new URL(context.request.url).origin;
        return new Response(JSON.stringify({
            ok: true,
            data: {
                ...card,
                thumbUrl: card.telegramFileId ? `${baseUrl}/api/cards/${card.id}/thumb` : null,
                fileUrl: `${baseUrl}/api/cards/${card.id}/download`
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
        const card = await context.env.CARDS_KV.get(`card:${id}`, { type: 'json' });

        if (!card) {
            return new Response(JSON.stringify({ ok: false, error: '角色卡不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const body = await context.request.json();
        
        if (body.creator !== undefined) card.creator = body.creator;
        if (body.description !== undefined) card.description = body.description;
        if (body.tags !== undefined) card.tags = body.tags;
        if (body.userTags !== undefined) card.userTags = body.userTags;
        if (body.favorited !== undefined) card.favorited = body.favorited;

        await context.env.CARDS_KV.put(`card:${id}`, JSON.stringify(card));

        if (body.tags !== undefined || body.userTags !== undefined) {
            const allCards = [];
            const listResult = await context.env.CARDS_KV.list({ prefix: 'card:' });
            for (const key of listResult.keys) {
                const c = await context.env.CARDS_KV.get(key.name, { type: 'json' });
                if (c) allCards.push(c);
            }

            // 标签索引合并内置标签和自定义标签
            const allTags = new Set();
            allCards.forEach(c => {
                if (c.tags) c.tags.forEach(t => allTags.add(t));
                if (c.userTags) c.userTags.forEach(t => allTags.add(t));
            });
            await context.env.CARDS_KV.put('tags', JSON.stringify([...allTags]));
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

export async function onRequestDelete(context) {
    try {
        const id = context.params.id;
        const card = await context.env.CARDS_KV.get(`card:${id}`, { type: 'json' });

        if (!card) {
            return new Response(JSON.stringify({ ok: false, error: '角色卡不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const tgBotToken = context.env.TG_BOT_TOKEN;
        const tgChatId = context.env.TG_CHAT_ID;

        // 删除角色卡文件
        if (tgBotToken && tgChatId && card.telegramMessageId) {
            await deleteTelegramMessage(tgBotToken, tgChatId, card.telegramMessageId);
        }

        // 删除 KV 索引
        await context.env.CARDS_KV.delete(`card:${id}`);

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