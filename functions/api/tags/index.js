// GET /api/tags - 标签列表
// PUT /api/tags - 删除标签

export async function onRequestGet(context) {
    try {
        const tags = await context.env.CARDS_KV.get('tags', { type: 'json' }) || [];
        return new Response(JSON.stringify({ ok: true, data: tags }), {
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
        const body = await context.request.json();
        const { action, tag } = body;

        if (action !== 'delete' || !tag) {
            return new Response(JSON.stringify({ ok: false, error: '参数错误' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 获取当前标签
        const tags = await context.env.CARDS_KV.get('tags', { type: 'json' }) || [];
        
        // 删除标签
        const newTags = tags.filter(t => t !== tag);
        await context.env.CARDS_KV.put('tags', JSON.stringify(newTags));

        // 从所有卡片中移除该标签
        const listResult = await context.env.CARDS_KV.list({ prefix: 'card:' });
        for (const key of listResult.keys) {
            const card = await context.env.CARDS_KV.get(key.name, { type: 'json' });
            if (card && card.tags && card.tags.includes(tag)) {
                card.tags = card.tags.filter(t => t !== tag);
                await context.env.CARDS_KV.put(key.name, JSON.stringify(card));
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