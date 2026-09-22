// GET /api/chats/:id/export - 导出聊天记录

export async function onRequestGet(context) {
    try {
        const id = context.params.id;

        // 查找聊天记录
        const chatList = await context.env.CARDS_KV.list({ prefix: 'chat:' });
        let chatIndex = null;

        for (const key of chatList.keys) {
            const chat = await context.env.CARDS_KV.get(key.name, { type: 'json' });
            if (chat && chat.id === id) {
                chatIndex = chat;
                break;
            }
        }

        if (!chatIndex) {
            return new Response(JSON.stringify({ ok: false, error: '聊天记录不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 获取文件
        if (!chatIndex.r2Key) {
            return new Response(JSON.stringify({ ok: false, error: '文件不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const file = await context.env.CARDS_BUCKET.get(chatIndex.r2Key);

        if (!file) {
            return new Response(JSON.stringify({ ok: false, error: '文件不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(file.body, {
            headers: {
                'Content-Type': 'application/jsonl',
                'Content-Disposition': `attachment; filename="${chatIndex.title || 'chat'}.jsonl"`
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}