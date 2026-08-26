// ==================== 通用工具 ====================
const Utils = {
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    formatDate(ts) {
        const d = new Date(ts);
        return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }
};

// ==================== 存储管理 ====================
const Storage = {
    KEY_SAVES: 'gzd_saves_v2',
    KEY_SETTINGS: 'gzd_settings_v2',
    KEY_COLLECTION: 'gzd_collection_v2',

    get(key, defaultVal = null) {
        try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : defaultVal; }
        catch(e) { return defaultVal; }
    },
    set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },

    getSaves() { return this.get(this.KEY_SAVES, { slots: Array(5).fill(null), auto: null }); },
    saveSlot(slotId, data) {
        const saves = this.getSaves();
        saves.slots[slotId] = { ...data, slotId, savedAt: Date.now() };
        this.set(this.KEY_SAVES, saves);
    },
    saveAuto(data) {
        const saves = this.getSaves();
        saves.auto = { ...data, savedAt: Date.now() };
        this.set(this.KEY_SAVES, saves);
    },
    loadSlot(slotId) {
        const saves = this.getSaves();
        return slotId === 'auto' ? saves.auto : saves.slots[slotId];
    },
    deleteSlot(slotId) {
        const saves = this.getSaves();
        if (slotId === 'auto') saves.auto = null;
        else saves.slots[slotId] = null;
        this.set(this.KEY_SAVES, saves);
    },

    getSettings() {
        return this.get(this.KEY_SETTINGS, {
            theme: 'light', textSpeed: 30, bgmVolume: 0.3, sfxVolume: 0.5, autoPlay: false
        });
    },
    saveSettings(settings) { this.set(this.KEY_SETTINGS, { ...this.getSettings(), ...settings }); },

    getCollection() { return this.get(this.KEY_COLLECTION, { keywords: [] }); },
    unlockKeyword(word) {
        const col = this.getCollection();
        if (!col.keywords.includes(word)) { col.keywords.push(word); this.set(this.KEY_COLLECTION, col); }
    },
    isKeywordUnlocked(word) { return this.getCollection().keywords.includes(word); }
};

// ==================== 音频管理 ====================
class AudioManager {
    constructor() {
        this.bgm = new Audio();
        this.bgm.loop = true;
        this.bgmVolume = 0.3;
        this.sfxVolume = 0.5;
        this.currentBgm = null;
        this.initialized = false;
    }
    init() { this.initialized = true; }
    setBgmVolume(v) { this.bgmVolume = v; this.bgm.volume = v; }
    setSfxVolume(v) { this.sfxVolume = v; }
    playBgm(src) {
        if (!this.initialized || !src) return;
        if (this.currentBgm === src) return;
        this.bgm.src = src;
        this.bgm.volume = this.bgmVolume;
        this.bgm.load();
        this.bgm.play().catch(()=>{});
        this.currentBgm = src;
    }
    stopBgm() { this.bgm.pause(); this.currentBgm = null; }
    toggleBgm() {
        if (!this.initialized) { this.init(); return true; }
        if (this.bgm.paused) {
            if (this.currentBgm) { this.bgm.play().catch(()=>{}); return true; }
            return false;
        } else {
            this.bgm.pause(); return false;
        }
    }
    isBgmPlaying() { return this.initialized && !this.bgm.paused; }
    playSfx(src) {
        if (!this.initialized || this.sfxVolume <= 0 || !src) return;
        const sfx = new Audio(src);
        sfx.volume = this.sfxVolume;
        sfx.play().catch(()=>{});
    }
}

// ==================== 主题管理 ====================
const ThemeManager = {
    init() { this.apply(Storage.getSettings().theme); },
    apply(theme) {
        if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
        else document.documentElement.removeAttribute('data-theme');
        Storage.saveSettings({ theme });
        this.updateBtn();
    },
    toggle() { this.apply(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); },
    updateBtn() {
        const btn = document.getElementById('themeBtn');
        const icon = document.getElementById('themeIcon');
        const label = document.getElementById('themeLabel');
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (btn) btn.innerHTML = isDark ? '<span class="icon">☀️</span> 日间' : '<span class="icon">🌙</span> 夜间';
        if (icon) icon.textContent = isDark ? '☀️' : '🌙';
        if (label) label.textContent = isDark ? '日间' : '夜间';
    }
};

// ==================== 游戏引擎 ====================
const GameEngine = {
    script: [], keywords: {}, sceneMap: {}, bgmMap: {},
    chapterName: '', chapterId: '',
    currentIdx: 0, historyStack: [],
    isTyping: false, typeTimer: null,
    isChoiceActive: false, isEnded: false,
    autoPlay: false, autoPlayTimer: null,
    textSpeed: 30, audio: null,
    logEntries: [],

    init(options = {}) {
        this.script = options.script || [];
        this.keywords = options.keywords || {};
        this.sceneMap = options.sceneMap || {};
        this.bgmMap = options.bgmMap || {};
        this.chapterName = options.chapterName || '未知章节';
        this.chapterId = options.chapterId || 'unknown';

        const s = Storage.getSettings();
        this.textSpeed = s.textSpeed || 30;
        this.autoPlay = s.autoPlay || false;

        this.audio = new AudioManager();
        this.initDOM();
        ThemeManager.init();
        this.updateAutoPlayUI();
        this.showStep(0);

        const unlock = () => { this.audio.init(); this.checkBgm(); document.removeEventListener('click', unlock); };
        document.addEventListener('click', unlock);
    },

    initDOM() {
        this.dom = {
            narrationBox: document.getElementById('narrationBox'),
            narrationText: document.getElementById('narrationText'),
            choiceBox: document.getElementById('choiceBox'),
            dialogueBox: document.getElementById('dialogueBox'),
            speakerLabel: document.getElementById('speakerLabel'),
            dialogueText: document.getElementById('dialogueText'),
            clickLayer: document.getElementById('clickLayer'),
            clickHint: document.getElementById('clickHint'),
            stepBackBtn: document.getElementById('stepBackBtn'),
            sceneTag: document.getElementById('sceneTag'),
            progressFill: document.getElementById('progressFill'),
            progressText: document.getElementById('progressText'),
            logList: document.getElementById('logList'),
            autoPlayToggle: document.getElementById('autoPlayToggle'),
            autoPlayIcon: document.getElementById('autoPlayIcon')
        };
    },

    showStep(idx) {
        if (idx < 0 || idx >= this.script.length) return;
        if (this.historyStack[this.historyStack.length - 1] !== idx) this.historyStack.push(idx);
        this.currentIdx = idx;
        const node = this.script[idx];
        if (node.type === 'jump') { this.showStep(node.next); return; }

        this.isChoiceActive = false; this.isEnded = false;
        this.clickHintHide(); this.clickLayerEnable();
        this.dom.choiceBox.classList.remove('active');
        this.dom.choiceBox.innerHTML = '';
        this.isTyping = false; clearTimeout(this.typeTimer);
        if (this.autoPlayTimer) clearTimeout(this.autoPlayTimer);

        this.updateProgress(); this.updateSceneTag(); this.checkBgm();
        this.updateStepBackBtn();
        this.addLogEntry(node);

        if (node.type === 'narration') this.renderNarration(node);
        else if (node.type === 'dialogue') this.renderDialogue(node);
        else if (node.type === 'choice') this.renderChoice(node);
    },

    renderNarration(node) {
        this.dom.dialogueBox.classList.remove('active');
        this.dom.narrationBox.classList.remove('hidden');
        this.dom.narrationText.innerHTML = this.highlightKeywords(node.text);
        this.dom.narrationText.classList.remove('show');
        void this.dom.narrationText.offsetWidth;
        this.dom.narrationText.classList.add('show');

        if (node.ending) {
            this.isEnded = true;
            this.clickLayerDisable();
            this.updateStepBackBtn();
            return;
        }
        setTimeout(() => { if (!this.isChoiceActive && !this.isEnded) this.clickHintShow(); this.scheduleAuto(); }, 600);
    },

    renderDialogue(node) {
        this.dom.dialogueBox.classList.add('active');
        this.dom.speakerLabel.textContent = node.speaker || '未知';

        const plainText = node.text;
        this.dom.dialogueText.innerHTML = '';
        this.isTyping = true; this.clickHintHide();

        let i = 0;
        const typeChar = () => {
            if (!this.isTyping) return;
            if (i < plainText.length) {
                this.dom.dialogueText.textContent = plainText.substring(0, i + 1);
                i++;
                this.typeTimer = setTimeout(typeChar, this.textSpeed);
            } else {
                this.isTyping = false;
                let html = this.highlightKeywords(node.text);
                if (node.inner) html = '<span class="inner-os">' + html + '</span>';
                this.dom.dialogueText.innerHTML = html;
                if (!this.isChoiceActive && !this.isEnded) this.clickHintShow();
                this.scheduleAuto();
            }
        };
        typeChar();
    },

    renderChoice(node) {
        this.isChoiceActive = true;
        this.clickLayerDisable(); this.clickHintHide();
        this.dom.stepBackBtn.classList.remove('show');
        this.dom.choiceBox.classList.add('active');
        this.dom.choiceBox.innerHTML = '';

        node.choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = choice.text;
            btn.onclick = (e) => {
                e.stopPropagation();
                this.dom.choiceBox.classList.remove('active');
                this.saveAutoState();
                this.showStep(choice.next);
            };
            this.dom.choiceBox.appendChild(btn);
        });
    },

    handleClick() {
        if (this.isChoiceActive || this.isEnded) return;
        if (this.isTyping) {
            this.isTyping = false; clearTimeout(this.typeTimer);
            const node = this.script[this.currentIdx];
            if (node.type === 'dialogue') {
                let html = this.highlightKeywords(node.text);
                if (node.inner) html = '<span class="inner-os">' + html + '</span>';
                this.dom.dialogueText.innerHTML = html;
            }
            this.clickHintShow(); this.scheduleAuto(); return;
        }
        const next = this.currentIdx + 1;
        if (next < this.script.length) this.showStep(next);
    },

    goBack() {
        if (this.historyStack.length <= 1) return;
        this.historyStack.pop();
        const prev = this.historyStack[this.historyStack.length - 1];
        this.historyStack.pop();
        this.showStep(prev);
    },

    toggleAutoPlay() {
        this.autoPlay = !this.autoPlay;
        Storage.saveSettings({ autoPlay: this.autoPlay });
        this.updateAutoPlayUI();
        if (this.autoPlay && !this.isTyping && !this.isChoiceActive && !this.isEnded) this.scheduleAuto();
        else if (!this.autoPlay && this.autoPlayTimer) clearTimeout(this.autoPlayTimer);
    },
    updateAutoPlayUI() {
        if (!this.dom.autoPlayIcon) return;
        this.dom.autoPlayIcon.textContent = this.autoPlay ? '⏸' : '▶';
        if (this.dom.autoPlayToggle) this.dom.autoPlayToggle.classList.toggle('active', this.autoPlay);
    },
    scheduleAuto() {
        if (!this.autoPlay || this.isTyping || this.isChoiceActive || this.isEnded) return;
        if (this.autoPlayTimer) clearTimeout(this.autoPlayTimer);
        this.autoPlayTimer = setTimeout(() => {
            if (this.autoPlay && !this.isTyping && !this.isChoiceActive && !this.isEnded) this.handleClick();
        }, 2200);
    },

    clickHintShow() { if (this.dom.clickHint) this.dom.clickHint.classList.add('show'); },
    clickHintHide() { if (this.dom.clickHint) this.dom.clickHint.classList.remove('show'); },
    clickLayerDisable() { if (this.dom.clickLayer) this.dom.clickLayer.classList.add('disabled'); },
    clickLayerEnable() { if (this.dom.clickLayer) this.dom.clickLayer.classList.remove('disabled'); },
    updateStepBackBtn() {
        if (!this.dom.stepBackBtn) return;
        if (this.historyStack.length > 1) this.dom.stepBackBtn.classList.add('show');
        else this.dom.stepBackBtn.classList.remove('show');
    },
    updateProgress() {
        if (!this.dom.progressFill) return;
        const total = this.script.length;
        const pct = total > 1 ? Math.round((this.currentIdx / (total - 1)) * 100) : 0;
        this.dom.progressFill.style.width = pct + '%';
        if (this.dom.progressText) this.dom.progressText.textContent = pct + '%';
    },
    updateSceneTag() {
        if (!this.dom.sceneTag) return;
        for (let i = this.currentIdx; i >= 0; i--) {
            if (this.sceneMap[i]) { this.dom.sceneTag.textContent = this.sceneMap[i]; return; }
        }
        this.dom.sceneTag.textContent = '🏮 未知场景';
    },
    checkBgm() {
        if (!this.audio) return;
        for (let i = this.currentIdx; i >= 0; i--) {
            if (this.bgmMap[i]) { this.audio.playBgm(this.bgmMap[i]); this.updateBgmBtn(); return; }
        }
    },

    highlightKeywords(text) {
        let html = Utils.escapeHtml(text);
        for (const word in this.keywords) {
            const re = new RegExp(word.replace(/[.*+?^${}()|[\]\]/g, '\$&'), 'g');
            html = html.replace(re, `<span class="keyword" onclick="GameEngine.showDict('${word}')">${word}</span>`);
        }
        return html;
    },
    showDict(word) {
        const info = this.keywords[word]; if (!info) return;
        Storage.unlockKeyword(word);
        const ov = document.getElementById('dictOverlay');
        const card = document.getElementById('dictCard');
        if (!ov || !card) return;
        document.getElementById('dictTitle').textContent = word;
        document.getElementById('dictContent').innerHTML = info.desc;
        document.getElementById('dictStatus').textContent = Storage.isKeywordUnlocked(word) ? '【已收录】' : '【新词条】';
        ov.classList.add('show');
    },
    closeDict() { document.getElementById('dictOverlay')?.classList.remove('show'); },

    addLogEntry(node) {
        let entry = { type: node.type, text: '' };
        if (node.type === 'narration') entry.text = node.text;
        else if (node.type === 'dialogue') entry.text = (node.speaker || '未知') + '：' + node.text;
        else if (node.type === 'choice') entry.text = '【选项】' + node.choices.map(c => c.text).join(' / ');
        else return;
        this.logEntries.push(entry);
    },
    renderLog() {
        if (!this.dom.logList) return;
        this.dom.logList.innerHTML = this.logEntries.map((e, i) => {
            if (e.type === 'narration') return `<div class="log-entry"><div class="log-text" style="text-indent:2em;">${Utils.escapeHtml(e.text)}</div></div>`;
            if (e.type === 'dialogue') {
                const parts = e.text.split('：');
                return `<div class="log-entry"><div class="log-speaker">${Utils.escapeHtml(parts[0])}</div><div class="log-text">${Utils.escapeHtml(parts.slice(1).join('：'))}</div></div>`;
            }
            return `<div class="log-entry"><div class="log-text" style="color:var(--accent);font-size:0.85rem;">${Utils.escapeHtml(e.text)}</div></div>`;
        }).join('');
        this.dom.logList.scrollTop = this.dom.logList.scrollHeight;
    },
    toggleLog() {
        const p = document.getElementById('logPanel');
        const o = document.getElementById('logOverlay');
        if (!p) return;
        const open = p.classList.contains('open');
        if (open) { p.classList.remove('open'); o?.classList.remove('show'); }
        else { this.renderLog(); p.classList.add('open'); o?.classList.add('show'); }
    },
    closeLog() {
        document.getElementById('logPanel')?.classList.remove('open');
        document.getElementById('logOverlay')?.classList.remove('show');
    },

    getCurrentState() {
        const node = this.script[this.currentIdx];
        let preview = '';
        if (node) {
            if (node.type === 'narration') preview = node.text.substring(0, 28) + '…';
            else if (node.type === 'dialogue') preview = (node.speaker || '') + '：' + node.text.substring(0, 20) + '…';
            else preview = '选项分支';
        }
        return {
            chapterId: this.chapterId,
            chapterName: this.chapterName,
            nodeIndex: this.currentIdx,
            historyStack: [...this.historyStack],
            sceneTag: this.dom.sceneTag?.textContent || '',
            previewText: preview
        };
    },
    saveAutoState() {
        if (!this.script.length) return;
        Storage.saveAuto(this.getCurrentState());
    },
    openSaveMenu() {
        this.renderSlots('save');
        document.getElementById('savePanelOverlay')?.classList.add('show');
    },
    openLoadMenu() {
        this.renderSlots('load');
        document.getElementById('savePanelOverlay')?.classList.add('show');
    },
    closeSaveMenu() { document.getElementById('savePanelOverlay')?.classList.remove('show'); },
    renderSlots(mode) {
        const grid = document.getElementById('saveSlots');
        const title = document.getElementById('savePanelTitle');
        if (!grid) return;
        title.textContent = mode === 'save' ? '存档管理' : '读档管理';
        const saves = Storage.getSaves();
        grid.innerHTML = '';

        const autoDiv = document.createElement('div');
        autoDiv.className = 'save-slot' + (saves.auto ? '' : ' empty');
        if (saves.auto) {
            autoDiv.innerHTML = `<div style="font-weight:700;color:var(--accent);font-size:0.85rem;">🔄 自动存档</div><div class="slot-time">${Utils.formatDate(saves.auto.savedAt)}</div><div class="slot-preview">${Utils.escapeHtml(saves.auto.previewText || '')}</div>`;
            autoDiv.onclick = () => { if (mode === 'load') this.doLoad('auto'); };
        } else {
            autoDiv.innerHTML = '<div style="padding:8px 0;">无自动存档</div>';
        }
        grid.appendChild(autoDiv);

        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.className = 'save-slot' + (saves.slots[i] ? '' : ' empty');
            if (saves.slots[i]) {
                slot.innerHTML = `<div style="font-weight:700;color:var(--text-primary);font-size:0.85rem;">槽位 ${i + 1}</div><div class="slot-time">${Utils.formatDate(saves.slots[i].savedAt)}</div><div class="slot-preview">${Utils.escapeHtml(saves.slots[i].previewText || '')}</div>`;
                slot.onclick = () => { if (mode === 'save') this.doSave(i); else this.doLoad(i); };
            } else {
                slot.innerHTML = `<div style="padding:8px 0;color:var(--text-muted-light);">槽位 ${i + 1} · 空</div>`;
                if (mode === 'save') slot.onclick = () => this.doSave(i);
            }
            grid.appendChild(slot);
        }
    },
    doSave(slotId) {
        Storage.saveSlot(slotId, this.getCurrentState());
        this.renderSlots('save');
        this.audio?.playSfx('./sfx/save.mp3');
    },
    doLoad(slotId) {
        const data = Storage.loadSlot(slotId);
        if (!data) return;
        if (data.chapterId && data.chapterId !== this.chapterId) {
            const url = `./${data.chapterId}.html?load=${slotId}`;
            window.location.href = url;
            return;
        }
        this.historyStack = data.historyStack ? [...data.historyStack] : [data.nodeIndex];
        this.currentIdx = data.nodeIndex;
        this.logEntries = [];
        for (let i = 0; i <= data.nodeIndex; i++) {
            if (this.script[i] && this.script[i].type !== 'jump') this.addLogEntry(this.script[i]);
        }
        this.isEnded = false;
        this.showStep(data.nodeIndex);
        this.closeSaveMenu();
    },

    openSettings() {
        const s = Storage.getSettings();
        document.getElementById('settingSpeed') && (document.getElementById('settingSpeed').value = s.textSpeed);
        document.getElementById('settingBgm') && (document.getElementById('settingBgm').value = Math.round(s.bgmVolume * 100));
        document.getElementById('settingSfx') && (document.getElementById('settingSfx').value = Math.round(s.sfxVolume * 100));
        document.getElementById('settingsOverlay')?.classList.add('show');
    },
    closeSettings() { document.getElementById('settingsOverlay')?.classList.remove('show'); },
    applySettings() {
        const speed = parseInt(document.getElementById('settingSpeed')?.value || 30);
        const bgm = parseInt(document.getElementById('settingBgm')?.value || 30) / 100;
        const sfx = parseInt(document.getElementById('settingSfx')?.value || 50) / 100;
        this.textSpeed = speed;
        this.audio?.setBgmVolume(bgm);
        this.audio?.setSfxVolume(sfx);
        Storage.saveSettings({ textSpeed: speed, bgmVolume: bgm, sfxVolume: sfx });
        this.closeSettings();
    },

    initMenu() {
        ThemeManager.init();
        this.checkContinue();
        this.renderMenuSaves();
    },
    checkContinue() {
        const saves = Storage.getSaves();
        const has = saves.auto || saves.slots.some(s => s);
        const btn = document.getElementById('btnContinue');
        if (btn) btn.style.display = has ? 'inline-block' : 'none';
    },
    renderMenuSaves() {
        const grid = document.getElementById('menuSaveSlots');
        if (!grid) return;
        const saves = Storage.getSaves();
        grid.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const d = document.createElement('div');
            d.className = 'menu-save-slot' + (saves.slots[i] ? '' : ' empty');
            if (saves.slots[i]) {
                d.innerHTML = `<div style="font-weight:700;font-size:0.85rem;">槽位 ${i+1}</div><div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">${Utils.formatDate(saves.slots[i].savedAt)}</div><div style="font-size:0.8rem;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${Utils.escapeHtml(saves.slots[i].previewText || '')}</div>`;
                d.onclick = () => this.menuLoad(i);
            } else {
                d.innerHTML = `<div style="color:var(--text-muted-light);font-size:0.85rem;">槽位 ${i+1} · 空</div>`;
            }
            grid.appendChild(d);
        }
    },
    menuLoad(slotId) {
        const data = Storage.loadSlot(slotId);
        if (!data || !data.chapterId) return;
        window.location.href = `./${data.chapterId}.html?load=${slotId}`;
    },
    openMenuSave() {
        this.renderMenuSaves();
        document.getElementById('menuSaveOverlay')?.classList.add('show');
    },
    closeMenuSave() { document.getElementById('menuSaveOverlay')?.classList.remove('show'); },
    openMenuCollection() {
        const col = Storage.getCollection();
        const list = document.getElementById('collectionList');
        if (!list) return;
        if (!col.keywords.length) {
            list.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;">暂无收录词条</div>';
        } else {
            list.innerHTML = col.keywords.map(w => {
                const info = this.keywords[w] || { desc: '暂无释义' };
                return `<div class="collection-item"><div class="collection-word">${Utils.escapeHtml(w)}</div><div class="collection-desc">${info.desc}</div></div>`;
            }).join('');
        }
        document.getElementById('collectionOverlay')?.classList.add('show');
    },
    closeMenuCollection() { document.getElementById('collectionOverlay')?.classList.remove('show'); },
    openMenuCredits() { document.getElementById('creditsOverlay')?.classList.add('show'); },
    closeMenuCredits() { document.getElementById('creditsOverlay')?.classList.remove('show'); },
    updateBgmBtn() {
        const icon = document.getElementById('bgmIcon');
        const label = document.getElementById('bgmLabel');
        if (!icon) return;
        const playing = this.audio?.isBgmPlaying();
        icon.textContent = playing ? '🔊' : '🔇';
        if (label) label.textContent = playing ? '暂停' : 'BGM';
        if (icon.parentElement) icon.parentElement.style.opacity = this.audio?.initialized ? '1' : '0.5';
    },
    toggleBgm() {
        if (!this.audio) return;
        const started = this.audio.toggleBgm();
        this.updateBgmBtn();
        if (started && !this.audio.currentBgm) {
            this.checkBgm();
            this.updateBgmBtn();
        }
    }
};
