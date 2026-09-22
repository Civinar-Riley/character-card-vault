# 角色卡仓库 (Character Card Vault)

一个基于 Cloudflare Pages 的角色卡管理工具，支持角色卡导入、浏览、搜索、聊天记录管理等功能。

## 功能特性

- **角色卡管理**：支持 PNG 格式角色卡导入，自动解析元数据
- **搜索筛选**：按名称、作者、描述、标签等多维度搜索
- **标签系统**：自定义标签，支持标签云筛选
- **聊天记录**：导入/查看/编辑/导出聊天记录
- **批量操作**：多选批量删除、导出
- **数据备份**：支持全量数据备份导出
- **响应式设计**：适配桌面和移动端
- **暗色/亮色主题**：支持主题切换

## 技术栈

- **前端**：原生 HTML/CSS/JavaScript (SPA)
- **后端**：Cloudflare Pages Functions
- **存储**：Cloudflare R2 (文件) + KV (元数据)
- **认证**：环境变量密码认证

## 部署步骤

1. Fork 本仓库到 GitHub
2. 在 Cloudflare Dashboard 创建 R2 存储桶（名称：`character-cards`）
3. 在 Cloudflare Dashboard 创建 KV 命名空间
4. 连接 GitHub 仓库到 Cloudflare Pages
5. 设置环境变量：`ACCESS_PASSWORD`
6. 绑定 R2 和 KV
7. 部署

## 环境变量

| 变量名 | 说明 |
|--------|------|
| `ACCESS_PASSWORD` | 访问密码 |

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
GET    /api/cards/:id/download  # 下载
```

### 聊天记录

```
GET    /api/chats          # 列表
POST   /api/chats          # 导入
GET    /api/chats/:id      # 详情
PUT    /api/chats/:id      # 更新
DELETE /api/chats/:id      # 删除
GET    /api/chats/:id/export    # 导出
```

### 标签

```
GET    /api/tags           # 列表
PUT    /api/tags           # 删除标签
```

### 导出

```
POST   /api/export/batch   # 批量导出
POST   /api/export/all     # 全量备份
```

## 项目结构

```
character-card-vault/
├── wrangler.toml                      # Cloudflare 配置
├── functions/
│   ├── _middleware.js                  # CORS + 认证中间件
│   └── api/
│       ├── auth/
│       │   └── login.js               # 登录
│       ├── cards/
│       │   ├── index.js               # 列表/上传
│       │   ├── [id].js                # 详情/更新/删除
│       │   └── [id]/
│       │       ├── download.js        # 下载
│       │       └── thumb.js           # 缩略图
│       ├── chats/
│       │   ├── index.js               # 列表/导入
│       │   ├── [id].js                # 详情/更新/删除
│       │   └── [id]/
│       │       ├── messages.js        # 更新消息
│       │       └── export.js          # 导出
│       ├── tags/
│       │   └── index.js               # 标签管理
│       └── export/
│           ├── batch.js               # 批量导出
│           └── all.js                 # 全量备份
├── public/
│   └── index.html                     # 前端单页应用
├── opencode.json                      # OpenCode 配置
├── .gitignore
├── README.md
└── LICENSE                            # CC BY-NC-SA 4.0
```

## 许可证

[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)