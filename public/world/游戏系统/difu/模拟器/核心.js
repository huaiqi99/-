// ==================== 归终殿 · 核心模块 ====================
// 所有页面共用：存储、主题、角色切换、侧边栏、通用工具

const GZD = {
  version: '1.0.0',

  // ---------- 通用工具 ----------
  Utils: {
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },
    formatDate(ts) {
      const d = new Date(ts);
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    },
    clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
  },

  // ---------- 存储管理 ----------
  Storage: {
    _keyPrefix: 'gzd_',
    _getKey(name) { return this._keyPrefix + name; },

    get(key, defaultVal = null) {
      try { const raw = localStorage.getItem(this._getKey(key)); return raw ? JSON.parse(raw) : defaultVal; }
      catch(e) { return defaultVal; }
    },
    set(key, val) { localStorage.setItem(this._getKey(key), JSON.stringify(val)); },
    remove(key) { localStorage.removeItem(this._getKey(key)); },

    // 主题
    getTheme() { return this.get('theme', 'dark'); },
    setTheme(theme) { this.set('theme', theme); },

    // 角色
    getProfile() { return this.get('activeProfile', 'linxiwu'); },
    setProfile(id) { this.set('activeProfile', id); },

    // 任务状态
    getQuests() { return this.get('quests', {}); },
    setQuests(quests) { this.set('quests', quests); },
    updateQuestStatus(questId, status) {
      const quests = this.getQuests();
      quests[questId] = { ...quests[questId], status, updatedAt: Date.now() };
      this.setQuests(quests);
    },

    // 新闻已读
    getNewsRead() { return this.get('newsRead', []); },
    markNewsRead(newsId) {
      const read = this.getNewsRead();
      if (!read.includes(newsId)) { read.push(newsId); this.set('newsRead', read); }
    },

    // 收藏/词典
    getCollection() { return this.get('collection', { keywords: [] }); },
    unlockKeyword(word) {
      const col = this.getCollection();
      if (!col.keywords.includes(word)) { col.keywords.push(word); this.set('collection', col); }
    },
    isKeywordUnlocked(word) { return this.getCollection().keywords.includes(word); },

    // 设置
    getSettings() {
      return this.get('settings', {
        theme: 'dark', textSpeed: 30, bgmVolume: 0.3, sfxVolume: 0.5, autoPlay: false
      });
    },
    saveSettings(settings) { this.set('settings', { ...this.getSettings(), ...settings }); }
  },

  // ---------- 主题管理 ----------
  ThemeManager: {
    init() {
      const theme = GZD.Storage.getTheme();
      this.apply(theme, false);
    },
    apply(theme, save = true) {
      const html = document.documentElement;
      if (theme === 'light') html.setAttribute('data-theme', 'light');
      else html.removeAttribute('data-theme');
      if (save) GZD.Storage.setTheme(theme);
      this.updateBtn();
    },
    toggle() {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      this.apply(isLight ? 'dark' : 'light');
    },
    updateBtn() {
      const btn = document.getElementById('themeBtn');
      const icon = document.getElementById('themeIcon');
      const label = document.getElementById('themeLabel');
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (btn) btn.innerHTML = '<span class="icon">' + (isLight ? '🌙' : '☀️') + '</span> ' + (isLight ? '夜间' : '日间');
      if (icon) icon.textContent = isLight ? '🌙' : '☀️';
      if (label) label.textContent = isLight ? '夜间' : '日间';
    }
  },

  // ---------- 角色管理 ----------
  ProfileManager: {
    init() {
      const saved = GZD.Storage.getProfile();
      this.apply(saved, false);
    },
    apply(id, save = true) {
      document.body.setAttribute('data-profile', id);
      document.querySelectorAll('.profile-toggle button').forEach(b => {
        b.classList.toggle('active', b.dataset.profile === id);
      });
      document.querySelectorAll('.content-block').forEach(blk => {
        blk.classList.toggle('active', blk.id === 'content-' + id);
      });
      if (save) GZD.Storage.setProfile(id);
      window.dispatchEvent(new CustomEvent('profilechange', { detail: { profile: id } }));
    },
    switch(id) { this.apply(id); }
  },

  // ---------- 侧边栏 ----------
  Sidebar: {
    _open: false,
    toggle() {
      this._open = !this._open;
      document.getElementById('sidebarPanel').classList.toggle('open', this._open);
      document.getElementById('sidebarOverlay').classList.toggle('show', this._open);
      document.body.classList.toggle('no-scroll', this._open);
    },
    close() { if (this._open) this.toggle(); },
    open() { if (!this._open) this.toggle(); },
    setActive(pageName) {
      document.querySelectorAll('.sidebar-panel .nav-item').forEach(item => {
        const href = item.getAttribute('href') || '';
        item.classList.toggle('active', href.includes(pageName));
      });
    }
  },

  // ---------- 初始化 ----------
  init() {
    this.ThemeManager.init();
    this.ProfileManager.init();
    this.ThemeManager.updateBtn();
  }
};

// 页面加载后自动初始化
document.addEventListener('DOMContentLoaded', () => { GZD.init(); });
