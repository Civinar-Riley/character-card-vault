// GET /api/cards/:id/download - 下载原始文件

export async function onRequestGet(context) {
    try {
        const id = context.params.id;
        const card = await context.env.CARDS_KV.get(`card:${id}`, { type: 'json' });

        if (!card || !card.r2Key) {
            return new Response(JSON.stringify({ ok: false, error: '文件不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const file = await context.env.CARDS_BUCKET.get(card.r2Key);

        if (!file) {
            return new Response(JSON.stringify({ ok: false, error: '文件不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(file.body, {
            headers: {
                'Content-Type': 'image/png',
                'Content-Disposition': `attachment; filename="${card.name || 'character'}.png"`
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}