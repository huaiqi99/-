(function() {
    'use strict';

    // ===== 保底：如果核心.js未加载 =====
    if (!window.GZD) {
        window.GZD = {};
        GZD.Storage = {
            get: function(k, d) {
                try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch (e) { return d; }
            },
            set: function(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
            getTheme: function() {
                var r = this.get('theme', null);
                return r && r.value ? r.value : 'dark';
            },
            getProfile: function() {
                try { return localStorage.getItem('activeProfile') || 'linxiwu'; } catch (e) { return 'linxiwu'; }
            },
            getQuests: function() { return this.get('gzd_quests', {}); }
        };
        GZD.ThemeManager = {
            init: function() {
                var t = GZD.Storage.getTheme();
                var h = document.documentElement;
                if (t === 'light') h.setAttribute('data-theme', 'light');
                else h.removeAttribute('data-theme');
            },
            toggle: function() {
                var isLight = document.documentElement.getAttribute('data-theme') === 'light';
                var h = document.documentElement;
                if (isLight) h.removeAttribute('data-theme');
                else h.setAttribute('data-theme', 'light');
                GZD.Storage.set('theme', { value: isLight ? 'dark' : 'light' });
            }
        };
        GZD.ProfileManager = {
            init: function() {
                var id = GZD.Storage.getProfile();
                document.body.setAttribute('data-profile', id);
                document.querySelectorAll('.content-block').forEach(function(b) {
                    b.classList.toggle('active', b.id === 'content-' + id);
                });
            },
            switch: function(id) {
                document.body.setAttribute('data-profile', id);
                document.querySelectorAll('.content-block').forEach(function(b) {
                    b.classList.remove('active');
                    if (b.id === 'content-' + id) b.classList.add('active');
                });
                localStorage.setItem('activeProfile', id);
                window.dispatchEvent(new CustomEvent('profilechange', { detail: { profile: id } }));
            }
        };
        GZD.Sidebar = {
            open: false,
            toggle: function() {
                this.open = !this.open;
                var p = document.getElementById('sidebarPanel'),
                    o = document.getElementById('sidebarOverlay');
                if (p) p.classList.toggle('open', this.open);
                if (o) o.classList.toggle('show', this.open);
                document.body.classList.toggle('no-scroll', this.open);
            },
            close: function() {
                if (this.open) {
                    this.open = false;
                    var p = document.getElementById('sidebarPanel'),
                        o = document.getElementById('sidebarOverlay');
                    if (p) p.classList.remove('open');
                    if (o) o.classList.remove('show');
                    document.body.classList.remove('no-scroll');
                }
            }
        };
        GZD.init = function() {
            this.ThemeManager.init();
            this.ProfileManager.init();
        };
        GZD.init();
    }

    // ===== 1. 侧边栏 / 主题 / 角色切换 =====
    document.addEventListener('click', function(e) {
        var target = e.target;
        if (target.closest('.sidebar-tab')) { e.preventDefault();
            GZD.Sidebar.toggle(); return; }
        if (target.id === 'sidebarOverlay') { GZD.Sidebar.close(); return; }
        if (target.closest('.sidebar-panel .close-btn')) { GZD.Sidebar.close(); return; }
        var switchBtn = target.closest('#profileSwitchBtn');
        if (switchBtn) {
            e.preventDefault();
            e.stopPropagation();
            var current = document.body.getAttribute('data-profile') || 'linxiwu';
            GZD.ProfileManager.switch(current === 'linxiwu' ? 'luojin' : 'linxiwu');
            return;
        }
    });

    document.getElementById('themeBtn').addEventListener('click', function() {
        GZD.ThemeManager.toggle();
        updateThemeBtn();
    });

    function updateThemeBtn() {
        var b = document.getElementById('themeBtn'),
            isLight = document.documentElement.getAttribute('data-theme') === 'light';
        if (b) b.innerHTML = '<span id="themeIcon">' + (isLight ? '🌙' : '☀️') + '</span> <span id="themeLabel">' + (isLight ? '夜间' : '日间') + '</span>';
    }
    updateThemeBtn();

    function updateProfileUI(profile) {
        var nameMap = { linxiwu: '林栖梧', luojin: '罗烬' };
        var nameEl = document.getElementById('currentProfileName');
        if (nameEl) nameEl.textContent = nameMap[profile] || '林栖梧';
        var switchBtn = document.getElementById('profileSwitchBtn');
        if (switchBtn) switchBtn.textContent = '切换到 ' + (profile === 'linxiwu' ? '罗烬' : '林栖梧');
    }
    (function() {
        var saved = GZD.Storage.getProfile();
        updateProfileUI(saved);
    })();
    window.addEventListener('profilechange', function(e) {
        updateProfileUI(e.detail.profile);
        renderAll(e.detail.profile);
    });

    // ===== 2. 差事数据 =====
    var QUEST_DB = {
        linxiwu: [
            { id: 'lin-q1', title: '浮生树落叶清理', dept: '符修院', issuer: '栾方棋', location: '浮生树广场',
                difficulty: '简单', reward: '符纸×20 · 魂力+5', desc: '浮生树每旬落叶需以符法聚拢焚烧，不可用凡火。',
                status: 'available', progress: 0 },
            { id: 'lin-q2', title: '符修院甲字库整理', dept: '符修院', issuer: '栾方棋', location: '符修院·甲字库',
                difficulty: '简单', reward: '符墨×3 · 魂力+8', desc: '甲字库符纸与朱砂需重新归类，按品级编号入架。',
                status: 'available', progress: 0 },
            { id: 'lin-q3', title: '京城北郊裂隙巡逻', dept: '外勤', issuer: '罗修', location: '人间·京城北郊',
                difficulty: '中等', reward: '功勋+15 · 魂力+12', desc: '月前封印的裂隙需每旬巡查一次，确认封印稳固。',
                status: 'available', progress: 0 },
            { id: 'lin-q4', title: '演武场防护符阵维护', dept: '符修院', issuer: '林淮', location: '演武广场',
                difficulty: '中等', reward: '功勋+10 · 魂力+10', desc: '演武场防护符阵每季需重新篆刻四角节点，防止训练误伤。',
                status: 'available', progress: 0 },
            { id: 'lin-q5', title: '栖梧阁药草整理', dept: '栖梧阁', issuer: '程木栖', location: '栖梧阁·药房',
                difficulty: '简单', reward: '丹药·回灵散×2 · 魂力+6', desc: '霜月新收的药材需分类晾晒入库，注意不要弄混了。',
                status: 'available', progress: 0 },
            { id: 'lin-q6', title: '点苍阁枪术辅助教学', dept: '点苍阁', issuer: '林淮', location: '点苍阁·练武场',
                difficulty: '中等', reward: '功勋+12 · 魂力+8', desc: '统修期新弟子枪术基础薄弱，需辅助指导基础架势。',
                status: 'available', progress: 0 },
            { id: 'lin-q7', title: '魂力冥想记录誊抄', dept: '砺峰阁', issuer: '魏元璟', location: '砺峰阁·藏书室',
                difficulty: '简单', reward: '魂力+5 · 功勋+6', desc: '本月抗压冥想课记录需整理成册，字迹工整即可。',
                status: 'available', progress: 0 },
            { id: 'lin-q8', title: '音律坊夜间值守', dept: '外勤', issuer: '魏元璟', location: '音律坊',
                difficulty: '简单', reward: '魂力+6 · 功勋+4', desc: '音律坊夜间需有人值守，确保乐器与魂力疏导装置无异动。',
                status: 'available', progress: 0 }
        ],
        luojin: [
            { id: 'luo-q1', title: '演武场石靶更换', dept: '讲武堂', issuer: '罗修', location: '演武广场',
                difficulty: '简单', reward: '功勋+6 · 魂力+4', desc: '演武场东侧石靶已全部碎裂，需从工造司领取新靶安装。',
                status: 'available', progress: 0 },
            { id: 'luo-q2', title: '讲武堂新刀开刃', dept: '讲武堂', issuer: '罗修', location: '讲武堂·兵器库',
                difficulty: '简单', reward: '功勋+8 · 魂力+6', desc: '新入库的十二把制式刀需统一开刃并登记入册。',
                status: 'available', progress: 0 },
            { id: 'luo-q3', title: '京城北郊裂隙巡逻', dept: '外勤', issuer: '罗修', location: '人间·京城北郊',
                difficulty: '中等', reward: '功勋+15 · 魂力+12', desc: '月前封印的裂隙需每旬巡查一次，确认封印稳固。',
                status: 'available', progress: 0 },
            { id: 'luo-q4', title: '砺峰阁抗压冥想陪练', dept: '砺峰阁', issuer: '魏元璟', location: '砺峰阁·冥想室',
                difficulty: '中等', reward: '功勋+10 · 魂力+10', desc: '统修期弟子魂力控制课程需陪练对练，模拟实战压力。',
                status: 'available', progress: 0 },
            { id: 'luo-q5', title: '浮生树根须清理', dept: '符修院', issuer: '栾方棋', location: '浮生树广场',
                difficulty: '简单', reward: '魂力+6 · 符纸×10', desc: '浮生树根部有枯藤缠绕，需清理并检查树根状态。',
                status: 'available', progress: 0 },
            { id: 'luo-q6', title: '工造司物资押运', dept: '外勤', issuer: '第三席', location: '地府·工造司至归终殿',
                difficulty: '中等', reward: '功勋+14 · 魂力+10', desc: '工造司新制装备需押运回殿，全程约两个时辰。',
                status: 'available', progress: 0 },
            { id: 'luo-q7', title: '音律坊乐器调试', dept: '音律坊', issuer: '程木栖', location: '音律坊',
                difficulty: '简单', reward: '魂力+6 · 功勋+4', desc: '音律坊的魂力疏导琴需调音，顺便检查有没有跑调的。',
                status: 'available', progress: 0 },
            { id: 'luo-q8', title: '点苍阁枪术对练', dept: '点苍阁', issuer: '林淮', location: '点苍阁·练武场',
                difficulty: '中等', reward: '功勋+12 · 魂力+8', desc: '与点苍阁新弟子对练枪术基础，点到为止。',
                status: 'available', progress: 0 }
        ]
    };

    // 外勤日志数据（归档）
    var LOG_DB = {
        linxiwu: [
            { date: '霜月 · 初三', title: '随行观摩京城北郊裂隙封印', desc: '随首席及第三席前往人间京城北郊，全程观摩封印流程。',
                tag: '外勤 · 观摩' },
            { date: '菊月 · 廿五', title: '浮生树落叶清理', desc: '完成浮生树落叶清理，共焚烧落叶三筐。', tag: '符修院 · 日常' }
        ],
        luojin: [
            { date: '霜月 · 初三', title: '随行观摩京城北郊裂隙封印', desc: '随首席及第三席前往人间京城北郊，外围观察封印流程。',
                tag: '外勤 · 观摩' },
            { date: '菊月 · 廿二', title: '演武场石靶更换', desc: '完成石靶更换，新靶已安装到位。', tag: '讲武堂 · 日常' }
        ]
    };

    // ===== 3. 渲染差事列表 =====
    function renderQuests(profile, filter) {
        filter = filter || 'all';
        var container = document.getElementById('questList' + (profile === 'linxiwu' ? 'Lin' : 'Luo'));
        if (!container) return;
        var raw = QUEST_DB[profile] || [];
        // 从Storage读取状态覆盖
        var stored = GZD.Storage.getQuests() || {};
        var data = raw.map(function(q) {
            var s = stored[q.id];
            if (s) {
                q.status = s.status || q.status;
                q.progress = s.progress || 0;
            }
            return q;
        });

        var filtered = data;
        if (filter !== 'all') {
            filtered = data.filter(function(q) { return q.dept === filter; });
        }

        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state"><span class="empty-icon">📋</span>暂无差事</div>';
            return;
        }

        var statusMap = {
            available: { label: '可接取', cls: 'available' },
            doing: { label: '进行中', cls: 'doing' },
            done: { label: '已完成', cls: 'done' },
            archived: { label: '已归档', cls: 'archived' }
        };
        var deptIcons = {
            '符修院': '✿',
            '讲武堂': '⚔',
            '点苍阁': '◈',
            '砺峰阁': '✦',
            '栖梧阁': '◉',
            '外勤': '◆',
            '音律坊': '♫'
        };

        var html = '';
        filtered.forEach(function(q) {
            var st = statusMap[q.status] || statusMap.available;
            var icon = deptIcons[q.dept] || '◈';
            var pct = Math.round(q.progress * 100);
            var progressHtml = '';
            if (q.status === 'doing' || q.status === 'done') {
                progressHtml = '<div class="progress-track"><div class="p-bar"><div class="p-fill" style="width:' + pct +
                    '%;"></div></div><span class="p-label">' + pct + '%</span></div>';
            }
            html += '<div class="quest-item" data-id="' + q.id + '" data-profile="' + profile + '">';
            html += '<span class="q-icon">' + icon + '</span>';
            html += '<div class="q-body">';
            html += '<div class="q-title">' + q.title + '</div>';
            html += '<div class="q-meta">';
            html += '<span>' + q.issuer + '</span>';
            html += '<span>·</span>';
            html += '<span>' + q.location + '</span>';
            html += '<span>·</span>';
            html += '<span class="q-tag">' + q.dept + '</span>';
            html += '<span>·</span>';
            html += '<span>' + q.difficulty + '</span>';
            html += '</div>';
            html += progressHtml;
            html += '</div>';
            html += '<span class="q-status ' + st.cls + '">' + st.label + '</span>';
            html += '</div>';
        });
        container.innerHTML = html;

        // 点击差事打开详情
        container.querySelectorAll('.quest-item').forEach(function(el) {
            el.addEventListener('click', function() {
                var id = this.dataset.id;
                var profile = this.dataset.profile;
                openQuestModal(profile, id);
            });
        });
    }

    // ===== 4. 渲染外勤日志 =====
    function renderLogs(profile) {
        var container = document.getElementById('logList' + (profile === 'linxiwu' ? 'Lin' : 'Luo'));
        if (!container) return;
        var logs = LOG_DB[profile] || [];
        if (logs.length === 0) {
            container.innerHTML = '<div class="empty-state"><span class="empty-icon">📖</span>暂无外勤记录</div>';
            return;
        }
        var html = '';
        logs.forEach(function(log) {
            html += '<div class="log-entry">';
            html += '<div class="log-date">' + log.date + '</div>';
            html += '<div class="log-body">';
            html += '<div class="log-title">' + log.title + '</div>';
            html += '<div class="log-desc">' + log.desc + '</div>';
            html += '<span class="log-tag">' + log.tag + '</span>';
            html += '</div>';
            html += '</div>';
        });
        container.innerHTML = html;
    }

    // ===== 5. 弹窗逻辑（修复：为archived状态添加"重新打开"按钮） =====
    var modal = document.getElementById('questModal');
    var modalTitle = document.getElementById('modalTitle');
    var modalSub = document.getElementById('modalSub');
    var modalBody = document.getElementById('modalBody');
    var modalAction = document.getElementById('modalAction');
    var modalCancel = document.getElementById('modalCancel');
    var modalClose = document.getElementById('modalClose');
    var currentModalId = null;
    var currentModalProfile = null;

    function openQuestModal(profile, id) {
        var raw = QUEST_DB[profile] || [];
        var stored = GZD.Storage.getQuests() || {};
        var q = raw.find(function(item) { return item.id === id; });
        if (!q) return;
        // 合并storage状态
        var s = stored[q.id];
        if (s) {
            q.status = s.status || q.status;
            q.progress = s.progress || 0;
        }

        currentModalId = id;
        currentModalProfile = profile;

        modalTitle.textContent = q.title;
        modalSub.textContent = q.issuer + ' · ' + q.location;

        var statusMap = {
            available: '可接取',
            doing: '进行中',
            done: '已完成',
            archived: '已归档'
        };
        var statusText = statusMap[q.status] || '可接取';

        var bodyHtml = '';
        bodyHtml += '<div class="detail-row"><span class="dl">发布人</span><span class="dd">' + q.issuer + '</span></div>';
        bodyHtml += '<div class="detail-row"><span class="dl">地点</span><span class="dd">' + q.location + '</span></div>';
        bodyHtml += '<div class="detail-row"><span class="dl">院阁</span><span class="dd">' + q.dept + '</span></div>';
        bodyHtml += '<div class="detail-row"><span class="dl">难度</span><span class="dd">' + q.difficulty + '</span></div>';
        bodyHtml += '<div class="detail-row"><span class="dl">报酬</span><span class="dd">' + q.reward + '</span></div>';
        bodyHtml += '<div class="detail-row"><span class="dl">状态</span><span class="dd">' + statusText + '</span></div>';
        bodyHtml += '<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border-light);">' + q.desc +
            '</div>';
        if (q.status === 'doing' || q.status === 'done') {
            var pct = Math.round(q.progress * 100);
            bodyHtml +=
                '<div style="margin-top:10px;"><div class="progress-track"><span class="p-label" style="min-width:60px;">进度</span><div class="p-bar"><div class="p-fill" style="width:' +
                pct + '%;"></div></div><span class="p-label">' + pct + '%</span></div></div>';
        }
        modalBody.innerHTML = bodyHtml;

        // ===== 按钮逻辑（修复点：添加 archived 状态处理） =====
        // 确保按钮先显示
        modalAction.style.display = 'inline-block';

        if (q.status === 'available') {
            modalAction.textContent = '接取差事';
            modalAction.onclick = function() {
                updateQuestStatus(profile, id, 'doing', 0.05);
                modal.classList.remove('open');
                renderAll(profile);
            };
        } else if (q.status === 'doing') {
            modalAction.textContent = '推进进度 (+10%)';
            modalAction.onclick = function() {
                advanceQuest(profile, id);
                modal.classList.remove('open');
                renderAll(profile);
            };
        } else if (q.status === 'done') {
            modalAction.textContent = '归档';
            modalAction.onclick = function() {
                updateQuestStatus(profile, id, 'archived', 1);
                // 同时加入外勤日志
                addLog(profile, q);
                modal.classList.remove('open');
                renderAll(profile);
                // 触发魂力页面更新
                window.dispatchEvent(new CustomEvent('questupdate', { detail: { profile: profile } }));
            };
        } else if (q.status === 'archived') {
            // ★ 修复：为已归档任务提供"重新打开"按钮
            modalAction.textContent = '重新打开';
            modalAction.onclick = function() {
                updateQuestStatus(profile, id, 'available', 0);
                modal.classList.remove('open');
                renderAll(profile);
            };
        } else {
            // 未知状态：隐藏按钮（理论上不会发生）
            modalAction.style.display = 'none';
        }
    }

    function closeModal() {
        modal.classList.remove('open');
        currentModalId = null;
        currentModalProfile = null;
    }

    modalCancel.addEventListener('click', closeModal);
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });

    // ===== 6. 差事操作 =====
    function updateQuestStatus(profile, id, status, progress) {
        var stored = GZD.Storage.getQuests() || {};
        if (!stored[id]) stored[id] = {};
        stored[id].status = status;
        stored[id].progress = progress || 0;
        GZD.Storage.set('gzd_quests', stored);
        // 同时更新 QUEST_DB 中的状态（用于列表即时刷新）
        var raw = QUEST_DB[profile] || [];
        var q = raw.find(function(item) { return item.id === id; });
        if (q) {
            q.status = status;
            q.progress = progress || 0;
        }
    }

    function advanceQuest(profile, id) {
        var stored = GZD.Storage.getQuests() || {};
        if (!stored[id]) stored[id] = { status: 'doing', progress: 0 };
        var p = stored[id].progress || 0;
        p = Math.min(1, p + 0.1);
        stored[id].progress = p;
        if (p >= 1) {
            stored[id].status = 'done';
            // 自动归档并加入日志
            var raw = QUEST_DB[profile] || [];
            var q = raw.find(function(item) { return item.id === id; });
            if (q) {
                q.status = 'done';
                q.progress = 1;
                setTimeout(function() {
                    addLog(profile, q);
                    window.dispatchEvent(new CustomEvent('questupdate', { detail: { profile: profile } }));
                }, 200);
            }
        }
        // 同步更新 QUEST_DB
        var raw2 = QUEST_DB[profile] || [];
        var q2 = raw2.find(function(item) { return item.id === id; });
        if (q2) {
            q2.status = stored[id].status;
            q2.progress = stored[id].progress;
        }
        GZD.Storage.set('gzd_quests', stored);
    }

    function addLog(profile, q) {
        var logs = LOG_DB[profile] || [];
        var now = new Date();
        var month = ['菊月', '良月', '霜月', '梅月', '杏月', '桃月', '槐月', '榴月', '荷月', '巧月', '桂月', '菊月'][now.getMonth()] ||
            '霜月';
        var day = String(now.getDate()).padStart(2, ' ');
        var dateStr = month + ' · ' + day;
        var entry = {
            date: dateStr,
            title: q.title,
            desc: '已完成。' + (q.desc ? q.desc.slice(0, 30) : ''),
            tag: q.dept + ' · 完成'
        };
        logs.unshift(entry);
        if (logs.length > 20) logs.pop();
        LOG_DB[profile] = logs;
        // 持久化到localStorage
        GZD.Storage.set('gzd_logs_' + profile, logs);
    }

    // ===== 7. 筛选逻辑 =====
    function initFilters(profile) {
        var bar = document.getElementById('filterBar' + (profile === 'linxiwu' ? 'Lin' : 'Luo'));
        if (!bar) return;
        bar.querySelectorAll('.filter-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                bar.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                var filter = this.dataset.filter;
                renderQuests(profile, filter);
            });
        });
    }

    // ===== 8. 花瓣特效 =====
    var PETAL_CHARS = ['❀', '◈', '✽'],
        petalContainer = document.getElementById('petal-container');
    if (petalContainer) {
        for (var i = 0; i < 16; i++) {
            var el = document.createElement('div');
            el.className = 'petal-char';
            el.textContent = PETAL_CHARS[Math.floor(Math.random() * PETAL_CHARS.length)];
            el.style.left = Math.random() * 100 + '%';
            el.style.fontSize = (14 + Math.random() * 12) + 'px';
            el.style.animationDuration = (10 + Math.random() * 10) + 's';
            el.style.animationDelay = (Math.random() * 12) + 's';
            petalContainer.appendChild(el);
        }
    }

    // ===== 9. 加载持久化日志 =====
    function loadPersistedLogs() {
        var linLogs = GZD.Storage.get('gzd_logs_linxiwu', null);
        var luoLogs = GZD.Storage.get('gzd_logs_luojin', null);
        if (linLogs) LOG_DB.linxiwu = linLogs;
        if (luoLogs) LOG_DB.luojin = luoLogs;
        // 同步恢复任务状态到 QUEST_DB
        var stored = GZD.Storage.getQuests() || {};
        for (var profile in QUEST_DB) {
            var raw = QUEST_DB[profile] || [];
            raw.forEach(function(q) {
                var s = stored[q.id];
                if (s) {
                    q.status = s.status || q.status;
                    q.progress = s.progress || 0;
                }
            });
        }
    }

    // ===== 10. 全部渲染 =====
    function renderAll(profile) {
        profile = profile || document.body.getAttribute('data-profile') || 'linxiwu';
        // 获取当前激活的筛选
        var bar = document.getElementById('filterBar' + (profile === 'linxiwu' ? 'Lin' : 'Luo'));
        var filter = 'all';
        if (bar) {
            var active = bar.querySelector('.filter-btn.active');
            if (active) filter = active.dataset.filter;
        }
        renderQuests(profile, filter);
        renderLogs(profile);
    }

    // ===== 11. 初始化 =====
    loadPersistedLogs();
    var initialProfile = document.body.getAttribute('data-profile') || 'linxiwu';
    initFilters('linxiwu');
    initFilters('luojin');
    renderAll(initialProfile);

    // 监听角色切换重新渲染
    window.addEventListener('profilechange', function(e) {
        renderAll(e.detail.profile);
    });

    // 监听差事更新事件（用于魂力联动）
    window.addEventListener('questupdate', function(e) {
        // 魂力页面会自己监听storage变化，我们只负责触发事件
    });

    console.log('🌙 归终殿 · 差事与外勤 v1.1 已加载（修复归档状态按钮缺失）');
})();