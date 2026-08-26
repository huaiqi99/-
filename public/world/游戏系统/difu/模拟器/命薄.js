// ================================================================
//  命薄.js  ·  归终殿 命簿纪事 增强交互
//  包含：时辰更新 · 低语轮播 · 任务系统 · 新闻弹窗 ·
//        打字机效果 · 花瓣飘落 · 时间轴渐入 · 角色切换适配
//  依赖：核心.js（提供 GZD 基础对象）
// ================================================================

(function() {
    'use strict';

    // ---------- 确保 GZD 基础对象存在 ----------
    if (typeof window.GZD === 'undefined') {
        window.GZD = {};
    }
    const GZD = window.GZD;

    // ---------- 1. 地府时辰 ----------
    const earthlyHours = [
        { name: '子时', start: 23, end: 1, desc: '万籁俱寂，忘川水静。引渡人交班时分，归终殿广场上浮生树泛着幽微的银白光芒。',
            yinqi: '96%', weather: '浓雾', tree: '花叶低垂' },
        { name: '丑时', start: 1, end: 3, desc: '地府灯火阑珊，阴差换岗。偶有迷途亡魂在奈何桥畔徘徊，需引渡人前往安抚。',
            yinqi: '94%', weather: '阴风', tree: '静默' },
        { name: '寅时', start: 3, end: 5, desc: '夜将尽而未尽，阴气仍重。三生石前常有执念深重的魂魄驻足，不宜惊扰。',
            yinqi: '88%', weather: '薄霜', tree: '微光' },
        { name: '卯时', start: 5, end: 7, desc: '地府假天明，阴气渐收。弟子陆续起身前往砺峰阁晨训，脚步声在石板路上回响。',
            yinqi: '72%', weather: '薄雾', tree: '苏醒' },
        { name: '辰时', start: 7, end: 9, desc: '假日高升，各院阁开课。符修院传来符纸燃烧的气息，讲武堂响起兵器碰撞声。',
            yinqi: '60%', weather: '晴朗', tree: '摇曳' },
        { name: '巳时', start: 9, end: 11, desc: '阳气混入地府，部分敏感弟子略感不适。此时不宜进行高强度阴气修炼。',
            yinqi: '55%', weather: '晴朗', tree: '盛放' },
        { name: '午时', start: 11, end: 13, desc: '地府日中，阴气最弱。弟子多在此刻用膳、休整，或于栖梧馆疗伤。',
            yinqi: '45%', weather: '燥热', tree: '收敛' },
        { name: '未时', start: 13, end: 15, desc: '午后慵懒，藏经阁内弟子翻阅古籍的沙沙声与远处演武广场的呼喝交织。',
            yinqi: '50%', weather: '多云', tree: '低语' },
        { name: '申时', start: 15, end: 17, desc: '外勤引渡人陆续回殿，带回人间消息。殿前广场渐渐热闹，浮生树影拉长。',
            yinqi: '58%', weather: '微风', tree: '舒展' },
        { name: '酉时', start: 17, end: 19, desc: '假日落，地府入暮。各院阁陆续闭课，弟子或结伴前往忘川观落日余晖。',
            yinqi: '70%', weather: '霞光', tree: '泛光' },
        { name: '戌时', start: 19, end: 21, desc: '夜课开始，音律坊传出琴笛之声。部分弟子于浮生树下进行夜间冥想。',
            yinqi: '82%', weather: '薄雾', tree: '轻颤' },
        { name: '亥时', start: 21, end: 23, desc: '地府入夜，灯火次第亮起。归终殿弟子陆续归寝，只剩巡逻队在殿外游走。',
            yinqi: '90%', weather: '浓雾', tree: '沉睡' }
    ];

    function getCurrentHour() {
        const h = new Date().getHours();
        for (let i = 0; i < earthlyHours.length; i++) {
            const e = earthlyHours[i];
            if (e.start > e.end) {
                if (h >= e.start || h < e.end) return e;
            } else {
                if (h >= e.start && h < e.end) return e;
            }
        }
        return earthlyHours[0];
    }

    function updateChrono() {
        const e = getCurrentHour();
        const idx = earthlyHours.indexOf(e);
        document.getElementById('hourName').textContent = e.name;
        document.getElementById('hourSub').textContent = e.name + ' · ' + e.yinqi + '阴气 · 地府第' + (idx + 1) + '更';
        document.getElementById('yinqi').textContent = e.yinqi;
        document.getElementById('weather').textContent = e.weather;
        document.getElementById('treeStatus').textContent = e.tree;
    }
    updateChrono();
    setInterval(updateChrono, 60000);

    // ---------- 2. 打字机效果（时辰描述） ----------
    function typewriter(element, text, speed, callback) {
        if (!element) return;
        element.textContent = '';
        let index = 0;
        const cursor = document.createElement('span');
        cursor.className = 'cursor-blink';
        element.appendChild(cursor);

        function typeChar() {
            if (index < text.length) {
                const char = text.charAt(index);
                const textNode = document.createTextNode(char);
                element.insertBefore(textNode, cursor);
                index++;
                const delay = char === '，' || char === '。' ? speed * 2 : speed;
                setTimeout(typeChar, delay);
            } else {
                if (cursor.parentNode) cursor.remove();
                if (callback) callback();
            }
        }
        setTimeout(typeChar, 400);
    }

    const hourDescEl = document.getElementById('hourDesc');
    if (hourDescEl) {
        const rawText = hourDescEl.textContent.trim();
        hourDescEl.textContent = '';
        typewriter(hourDescEl, rawText, 48);
    }

    // ---------- 3. 浮生树低语 · 轮播 ----------
    const whispers = [
        '每一段走过的黄泉路，每一次艰难的引渡，都将铸就独一无二的你。',
        '浮生花会谢，但树根记得每一朵花的重量。',
        '引渡人不是神，只是愿意在阴阳之间多站一会儿的人。',
        '刀会断，枪会折，符会燃尽——但归终殿还在。',
        '你若在忘川边遇到一个不肯渡河的魂，别催他。他只是在等一句告别。',
        '林淮等了二百年，罗修烧了五百年。时间在地府，不过是一场漫长的修行。',
        '浮生树从不挑选落在谁肩上的花瓣。它只负责开花。',
        '忘川河底沉着的，不是白骨，是没说完的话。',
        '归终殿的钟声，活人听不见，亡魂却会驻足。',
        '每一片浮生花瓣飘落时，都有一声叹息被风带走。'
    ];
    let whisperIndex = Math.floor(Math.random() * whispers.length);
    const whisperEl = document.getElementById('whisperText');

    function rotateWhisper() {
        const next = (whisperIndex + 1) % whispers.length;
        whisperEl.classList.add('fade-out');
        setTimeout(() => {
            whisperEl.textContent = '"' + whispers[next] + '"';
            whisperEl.classList.remove('fade-out');
            whisperIndex = next;
        }, 500);
    }
    setInterval(rotateWhisper, 12000);

    // ---------- 4. 任务系统 ----------
    const STATUS_CYCLE = { '未接': '进行中', '进行中': '已完成', '已完成': '未接' };

    function renderQuests() {
        const quests = GZD.Storage ? GZD.Storage.getQuests() : {};
        document.querySelectorAll('.quest-item').forEach(item => {
            const qid = item.dataset.questId;
            if (!qid) return;
            const saved = quests[qid];
            if (saved && saved.status) {
                const statusEl = item.querySelector('.status');
                if (statusEl) {
                    statusEl.textContent = saved.status;
                    statusEl.className = 'status ' + (saved.status === '进行中' ? 'doing' : saved.status === '已完成' ?
                        'done' : '');
                }
            }
        });
        updateStoryProgress();
    }

    function updateStoryProgress() {
        const quests = GZD.Storage ? GZD.Storage.getQuests() : {};
        const linTotal = 5,
            luoTotal = 5;
        let linDone = 0,
            luoDone = 0;
        for (let i = 1; i <= 5; i++) {
            if (quests['lin-q' + i]?.status === '已完成') linDone++;
            if (quests['luo-q' + i]?.status === '已完成') luoDone++;
        }
        const linPct = Math.round((linDone / linTotal) * 100);
        const luoPct = Math.round((luoDone / luoTotal) * 100);
        const pctLin = document.getElementById('storyPct-lin');
        const barLin = document.getElementById('storyBar-lin');
        const pctLuo = document.getElementById('storyPct-luo');
        const barLuo = document.getElementById('storyBar-luo');
        if (pctLin) pctLin.textContent = linPct + '%';
        if (barLin) barLin.style.width = linPct + '%';
        if (pctLuo) pctLuo.textContent = luoPct + '%';
        if (barLuo) barLuo.style.width = luoPct + '%';
    }

    // 任务点击切换 + 庆祝
    const CELEBRATION_EMOJIS = ['🌸', '✨', '🕯️', '🌙', '💮', '✧'];

    function showCelebration(x, y) {
        const el = document.createElement('div');
        el.className = 'celebration';
        el.textContent = CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)];
        el.style.cssText =
            'position:fixed;pointer-events:none;z-index:200;font-size:1.8rem;left:' + (x - 16) + 'px;top:' + (y - 16) +
            'px;animation:celebFloat 1.2s ease-out forwards;transform-style:flat;-webkit-transform-style:flat;';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1300);
    }

    if (!document.getElementById('celebStyle')) {
        const style = document.createElement('style');
        style.id = 'celebStyle';
        style.textContent =
            '@keyframes celebFloat{0%{opacity:1;transform:translateY(0) scale(0.5) rotate(0deg);}100%{opacity:0;transform:translateY(-80px) scale(1.4) rotate(40deg);}}';
        document.head.appendChild(style);
    }

    document.querySelectorAll('.quest-item').forEach(item => {
        item.addEventListener('click', function(e) {
            const qid = this.dataset.questId;
            if (!qid) return;
            const statusEl = this.querySelector('.status');
            const current = statusEl.textContent.trim();
            const next = STATUS_CYCLE[current] || '未接';
            const prev = current;

            statusEl.textContent = next;
            statusEl.className = 'status ' + (next === '进行中' ? 'doing' : next === '已完成' ? 'done' : '');
            if (GZD.Storage) GZD.Storage.updateQuestStatus(qid, next);
            updateStoryProgress();

            if (next === '已完成' && prev !== '已完成') {
                const rect = this.getBoundingClientRect();
                showCelebration(rect.left + rect.width / 2, rect.top + rect.height / 2);
                this.style.transition = 'background 0.2s';
                this.style.background = 'rgba(212,154,154,0.15)';
                setTimeout(() => { this.style.background = ''; }, 400);
            }
        });
    });

    renderQuests();

    // ---------- 5. 新闻弹窗 ----------
    const modal = document.getElementById('newsModal');
    const modalTag = document.getElementById('modalTag');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalTime = document.getElementById('modalTime');
    const modalClose = document.getElementById('modalClose');

    function openNewsModal(tag, title, body, time) {
        modalTag.textContent = tag || '殿务公告';
        modalTitle.textContent = title || '无标题';
        // 处理换行：将 \\n 替换为真正的换行
        modalBody.textContent = body.replace(/\\n/g, '\n') || '暂无详细内容。';
        modalTime.textContent = time || '';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeNewsModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    document.querySelectorAll('.news-card').forEach(card => {
        card.addEventListener('click', function() {
            const tag = this.dataset.tag || '资讯';
            const title = this.dataset.title || this.querySelector('.title')?.textContent || '标题';
            const body = this.dataset.body || this.querySelector('.excerpt')?.textContent || '暂无详情。';
            const time = this.dataset.time || this.querySelector('.time')?.textContent || '';
            openNewsModal(tag, title, body, time);

            const nid = this.dataset.newsId;
            if (nid) {
                if (GZD.Storage) GZD.Storage.markNewsRead(nid);
                this.classList.add('is-read');
            }
        });
    });

    modalClose.addEventListener('click', closeNewsModal);
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeNewsModal();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeNewsModal();
    });

    (function() {
        if (!GZD.Storage) return;
        const read = GZD.Storage.getNewsRead() || [];
        document.querySelectorAll('.news-card').forEach(card => {
            const nid = card.dataset.newsId;
            if (nid && read.includes(nid)) card.classList.add('is-read');
        });
    })();

    // ---------- 6. 花瓣特效（从上往下飘落，使用 CSS 动画） ----------
    const PETAL_CHARS = ['❀', '✿', '✽'];
    const petalContainer = document.getElementById('petal-container');

    function createPetal() {
        const el = document.createElement('div');
        el.className = 'petal-char';
        const char = PETAL_CHARS[Math.floor(Math.random() * PETAL_CHARS.length)];
        el.textContent = char;
        const size = 16 + Math.random() * 18;
        const x = Math.random() * window.innerWidth;
        const duration = 12 + Math.random() * 14; // 秒
        const delay = Math.random() * 8;
        const rotation = Math.random() * 360;

        el.style.fontSize = size + 'px';
        el.style.left = x + 'px';
        el.style.top = '-30px';
        el.style.animationDuration = duration + 's';
        el.style.animationDelay = delay + 's';
        el.style.transform = 'rotate(' + rotation + 'deg)';
        el.style.opacity = (0.3 + Math.random() * 0.5).toString();

        petalContainer.appendChild(el);

        // 动画结束后移除
        el.addEventListener('animationend', function() {
            el.remove();
        });
    }

    // 初始生成一批
    for (let i = 0; i < 20; i++) {
        setTimeout(createPetal, i * 200);
    }
    // 持续生成
    setInterval(createPetal, 1200 + Math.random() * 1500);

    // ---------- 7. 时间轴渐入 ----------
    function revealTimelineItems() {
        document.querySelectorAll('.timeline-item:not(.visible)').forEach(item => {
            const rect = item.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.85) {
                item.classList.add('visible');
            }
        });
    }
    setTimeout(revealTimelineItems, 500);
    window.addEventListener('scroll', revealTimelineItems);

    // ---------- 8. 角色切换（顶部名称 + 侧边栏按钮） ----------
    function updateProfileUI(profile) {
        const nameMap = { 'linxiwu': '林栖梧', 'luojin': '罗烬' };
        const nameEl = document.getElementById('currentProfileName');
        if (nameEl) nameEl.textContent = nameMap[profile] || '林栖梧';

        const switchBtn = document.getElementById('profileSwitchBtn');
        if (switchBtn) {
            const target = profile === 'linxiwu' ? '罗烬' : '林栖梧';
            switchBtn.textContent = '切换到 ' + target;
        }
    }

    // 角色切换函数（覆盖 GZD.ProfileManager）
    if (!GZD.ProfileManager) {
        GZD.ProfileManager = {
            switch: function(profile) {
                document.body.dataset.profile = profile;
                document.querySelectorAll('.content-block').forEach(block => block.classList.remove('active'));
                const target = document.getElementById('content-' + profile);
                if (target) target.classList.add('active');
                updateProfileUI(profile);
                window.dispatchEvent(new CustomEvent('profilechange', { detail: { profile } }));
                try { localStorage.setItem('gzd_profile', profile); } catch (_) {}
                // 更新进度
                updateStoryProgress();
                setTimeout(revealTimelineItems, 300);
            }
        };
    }

    // 侧边栏切换按钮事件
    const switchBtn = document.getElementById('profileSwitchBtn');
    if (switchBtn) {
        switchBtn.addEventListener('click', function() {
            const current = document.body.dataset.profile || 'linxiwu';
            const target = current === 'linxiwu' ? 'luojin' : 'linxiwu';
            GZD.ProfileManager.switch(target);
        });
    }

    // 初始化：从 localStorage 读取角色，并与 index 联动
    (function() {
        let saved = localStorage.getItem('activeProfile');
        if (!saved) {
            // 如果没有 activeProfile，尝试读取 gzd_profile（旧逻辑）
            saved = localStorage.getItem('gzd_profile') || 'linxiwu';
        }
        const profile = saved;
        document.body.dataset.profile = profile;
        document.querySelectorAll('.content-block').forEach(block => block.classList.remove('active'));
        const target = document.getElementById('content-' + profile);
        if (target) target.classList.add('active');
        updateProfileUI(profile);
        // 更新进度
        setTimeout(updateStoryProgress, 200);
        setTimeout(revealTimelineItems, 300);
        // 同步保存
        try { localStorage.setItem('activeProfile', profile); } catch (_) {}
    })();

    // 监听 role 切换事件（从 index 页面可能通过 storage 变更，但我们使用主动切换）
    window.addEventListener('storage', function(e) {
        if (e.key === 'activeProfile' || e.key === 'gzd_profile') {
            const newProfile = e.newValue || 'linxiwu';
            if (newProfile !== document.body.dataset.profile) {
                GZD.ProfileManager.switch(newProfile);
            }
        }
    });

    // ---------- 9. 主题切换（默认日间） ----------
    // HTML 中已设置 data-theme="light"，但用户可能通过按钮切换
    function toggleTheme() {
        const html = document.documentElement;
        const isLight = html.getAttribute('data-theme') === 'light';
        const newTheme = isLight ? 'dark' : 'light';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', JSON.stringify({ value: newTheme }));
        updateThemeBtn();
    }

    function updateThemeBtn() {
        const icon = document.getElementById('themeIcon');
        const label = document.getElementById('themeLabel');
        if (!icon || !label) return;
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        icon.textContent = isLight ? '🌙' : '☀️';
        label.textContent = isLight ? '夜间' : '日间';
    }

    // 暴露全局切换函数
    window.toggleTheme = toggleTheme;

    // 初始化主题按钮
    (function() {
        const stored = localStorage.getItem('theme');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (data.value === 'dark') {
                    document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                }
            } catch (e) {}
        } else {
            // 默认日间
            document.documentElement.setAttribute('data-theme', 'light');
        }
        updateThemeBtn();
    })();

    // ---------- 10. 侧边栏兼容 ----------
    if (!GZD.Sidebar) {
        GZD.Sidebar = {
            toggle: function() {
                const panel = document.getElementById('sidebarPanel');
                const overlay = document.getElementById('sidebarOverlay');
                if (!panel) return;
                panel.classList.toggle('open');
                if (overlay) overlay.classList.toggle('show');
                document.body.classList.toggle('no-scroll');
            },
            close: function() {
                const panel = document.getElementById('sidebarPanel');
                const overlay = document.getElementById('sidebarOverlay');
                if (panel) panel.classList.remove('open');
                if (overlay) overlay.classList.remove('show');
                document.body.classList.remove('no-scroll');
            }
        };
    }

    // ---------- 11. Storage 兼容 ----------
    if (!GZD.Storage) {
        GZD.Storage = {
            _data: { quests: {}, news: [] },
            getQuests: function() { return this._data.quests; },
            updateQuestStatus: function(qid, status) {
                this._data.quests[qid] = { status: status };
            },
            getNewsRead: function() { return this._data.news || []; },
            markNewsRead: function(nid) {
                if (!this._data.news.includes(nid)) this._data.news.push(nid);
            }
        };
    }

    // ---------- 12. 监听角色切换事件 ---------
    window.addEventListener('profilechange', function(e) {
        updateProfileUI(e.detail.profile);
        updateStoryProgress();
        setTimeout(revealTimelineItems, 300);
    });

    console.log('🌙 归终殿 · 命簿纪事 增强版已加载');
    console.log('✿ 功能：时辰·打字机·新闻弹窗·花瓣飘落·任务庆祝·时间轴·角色切换');
})();;