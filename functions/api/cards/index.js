// GET /api/cards - 角色卡列表
// POST /api/cards - 上传角色卡

import { uploadToTelegram } from '../../utils/telegram.js';

// 解析 PNG 文件中的角色卡数据
export function parseCharacterCard(buffer) {
    const textChunks = [];
    let offset = 8;

    while (offset < buffer.length) {
        const length = new DataView(buffer.buffer, buffer.byteOffset + offset, 4).getUint32(0);
        const type = String.fromCharCode(
            buffer[offset + 4],
            buffer[offset + 5],
            buffer[offset + 6],
            buffer[offset + 7]
        );

        if (type === 'tEXt' || type === 'iTXt') {
            const data = buffer.slice(offset + 8, offset + 8 + length);
            const text = new TextDecoder().decode(data);
            const nullIndex = text.indexOf('\0');
            if (nullIndex !== -1) {
                const keyword = text.slice(0, nullIndex);
                const value = text.slice(nullIndex + 1);
                if (keyword === 'chara' || keyword === 'ccv3') {
                    try {
                        // atob 输出为 Latin-1 字节串，需转字节后按 UTF-8 解码，否则中文变乱码
                        const bin = atob(value.trim());
                        const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
                        return JSON.parse(new TextDecoder().decode(bytes));
                    } catch (e) {
                        try {
                            return JSON.parse(value);
                        } catch (e2) {
                            // 继续查找
                        }
                    }
                }
            }
        }

        offset += 12 + length;
        if (length === 0) break;
    }

    return null;
}

// 生成 SHA-256 指纹
async function generateFingerprint(buffer) {
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 16);
}

// 截断文本
function truncateText(text, maxLen = 200) {
    if (!text) return '';
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}

export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '30');
        const sort = url.searchParams.get('sort') || 'new';
        const tag = url.searchParams.get('tag');
        const creator = url.searchParams.get('creator');
        const favorite = url.searchParams.get('favorite') === 'true';
        const hasChat = url.searchParams.get('hasChat') === 'true';
        const q = url.searchParams.get('q');
        const scope = url.searchParams.get('scope') || 'all';

        const listResult = await context.env.CARDS_KV.list({ prefix: 'card:' });
        let cards = [];

        for (const key of listResult.keys) {
            const card = await context.env.CARDS_KV.get(key.name, { type: 'json' });
            if (card) cards.push(card);
        }

        if (tag) {
            cards = cards.filter(c => (c.tags && c.tags.includes(tag)) || (c.userTags && c.userTags.includes(tag)));
        }
        if (creator) {
            cards = cards.filter(c => c.creator && c.creator.includes(creator));
        }
        if (favorite) {
            cards = cards.filter(c => c.favorited);
        }
        if (hasChat) {
            const chatList = await context.env.CARDS_KV.list({ prefix: 'chat:' });
            const cardIdsWithChat = new Set();
            for (const chatKey of chatList.keys) {
                const chat = await context.env.CARDS_KV.get(chatKey.name, { type: 'json' });
                if (chat && chat.cardId) {
                    cardIdsWithChat.add(chat.cardId);
                }
            }
            cards = cards.filter(c => cardIdsWithChat.has(c.id));
        }
        if (q) {
            const query = q.toLowerCase();
            cards = cards.filter(c => {
                if (scope === 'all') {
                    return (
                        (c.name && c.name.toLowerCase().includes(query)) ||
                        (c.creator && c.creator.toLowerCase().includes(query)) ||
                        (c.description && c.description.toLowerCase().includes(query)) ||
                        (c.personality && c.personality.toLowerCase().includes(query)) ||
                        (c.scenario && c.scenario.toLowerCase().includes(query)) ||
                        (c.first_mes && c.first_mes.toLowerCase().includes(query)) ||
                        (c.mes_example && c.mes_example.toLowerCase().includes(query)) ||
                        (c.system_prompt && c.system_prompt.toLowerCase().includes(query)) ||
                        (c.world && JSON.stringify(c.world).toLowerCase().includes(query))
                    );
                } else {
                    const fieldValue = c[scope];
                    if (typeof fieldValue === 'string') {
                        return fieldValue.toLowerCase().includes(query);
                    } else if (fieldValue) {
                        return JSON.stringify(fieldValue).toLowerCase().includes(query);
                    }
                    return false;
                }
            });
        }

        switch (sort) {
            case 'old':
                cards.sort((a, b) => a.importedAt - b.importedAt);
                break;
            case 'az':
                cards.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'new':
            default:
                cards.sort((a, b) => b.importedAt - a.importedAt);
        }

        const total = cards.length;
        const start = (page - 1) * limit;
        const paginatedCards = cards.slice(start, start + limit);

        const baseUrl = url.origin;
        const result = paginatedCards.map(card => ({
            ...card,
            thumbUrl: card.telegramFileId ? `${baseUrl}/api/cards/${card.id}/thumb` : null,
            fileUrl: `${baseUrl}/api/cards/${card.id}/download`
        }));

        return new Response(JSON.stringify({
            ok: true,
            data: result,
            total,
            page,
            limit
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

export async function onRequestPost(context) {
    try {
        const tgBotToken = context.env.TG_BOT_TOKEN;
        const tgChatId = context.env.TG_CHAT_ID;

        if (!tgBotToken || !tgChatId) {
            return new Response(JSON.stringify({ 
                ok: false, 
                error: 'Telegram 配置未设置，请在环境变量中配置 TG_BOT_TOKEN 和 TG_CHAT_ID' 
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const formData = await context.request.formData();
        const file = formData.get('file');

        if (!file) {
            return new Response(JSON.stringify({ ok: false, error: '请选择文件' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!file.name.endsWith('.png') && !file.name.endsWith('.json')) {
            return new Response(JSON.stringify({ ok: false, error: '仅支持 PNG 和 JSON 格式' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (file.size > 50 * 1024 * 1024) {
            return new Response(JSON.stringify({ ok: false, error: '文件大小不能超过 50MB' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const buffer = new Uint8Array(await file.arrayBuffer());
        let cardData;

        if (file.name.endsWith('.png')) {
            cardData = parseCharacterCard(buffer);
            if (!cardData) {
                return new Response(JSON.stringify({ ok: false, error: '无法从 PNG 文件中解析角色卡数据' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } else {
            try {
                cardData = JSON.parse(new TextDecoder().decode(buffer));
            } catch (e) {
                return new Response(JSON.stringify({ ok: false, error: 'JSON 格式错误' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        const fingerprint = await generateFingerprint(buffer);

        const existing = await context.env.CARDS_KV.get(`card:${fingerprint}`, { type: 'json' });
        if (existing) {
            return new Response(JSON.stringify({ ok: false, error: '该角色卡已存在' }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const name = cardData.name || '未命名角色';
        const creator = cardData.creator || '';
        const spec = cardData.spec || 'chara_card_v2';
        const character_version = cardData.character_version || '1.0';
        const tags = cardData.tags || [];
        const userTags = cardData.userTags || [];
        const description = truncateText(cardData.description);
        const personality = truncateText(cardData.personality);
        const scenario = truncateText(cardData.scenario);
        const first_mes = truncateText(cardData.first_mes);
        const mes_example = truncateText(cardData.mes_example);
        const system_prompt = truncateText(cardData.system_prompt);
        const world = cardData.world || null;

        // 上传到 Telegram
        const uploadResult = await uploadToTelegram(
            tgBotToken,
            tgChatId,
            file,
            `角色卡: ${name}`
        );

        const cardIndex = {
            id: fingerprint,
            name,
            creator,
            spec,
            character_version,
            tags,
            userTags,
            description,
            personality,
            scenario,
            first_mes,
            mes_example,
            system_prompt,
            world,
            telegramFileId: uploadResult.fileId,
            telegramFileName: uploadResult.fileName,
            telegramMessageId: uploadResult.messageId,
            fileSize: file.size,
            importedAt: Date.now(),
            favorited: false
        };

        await context.env.CARDS_KV.put(`card:${fingerprint}`, JSON.stringify(cardIndex));

        const existingTags = await context.env.CARDS_KV.get('tags', { type: 'json' }) || [];
        // 内置标签和自定义标签都并入标签索引（标签云）
        const allTags = new Set([...existingTags, ...tags, ...userTags]);
        await context.env.CARDS_KV.put('tags', JSON.stringify([...allTags]));

        const baseUrl = new URL(context.request.url).origin;
        return new Response(JSON.stringify({
            ok: true,
            data: {
                ...cardIndex,
                thumbUrl: `${baseUrl}/api/cards/${fingerprint}/thumb`,
                fileUrl: `${baseUrl}/api/cards/${fingerprint}/download`
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