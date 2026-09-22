// GET /api/cards/:id/thumb - 获取缩略图

export async function onRequestGet(context) {
    try {
        const id = context.params.id;
        const card = await context.env.CARDS_KV.get(`card:${id}`, { type: 'json' });

        if (!card || !card.thumbKey) {
            // 如果没有缩略图，返回原图
            if (card && card.r2Key) {
                const file = await context.env.CARDS_BUCKET.get(card.r2Key);
                if (file) {
                    return new Response(file.body, {
                        headers: { 'Content-Type': 'image/png' }
                    });
                }
            }
            return new Response(null, { status: 404 });
        }

        const thumb = await context.env.CARDS_BUCKET.get(card.thumbKey);

        if (!thumb) {
            // 如果缩略图不存在，返回原图
            if (card.r2Key) {
                const file = await context.env.CARDS_BUCKET.get(card.r2Key);
                if (file) {
                    return new Response(file.body, {
                        headers: { 'Content-Type': 'image/png' }
                    });
                }
            }
            return new Response(null, { status: 404 });
        }

        return new Response(thumb.body, {
            headers: { 'Content-Type': 'image/png' }
        });
    } catch (error) {
        return new Response(null, { status: 500 });
    }
}