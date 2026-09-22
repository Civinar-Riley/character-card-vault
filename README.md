# 角色卡仓库 (Character Card Vault)

一个基于 Cloudflare Pages 的角色卡管理工具，支持角色卡导入、浏览、搜索、标签管理、批量操作与数据备份等功能。

## 功能特性

- **角色卡管理**：支持 PNG / JSON 格式角色卡导入，自动解析元数据；上传带实时进度条，失败自动重试，Telegram 限流（约 20 张/分钟）自动等待退避
- **搜索筛选**：按名称、作者、描述、文件名等多维度搜索（可选搜索范围），支持按上传时间或名称拼音排序，支持范围筛选（标签/收藏），筛选状态同步到 URL（刷新/分享可保留）
- **标签系统**：标签云筛选，支持标签的新建、重命名、删除（同步应用到所有角色卡）；详情页可为单张卡添加自定义标签，并合并进标签云
- **批量操作**：多选后批量收藏、批量取消收藏、批量删除、批量导出
- **数据备份**：全量备份导出（JSON 格式），支持从备份文件恢复（已存在的内容自动跳过）
- **设置面板**：导航栏 ⚙ 打开，支持背景图开关、主题切换、每页数量、减弱动画、清空缩略图缓存、视图模式记忆，偏好本地保存
- **站点自定义**：通过环境变量 `SITE_NAME` / `SITE_TITLE` / `SITE_BACKGROUND` 更换站点名称、标签页标题和背景图，无需改代码
- **响应式设计**：适配桌面和移动端
- **暗色/亮色主题**：支持主题切换（导航栏快捷键 + 设置面板同步）

## 手动编辑角色卡信息

在角色卡详情页可以手动修改以下内容，保存后立即生效，**无需重新上传**：

| 内容 | 操作 |
|------|------|
| 作者 | 点击"作者"旁的 ✎ 手动输入；或点击预制按钮 **西维纳尔** 一键设置 |
| 简介 | 点击"简介"标题旁的 ✎，在弹窗中撰写/修改（支持多行，不截断） |
| 添加自定义标签 | 点击标签区的 **＋标签** 批量输入（中英文逗号分隔均可）；或点击预制按钮 **已发布** 一键添加 |
| 移除单个自定义标签 | 点击蓝色自定义标签右侧的 **×** |

说明：

- 自定义标签（蓝色）会同时显示在标签云和展柜卡片上，与卡自带的金色标签区分
- 标签云的"管理标签"支持全局新建/重命名/删除标签（影响所有卡片）
- 手动修改只更新仓库索引，不会改动 Telegram 中的原始文件

## 技术栈

- **前端**：原生 HTML/CSS/JavaScript (SPA)
- **后端**：Cloudflare Pages Functions
- **存储**：Telegram Bot API (文件) + Cloudflare KV (元数据)
- **认证**：环境变量密码认证

## 快速部署

1. 创建 Telegram Bot（通过 @BotFather）
2. 创建 Telegram 频道并将 Bot 设为管理员
3. 创建 KV 命名空间并复制其 ID
4. Fork 本仓库到 GitHub，**将 `wrangler.toml` 中的 KV 命名空间 ID 替换为你自己的**
5. 在 Cloudflare Pages 连接仓库并部署
6. 设置环境变量：`ACCESS_PASSWORD`、`TG_BOT_TOKEN`、`TG_CHAT_ID`

> KV ID 属于你的 Cloudflare 账号，不改的话部署会报 `Invalid KV namespace ID`。详见 [DEPLOY.md](DEPLOY.md)。

详细步骤请查看 [DEPLOY.md](DEPLOY.md)

## 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `ACCESS_PASSWORD` | 访问密码 | 是 |
| `TG_BOT_TOKEN` | Telegram Bot Token | 是 |
| `TG_CHAT_ID` | Telegram 频道 Chat ID | 是 |
| `SITE_NAME` | 站点名称（导航栏和登录页显示），默认"角色卡仓库" | 否 |
| `SITE_TITLE` | 浏览器标签页标题，默认不变 | 否 |
| `SITE_BACKGROUND` | 登录页/主页面背景图 URL | 否 |

修改环境变量后需重新部署才会生效。

## 本地开发

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 本地开发
wrangler pages dev public

# 部署
wrangler pages deploy public
```

## API 接口

### 认证

```
POST /api/auth/login
```

### 角色卡

```
GET    /api/cards          # 列表
POST   /api/cards          # 上传
GET    /api/cards/:id      # 详情
PUT    /api/cards/:id      # 更新
DELETE /api/cards/:id      # 删除
GET    /api/cards/:id/download  # 下载原始文件
GET    /api/cards/:id/thumb     # 缩略图
```

### 标签

```
GET    /api/tags           # 列表
PUT    /api/tags           # 标签管理（body: { action: "add" | "rename" | "delete", tag, newTag? }）
```

### 导出 / 导入

```
POST   /api/export/batch   # 批量导出（body: { cardIds: [...] }）
POST   /api/export/all     # 全量备份
POST   /api/import         # 从备份恢复（接受全量备份 / 批量导出格式）
```

## 项目结构

```
character-card-vault/
├── wrangler.toml                      # Cloudflare 配置
├── functions/
│   ├── _middleware.js                  # CORS + 认证中间件
│   ├── utils/
│   │   └── telegram.js                # Telegram Bot API 工具
│   └── api/
│       ├── auth/
│       │   └── login.js               # 登录
│       ├── cards/
│       │   ├── index.js               # 列表/上传
│       │   ├── [id].js                # 详情/更新/删除
│       │   └── [id]/
│       │       ├── download.js        # 下载
│       │       └── thumb.js           # 缩略图
│       ├── tags/
│       │   └── index.js               # 标签列表 / 新建 / 重命名 / 删除
│       ├── export/
│       │   ├── batch.js               # 批量导出
│       │   └── all.js                 # 全量备份
│       └── import/
│           └── index.js               # 备份恢复
├── public/
│   └── index.html                     # 前端单页应用
├── DEPLOY.md                          # 部署指南
├── .gitignore
├── README.md
└── LICENSE                            # CC BY-NC-SA 4.0
```

## 许可证

[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
