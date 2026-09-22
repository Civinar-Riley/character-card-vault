// POST /api/export/all - 全量备份

export async function onRequestPost(context) {
    try {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            cards: [],
            chats: [],
            tags: []
        };

        // 导出所有角色卡
        const cardList = await context.env.CARDS_KV.list({ prefix: 'card:' });
        for (const key of cardList.keys) {
            const card = await context.env.CARDS_KV.get(key.name, { type: 'json' });
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

        // 导出所有聊天记录
        const chatList = await context.env.CARDS_KV.list({ prefix: 'chat:' });
        for (const key of chatList.keys) {
            const chat = await context.env.CARDS_KV.get(key.name, { type: 'json' });
            if (chat) {
                // 获取聊天内容
                let messages = [];
                if (chat.r2Key) {
                    const file = await context.env.CARDS_BUCKET.get(chat.r2Key);
                    if (file) {
                        const text = await file.text();
                        messages = text.split('\n')
                            .filter(line => line.trim())
                            .map(line => {
                                try {
                                    return JSON.parse(line);
                                } catch (e) {
                                    return null;
                                }
                            })
                            .filter(Boolean);
                    }
                }

                exportData.chats.push({
                    ...chat,
                    messages
                });
            }
        }

        // 导出标签
        const tags = await context.env.CARDS_KV.get('tags', { type: 'json' }) || [];
        exportData.tags = tags;

        // 返回 JSON 数据
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