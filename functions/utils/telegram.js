// Telegram Bot API 工具函数

/**
 * 上传文件到 Telegram 频道
 * @param {string} botToken - Telegram Bot Token
 * @param {string} chatId - 频道 ID
 * @param {File} file - 要上传的文件
 * @param {string} caption - 文件说明（可选）
 * @returns {Promise<Object>} 上传结果，包含 file_id 和 file_path
 */
export async function uploadToTelegram(botToken, chatId, file, caption = '') {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', file);
    if (caption) {
        formData.append('caption', caption);
    }

    const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendDocument`,
        {
            method: 'POST',
            body: formData
        }
    );

    const result = await response.json();

    if (!result.ok) {
        throw new Error(`Telegram upload failed: ${result.description}`);
    }

    return {
        fileId: result.result.document.file_id,
        fileName: result.result.document.file_name,
        messageId: result.result.message_id
    };
}

/**
 * 从 Telegram 获取文件下载链接
 * @param {string} botToken - Telegram Bot Token
 * @param {string} fileId - 文件 ID
 * @returns {Promise<string>} 文件下载 URL
 */
export async function getTelegramFileUrl(botToken, fileId) {
    const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );

    const result = await response.json();

    if (!result.ok) {
        throw new Error(`Get file failed: ${result.description}`);
    }

    return `https://api.telegram.org/file/bot${botToken}/${result.result.file_path}`;
}

/**
 * 下载 Telegram 文件
 * @param {string} botToken - Telegram Bot Token
 * @param {string} fileId - 文件 ID
 * @returns {Promise<Response>} 文件响应
 */
export async function downloadFromTelegram(botToken, fileId) {
    const url = await getTelegramFileUrl(botToken, fileId);
    return fetch(url);
}

/**
 * 验证 Telegram Bot Token 是否有效
 * @param {string} botToken - Telegram Bot Token
 * @returns {Promise<boolean>} 是否有效
 */
export async function validateBotToken(botToken) {
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${botToken}/getMe`
        );
        const result = await response.json();
        return result.ok;
    } catch (error) {
        return false;
    }
}