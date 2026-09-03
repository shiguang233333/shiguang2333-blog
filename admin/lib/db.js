const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'blog.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    body TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '思考',
    tags TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',      -- draft | published
    image TEXT NOT NULL DEFAULT '',
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    ip TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
  CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
`);

// 迁移：为旧库补充 tags 列与 messages 表
try {
  const hasTags = db.prepare("PRAGMA table_info(posts)").all().some((c) => c.name === 'tags');
  if (!hasTags) {
    db.exec("ALTER TABLE posts ADD COLUMN tags TEXT NOT NULL DEFAULT ''");
  }
} catch (e) { /* 忽略 */ }

try {
  const hasViews = db.prepare("PRAGMA table_info(posts)").all().some((c) => c.name === 'views');
  if (!hasViews) {
    db.exec("ALTER TABLE posts ADD COLUMN views INTEGER NOT NULL DEFAULT 0");
  }
} catch (e) { /* 忽略 */ }

// 迁移：移除已废弃的 is_featured（精选）字段与索引
try {
  const cols = db.prepare("PRAGMA table_info(posts)").all().map((c) => c.name);
  if (cols.indexOf('is_featured') !== -1) {
    db.exec("ALTER TABLE posts DROP COLUMN is_featured");
  }
} catch (e) { /* 忽略 */ }
try {
  db.exec("DROP INDEX IF EXISTS idx_posts_featured");
} catch (e) { /* 忽略 */ }

function now() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).replace('T', ' ');
}

function listPosts(options = {}) {
  const { status, includeAll = false, tag, tags, sort, order } = options;

  let sql = 'SELECT * FROM posts';
  const params = [];
  const where = [];

  if (!includeAll) {
    if (status) {
      where.push('status = ?');
      params.push(status);
    } else {
      where.push("status = 'published'");
    }
  } else if (status) {
    where.push('status = ?');
    params.push(status);
  }

  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY published_at IS NULL ASC, published_at DESC, created_at DESC';

  let rows = db.prepare(sql).all(...params);

  // 标签过滤（支持多选：任一匹配即可，或全部匹配按 mode 决定）
  const allTagsList = tags && tags.length ? tags : (tag ? [tag] : null);
  if (allTagsList) {
    rows = rows.filter(function (p) {
      const postTags = (p.tags || '')
        .split(',')
        .map(function (t) { return t.trim(); })
        .filter(Boolean);
      return allTagsList.some(function (t) { return postTags.indexOf(t) !== -1; });
    });
  }

  // 排序：time 按发布时间/创建时间，name 按标题，views 按浏览量
  const dir = order === 'asc' ? 1 : -1;
  const sortKey =
    sort === 'name' ? 'title' :
    sort === 'views' ? 'views' :
    'time';

  rows.sort(function (a, b) {
    let r;
    if (sortKey === 'title') {
      r = String(a.title).localeCompare(String(b.title), 'zh-Hans-CN');
    } else if (sortKey === 'views') {
      r = (a.views || 0) - (b.views || 0);
    } else {
      const at = a.published_at || a.created_at;
      const bt = b.published_at || b.created_at;
      r = String(at).localeCompare(String(bt));
    }
    return r * dir;
  });

  return rows.map(serializePost);
}

function incrementViews(id) {
  db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(id);
}

function getPost(idOrSlug) {
  const row =
    db.prepare('SELECT * FROM posts WHERE id = ?').get(idOrSlug) ||
    db.prepare('SELECT * FROM posts WHERE slug = ?').get(idOrSlug);
  return row ? serializePost(row) : null;
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map(function (t) { return String(t).trim(); }).filter(Boolean).join(',');
  }
  return String(tags || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean).join(',');
}

function createPost(data) {
  const slug = slugify(data.slug || data.title);
  const info = db
    .prepare(
      `INSERT INTO posts (title, slug, body, summary, category, tags, status, image, views, published_at, created_at, updated_at)
       VALUES (@title, @slug, @body, @summary, @category, @tags, @status, @image, @views, @published_at, @created_at, @updated_at)`
    )
    .run({
      title: data.title || '',
      slug,
      body: data.body || '',
      summary: data.summary || '',
      category: data.category || '思考',
      tags: normalizeTags(data.tags),
      status: data.status === 'published' ? 'published' : 'draft',
      image: data.image || '',
      views: Number(data.views) || 0,
      published_at: data.status === 'published' ? now() : null,
      created_at: now(),
      updated_at: now(),
    });
  return getPost(info.lastInsertRowid);
}

function updatePost(id, data) {
  const existing = getPost(id);
  if (!existing) return null;

  const nextStatus = data.status === 'published' ? 'published' : 'draft';
  const wasPublished = existing.status === 'published';
  let publishedAt = existing.published_at;
  if (nextStatus === 'published' && !wasPublished) {
    publishedAt = now();
  }

  const slug = slugify(data.slug || data.title, existing.id);

  db.prepare(
    `UPDATE posts SET
       title = @title,
       slug = @slug,
       body = @body,
       summary = @summary,
       category = @category,
       tags = @tags,
       status = @status,
       image = @image,
       views = @views,
       published_at = @published_at,
       updated_at = @updated_at
     WHERE id = @id`
  ).run({
    id,
    title: data.title !== undefined ? data.title : existing.title,
    slug,
    body: data.body !== undefined ? data.body : existing.body,
    summary: data.summary !== undefined ? data.summary : existing.summary,
    category: data.category !== undefined ? data.category : existing.category,
    tags: normalizeTags(data.tags !== undefined ? data.tags : existing.tags),
    status: nextStatus,
    image: data.image !== undefined ? data.image : existing.image,
    views: data.views !== undefined ? Number(data.views) || 0 : (existing.views || 0),
    published_at: publishedAt,
    updated_at: now(),
  });
  return getPost(id);
}

function deletePost(id) {
  return db.prepare('DELETE FROM posts WHERE id = ?').run(id).changes > 0;
}

function slugify(input, excludeId) {
  let base = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!base) base = 'post';
  let slug = base;
  let n = 0;
  while (true) {
    const exists = db.prepare('SELECT id FROM posts WHERE slug = ?').get(slug);
    if (!exists || (excludeId && exists.id === excludeId)) break;
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

function serializePost(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    body: row.body,
    summary: row.summary,
    category: row.category,
    tags: row.tags || '',
    status: row.status,
    image: row.image,
    views: row.views || 0,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function allTags() {
  const rows = db.prepare("SELECT tags FROM posts WHERE status = 'published' AND tags != ''").all();
  const counts = {};
  rows.forEach(function (r) {
    (r.tags || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean).forEach(function (t) {
      counts[t] = (counts[t] || 0) + 1;
    });
  });
  return Object.keys(counts)
    .sort(function (a, b) { return counts[b] - counts[a]; })
    .map(function (name) { return { name: name, count: counts[name] }; });
}

function listMessages() {
  return db
    .prepare('SELECT * FROM messages ORDER BY id DESC')
    .all()
    .map(function (m) {
      return { id: m.id, content: m.content, ip: m.ip, created_at: m.created_at };
    });
}

function createMessage(content, ip) {
  const info = db
    .prepare('INSERT INTO messages (content, ip, created_at) VALUES (?, ?, ?)')
    .run(String(content || '').trim(), String(ip || ''), now());
  const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
  return { id: row.id, content: row.content, ip: row.ip, created_at: row.created_at };
}

function deleteMessage(id) {
  return db.prepare('DELETE FROM messages WHERE id = ?').run(id).changes > 0;
}

module.exports = {
  db,
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  incrementViews,
  allTags,
  listMessages,
  createMessage,
  deleteMessage,
  now,
};
