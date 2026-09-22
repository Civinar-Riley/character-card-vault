// POST /api/export/batch - 批量导出

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

        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            cards: []
        };

        for (const id of cardIds) {
            const card = await context.env.CARDS_KV.get(`card:${id}`, { type: 'json' });
            if (card) {
                // 获取原始文件
                let fileData = null;
                if (card.r2Key) {
                    const file = await context.env.CARDS_BUCKET.get(card.r2Key);
                    if (file) {
                        const buffer = await file.arrayBuffer();
                        fileData = Array.from(new Uint8Array(buffer));
                    }
                }

                exportData.cards.push({
                    ...card,
                    fileData
                });
            }
        }

        // 返回 JSON 数据（前端可以转换为文件下载）
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