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
            init: function() { var t = GZD.Storage.getTheme(), h = document.documentElement; if (t === 'light') h.setAttribute('data-theme', 'light'); else h.removeAttribute('data-theme'); },
            toggle: function() { var isLight = document.documentElement.getAttribute('data-theme') === 'light', h = document.documentElement; if (isLight) h.removeAttribute('data-theme'); else h.setAttribute('data-theme', 'light'); GZD.Storage.set('theme', { value: isLight ? 'dark' : 'light' }); }
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
    window.addEventListener('profilechange', function(e) { updateProfileUI(e.detail.profile);
        updateAllUI(e.detail.profile);
        // 金字塔动画由 IntersectionObserver 跟随卡片显隐自动触发/重置，无需手动重挂
    });

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

    var PLAYER_DATA = {
        linxiwu: {
            name: '林栖梧',
            level: '统修期',
            power: 60.8,
            stats: [55, 35, 80, 45, 70, 80],
            nextLevel: '入门期',
            nextNeed: 500,
            grade: '甲等下品',
            rank: 60.8,
            max: 100,
            symbol: '❀'
        },
        luojin: {
            name: '罗烬',
            level: '统修期',
            power: 67.5,
            stats: [60, 85, 75, 60, 55, 70],
            nextLevel: '入门期',
            nextNeed: 500,
            grade: '甲等下品',
            rank: 67.5,
            max: 100,
            symbol: '◈'
        }
    };

    var TARGET_DATA = { linxiwu: null, luojin: null };

    function loadTargets() { var stored = GZD.Storage.get('shengxi_targets', {}); if (stored.linxiwu !== undefined) TARGET_DATA.linxiwu = stored.linxiwu; if (stored.luojin !== undefined) TARGET_DATA.luojin = stored.luojin; }
    loadTargets();

    function saveTargets() { GZD.Storage.set('shengxi_targets', { linxiwu: TARGET_DATA.linxiwu,
            luojin: TARGET_DATA.luojin }); }

    var LAYER_INFO = {
        shixi: {
            title: '十席引渡人',
            sub: '0.5% · 10人 · 战力上限 1000+',
            body: '<p>十席引渡人是归终殿的最高战力代表，每一位都经历过无数次生死考验，方得此席位。他们不仅是归终殿的守护者，更是全体弟子的目标与榜样。</p><p style="margin-top:6px;">十席共十人，席位按战力实时排名。挑战者若击败现任十席，即可取代其席位，原十席顺延一位，第十席被挤出前十。</p><p style="margin-top:6px;">十席引渡人均有专属封号，可开坛收徒，传承引渡之法。现任十席名单详见「同僚与十席」页面。</p><p style="margin-top:6px;color:var(--text-muted);font-size:.8rem;"><span class="tag">殿规</span> 对十席引渡人不敬者，轻则罚俸三月，重则逐出归终殿。</p>'
        },
        zhun: {
            title: '准十席级',
            sub: '4.5% · ~90人 · 战力评定 800以上',
            body: '<p>准十席级弟子是归终殿一支极其重要的力量。他们的战力已跨过十席门槛（800+），却因挑战现十席失败而暂居此位。</p><p style="margin-top:6px;">他们离十席只有一步之遥。每人每年有两次挑战十席的机会（春、秋各一次）。准十席级的存在，是对现任十席最大的鞭策与压力——因为稍有不慎，席位便可能易主。</p><p style="margin-top:6px;">准十席级弟子享有特殊待遇：可参与十席议事旁听，可在讲武堂开设辅助课程，亦可申请由十席引渡人进行一对一指导。</p><p style="margin-top:6px;color:var(--text-muted);font-style:italic;">这是归终殿最激烈、最残酷也最令人向往的层级——要么登上十席，要么永远停留在“准”字之上。</p>'
        },
        neimen: {
            title: '内门期弟子',
            sub: '15% · ~300人 · 战力评定 500~800',
            body: '<p>内门期弟子是各院阁的精英，在同辈中出类拔萃。他们多是各院的大师兄、大师姐，已能独立执行大部分引渡任务，是归终殿的中流砥柱。</p><p style="margin-top:6px;">战力值超过800，即可获得挑战十席的资格。每月可预约战力测试，达标后可向殿务司申请挑战资格。</p><p style="margin-top:6px;">内门期弟子通常已修习多年，专精方向明确。符修院、讲武堂、点苍阁、砺峰阁、栖梧阁……每一位内门期弟子都有自己的归属与传承。</p><p style="margin-top:6px;">相比入门期，内门期弟子承担更多的外勤任务与教学职责，是归终殿运转的核心力量。</p>'
        },
        rumen: {
            title: '入门期弟子',
            sub: '60% · ~1200人 · 战力评定 100~500',
            body: '<p>入门期是归终殿最大的群体，约占全殿六成。通过统修考核后，弟子选择专精方向，正式进入各院阁修习，成为归终殿真正的“自己人”。</p><p style="margin-top:6px;">入门期弟子已脱离统修期的“什么都学”阶段，开始深耕自己的专精领域。符修、刀修、枪修、剑修、乐修……三百六十行，各有所长。</p><p style="margin-top:6px;">战力值超过500，即可申请晋升内门期。每月可预约战力测试，达标后向殿务司提出晋升申请。</p><p style="margin-top:6px;">入门期弟子是归终殿最活跃的群体，也是十席引渡人最常亲自指导的对象。归终殿的未来，就在他们之中。</p>'
        },
        tongxiu: {
            title: '统修期弟子',
            sub: '15% · ~300人 · 战力上限 100',
            body: '<p>统修期是新入殿弟子的第一阶段，为期三个月。符法、刀法、阵法、枪法、引渡实务、魂力控制、医药基础——什么都要学，什么都得练。</p><p style="margin-top:6px;">三个月后，通过统修综合考核（六科均≥60分），即可升入入门期。未通过者可补考，三次考核未通过则转为杂役。</p><p style="margin-top:6px;">每月可预约一次战力测试，了解自己的实力变化。统修期虽然短暂，却是每一位引渡人最难忘的时光——因为在这里，你第一次触摸到了“归终殿”三个字的重量。</p><p style="margin-top:6px;color:var(--profile-accent);font-weight:500;">林栖梧与罗烬，目前正处于统修期。</p>'
        },
        zayi: {
            title: '杂役',
            sub: '5% · ~100人 · 无固定战力要求',
            body: '<p>杂役是归终殿最底层的弟子，却绝非“无用之人”。</p><p style="margin-top:6px;">统修期考核三次未通过者，自动转为杂役。魂力资质较弱者，也可主动申请降为杂役。杂役不参与战斗任务，但承担着归终殿大量的日常运转工作——洒扫、采买、文书整理、法器养护……没有杂役，归终殿便无法正常运转。</p><p style="margin-top:6px;color:var(--text-muted);font-size:.85rem;"><span class="tag">殿规</span> 不可轻视杂役。轻慢杂役者，罚抄殿规百遍；欺凌杂役者，逐出归终殿。</p><p style="margin-top:6px;">杂役虽无战力要求，但若愿努力修炼，仍可重新申请参加统修考核。归终殿的大门，从未对任何人关上。</p><p style="margin-top:6px;color:var(--text-muted);font-style:italic;">杂役，是归终殿最不起眼却最不可缺的一群人。</p>'
        }
    };

    function getLayerKey(profile) {
        var data = PLAYER_DATA[profile];
        if (!data) return 'tongxiu';
        var levelMap = { '杂役': 'zayi', '统修期': 'tongxiu', '入门期': 'rumen', '内门期': 'neimen', '准十席级': 'zhun', '十席': 'shixi' };
        return levelMap[data.level] || 'tongxiu';
    }

    function setText(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; }

    function updatePowerUI(profile) {
        var data = PLAYER_DATA[profile];
        if (!data) return;
        // 【关键修复】林栖梧的ID前缀是 lin-（原代码误写为空字符串，
        // getElementById('-level') 返回 null 导致整个脚本初始化崩溃，
        // 金字塔的滚动动画 Observer 因此从未注册成功）
        var p = profile === 'linxiwu' ? 'lin' : 'luo';
        setText(p + '-level', data.level);
        setText(p + '-grade', data.grade);
        setText(p + '-power', data.power);
        setText(p + '-next', data.nextLevel);
        setText(p + '-next-need', '需 ≥' + data.nextNeed);
        var stats = data.stats;
        var statLabels = ['魂力', '体术', '法术', '防御', '意志', '敏捷'];
        var container = document.getElementById(p + '-six-stat');
        if (container) {
            container.innerHTML = '';
            for (var i = 0; i < stats.length; i++) {
                var el = document.createElement('span');
                el.className = 'stat-item';
                el.innerHTML = '<span class="s-label">' + statLabels[i] + '</span> <span class="s-val">' + stats[i] + '</span>';
                container.appendChild(el);
            }
        }
        var target = TARGET_DATA[profile];
        var targetVal = target && target.value ? target.value : data.nextNeed;
        var progressPct = Math.min(100, (data.power / targetVal) * 100);
        var fill = document.getElementById(p + '-progress-fill');
        var text = document.getElementById(p + '-progress-text');
        var targetLabel = document.getElementById(p + '-progress-target');
        if (fill) fill.style.width = Math.min(100, progressPct) + '%';
        if (text) text.textContent = Math.min(100, progressPct).toFixed(2) + '%';
        if (targetLabel) targetLabel.textContent = '目标 ' + targetVal;
        var statusEl = document.getElementById(p + '-target-status');
        if (statusEl) {
            if (target && target.value) {
                statusEl.textContent = '已设定：' + target.value;
                statusEl.style.color = 'var(--profile-accent)';
            } else {
                statusEl.textContent = '未设定（自动：下一阶门槛）';
                statusEl.style.color = '';
            }
        }
        var input = document.getElementById(p + '-target');
        if (input && target && target.value) {
            input.value = target.value;
        }
    }

    function updatePyramid(profile) {
        var leftId = 'pyramidLeft' + (profile === 'linxiwu' ? 'Lin' : 'Luo');
        var rightId = 'pyramidRight' + (profile === 'linxiwu' ? 'Lin' : 'Luo');
        var left = document.getElementById(leftId);
        var right = document.getElementById(rightId);
        if (!left || !right) return;
        var activeKey = getLayerKey(profile);
        left.querySelectorAll('.pyramid-layer').forEach(function(el) {
            var layer = el.dataset.layer;
            el.classList.toggle('active', layer === activeKey);
        });
        var info = LAYER_INFO[activeKey] || LAYER_INFO.tongxiu;
        right.innerHTML = '<div class="p-title">' + info.title + '</div><div class="p-sub">' + info.sub +
            '</div><div class="p-body">' + info.body + '</div>';
    }

    function updateAllUI(profile) {
        updatePowerUI(profile);
        updatePyramid(profile);
    }

    // ===== 金字塔条形成长动画（滚动到视口才播放，离开视口自动重置，滚回可重播） =====
    var pyramidPlayed = { linxiwu: false, luojin: false };
    var pyramidVisible = { linxiwu: false, luojin: false };
    var pyramidTimers = { linxiwu: [], luojin: [] };

    function pyramidLeftEl(profile) { return document.getElementById(profile === 'linxiwu' ? 'pyramidLeftLin' : 'pyramidLeftLuo'); }
    function pyramidCardEl(profile) { return document.getElementById(profile === 'linxiwu' ? 'pyramidCardLin' : 'pyramidCardLuo'); }

    function clearPyramidTimers(profile) {
        (pyramidTimers[profile] || []).forEach(function(t) { clearTimeout(t); });
        pyramidTimers[profile] = [];
    }

    function resetPyramid(profile) {
        clearPyramidTimers(profile);
        var left = pyramidLeftEl(profile);
        if (!left) return;
        left.querySelectorAll('.pyramid-layer').forEach(function(el) {
            el.classList.remove('animating');
            var bar = el.querySelector('.p-bar');
            if (!bar) return;
            bar.style.transition = 'none';   // 重置时不播放收缩过渡
            bar.style.width = '0%';
        });
        void left.offsetWidth;               // 强制重绘后再恢复过渡
        left.querySelectorAll('.p-bar').forEach(function(bar) { bar.style.transition = ''; });
        pyramidPlayed[profile] = false;
    }

    function animatePyramid(profile) {
        var left = pyramidLeftEl(profile);
        if (!left) return;
        clearPyramidTimers(profile);
        pyramidPlayed[profile] = true;
        left.querySelectorAll('.pyramid-layer').forEach(function(el, index) {
            var targetWidth = parseInt(el.dataset.width, 10) || 30;
            var bar = el.querySelector('.p-bar');
            if (!bar) return;
            bar.style.width = '0%';
            // 从底部开始逐层生长（index 0=十席顶部，5=杂役底部）
            var delay = (5 - index) * 140 + 120;
            pyramidTimers[profile].push(setTimeout(function() {
                bar.style.width = targetWidth + '%';   // 宽度过渡由 CSS transition 完成
            }, delay));
        });
    }

    // 可见性判定：卡片与视口相交且可见面积 ≥ 卡片面积20%（display:none 时宽高均为0，直接视为不可见）
    function isCardVisible(card) {
        if (!card) return false;
        var rect = card.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var vw = window.innerWidth || document.documentElement.clientWidth;
        var vh_ = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
        var vw_ = Math.min(rect.right, vw) - Math.max(rect.left, 0);
        if (vh_ <= 0 || vw_ <= 0) return false;
        return (vh_ * vw_) / (rect.width * rect.height) >= 0.2;
    }

    // 统一状态机：无论由哪个事件源驱动（IO/scroll/resize/轮询/角色切换），
    // 只在可见状态发生变化时才执行播放或重置，幂等且可互相冗余
    function updatePyramidVisibility() {
        ['linxiwu', 'luojin'].forEach(function(profile) {
            var visible = isCardVisible(pyramidCardEl(profile));
            if (visible === pyramidVisible[profile]) return;
            pyramidVisible[profile] = visible;
            if (visible) {
                if (!pyramidPlayed[profile]) animatePyramid(profile);
            } else {
                resetPyramid(profile);
            }
        });
    }

    function initPyramidObserver() {
        var cards = [pyramidCardEl('linxiwu'), pyramidCardEl('luojin')].filter(Boolean);
        if (!cards.length) return;
        if (!('IntersectionObserver' in window)) {
            // 老浏览器兜底：不播动画，直接显示最终宽度
            ['linxiwu', 'luojin'].forEach(function(pf) {
                var left = pyramidLeftEl(pf);
                if (!left) return;
                left.querySelectorAll('.pyramid-layer').forEach(function(el) {
                    var bar = el.querySelector('.p-bar');
                    if (bar) bar.style.width = (parseInt(el.dataset.width, 10) || 30) + '%';
                });
            });
            return;
        }
        // 驱动源一：IntersectionObserver（同时监控林/罗两张卡片，
        // 切换角色时 display:none↔block 的显隐也会触发）
        var io = new IntersectionObserver(function() { updatePyramidVisibility(); }, { threshold: 0.2 });
        cards.forEach(function(c) { io.observe(c); });
        // 驱动源二：scroll/resize（rAF 节流），防止 IO 事件丢失或延迟
        var ticking = false;
        var onScroll = function() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function() { ticking = false; updatePyramidVisibility(); });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        // 驱动源三：兜底轮询（350ms），保证任何情况下都能触发
        setInterval(updatePyramidVisibility, 350);
        // 初始判定一次（首屏就可见时立即播放）
        updatePyramidVisibility();
    }

    // ===== 金字塔点击切换详情 =====
    document.querySelectorAll('.pyramid-left').forEach(function(left) {
        left.querySelectorAll('.pyramid-layer').forEach(function(el) {
            el.addEventListener('click', function() {
                var profile = this.closest('.content-block').id === 'content-linxiwu' ? 'linxiwu' :
                'luojin';
                var layer = this.dataset.layer;
                var info = LAYER_INFO[layer];
                if (!info) return;
                var rightId = 'pyramidRight' + (profile === 'linxiwu' ? 'Lin' : 'Luo');
                var right = document.getElementById(rightId);
                if (right) {
                    right.innerHTML = '<div class="p-title">' + info.title + '</div><div class="p-sub">' + info
                        .sub + '</div><div class="p-body">' + info.body + '</div>';
                }
                this.closest('.pyramid-left').querySelectorAll('.pyramid-layer').forEach(function(l) {
                    l.classList.toggle('active', l === el);
                });
            });
        });
    });

    // ===== 目标战力设定 =====
    document.querySelectorAll('.btn-sm').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var profile = this.id.indexOf('lin') !== -1 ? 'linxiwu' : 'luojin';
            // 【同款bug修复】这里原来也写成 '' : 'luo'，导致林栖梧的设定按钮
            // 找不到 lin-target 输入框而报错（Cannot read properties of null）
            var p = profile === 'linxiwu' ? 'lin' : 'luo';
            var input = document.getElementById(p + '-target');
            if (!input) return;
            var val = parseFloat(input.value);
            if (isNaN(val) || val < 0) { return; }
            TARGET_DATA[profile] = { value: val };
            saveTargets();
            updatePowerUI(profile);
        });
    });

    document.querySelectorAll('.target-row input').forEach(function(input) {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                var btn = this.parentElement.querySelector('.btn-sm');
                if (btn) btn.click();
            }
        });
    });

    // ===== 初始化 =====
    updateAllUI('linxiwu');
    updateAllUI('luojin');
    // 持续观察两张金字塔卡片：滚到视口才播放，加载时不可见则不会播放
    initPyramidObserver();

    console.log('✶ 归终殿 · 升席纪事 v3.2（修复金字塔滚动动画：ID前缀崩溃 + 三重触发保障 + 离屏重置可重播）');
})();