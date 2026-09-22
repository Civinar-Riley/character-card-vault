// GET /api/chats - 聊天记录列表
// POST /api/chats - 导入聊天记录

// 解析 JSONL 文件
function parseJSONL(text) {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
        try {
            return JSON.parse(line);
        } catch (e) {
            return null;
        }
    }).filter(Boolean);
}

// 解析 JSON 聊天记录
function parseJSON(text) {
    try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) return data;
        if (data.messages) return data.messages;
        return [data];
    } catch (e) {
        return [];
    }
}

// 生成聊天记录 ID
function generateChatId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        const cardId = url.searchParams.get('cardId');

        let chatList;
        if (cardId) {
            chatList = await context.env.CARDS_KV.list({ prefix: `chat:${cardId}:` });
        } else {
            chatList = await context.env.CARDS_KV.list({ prefix: 'chat:' });
        }

        const chats = [];
        for (const key of chatList.keys) {
            const chat = await context.env.CARDS_KV.get(key.name, { type: 'json' });
            if (chat) chats.push(chat);
        }

        // 按导入时间排序
        chats.sort((a, b) => b.importedAt - a.importedAt);

        return new Response(JSON.stringify({ ok: true, data: chats }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPost(context) {
    try {
        const formData = await context.request.formData();
        const file = formData.get('file');
        const cardId = formData.get('cardId');

        if (!file) {
            return new Response(JSON.stringify({ ok: false, error: '请选择文件' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!cardId) {
            return new Response(JSON.stringify({ ok: false, error: '请指定关联的角色卡' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 验证角色卡是否存在
        const card = await context.env.CARDS_KV.get(`card:${cardId}`, { type: 'json' });
        if (!card) {
            return new Response(JSON.stringify({ ok: false, error: '关联的角色卡不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 检查文件类型
        if (!file.name.endsWith('.jsonl') && !file.name.endsWith('.json')) {
            return new Response(JSON.stringify({ ok: false, error: '仅支持 .jsonl 和 .json 格式' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const text = await file.text();
        let messages;

        if (file.name.endsWith('.jsonl')) {
            messages = parseJSONL(text);
        } else {
            messages = parseJSON(text);
        }

        if (messages.length === 0) {
            return new Response(JSON.stringify({ ok: false, error: '未找到有效的消息数据' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 生成聊天记录 ID
        const chatId = generateChatId();
        const r2Key = `chats/${cardId}/${chatId}.jsonl`;

        // 存储到 R2
        const jsonlContent = messages.map(m => JSON.stringify(m)).join('\n');
        await context.env.CARDS_BUCKET.put(r2Key, jsonlContent, {
            httpMetadata: { contentType: 'application/jsonl' }
        });

        // 提取标题（第一条用户消息）
        let title = '未命名对话';
        const firstUserMsg = messages.find(m => m.role === 'user');
        if (firstUserMsg && firstUserMsg.content) {
            title = firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '');
        }

        // 创建索引
        const chatIndex = {
            id: chatId,
            cardId,
            title,
            msgCount: messages.length,
            r2Key,
            fileSize: new TextEncoder().encode(jsonlContent).length,
            importedAt: Date.now()
        };

        // 存储到 KV
        await context.env.CARDS_KV.put(`chat:${cardId}:${chatId}`, JSON.stringify(chatIndex));

        return new Response(JSON.stringify({ ok: true, data: chatIndex }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}