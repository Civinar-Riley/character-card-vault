// CORS + 认证中间件
export async function onRequest(context) {
    // CORS 头
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
    };

    // 处理 OPTIONS 预检请求
    if (context.request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // 登录接口和站点配置接口不需要认证
    const url = new URL(context.request.url);
    if (url.pathname === '/api/auth/login' || url.pathname === '/api/config') {
        const response = await context.next();
        const newResponse = new Response(response.body, response);
        Object.entries(corsHeaders).forEach(([key, value]) => {
            newResponse.headers.set(key, value);
        });
        return newResponse;
    }

    // 验证 token
    const authHeader = context.request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ ok: false, error: '未授权' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }

    const token = authHeader.slice(7);
    const password = context.env.ACCESS_PASSWORD;
    
    // 简单的 token 验证（生产环境应使用 JWT）
    if (token !== password) {
        return new Response(JSON.stringify({ ok: false, error: 'Token 无效' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }

    // 继续处理请求
    const response = await context.next();
    const newResponse = new Response(response.body, response);
    Object.entries(corsHeaders).forEach(([key, value]) => {
        newResponse.headers.set(key, value);
    });
    return newResponse;
}