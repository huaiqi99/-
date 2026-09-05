(function() {
    'use strict';

    // ===== 保底 =====
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

    // ===== 2. 台词数据（对话式，成对出现） =====
    var DATA = {
        linxiwu: {
            hua: [
                { side: 'right', quote: '「我只是想见你。」', speaker: '林淮', color: '#2a6b8a' },
                { side: 'left', quote: '「你……脑子烧傻了吧？」', speaker: '栾方棋', color: '#b05a4a' },
                { side: 'right', quote: '「白头空负三生意，犹记寒阶共雪温。」', speaker: '林淮', color: '#2a6b8a' },
                { side: 'left', quote: '「遥望卿云归雁尽，缘深终作浅痕存。」', speaker: '栾方棋', color: '#b05a4a' },
                { side: 'right', quote: '「只要我的灵魂还留在这世界上一天，你就不会只是一个人。」', speaker: '林淮',
                color: '#2a6b8a' },
                { side: 'left', quote: '「一荣俱荣，一损俱损。」', speaker: '栾方棋', color: '#b05a4a' },
                { side: 'right', quote: '「我爱你，方棋。」', speaker: '林淮', color: '#2a6b8a' },
                { side: 'left', quote: '「……我也是。」', speaker: '栾方棋', color: '#b05a4a' },
            ],
            xiu: [
                { side: 'left', quote: '「罗修！落月宫你这辈子都赔不起！！」', speaker: '魏元璟', color: '#c9a84b' },
                { side: 'right', quote: '「赔？那就不赔了。」', speaker: '罗修', color: '#7b4b8a' },
                { side: 'left', quote: '「你还想要酒吗？」', speaker: '魏元璟', color: '#c9a84b' },
                { side: 'right', quote: '「不要了。」', speaker: '罗修', color: '#7b4b8a' },
                { side: 'left', quote: '「师父，你想喝酒吗？」', speaker: '魏元璟', color: '#c9a84b' },
                { side: 'right', quote: '「……嗯。」', speaker: '罗修', color: '#7b4b8a' },
                { side: 'left', quote: '「不悔。」', speaker: '魏元璟', color: '#c9a84b' },
                { side: 'right', quote: '「魂火为鉴，永生不离。」', speaker: '罗修', color: '#7b4b8a' },
            ]
        },
        luojin: {
            hua: [
                { side: 'right', quote: '「我只是想见你。」', speaker: '林淮', color: '#2a6b8a' },
                { side: 'left', quote: '「你……脑子烧傻了吧？」', speaker: '栾方棋', color: '#b05a4a' },
                { side: 'right', quote: '「白头空负三生意，犹记寒阶共雪温。」', speaker: '林淮', color: '#2a6b8a' },
                { side: 'left', quote: '「遥望卿云归雁尽，缘深终作浅痕存。」', speaker: '栾方棋', color: '#b05a4a' },
                { side: 'right', quote: '「只要我的灵魂还留在这世界上一天，你就不会只是一个人。」', speaker: '林淮',
                color: '#2a6b8a' },
                { side: 'left', quote: '「一荣俱荣，一损俱损。」', speaker: '栾方棋', color: '#b05a4a' },
                { side: 'right', quote: '「我爱你，方棋。」', speaker: '林淮', color: '#2a6b8a' },
                { side: 'left', quote: '「……我也是。」', speaker: '栾方棋', color: '#b05a4a' },
            ],
            xiu: [
                { side: 'left', quote: '「罗修！落月宫你这辈子都赔不起！！」', speaker: '魏元璟', color: '#c9a84b' },
                { side: 'right', quote: '「赔？那就不赔了。」', speaker: '罗修', color: '#7b4b8a' },
                { side: 'left', quote: '「你还想要酒吗？」', speaker: '魏元璟', color: '#c9a84b' },
                { side: 'right', quote: '「不要了。」', speaker: '罗修', color: '#7b4b8a' },
                { side: 'left', quote: '「师父，你想喝酒吗？」', speaker: '魏元璟', color: '#c9a84b' },
                { side: 'right', quote: '「……嗯。」', speaker: '罗修', color: '#7b4b8a' },
                { side: 'left', quote: '「不悔。」', speaker: '魏元璟', color: '#c9a84b' },
                { side: 'right', quote: '「魂火为鉴，永生不离。」', speaker: '罗修', color: '#7b4b8a' },
            ]
        }
    };

    // ===== 3. 绘制一条柳枝图 =====
    function drawVine(svgId, data, centerColor, wave1Color, wave2Color, label) {
        var svg = document.getElementById(svgId);
        if (!svg) return;
        while (svg.firstChild) svg.removeChild(svg.firstChild);

        var ns = 'http://www.w3.org/2000/svg';
        var count = data.length;
        if (count === 0) return;

        var W = 480,
            H = 720;
        var cx = 240;
        var amp = 8; // 波幅 ±8px
        var spacing = 80; // 节点间距
        var startY = 50;
        var endY = startY + (count - 1) * spacing + 30;

        // --- 1. 中心线（粗，主体） ---
        var axis = document.createElementNS(ns, 'line');
        axis.setAttribute('x1', cx);
        axis.setAttribute('y1', startY - 10);
        axis.setAttribute('x2', cx);
        axis.setAttribute('y2', endY);
        axis.setAttribute('stroke', centerColor);
        axis.setAttribute('stroke-width', '4');
        axis.setAttribute('opacity', '0.5');
        axis.setAttribute('stroke-linecap', 'round');
        svg.appendChild(axis);

        // --- 2. 波浪线（贝塞尔曲线，浅淡） ---
        // 生成波形的关键点：每个节点处为波峰/波谷交替
        var points1 = [];
        var points2 = [];
        for (var i = 0; i < count; i++) {
            var y = startY + i * spacing;
            var phase = (i % 2 === 0) ? 1 : -1;
            var x1 = cx + phase * amp;
            var x2 = cx - phase * amp;
            points1.push({ x: x1, y: y });
            points2.push({ x: x2, y: y });
        }

        // 贝塞尔路径：用 C 指令连接
        function buildBezierPath(pts) {
            if (pts.length < 2) return '';
            var d = 'M ' + pts[0].x.toFixed(2) + ',' + pts[0].y.toFixed(2);
            for (var i = 0; i < pts.length - 1; i++) {
                var p0 = pts[i];
                var p1 = pts[i + 1];
                var dy = p1.y - p0.y;
                var cpx = p0.x;
                var cpy = p0.y + dy * 0.5;
                var cpx2 = p1.x;
                var cpy2 = p1.y - dy * 0.5;
                d += ' C ' + cpx.toFixed(2) + ',' + cpy.toFixed(2) + ' ' + cpx2.toFixed(2) + ',' + cpy2.toFixed(2) + ' ' + p1.x
                    .toFixed(2) + ',' + p1.y.toFixed(2);
            }
            return d;
        }

        var path1 = document.createElementNS(ns, 'path');
        path1.setAttribute('d', buildBezierPath(points1));
        path1.setAttribute('stroke', wave1Color);
        path1.setAttribute('stroke-width', '2');
        path1.setAttribute('fill', 'none');
        path1.setAttribute('stroke-linecap', 'round');
        path1.setAttribute('opacity', '0.25');
        path1.setAttribute('class', 'wave-1');
        svg.appendChild(path1);

        var path2 = document.createElementNS(ns, 'path');
        path2.setAttribute('d', buildBezierPath(points2));
        path2.setAttribute('stroke', wave2Color);
        path2.setAttribute('stroke-width', '2');
        path2.setAttribute('fill', 'none');
        path2.setAttribute('stroke-linecap', 'round');
        path2.setAttribute('opacity', '0.25');
        path2.setAttribute('class', 'wave-2');
        svg.appendChild(path2);

        // --- 3. 动态效果（上下平移） ---
        var style = document.createElementNS(ns, 'style');
        style.textContent = `
            .wave-1 { animation: driftUp1 5s ease-in-out infinite alternate; }
            .wave-2 { animation: driftUp2 6s ease-in-out infinite alternate-reverse; }
            @keyframes driftUp1 {
                0% { transform: translateY(-4px); }
                100% { transform: translateY(4px); }
            }
            @keyframes driftUp2 {
                0% { transform: translateY(3px); }
                100% { transform: translateY(-3px); }
            }
        `;
        svg.appendChild(style);

        // --- 4. 节点 + 分支 + 台词 ---
        for (var i = 0; i < count; i++) {
            var item = data[i];
            var y = startY + i * spacing;
            var nodeX = cx;
            var nodeY = y;

            // 节点符号（在中心线上）
            var sym = document.createElementNS(ns, 'text');
            sym.setAttribute('x', nodeX);
            sym.setAttribute('y', nodeY + 4);
            sym.setAttribute('text-anchor', 'middle');
            sym.setAttribute('font-family', '"Georgia","Times New Roman","Songti SC",serif');
            sym.setAttribute('font-size', '22');
            sym.setAttribute('fill', item.color);
            sym.setAttribute('opacity', '0.85');
            var s = (i % 2 === 0) ? '✦' : '✧';
            // 第一个节点用特殊符号
            if (i === 0) s = '❀';
            if (i === count - 1) s = '◈';
            sym.textContent = s;
            svg.appendChild(sym);

            // 分支线（虚线横向伸出）
            var dir = (item.side === 'right') ? 1 : -1;
            var branchLen = 90;
            var bx1 = nodeX,
                by1 = nodeY;
            var bx2 = nodeX + dir * branchLen,
                by2 = nodeY;

            var branch = document.createElementNS(ns, 'line');
            branch.setAttribute('x1', bx1);
            branch.setAttribute('y1', by1);
            branch.setAttribute('x2', bx2);
            branch.setAttribute('y2', by2);
            branch.setAttribute('stroke', item.color);
            branch.setAttribute('stroke-width', '1.2');
            branch.setAttribute('opacity', '0.25');
            branch.setAttribute('stroke-dasharray', '3,5');
            svg.appendChild(branch);

            // 台词（在分支线下方）
            var lines = item.quote.split('\n');
            var fontSize = (lines.length > 1 || item.quote.length > 18) ? 9 : 10.5;
            var lineHeight = fontSize + 2.5;
            var anchor = (dir === 1) ? 'start' : 'end';
            var textX = nodeX + dir * (branchLen * 0.55);
            var textY = nodeY + 16;

            for (var li = 0; li < lines.length; li++) {
                var t = document.createElementNS(ns, 'text');
                t.setAttribute('x', textX);
                t.setAttribute('y', textY + li * lineHeight);
                t.setAttribute('text-anchor', anchor);
                t.setAttribute('font-family', '"Georgia","Times New Roman","Songti SC",serif');
                t.setAttribute('font-size', fontSize);
                t.setAttribute('fill', item.color);
                t.setAttribute('font-style', 'italic');
                t.setAttribute('font-weight', '400');
                t.setAttribute('letter-spacing', '0.2px');
                t.setAttribute('opacity', '0.9');
                t.textContent = lines[li];
                svg.appendChild(t);
            }

            // 说话人
            var sp = document.createElementNS(ns, 'text');
            sp.setAttribute('x', textX);
            sp.setAttribute('y', textY + lines.length * lineHeight + 8);
            sp.setAttribute('text-anchor', anchor);
            sp.setAttribute('font-family', '"Courier New","Source Code Pro",monospace');
            sp.setAttribute('font-size', '7');
            sp.setAttribute('fill', item.color);
            sp.setAttribute('opacity', '0.35');
            sp.setAttribute('letter-spacing', '0.5px');
            sp.textContent = '— ' + item.speaker;
            svg.appendChild(sp);
        }

        // --- 5. 顶部装饰 ---
        var top = document.createElementNS(ns, 'text');
        top.setAttribute('x', cx);
        top.setAttribute('y', 22);
        top.setAttribute('text-anchor', 'middle');
        top.setAttribute('font-size', '14');
        top.setAttribute('fill', centerColor);
        top.setAttribute('opacity', '0.25');
        var topSym = (svgId === 'svgLin' || svgId === 'svgLinLuo') ? '❀' : '◈';
        top.textContent = topSym;
        svg.appendChild(top);

        // --- 6. 底部标签 ---
        var foot = document.createElementNS(ns, 'text');
        foot.setAttribute('x', cx);
        foot.setAttribute('y', H - 8);
        foot.setAttribute('text-anchor', 'middle');
        foot.setAttribute('font-family', '"Courier New","Source Code Pro",monospace');
        foot.setAttribute('font-size', '8');
        foot.setAttribute('fill', centerColor);
        foot.setAttribute('opacity', '0.2');
        foot.setAttribute('letter-spacing', '1.5px');
        foot.textContent = label;
        svg.appendChild(foot);
    }

    // ===== 4. 全部渲染 =====
    function renderAll(profile) {
        profile = profile || document.body.getAttribute('data-profile') || 'linxiwu';
        var data = DATA[profile] || DATA.linxiwu;

        var centerLin = (profile === 'linxiwu') ? '#D49A9A' : '#4E5A64';
        var centerXiu = (profile === 'linxiwu') ? '#D49A9A' : '#4E5A64';

        drawVine('svgLin', data.hua, centerLin, '#2a6b8a', '#b05a4a', '❀ 浮生之契 · 同生共死');
        drawVine('svgXiu', data.xiu, centerXiu, '#7b4b8a', '#c9a84b', '◈ 魂火为鉴 · 永生不离');
        drawVine('svgLinLuo', data.hua, centerLin, '#2a6b8a', '#b05a4a', '❀ 浮生之契 · 同生共死');
        drawVine('svgXiuLuo', data.xiu, centerXiu, '#7b4b8a', '#c9a84b', '◈ 魂火为鉴 · 永生不离');
    }

    // ===== 5. 花瓣 =====
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

    // ===== 6. 初始化 =====
    var initialProfile = document.body.getAttribute('data-profile') || 'linxiwu';
    renderAll(initialProfile);

    window.addEventListener('profilechange', function(e) {
        renderAll(e.detail.profile);
    });

    console.log('🌙 归终殿 · 血脉羁绊 v1.0 已加载');
})();