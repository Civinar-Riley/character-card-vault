// GET /api/chats/:id/export - 导出聊天记录

import { downloadFromTelegram } from '../../../utils/telegram.js';

export async function onRequestGet(context) {
    try {
        const id = context.params.id;

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

        if (!chatIndex.telegramFileId) {
            return new Response(JSON.stringify({ ok: false, error: '文件不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const tgBotToken = context.env.TG_BOT_TOKEN;
        if (!tgBotToken) {
            return new Response(JSON.stringify({ ok: false, error: 'Telegram 配置未设置' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const response = await downloadFromTelegram(tgBotToken, chatIndex.telegramFileId);

        if (!response.ok) {
            return new Response(JSON.stringify({ ok: false, error: '下载文件失败' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(response.body, {
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