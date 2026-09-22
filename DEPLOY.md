# 角色卡仓库 - 部署指南（Telegram 版本）

## 方式一：通过 Cloudflare 控制台部署（推荐）

### 1. 准备工作

1. **注册 Cloudflare 账号**
   - 访问 https://dash.cloudflare.com 注册
   - 完成邮箱验证

2. **创建 Telegram Bot**
   - 在 Telegram 中搜索 @BotFather
   - 发送 `/newbot` 命令
   - 按提示输入 Bot 名称和用户名
   - 保存获得的 **Bot Token**

3. **创建 Telegram 频道**

   - 在 Telegram 中创建一个新频道（公开或私有）
   - **【必需】将 Bot 添加为频道管理员**，否则所有上传操作会报错
     `Telegram upload failed: Bad Request: chat not found`
     - 操作：打开频道 → 频道名称 → **管理员** → **添加管理员** → 搜索你创建的 Bot 用户名 → 添加
     - 权限保持默认即可（Bot 需要发送消息/文件的权限，默认已包含）
   - 获取并保存频道的 **Chat ID**（可通过 @VersaToolsBot 或 @GetTheirIDBot 获取）
     - **注意格式**：频道/群组的 Chat ID 以 `-100` 开头（如 `-1001234567890`）。
       有些工具获取到的是不带 `-100` 的短 ID，需要手动补上，否则同样报 `chat not found`

4. **Fork 本仓库到 GitHub**
   - 访问本仓库页面，点击右上角 "Fork"
   - 选择你的 GitHub 账号
   - 等待 Fork 完成

### 2. 创建 KV 命名空间

1. 登录 Cloudflare 控制台
2. 左侧菜单选择 **Workers 和 Pages**
3. 点击 **KV** 标签
4. 点击 **创建命名空间**
5. 配置：
   - **命名空间名称**：`character-cards-kv`
6. 点击 **添加命名空间**
7. 记录 **命名空间 ID**（一串字母数字），后续配置需要

### 3. 连接 GitHub 仓库

1. 在 Cloudflare 控制台左侧菜单选择 **Workers 和 Pages**
2. 点击 **创建应用程序**
3. 选择 **Pages** 标签
4. 点击 **连接到 Git**
5. 选择你的 GitHub 账号
6. 选择刚 Fork 的仓库 `character-card-vault`
7. 配置构建设置：
   - **生产分支**：`main`（或 `master`）
   - **构建命令**：留空（不需要构建）
   - **构建输出目录**：`public`
8. 点击 **保存并部署**
9. 等待部署完成（约 1-2 分钟）

### 4. 设置环境变量

1. 进入刚创建的 Pages 项目
2. 点击 **设置** 标签
3. 左侧选择 **环境变量**
4. 在 **生产** 部分点击 **添加变量**
5. 添加以下变量：
   - **变量名称**：`ACCESS_PASSWORD`，**值**：设置你的访问密码
   - **变量名称**：`TG_BOT_TOKEN`，**值**：你的 Telegram Bot Token
   - **变量名称**：`TG_CHAT_ID`，**值**：你的 Telegram 频道 Chat ID
6. （可选）站点自定义变量：
   - `SITE_NAME`：站点名称（默认"角色卡仓库"）
   - `SITE_TITLE`：浏览器标签页标题
   - `SITE_BACKGROUND`：背景图 URL
7. 点击 **保存**

### 5. 绑定 KV 命名空间

1. 在 Pages 项目页面，点击 **设置** 标签
2. 左侧选择 **集成**
3. 找到 **KV 命名空间绑定** 部分，点击 **添加绑定**
4. 配置：
   - **KV 命名空间**：选择 `character-cards-kv`
   - **变量名称**：`CARDS_KV`
5. 点击 **添加绑定**

### 6. 重新部署

1. 回到 Pages 项目概览页
2. 点击 **重试部署** 或等待自动重新部署
3. 部署完成后，点击 **访问站点** 访问你的角色卡仓库

### 7. 首次访问

1. 打开部署后的网站
2. 输入你设置的访问密码
3. 开始使用！

---

## 方式二：通过 Wrangler CLI 部署

### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

按照提示在浏览器中完成登录授权。

### 3. 创建 KV 命名空间

```bash
# 创建生产环境 KV
wrangler kv namespace create CARDS_KV

# 记录输出的 ID，修改 wrangler.toml 中的 id
```

### 4. 修改 wrangler.toml

将 `wrangler.toml` 中的 `id = "your-kv-namespace-id"` 替换为上一步获取的实际 ID。

### 5. 设置环境变量

```bash
# 创建 .dev.vars 文件（本地开发用）
echo 'ACCESS_PASSWORD="your-password-here"' > .dev.vars
echo 'TG_BOT_TOKEN="your-bot-token"' >> .dev.vars
echo 'TG_CHAT_ID="your-chat-id"' >> .dev.vars

# 生产环境需要在 Cloudflare 控制台设置
```

### 6. 本地开发测试

```bash
wrangler pages dev public
```

访问 http://localhost:8788 测试功能。

### 7. 部署到生产环境

```bash
wrangler pages deploy public
```

### 8. 设置生产环境变量

1. 访问 https://dash.cloudflare.com
2. 进入 Workers 和 Pages > 你的项目 > 设置 > 环境变量
3. 添加 `ACCESS_PASSWORD`、`TG_BOT_TOKEN`、`TG_CHAT_ID` 变量
4. 绑定 KV（参考方式一的步骤 5）

---

## 常见问题

**Q1: 上传角色卡时提示"无法从 PNG 文件中解析角色卡数据"**
- 原因：角色卡 PNG 文件中没有嵌入正确的元数据
- 解决：确保角色卡是标准的 SillyTavern 格式，包含 `chara` 或 `ccv3` 数据块

**Q2: 上传时提示"Telegram 配置未设置"**
- 原因：环境变量未正确配置
- 解决：检查环境变量中是否添加了 `TG_BOT_TOKEN` 和 `TG_CHAT_ID`

**Q2.5: 上传时提示 "Bad Request: chat not found"**
- 原因 1：Bot 未添加为频道管理员（最常见）——Bot 不在频道里就无法向频道发文件，即使 Chat ID 正确
- 原因 2：Chat ID 格式错误——频道 ID 必须以 `-100` 开头（如 `-1001234567890`），检查是否漏掉了前缀
- 原因 3：环境变量设置后未重新部署，改完记得重试部署
- 自查方法：浏览器访问 `https://api.telegram.org/bot<你的Token>/getChat?chat_id=<你的ChatID>`，
  能返回频道信息说明 Token 和 Chat ID 都正确，剩下的原因就是 Bot 不是管理员

**Q2.6: 批量上传时部分失败，提示 "Too Many Requests"**
- 原因：Telegram Bot API 限制每频道约每分钟 20 条消息，一次上传太多会被限流
- 解决：一次上传不要超过 20 张，分批进行；单张失败会自动等待 15 秒重试一次

**Q3: 图片无法显示**
- 原因：Telegram Bot 不是频道管理员，或 Chat ID 错误
- 解决：确保 Bot 已添加为频道管理员，且 Chat ID 正确

**Q4: 搜索功能不工作**
- 原因：KV 绑定未正确配置
- 解决：检查 KV 绑定名称是否为 `CARDS_KV`，确认 KV 命名空间 ID 与 wrangler.toml 一致

**Q5: 部署后无法登录**
- 原因：环境变量未设置或未生效
- 解决：检查环境变量中是否添加了 `ACCESS_PASSWORD`，确认变量是在生产环境设置的，重新部署一次

**Q6: 如何查看日志排查问题？**
- 解决：进入 Pages 项目 > Functions 标签，查看实时日志或下载日志文件

---

## 部署检查清单

- [ ] Cloudflare 账号已注册并验证
- [ ] Telegram Bot 已创建，Bot Token 已保存
- [ ] Telegram 频道已创建，**Bot 已添加为频道管理员**（必需！否则上传报 chat not found）
- [ ] 频道 Chat ID 已获取（格式为 `-100` 开头）
- [ ] 仓库已 Fork 到 GitHub
- [ ] KV 命名空间已创建
- [ ] GitHub 仓库已连接到 Cloudflare Pages
- [ ] 环境变量 `ACCESS_PASSWORD` 已设置
- [ ] 环境变量 `TG_BOT_TOKEN` 已设置
- [ ] 环境变量 `TG_CHAT_ID` 已设置
- [ ] KV 绑定 `CARDS_KV` 已添加
- [ ] 部署成功完成
- [ ] 网站可正常访问
- [ ] 登录功能正常
- [ ] 角色卡上传/下载功能正常
