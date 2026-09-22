// GET /api/config - 站点自定义配置（公开接口，仅返回非敏感品牌信息）
// 可选环境变量：
//   SITE_NAME / SITE_TITLE / SITE_BACKGROUND —— 站点品牌
//   PRESET_CREATOR —— 详情页一键作者按钮，默认"西维纳尔"，设为空则隐藏
//   PRESET_TAGS —— 详情页一键标签（逗号分隔），默认"已发布"，设为空则隐藏

export async function onRequestGet(context) {
    const config = {
        siteName: context.env.SITE_NAME || '角色卡仓库',
        siteTitle: context.env.SITE_TITLE || '',
        siteBackground: context.env.SITE_BACKGROUND || '',
        presetCreator: context.env.PRESET_CREATOR || '西维纳尔',
        presetTags: context.env.PRESET_TAGS || '已发布'
    };

    return new Response(JSON.stringify({ ok: true, data: config }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' }
    });
}
