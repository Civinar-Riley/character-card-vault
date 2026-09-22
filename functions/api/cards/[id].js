// GET /api/cards/:id - 角色卡详情
// PUT /api/cards/:id - 更新角色卡
// DELETE /api/cards/:id - 删除角色卡

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
                thumbUrl: card.thumbKey ? `${baseUrl}/api/cards/${card.id}/thumb` : null,
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
        
        // 更新允许的字段
        if (body.tags !== undefined) card.tags = body.tags;
        if (body.userTags !== undefined) card.userTags = body.userTags;
        if (body.favorited !== undefined) card.favorited = body.favorited;

        // 保存更新
        await context.env.CARDS_KV.put(`card:${id}`, JSON.stringify(card));

        // 更新标签索引
        if (body.tags !== undefined) {
            const allCards = [];
            const listResult = await context.env.CARDS_KV.list({ prefix: 'card:' });
            for (const key of listResult.keys) {
                const c = await context.env.CARDS_KV.get(key.name, { type: 'json' });
                if (c) allCards.push(c);
            }
            
            const allTags = new Set();
            allCards.forEach(c => {
                if (c.tags) c.tags.forEach(t => allTags.add(t));
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

        // 删除 R2 文件
        if (card.r2Key) {
            await context.env.CARDS_BUCKET.delete(card.r2Key);
        }
        if (card.thumbKey) {
            await context.env.CARDS_BUCKET.delete(card.thumbKey);
        }

        // 删除 KV 索引
        await context.env.CARDS_KV.delete(`card:${id}`);

        // 删除关联的聊天记录
        const chatList = await context.env.CARDS_KV.list({ prefix: 'chat:' });
        for (const chatKey of chatList.keys) {
            const chat = await context.env.CARDS_KV.get(chatKey.name, { type: 'json' });
            if (chat && chat.cardId === id) {
                // 删除 R2 中的聊天文件
                if (chat.r2Key) {
                    await context.env.CARDS_BUCKET.delete(chat.r2Key);
                }
                await context.env.CARDS_KV.delete(chatKey.name);
            }
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