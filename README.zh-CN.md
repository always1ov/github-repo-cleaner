# Repo Cleaner

面向海外、英文优先的 **免费 GitHub 仓库整理小工具**，提供完整中文网站与工作台。
没有注册、订阅、支付、广告或功能付费墙，原有整理功能全部保留。

[![一键部署到 Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Falways1ov%2Fgithub-repo-cleaner%2Ftree%2Ffree-tool)

[English](README.md) · [新版分支 free-tool](https://github.com/always1ov/github-repo-cleaner/tree/free-tool) · [安全模型](SECURITY.md)

## 点击按钮部署

上方按钮明确指向 **`free-tool` 分支**，不会误用原作者的 `master`。
点击后登录 Cloudflare，按提示授权 GitHub，确认新仓库名称和 Worker 名称，再点击 **Deploy**。
“一键”指直接进入预填了代码来源的部署流程，仍需你本人登录、授权并确认发布。

**官方按钮会创建一份新的 GitHub 仓库副本**，并让 Workers Builds 跟踪该副本的生产分支。
以后修改原仓库不会自动同步到副本。要持续部署当前仓库，请在 Cloudflare 的
Workers & Pages → 创建应用中连接本仓库，选择生产分支 **`free-tool`**。

| 配置 | 值 |
| --- | --- |
| 框架 | None / 静态站点 |
| 根目录 | 仓库根目录 |
| 构建命令 | `npm run build` |
| 部署命令 | `npm run deploy` |
| 静态目录 | `dist/`，已写入 `wrangler.jsonc` |
| Node.js | 22 或更高 |
| 必填应用密钥 | 无 |

这里使用 **Workers Static Assets**，只是托管静态网页，不增加 Worker 业务脚本、数据库、
OAuth 后端、KV 或 R2。Cloudflare 官方部署按钮支持 Workers，不支持 Pages。
**不要把清理工具用的 GitHub Token 填进部署环境变量或源码。** 它由使用者在自己浏览器里
输入，与网站部署授权是两回事。

构建不需要安装依赖；部署时通过 `npx` 使用 Wrangler 4。路由、404 页面和 `workers.dev`
访问地址已在配置中处理。

## 可选：域名与搜索收录配置

不填 `SITE_URL` 也能部署和使用。拿到真实访问地址后，可在 Cloudflare 的**构建环境变量**
中设置 `SITE_URL` 为实际的 HTTPS 地址，再重新构建，以启用 canonical、语言替代地址和
站点地图。不设置时不输出这些依赖绝对地址的标签，不会错误指向原仓库的 GitHub Pages。

自定义域名仍需要在 Cloudflare 中绑定；设置 `SITE_URL` 不会购买或绑定域名。
不需要任何应用密钥。

官方参考：[部署按钮](https://developers.cloudflare.com/workers/platform/deploy-buttons/)、
[静态资源部署](https://developers.cloudflare.com/workers/static-assets/get-started/)、
[构建配置](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)。

## 包含内容

中英文首页、指南、安全、隐私与使用说明；浅色墨绿色视觉与明暗工作台；免授权演示；
旧 Fork、长期未更新、已归档快捷筛选；原有仓库和软件包操作、导出、Git 备份脚本与执行报告。
删除前仍需检查影响清单并明确确认，所有功能免费。

## 本地开发与测试

需要 Node.js 22+。静态构建和单元测试不需要安装依赖。

```sh
npm run dev           # 构建一次并启动 http://127.0.0.1:4173
npm run build         # 修改后重新构建，输出 dist/
npm run preview       # 预览已有构建
npm test              # 构建、逻辑、安全和网站测试
npm run test:browser  # 安装可选浏览器测试依赖并运行
npm run deploy:check  # Cloudflare 部署演练，不发布
npm run deploy        # Cloudflare 授权后构建并发布
```

CI 覆盖逻辑与安全测试、Chromium 浏览器测试及 Cloudflare dry run。
浏览器测试只使用演示数据或模拟 API，不执行真实删除。
此分支的 GitHub Pages 发布改为**仅手动触发**，避免复制模板后意外发布。

## 目录说明

**发布 `dist/`，不要发布仓库根目录。** 根目录 `index.html` 保留原始单文件引擎；`site/`
包含网站与经过锚点校验的整合代码，`test/` 测试实际生成的工作台，`wrangler.jsonc`
负责 Cloudflare 静态部署。锚点不匹配时构建会失败，不会静默跳过改动。

`dist/`、`.wrangler/`、依赖、本地密钥和测试截图都不提交到 Git。
生成的 `dist/app/index.html` 仍可保存到本地打开：界面和演示可离线，真实操作需要联网。

## 安全提醒

优先使用短期、限定仓库范围的 Token。Administration 写权限属于高权限，不是普通登录。
Token 从浏览器直接发给 GitHub，不经过应用后端，不保存到本地存储或 URL；
本地仅保存显示偏好。托管平台可能保留普通访问与安全日志。

本工具不提供撤销。生成 Git 镜像脚本不代表备份已经运行或验证，也不是 Issues、发布附件、
设置、软件包、LFS 和 Wiki 的完整备份。不确定时请归档。详见 [SECURITY.md](SECURITY.md)。

采用 [MIT](LICENSE) 许可证，与 GitHub 无隶属或背书关系。
