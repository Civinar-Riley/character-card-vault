// GET /api/config - 站点自定义配置（公开接口，仅返回非敏感品牌信息）
// 可选环境变量：SITE_NAME（站名）、SITE_TITLE（浏览器标签页标题）、SITE_BACKGROUND（背景图 URL）

export async function onRequestGet(context) {
    const config = {
        siteName: context.env.SITE_NAME || '角色卡仓库',
        siteTitle: context.env.SITE_TITLE || '',
        siteBackground: context.env.SITE_BACKGROUND || ''
    };

    return new Response(JSON.stringify({ ok: true, data: config }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' }
    });
}
