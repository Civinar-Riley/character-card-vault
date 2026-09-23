// POST /api/export/all - 全量备份（仅元数据与标签，不含卡文件）
// 卡文件不内嵌：多卡逐一下载 Telegram 文件会撞 Workers CPU/内存限制。
// 恢复场景：同一 Telegram 存储（fileId 仍有效）→ 用本备份即可；
// 换号迁移（不同频道）→ 用「批量导出」（含文件，单次 ≤20 张）分批进行。

export async function onRequestPost(context) {
    try {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            cards: [],
            tags: []
        };

        // 导出所有角色卡（纯元数据，保留 telegramFileId 引用）
        const cardList = await context.env.CARDS_KV.list({ prefix: 'card:' });
        for (const key of cardList.keys) {
            const card = await context.env.CARDS_KV.get(key.name, { type: 'json' });
            if (card) {
                exportData.cards.push(card);
            }
        }

        const tags = await context.env.CARDS_KV.get('tags', { type: 'json' }) || [];
        exportData.tags = tags;

        return new Response(JSON.stringify({ ok: true, data: exportData }), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="character-cards-full-backup-${Date.now()}.json"`
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}