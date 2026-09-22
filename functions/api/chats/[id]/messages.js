// PUT /api/chats/:id/messages - 更新单条消息

export async function onRequestPut(context) {
    try {
        const id = context.params.id;
        const body = await context.request.json();
        const { index, message } = body;

        if (index === undefined || !message) {
            return new Response(JSON.stringify({ ok: false, error: '参数错误' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 查找聊天记录
        const chatList = await context.env.CARDS_KV.list({ prefix: 'chat:' });
        let chatKey = null;
        let chatIndex = null;

        for (const key of chatList.keys) {
            const chat = await context.env.CARDS_KV.get(key.name, { type: 'json' });
            if (chat && chat.id === id) {
                chatIndex = chat;
                chatKey = key.name;
                break;
            }
        }

        if (!chatIndex || !chatKey) {
            return new Response(JSON.stringify({ ok: false, error: '聊天记录不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 获取当前消息
        let messages = [];
        if (chatIndex.r2Key) {
            const file = await context.env.CARDS_BUCKET.get(chatIndex.r2Key);
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

        // 更新指定消息
        if (index >= 0 && index < messages.length) {
            messages[index] = message;
        } else {
            return new Response(JSON.stringify({ ok: false, error: '消息索引无效' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 保存更新
        const jsonlContent = messages.map(m => JSON.stringify(m)).join('\n');
        await context.env.CARDS_BUCKET.put(chatIndex.r2Key, jsonlContent, {
            httpMetadata: { contentType: 'application/jsonl' }
        });

        chatIndex.fileSize = new TextEncoder().encode(jsonlContent).length;
        await context.env.CARDS_KV.put(chatKey, JSON.stringify(chatIndex));

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