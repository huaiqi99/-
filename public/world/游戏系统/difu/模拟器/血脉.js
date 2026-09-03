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
        // 重新渲染节点（切换角色时重新生成对应的曲线）
        renderAllVines(e.detail.profile);
    });

    // ===== 2. 台词数据 =====
    var VINE_DATA = {
        linxiwu: {
            // 淮棋线：林淮 & 栾方棋（从初识到成亲）
            hua: [
                { side: 'right', quote: '「既然有名字，你以后就叫林淮。」', speaker: '秦墨予 · 国师府初识' },
                { side: 'left', quote: '「我只是想见你。」', speaker: '林淮 · 柳州山洞' },
                { side: 'right', quote: '「白头空负三生意，\n犹记寒阶共雪温。」', speaker: '林淮 · 雪中宫门' },
                { side: 'left', quote: '「我来送你最后一程。」', speaker: '林淮 · 人间宅院' },
                { side: 'right', quote: '「每一段走过的黄泉路，\n都将铸就独一无二的你。」', speaker: '栾方棋 · 浮生树低语' },
                { side: 'left', quote: '「只要我的灵魂还留在这世界上一天，\n你就不会只是一个人。」', speaker: '林淮 · 归终殿' },
                { side: 'right', quote: '「我爱你，方棋。」', speaker: '林淮 · 浮生树下' },
                { side: 'left', quote: '「一荣俱荣，一损俱损。」', speaker: '栾方棋 · 归终殿成亲' }
            ],
            // 修璟线：罗修 & 魏元璟
            xiu: [
                { side: 'right', quote: '「罗修！落月宫你这辈子都赔不起！！」', speaker: '魏元璟 · 东宫初遇' },
                { side: 'left', quote: '「本宫登基了，\n天天给你备着最好的酒。」', speaker: '魏元璟 · 宫外酒馆' },
                { side: 'right', quote: '「你还想要酒吗？」', speaker: '魏元璟 · 长忆宫死别' },
                { side: 'left', quote: '「师父，你想喝酒吗？」', speaker: '念安 · 忘川重生' },
                { side: 'right', quote: '「你姓魏。\n以后，就叫魏元璟。」', speaker: '罗修 · 小院相认' },
                { side: 'left', quote: '「不悔。」', speaker: '魏元璟 · 枕下字条' },
                { side: 'right', quote: '「我爱你。\n不是对过去的补偿。\n我爱的是你，只是你。」', speaker: '罗修 · 告白' },
                { side: 'left', quote: '「魂火为鉴，永生不离。」', speaker: '罗修 · 归终殿成亲' }
            ]
        },
        luojin: {
            hua: [
                { side: 'right', quote: '「既然有名字，你以后就叫林淮。」', speaker: '秦墨予 · 国师府初识' },
                { side: 'left', quote: '「我只是想见你。」', speaker: '林淮 · 柳州山洞' },
                { side: 'right', quote: '「白头空负三生意，\n犹记寒阶共雪温。」', speaker: '林淮 · 雪中宫门' },
                { side: 'left', quote: '「我来送你最后一程。」', speaker: '林淮 · 人间宅院' },
                { side: 'right', quote: '「每一段走过的黄泉路，\n都将铸就独一无二的你。」', speaker: '栾方棋 · 浮生树低语' },
                { side: 'left', quote: '「只要我的灵魂还留在这世界上一天，\n你就不会只是一个人。」', speaker: '林淮 · 归终殿' },
                { side: 'right', quote: '「我爱你，方棋。」', speaker: '林淮 · 浮生树下' },
                { side: 'left', quote: '「一荣俱荣，一损俱损。」', speaker: '栾方棋 · 归终殿成亲' }
            ],
            xiu: [
                { side: 'right', quote: '「罗修！落月宫你这辈子都赔不起！！」', speaker: '魏元璟 · 东宫初遇' },
                { side: 'left', quote: '「本宫登基了，\n天天给你备着最好的酒。」', speaker: '魏元璟 · 宫外酒馆' },
                { side: 'right', quote: '「你还想要酒吗？」', speaker: '魏元璟 · 长忆宫死别' },
                { side: 'left', quote: '「师父，你想喝酒吗？」', speaker: '念安 · 忘川重生' },
                { side: 'right', quote: '「你姓魏。\n以后，就叫魏元璟。」', speaker: '罗修 · 小院相认' },
                { side: 'left', quote: '「不悔。」', speaker: '魏元璟 · 枕下字条' },
                { side: 'right', quote: '「我爱你。\n不是对过去的补偿。\n我爱的是你，只是你。」', speaker: '罗修 · 告白' },
                { side: 'left', quote: '「魂火为鉴，永生不离。」', speaker: '罗修 · 归终殿成亲' }
            ]
        }
    };

    // ===== 3. 渲染柳枝节点 =====
    function renderVine(profile, trunkId, data, startSide) {
        var trunk = document.getElementById(trunkId);
        if (!trunk) return;
        // 清空
        trunk.innerHTML = '';
        // 根据数据生成节点
        var nodes = data || [];
        var side = startSide || 'right';
        nodes.forEach(function(item, index) {
            var nodeDiv = document.createElement('div');
            nodeDiv.className = 'vine-node ' + (item.side || side);
            // 交替：如果没指定 side，则自动交替
            if (!item.side) {
                nodeDiv.className = 'vine-node ' + (index % 2 === 0 ? 'right' : 'left');
            }
            // 小圆点
            var dot = document.createElement('span');
            dot.className = 'node-dot';
            nodeDiv.appendChild(dot);
            // 线条容器
            var lineWrap = document.createElement('span');
            lineWrap.className = 'node-line-wrap';
            var line = document.createElement('span');
            line.className = 'node-line';
            lineWrap.appendChild(line);
            nodeDiv.appendChild(lineWrap);
            // 文字
            var textWrap = document.createElement('span');
            textWrap.className = 'node-text';
            var quote = document.createElement('span');
            quote.className = 'node-quote';
            // 处理换行
            var qText = item.quote || '';
            qText = qText.replace(/\\n/g, '\n');
            quote.textContent = qText;
            textWrap.appendChild(quote);
            var speaker = document.createElement('span');
            speaker.className = 'node-speaker';
            var sym = profile === 'linxiwu' ? '❀' : '◈';
            speaker.innerHTML = '<span class="speaker-sym">' + sym + '</span> ' + (item.speaker || '');
            textWrap.appendChild(speaker);
            nodeDiv.appendChild(textWrap);
            trunk.appendChild(nodeDiv);
        });
    }

    function renderAllVines(profile) {
        profile = profile || document.body.getAttribute('data-profile') || 'linxiwu';
        var data = VINE_DATA[profile] || VINE_DATA.linxiwu;
        // 林栖梧视图
        renderVine(profile, 'trunkLin', data.hua, 'right');
        renderVine(profile, 'trunkXiu', data.xiu, 'right');
        // 罗烬视图
        renderVine(profile, 'trunkLinLuo', data.hua, 'right');
        renderVine(profile, 'trunkXiuLuo', data.xiu, 'right');
    }

    // ===== 4. 花瓣特效 =====
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

    // ===== 5. 初始化 =====
    var initialProfile = document.body.getAttribute('data-profile') || 'linxiwu';
    renderAllVines(initialProfile);

    window.addEventListener('profilechange', function(e) {
        renderAllVines(e.detail.profile);
    });

    console.log('🌙 归终殿 · 血脉羁绊 v1.0 已加载（柳枝式血脉图谱）');
})();