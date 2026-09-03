const express = require('express');
const path = require('path');
const marked = require('marked');
const config = require('./config.json');
const db = require('./lib/db');
const app = express();
const ROOT = path.join(__dirname, '..');
const PORT = config.port || 3400;

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态资源（字体、图片、媒体）
app.use('/assets', express.static(path.join(ROOT, 'site', 'assets'), { maxAge: '1d' }));

// 站点静态文件（data目录等）
app.use('/data', express.static(path.join(ROOT, 'site', 'data'), { maxAge: '0' }));

// 根目录音频（bgm.flac 供首页音乐控件使用）
app.get('/bgm.flac', (req, res) => {
  res.sendFile(path.join(ROOT, 'site', 'bgm.flac'));
});

// 根目录图标（music-icon.jpeg 供首页音乐卡片使用）
app.get('/music-icon.jpeg', (req, res) => {
  res.sendFile(path.join(ROOT, 'site', 'music-icon.jpeg'));
});

// ---------------- 公开 API（博客前端） ----------------
app.get('/api/posts', (req, res) => {
  const status = req.query.status;
  const tag = req.query.tag;
  const sort = req.query.sort;
  const order = req.query.order;
  let tags = req.query.tags;
  if (tags && !Array.isArray(tags)) tags = [tags];
  const q = (req.query.q || '').trim();
  let posts = db.listPosts({
    status: status === 'draft' ? 'draft' : 'published',
    tag, tags, sort, order,
  });
  if (q) {
    const needle = q.toLowerCase();
    posts = posts.filter(function (p) {
      return [p.title, p.summary, p.category, p.tags, p.body]
        .filter(Boolean)
        .some(function (field) { return String(field).toLowerCase().indexOf(needle) !== -1; });
    });
  }
  res.json({ posts: posts.map(stripBody) });
});

app.get('/api/tags', (req, res) => {
  res.json({ tags: db.allTags() });
});

app.post('/api/messages', (req, res) => {
  const content = (req.body && req.body.content) || '';
  if (!content.trim()) return res.status(400).json({ error: '留言内容不能为空' });
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
  const message = db.createMessage(content, ip);
  res.status(201).json({ message });
});

app.get('/api/posts/:idOrSlug', (req, res) => {
  const post = db.getPost(req.params.idOrSlug);
  if (!post || post.status !== 'published') {
    return res.status(404).json({ error: '文章不存在' });
  }
  db.incrementViews(post.id);
  const updated = db.getPost(post.id);
  res.json({ post: updated });
});

app.get('/api/categories', (req, res) => {
  const sql = `SELECT category, COUNT(*) AS count
               FROM posts WHERE status = 'published'
               GROUP BY category ORDER BY count DESC`;
  res.json({ categories: db.db.prepare(sql).all() });
});

// ---------------- 免登录管理 API（无需认证） ----------------
app.get('/api/open/posts', (req, res) => {
  const status = req.query.status; // draft | published | all
  const includeAll = status === 'all' || !status;
  const posts = db.listPosts({ includeAll, status: status === 'all' ? null : status });
  res.json({ posts });
});

app.get('/api/open/posts/:idOrSlug', (req, res) => {
  const post = db.getPost(req.params.idOrSlug);
  if (!post) return res.status(404).json({ error: '文章不存在' });
  res.json({ post });
});

app.post('/api/open/posts', (req, res) => {
  const post = db.createPost(req.body || {});
  res.status(201).json({ post });
});

app.put('/api/open/posts/:id', (req, res) => {
  const post = db.updatePost(Number(req.params.id), req.body || {});
  if (!post) return res.status(404).json({ error: '文章不存在' });
  res.json({ post });
});

app.patch('/api/open/posts/:id/status', (req, res) => {
  const { status } = req.body || {};
  if (status !== 'draft' && status !== 'published') {
    return res.status(400).json({ error: '无效状态' });
  }
  const post = db.updatePost(Number(req.params.id), { status });
  if (!post) return res.status(404).json({ error: '文章不存在' });
  res.json({ post });
});

app.delete('/api/open/posts/:id', (req, res) => {
  const ok = db.deletePost(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: '文章不存在' });
  res.json({ ok: true });
});

// 免登录收信箱 API（留言无需认证；展示与删除走 open 路由）
app.get('/api/open/messages', (req, res) => {
  res.json({ messages: db.listMessages() });
});

app.delete('/api/open/messages/:id', (req, res) => {
  const ok = db.deleteMessage(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: '留言不存在' });
  res.json({ ok: true });
});

// ---------------- 导出静态数据 ----------------
app.get('/api/export', (req, res) => {
  const fs = require('fs');
  const siteDir = path.join(ROOT, 'site');
  const dataDir = path.join(siteDir, 'data');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 导出文章（只导出已发布的）
  const posts = db.listPosts({ status: 'published' });
  const postsData = { posts };
  fs.writeFileSync(path.join(dataDir, 'posts.json'), JSON.stringify(postsData, null, 2), 'utf8');

  res.json({
    ok: true,
    message: '静态数据已导出到 site/data/',
    files: ['posts.json'],
    postsCount: posts.length
  });
});

// ---------------- Markdown 渲染（后端） ----------------
marked.setOptions({ breaks: true, gfm: true });

app.get('/api/render', (req, res) => {
  const md = String(req.query.md || '');
  const html = marked.parse(md);
  res.json({ html });
});

// ---------------- 页面 ----------------
app.get('/', (req, res) => {
  res.sendFile(path.join(ROOT, 'site', 'index.html'));
});

// 支持 post.html?slug=xxx 格式
app.get('/post.html', (req, res) => {
  res.sendFile(path.join(ROOT, 'site', 'post.html'));
});

app.get('/post/:slug', (req, res) => {
  const post = db.getPost(req.params.slug);
  if (!post || post.status !== 'published') {
    return res.status(404).send('文章不存在');
  }
  res.sendFile(path.join(ROOT, 'site', 'post.html'));
});

// 标签聚合页面
app.get('/tags', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(ROOT, 'site', 'tags.html'));
});
app.get('/tags.html', (req, res) => {
  res.sendFile(path.join(ROOT, 'site', 'tags.html'));
});

// 友链页面
app.get('/links', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(ROOT, 'site', 'links.html'));
});
app.get('/links.html', (req, res) => {
  res.sendFile(path.join(ROOT, 'site', 'links.html'));
});

// 关于我页面
app.get('/about', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(ROOT, 'site', 'about.html'));
});
app.get('/about.html', (req, res) => {
  res.sendFile(path.join(ROOT, 'site', 'about.html'));
});

// 免登录后台管理页面（无需登录，直接访问即进入后台）
app.get('/admin-open', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(ROOT, 'admin', 'public', 'admin-open.html'));
});
app.use('/admin/static', express.static(path.join(ROOT, 'admin', 'public'), { etag: false, maxAge: 0, setHeaders: (res) => res.setHeader('Cache-Control', 'no-store') }));

app.listen(PORT, () => {
  console.log(`时光博客服务已启动: http://localhost:${PORT}`);
  console.log(`后台管理: http://localhost:${PORT}/admin-open`);
});

function stripBody(post) {
  const { body, ...rest } = post;
  let preview = '';
  if (body) {
    preview = body
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_`~\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (preview.length > 320) preview = preview.slice(0, 320) + '…';
  }
  return { ...rest, preview };
}

module.exports = app;
