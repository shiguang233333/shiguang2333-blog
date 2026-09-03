(function () {
  'use strict';

  var CATEGORIES = ['思考', '技术', '设计', '教程', '灵感', '生活随笔'];
  var API = '/api/open/posts';

  var els = {
    adminView: document.getElementById('admin-view'),
    listView: document.getElementById('list-view'),
    editView: document.getElementById('edit-view'),
    postTable: document.getElementById('post-table'),
    listEmpty: document.getElementById('list-empty'),
    listCount: document.getElementById('list-count'),
    statusFilter: document.getElementById('status-filter'),
    catFilter: document.getElementById('cat-filter'),
    newPostBtn: document.getElementById('new-post-btn'),

    editTitle: document.getElementById('edit-title'),
    postForm: document.getElementById('post-form'),
    backBtn: document.getElementById('back-btn'),
    categorySelect: document.getElementById('category-select'),
    saveDraftBtn: document.getElementById('save-draft-btn'),
    publishBtn: document.getElementById('publish-btn'),
    deleteBtn: document.getElementById('delete-btn'),
    deleteArea: document.getElementById('delete-area'),
    formMsg: document.getElementById('form-msg'),
    bodyInput: document.getElementById('body-input'),
    bodyPreview: document.getElementById('body-preview'),
    tagsInput: document.getElementById('tags-input'),
    inboxView: document.getElementById('inbox-view'),
    inboxTable: document.getElementById('inbox-table'),
    inboxEmpty: document.getElementById('inbox-empty'),
    inboxCount: document.getElementById('inbox-count'),
    inboxRefreshBtn: document.getElementById('inbox-refresh-btn'),
    inboxNavBtn: document.getElementById('inbox-nav-btn'),
    postsNavBtn: document.getElementById('posts-nav-btn'),
    exportBtn: document.getElementById('export-btn')
  };

  var state = {
    posts: [],
    editingId: null
  };

  var MarkDownTabs = function () {
    document.querySelectorAll('.md-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.md-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        if (tab.dataset.mode === 'preview') showPreview(); else showEditor();
      });
    });
  };

  function showPreview() {
    els.bodyInput.hidden = true;
    els.bodyPreview.hidden = false;
    fetch('/api/render?md=' + encodeURIComponent(els.bodyInput.value))
      .then(function (r) { return r.json(); })
      .then(function (d) { els.bodyPreview.innerHTML = d.html; });
  }
  function showEditor() {
    els.bodyInput.hidden = false;
    els.bodyPreview.hidden = true;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function fmtDate(d) {
    if (!d) return '—';
    return d.slice(0, 16);
  }

  // ==================== POSTS ====================
  function loadPosts() {
    var status = els.statusFilter.value;
    return fetch(API + '?status=' + status)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.posts = data.posts || [];
        renderTable();
      });
  }

  function filteredPosts() {
    var cat = els.catFilter.value;
    if (!cat) return state.posts;
    return state.posts.filter(function (p) { return p.category === cat; });
  }

  function renderTable() {
    var list = filteredPosts();
    els.listCount.textContent = list.length + ' 篇';
    els.listEmpty.hidden = list.length > 0;
    els.postTable.innerHTML = list.map(rowHtml).join('');
    bindRowActions();
  }

  function rowHtml(p) {
    var badge = p.status === 'published'
      ? '<span class="badge published">已发布</span>'
      : '<span class="badge draft">草稿</span>';
    var pubLabel = p.status === 'published' ? '转草稿' : '发布';
    return '<tr data-id="' + p.id + '">' +
      '<td class="post-title-cell"><span class="post-title">' + esc(p.title) + '</span>' +
        (p.tags ? '<div class="post-tagline">' + esc(p.tags) + '</div>' : '') + '</td>' +
      '<td>' + esc(p.category) + '</td>' +
      '<td>' + badge + '</td>' +
      '<td class="cell-date">' + fmtDate(p.published_at) + '</td>' +
      '<td><div class="row-actions">' +
        '<button data-action="edit" class="edit-btn">编辑</button>' +
        '<button data-action="publish" class="publish-toggle">' + pubLabel + '</button>' +
        '<button data-action="del" class="del">删除</button>' +
      '</div></td>' +
    '</tr>';
  }

  function bindRowActions() {
    els.postTable.querySelectorAll('tr[data-id]').forEach(function (tr) {
      tr.querySelectorAll('[data-action]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var id = Number(tr.dataset.id);
          var action = btn.dataset.action;
          if (action === 'edit') openEdit(id);
          else if (action === 'publish') togglePublish(id, tr);
          else if (action === 'del') doDelete(id);
        });
      });
    });
  }

  function togglePublish(id, tr) {
    var post = state.posts.find(function (p) { return p.id === id; });
    var next = post.status === 'published' ? 'draft' : 'published';
    fetch(API + '/' + id + '/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.error) { alert(d.error); return; }
        loadPosts();
      });
  }

  function doDelete(id) {
    if (!confirm('确定删除这篇文章？此操作不可撤销。')) return;
    fetch(API + '/' + id, { method: 'DELETE' })
      .then(function (r) { return r.json(); })
      .then(function () { loadPosts(); });
  }

  function newPost() {
    state.editingId = null;
    els.listView.hidden = true;
    els.editView.hidden = false;
    els.editTitle.textContent = '新建文章';
    els.deleteArea.hidden = true;
    els.postForm.reset();
    els.postForm.elements.status.value = 'draft';
    els.formMsg.textContent = '';
    showEditor();
  }

  function openEdit(id) {
    fetch(API + '/' + id)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var p = d.post;
        state.editingId = p.id;
        els.listView.hidden = true;
        els.editView.hidden = false;
        els.editTitle.textContent = '编辑文章';
        els.deleteArea.hidden = false;
        els.postForm.elements.title.value = p.title || '';
        els.postForm.elements.category.value = p.category || '思考';
        els.postForm.elements.image.value = p.image || '';
        els.postForm.elements.summary.value = p.summary || '';
        els.bodyInput.value = p.body || '';
        if (els.tagsInput) els.tagsInput.value = p.tags || '';
        els.postForm.elements.status.value = p.status || 'draft';
        els.formMsg.textContent = '';
        showEditor();
      });
  }

  function backToList() {
    els.editView.hidden = true;
    els.listView.hidden = false;
    loadPosts();
  }

  function collectForm() {
    var f = els.postForm.elements;
    return {
      title: f.title.value.trim(),
      category: f.category.value,
      image: f.image.value.trim(),
      summary: f.summary.value.trim(),
      body: els.bodyInput.value,
      tags: els.tagsInput ? els.tagsInput.value.trim() : ''
    };
  }

  function savePost(status) {
    var data = collectForm();
    if (!data.title) { alert('请填写标题'); return; }
    data.status = status;
    var url = API;
    var method = 'POST';
    if (state.editingId) { url += '/' + state.editingId; method = 'PUT'; }
    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.error) { alert(d.error); return; }
        els.formMsg.textContent = status === 'published' ? '已发布 ✓' : '已存为草稿 ✓';
        setTimeout(function () { els.formMsg.textContent = ''; }, 2500);
        backToList();
      });
  }

  function doDeleteCurrent() {
    if (!state.editingId) return;
    if (!confirm('确定删除这篇文章？')) return;
    fetch(API + '/' + state.editingId, { method: 'DELETE' })
      .then(function () { backToList(); });
  }

  // ==================== NAVIGATION ====================
  function showPosts() {
    els.inboxView.hidden = true;
    els.listView.hidden = false;
    els.editView.hidden = true;
    els.postsNavBtn.hidden = true;
    els.inboxNavBtn.hidden = false;
  }

  function showInbox() {
    els.inboxView.hidden = false;
    els.listView.hidden = true;
    els.editView.hidden = true;
    els.postsNavBtn.hidden = false;
    els.inboxNavBtn.hidden = true;
    loadMessages();
  }

  // ==================== EXPORT ====================
  function doExport() {
    els.exportBtn.disabled = true;
    els.exportBtn.textContent = '导出中...';
    fetch('/api/export')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok) {
          alert('导出成功！\n\n文章: ' + d.postsCount + ' 篇\n文件: ' + d.files.join(', '));
        } else {
          alert('导出失败: ' + (d.error || '未知错误'));
        }
      })
      .catch(function () {
        alert('导出失败，请检查服务是否运行');
      })
      .finally(function () {
        els.exportBtn.disabled = false;
        els.exportBtn.textContent = '导出数据';
      });
  }

  function loadMessages() {
    fetch('/api/open/messages')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var msgs = data.messages || [];
        els.inboxCount.textContent = msgs.length + ' 条';
        els.inboxEmpty.hidden = msgs.length > 0;
        els.inboxTable.innerHTML = msgs.map(function (m) {
          return '<tr data-id="' + m.id + '">' +
            '<td class="msg-cell">' + esc(m.content) + '</td>' +
            '<td class="cell-ip">' + esc(m.ip) + '</td>' +
            '<td class="cell-date">' + esc(m.created_at) + '</td>' +
            '<td><button data-action="delmsg" class="del">删除</button></td>' +
          '</tr>';
        }).join('');
        els.inboxTable.querySelectorAll('tr[data-id]').forEach(function (tr) {
          tr.querySelector('[data-action="delmsg"]').addEventListener('click', function () {
            if (!confirm('确定删除这条留言？')) return;
            fetch('/api/open/messages/' + tr.dataset.id, { method: 'DELETE' })
              .then(function (r) { return r.json(); })
              .then(function (d) {
                if (d.ok) loadMessages();
              });
          });
        });
      });
  }

  // ==================== INIT ====================
  function initCategories() {
    var opts = CATEGORIES.map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
    els.categorySelect.innerHTML = opts;
    els.catFilter.innerHTML = '<option value="">全部分类</option>' + opts;
  }

  function bindEvents() {
    els.newPostBtn.addEventListener('click', newPost);
    els.backBtn.addEventListener('click', backToList);
    els.deleteBtn.addEventListener('click', doDeleteCurrent);

    els.statusFilter.addEventListener('change', loadPosts);
    els.catFilter.addEventListener('change', renderTable);

    els.saveDraftBtn.addEventListener('click', function () { savePost('draft'); });
    els.publishBtn.addEventListener('click', function () { savePost('published'); });

    els.postForm.addEventListener('submit', function (e) { e.preventDefault(); });

    els.inboxNavBtn.addEventListener('click', showInbox);
    els.postsNavBtn.addEventListener('click', showPosts);
    if (els.inboxRefreshBtn) els.inboxRefreshBtn.addEventListener('click', loadMessages);

    els.exportBtn.addEventListener('click', doExport);
  }

  function init() {
    els.adminView.hidden = false;
    initCategories();
    bindEvents();
    MarkDownTabs();
    showPosts();
    loadPosts();
  }

  init();
})();
