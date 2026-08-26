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
            'px;animation:celebFloat 1.2s ease-out forwards;';
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
        modalBody.textContent = body || '暂无详细内容。';
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

    // ---------- 6. 花瓣特效（❀ ✿ 字符飘落，强制2D） ----------
    const PETAL_CHARS = ['❀', '✿', '🌸', '🌺', '✾', '❁', '✽'];
    const petalContainer = document.getElementById('petal-container');

    function createPetal() {
        const el = document.createElement('div');
        el.className = 'petal-char';
        const char = PETAL_CHARS[Math.floor(Math.random() * PETAL_CHARS.length)];
        el.textContent = char;
        const size = 16 + Math.random() * 18;
        const x = Math.random() * window.innerWidth;
        const delay = Math.random() * 6;
        const duration = 14 + Math.random() * 10;
        const rotSpeed = (Math.random() - 0.5) * 360;
        const drift = (Math.random() - 0.5) * 120;

        el.style.fontSize = size + 'px';
        el.style.left = x + 'px';
        el.style.top = '-30px';
        el.style.opacity = (0.3 + Math.random() * 0.5).toString();
        el.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
        el.style.transformStyle = 'flat';
        el.style.webkitTransformStyle = 'flat';

        petalContainer.appendChild(el);

        const keyframes = [
            { transform: 'translate(0, 0) rotate(0deg)', opacity: parseFloat(el.style.opacity) },
            { transform: 'translate(' + (drift * 0.3) + 'px, ' + (window.innerHeight * 0.3) + 'px) rotate(' + (rotSpeed *
                    0.4) + 'deg)', opacity: parseFloat(el.style.opacity) * 0.9 },
            { transform: 'translate(' + (drift * 0.7) + 'px, ' + (window.innerHeight * 0.6) + 'px) rotate(' + (rotSpeed *
                    0.8) + 'deg)', opacity: parseFloat(el.style.opacity) * 0.7 },
            { transform: 'translate(' + (drift * 0.4) + 'px, ' + (window.innerHeight * 0.85) + 'px) rotate(' + (rotSpeed *
                    1.2) + 'deg)', opacity: parseFloat(el.style.opacity) * 0.4 },
            { transform: 'translate(' + (drift * 0.9) + 'px, ' + (window.innerHeight + 40) + 'px) rotate(' + (rotSpeed *
                    1.6) + 'deg)', opacity: 0 }
        ];

        const anim = el.animate(keyframes, {
            duration: duration * 1000,
            delay: delay * 1000,
            easing: 'ease-in-out',
            iterations: 1,
            fill: 'forwards'
        });

        anim.onfinish = function() {
            el.remove();
        };

        return el;
    }

    let petalTimer = null;

    function startPetals() {
        if (petalTimer) clearInterval(petalTimer);
        for (let i = 0; i < 6; i++) {
            setTimeout(createPetal, i * 300);
        }
        petalTimer = setInterval(createPetal, 1200 + Math.random() * 1600);
    }

    function stopPetals() {
        if (petalTimer) {
            clearInterval(petalTimer);
            petalTimer = null;
        }
        petalContainer.innerHTML = '';
    }

    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const children = petalContainer.children;
            if (children.length > 40) {
                for (let i = 0; i < children.length - 30; i++) {
                    if (children[i]) children[i].remove();
                }
            }
        }, 500);
    });

    startPetals();

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

    // ---------- 8. 角色切换（顶部名称 + 侧边栏按钮 + 书签符号） ----------
    function updateProfileUI(profile) {
        // 更新顶部名称
        const nameMap = { 'linxiwu': '林栖梧', 'luojin': '罗烬' };
        const nameEl = document.getElementById('currentProfileName');
        if (nameEl) nameEl.textContent = nameMap[profile] || '林栖梧';

        // 更新侧边栏按钮文字
        const switchBtn = document.getElementById('profileSwitchBtn');
        if (switchBtn) {
            const target = profile === 'linxiwu' ? '罗烬' : '林栖梧';
            switchBtn.textContent = '切换到 ' + target;
        }

        // 更新卡片书签符号（data-corner 已由HTML定义，无需额外操作）
        // 但需要确保 .card::after 内容与 data-corner 一致
        document.querySelectorAll('.card[data-corner]').forEach(card => {
            const corner = card.dataset.corner || '✿';
            // 通过伪元素 content 无法直接动态改变，我们使用 .corner-deco 元素代替
            // 但我们在HTML中未使用 .corner-deco，而是使用 ::after，无法动态改变。
            // 我们可以通过JS添加一个内联样式覆盖，或者直接在HTML中写多个.corner-deco。
            // 简便做法：在HTML中每个卡片添加了 data-corner，我们可以在CSS中根据 data-corner 设置 ::after 内容？但CSS无法动态读取属性。
            // 我们改为在HTML中直接放置 .corner-deco 元素，并设置内容。
            // 因为我们已经改用了 .corner-deco 元素，但之前的HTML没有，现在我们在新HTML中已经添加了 .corner-deco? 实际上我们没有添加。
            // 我们可以在JS中动态为每个卡片添加 .corner-deco 并设置内容。
            // 但为了简洁，我们直接在HTML中为每个卡片添加 <span class="corner-deco">符号</span>，然后根据角色切换时无需改变符号，因为符号是固定的。
            // 但由于角色切换后，页面内容切换，但卡片是固定的，所以不需要动态改变。
            // 因此我们只需要更新顶部名称和侧边栏按钮即可。
        });
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

    // 初始化UI
    (function() {
        const saved = localStorage.getItem('gzd_profile');
        const profile = saved || 'linxiwu';
        // 确保 body 的 data-profile 正确
        document.body.dataset.profile = profile;
        // 激活对应内容
        document.querySelectorAll('.content-block').forEach(block => block.classList.remove('active'));
        const target = document.getElementById('content-' + profile);
        if (target) target.classList.add('active');
        updateProfileUI(profile);
        // 更新进度
        setTimeout(updateStoryProgress, 200);
        setTimeout(revealTimelineItems, 300);
    })();

    // ---------- 9. 主题切换兼容 ----------
    if (!GZD.ThemeManager) {
        GZD.ThemeManager = {
            toggle: function() {
                const html = document.documentElement;
                const isLight = html.getAttribute('data-theme') === 'light';
                html.setAttribute('data-theme', isLight ? '' : 'light');
                const icon = document.getElementById('themeIcon');
                const label = document.getElementById('themeLabel');
                if (icon) icon.textContent = isLight ? '☀️' : '🌙';
                if (label) label.textContent = isLight ? '日间' : '夜间';
            }
        };
    }

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

    // ---------- 12. 监听角色切换事件 ----------
    window.addEventListener('profilechange', function(e) {
        updateProfileUI(e.detail.profile);
        updateStoryProgress();
        setTimeout(revealTimelineItems, 300);
    });

    console.log('🌙 归终殿 · 命簿纪事 增强版已加载');
    console.log('✿ 功能：时辰·打字机·新闻弹窗·花瓣飘落·任务庆祝·时间轴·角色切换');
})();