# framer-blog-clone · 克隆笔记

## 源信息
- 原站 URL: https://www.framer.com/blog/
- 源码仓库: 无公开源码（Framer 商业站，Framer 平台生成）
- 原作者: Framer B.V.
- 许可证: 商业站，无 LICENSE。仅本地学习/复刻，未经许可不得公开重新部署。
- 致谢要求: 署名原作者 Framer

## 技术栈
- 框架 / 关键库: Framer Sites 静态产物（无前端框架检测，无 React/Next/Three/GSAP/Lenis）
- 字体: Geist / EB Garamond（衬线正文）/ Inter Tight / Mona Sans / Space Grotesk / JetBrains Mono / VT323 等，均为 @font-face 自托管
- 追踪脚本（原站 head 内，已移除）: gtag / GTM / DebugBear / Dub Analytics / PromptWatch / events.framer.com / HubSpot / OpenAI SDK / Google Sign-in

## 复刻前预判
- 复杂度等级: L2（静态内容型博客/营销页，无重型 JS 交互）
- 推荐模式: 忠实复刻
- 可高保真的部分: 首页布局（hero + 筛选 + 精选文章 + 最新动态 + 客户故事 + CTA + 页脚）、字体、配色、图片素材
- 需要近似或替代的部分: 大量正文链接指向真实文章（原站 CMS 内容）— 本克隆为单页静态复刻，卡片为占位链接
- 不克隆的部分: 登录/注册、CMS 动态列表、AI Agent 交互、第三方登录、真实文章内容页
- 主要风险: 商业品牌/版权内容，不可公开部署

## 跑起来
项目已从纯静态改为 **Node.js(Express) + SQLite 后端**，需通过后端启动（不再用 `python3 -m http.server`）：
```bash
npm install        # 首次
npm start          # 启动后端：http://localhost:3400
# 前台博客: http://localhost:3400/
# 管理后台: http://localhost:3400/admin-open  （免登录后台）
# 改完文章后重新导出静态数据，再部署 site/:
./update.sh
```

## 后端（当前）
- **技术栈**：Express 4 + better-sqlite3 + marked，无构建步骤，入口 `admin/server.js`
- **数据库**：`data/blog.db`（SQLite，WAL），`posts` 表：title/slug/body(Markdown)/summary/category/tags/status(draft|published)/views/image/published_at；`messages` 表存留言
- **API（公开/免登录）**：`/api/posts`、`/api/posts/:idOrSlug`、`/api/categories`、`/api/tags`、`/api/render(Markdown)`、`/api/messages`；管理走 `/api/open/posts`、`/api/open/messages`（免登录，无鉴权）；`/api/export` 导出静态数据
- **页面**：前台 `/`、`/post.html`、`/tags`、`/links`、`/about`；管理后台 `/admin-open`
- **前端**：`site/*.html` 读取 `site/data/posts.json`（由 `update.sh`→`/api/export` 导出已发布文章成静态 JSON）。**友链为纯静态**，直接在 `site/links.html` 内手写 `<a class="link-card">`，不依赖任何导出/JS。
- **废弃**：旧登录版后台 `/admin`（含 `admin.html`/`admin.js`、`/api/admin/*`、`/api/login|logout|me`、`lib/auth.js`、`links` 表）已彻底移除，改用免登录后台 `/admin-open`。

## 改了什么（对照原版）
- 重建为单文件静态 `framer-blog-clone.html`，不依赖原站运行时脚本
- 字体改为本地自托管：`assets/fonts/fonts.css`
- 图片/媒体落地到 `assets/images`、`assets/media`，按 `RECON/asset-manifest.json` 路径引用
- 移除全部第三方追踪/分析脚本
- 文案翻译为简体中文，作为占位（原站为英文）
- 色彩直接照抄 recon `palette` 与 `cssVariables`：深色主题 `#000` 底、白字、`--accent #cbff00`、surface 层级 `#141414/#1d1d1d/#242424/#303030`

## 原站 vs 克隆站
| 模块 | 原站表现 | 克隆实现 | 差异 / 取舍 | 证据 |
|---|---|---|---|---|
| 首屏 | hero 大标题 News, stories, and resources | 中文大标题「新闻、故事与资源」，EB Garamond 衬线 | 文案中文替换 | recon h1 |
| 导航 | sticky nav 64px，Framer logo + 产品链接 | sticky nav，logo + 中文链接 | 近似 | recon nav rect |
| 筛选栏 | All/Product/Company/Engineering/Tutorials/Inspiration/Resources | 中文筛选按钮，可点击切换高亮 | 交互简化（无真实过滤） | recon buttons |
| 精选文章 | 1 large + 2 + 4 secondary 网格 | 同构网格 | 文章标题中文替换 | recon headings |
| 最新动态 | 6 列 update 卡片 | 同构 6 卡片 | 内容为原站更新标题 | recon |
| 客户故事 | 8 家公司卡片 | 3 家卡片（Miro/Perplexity/Legora） | 精简为 3 张 | recon images |
| CTA | Your next idea starts here | 中文 CTA | 文案替换 | recon |
| 页脚 | 多列深色 footer | 6 列中文 footer | 结构保留 | recon footer |
| 移动端 | 单列堆叠 | 媒体查询 1024/640 断点堆叠 | 近似 | — |

## 复刻评分
- 源证据: 4/5（recon JSON 全量；无真源码，靠运行时侦察）
- 结构保真: 4/5
- 视觉保真: 4/5（配色/字体/图片照抄）
- 动效/交互: 3/5（导航 hover、筛选高亮；原站卡顿过渡未完全还原）
- 响应式: 4/5
- 功能完整: 2/5（静态单页，无 CMS/登录/文章）
- 内容替换: 4/5（中文占位）
- 法务/部署风险: 2/5（商业品牌，不可公开部署）
- 总评: 结构+视觉良好，动效与功能为静态近似

## 个人博客改造（用户需求：保持风格，改为个人博客）
仅替换**内容语义**，保留原站的整个视觉系统（`:root` CSS 变量、配色、Geist/EB Garamond/JetBrains Mono 字体、`assets/fonts/fonts.css`、布局骨架、`data-od-id` 与可用本地图片）。改动对照：
- 站点身份: `Framer` 品牌 → 个人作者「林墨」；标题 `Framer Blog Clone` → `林墨 · 个人博客`
- 导航: 平台/解决方案/资源/企业/定价 → 关于/精选/标签/生活随笔/订阅；登录/免费注册 → 关于我/订阅
- Hero: 大标题「新闻、故事与资源」→「记录思考，也记录生活」，并新增 `hero-sub` 个人简介段
- 筛选栏: 产品/公司/工程/... → 思考/技术/设计/教程/灵感/生活随笔
- 精选文章 & 4 张次级卡片: 全部改为个人文章标题（写作、设计系统、个人网站收藏、博客主题、排版、生活随笔、旅行），作者统一为「林墨」
- 最新动态: 产品更新（Agents/着色器/API）→ 个人近况（读完某书、配色改版、加 RSS、阅读清单等）
- 客户故事 → 「系列专栏」: Miro/Perplexity/Legora → 阅读笔记/周末手作/在路上（复用原位置图片）
- CTA: 「你的下一个创意」+ 免费开始 → Newsletter 订阅（`hero-sub` 风格化说明 + `subscribe` 邮箱表单，提交后内联显示成功提示 `subscribe-msg`）
- 页脚: 产品/资源/公司/社区/法律/社交 → 文章分类/资源/关注我/最近更新/许可/一句话；版权改为 `© 2026 林墨 · 用爱发电`
- 新增 CSS: `.hero-sub`、`.cta-sub`、`.subscribe/.subscribe-input`、`.subscribe-msg`；hero 副标题下移间距由 `40px→24px` 以容纳简介
- 未改动: 深色配色变量、字体加载、图片路径、响应式断点、视觉密度
- 验证: 用 Python 标准库 HTMLParser 解析，无未闭合/错配标签；`input` 为自闭合 void 元素，不计入配对

## 修复记录
- footer 结构：`framer-blog-clone.html` 的 `.footer-inner` 内原多了一个游离 `</div>` 且 `.footer-bottom` 未闭合；已修复为 `.footer-inner > [.footer-grid + .footer-bottom]`，`footer-bottom` 补齐版权 `© 2026 时光 · 兴趣使然的小站` 与 `.footer-bottom-links`（标签/友链/管理）。经 HTMLParser 校验无未闭合/错配标签。

## 样式修改
- 文章分类按钮（`#blog-filters`）：改为 Uiverse（gharsh11032000）的「悬停渐变上翻」风格——按钮 `position:relative + overflow:hidden`，内部 `.filter-fill`（`linear-gradient(135deg,#7b4397,#dc2430)`）默认 `translateY(100%)`，hover/active 时上滑铺满；文字放 `.filter-label`（z-index 高于填充层）。适配说明：因分类名由 JS 动态渲染，无法用原按钮 `::before/::after` 硬编码文本，改用真实子元素复现同款上翻效果；按钮尺寸由原 150×60 调为 `min-width:96px;height:48px` 以适配 7 个分类并满足 44px 触控目标；`scale:0.95` 保留按压反馈。
- 后来为未选中按钮底部加了 3px 紫红渐变条（`.filter-btn::after`，`z-index:0`，低于 `.filter-fill` 的 `z-index:1`）作为衔接起点，hover/选中时填充层上滑自然覆盖；并将按钮底色由 `transparent` 改为 `var(--surface-3)`（深灰 #242424）形成深色发灰的底。

## 发送留言按钮（Uiverse mahiatlinux）
- footer「发送留言」按钮由 `btn-cta` 替换为 Uiverse `mahiatlinux` 的 SendMeMessage 组件，作用域收拢到 `.send-btn`（含 `.outline` / `.state--default` / `.state--sent` / `.icon` 等子元素），避免与页面其它类名冲突。
- 保留 `type="submit"` 与现有 `#message-form` 提交逻辑；原组件用 `:focus` 切换「已发送」勾选态，与表单提交后保留焦点一致。
- 文字替换：默认态「SendMessage」→「发送留言」（4 字，`--i:0..3`），发送态「Sent」→「已发送」（3 字，`--i:5..7`）；逐字 `slideDown/wave/disapear` 动画保留。SVG 纸飞机/勾选图标与 `filter id="send-shadow"` 原样保留（id 唯一，无冲突）。
- 动画关键帧重命名为 `send-*` 前缀避免全局冲突；`@media` 无改动。
- 验证：HTMLParser 无未闭合/错配标签，svg(4/4)、filter/defs(1/1)、CSS 花括号 164/164 平衡。

## 留言输入框（Uiverse 0xnihilism，最终版）
- 留言输入框**完全替换**为此 neo-brutalist 终端风组件，不再保留 Alaner-xs 旧样式的任何特性（textarea → 单行 `<input>`，旧 `#383838/厚顶边/老轮廓` 全部移除）。
- 结构：`<div class="input-container">` 包裹 `<input class="input" id="message-content" type="text" placeholder="写下你的留言…">`（`.input`/`.input-container` 为页面内唯一，无类名冲突）。
- 视觉（已按用户要求反转颜色）：默认=暗色 `#010101` 底/白字/**灰边 `border:4px solid #242424`/灰硬阴影 `box-shadow:8px 8px 0 #242424`**（与上方分类按钮底色 `--surface-3` 一致）；hover 上移 `translate(-4px,-4px)` 且阴影变 `12px 12px 0 #242424`；focus 反相为白底 `#fff`/黑字 `#000`/黑边，等宽 `'Courier New'`。多行输入能力已放弃（按用户要求完全替换为单行 input）。
- 后续调整：
  - 新增 `.message-card` 模块卡片把留言输入框+发送按钮框在一起（`max-width:310px`、`padding:20px`、`background:var(--surface-2)`、`border:1px solid var(--border)`、`border-radius:14px`、柔和阴影），内部 `gap:18px`；`.footer-message-form` 的 `gap` 归 0。
  - 发送按钮缩小：`min-width:200→150px`、`height:68→52px`、`padding:20→14px`、`font-size:18→15px`。
  - 去掉输入后的持续 `glitch` 抖动动画（`input:not(:placeholder-shown)` 不再闪/抖，仅保留加粗+字距），删除无用 `input-glitch` keyframes；闪烁终端光标改为仅在 `:focus-within` 时显示并闪动（默认 `opacity:0`），避免一直闪烁。
  - 最后应用户要求彻底移除右侧的闪烁竖线光标（删除 `.input-container::after` 光标与 `input-blink` keyframes，输入框聚焦后不再显示 `|`）。
- 动画：focus 时 `shake` 抖动 0.5s；有内容（`:not(:placeholder-shown)`）时持续 `glitch` 故障抖动 + 加粗/字距。
- 修正原 bug：input 无法渲染 `::after`，闪烁终端光标改放 `.input-container::after`（`:focus-within` 时变白）；`typing` 宽度动画会在真实 input 上产生异常故删除；`.input:focus + .input-container::after` 的 `+` 兄弟选择器无法匹配父级，弃用。
- 验证：HTMLParser 无未闭合/错配标签，CSS 花括号 191/191 平衡，旧 `.message-input` 已彻底移除。

## 回到顶部按钮（Uiverse vinodjangid07）
- 新增 `.back-to-top` 圆形按钮，`position:fixed; bottom:24px; right:24px; z-index:999`，点击平滑滚动到顶部（`window.scrollTo({behavior:'smooth'})`）。
- 基本沿用原件（50px 圆形、深色底 `rgb(20,20,20)`、上下箭头 SVG、hover 展开至 140px 圆角胶囊 + 图标上移 + 显示文字）。
- 彩色部分改为分类栏同款红紫渐变 `linear-gradient(135deg,#7b4397,#dc2430)`（hover 背景），外圈光晕由紫色调为红紫 `rgba(175,89,193,0.28)`；文案改「回到顶部」。
- AT 语义：`aria-label="回到顶部"`、`data-od-id="back-to-top"`。
- 显示逻辑（应要求改为「向上滑动才显示」）：默认 `opacity:0; visibility:hidden; pointer-events:none` 隐藏；`scroll` 事件记录上一次滚动位置 `backToTopLastY`，仅当 `scrollY>=200` 且 `scrollY < lastY`（即向上滚动、非页面顶部）时加 `.show` 显示，向下滚动或回到顶部附近(`scrollY<200`)时隐藏。监听器 `{passive:true}`。
- 验证：HTMLParser 无未闭合/错配标签，CSS 花括号 183/183 平衡。

## 音乐卡片 = 播放控制（Uiverse JohnnyCSilva，取代原 m1her 按钮控件）
- 应要求**移除**了原 `.music-control`（Play/Pause/Reset 单选按钮）整套 HTML/CSS/JS（含对应的 `640px` 响应式样式与 JS 单选监听），改为**点击卡片本身控制播放**。
- 卡片在 `.nav-right` 内、搜索框左侧，作用域全部收拢到 `.music-card`，避免 `.card/.img/.h1/.p/.span/.textBox` 污染全局。
- 样式：大标题 `Туманность Андромеды`、小标题 `небо над головой`；无时间戳。图标用 `music-icon.jpeg`（`background:center/cover`，存项目根目录）。
- **播放/暂停逻辑**（末段 script）：
  - 点击 `.music-card .card`：`bgmAudio.paused ? play() : pause()`（`play()` 带 `.catch` 兜底）。
  - 用 `audio` 的 `play`/`pause` 事件驱动 `.playing` 类：播放加 `playing`，暂停移除。**默认不播放**（无 `checked`/自动播放）→ 初始无 `playing`。
- **文字完整显示**：去掉 `.h1/.p` 的 `white-space:nowrap overflow:hidden text-overflow:ellipsis`，`.card` 去掉 `overflow:hidden`，`max-width` 提到 260px，保证标题/副标题不被截断。
- **红紫渐变窄边框**：`hover` 或 `.playing` 时通过 `.card::before`（`padding:1px` + `-webkit-mask/mask-composite:exclude`）渲染 1px 圆角渐变边框 `linear-gradient(135deg,#7b4397,#dc2430)`（`border-image` 不认 border-radius，故用遮罩方案），`pointer-events:none` 不挡点击；始终 `scale(1.05)`。
- 服务端 `server.js` 根目录静态资源路由：`GET /bgm.flac`、`GET /music-icon.jpeg`。
- 响应式：`max-width:640px` 下隐藏 `.music-card .textBox` 并把卡片缩为图标宽度（44px），避免导航横向溢出。
- 验证：HTMLParser 无未闭合/错配标签，CSS 花括号 195/195 平衡。

## 文章卡片 = 三维倾斜卡片（Uiverse kennyotsu，未悬停灰底 / 悬停红紫渐变边框）
- 在**不改变数据流逻辑**的前提下改写文章卡片样式（`renderUpdates()` 仍 fetch `/api/posts` → 过滤 → 时间倒序 → 逐篇渲染 slug/图/日期/分类/标题/摘要）。
- 每张卡片外层改为 `.update-tilt.noselect`（约 340px 高的定位容器），内放 `.tilt-canvas`（5×5 网格 + `perspective` 的 25 个 `.tracker` 覆盖层）与 `<a class="update-card tilt-face">`（原文章卡面，绝对定位铺满）。
- JS 模板新增 25 个 `.tracker.tr-1..tr-25`（循环生成），hover 任一格子 → 卡片按行列 3D 倾斜（见 `.update-tilt .tr-N:hover ~ .tilt-face`，顶部→底部 rotateX +20→-20，左→右 rotateY -10→10，各 125ms）。
- **配色**：未悬停 = 灰底 `var(--surface-2)` + 细边框 `var(--border)`；悬停 = `::before`（1px padding + mask-composite）渲染红紫渐变窄边框 `linear-gradient(135deg,#7b4397,#dc2430)` + 轻微 lighten + 紫红光晕。文字色不变（`--fg`/`--muted`，对比不降）。
- 图 `.update-img` 固定高 170px `object-fit:cover`，`.update-body` flex 撑满；`.update-meta/.update-tag/.update-title/.update-preview` 保留原样式（预览仍 2 行截断）。
- 响应式：`≤640px` 网格改单列（`.updates-grid{grid-template-columns:1fr}`），无线滚动。
- 3D 倾斜逻辑修复（核心坑）：`perspective` 必须放在卡片的**共同祖先** `.update-tilt` 上才会作用于 `.tilt-face`（`perspective` 只影响后代）。此前误放在 `.tilt-canvas`（它是卡片的兄弟，不是祖先），导致卡片 tilt 是“无透视的平面斜切”，没有真实 3D 深度。
- 高度自适应：去掉 `.update-tilt` 固定高与 `.update-img` 固定高，卡片由内容驱动高度；`.tilt-canvas` 改为绝对定位铺满覆盖卡片、`z-index:200` 透明网格捕获悬停；25 条 hover 规则改为 `.tilt-canvas:has(.tr-N:hover) ~ .tilt-face`（tracker 在 canvas 内、卡片是兄弟，故用 `:has` 穿透）。
- 反馈速度：`.tilt-face` 过渡从统一 700ms 拆成 `transform 120ms ease-out`（贴合原 Uiverse 的手感）+ `filter/box-shadow 300ms`（辉光柔和）。
- 倾斜角度缩小：rotateX ±12/±6，rotateY ±6/±3；悬停辉光 `0 0 22px rgba(175,89,193,.35)` + 内红晕。
- 验证：HTMLParser 无未闭合/错配标签，CSS 花括号 226/226 平衡，`perspective` 全局唯一，25 条 `:has` 规则齐全，渲染成功。

## 替换地图（要换什么改哪）
- 文字 -> `framer-blog-clone.html` 的卡片标题/正文（数据 embedding 在 HTML 中）
- 图片/媒体 -> `assets/images/framerusercontent.com/`、`assets/media/`
- 配色 -> `framer-blog-clone.html` 的 `:root` CSS 变量
- 3D 模型 / 字体 -> `assets/fonts/fonts.css`

## 验证
- [x] 本地跑通、console 0 error（静态无脚本运行时错误，仅筛选按钮内联 JS）
- [ ] 截图对照原站（RECON/screenshots/）— 本模型无法读取图片，未做像素级对照
- 验证不了的点（如实记，别伪造）: 未能查看截图做像素级 diff；原站平滑滚动/进场动画未完全还原；真实文章内容页未克隆
