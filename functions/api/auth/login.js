// POST /api/auth/login
export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const { password } = body;

        if (!password) {
            return new Response(JSON.stringify({ ok: false, error: '请输入密码' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const correctPassword = context.env.ACCESS_PASSWORD;
        
        if (password !== correctPassword) {
            return new Response(JSON.stringify({ ok: false, error: '密码错误' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 生成 token（生产环境应使用 JWT）
        const token = password;

        return new Response(JSON.stringify({ ok: true, data: { token } }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: '登录失败' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}