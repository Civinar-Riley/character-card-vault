// GET /api/chats/:id - 聊天记录详情
// PUT /api/chats/:id - 更新聊天记录
// DELETE /api/chats/:id - 删除聊天记录

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

        // 获取消息内容
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

        return new Response(JSON.stringify({
            ok: true,
            data: {
                ...chatIndex,
                messages
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
        const body = await context.request.json();

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

        // 更新标题
        if (body.title !== undefined) {
            chatIndex.title = body.title;
        }

        // 更新消息
        if (body.messages !== undefined && chatIndex.r2Key) {
            const jsonlContent = body.messages.map(m => JSON.stringify(m)).join('\n');
            await context.env.CARDS_BUCKET.put(chatIndex.r2Key, jsonlContent, {
                httpMetadata: { contentType: 'application/jsonl' }
            });
            chatIndex.msgCount = body.messages.length;
            chatIndex.fileSize = new TextEncoder().encode(jsonlContent).length;
        }

        // 保存更新
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

export async function onRequestDelete(context) {
    try {
        const id = context.params.id;

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

        // 删除 R2 文件
        if (chatIndex.r2Key) {
            await context.env.CARDS_BUCKET.delete(chatIndex.r2Key);
        }

        // 删除 KV 索引
        await context.env.CARDS_KV.delete(chatKey);

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