(function() {
    'use strict';

    if (!window.GZD) {
        window.GZD = {};
        GZD.Storage = {
            get: function(k, d) { try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch (e) { return d; } },
            set: function(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
            getTheme: function() { var r = this.get('theme', null); return r && r.value ? r.value : 'dark'; },
            getProfile: function() { try { return localStorage.getItem('activeProfile') || 'linxiwu'; } catch (e) { return 'linxiwu'; } }
        };
        GZD.ThemeManager = {
            init: function() { var t = GZD.Storage.getTheme(), h = document.documentElement; h.setAttribute('data-theme', t === 'light' ? 'light' : 'dark'); },
            toggle: function() { var isLight = document.documentElement.getAttribute('data-theme') === 'light', h = document.documentElement; h.setAttribute('data-theme', isLight ? 'dark' : 'light'); GZD.Storage.set('theme', { value: isLight ? 'dark' : 'light' }); }
        };
        GZD.ProfileManager = {
            init: function() { var id = GZD.Storage.getProfile(); document.body.setAttribute('data-profile', id); document.querySelectorAll('.content-block').forEach(function(b) { b.classList.toggle('active', b.id === 'content-' + id); }); },
            switch: function(id) { document.body.setAttribute('data-profile', id); document.querySelectorAll('.content-block').forEach(function(b) { b.classList.remove('active'); if (b.id === 'content-' + id) b.classList.add('active'); }); localStorage.setItem('activeProfile', id); window.dispatchEvent(new CustomEvent('profilechange', { detail: { profile: id } })); }
        };
        GZD.Sidebar = {
            open: false,
            toggle: function() { this.open = !this.open; var p = document.getElementById('sidebarPanel'), o = document.getElementById('sidebarOverlay'); if (p) p.classList.toggle('open', this.open); if (o) o.classList.toggle('show', this.open); document.body.classList.toggle('no-scroll', this.open); },
            close: function() { if (this.open) { this.open = false; var p = document.getElementById('sidebarPanel'), o = document.getElementById('sidebarOverlay'); if (p) p.classList.remove('open'); if (o) o.classList.remove('show'); document.body.classList.remove('no-scroll'); } }
        };
        GZD.init = function() { this.ThemeManager.init(); this.ProfileManager.init(); };
        GZD.init();
    }

    document.addEventListener('click', function(e) {
        var t = e.target;
        if (t.closest('.sidebar-tab')) { e.preventDefault();
            GZD.Sidebar.toggle(); return; }
        if (t.id === 'sidebarOverlay') { GZD.Sidebar.close(); return; }
        if (t.closest('.sidebar-panel .close-btn')) { GZD.Sidebar.close(); return; }
        var sb = t.closest('#profileSwitchBtn');
        if (sb) { e.preventDefault();
            e.stopPropagation(); var c = document.body.getAttribute('data-profile') || 'linxiwu';
            GZD.ProfileManager.switch(c === 'linxiwu' ? 'luojin' : 'linxiwu'); return; }
    });

    document.getElementById('themeBtn').addEventListener('click', function() { GZD.ThemeManager.toggle();
        updateThemeBtn(); });

    function updateThemeBtn() { var b = document.getElementById('themeBtn'),
            isLight = document.documentElement.getAttribute('data-theme') === 'light'; if (b) b.innerHTML = '<span id="themeIcon">' + (isLight ? '🌙' : '☀️') + '</span> <span id="themeLabel">' + (isLight ? '夜间' : '日间') + '</span>'; }
    updateThemeBtn();

    function updateProfileUI(profile) { var nameMap = { linxiwu: '林栖梧',
            luojin: '罗烬' },
            nameEl = document.getElementById('currentProfileName'),
            switchBtn = document.getElementById('profileSwitchBtn'); if (nameEl) nameEl.textContent = nameMap[profile] || '林栖梧'; if (switchBtn) switchBtn.textContent = '切换到 ' + (profile === 'linxiwu' ? '罗烬' : '林栖梧'); }
    (function() { var saved = GZD.Storage.getProfile();
        updateProfileUI(saved); })();
    window.addEventListener('profilechange', function(e) { updateProfileUI(e.detail.profile); var p = e.detail.profile;
        updateRiverUI(p);
        initRiverCanvas(p);
        clearStoryDots(p);
        switchWaveProfile(p); });

    var PETAL_CHARS = ['❀', '◈', '✽'],
        petalContainer = document.getElementById('petal-container');
    if (petalContainer) { for (var i = 0; i < 14; i++) { var el = document.createElement('div');
            el.className = 'petal-char';
            el.textContent = PETAL_CHARS[Math.floor(Math.random() * PETAL_CHARS.length)];
            el.style.left = Math.random() * 100 + '%';
            el.style.fontSize = (14 + Math.random() * 12) + 'px';
            el.style.animationDuration = (10 + Math.random() * 10) + 's';
            el.style.animationDelay = (Math.random() * 12) + 's';
            petalContainer.appendChild(el); } }

    var RIVER_DATA = { linxiwu: { pct: 42 },
        luojin: { pct: 38 } };

    function loadRiverData() { var stored = GZD.Storage.get('bloodline_river', {}); if (stored.linxiwu !== undefined) RIVER_DATA.linxiwu.pct = stored.linxiwu.pct || 42; if (stored.luojin !== undefined) RIVER_DATA.luojin.pct = stored.luojin.pct || 38; }
    loadRiverData();

    function saveRiverData() { GZD.Storage.set('bloodline_river', { linxiwu: { pct: RIVER_DATA.linxiwu.pct },
            luojin: { pct: RIVER_DATA.luojin.pct } }); }

    function getStage(pct) { if (pct >= 67) return '繁花盛放'; if (pct >= 34) return '花叶初展'; return '血脉初醒'; }

    function updateRiverUI(profile) { var data = RIVER_DATA[profile]; if (!data) return; var pct = data.pct; var pctEl = document.getElementById('riverPct' + (profile === 'linxiwu' ? 'Lin' : 'Luo')); var stageEl = document.getElementById('riverStage' + (profile === 'linxiwu' ? 'Lin' : 'Luo')); if (pctEl) pctEl.textContent = pct + '%'; if (stageEl) stageEl.textContent = getStage(pct); }

    var ECHO_QUOTES = {
        linxiwu: [
            '「每一段走过的黄泉路，都将铸就独一无二的你。」',
            '「浮生花会谢，但树根记得每一朵花的重量。」',
            '「引渡人不是神，只是愿意在阴阳之间多站一会儿的人。」',
            '「一荣俱荣，一损俱损。」',
            '「魂命相牵，同归同终。」',
            '「灵枢轮回木，便是楚迟最后的遗泽。」',
            '「天纲地常，不可易也；万灵蛰伏，不可违也。」'
        ],
        luojin: [
            '「爱不是什么稀奇玩意，不过是人生存的本能。」',
            '「随便吧，他们的命……又不是我能决定的。」',
            '「要如何……才能赢过一个死人？」',
            '「桃之夭夭，灼灼其华。取个\'景\'字，应景。」',
            '「这三十年，因为我的懦弱和愚蠢让你受了委屈。」',
            '「我活了两千年，有什么是我不懂的？」',
            '「你姓魏，以后就叫魏元璟。」'
        ]
    };

    function isDarkTheme() { return document.documentElement.getAttribute('data-theme') === 'dark'; }

    var DARK_COLOR_MAP = { '#2a6b8a': '#7fb3cf', '#b05a4a': '#d4887a', '#FFB90F': '#ffc63a', '#9370DB': '#b49ae8',
        '#555555': '#9a9086', '#d4a0a8': '#e0b0b8', '#D49A9A': '#eec2c2', '#4E5A64': '#9fb9cf' };

    function themeColor(hex) { if (!hex) return hex; return (isDarkTheme() && DARK_COLOR_MAP[hex]) ? DARK_COLOR_MAP[hex] : hex; }

    function spawnFloatText(profile, text) { var el = document.createElement('div');
        el.className = 'river-float-text';
        el.textContent = text;
        el.style.left = (34 + Math.random() * 30) + '%';
        el.style.top = (46 + Math.random() * 26) + '%';
        el.style.fontSize = (0.85 + Math.random() * 0.2) + 'rem';
        var accent = profile === 'linxiwu' ? '#D49A9A' : '#4E5A64';
        el.style.color = themeColor(accent);
        var wrap = document.getElementById('riverWrap' + (profile === 'linxiwu' ? 'Lin' : 'Luo'));
        if (wrap) { wrap.appendChild(el); } else { document.body.appendChild(el); }
        requestAnimationFrame(function() { el.classList.add('show'); });
        setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 3000); }

    var storyDotInstances = { linxiwu: null,
        luojin: null };

    function clearStoryDots(profile) { var wrap = document.getElementById('riverWrap' + (profile === 'linxiwu' ? 'Lin' : 'Luo')); if (!wrap) return; var existing = wrap.querySelectorAll('.story-dot');
        existing.forEach(function(d) { d.remove(); }); if (storyDotInstances[profile]) { storyDotInstances[profile] = null; } }

    function createStoryDot(profile) {
        clearStoryDots(profile);
        var wrap = document.getElementById('riverWrap' + (profile === 'linxiwu' ? 'Lin' : 'Luo'));
        if (!wrap) return;
        var canvas = wrap.querySelector('canvas');
        if (!canvas) return;
        var rect = canvas.getBoundingClientRect();
        var wrapRect = wrap.getBoundingClientRect();
        var x = 30 + Math.random() * (rect.width - 60);
        var y = 30 + Math.random() * (rect.height - 100);
        var slot = wrap.querySelector('.river-img-slot');
        if (slot) {
            var slotRect = slot.getBoundingClientRect();
            var slotX = slotRect.left - wrapRect.left;
            var slotY = slotRect.top - wrapRect.top;
            var slotW = slotRect.width;
            var slotH = slotRect.height;
            if (x > slotX - 20 && x < slotX + slotW + 20 && y > slotY - 20 && y < slotY + slotH + 20) {
                x = 20 + Math.random() * (rect.width - 80);
                y = 20 + Math.random() * (rect.height - 80);
            }
        }
        var dot = document.createElement('div');
        dot.className = 'story-dot';
        dot.style.left = x + 'px';
        dot.style.top = y + 'px';
        var accent = profile === 'linxiwu' ? '#D49A9A' : '#4E5A64';
        dot.style.setProperty('--profile-accent', accent);
        dot.style.boxShadow = '0 0 30px ' + accent + ', 0 0 60px ' + accent + ', inset 0 0 20px rgba(255,255,255,0.3)';
        var ring1 = document.createElement('div');
        ring1.className = 'dot-ring';
        var ring2 = document.createElement('div');
        ring2.className = 'dot-ring';
        dot.appendChild(ring1);
        dot.appendChild(ring2);
        var stories = STORY_DB[profile] || [];
        var idx = Math.floor(Math.random() * stories.length);
        dot.dataset.index = idx;
        dot.dataset.profile = profile;
        dot.addEventListener('click', function(e) {
            e.stopPropagation();
            var p = this.dataset.profile;
            var i = parseInt(this.dataset.index, 10);
            openStoryModal(p, i);
            this.remove();
            if (storyDotInstances[p] === this) { storyDotInstances[p] = null; }
        });
        wrap.appendChild(dot);
        storyDotInstances[profile] = dot;
    }

    var STORY_DB = {
        linxiwu: [
            { title: '浮生树低语', quote: '每一段走过的黄泉路，每一次艰难的引渡，都将铸就独一无二的你。', source: '浮生树 · 归终殿' },
            { title: '浮生花与根', quote: '浮生花会谢，但树根记得每一朵花的重量。', source: '浮生树 · 归终殿' },
            { title: '引渡人之名', quote: '引渡人不是神，只是愿意在阴阳之间多站一会儿的人。', source: '浮生树 · 归终殿' },
            { title: '魂命相牵', quote: '一荣俱荣，一损俱损。', source: '浮生之契 · 承天殿' },
            { title: '同归同终', quote: '魂命相牵，同归同终。', source: '归终殿 · 成婚礼词' },
            { title: '最后的遗泽', quote: '灵枢轮回木，便是楚迟最后的遗泽。', source: '天命君 · 司衡' },
            { title: '天纲地常', quote: '天纲地常，不可易也；万灵蛰伏，不可违也。', source: '天命君 · 司衡' }
        ],
        luojin: [
            { title: '爱是什么', quote: '爱不是什么稀奇玩意，不过是人生存的本能。', source: '罗修 · 归终殿' },
            { title: '命运之外', quote: '随便吧，他们的命……又不是我能决定的。', source: '罗修 · 森罗殿' },
            { title: '赢过一个死人', quote: '要如何……才能赢过一个死人？', source: '魏元璟 · 归终殿' },
            { title: '桃之夭夭', quote: '桃之夭夭，灼灼其华。取个\'景\'字，应景。', source: '罗修 · 桃林小筑' },
            { title: '三十年的过错', quote: '这三十年，因为我的懦弱和愚蠢让你受了委屈，是我此生最大的过错。', source: '罗修 · 番外' },
            { title: '活了两千年', quote: '我活了两千年，有什么是我不懂的？', source: '白禾川 · 青丘' },
            { title: '你姓魏', quote: '你姓魏，以后就叫魏元璟。', source: '罗修 · 归终殿' }
        ]
    };

    var modal = document.getElementById('storyModal');
    var modalTitle = document.getElementById('modalTitle');
    var modalSub = document.getElementById('modalSub');
    var modalBody = document.getElementById('modalBody');
    var modalClose = document.getElementById('modalClose');

    function openStoryModal(profile, index) { var stories = STORY_DB[profile] || []; var story = stories[index]; if (!story) return;
        modalTitle.textContent = story.title;
        modalSub.textContent = '—— ' + story.source;
        modalBody.innerHTML = '<div class="story-quote">「' + story.quote + '」</div>';
        modal.classList.add('open');
        document.body.style.overflow = 'hidden'; }

    function closeModal() { modal.classList.remove('open');
        document.body.style.overflow = ''; }
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });

    document.querySelectorAll('.river-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var profile = this.dataset.profile;
            var data = RIVER_DATA[profile];
            if (!data) return;
            var gain = 2 + Math.floor(Math.random() * 4);
            data.pct = Math.min(100, data.pct + gain);
            saveRiverData();
            updateRiverUI(profile);
            var quotes = ECHO_QUOTES[profile] || [];
            var quote = quotes[Math.floor(Math.random() * quotes.length)];
            if (quote) spawnFloatText(profile, quote);
            initRiverCanvas(profile);
            createStoryDot(profile);
        });
    });

    var riverRafIds = {};

    function initRiverCanvas(profile) {
        if (riverRafIds[profile]) { cancelAnimationFrame(riverRafIds[profile]); riverRafIds[profile] = null; }
        var canvasId = 'riverCanvas' + (profile === 'linxiwu' ? 'Lin' : 'Luo');
        var canvas = document.getElementById(canvasId);
        if (!canvas) return;
        var wrap = canvas.parentElement;
        var rect = wrap.getBoundingClientRect();
        if (!rect.width || !rect.height) return; /* 隐藏视角跳过：避免回退值600×340污染内联尺寸，显示时由profilechange重建 */
        var dpr = window.devicePixelRatio || 1;
        var w = wrap.clientWidth || rect.width || 600;
        var h = 340; /* 固定为CSS设计高度：双视角/双端完全统一，并杜绝rect含边框导致的每次+2px棘轮膨胀 */
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        var pct = (RIVER_DATA[profile] && RIVER_DATA[profile].pct) || 40;
        var density = 18 + Math.floor((pct / 100) * 40);
        var baseY = h - 12;
        var darkMode = isDarkTheme();
        var accentColor = profile === 'linxiwu' ? (darkMode ? '#eec2c2' : '#D49A9A') : (darkMode ? '#9fb9cf' : '#4E5A64');
        var deepColor = profile === 'linxiwu' ? (darkMode ? '#cf9a9a' : '#a05a5a') : (darkMode ? '#7890a6' : '#2f3a44');
        var accentR = parseInt(accentColor.slice(1, 3), 16);
        var accentG = parseInt(accentColor.slice(3, 5), 16);
        var accentB = parseInt(accentColor.slice(5, 7), 16);
        var darkR = parseInt(deepColor.slice(1, 3), 16);
        var darkG = parseInt(deepColor.slice(3, 5), 16);
        var darkB = parseInt(deepColor.slice(5, 7), 16);
        var brightR = Math.min(255, accentR + 50);
        var brightG = Math.min(255, accentG + 50);
        var brightB = Math.min(255, accentB + 50);
        var midRGB = darkMode ? [accentR, accentG, accentB] : [darkR, darkG, darkB];
        var farRGB = darkMode ? [brightR, brightG, brightB] : [accentR, accentG, accentB];
        var rippleAlphaK = darkMode ? 1.0 : 0.95;
        var rippleBaseOp = darkMode ? 0.15 : 0;
        var rainOpDark = darkMode ? 0.75 : 0.7;
        var rainOpLight = darkMode ? 0.45 : 0.25;
        var rainWDark = darkMode ? 1.8 : 1.6;
        var rainWLight = darkMode ? 1.0 : 0.8;
        var surfAlpha = (darkMode ? 0.10 : 0.05) + (pct / 100) * (darkMode ? 0.08 : 0.07);
        var glowAlpha = (darkMode ? 0.14 : 0.06) + (pct / 100) * (darkMode ? 0.14 : 0.12);
        var rainDrops = [];
        for (var i = 0; i < density; i++) { var isDark = Math.random() < 0.35;
            rainDrops.push({ x: Math.random() * w, y: Math.random() * h * 0.7 - h * 0.2, speed: 1.8 + Math.random() * 3.5,
                length: 5 + Math.random() * 10, opacity: isDark ? rainOpDark + Math.random() * 0.3 : rainOpLight + Math.random() * 0.35,
                isDark: isDark, width: isDark ? rainWDark + Math.random() * 0.6 : rainWLight + Math.random() * 0.6 }); }
        var ripples = [];
        var animationId = null;

        function drawRain() {
            ctx.clearRect(0, 0, w, h);
            var grad = ctx.createLinearGradient(0, h - 24, 0, h);
            grad.addColorStop(0, 'rgba(' + accentR + ',' + accentG + ',' + accentB + ',0)');
            grad.addColorStop(1, 'rgba(' + accentR + ',' + accentG + ',' + accentB + ',' + surfAlpha +
                ')');
            ctx.fillStyle = grad;
            ctx.fillRect(0, h - 24, w, 24);
            for (var i = 0; i < rainDrops.length; i++) {
                var d = rainDrops[i];
                d.y += d.speed;
                if (d.y > baseY) {
                    var baseRadius = 6 + Math.random() * 8;
                    ripples.push({ x: d.x, y: baseY - 2, radius: baseRadius * 0.4, maxRadius: baseRadius * 1.8,
                        opacity: 0.5 + Math.random() * 0.3 + rippleBaseOp, speed: 0.5 + Math.random() * 0.6, layer: 0,
                        life: 0.6 + Math.random() * 0.4 });
                    ripples.push({ x: d.x + (Math.random() - 0.5) * 6, y: baseY - 2 + (Math.random() - 0.5) * 3,
                        radius: baseRadius * 0.7, maxRadius: baseRadius * 2.6, opacity: 0.35 + Math.random() * 0.25 + rippleBaseOp,
                        speed: 0.5 + Math.random() * 0.5, layer: 1, life: 0.6 + Math.random() * 0.4 });
                    ripples.push({ x: d.x + (Math.random() - 0.5) * 12, y: baseY - 2 + (Math.random() - 0.5) * 6,
                        radius: baseRadius * 1.0, maxRadius: baseRadius * 3.6, opacity: 0.18 + Math.random() * 0.15 + rippleBaseOp,
                        speed: 0.4 + Math.random() * 0.4, layer: 2, life: 0.6 + Math.random() * 0.4 });
                    d.y = -Math.random() * 30;
                    d.x = Math.random() * w;
                    d.speed = 1.8 + Math.random() * 3.5;
                    d.length = 5 + Math.random() * 10;
                    d.isDark = Math.random() < 0.35;
                    d.opacity = d.isDark ? rainOpDark + Math.random() * 0.3 : rainOpLight + Math.random() * 0.35;
                    d.width = d.isDark ? rainWDark + Math.random() * 0.6 : rainWLight + Math.random() * 0.6;
                }
                var r = d.isDark ? darkR : accentR;
                var g = d.isDark ? darkG : accentG;
                var b = d.isDark ? darkB : accentB;
                ctx.beginPath();
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x - 0.5, d.y + d.length);
                ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (d.opacity * 0.7) + ')';
                ctx.lineWidth = d.width;
                ctx.stroke();
            }
            for (var i = ripples.length - 1; i >= 0; i--) {
                var r = ripples[i];
                r.radius += r.speed;
                var life = 1 - (r.radius / r.maxRadius);
                if (life <= 0 || r.radius > r.maxRadius) { ripples.splice(i, 1); continue; }
                var baseAlpha = r.opacity * life;
                var alpha = baseAlpha * (r.layer === 0 ? 1.0 : r.layer === 1 ? 0.55 : 0.3);
                var lineW = r.layer === 0 ? 1.6 + (1 - life) * 0.8 : r.layer === 1 ? 1.0 + (1 - life) * 0.5 : 0.6 + (1 -
                    life) * 0.3;
                var cr, cg, cb;
                if (r.layer === 0) { cr = darkR;
                    cg = darkG;
                    cb = darkB; } else if (r.layer === 1) { cr = midRGB[0];
                    cg = midRGB[1];
                    cb = midRGB[2]; } else { cr = farRGB[0];
                    cg = farRGB[1];
                    cb = farRGB[2]; }
                ctx.beginPath();
                ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (alpha * rippleAlphaK) + ')';
                ctx.lineWidth = lineW;
                ctx.stroke();
                if (r.radius > 4 && r.layer !== 2) {
                    ctx.beginPath();
                    ctx.arc(r.x + 1, r.y + 1, r.radius * 0.65, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (alpha * 0.45) + ')';
                    ctx.lineWidth = lineW * 0.5;
                    ctx.stroke();
                }
            }
            for (var i = 0; i < 6 + Math.floor((pct / 100) * 10); i++) {
                var sx = (i / 6) * w + Math.sin(Date.now() / 2000 + i * 2) * 25;
                var sy = h - 6 - Math.sin(Date.now() / 3000 + i * 1.7) * 4;
                var sr = 1.5 + Math.sin(Date.now() / 1500 + i) * 0.8;
                ctx.beginPath();
                ctx.arc(sx, sy, Math.max(0.5, sr), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + accentR + ',' + accentG + ',' + accentB + ',' + glowAlpha +
                ')';
                ctx.fill();
            }
            animationId = requestAnimationFrame(drawRain);
            riverRafIds[profile] = animationId;
        }
        if (animationId) cancelAnimationFrame(animationId);
        drawRain();
        return function() { if (animationId) cancelAnimationFrame(animationId); };
    }

    function getWaveLayout(containerId) {
        var container = document.getElementById(containerId);
        if (!container) return null;
        var isMobile = window.innerWidth < 820;
        var W = Math.max(280, container.clientWidth || 600);
        var cx = W / 2;
        var p = isMobile ? { centerGap: 28, labelGap: 18, speakerOffset: 3, sidePadding: 12, textSize: 13,
            speakerSize: 11, refSize: 9, labelSize: 10, starSize: 18, flowerSize: 18, amp: 11, spacing: 510,
            startY: 40, nodeGap: 32, dashOffset: 16, labelOffset: 18, dialogStartOffset: 14 } : { centerGap: 48,
            labelGap: 58, speakerOffset: 4, sidePadding: 18, textSize: 15, speakerSize: 12, refSize: 10,
            labelSize: 13, starSize: 22, flowerSize: 22, amp: 11, spacing: 510, startY: 50, nodeGap: 42,
            dashOffset: 20, labelOffset: 24, dialogStartOffset: 18 };
        var contentLine = Math.round(p.textSize * 1.42);
        var spOffset = Math.round(p.textSize * 1.3);
        var diffExtra = Math.round(p.textSize * 1.7);
        var availW = cx - p.centerGap - p.speakerOffset - p.sidePadding;
        var maxChars = Math.max(5, Math.floor(availW / p.textSize));
        return { isMobile: isMobile, W: W, cx: cx, textSize: p.textSize, speakerSize: p.speakerSize, refSize: p.refSize,
            labelSize: p.labelSize, starSize: p.starSize, flowerSize: p.flowerSize, amp: p.amp, spacing: p.spacing,
            startY: p.startY, nodeGap: p.nodeGap, dashOffset: p.dashOffset, labelOffset: p.labelOffset,
            dialogStartOffset: p.dialogStartOffset, contentLine: contentLine, spOffset: spOffset,
            diffExtra: diffExtra, centerGap: p.centerGap, labelGap: p.labelGap, speakerOffsetVal: p.speakerOffset,
            sidePadding: p.sidePadding, maxChars: maxChars };
    }

    var waveData = {
        linxiwu: {
            data: [
                { side: 'right', label: '初识 · 国师府', lines: [{ speaker: '林淮', text: '「属下没有名字，只有编号卯九。」',
                        color: '#2a6b8a' }, { speaker: '秦墨予', text: '「你叫什么名字？」', color: '#b05a4a' },
                    { speaker: '秦墨予', text: '「既然有名字，你以后就叫林淮。」', color: '#b05a4a' }
                    ], ref: '——第77章', desc: '秦墨予为林淮取名，给了这个从死士局出来的少年一个真正的身份。' },
                { side: 'left', label: '走近 · 书房教字', lines: [{ speaker: '林淮', text: '「国师大人，这不合规矩。」',
                        color: '#2a6b8a' }, { speaker: '秦墨予', text: '「过来，我教你‘林淮’两个字怎么写。」',
                        color: '#b05a4a' }, { speaker: '秦墨予', text: '「在这里，我就是规矩。」', color: '#b05a4a' }
                    ], ref: '——第77章', desc: '秦墨予执意要教林淮写字，两人关系从此走近。' },
                { side: 'right', label: '第一次动心 · 柳州山洞', lines: [{ speaker: '林淮', text: '「我只是想见你。」',
                        color: '#2a6b8a' }, { speaker: '秦墨予', text: '「你这人脑子烧傻了吧？！」', color: '#b05a4a' }],
                    ref: '——第79章', desc: '林淮在柳州山洞第一次表露心意，秦墨予又羞又恼。' },
                { side: 'left', label: '雪中分别 · 宫门口', lines: [{ speaker: '林淮',
                        text: '「白头空负三生意，犹记寒阶共雪温。」', color: '#2a6b8a' }, { speaker: '秦墨予',
                        text: '「遥望卿云归雁尽，缘深终作浅痕存。」', color: '#b05a4a' }], ref: '——第86章',
                    desc: '大雪中两人以诗相和，彼此心意已明，却不得不分别。' },
                { side: 'right', label: '最后一面 · 国师府', lines: [{ speaker: '林淮', text: '「秦墨予。」',
                        color: '#2a6b8a' }, { speaker: '秦墨予', text: '「如果有一天，我做错了什么……一定要阻止我。」',
                        color: '#b05a4a' }], ref: '——第84章', desc: '秦墨予预感自己将走向歧途，将最后的信任交给了林淮。' },
                { side: 'left', label: '死后初遇 · 人间宅院', lines: [{ speaker: '林淮', text: '「我来送你最后一程。」',
                        color: '#2a6b8a' }, { speaker: '栾方棋', text: '「你是来送我上路的吗？」', color: '#b05a4a' },
                    { speaker: '栾方棋', text: '「谢谢你。」', color: '#b05a4a' }
                    ], ref: '——第90章', desc: '转世后两人再次相遇，林淮认出他是秦墨予，却只能送他一程。' },
                { side: 'right', label: '无涯村重逢 · 竹林', lines: [{ speaker: '林淮', text: '「你……你竟然会这么想。」（笑）',
                        color: '#2a6b8a' }, { speaker: '栾方棋', text: '「……我只是不想给你添麻烦。」',
                        color: '#b05a4a' }], ref: '——第7章', desc: '在无涯村的竹林中，两人终于真正重逢。' },
                { side: 'left', label: '浮生树下 · 告白', lines: [{ speaker: '林淮', text: '「我爱你，方棋。」',
                        color: '#2a6b8a' }, { speaker: '栾方棋', text: '「你是林淮……你是林淮。」', color: '#b05a4a' }],
                    ref: '——第112章', desc: '浮生树下，林淮说出了跨越两百年的告白。' }
            ]
        },
        luojin: {
            data: [
                { side: 'left', label: '初遇 · 东宫', lines: [{ speaker: '魏元璟', text: '「这我知道啊，归终殿、引渡人，对吧？」',
                        color: '#FFB90F' }, { speaker: '罗修', text: '「胆子很大嘛，小子，不怕我把你魂勾了？」',
                        color: '#9370DB' }], ref: '——第25章', desc: '魏元璟还是太子时，初见罗修便口出狂言，毫不畏惧。' },
                { side: 'right', label: '落月宫 · 炸了', lines: [{ speaker: '魏元璟', text: '「落月宫你这辈子都赔不起！！」',
                        color: '#FFB90F' }, { speaker: '罗修', text: '「呵，不赔，你能拿我怎样？」', color: '#9370DB' }],
                    ref: '——第33章', desc: '罗修炸了落月宫，魏元璟气得跳脚，两人从此纠缠不清。' },
                { side: 'left', label: '鬼市 · 偷酒被抓', lines: [{ speaker: '魏元璟',
                        text: '「你又偷钱？堂堂首席引渡人，居然干这种勾当。」', color: '#FFB90F' }, { speaker: '罗修',
                        text: '「这叫劫富济贫。你懂什么。」', color: '#9370DB' }], ref: '——第48章',
                    desc: '罗修在鬼市偷钱买酒，被魏元璟抓个正着。' },
                { side: 'right', label: '长忆宫 · 最后一剑', lines: [{ speaker: '魏元璟',
                        text: '「你还想要……我欠你的酒吗？」', color: '#FFB90F' }, { speaker: '罗修',
                        text: '「不要了。我要你死。」', color: '#9370DB' }], ref: '——第114章',
                    desc: '京城决战，魏元璟被操控与罗修相残，临死前问出那句话。' },
                { side: 'left', label: '重生 · 念安', lines: [{ speaker: '罗修', text: '「你姓魏。以后，就叫魏元璟。」',
                        color: '#9370DB' }, { speaker: '魏元璟', text: '「我……我喜欢念安的名字……师父取的名字……」',
                        color: '#FFB90F' }], ref: '——番外1', desc: '魏元璟残魂与顾执命格融合，化为懵懂少年“念安”。' },
                { side: 'right', label: '师徒 · 教刀', lines: [{ speaker: '罗修', text: '「手腕太僵，脚步虚浮。重练五十遍。」',
                        color: '#9370DB' }, { speaker: '魏元璟', text: '「是！师父！」', color: '#FFB90F' }],
                    ref: '——番外1', desc: '念安时期，罗修亲自教他刀法。少年眼里只有崇拜和依赖。' },
                { side: 'left', label: '恢复记忆 · 醉酒', lines: [{ speaker: '魏元璟',
                        text: '「罗修……你……你还想要我死吗？」（含泪）', color: '#FFB90F' }, { speaker: '罗修',
                        text: '「魏元璟，你喝醉了。」', color: '#9370DB' }], ref: '——番外2',
                    desc: '魏元璟恢复记忆后第一次醉酒，哭着质问罗修。' },
                { side: 'right', label: '千灯会 · 和解', lines: [{ speaker: '罗修', text: '「我陪你看……千灯会。」',
                        color: '#9370DB' }, { speaker: '魏元璟', text: '「不……不用了！」（泪）', color: '#FFB90F' }],
                    ref: '——番外4', desc: '千灯会旁，罗修第一次主动靠近，说出迟来的陪伴。' },
                { side: 'left', label: '告白 · 归终殿', lines: [{ speaker: '罗修',
                        text: '「我爱你。不是对过去的补偿。\n我爱你，只是你，魏元璟。」', color: '#9370DB' },
                    { speaker: '魏元璟', text: '「……」', color: '#FFB90F' }], ref: '——番外5',
                    desc: '罗修终于放下所有顾虑，说出三百年来的心声。' },
                { side: 'right', label: '成亲 · 归终殿', lines: [{ speaker: '罗修',
                        text: '「你是我的璟殿下，是我唯一的爱人。\n此誓，天地为证，魂火为鉴。」', color: '#9370DB' },
                    { speaker: '魏元璟', text: '「随……随便你。」', color: '#FFB90F' }], ref: '——番外5',
                    desc: '归终殿弟子起哄催婚，罗修向魏元璟求亲，魏元璟红着眼眶答应。' }
            ]
        }
    };

    var waveRafIds = {};

    function buildWaveSVG(profile) {
        if (waveRafIds[profile]) { cancelAnimationFrame(waveRafIds[profile]); waveRafIds[profile] = null; }
        var svgId = profile === 'linxiwu' ? 'waveSvgLin' : 'waveSvgLuo';
        var detailId = profile === 'linxiwu' ? 'detailListLin' : 'detailListLuo';
        var scrollId = profile === 'linxiwu' ? 'waveScrollLin' : 'waveScrollLuo';
        var svg = document.getElementById(svgId);
        var detailList = document.getElementById(detailId);
        var scrollContainer = document.getElementById(scrollId);
        if (!svg || !detailList || !scrollContainer) return;
        if (!scrollContainer.getBoundingClientRect().width) return; /* 隐藏视角跳过：避免按600回退宽度排版，切换显示时由switchWaveProfile重建 */
        var data = waveData[profile].data;
        var numNodes = data.length;
        var layout = getWaveLayout(scrollId);
        if (!layout) return;
        var L = layout;
        var nodeYs = [];
        var viewBoxH = 2200;
        var ns = 'http://www.w3.org/2000/svg';

        function wrapText(text, maxChars) {
            var segs = text.split('\n');
            var res = [];
            for (var s = 0; s < segs.length; s++) { var seg = segs[s]; if (seg.length <= maxChars) { res.push(seg);
                    continue; } var cur = ''; for (var i = 0; i < seg.length; i++) { cur += seg[i]; if (cur.length >=
                    maxChars) { var lb = cur.lastIndexOf(' '); if (lb === -1) lb = cur.length;
                    res.push(cur.substring(0, lb));
                    cur = cur.substring(lb).trim(); } } if (cur.length > 0) res.push(cur); }
            return res;
        }

        function computeNodeLayout() {
            nodeYs = [];
            var y = L.startY;
            for (var i = 0; i < numNodes; i++) {
                nodeYs.push(y);
                var block = L.dashOffset + L.labelOffset + L.dialogStartOffset;
                var lastSpeaker = null;
                var lines = data[i].lines;
                for (var j = 0; j < lines.length; j++) {
                    if (lastSpeaker !== null && lastSpeaker !== lines[j].speaker) block += L.diffExtra;
                    block += L.spOffset;
                    block += wrapText(lines[j].text, L.maxChars).length * L.contentLine;
                    block += 6;
                    lastSpeaker = lines[j].speaker;
                }
                block += 10 + L.refSize + 18;
                y += block + L.nodeGap;
            }
            viewBoxH = Math.max(1200, Math.round(y - L.nodeGap + 40));
        }
        computeNodeLayout();
        svg.setAttribute('viewBox', '0 0 ' + L.W + ' ' + viewBoxH);
        svg.style.width = '100%';
        svg.style.height = viewBoxH + 'px';
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        var axisG = document.createElementNS(ns, 'g');
        var waveG = document.createElementNS(ns, 'g');
        var staticG = document.createElementNS(ns, 'g');
        svg.appendChild(axisG);
        svg.appendChild(waveG);
        svg.appendChild(staticG);
        var isLin = profile === 'linxiwu';
        var darkMode = isDarkTheme();
        var color1 = themeColor(isLin ? '#2a6b8a' : '#9370DB');
        var color2 = themeColor(isLin ? '#b05a4a' : '#FFB90F');
        var axisColor = themeColor('#d4a0a8');
        var axis = document.createElementNS(ns, 'line');
        axis.setAttribute('x1', L.cx);
        axis.setAttribute('y1', L.startY);
        axis.setAttribute('x2', L.cx);
        axis.setAttribute('y2', viewBoxH - 20);
        axis.setAttribute('stroke', axisColor);
        axis.setAttribute('stroke-width', 4);
        axis.setAttribute('opacity', '0.5');
        axis.setAttribute('stroke-linecap', 'round');
        axisG.appendChild(axis);
        var pathA = document.createElementNS(ns, 'path');
        pathA.setAttribute('stroke', color1);
        pathA.setAttribute('stroke-width', 2);
        pathA.setAttribute('fill', 'none');
        pathA.setAttribute('stroke-linecap', 'round');
        pathA.setAttribute('opacity', darkMode ? '0.4' : '0.27');
        waveG.appendChild(pathA);
        var pathB = document.createElementNS(ns, 'path');
        pathB.setAttribute('stroke', color2);
        pathB.setAttribute('stroke-width', 2);
        pathB.setAttribute('fill', 'none');
        pathB.setAttribute('stroke-linecap', 'round');
        pathB.setAttribute('opacity', darkMode ? '0.4' : '0.27');
        waveG.appendChild(pathB);
        var phaseA = 0,
            phaseB = Math.PI;

        function generateWavePoints(sign, spacing, amp, phase) { var pts = [],
                step = 4,
                numPoints = Math.floor((viewBoxH + spacing) / step) + 6; for (var i = 0; i < numPoints; i++) { var y = -
                    spacing / 2 + i * step; if (y > viewBoxH + spacing / 2) break; var angle = (y / spacing) * 2 * Math
                    .PI + phase;
                pts.push({ x: L.cx + sign * amp * Math.sin(angle), y: y }); } return pts; }

        function buildBezierPath(pts) { if (pts.length < 2) return ''; var d = 'M ' + pts[0].x.toFixed(2) + ',' + pts[0]
                .y.toFixed(2); for (var i = 0; i < pts.length - 1; i++) { var p0 = pts[i],
                    p1 = pts[i + 1],
                    dy = p1.y - p0.y; if (Math.abs(dy) < 0.3) { d += ' L ' + p1.x.toFixed(2) + ',' + p1.y.toFixed(2);
                    continue; } var cpx = p0.x,
                    cpx2 = p1.x,
                    cpy = p0.y + dy * 0.45,
                    cpy2 = p1.y - dy * 0.45;
                d += ' C ' + cpx.toFixed(2) + ',' + cpy.toFixed(2) + ' ' + cpx2.toFixed(2) + ',' + cpy2.toFixed(2) +
                    ' ' + p1.x.toFixed(2) + ',' + p1.y.toFixed(2); } return d; }

        function renderWaves() {
            pathA.setAttribute('d', buildBezierPath(generateWavePoints(1, L.spacing, L.amp, phaseA)));
            pathB.setAttribute('d', buildBezierPath(generateWavePoints(-1, L.spacing, L.amp, phaseB)));
        }

        function drawDialogBlock(side, lines, ref, baseX, baseY) {
            var anchor = (side === 'left') ? 'end' : 'start';
            var spOff = (side === 'left') ? -L.speakerOffsetVal : L.speakerOffsetVal;
            var currentY = baseY,
                lastSpeaker = null;
            for (var j = 0; j < lines.length; j++) {
                var item = lines[j];
                var isNew = (lastSpeaker !== null && lastSpeaker !== item.speaker);
                if (isNew) currentY += L.diffExtra;
                var sp = document.createElementNS(ns, 'text');
                sp.setAttribute('x', baseX + spOff);
                sp.setAttribute('y', currentY);
                sp.setAttribute('text-anchor', anchor);
                sp.setAttribute('font-family', '"Courier New","Source Code Pro",monospace');
                sp.setAttribute('font-size', L.speakerSize);
                sp.setAttribute('font-weight', '600');
                sp.setAttribute('fill', themeColor(item.color));
                sp.setAttribute('opacity', '0.65');
                sp.setAttribute('letter-spacing', '0.5px');
                sp.textContent = '— ' + item.speaker;
                staticG.appendChild(sp);
                currentY += L.spOffset;
                var lines2 = wrapText(item.text, L.maxChars);
                for (var k = 0; k < lines2.length; k++) {
                    var t = document.createElementNS(ns, 'text');
                    t.setAttribute('x', baseX + spOff);
                    t.setAttribute('y', currentY + k * L.contentLine);
                    t.setAttribute('text-anchor', anchor);
                    t.setAttribute('font-family', '"Georgia","Times New Roman","Songti SC",serif');
                    t.setAttribute('font-size', L.textSize);
                    t.setAttribute('fill', themeColor(item.color));
                    t.setAttribute('font-style', 'italic');
                    t.setAttribute('font-weight', '400');
                    t.setAttribute('opacity', '0.92');
                    t.textContent = lines2[k];
                    staticG.appendChild(t);
                }
                currentY += lines2.length * L.contentLine + 6;
                lastSpeaker = item.speaker;
            }
            var refY = currentY + 10;
            var refEl = document.createElementNS(ns, 'text');
            refEl.setAttribute('x', baseX + spOff);
            refEl.setAttribute('y', refY);
            refEl.setAttribute('text-anchor', anchor);
            refEl.setAttribute('font-family', '"Courier New","Source Code Pro",monospace');
            refEl.setAttribute('font-size', L.refSize);
            refEl.setAttribute('fill', themeColor('#555555'));
            refEl.setAttribute('opacity', '0.6');
            refEl.setAttribute('letter-spacing', '0.3px');
            refEl.textContent = ref;
            staticG.appendChild(refEl);
        }
        for (var i = 0; i < numNodes; i++) {
            var y = nodeYs[i];
            var d = data[i];
            var side = d.side;
            var star = document.createElementNS(ns, 'text');
            star.setAttribute('x', L.cx);
            star.setAttribute('y', y + 6);
            star.setAttribute('text-anchor', 'middle');
            star.setAttribute('font-family', '"Georgia","Times New Roman","Songti SC",serif');
            star.setAttribute('font-size', L.starSize);
            star.setAttribute('fill', axisColor);
            star.setAttribute('opacity', '0.8');
            star.textContent = isLin ? '✦' : '◈';
            staticG.appendChild(star);
            var dashY = y + L.dashOffset;
            if (side === 'left') {
                var dashStart = L.sidePadding;
                var dashEnd = L.cx - 28;
                var flowerX = dashStart + (dashEnd - dashStart) * 0.4;
                var dash = document.createElementNS(ns, 'line');
                dash.setAttribute('x1', dashStart);
                dash.setAttribute('y1', dashY);
                dash.setAttribute('x2', dashEnd);
                dash.setAttribute('y2', dashY);
                dash.setAttribute('stroke', color2);
                dash.setAttribute('stroke-width', 2);
                dash.setAttribute('opacity', '0.5');
                dash.setAttribute('stroke-dasharray', '5,6');
                staticG.appendChild(dash);
                var flower = document.createElementNS(ns, 'text');
                flower.setAttribute('x', flowerX);
                flower.setAttribute('y', dashY + 8);
                flower.setAttribute('text-anchor', 'middle');
                flower.setAttribute('font-family', '"Georgia","Times New Roman","Songti SC",serif');
                flower.setAttribute('font-size', L.flowerSize);
                flower.setAttribute('font-weight', '700');
                flower.setAttribute('fill', color2);
                flower.setAttribute('opacity', '0.85');
                flower.textContent = isLin ? '❀' : '❖';
                staticG.appendChild(flower);
            } else {
                var dashStart2 = L.cx + 28;
                var dashEnd2 = L.W - L.sidePadding;
                var flowerX2 = dashStart2 + (dashEnd2 - dashStart2) * 0.6;
                var dash2 = document.createElementNS(ns, 'line');
                dash2.setAttribute('x1', dashStart2);
                dash2.setAttribute('y1', dashY);
                dash2.setAttribute('x2', dashEnd2);
                dash2.setAttribute('y2', dashY);
                dash2.setAttribute('stroke', color1);
                dash2.setAttribute('stroke-width', 2);
                dash2.setAttribute('opacity', '0.5');
                dash2.setAttribute('stroke-dasharray', '5,6');
                staticG.appendChild(dash2);
                var flower2 = document.createElementNS(ns, 'text');
                flower2.setAttribute('x', flowerX2);
                flower2.setAttribute('y', dashY + 8);
                flower2.setAttribute('text-anchor', 'middle');
                flower2.setAttribute('font-family', '"Georgia","Times New Roman","Songti SC",serif');
                flower2.setAttribute('font-size', L.flowerSize);
                flower2.setAttribute('font-weight', '700');
                flower2.setAttribute('fill', color1);
                flower2.setAttribute('opacity', '0.85');
                flower2.textContent = isLin ? '❀' : '❖';
                staticG.appendChild(flower2);
            }
            var labelY = dashY + L.labelOffset;
            var labelX = (side === 'left') ? L.cx - L.labelGap : L.cx + L.labelGap;
            var anchorLabel = (side === 'left') ? 'end' : 'start';
            var label = document.createElementNS(ns, 'text');
            label.setAttribute('x', labelX);
            label.setAttribute('y', labelY);
            label.setAttribute('text-anchor', anchorLabel);
            label.setAttribute('font-family', '"Courier New","Source Code Pro",monospace');
            label.setAttribute('font-size', L.labelSize);
            label.setAttribute('font-weight', '600');
            label.setAttribute('fill', themeColor('#555555'));
            label.setAttribute('opacity', '0.8');
            label.setAttribute('letter-spacing', '0.8px');
            label.textContent = d.label;
            staticG.appendChild(label);
            var textBaseX = (side === 'left') ? L.cx - L.centerGap : L.cx + L.centerGap;
            var textStartY = labelY + L.dialogStartOffset;
            drawDialogBlock(side, d.lines, d.ref, textBaseX, textStartY);
        }

        function addDir(x, y, text, color) { var t = document.createElementNS(ns, 'text');
            t.setAttribute('x', x);
            t.setAttribute('y', y);
            t.setAttribute('text-anchor', 'middle');
            t.setAttribute('font-family', '"Courier New","Source Code Pro",monospace');
            t.setAttribute('font-size', L.refSize);
            t.setAttribute('fill', color);
            t.setAttribute('opacity', '0.3');
            t.textContent = text;
            staticG.appendChild(t); }
        addDir(L.sidePadding + 8, 20, '↓', color2);
        addDir(L.W - L.sidePadding - 8, 20, '↑', color1);
        renderWaves();
        var lastTime = 0;
        var period = 14.5;

        function animateWave(time) { if (!lastTime) lastTime = time; var delta = (time - lastTime) / 1000;
            lastTime = time; var omega = (2 * Math.PI) / period; var dPhase = delta * omega;
            phaseA += dPhase;
            phaseB -= dPhase; var twoPi = 2 * Math.PI; while (phaseA > twoPi) phaseA -= twoPi; while (phaseA < 0)
                phaseA += twoPi; while (phaseB > twoPi) phaseB -= twoPi; while (phaseB < 0) phaseB += twoPi;
            renderWaves();
            waveRafIds[profile] = requestAnimationFrame(animateWave); }
        waveRafIds[profile] = requestAnimationFrame(animateWave);
        detailList.innerHTML = '';
        var storyData = STORY_DB[profile] || [];
        data.forEach(function(d, idx) {
            var div = document.createElement('div');
            div.className = 'detail-item-w';
            div.dataset.index = idx;
            var label = document.createElement('div');
            label.className = 'label';
            label.textContent = (idx + 1) + '. ' + d.label;
            var preview = document.createElement('div');
            preview.className = 'preview';
            var firstLine = d.lines[0] ? d.lines[0].text.replace(/\n/g, ' ') : '';
            preview.textContent = firstLine.substring(0, 35) + (firstLine.length > 35 ? '…' : '');
            div.appendChild(label);
            div.appendChild(preview);
            div.addEventListener('click', function() {
                var index = parseInt(this.dataset.index);
                var story = storyData[index];
                if (story) { modalTitle.textContent = story.title || d.label;
                    modalSub.textContent = d.ref || '——';
                    modalBody.innerHTML = '<div class="story-quote">';
                    d.lines.forEach(function(l) { modalBody.innerHTML += '<div><span style="font-weight:600;color:' +
                            themeColor(l.color) + ';">' + l.speaker + '</span>：' + l.text.replace(/\n/g, '<br>') +
                        '</div>'; });
                    modalBody.innerHTML += '</div>';
                    if (d.desc) modalBody.innerHTML += '<div class="story-desc">' + d.desc + '</div>';
                    modal.classList.add('open');
                    document.body.style.overflow = 'hidden'; }
                document.querySelectorAll('.detail-item-w').forEach(function(el) { el.classList.remove('active'); });
                this.classList.add('active');
                var scrollContainer = document.getElementById(scrollId);
                if (scrollContainer && nodeYs[index] != null) { scrollContainer.scrollTo({ top: Math.max(0,
                        nodeYs[index] - 60), behavior: 'smooth' }); }
            });
            detailList.appendChild(div);
        });
        var first = detailList.querySelector('.detail-item-w');
        if (first) first.classList.add('active');
        scrollContainer.addEventListener('scroll', function() {
            var st = scrollContainer.scrollTop;
            var found = -1;
            for (var i = 0; i < nodeYs.length; i++) { if (nodeYs[i] - 30 <= st) found = i;
                else break; }
            if (found >= 0) { document.querySelectorAll('.detail-item-w').forEach(function(el) { el.classList.remove(
                    'active'); }); var items = detailList.querySelectorAll('.detail-item-w'); if (items[found])
                    items[found].classList.add('active'); }
        }, { passive: true });
        var items = detailList.querySelectorAll('.detail-item-w');
        items.forEach(function(item, idx) {
            item.addEventListener('mouseenter', function() {
                var star = svg.querySelectorAll('text');
                var count = 0;
                star.forEach(function(el) {
                    if (el.textContent === '✦' || el.textContent === '◈') { if (count === idx) { el
                            .setAttribute('opacity', '1');
                            el.setAttribute('fill', '#FFD700'); }
                        count++; }
                });
                var dashLines = svg.querySelectorAll('line');
                var dashCount = 0;
                dashLines.forEach(function(ln) {
                    if (ln.getAttribute('stroke-dasharray') === '5,6') { if (dashCount === idx) { ln
                            .setAttribute('opacity', '0.9');
                            ln.setAttribute('stroke-width', '3'); }
                        dashCount++; }
                });
            });
            item.addEventListener('mouseleave', function() {
                var star = svg.querySelectorAll('text');
                var count = 0;
                star.forEach(function(el) {
                    if (el.textContent === '✦' || el.textContent === '◈') { if (count === idx) { el
                            .setAttribute('opacity', '0.8');
                            el.setAttribute('fill', axisColor); }
                        count++; }
                });
                var dashLines = svg.querySelectorAll('line');
                var dashCount = 0;
                dashLines.forEach(function(ln) {
                    if (ln.getAttribute('stroke-dasharray') === '5,6') { if (dashCount === idx) { ln
                            .setAttribute('opacity', '0.5');
                            ln.setAttribute('stroke-width', '2'); }
                        dashCount++; }
                });
            });
        });
        items.forEach(function(el, idx) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(8px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            setTimeout(function() {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, 150 + idx * 90);
        });
    }

    function switchWaveProfile(profile) { var svgId = profile === 'linxiwu' ? 'waveSvgLin' : 'waveSvgLuo'; var svg =
            document.getElementById(svgId); if (svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
        buildWaveSVG(profile); }

    var initialProfile = document.body.getAttribute('data-profile') || 'linxiwu';
    updateRiverUI('linxiwu');
    updateRiverUI('luojin');
    setTimeout(function() { initRiverCanvas('linxiwu');
        initRiverCanvas('luojin'); }, 100);
    setTimeout(function() { buildWaveSVG('linxiwu');
        buildWaveSVG('luojin'); }, 150);
    setTimeout(function() { createStoryDot(initialProfile); }, 500);

    var themeDebounce = null;
    if (window.MutationObserver) { var themeObserver = new MutationObserver(function() { clearTimeout(themeDebounce);
        themeDebounce = setTimeout(function() { initRiverCanvas('linxiwu');
            initRiverCanvas('luojin');
            buildWaveSVG('linxiwu');
            buildWaveSVG('luojin'); }, 80); });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); }

    window.addEventListener('profilechange', function(e) { var p = e.detail.profile;
        updateRiverUI(p);
        setTimeout(function() { initRiverCanvas(p); }, 50);
        switchWaveProfile(p);
        setTimeout(function() { createStoryDot(p); }, 300); });

    var resizeTimer;
    window.addEventListener('resize', function() { clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() { initRiverCanvas('linxiwu');
            initRiverCanvas('luojin');
            buildWaveSVG('linxiwu');
            buildWaveSVG('luojin'); }, 300); });

    console.log('❤&#xFE0E;️ 血脉羁绊 · 光点已显眼化');
})();