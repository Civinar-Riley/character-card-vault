// GET /api/tags - 标签列表
// PUT /api/tags - 标签管理（action: add / rename / delete）

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
        const { action, tag, newTag } = body;

        if (!action || !tag) {
            return new Response(JSON.stringify({ ok: false, error: '参数错误' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (action === 'add') {
            const tags = await context.env.CARDS_KV.get('tags', { type: 'json' }) || [];
            if (!tags.includes(tag)) {
                tags.push(tag);
                await context.env.CARDS_KV.put('tags', JSON.stringify(tags));
            }
            return new Response(JSON.stringify({ ok: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (action === 'rename') {
            if (!newTag) {
                return new Response(JSON.stringify({ ok: false, error: '参数错误' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const tags = await context.env.CARDS_KV.get('tags', { type: 'json' }) || [];
            await context.env.CARDS_KV.put('tags', JSON.stringify([...new Set(tags.map(t => t === tag ? newTag : t))]));

            // 同步重命名所有卡片上的标签（内置 + 自定义）
            const listResult = await context.env.CARDS_KV.list({ prefix: 'card:' });
            for (const key of listResult.keys) {
                const card = await context.env.CARDS_KV.get(key.name, { type: 'json' });
                if (card) {
                    let changed = false;
                    if (card.tags && card.tags.includes(tag)) {
                        card.tags = card.tags.map(t => t === tag ? newTag : t);
                        changed = true;
                    }
                    if (card.userTags && card.userTags.includes(tag)) {
                        card.userTags = card.userTags.map(t => t === tag ? newTag : t);
                        changed = true;
                    }
                    if (changed) await context.env.CARDS_KV.put(key.name, JSON.stringify(card));
                }
            }

            return new Response(JSON.stringify({ ok: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (action === 'delete') {
            const tags = await context.env.CARDS_KV.get('tags', { type: 'json' }) || [];

            await context.env.CARDS_KV.put('tags', JSON.stringify(tags.filter(t => t !== tag)));

            // 从所有卡片中移除该标签（内置 + 自定义）
            const listResult = await context.env.CARDS_KV.list({ prefix: 'card:' });
            for (const key of listResult.keys) {
                const card = await context.env.CARDS_KV.get(key.name, { type: 'json' });
                if (card) {
                    let changed = false;
                    if (card.tags && card.tags.includes(tag)) {
                        card.tags = card.tags.filter(t => t !== tag);
                        changed = true;
                    }
                    if (card.userTags && card.userTags.includes(tag)) {
                        card.userTags = card.userTags.filter(t => t !== tag);
                        changed = true;
                    }
                    if (changed) await context.env.CARDS_KV.put(key.name, JSON.stringify(card));
                }
            }

            return new Response(JSON.stringify({ ok: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ ok: false, error: '参数错误' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}