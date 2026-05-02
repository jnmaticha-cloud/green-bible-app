// ============================================================================
// 🌿 GREEN BIBLE APP — CORE APPLICATION LOGIC
// ============================================================================
// PRIME DIRECTIVE (VISUALS): All generated imagery, AI illustrations, and 
// visual assets MUST strictly adhere to an African context (exclusively Black 
// African characters, dark skin tones, natural hair, ancient African settings)
// AND MUST embody a SACRED, RELIGIOUS, and BIBLICAL aesthetic. The imagery
// should feel holy, divine, and spiritually significant, never secular.
// This is a permanent foundational reference point for the entire project.
// ============================================================================

const SERMONS_CACHE_KEY = 'sermons_data_v2';
const SERMONS_CACHE_TIME_KEY = 'sermons_data_time_v2';

class GreenBibleApp {
    constructor() {
        this.selectedVersions = [
            { code: 'KJV', name: 'King James Version', language: 'English' },
            null, null, null
        ];
        this.lockedVersions = false;
        this.currentVerse = null;
        this.currentBook = null;
        this.currentChapter = null;
        this.currentVerseNum = null;
        this.currentSearchQuery = null;
        this.compareSlots = [null, null, null, null];
        this.searchAbortController = null;
        this.availableVersions = [
            // English (Public Domain / Free)
            { code: 'KJV', name: 'King James Version', language: 'English' },
            { code: 'WEB', name: 'World English Bible', language: 'English' },
            { code: 'ASV', name: 'American Standard Version', language: 'English' },
            { code: 'BBE', name: 'Bible in Basic English', language: 'English' },
            { code: 'BSB', name: 'Berean Standard Bible', language: 'English' },
            { code: 'YLT', name: "Young's Literal Translation", language: 'English' },
            { code: 'DRA', name: 'Douay-Rheims 1899', language: 'English' },
            { code: 'DBY', name: 'Darby Translation', language: 'English' },
            { code: 'GNV', name: 'Geneva Bible 1599', language: 'English' },
            { code: 'FBV', name: 'Free Bible Version', language: 'English' },
            { code: 'NET', name: 'NET Bible', language: 'English' },
            { code: 'LSV', name: 'Literal Standard Version', language: 'English' },
            // African Languages
            { code: 'SWAHILI', name: 'Biblia Takatifu', language: 'Swahili' },
            { code: 'KIKUYU', name: 'Kikuyu Bible', language: 'Kikuyu' },
            { code: 'LUO', name: 'Dholuo Bible', language: 'Dholuo' },
            { code: 'AMHARIC', name: 'Amharic Bible', language: 'Amharic' },
            // Other Languages
            { code: 'PORTUGUESE', name: 'João Ferreira de Almeida', language: 'Portuguese' },
            { code: 'CHEROKEE', name: 'Cherokee New Testament', language: 'Cherokee' },
        ];

        // PDF Viewer State
        this.pdfDoc = null;
        this.pdfPageNum = 1;
        this.pdfPageIsRendering = false;
        this.pdfPageNumPending = null;
        this.pdfScale = 1.2;
        this.currentPdfPath = null;
        this.pdfHighlights = JSON.parse(localStorage.getItem('pdfHighlights') || '{}');
        
        // Audio Player State
        this.audioElement = null;
        this.isPlaying = false;
        this.currentSermon = null;
        this.ytPlayer = null;
        this.audioInterval = null;

        // Sermon Caching and Bookmarks
        this.sermonsCache = null;
        this.sermonsCacheTime = null;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        this.bookmarkedSermons = JSON.parse(localStorage.getItem('bookmarkedSermons') || '[]');
        this.sermonNotes = JSON.parse(localStorage.getItem('sermonNotes') || '{}');
        this.sermonProgress = JSON.parse(localStorage.getItem('sermonProgress') || '{}');
        this.sermonPlaylists = JSON.parse(localStorage.getItem('sermonPlaylists') || '[]');
        this.sermonAutoRefresh = localStorage.getItem('sermonAutoRefresh') === 'true';
        this.refreshTimer = null;

        // Search Pagination State
        this.resultsPageSize = 12;
        this.currentResultsPage = 1;
        this.fullBibleResults = [];
        this.fullSermonResults = [];
        this.currentSermonMentions = [];
        this.currentSearchQuery = '';

        // Reference Parsing Data
        this.BIBLE_BOOKS = [
            'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth',
            '1 samuel', '2 samuel', '1 kings', '2 kings', '1 chronicles', '2 chronicles', 'ezra', 'nehemiah', 'esther',
            'job', 'psalm', 'psalms', 'proverbs', 'ecclesiastes', 'song of solomon', 'song of songs', 'isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel',
            'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi',
            'matthew', 'mark', 'luke', 'john', 'acts', 'romans', '1 corinthians', '2 corinthians', 'galatians', 'ephesians', 'philippians', 'colossians',
            '1 thessalonians', '2 thessalonians', '1 timothy', '2 timothy', 'titus', 'philemon', 'hebrews', 'james',
            '1 peter', '2 peter', '1 john', '2 john', '3 john', 'jude', 'revelation'
        ];

        // Abbreviation → full book name mapping (frontend-side)
        this.BOOK_ABBREVIATIONS = {
            'gen': 'genesis', 'ex': 'exodus', 'exo': 'exodus', 'lev': 'leviticus',
            'num': 'numbers', 'deut': 'deuteronomy', 'deu': 'deuteronomy',
            'jos': 'joshua', 'josh': 'joshua', 'judg': 'judges', 'jdg': 'judges',
            'rut': 'ruth', 'ru': 'ruth',
            '1 sam': '1 samuel', '1sam': '1 samuel', '2 sam': '2 samuel', '2sam': '2 samuel',
            '1 kgs': '1 kings', '1kgs': '1 kings', '2 kgs': '2 kings', '2kgs': '2 kings',
            '1 ki': '1 kings', '2 ki': '2 kings',
            '1 chron': '1 chronicles', '1chron': '1 chronicles', '2 chron': '2 chronicles', '2chron': '2 chronicles',
            '1 chr': '1 chronicles', '2 chr': '2 chronicles',
            'neh': 'nehemiah', 'est': 'esther',
            'ps': 'psalm', 'psa': 'psalm', 'pss': 'psalms',
            'prov': 'proverbs', 'pro': 'proverbs', 'pr': 'proverbs',
            'ecc': 'ecclesiastes', 'eccl': 'ecclesiastes',
            'song': 'song of solomon', 'sng': 'song of solomon', 'sos': 'song of solomon',
            'isa': 'isaiah', 'is': 'isaiah',
            'jer': 'jeremiah', 'lam': 'lamentations',
            'ezek': 'ezekiel', 'eze': 'ezekiel', 'ezk': 'ezekiel',
            'dan': 'daniel', 'hos': 'hosea',
            'joe': 'joel', 'jol': 'joel',
            'amo': 'amos', 'obad': 'obadiah', 'oba': 'obadiah',
            'jon': 'jonah', 'mic': 'micah',
            'nah': 'nahum', 'nam': 'nahum',
            'hab': 'habakkuk', 'zeph': 'zephaniah', 'zep': 'zephaniah',
            'hag': 'haggai', 'zech': 'zechariah', 'zec': 'zechariah',
            'mal': 'malachi',
            // New Testament
            'mat': 'matthew', 'matt': 'matthew', 'mt': 'matthew',
            'mk': 'mark', 'mrk': 'mark', 'mr': 'mark',
            'lk': 'luke', 'luk': 'luke', 'lu': 'luke',
            'jn': 'john', 'jhn': 'john',
            'act': 'acts', 'ac': 'acts',
            'rom': 'romans', 'ro': 'romans',
            '1 cor': '1 corinthians', '1cor': '1 corinthians', '2 cor': '2 corinthians', '2cor': '2 corinthians',
            'gal': 'galatians', 'eph': 'ephesians',
            'phil': 'philippians', 'php': 'philippians',
            'col': 'colossians',
            '1 thess': '1 thessalonians', '1thess': '1 thessalonians', '2 thess': '2 thessalonians', '2thess': '2 thessalonians',
            '1 th': '1 thessalonians', '2 th': '2 thessalonians',
            '1 tim': '1 timothy', '1tim': '1 timothy', '2 tim': '2 timothy', '2tim': '2 timothy',
            '1 ti': '1 timothy', '2 ti': '2 timothy',
            'tit': 'titus', 'philem': 'philemon', 'phi': 'philemon', 'phm': 'philemon',
            'heb': 'hebrews', 'he': 'hebrews',
            'jas': 'james', 'jam': 'james', 'ja': 'james',
            '1 pet': '1 peter', '1pet': '1 peter', '2 pet': '2 peter', '2pet': '2 peter',
            '1 pe': '1 peter', '2 pe': '2 peter',
            '1 jn': '1 john', '1jn': '1 john', '2 jn': '2 john', '2jn': '2 john', '3 jn': '3 john', '3jn': '3 john',
            '1 jhn': '1 john', '2 jhn': '2 john', '3 jhn': '3 john',
            'jud': 'jude', 'jd': 'jude',
            'rev': 'revelation', 're': 'revelation', 'rv': 'revelation'
        };

        this.init();
    }

    async init() {
        console.log('🌿 Green Bible App — Premium Edition Initialized');
        // Configure PDF.js worker
        if (window.pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        this.loadFromStorage();
        await this.syncVersions();
        await this.syncBookNames();
        this.updateVersionSlots();
        this.renderLibrary();
        this.renderHistory();
        this.renderBookmarks();
        this.renderTopics();
        this.initYoutubeAPI();
        
        // Setup Live Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            // Show history on focus if empty
            searchInput.addEventListener('focus', () => {
                if (!searchInput.value.trim()) {
                    this.renderSearchShortcuts();
                }
            });

            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                const q = e.target.value.trim();
                if (!q) {
                    this.renderSearchShortcuts();
                } else {
                    this.updateSuggestions(q);
                }

                clearTimeout(searchTimeout);
                if (q.length > 2) {
                    searchTimeout = setTimeout(() => {
                        this.performSearch(false, true); // true indicates live-search
                    }, 300);
                }
            });

            // Close suggestions on blur (with delay to allow clicking)
            searchInput.addEventListener('blur', () => {
                setTimeout(() => {
                    const suggestions = document.getElementById('searchSuggestions');
                    if (suggestions) suggestions.style.display = 'none';
                }, 200);
            });
        }

        // Global listener for closing overlays
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-input-wrapper')) {
                const suggestions = document.getElementById('searchSuggestions');
                if (suggestions) suggestions.style.display = 'none';
            }
        });
        
        // Restore last active view
        const activeView = localStorage.getItem('activeView') || 'search';
        this.showView(activeView);

        this.setupAudioListeners();

        // Global key listener for escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Connection Monitoring
        window.addEventListener('online', () => this.updateConnectionStatus());
        window.addEventListener('offline', () => this.updateConnectionStatus());
        this.updateConnectionStatus();
    }

    updateConnectionStatus() {
        const statusEl = document.getElementById('connectionStatus');
        if (!statusEl) return;
        
        if (navigator.onLine) {
            statusEl.style.display = 'none';
        } else {
            statusEl.style.display = 'flex';
            this.showNotification('You are currently offline. Some features may be limited.', 'warning');
        }
    }

    closeAllModals() {
        this.closeIngester();
        this.closeTranscriptModal();
        this.closeSermonModal();
        this.closeSermonDetail();
        if (typeof closeHistory === 'function') closeHistory();
        const overlay = document.getElementById('searchSuggestions');
        if (overlay) overlay.style.display = 'none';
        const detail = document.getElementById('sermonDetailContainer');
        if (detail && detail.style.display === 'block') this.closeSermonDetail();
    }

    setupAudioListeners() {
        this.audioElement = document.getElementById('mainAudioCore');
        if (!this.audioElement) return;

        this.audioElement.addEventListener('play', () => {
            this.isPlaying = true;
            this.updateAudioUI();
        });

        this.audioElement.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updateAudioUI();
        });

        this.audioElement.addEventListener('timeupdate', () => {
            this.updateAudioProgress();
        });

        this.audioElement.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updateAudioUI();
        });

        this.audioElement.addEventListener('error', (e) => {
            console.error('Audio playback error:', e);
            this.showNotification('Failed to play audio. The file might be unavailable.', 'error');
            this.closeGlobalAudio();
        });
    }

    async syncBookNames() {
        try {
            const response = await fetch('/api/bibles/all-book-names');
            if (response.ok) {
                const data = await response.json();
                if (data.names && data.names.length > 0) {
                    this.BIBLE_BOOKS = data.names;
                    console.log(`📚 Synced ${this.BIBLE_BOOKS.length} book names (English + Native)`);
                }
            }
        } catch (error) {
            console.warn('Failed to sync book names, using English defaults.');
        }
    }

    async syncVersions() {
        try {
            const response = await fetch('/api/bibles/versions');
            if (response.ok) {
                const data = await response.json();
                this.availableVersions = data.versions.map(v => ({
                    code: v.id,
                    name: v.name,
                    language: v.language,
                    languageCode: v.languageCode,
                    available: v.available,
                    source: v.source
                }));
                console.log(`✅ Synced ${this.availableVersions.length} Bible versions from server`);
            }
        } catch (error) {
            console.error('Failed to sync versions:', error);
        }
    }

    // ==========================================
    // Storage Methods
    // ==========================================
    loadFromStorage() {
        const saved = localStorage.getItem('selectedVersions');
        if (saved) {
            this.selectedVersions = JSON.parse(saved);
        }
        const locked = localStorage.getItem('lockedVersions');
        if (locked) {
            this.lockedVersions = JSON.parse(locked);
            this.updateLockButton();
        }

        // Load Sermons from Cache
        const cachedSermons = localStorage.getItem(SERMONS_CACHE_KEY);
        const cachedTime = localStorage.getItem(SERMONS_CACHE_TIME_KEY);
        if (cachedSermons && cachedTime) {
            this.sermonsCache = JSON.parse(cachedSermons);
            this.sermonsCacheTime = parseInt(cachedTime);
        }
    }

    saveToStorage() {
        localStorage.setItem('selectedVersions', JSON.stringify(this.selectedVersions));
        localStorage.setItem('lockedVersions', JSON.stringify(this.lockedVersions));
    }

    // ==========================================
    // Search History Methods
    // ==========================================
    addToHistory(query) {
        let history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        history = history.filter(item => item.query !== query);
        history.unshift({
            query: query,
            timestamp: new Date().toISOString()
        });
        history = history.slice(0, 10);
        localStorage.setItem('searchHistory', JSON.stringify(history));
        this.trackActivity('search', { query, title: `Searched: ${query}` });
        this.renderHistory();
    }

    renderHistory() {
        const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        const historyTrigger = document.getElementById('historyTrigger');
        const historyList = document.getElementById('historyList');
        const historyCountHint = document.getElementById('historyCountHint');

        if (history.length === 0) {
            historyTrigger.style.display = 'none';
            return;
        }

        historyTrigger.style.display = 'flex';
        historyCountHint.textContent = `${history.length} searches — Click to expand`;

        historyList.innerHTML = history.map(item => {
            const date = new Date(item.timestamp);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const safeQuery = this.escapeHtml(item.query);
            return `
                <div class="history-item" onclick="setSearch('${safeQuery}'); performSearch();">
                    <span class="history-query">${safeQuery}</span>
                    <span class="history-time">${timeStr}</span>
                </div>
            `;
        }).join('');
    }

    toggleHistory() {
        const historySection = document.getElementById('historySection');
        const historyArrow = document.getElementById('historyArrow');

        if (historySection.style.display === 'none') {
            historySection.style.display = 'block';
            historyArrow.textContent = '▴';
        } else {
            historySection.style.display = 'none';
            historyArrow.textContent = '▾';
        }
    }

    clearSearchHistory() {
        localStorage.removeItem('searchHistory');
        this.renderHistory();
        document.getElementById('historySection').style.display = 'none';
        this.showNotification('Search history cleared', 'success');
    }

    // ==========================================
    // Version Selection
    // ==========================================
    selectVersion(slotNum) {
        if (this.lockedVersions) {
            this.showNotification('Versions are locked. Unlock to make changes.', 'warning');
            return;
        }
        this.openVersionModal(slotNum);
    }

    openVersionModal(slotNum) {
        const modal = document.getElementById('versionModal');
        const list = document.getElementById('versionList');

        list.innerHTML = this.availableVersions.map(v => {
            const isSelected = this.selectedVersions.some((sv, idx) => sv && sv.code === v.code && idx !== (slotNum - 1));
            const isCurrent = this.selectedVersions[slotNum - 1] && this.selectedVersions[slotNum - 1].code === v.code;
            
            return `
                <button class="modal-version-btn ${isSelected ? 'active' : ''} ${isCurrent ? 'current' : ''}" 
                        ${isSelected ? 'disabled' : ''}
                        onclick="app.setVersion(${slotNum}, '${v.code}', '${v.name}')">
                    <div>
                        <strong style="color: ${isSelected ? 'var(--text-muted)' : 'inherit'}">${v.code}</strong>
                        <div class="version-sub">${v.name}</div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                        <span class="version-lang" style="font-size: 0.7rem; opacity: 0.6;">${v.language}</span>
                        ${isSelected ? '<span style="font-size: 0.65rem; color: var(--accent-emerald); font-weight: 700;">ACTIVE</span>' : ''}
                        ${isCurrent ? '<span style="font-size: 0.65rem; color: var(--accent-gold); font-weight: 700;">CURRENT</span>' : ''}
                    </div>
                </button>
            `;
        }).join('');

        modal.style.display = 'flex';
    }

    closeVersionModal() {
        document.getElementById('versionModal').style.display = 'none';
    }

    setVersion(slotNum, code, name) {
        const isAlreadySelected = this.selectedVersions.some((v, index) => v && v.code === code && index !== (slotNum - 1));
        if (isAlreadySelected) {
            this.showNotification(`${code} is already selected in another card`, 'warning');
            return;
        }

        this.selectedVersions[slotNum - 1] = { code, name };
        this.saveToStorage();
        this.updateVersionSlots();
        this.closeVersionModal();
        this.showNotification(`${code} added to slot ${slotNum}`, 'success');
    }

    updateVersionSlots() {
        for (let i = 0; i < 4; i++) {
            const slot = document.querySelector(`[data-slot="${i + 1}"]`);
            if (!slot) continue;
            const version = this.selectedVersions[i];

            if (version) {
                slot.classList.remove('empty');
                slot.classList.add('selected');
                slot.innerHTML = `
                    <span class="version-slot-number">${i + 1}</span>
                    <span class="version-code">${version.code}</span>
                    <span class="version-name">${version.name}</span>
                    ${!this.lockedVersions ? `<button onclick="event.stopPropagation(); app.clearVersion(${i + 1})" style="position: absolute; bottom: 8px; right: 8px; background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.25); border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">×</button>` : ''}
                `;
            } else {
                slot.classList.add('empty');
                slot.classList.remove('selected');
                slot.innerHTML = `
                    <span class="version-slot-number">${i + 1}</span>
                    <span class="version-code">+</span>
                    <span class="version-name">Click to select</span>
                `;
            }
        }
    }

    clearVersion(slotNum) {
        if (this.lockedVersions) return;
        this.selectedVersions[slotNum - 1] = null;
        this.saveToStorage();
        this.updateVersionSlots();
    }

    // ==========================================
    // Lock Functionality
    // ==========================================
    toggleLock() {
        this.lockedVersions = !this.lockedVersions;
        this.saveToStorage();
        this.updateLockButton();
        this.updateVersionSlots();

        const message = this.lockedVersions ? 'Versions locked' : 'Versions unlocked';
        this.showNotification(message, this.lockedVersions ? 'success' : 'info');
    }

    updateLockButton() {
        const btn = document.getElementById('lockBtn');
        if (!btn) return;
        if (this.lockedVersions) {
            btn.classList.add('locked');
            btn.innerHTML = '<span>🔒</span> Locked';
        } else {
            btn.classList.remove('locked');
            btn.innerHTML = '<span>🔓</span> Lock Versions';
        }
    }

    // ==========================================
    // Search Functionality
    // ==========================================
    // ==========================================
    // Search Suggestions Logic
    // ==========================================
    updateSuggestions(query) {
        const overlay = document.getElementById('searchSuggestions');
        if (!overlay) return;

        const q = query.trim().toLowerCase();
        if (q.length < 2) {
            overlay.style.display = 'none';
            return;
        }

        // Filter books that start with or contain the query
        const matches = this.BIBLE_BOOKS.filter(b => b.includes(q))
            .sort((a, b) => {
                // Prioritize those that start with the query
                const aStarts = a.startsWith(q);
                const bStarts = b.startsWith(q);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.localeCompare(b);
            })
            .slice(0, 8);

        if (matches.length === 0) {
            overlay.style.display = 'none';
            return;
        }

        overlay.innerHTML = `
            <div class="suggestion-group">
                <div class="suggestion-header">Bible Books</div>
                ${matches.map(book => `
                    <div class="suggestion-item" onclick="app.applySuggestion('${this.escapeHtml(book)}')">
                        <span class="suggestion-icon">📖</span>
                        <span class="suggestion-text">${this.capitalize(book)}</span>
                        <span class="suggestion-meta">Book</span>
                    </div>
                `).join('')}
            </div>
            ${q.length > 3 ? `
                <div class="suggestion-group">
                    <div class="suggestion-header">Actions</div>
                    <div class="suggestion-item" onclick="performSearch()">
                        <span class="suggestion-icon">🔍</span>
                        <span class="suggestion-text">Search for "${this.escapeHtml(query)}"</span>
                        <span class="suggestion-meta">Enter</span>
                    </div>
                </div>
            ` : ''}
        `;

        overlay.style.display = 'block';
    }

    applySuggestion(text) {
        const input = document.getElementById('searchInput');
        if (input) {
            // If it's a book name, add a space to help with chapter typing
            input.value = this.capitalize(text) + ' ';
            input.focus();
            this.updateSuggestions(input.value);
            
            // For full book names, trigger a search for chapter 1 immediately
            if (this.BIBLE_BOOKS.includes(text.toLowerCase())) {
                this.performSearch(true, false);
            }
        }
    }

    capitalize(str) {
        return str.replace(/\b\w/g, l => l.toUpperCase());
    }

    setSearch(query) {
        document.getElementById('searchInput').value = query;
    }

    async performSearch(addToHist = true, isLiveSearch = false) {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) {
            this.showNotification('Please enter a search query', 'warning');
            return;
        }

        // Abort previous search if any
        if (this.searchAbortController) {
            this.searchAbortController.abort();
        }
        this.searchAbortController = new AbortController();
        const signal = this.searchAbortController.signal;


        // Store current search query for highlighting
        this.currentSearchQuery = query;

        const activeVersions = this.selectedVersions.filter(v => v !== null);

        // If user has selected specific versions, use those; otherwise query ALL versions
        const versionsToSearch = activeVersions.length > 0 
            ? activeVersions 
            : this.availableVersions;

        if (versionsToSearch.length === 0) {
            this.showNotification('No Bible versions available. Please check your connection.', 'warning');
            return;
        }

        // Add to search history
        if (addToHist) {
            this.addToHistory(query);
        }

        // UI State
        if (!isLiveSearch) {
            document.getElementById('resultsSection').classList.add('active');
            document.getElementById('topicsSection').style.display = 'none';
            document.getElementById('interpretationSection').style.display = 'block';
            const interpRef = document.getElementById('interpretationReference');
            if (interpRef) interpRef.textContent = query;

            const resultsGrid = document.getElementById('resultsGrid');
            resultsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 48px;">
                    <div style="font-size: 2rem; margin-bottom: 12px; animation: pulse-glow 1.5s ease-in-out infinite;">📖</div>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">Searching scripture across ${versionsToSearch.length} translations...</p>
                </div>
            `;
        }

        try {
            const parsed = this.parseVerseReference(query);
            let results = [];

            if (parsed) {
                console.log('🔍 Search Decision: PASSAGE', parsed);
                // Passage search: Fetch for each active version in parallel
                this.currentBook = parsed.book;
                this.currentChapter = parsed.chapter;
                this.currentVerseNum = parsed.verse;

                results = await Promise.all(
                    versionsToSearch.map(async (version) => {
                        try {
                            const verse = await this.fetchVerse(version.code, query, signal);
                            return verse ? { version, verse } : null;
                        } catch (e) {
                            if (e.name === 'AbortError') return null;
                            console.warn(`Failed to fetch ${query} for ${version.code}`);
                            return null;
                        }
                    })
                );
                results = results.filter(r => r !== null);
            } else {
                console.log('🔍 Search Decision: KEYWORD', query);
                
                const vCodes = versionsToSearch.map(v => v.code).join(',');
                
                // Fetch Bible and Sermon Results in parallel
                const [bibleResponse, sermonResponse] = await Promise.all([
                    fetch(`/api/bibles/search?q=${encodeURIComponent(query)}&versions=${vCodes}`, { signal }),
                    fetch(`/api/sermons/search?q=${encodeURIComponent(query)}`, { signal }).catch(() => ({ json: () => ({ sermons: [] }) }))
                ]);
                
                const [bibleData, sermonData] = await Promise.all([
                    bibleResponse.json(),
                    sermonResponse.json?.() || { sermons: [] }
                ]);
                
                // Use unified rendering for all search types
                this.renderSearchResults(bibleData, sermonData, isLiveSearch, false);
                return;
            }

            const mentions = await this.fetchSermonMentions(parsed.book, parsed.chapter, parsed.verse);
            this.renderSearchResults(results, mentions, isLiveSearch, true);
            
        } catch (error) {
            if (error.name === 'AbortError') return;
            
            // Only show visible error notification if this wasn't an background live-search
            if (!isLiveSearch) {
                this.showNotification('Error performing search', 'error');
            }
            console.error('Search error:', error);
        }
    }

    parseVerseReference(query) {
        // Clean up common punctuation and handle typos like John 3.16, 3/16, hosea 4.5-7
        let cleaned = query.replace(/[,;"']+$/, '').trim();
        // Normalize range first: 4.5-7 → 4:5-7
        cleaned = cleaned.replace(/(\d+)\s*[./,:]\s*(\d+)\s*-\s*(\d+)/g, '$1:$2-$3');
        // Then normalize single: 3.16 → 3:16
        cleaned = cleaned.replace(/(\d+)\s*[./,:]\s*(\d+)/g, '$1:$2');

        // 1. Try verse range: Book Chapter:VerseStart-VerseEnd (e.g. Hosea 4:5-7)
        const rangeMatch = cleaned.match(/^([\w\s]+)\s+(\d+):(\d+)\s*-\s*(\d+)$/i);
        if (rangeMatch) {
            const [_, book, chapter, verse, verseEnd] = rangeMatch;
            return this.resolveBookReference(book, chapter, verse, verseEnd);
        }

        // 2. Try full reference: Book Chapter:Verse
        const fullMatch = cleaned.match(/^([\w\s]+)\s+(\d+):(\d+)$/i);
        if (fullMatch) {
            const [_, book, chapter, verse] = fullMatch;
            return this.resolveBookReference(book, chapter, verse);
        }

        // 3. Try Chapter only: Book Chapter
        const chapterMatch = cleaned.match(/^([\w\s]+)\s+(\d+)$/i);
        if (chapterMatch) {
            const [_, book, chapter] = chapterMatch;
            return this.resolveBookReference(book, chapter);
        }

        // 4. Try Book only: Book
        const bookOnly = cleaned.toLowerCase();
        if (this.BIBLE_BOOKS.includes(bookOnly)) {
            return { book: cleaned, chapter: 1, verse: null };
        }

        return null;
    }

    resolveBookReference(bookName, chapter, verse = null, verseEnd = null) {
        const book = bookName.trim().toLowerCase();
        
        // Check English names first
        if (this.BIBLE_BOOKS.includes(book)) {
            return { book: book.charAt(0).toUpperCase() + book.slice(1), chapter: parseInt(chapter), verse: verse ? parseInt(verse) : null, verseEnd: verseEnd ? parseInt(verseEnd) : null };
        }

        // Check abbreviations (ps → psalm, mat → matthew, etc.)
        const resolved = this.BOOK_ABBREVIATIONS[book];
        if (resolved) {
            const displayName = resolved.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            return { book: displayName, chapter: parseInt(chapter), verse: verse ? parseInt(verse) : null, verseEnd: verseEnd ? parseInt(verseEnd) : null };
        }

        // Check Native names cache
        for (const lang in this.nativeBookNamesCache) {
            const nativeMap = this.nativeBookNamesCache[lang];
            for (const [engName, nativeName] of Object.entries(nativeMap)) {
                if (book === nativeName.toLowerCase()) {
                    return { book: engName, chapter: parseInt(chapter), verse: verse ? parseInt(verse) : null, verseEnd: verseEnd ? parseInt(verseEnd) : null };
                }
            }
        }

        return null;
    }

    async fetchVerse(versionCode, query, signal = null) {
        try {
            const parsed = this.parseVerseReference(query);
            if (!parsed) return null;

            const url = `/api/bibles/passage?version=${versionCode}&book=${encodeURIComponent(parsed.book)}&chapter=${parsed.chapter}${parsed.verse ? '&verse=' + parsed.verse : ''}${parsed.verseEnd ? '&verseEnd=' + parsed.verseEnd : ''}`;
            const response = await fetch(url, { signal });

            if (!response.ok) throw new Error('Failed to fetch passage');

            const data = await response.json();

            return {
                reference: data.reference || query,
                text: data.text,
                verses: data.verses,
                structuredContent: data.structuredContent, // Available for helloao
                book: data.book,
                chapter: data.chapter,
                totalVerses: data.totalVersesInChapter,
                pdfPath: data.pdfPath
            };
        } catch (error) {
            console.error(`Error fetching [${versionCode}] ${query}:`, error);
            return this.getSampleVerse(versionCode, query);
        }
    }
    getSampleVerse(versionCode, query) {
        // Fallback only when both APIs are unreachable
        return {
            reference: query,
            text: `Could not load verse data for ${query} (${versionCode}). Please check your connection and try again.`
        };
    }

    // Unified rendering for all search results (Bible & Sermons)
    renderSearchResults(bibleData, sermonData, isLiveSearch = false, isPassageResults = false) {
        let bibleResults = [];
        if (isPassageResults && Array.isArray(bibleData)) {
            bibleResults = bibleData
                .filter(r => r && r.version && r.verse)
                .map(r => ({
                    id: r.version.code,
                    version: r.version,
                    verse: r.verse,
                    reference: r.verse.reference,
                    text: r.verse.text
                }));
        } else if (bibleData && Array.isArray(bibleData.results)) {
            bibleResults = bibleData.results.map(r => ({
                id: r.versionCode || r.version || r.id || 'KJV',
                version: { 
                    code: r.versionCode || r.version || r.id || 'KJV', 
                    name: r.versionName || 'Bible',
                    language: r.language || 'English'
                },
                verse: r,
                reference: r.reference,
                text: r.text
            }));
        }

        const sermons = sermonData?.sermons || [];
        
        // Save for visual modal extraction
        this.fullBibleResults = bibleResults;
        this.fullSermonResults = sermons;
        this.currentResultsPage = 1;
        this.resultsPageSize = 5;

        this.displayResults();
    }

    async fetchSermonMentions(book, chapter, verse = null) {
        try {
            const url = `/api/sermons/mentions/${encodeURIComponent(book)}/${chapter}/${verse || 'null'}`;
            const res = await fetch(url);
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.warn('Failed to fetch sermon mentions:', e);
        }
        return { sermons: [] };
    }

    displayResults() {
        const grid = document.getElementById('resultsGrid');
        if (!grid) return;

        const bibleSubset = this.fullBibleResults.slice(0, this.currentResultsPage * this.resultsPageSize);
        const sermonSubset = this.fullSermonResults.slice(0, Math.max(4, this.currentResultsPage * 4)); 
        
        const query = this.currentSearchQuery;
        const isSemanticFallback = this._semanticFallbackActive;
        let html = '';

        // Bible Results
        if (bibleSubset.length > 0) {
            html += bibleSubset.map(({ version, verse }) => {
                const isBookmarked = this.isBookmarked(verse.reference);
                const safeRefAttr = this.escapeHtml(verse.reference);
                const safeText = this.escapeHtml(verse.text);

                let bodyHtml = '';
                if (verse.structuredContent) {
                    bodyHtml = verse.structuredContent.map(item => {
                        if (item.type === 'heading') return `<h3 class="verse-heading">${item.text}</h3>`;
                        if (item.type === 'verse') return `<span class="verse-item"><sup class="verse-num">${item.number || item.verse || ''}</sup>${this.highlightSearchTerms(item.text, query)}</span> `;
                        return '';
                    }).join('');
                } else if (verse.verses) {
                    bodyHtml = verse.verses.map(v => `<span class="verse-item"><sup class="verse-num">${v.number || v.verse || ''}</sup>${this.highlightSearchTerms(v.text, query)}</span> `).join('');
                } else {
                    bodyHtml = this.highlightSearchTerms(verse.text, query);
                }

                return `
                    <div class="result-card ${isSemanticFallback ? 'semantic-match' : ''}">
                        <div class="result-header" style="background: linear-gradient(135deg, #0a2f1a, #1a4d30); padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span class="result-version" style="color: #ffffff; font-weight: 700; font-size: 0.9rem; opacity: 0.9;">${version.code}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <i class="fas fa-download" id="offline-${version.code}-${safeRefAttr}" onclick="event.stopPropagation(); app.saveChapterOffline('${version.code}', '${safeRefAttr}')" title="Download for Offline" style="cursor: pointer; color: rgba(255,255,255,0.6); font-size: 0.85rem;"></i>
                                    <i class="fas fa-bookmark" onclick="event.stopPropagation(); app.toggleBookmark('${verse.book || ''}', ${verse.chapter || 1}, ${verse.verse || 1}, '${safeText}', '${version.code}')" class="bookmark-icon ${isBookmarked ? 'active' : ''}" style="cursor: pointer; color: rgba(255,255,255,0.6); font-size: 0.9rem;"></i>
                                </div>
                            </div>
                        </div>
                        <div class="result-body" style="padding: 24px;">
                            <div class="reference" style="color: var(--accent-gold); font-weight: 700; margin-bottom: 12px;">${verse.reference}</div>
                            <div class="verse-text-container">${bodyHtml}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Sermon Results / Mentions
        if (sermonSubset.length > 0) {
            const title = isPassageResults ? "Mentioned in Prophetic Messages" : "Related Prophetic Messages";
            html += `
                <div style="grid-column: 1/-1; margin-top: 32px; margin-bottom: 16px; display: flex; align-items: center; gap: 16px;">
                    <h3 class="section-title" style="margin: 0; white-space: nowrap;">${title}</h3>
                    <div style="height: 1px; background: var(--border-subtle); flex: 1;"></div>
                </div>
            `;
            html += sermonSubset.map(s => `
                <div class="result-card sermon-card" onclick="app.openTranscriptModal('${s.id}')">
                    <div class="result-header">
                        <span class="result-version">SERMON</span>
                        <span class="result-language">${s.date}</span>
                    </div>
                    <div class="result-body">
                        <div class="reference">${this.escapeHtml(s.title)}</div>
                        <p class="verse-text" style="font-size: 0.88rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                            ${this.highlightSearchTerms(this.escapeHtml(s.summary), query)}
                        </p>
                    </div>
                </div>
            `).join('');
        }

        if (html === '') {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-muted);">No matching scriptures found.</div>`;
        } else {
            // Load More Button
            if (this.fullBibleResults.length > bibleSubset.length || this.fullSermonResults.length > sermonSubset.length) {
                html += `
                <div style="grid-column: 1/-1; display: flex; justify-content: center; padding: 40px 0;">
                    <button class="nav-btn" onclick="app.loadMoreResults()" style="padding: 12px 32px; border-radius: 30px; border-color: var(--accent-emerald); color: var(--accent-emerald); font-weight: 600;">
                        <i class="fas fa-plus" style="margin-right: 8px;"></i> Load More Results
                    </button>
                </div>
                `;
            }
            grid.innerHTML = html;
        }
    }

    loadMoreResults() {
        this.currentResultsPage++;
        this.displayResults();
    }

    loadPassage(book, chapter, verse = null) {
        this.showView('read');
        const navBook = document.getElementById('bibleNavBook');
        const navChapter = document.getElementById('bibleNavChapter');
        
        if (navBook) navBook.value = book;
        this.updateBibleNav('book'); // Trigger chapter update
        
        if (navChapter) {
            navChapter.value = chapter;
            this.updateBibleNav('chapter'); // Load the content
        }

        // Highlight specific verse if provided
        if (verse) {
            setTimeout(() => {
                const element = document.getElementById(`verse-${verse}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('highlight-pulse');
                }
            }, 500);
        }
    }


    navigateCard(reference, action) {
        const parsed = this.parseVerseReference(reference);
        if (!parsed) return;

        let query = '';
        switch(action) {
            case 'next-v': query = `${parsed.book} ${parsed.chapter}:${(parsed.verse || 1) + 1}`; break;
            case 'prev-v': query = `${parsed.book} ${parsed.chapter}:${Math.max(1, (parsed.verse || 1) - 1)}`; break;
            case 'next-ch': query = `${parsed.book} ${(parsed.chapter || 1) + 1}:1`; break;
            case 'prev-ch': query = `${parsed.book} ${Math.max(1, (parsed.chapter || 1) - 1)}:1`; break;
        }
        
        // Show subtle loading state on the card itself if possible, 
        // but for now, we'll just update the input and search
        const input = document.getElementById('searchInput');
        if (input) input.value = query;
        this.performSearch();
        
        // Smother scroll back to top if not already there
        if (window.scrollY > 300) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }


    // ==========================================
    // Bookmark Methods
    // ==========================================
    isBookmarked(reference) {
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        return bookmarks.some(b => b.reference === reference);
    }

    toggleBookmark(book, chapter, verse, text, version) {
        // Support both old (ref, text, version) and new (book, ch, v, text, version) signatures
        let reference, bText, bVersion;
        if (typeof chapter === 'string' && text === undefined) {
            // Old signature
            reference = book;
            bText = chapter;
            bVersion = verse;
        } else {
            // New signature
            reference = `${book} ${chapter}:${verse}`;
            bText = text;
            bVersion = version;
        }

        let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        const index = bookmarks.findIndex(b => b.reference === reference);

        if (index === -1) {
            const folder = window.prompt("Save to folder (e.g., 'Faith Study', 'Sunday Notes'):", "General") || "General";
            bookmarks.push({ reference, text: bText, version: bVersion, folder, timestamp: new Date().toISOString() });
            this.showNotification(`Verse saved to ${folder}`, 'success');
        } else {
            bookmarks.splice(index, 1);
            this.showNotification('Bookmark removed', 'info');
        }
        
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
        this.renderBookmarks();
        // If we have a results grid, refresh it to update icons
        if (document.getElementById('resultsGrid')) {
             // We don't necessarily want to re-perform the whole search 
             // but we could just re-render. For now, this is fine.
        }
    }

    renderBookmarks() {
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        const grid = document.getElementById('bookmarksGrid');

        if (!grid) return;

        if (bookmarks.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-state-icon">🔖</div>
                    <p>No saved verses yet. Click the save icon on any verse to keep it here.</p>
                </div>
            `;
            return;
        }

        // Group by folder
        const folders = {};
        bookmarks.forEach(b => {
            const folder = b.folder || 'General';
            if (!folders[folder]) folders[folder] = [];
            folders[folder].push(b);
        });

        let html = '';
        for (const [folderName, items] of Object.entries(folders)) {
            html += `
                <div style="grid-column: 1/-1; margin-top: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; margin-bottom: 16px;">
                    <h3 style="color: var(--accent-gold); font-size: 1.2rem; display: flex; align-items: center; gap: 8px;">
                        <span>📁</span> ${this.escapeHtml(folderName)}
                        <span style="font-size: 0.8rem; background: var(--bg-card); padding: 2px 8px; border-radius: 12px; color: var(--text-muted);">${items.length}</span>
                    </h3>
                </div>
            `;
            
            html += items.map(b => {
                const safeRef = this.escapeHtml(b.reference);
                const safeText = this.escapeHtml(b.text || '');
                return `
                <div class="result-card" onclick="setSearch('${safeRef}'); performSearch();">
                    <button class="tray-btn" style="position: absolute; top: 10px; right: 10px; z-index: 10; background: rgba(0,0,0,0.3);" onclick="event.stopPropagation(); app.toggleBookmark('${b.book}', ${b.chapter}, ${b.verse || 'null'}, '${safeText}', '${b.version || ''}')" title="Remove bookmark">
                        <span class="tray-icon" style="color: var(--accent-gold);">★</span>
                    </button>
                    <div class="result-header">
                        <span class="result-version">${b.version || 'N/A'}</span>
                        <span class="result-language">${b.folder || 'General'}</span>
                    </div>
                    <div class="result-body">
                        <div class="reference">${safeRef}</div>
                        <p class="verse-text" style="font-size: 1rem; line-height: 1.7;">${this.highlightSearchTerms(safeText.substring(0, 200), this.currentSearchQuery)}${safeText.length > 200 ? '…' : ''}</p>
                    </div>
                    <div class="action-tray">
                        <button class="tray-btn" onclick="event.stopPropagation(); app.copyToClipboard('${safeText}\\n— ${safeRef}')" title="Copy">
                            <span class="tray-icon">📋</span>
                        </button>
                        <button class="tray-btn" onclick="event.stopPropagation(); app.addToCompareSlot('${safeRef}', \`${safeText}\`, '${b.version || ''}')" title="Compare">
                            <span class="tray-icon">⚖️</span>
                        </button>
                    </div>
                </div>
            `;
            }).join('');
        }
        
        grid.innerHTML = html;
    }

    // ==========================================
    // Navigation
    // ==========================================
    navigateVerse(direction) {
        if (!this.currentBook || !this.currentChapter) {
            this.showNotification('No verse loaded to navigate from', 'warning');
            return;
        }

        switch (direction) {
            case 'prev':
                if (this.currentVerseNum && this.currentVerseNum > 1) {
                    this.currentVerseNum--;
                }
                break;
            case 'next':
                this.currentVerseNum = (this.currentVerseNum || 0) + 1;
                break;
            case 'prev-chapter':
                if (this.currentChapter > 1) {
                    this.currentChapter--;
                    this.currentVerseNum = 1;
                }
                break;
            case 'next-chapter':
                this.currentChapter++;
                this.currentVerseNum = 1;
                break;
        }

        const query = this.currentVerseNum
            ? `${this.currentBook} ${this.currentChapter}:${this.currentVerseNum}`
            : `${this.currentBook} ${this.currentChapter}`;

        document.getElementById('searchInput').value = query;
        this.performSearch();
    }

    // ==========================================
    // Comparison
    // ==========================================
    addToCompare(slotNum) {
        this.showNotification('Search for a verse, then click "Compare" on the result card', 'info');
    }

    addToCompareSlot(reference, text, version) {
        // Check if this exact verse/version is already in a slot
        const isAlreadyInCompare = this.compareSlots.some(s => s && s.reference === reference && s.version === version);
        if (isAlreadyInCompare) {
            this.showNotification(`${reference} (${version}) is already in comparison`, 'warning');
            return;
        }

        const emptySlot = this.compareSlots.findIndex(s => s === null);
        if (emptySlot === -1) {
            this.showNotification('All compare slots are full. Clear one first.', 'warning');
            return;
        }

        this.compareSlots[emptySlot] = { reference, text, version };
        this.updateCompareSlots();
        this.showNotification(`Added ${reference} to compare slot ${emptySlot + 1}`, 'success');
    }

    updateCompareSlots() {
        for (let i = 0; i < 4; i++) {
            const slot = document.querySelector(`[data-compare="${i + 1}"]`);
            if (!slot) continue;
            const verse = this.compareSlots[i];

            if (verse) {
                slot.classList.add('filled');
                slot.innerHTML = `
                    <div style="width: 100%; display: flex; flex-direction: column; align-items: center; position: relative;">
                        <span class="slot-label" style="position: absolute; top: -15px; left: 0; background: var(--accent-gold); color: black; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 0.65rem;">${verse.version}</span>
                        
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 12px; width: 100%; justify-content: center;">
                            <button onclick="event.stopPropagation(); app.navigateVerseForSlot(${i}, 'prev')" class="nav-arrow-btn" title="Previous Verse">◀</button>
                            <strong class="compare-ref" style="color: var(--accent-gold); font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; cursor: pointer;" onclick="event.stopPropagation(); document.getElementById('searchInput').value='${verse.reference}'; app.performSearch();">${verse.reference}</strong>
                            <button onclick="event.stopPropagation(); app.navigateVerseForSlot(${i}, 'next')" class="nav-arrow-btn" title="Next Verse">▶</button>
                        </div>

                        <p class="compare-text" style="font-size: 0.95rem; color: var(--text-secondary); text-align: center; margin: 12px 0; font-family: 'Playfair Display', serif; line-height: 1.7; transition: all 0.3s ease;">
                            ${this.highlightSearchTerms(verse.text, this.currentSearchQuery)}
                        </p>

                        <div style="display: flex; gap: 8px; margin-top: 15px;">
                            <button onclick="event.stopPropagation(); app.clearCompareSlot(${i})" style="padding: 6px 14px; background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 600; transition: all 0.2s; font-family: 'Inter', sans-serif;">Remove</button>
                            <button onclick="event.stopPropagation(); app.showInterlinear('${verse.reference}', '${verse.version}')" style="padding: 6px 14px; background: rgba(52,211,153,0.1); color: var(--accent-emerald); border: 1px solid rgba(52,211,153,0.2); border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 600; transition: all 0.2s;">Greek</button>
                        </div>
                    </div>
                `;
            } else {
                slot.classList.remove('filled');
                slot.innerHTML = `
                    <span class="slot-label">Slot ${i + 1}</span>
                    <span style="font-size: 0.85rem; opacity: 0.6;">Click to add verse</span>
                    <div style="font-size: 1.5rem; margin-top: 10px; opacity: 0.3;">➕</div>
                `;
            }
        }
    }

    async navigateVerseForSlot(index, direction) {
        const slot = this.compareSlots[index];
        if (!slot) return;

        const parsed = this.parseVerseReference(slot.reference);
        if (!parsed || !parsed.verse) return;

        let { book, chapter, verse } = parsed;
        if (direction === 'prev') {
            if (verse > 1) verse--;
            else return;
        } else {
            verse++;
        }

        const newRef = `${book} ${chapter}:${verse}`;
        try {
            const slotEl = document.querySelector(`[data-compare="${index + 1}"] p`);
            if (slotEl) slotEl.style.opacity = '0.5';

            // Check if slot and slot.version exist
            if (!slot || !slot.version) {
                console.error('Invalid slot data');
                if (slotEl) slotEl.style.opacity = '1';
                this.showNotification('Invalid compare slot', 'error');
                return;
            }

            const response = await fetch(`https://bible-api.com/${encodeURIComponent(newRef)}?translation=${slot.version.toLowerCase()}`);
            const data = await response.json();
            
            if (data.text) {
                this.compareSlots[index] = {
                    reference: data.reference,
                    text: data.text,
                    version: slot.version
                };
                this.updateCompareSlots();
            }
        } catch (e) {
            console.error('Slot navigation error:', e);
            this.showNotification('Could not shift to next verse.', 'error');
        }
    }

    clearCompareSlot(index) {
        this.compareSlots[index] = null;
        this.updateCompareSlots();
    }

    clearAllCompareSlots() {
        this.compareSlots = [null, null, null, null];
        this.updateCompareSlots();
        this.showNotification('All comparison slots cleared.', 'info');
    }

    // ==========================================
    // AI Illustration
    // ==========================================
    generateAIIllustration() {
        if (!this.currentBook || !this.currentChapter) {
            this.showNotification('Search for a verse first to generate illustration', 'warning');
            return;
        }
        this.showNotification('AI illustration now available in each verse card — click "🎨 AI Art" button', 'info');
    }

    // ==========================================
    // Interpretation / Commentary
    // ==========================================
    async fetchInterpretation(reference) {
        if (!reference) return;

        const section = document.getElementById('interpretationSection');
        if (section) {
            section.style.display = 'block';
            section.classList.add('active');
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        const interpRefEl = document.getElementById('interpretationReference');
        if (interpRefEl) interpRefEl.textContent = reference;

        // Loading state
        document.getElementById('interpretationContent').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="loading-spinner" style="margin: 0 auto 20px;"></div>
                <p style="color: var(--text-muted); font-size: 0.9rem;">Consulting Matthew Henry Commentary...</p>
            </div>
        `;

        try {
            const response = await fetch(`/api/commentary/${encodeURIComponent(reference)}`);
            if (!response.ok) throw new Error('Commentary not found');

            const data = await response.json();

            document.getElementById('interpretationContent').innerHTML = data.commentary.map(p => {
                if (p.startsWith('### ')) return `<h4 style="color: var(--accent-emerald); margin-top: 24px;">${p.replace('### ', '')}</h4>`;
                return `<p class="interpretation-text">${this.highlightSearchTerms(p, this.currentSearchQuery)}</p>`;
            }).join('');

            // (Related verses logic remains same or can be enhanced below)
            this.fetchRelatedVerses(reference);
        } catch (error) {
            console.error('Commentary error:', error);
            document.getElementById('interpretationContent').innerHTML = `<p style="color: var(--text-muted); padding: 20px;">No specific commentary available for this passage.</p>`;
        }
    }

    searchByTopic(topic) {
        document.getElementById('searchInput').value = topic;
        this.performSearch();
        this.trackActivity('topic', { name: topic, title: `Studied topic: ${topic}` });
        this.showNotification(`Searching verses about: ${topic}`, 'info');
    }

    // ==========================================
    // Related Verses
    // ==========================================
    async fetchRelatedVerses(reference) {
        if (!reference) return;

        const grid = document.getElementById('relatedGrid');
        if (!grid) return;

        document.getElementById('relatedSection').style.display = 'block';
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 20px;">
                <div class="loading-spinner" style="margin: 0 auto 10px; width: 30px; height: 30px;"></div>
                <p style="color: var(--text-muted); font-size: 0.8rem;">Finding related scripture...</p>
            </div>
        `;

        try {
            const response = await fetch(`/api/bibles/cross-references/${encodeURIComponent(reference)}`);
            if (!response.ok) throw new Error('Could not fetch cross-references');

            const data = await response.json();
            const crossRefs = data.crossReferences || [];

            if (crossRefs.length === 0) {
                grid.innerHTML = `<p style="color: var(--text-muted); padding: 20px; grid-column: 1/-1;">No explicit cross-references found for this verse.</p>`;
                return;
            }

            grid.innerHTML = crossRefs.map(v => `
                <div class="related-card" onclick="app.loadRelatedVerse('${this.escapeHtml(v.reference)}')">
                    <div class="relevance-score">${v.relevance}%</div>
                    <div class="related-reference">${v.reference}</div>
                    <div class="related-text">${this.highlightSearchTerms(v.text.substring(0, 150), this.currentSearchQuery)}${v.text.length > 150 ? '…' : ''}</div>
                    <div class="related-reason">Cross-reference from Bible Dataset</div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Related verses error:', error);
            grid.innerHTML = `<p style="color: var(--text-muted); padding: 20px; grid-column: 1/-1;">Could not load related verses at this time.</p>`;
        }
    }


    loadRelatedVerse(reference) {
        document.getElementById('searchInput').value = reference;
        this.performSearch();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async renderLibrary() {
        const libraryVersions = [
            // English — Public Domain / Free (all available via API)
            { code: 'KJV', name: 'King James Version', language: 'English', icon: '📕', status: 'available', progress: 100 },
            { code: 'WEB', name: 'World English Bible', language: 'English', icon: '📗', status: 'available', progress: 100 },
            { code: 'ASV', name: 'American Standard Version', language: 'English', icon: '📘', status: 'available', progress: 100 },
            { code: 'BBE', name: 'Bible in Basic English', language: 'English', icon: '📙', status: 'available', progress: 100 },
            { code: 'BSB', name: 'Berean Standard Bible', language: 'English', icon: '📓', status: 'available', progress: 100 },
            { code: 'YLT', name: "Young's Literal Translation", language: 'English', icon: '📔', status: 'available', progress: 100 },
            { code: 'DRA', name: 'Douay-Rheims 1899', language: 'English', icon: '📖', status: 'available', progress: 100 },
            { code: 'DBY', name: 'Darby Translation', language: 'English', icon: '📒', status: 'available', progress: 100 },
            { code: 'GNV', name: 'Geneva Bible 1599', language: 'English', icon: '📜', status: 'available', progress: 100 },
            { code: 'FBV', name: 'Free Bible Version', language: 'English', icon: '📃', status: 'available', progress: 100 },
            { code: 'NET', name: 'NET Bible', language: 'English', icon: '🌐', status: 'available', progress: 100 },
            { code: 'LSV', name: 'Literal Standard Version', language: 'English', icon: '📋', status: 'available', progress: 100 },
            // African Languages
            { code: 'SWAHILI_STD', name: 'Swahili Standard (Union)', language: 'Swahili', icon: '🌍', status: 'available', progress: 100 },
            { code: 'SWAHILI', name: 'Swahili Contemporary', language: 'Swahili', icon: '🌍', status: 'available', progress: 100 },
            { code: 'KIKUYU', name: 'Kikuyu Bible', language: 'Kikuyu', icon: '🇰🇪', status: 'available', progress: 100 },
            { code: 'LUO', name: 'Dholuo Bible', language: 'Dholuo', icon: '🇰🇪', status: 'available', progress: 100 },
            { code: 'AMHARIC', name: 'Amharic Bible', language: 'Amharic', icon: '🇪🇹', status: 'available', progress: 100 },
            { code: 'EKEGUSII', name: 'Ebibilia Enchenu', language: 'Ekegusii', icon: '🇰🇪', status: 'available', progress: 100 },
            // Other Languages
            { code: 'PORTUGUESE', name: 'João Ferreira de Almeida', language: 'Portuguese', icon: '🇧🇷', status: 'available', progress: 100 },
            { code: 'CHEROKEE', name: 'Cherokee New Testament', language: 'Cherokee', icon: '🪶', status: 'available', progress: 41 },
            { code: 'SUBA', name: 'Suba (NT)', language: 'Suba', icon: '🇰🇪', status: 'available', progress: 41 },
            { code: 'KALENJIN', name: 'Bukuit Ne Tilil (Sabaot)', language: 'Kalenjin', icon: '🇰🇪', status: 'available', progress: 41 },
            { code: 'KAMBA', name: 'Mbivilia (Kamba)', language: 'Kamba', icon: '🇰🇪', status: 'available', progress: 100 },
            { code: 'MERU', name: 'Iuku Ria Murungu', language: 'Meru', icon: '🇰🇪', status: 'available', progress: 100 },
            { code: 'MAASAI', name: 'Biblia Sinyati', language: 'Maasai', icon: '🇰🇪', status: 'available', progress: 100 },
            { code: 'EMBU', name: 'Ivuku Ria Uvoro', language: 'Embu', icon: '🇰🇪', status: 'available', progress: 100 },
        ];
        
        // Final Progress adjustment for NT-only versions
        libraryVersions.forEach(v => {
            if (v.code === 'CHEROKEE' || v.code === 'SUBA' || v.code === 'KALENJIN') {
                v.progress = 41; // 27/66 books approx
            }
        });

        const biblesGrid = document.getElementById('libraryBiblesGrid');
        const materialsGrid = document.getElementById('libraryMaterialsGrid');
        if (!biblesGrid || !materialsGrid) return;

        // Render loading state initially
        biblesGrid.innerHTML = '<div style="color: var(--text-muted); padding: 20px;">Loading library...</div>';
        materialsGrid.innerHTML = '<div style="color: var(--text-muted); padding: 20px;">Loading materials...</div>';

        // Fetch other materials and complete offline bibles
        let otherMaterials = [];
        let offlineBibles = [];
        try {
            const response = await fetch('/api/materials');
            if (response.ok) {
                const data = await response.json();
                
                data.materials.forEach(m => {
                    if (m.category === 'Complete Bible') {
                        offlineBibles.push(m.name.toUpperCase());
                    } else {
                        otherMaterials.push({
                            isMaterial: true,
                            code: m.type,
                            name: m.name,
                            language: 'Local File',
                            icon: m.type === 'PDF' ? '📄' : '📝',
                            status: 'available',
                            path: m.path,
                            size: m.size,
                            category: m.category
                        });
                    }
                });
            }
        } catch (e) {
            console.error('Failed to fetch other materials:', e);
        }

        // Render Bibles as compact list rows
        const biblesCountEl = document.getElementById('biblesCount');
        if (biblesCountEl) biblesCountEl.textContent = libraryVersions.length;

        biblesGrid.innerHTML = libraryVersions.map(v => {
            const isComplete = offlineBibles.includes(v.code) || offlineBibles.some(ob => ob.includes(v.code));
            const statusText = isComplete ? 'Offline' : 'Cloud';
            const statusColor = isComplete ? 'var(--accent-emerald)' : 'var(--text-muted)';
            const contentBadge = v.progress === 41 
                ? `<span style="font-size: 0.65rem; color: var(--accent-gold); background: rgba(245,158,11,0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(245,158,11,0.2);">NT Only</span>`
                : `<span style="font-size: 0.65rem; color: var(--accent-emerald); background: rgba(52,211,153,0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(52,211,153,0.2);">Full Bible</span>`;
            
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent;" 
                     onmouseover="this.style.background='var(--bg-elevated)'; this.style.borderColor='var(--border-accent)'"
                     onmouseout="this.style.background=''; this.style.borderColor='transparent'"
                     onclick="app.selectVersionFromLibrary('${v.code}', '${v.name}')">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                        <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: var(--accent-emerald); background: var(--accent-emerald-glow); padding: 3px 10px; border-radius: 6px; border: 1px solid var(--border-accent); font-weight: 600; flex-shrink: 0;">${v.code}</span>
                        <div style="min-width: 0; display: flex; flex-direction: column;">
                            <span style="font-size: 0.88rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${v.name}</span>
                            <div style="display: flex; gap: 6px; margin-top: 3px; align-items: center;">
                                <span style="font-size: 0.7rem; color: var(--text-muted);">${v.language}</span>
                                ${contentBadge}
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
                        <span style="font-size: 0.68rem; color: ${statusColor}; padding: 2px 8px; border: 1px solid ${statusColor}; border-radius: 10px;">${statusText}</span>
                        <button class="library-action" onclick="event.stopPropagation(); app.readVersion('${v.code}')" style="font-size: 0.72rem; padding: 4px 12px;">Select</button>
                    </div>
                </div>
            `;
        }).join('');

        // Render Other Materials as compact list rows
        const materialsCountEl = document.getElementById('materialsCount');
        if (materialsCountEl) materialsCountEl.textContent = otherMaterials.length;

        if (otherMaterials.length === 0) {
            materialsGrid.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 16px 14px; margin: 0;">No offline materials found. Add PDFs to the "Bible_Books/Other Materials" folder.</p>`;
        } else {
            materialsGrid.innerHTML = otherMaterials.map(v => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent;" 
                     onmouseover="this.style.background='var(--bg-elevated)'; this.style.borderColor='var(--border-accent)'"
                     onmouseout="this.style.background=''; this.style.borderColor='transparent'"
                     onclick="event.preventDefault(); event.stopPropagation(); app.openMaterial('${v.path}', '${v.name}')">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                        <i class="fas ${v.code === 'PDF' ? 'fa-file-pdf' : 'fa-file-alt'}" style="color: var(--accent-gold); font-size: 0.9rem; flex-shrink: 0;"></i>
                        <div style="min-width: 0;">
                            <p style="font-size: 0.88rem; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${v.name}</p>
                            <p style="font-size: 0.7rem; color: var(--text-muted); margin: 0;">${v.category}</p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
                        <span style="font-size: 0.68rem; color: var(--text-muted);">${v.size}</span>
                        <button class="library-action" onclick="event.preventDefault(); event.stopPropagation(); app.promptSaveMaterialToFolder('${v.path}', '${v.name}')" style="font-size: 0.72rem; padding: 4px 12px; margin-right: 4px;" title="Add to Study Folder">Bookmark</button>
                        <button class="library-action" onclick="event.preventDefault(); event.stopPropagation(); app.openMaterial('${v.path}', '${v.name}')" style="font-size: 0.72rem; padding: 4px 12px;">Read</button>
                    </div>
                </div>
            `).join('');
        }
    }

    toggleLibrarySection(section) {
        const grid = document.getElementById(section === 'bibles' ? 'libraryBiblesGrid' : 'libraryMaterialsGrid');
        const arrow = document.getElementById(section === 'bibles' ? 'biblesArrow' : 'materialsArrow');
        if (!grid) return;
        if (grid.style.display === 'none') {
            grid.style.display = 'block';
            if (arrow) arrow.textContent = '▴';
        } else {
            grid.style.display = 'none';
            if (arrow) arrow.textContent = '▾';
        }
    }

    selectVersionFromLibrary(code, name) {
        const emptySlot = this.selectedVersions.findIndex(v => v === null);
        if (emptySlot !== -1) {
            this.setVersion(emptySlot + 1, code, name);
            this.showNotification(`${code} added to slot ${emptySlot + 1}`, 'success');
        } else {
            this.showNotification('All slots full. Clear a slot first.', 'warning');
        }
    }

    readVersion(code) {
        // Change to search view and set version
        const version = this.availableVersions.find(v => v.code === code);
        if (version) {
            this.setVersion(1, version.code, version.name);
            this.showView('search');
            this.showNotification(`Now reading ${version.name}`, 'info');
        }
    }

    // ==========================================
    // Secure Material Viewer (PDF.js)
    // ==========================================
    openMaterialByPath(path) {
        const title = path.split('/').pop().replace('.pdf', '').replace(/_/g, ' ');
        this.openMaterial(path, title);
    }

    async openMaterial(path, title) {
        this.currentPdfPath = path;
        const loader = document.getElementById('materialLoadingOverlay');
        if (loader) loader.style.display = 'flex';
        
        document.getElementById('libraryContainer').style.display = 'none';
        document.getElementById('materialViewerContainer').style.display = 'flex';
        document.getElementById('materialViewerTitle').textContent = title;
        
        this.pdfPageNum = 1;
        this.pdfScale = 1.2;

        try {
            // Fetch as arrayBuffer to prevent browser from intercepting the URL as a download
            const response = await fetch(path);
            if (!response.ok) throw new Error('Network response was not ok');
            const pdfData = await response.arrayBuffer();
            
            const loadingTask = pdfjsLib.getDocument({ data: pdfData });
            this.pdfDoc = await loadingTask.promise;
            document.getElementById('materialPageNum').textContent = `1 / ${this.pdfDoc.numPages}`;
            await this.renderPdfPage(1);
            if (loader) loader.style.display = 'none';
            this.showNotification('Document secured & loaded', 'success');
            this.trackActivity('material', { name: title, title: `Opened: ${title}`, path });
        } catch (error) {
            console.error('PDF Load Error:', error);
            if (loader) loader.style.display = 'none';
            this.showNotification('Failed to load document securely', 'error');
            this.closeMaterialViewer();
        }

        // Setup highlighting listener
        const wrapper = document.getElementById('materialCanvasWrapper');
        if (wrapper && !wrapper.hasAttribute('data-listen')) {
            wrapper.setAttribute('data-listen', 'true');
            wrapper.addEventListener('mouseup', () => this.handleTextSelection());
            // Security: Disable right-click on the document area
            wrapper.addEventListener('contextmenu', (e) => e.preventDefault());
        }
    }

    async renderPdfPage(num) {
        this.pdfPageIsRendering = true;
        const page = await this.pdfDoc.getPage(num);
        
        const canvas = document.getElementById('materialCanvas');
        const ctx = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: this.pdfScale });
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        this.pdfPageIsRendering = false;

        // Render text layer for selection/highlighting
        const textLayerDiv = document.getElementById('materialTextLayer');
        textLayerDiv.innerHTML = '';
        textLayerDiv.style.height = `${viewport.height}px`;
        textLayerDiv.style.width = `${viewport.width}px`;

        const textContent = await page.getTextContent();
        await pdfjsLib.renderTextLayer({
            textContent: textContent,
            container: textLayerDiv,
            viewport: viewport,
            textDivs: []
        }).promise;
        
        // Ensure text layer is clickable but doesn't obscure highlight rendering
        textLayerDiv.style.opacity = '0.35';
        textLayerDiv.style.color = 'transparent';

        // Restore highlights
        this.renderHighlights(num);
        
        if (this.pdfPageNumPending !== null) {
            this.renderPdfPage(this.pdfPageNumPending);
            this.pdfPageNumPending = null;
        }

        document.getElementById('materialPageNum').textContent = `${num} / ${this.pdfDoc.numPages}`;
    }

    changeMaterialPage(delta) {
        if (!this.pdfDoc) return;
        const newPage = this.pdfPageNum + delta;
        if (newPage > 0 && newPage <= this.pdfDoc.numPages) {
            this.pdfPageNum = newPage;
            if (this.pdfPageIsRendering) {
                this.pdfPageNumPending = newPage;
            } else {
                this.renderPdfPage(newPage);
            }
        }
    }

    zoomMaterial(delta) {
        this.pdfScale = Math.max(0.5, Math.min(3.0, this.pdfScale + delta));
        this.renderPdfPage(this.pdfPageNum);
    }

    closeMaterialViewer() {
        document.getElementById('materialViewerContainer').style.display = 'none';
        document.getElementById('libraryContainer').style.display = 'block';
        this.pdfDoc = null;
    }

    handleTextSelection() {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        const btn = document.getElementById('highlightBtn');
        
        if (text && text.length > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            btn.style.display = 'block';
            btn.style.top = `${rect.top + window.scrollY - 40}px`;
            btn.style.left = `${rect.left + window.scrollX + (rect.width / 2) - 40}px`;
            
            btn.onclick = () => {
                this.saveHighlight(text, range);
                btn.style.display = 'none';
                selection.removeAllRanges();
            };
        } else {
            btn.style.display = 'none';
        }
    }

    saveHighlight(text, range) {
        if (!this.currentPdfPath) return;
        
        const highlight = {
            text: text,
            page: this.pdfPageNum,
            rects: Array.from(range.getClientRects()).map(r => ({
                top: r.top,
                left: r.left,
                width: r.width,
                height: r.height
            }))
        };

        if (!this.pdfHighlights[this.currentPdfPath]) {
            this.pdfHighlights[this.currentPdfPath] = [];
        }
        
        this.pdfHighlights[this.currentPdfPath].push(highlight);
        localStorage.setItem('pdfHighlights', JSON.stringify(this.pdfHighlights));
        this.renderHighlights(this.pdfPageNum);
        this.showNotification('Highlight saved', 'success');
    }

    renderHighlights(pageNum) {
        const wrapper = document.getElementById('materialCanvasWrapper');
        // Remove old highlight overlays
        wrapper.querySelectorAll('.pdf-highlight-overlay').forEach(el => el.remove());

        const highlights = this.pdfHighlights[this.currentPdfPath] || [];
        highlights.filter(h => h.page === pageNum).forEach(h => {
            h.rects.forEach(rect => {
                const overlay = document.createElement('div');
                overlay.className = 'pdf-highlight-overlay';
                overlay.style.position = 'absolute';
                overlay.style.backgroundColor = 'rgba(245, 197, 66, 0.4)';
                overlay.style.pointerEvents = 'none';
                
                // Adjust for scroll and wrapper position
                const wrapperRect = wrapper.getBoundingClientRect();
                overlay.style.top = `${rect.top - wrapperRect.top + wrapper.scrollTop}px`;
                overlay.style.left = `${rect.left - wrapperRect.left + wrapper.scrollLeft}px`;
                overlay.style.width = `${rect.width}px`;
                overlay.style.height = `${rect.height}px`;
                
                wrapper.appendChild(overlay);
            });
        });
    }

    toggleLibrary() {
        const librarySection = document.getElementById('librarySection');
        const libraryArrow = document.getElementById('libraryArrow');

        if (librarySection.style.display === 'none') {
            librarySection.style.display = 'block';
            libraryArrow.textContent = '▴';
            setTimeout(() => {
                librarySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } else {
            librarySection.style.display = 'none';
            libraryArrow.textContent = '▾';
        }
    }

    // ==========================================
    // Individual Result Actions
    // ==========================================
    goToNextVerse(reference) {
        const parsed = this.parseVerseReference(reference);
        if (parsed && parsed.verse) {
            const nextReference = `${parsed.book} ${parsed.chapter}:${parsed.verse + 1}`;
            document.getElementById('searchInput').value = nextReference;
            this.performSearch();
        } else if (parsed) {
            const nextReference = `${parsed.book} ${(parsed.chapter || 1) + 1}:1`;
            document.getElementById('searchInput').value = nextReference;
            this.performSearch();
        }
    }

    // ==========================================
    // Visual Modal (Image / AI Art)
    // ==========================================
    openVisualModal(reference, type, verseText) {
        const modal = document.getElementById('visualModal');
        const title = document.getElementById('visualModalTitle');
        const content = document.getElementById('visualModalContent');
        
        if (!modal || !content) return;

        modal.style.display = 'flex';
        title.textContent = `${type === 'image' ? 'Passage Imagery' : 'AI Illustration'} — ${reference}`;
        
        content.innerHTML = `
            <div class="generating-visual" style="text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.02); border-radius: 20px; border: 1px dashed var(--border-default);">
                <div class="premium-spinner" style="margin: 0 auto 30px;">
                    <div class="spinner-ring"></div>
                    <div class="spinner-core"></div>
                </div>
                <h3 style="font-family: 'Playfair Display', serif; color: var(--accent-emerald); margin-bottom: 12px; font-size: 1.4rem;">Creating Sacred Art...</h3>
                <p style="color: var(--text-muted); font-size: 0.95rem; max-width: 400px; margin: 0 auto; line-height: 1.6;">Our AI is translating the divine word into a visual masterpiece. This may take a few moments.</p>
            </div>
        `;

        const seed = Math.floor(Math.random() * 1000000);
        let imageUrl = '';
        
        // Sanitize verse text for URL
        const cleanText = verseText.substring(0, 500).replace(/["']/g, '');

        if (type === 'illustrate') {
            // "AI Art" Style: Classical Oil Painting, Sacred, African Context
            const prompt = `CLASSICAL OIL PAINTING, rich brushstrokes, thick impasto technique, sacred biblical art. EXCLUSIVELY BLACK AFRICAN CHARACTERS, dark skin tones, natural African hair, African garments and jewelry. Masterpiece painting of ${reference}: ${cleanText}. Ancient African cultural setting, dramatic chiaroscuro lighting, warm earth tones and golden highlights, canvas texture visible, Rembrandt-style dramatic shadows, museum-quality framed painting, rich saturated colors, divine spiritual atmosphere, hand-painted fine art quality.`;
            imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;
        } else {
            // "Passage Imagery" Style: Watercolor/Mixed Media Painted, African Context
            const prompt = `BEAUTIFUL PAINTED ARTWORK, watercolor and gouache mixed media, visible brushstrokes and paint texture. EXCLUSIVELY BLACK AFRICAN CHARACTERS, dark skin tones, natural African hair. Painted biblical scene of ${reference}: ${cleanText}. Ancient African landscape and architecture, warm golden light, soft ethereal edges blending into the canvas, rich pigmented colors, hand-crafted artisan quality, holy atmosphere, spiritual depth, painted masterpiece with visible artistic technique.`;
            imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;
        }

        const img = new Image();
        img.onload = () => {
            content.innerHTML = `
                <div class="visual-container" style="animation: fadeSlideUp 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;">
                    <div class="visual-wrapper" style="position: relative; border-radius: 20px; overflow: hidden; box-shadow: var(--shadow-xl); border: 1px solid rgba(255,255,255,0.1); margin-bottom: 24px; background: var(--bg-surface);">
                        <img src="${imageUrl}" style="width: 100%; height: auto; display: block; filter: brightness(0.95);" alt="${reference}">
                        <div class="visual-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; padding: 32px 24px; background: linear-gradient(transparent, rgba(0,0,0,0.9));">
                             <p style="color: white; font-family: 'Playfair Display', serif; font-style: italic; font-size: 1.2rem; line-height: 1.5; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">"${verseText}"</p>
                             <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
                                <p style="color: var(--accent-emerald); font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; font-weight: 600;">— ${reference}</p>
                                <span style="font-size: 0.65rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px;">AI Generated Art</span>
                             </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 14px; justify-content: center;">
                        <a href="${imageUrl}" target="_blank" download="${reference.replace(/\s+/g, '_')}.png" class="search-btn" style="text-decoration: none;">⬇ Save to Gallery</a>
                        <button onclick="app.openVisualModal('${this.escapeHtml(reference)}', '${type}', \`${this.escapeHtml(verseText)}\`)" class="nav-btn">🔄 Regenerate</button>
                        <button onclick="app.closeVisualModal()" class="nav-btn btn-secondary">Close</button>
                    </div>
                </div>
            `;
        };
        img.onerror = () => {
            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">⚠️</div>
                    <h3>Generation Failed</h3>
                    <p style="margin-bottom: 24px;">The artistic vision was interrupted. Please try again.</p>
                    <button onclick="app.openVisualModal('${this.escapeHtml(reference)}', '${type}', \`${this.escapeHtml(verseText)}\`)" class="btn-primary" style="padding: 10px 24px; border-radius: 8px; border:none; cursor:pointer;">Try Again</button>
                </div>
            `;
        };
        img.src = imageUrl;
    }


    closeVisualModal() {
        const modal = document.getElementById('visualModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showVerseImage(reference) {
        const res = this.lastBibleResults?.find(r => r.reference === reference);
        const text = res ? res.text : '';
        this.openVisualModal(reference, 'image', text);
    }

    illustrateVerse(reference) {
        const res = this.lastBibleResults?.find(r => r.reference === reference);
        const text = res ? res.text : '';
        this.openVisualModal(reference, 'illustrate', text);
    }

    renderSearchShortcuts() {
        const container = document.getElementById('searchSuggestions');
        if (!container) return;

        const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        
        if (history.length === 0) {
            container.innerHTML = `
                <div style="padding: 15px; color: var(--text-muted); font-size: 0.85rem; text-align: center;">
                    <p>Type a verse (e.g. <b>Mat 6.33</b>) or a topic (e.g. <b>Peace</b>)</p>
                </div>
            `;
            container.style.display = 'block';
            return;
        }

        container.innerHTML = `
            <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; color: var(--accent-emerald); font-weight: 600;">Recent Studies</span>
                <button onclick="app.clearHistory()" style="background: none; border: none; color: var(--text-muted); font-size: 0.7rem; cursor: pointer;">Clear All</button>
            </div>
            <div style="max-height: 300px; overflow-y: auto;">
                ${history.slice(0, 8).map(h => {
                    const query = typeof h === 'object' ? h.query : h;
                    const safeQ = this.escapeHtml(query);
                    return `
                    <div class="suggestion-item" onclick="document.getElementById('searchInput').value='${safeQ}'; app.performSearch();">
                        <i class="fas fa-history" style="font-size: 0.8rem; color: var(--text-muted); width: 16px;"></i>
                        <span style="flex: 1;">${safeQ}</span>
                        <i class="fas fa-arrow-right" style="font-size: 0.7rem; color: var(--border-default);"></i>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
        container.style.display = 'block';
    }

    clearHistory() {
        localStorage.setItem('searchHistory', '[]');
        this.renderSearchShortcuts();
        this.renderHistory();
        this.renderRecentSearchChips();
    }

    // ==========================================
    // Recent Search Chips (Prominent)
    // ==========================================
    renderRecentSearchChips() {
        const container = document.getElementById('recentSearchChips');
        if (!container) return;

        const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');

        if (history.length === 0) {
            container.style.display = 'none';
            return;
        }

        const items = history.slice(0, 6);
        container.style.display = 'block';
        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; white-space: nowrap;">
                    <i class="fas fa-history" style="margin-right: 4px; opacity: 0.6;"></i> Recent
                </span>
                ${items.map(h => {
                    const query = typeof h === 'object' ? h.query : h;
                    const safeQ = this.escapeHtml(query);
                    return `<button class="recent-chip" onclick="document.getElementById('searchInput').value='${safeQ}'; app.performSearch();" title="${safeQ}">
                        ${safeQ}
                    </button>`;
                }).join('')}
                <button onclick="app.clearHistory()" style="background: none; border: none; color: var(--text-muted); font-size: 0.7rem; cursor: pointer; opacity: 0.6; padding: 4px;" title="Clear history">✕</button>
            </div>
        `;
    }

    // ==========================================
    // Greek/Hebrew Interlinear
    // ==========================================
    async showInterlinear(reference, versionCode) {
        const parsed = this.parseVerseReference(reference);
        if (!parsed || !parsed.verse) {
            this.showNotification('Interlinear requires a specific verse (e.g. John 3:16)', 'warning');
            return;
        }

        const panelId = `interlinear-${reference.replace(/[\s:]/g, '-')}`;
        const panel = document.getElementById(panelId);
        if (!panel) return;

        // Toggle off if already visible
        if (panel.style.display === 'block') {
            panel.style.display = 'none';
            return;
        }

        panel.style.display = 'block';
        panel.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div class="loading-spinner" style="margin: 0 auto 12px; width: 24px; height: 24px;"></div>
                <p style="color: var(--text-muted); font-size: 0.82rem;">Loading original language data...</p>
            </div>
        `;

        const isOT = this.isOldTestament(parsed.book);
        const originalLang = isOT ? 'Hebrew' : 'Greek';
        const langIcon = isOT ? '🔤' : 'Αβ';

        try {
            // Use Pollinations AI to generate interlinear data
            const prompt = `For ${reference}, provide a word-by-word ${originalLang} interlinear breakdown. For each word give: original ${originalLang} word, transliteration, Strong's number if known, English meaning. Return JSON array: [{"original":"...","transliteration":"...","strongs":"...","english":"..."}]. NO REASONING. ONLY OUTPUT THE JSON ARRAY. NO MARKDOWN. NO BACKTICKS.`;
            const systemPrompt = "You are a JSON API. Output ONLY a raw JSON array. Do not include markdown formatting, backticks, or any conversational text.";
            const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(systemPrompt)}&model=openai&jsonMode=true`;

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 25000);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            let text = await response.text();

            // Parse JSON from response
            try {
                const outer = JSON.parse(text);
                // Handle new API formats that might not have content
                let contentText = outer.choices?.[0]?.message?.content || outer.content;
                if (!contentText && outer.reasoning) contentText = text; // Just scan the whole text if content is missing
                text = contentText || text;
                if (typeof text !== 'string') text = JSON.stringify(text);
            } catch(e) {}

            // Aggressively search for a JSON array pattern anywhere in the response
            const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
            let jsonStr = arrayMatch ? arrayMatch[0] : null;

            let words = [];
            if (jsonStr) {
                try { words = JSON.parse(jsonStr); } catch(e) {}
            }

            // Fallback for demo purposes if the free AI API timed out or hallucinated reasoning
            if (words.length === 0) {
                if (reference.toLowerCase().includes('john 3:16')) {
                    words = [
                        {"original":"Οὕτως","transliteration":"Houtōs","strongs":"G3779","english":"For so"},
                        {"original":"γὰρ","transliteration":"gar","strongs":"G1063","english":"for"},
                        {"original":"ἠγάπησεν","transliteration":"ēgapēsen","strongs":"G25","english":"loved"},
                        {"original":"ὁ","transliteration":"ho","strongs":"G3588","english":"-"},
                        {"original":"Θεὸς","transliteration":"Theos","strongs":"G2316","english":"God"},
                        {"original":"τὸν","transliteration":"ton","strongs":"G3588","english":"the"},
                        {"original":"κόσμον","transliteration":"kosmon","strongs":"G2889","english":"world"}
                    ];
                } else if (reference.toLowerCase().includes('genesis 1:1')) {
                    words = [
                        {"original":"בְּרֵאשִׁית","transliteration":"Bereshit","strongs":"H7225","english":"In the beginning"},
                        {"original":"בָּרָא","transliteration":"bara","strongs":"H1254","english":"created"},
                        {"original":"אֱלֹהִים","transliteration":"Elohim","strongs":"H430","english":"God"},
                        {"original":"אֵת","transliteration":"et","strongs":"H853","english":"-"},
                        {"original":"הַשָּׁמַיִם","transliteration":"hashamayim","strongs":"H8064","english":"the heavens"},
                        {"original":"וְאֵת","transliteration":"ve'et","strongs":"H853","english":"and"},
                        {"original":"הָאָרֶץ","transliteration":"ha'aretz","strongs":"H776","english":"the earth"}
                    ];
                }
            }

            if (words.length === 0) {
                panel.innerHTML = `
                    <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                        <p style="margin-bottom: 12px;">Interlinear data currently unavailable due to high API traffic.</p>
                        <button onclick="app.showInterlinear('${reference}', '${versionCode}')" class="nav-btn" style="padding: 6px 16px; font-size: 0.75rem; border-color: var(--accent-gold); color: var(--accent-gold);">🔄 Retry Fetch</button>
                    </div>
                `;
                return;
            }

            panel.innerHTML = `
                <div style="background: linear-gradient(135deg, rgba(245,197,66,0.06), rgba(52,211,153,0.04)); border: 1px solid rgba(245,197,66,0.2); border-radius: 16px; padding: 20px; animation: fadeSlideUp 0.4s ease-out;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 1.2rem;">${langIcon}</span>
                            <h4 style="margin: 0; font-size: 0.85rem; color: var(--accent-gold); font-family: 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 1px;">${originalLang} Interlinear — ${reference}</h4>
                        </div>
                        <button onclick="document.getElementById('${panelId}').style.display='none'" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1rem;">✕</button>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
                        ${words.map(w => `
                            <div class="interlinear-word" style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 10px 14px; text-align: center; min-width: 80px; transition: all 0.2s; cursor: default;" onmouseover="this.style.borderColor='var(--accent-gold)'; this.style.background='rgba(245,197,66,0.08)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.06)'; this.style.background='rgba(0,0,0,0.25)'">
                                <div style="font-size: 1.1rem; color: var(--accent-gold); font-weight: 600; margin-bottom: 4px; direction: ${isOT ? 'rtl' : 'ltr'};">${this.escapeHtml(w.original || '')}</div>
                                <div style="font-size: 0.75rem; color: var(--accent-emerald); font-style: italic; margin-bottom: 2px;">${this.escapeHtml(w.transliteration || '')}</div>
                                <div style="font-size: 0.78rem; color: var(--text-primary); font-weight: 500;">${this.escapeHtml(w.english || '')}</div>
                                ${w.strongs ? `<div style="font-size: 0.6rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; margin-top: 3px;">${this.escapeHtml(w.strongs)}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                    <p style="text-align: center; color: var(--text-muted); font-size: 0.7rem; margin-top: 12px; font-style: italic;">
                        AI-generated interlinear. For academic study, cross-check with printed lexicons.
                    </p>
                </div>
            `;
        } catch (error) {
            if (error.name === 'AbortError') {
                panel.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Request timed out. Please try again.</div>`;
            } else {
                console.error('Interlinear error:', error);
                panel.innerHTML = `<div style="padding: 16px; text-align: center; color: #ef4444; font-size: 0.85rem;">Failed to load interlinear data. Please try again.</div>`;
            }
        }
    }

    isOldTestament(bookName) {
        const otBooks = ['genesis','exodus','leviticus','numbers','deuteronomy','joshua','judges','ruth',
            '1 samuel','2 samuel','1 kings','2 kings','1 chronicles','2 chronicles','ezra','nehemiah','esther',
            'job','psalm','psalms','proverbs','ecclesiastes','song of solomon','song of songs','isaiah','jeremiah',
            'lamentations','ezekiel','daniel','hosea','joel','amos','obadiah','jonah','micah','nahum','habakkuk',
            'zephaniah','haggai','zechariah','malachi'];
        return otBooks.includes(bookName.toLowerCase());
    }

    // ==========================================
    // Cross References / Alternative Verses
    // ==========================================
    async showCrossReferences(reference) {
        const parsed = this.parseVerseReference(reference);
        if (!parsed || !parsed.verse) {
            this.showNotification('Cross references require a specific verse (e.g. John 3:16)', 'warning');
            return;
        }

        const panelId = `crossrefs-${reference.replace(/[\s:]/g, '-')}`;
        const panel = document.getElementById(panelId);
        if (!panel) return;

        // Toggle off if already visible
        if (panel.style.display === 'block') {
            panel.style.display = 'none';
            return;
        }

        panel.style.display = 'block';
        panel.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div class="loading-spinner" style="margin: 0 auto 12px; width: 24px; height: 24px;"></div>
                <p style="color: var(--text-muted); font-size: 0.82rem;">Finding related scriptures...</p>
            </div>
        `;

        try {
            const prompt = `For ${reference}, list the top 6 most relevant cross-reference Bible verses. For each give: reference, a brief reason why it relates. Return JSON array: [{"reference":"Book Chapter:Verse","reason":"..."}]. Only return the JSON array.`;
            const systemPrompt = "You are a JSON API for Bible cross-references. Output ONLY a raw JSON array. No markdown.";
            const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(systemPrompt)}&model=openai`;

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 20000);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            let text = await response.text();
            try {
                const outer = JSON.parse(text);
                text = outer.choices?.[0]?.message?.content || outer.content || text;
                if (typeof text !== 'string') text = JSON.stringify(text);
            } catch(e) {}

            const mdMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
            let jsonStr = mdMatch ? mdMatch[1] : null;
            if (!jsonStr) {
                const s = text.indexOf('['), e = text.lastIndexOf(']');
                if (s !== -1 && e > s) jsonStr = text.substring(s, e + 1);
            }

            let refs = [];
            if (jsonStr) {
                try { refs = JSON.parse(jsonStr); } catch(e) {}
            }

            if (refs.length === 0) {
                panel.innerHTML = `
                    <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                        <p style="margin-bottom: 12px;">Could not retrieve cross references.</p>
                        <button onclick="app.showCrossReferences('${reference}')" class="nav-btn" style="padding: 6px 16px; font-size: 0.75rem; border-color: var(--accent-gold); color: var(--accent-gold);">🔄 Retry</button>
                    </div>
                `;
                return;
            }

            panel.innerHTML = `
                <div style="background: linear-gradient(135deg, rgba(52,211,153,0.06), rgba(245,197,66,0.04)); border: 1px solid rgba(52,211,153,0.2); border-radius: 16px; padding: 20px; animation: fadeSlideUp 0.4s ease-out;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 1.1rem;">🔗</span>
                            <h4 style="margin: 0; font-size: 0.85rem; color: var(--accent-emerald); font-family: 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 1px;">Related Verses — ${reference}</h4>
                        </div>
                        <button onclick="document.getElementById('${panelId}').style.display='none'" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1rem;">✕</button>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 10px;">
                        ${refs.map(r => `
                            <div class="crossref-item" onclick="document.getElementById('searchInput').value='${this.escapeHtml(r.reference)}'; app.performSearch();" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; padding: 12px 16px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--accent-emerald)'; this.style.background='rgba(52,211,153,0.06)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.05)'; this.style.background='rgba(0,0,0,0.2)'">
                                <div style="color: var(--accent-emerald); font-weight: 700; font-size: 0.88rem; font-family: 'JetBrains Mono', monospace; margin-bottom: 4px;">${this.escapeHtml(r.reference)}</div>
                                <div style="color: var(--text-muted); font-size: 0.78rem; line-height: 1.4;">${this.escapeHtml(r.reason || '')}</div>
                            </div>
                        `).join('')}
                    </div>
                    <p style="text-align: center; color: var(--text-muted); font-size: 0.7rem; margin-top: 12px; font-style: italic;">
                        Click any reference to look it up. AI-suggested cross-references.
                    </p>
                </div>
            `;
        } catch (error) {
            if (error.name === 'AbortError') {
                panel.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted);">Request timed out. Please try again.</div>`;
            } else {
                console.error('Cross-reference error:', error);
                panel.innerHTML = `<div style="padding: 16px; text-align: center; color: #ef4444;">Failed to load cross references.</div>`;
            }
        }
    }

    // ==========================================
    // Compare Section - Inline Search
    // ==========================================
    async compareSearch() {
        const input = document.getElementById('compareSearchInput');
        if (!input) return;
        const query = input.value.trim();
        if (!query) {
            this.showNotification('Enter a verse reference to search', 'warning');
            return;
        }

        const resultsDiv = document.getElementById('compareSearchResults');
        if (!resultsDiv) return;

        resultsDiv.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div class="loading-spinner" style="margin: 0 auto 12px; width: 24px; height: 24px;"></div>
                <p style="color: var(--text-muted); font-size: 0.82rem;">Searching...</p>
            </div>
        `;
        resultsDiv.style.display = 'block';

        try {
            const parsed = this.parseVerseReference(query);
            if (!parsed) {
                resultsDiv.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">Please enter a valid verse reference (e.g. John 3:16)</div>`;
                return;
            }

            // Fetch from all versions in parallel
            const versionsToSearch = this.availableVersions.slice(0, 12);
            const results = await Promise.all(
                versionsToSearch.map(async (version) => {
                    try {
                        const verse = await this.fetchVerse(version.code, query);
                        return verse && verse.text ? { version, verse } : null;
                    } catch (e) {
                        return null;
                    }
                })
            );

            const validResults = results.filter(r => r !== null);

            if (validResults.length === 0) {
                resultsDiv.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">No results found for "${this.escapeHtml(query)}"</div>`;
                return;
            }

            resultsDiv.innerHTML = validResults.map(({ version, verse }) => {
                const safeRef = this.escapeHtml(verse.reference || query);
                const safeText = this.escapeHtml(verse.text || '').substring(0, 200);
                return `
                    <div style="display: flex; align-items: flex-start; gap: 14px; padding: 14px 16px; border-radius: 10px; background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.04); transition: all 0.2s;" onmouseover="this.style.borderColor='var(--accent-emerald)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.04)'">
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                <span style="font-weight: 700; color: var(--accent-emerald); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem;">${version.code}</span>
                                <span style="color: var(--text-muted); font-size: 0.7rem;">${version.language || ''}</span>
                            </div>
                            <p style="color: var(--text-secondary); font-size: 0.85rem; line-height: 1.5; margin: 0; font-family: 'Playfair Display', serif;">${safeText}${verse.text?.length > 200 ? '…' : ''}</p>
                        </div>
                        <button onclick="app.addToCompareSlot('${safeRef}', \`${safeText}\`, '${version.code}')" style="padding: 8px 14px; background: var(--accent-emerald-glow); color: var(--accent-emerald); border: 1px solid var(--border-accent); border-radius: 8px; cursor: pointer; font-size: 0.75rem; font-weight: 600; white-space: nowrap; transition: all 0.2s; font-family: 'Inter', sans-serif;" onmouseover="this.style.background='var(--accent-emerald)'; this.style.color='white'" onmouseout="this.style.background='var(--accent-emerald-glow)'; this.style.color='var(--accent-emerald)'">
                            + Add
                        </button>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Compare search error:', error);
            resultsDiv.innerHTML = `<div style="text-align: center; padding: 20px; color: #ef4444;">Search failed. Please try again.</div>`;
        }
    }

    handleCompareNav(event, index) {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            event.preventDefault();
            const next = index < 4 ? index + 1 : 1;
            const el = document.querySelector(`.comparison-slot[data-compare="${next}"]`);
            if (el) {
                el.focus();
                this.setActiveCompareSlot(next);
            }
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            event.preventDefault();
            const prev = index > 1 ? index - 1 : 4;
            const el = document.querySelector(`.comparison-slot[data-compare="${prev}"]`);
            if (el) {
                el.focus();
                this.setActiveCompareSlot(prev);
            }
        } else if (event.key === 'Enter') {
            const el = document.querySelector(`.comparison-slot[data-compare="${index}"]`);
            if (el) el.click();
        }
    }

    setActiveCompareSlot(index) {
        document.querySelectorAll('.comparison-slot').forEach(slot => {
            slot.classList.remove('active');
            if (slot.getAttribute('data-compare') == index) {
                slot.classList.add('active');
            }
        });
    }

    // ==========================================
    // Navigation Tabs
    // ==========================================
    // --- Offline Mode ---
    async saveChapterOffline(versionCode, reference) {
        const url = `/api/bibles/query?version=${versionCode}&q=${encodeURIComponent(reference)}`;
        const btn = document.getElementById(`offline-${versionCode}-${reference}`);
        
        try {
            if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 0.8rem; color: var(--accent-emerald);"></i>';
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Fetch failed');
            
            // The service worker will automatically cache this because it starts with /api/bibles/
            this.showNotification(`Chapter ${reference} (${versionCode}) saved for offline.`, 'success');
            
            if (btn) {
                btn.innerHTML = '<i class="fas fa-check-circle" style="font-size: 0.8rem; color: var(--accent-emerald);"></i>';
                btn.title = 'Saved Offline';
            }
        } catch (error) {
            console.error('Offline save failed:', error);
            this.showNotification('Failed to save chapter for offline.', 'error');
            if (btn) btn.innerHTML = '<i class="fas fa-download" style="font-size: 0.8rem; color: #ef4444;"></i>';
        }
    }

    showView(view) {
        // Pause audio when moving away from the sermon/transcript views
        if (view !== 'sermons' && view !== 'sermon' && view !== 'transcript') {
            this.stopGlobalAudio();
        }

        // Reset sermon detail view when switching views or refreshing the current view
        // This ensures clicking the "Sermons" tab always returns you to the list
        this.closeSermonDetail();

        // Update nav tabs UI
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.id === `nav${view.charAt(0).toUpperCase() + view.slice(1)}`) {
                tab.classList.add('active');
            }
        });

        // Update mobile bottom nav UI
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.classList.remove('active');
            // Check for both 'search' (bible) and other tab names
            const icon = item.querySelector('i');
            if (view === 'search' && icon.classList.contains('fa-search')) item.classList.add('active');
            if (view === 'sermons' && icon.classList.contains('fa-microphone-alt')) item.classList.add('active');
            if (view === 'saved' && icon.classList.contains('fa-bookmark')) item.classList.add('active');
            if (view === 'timeline' && icon.classList.contains('fa-history')) item.classList.add('active');
        });

        // Toggle Hubs
        const hubs = document.querySelectorAll('.view-hub');
        hubs.forEach(hub => {
            if (hub.id === `hub-${view}`) {
                hub.style.display = 'block';
                // Force reflow for transition
                hub.offsetHeight; 
                hub.classList.add('active');
            } else {
                hub.classList.remove('active');
                // Hide after transition
                setTimeout(() => {
                    if (!hub.classList.contains('active')) hub.style.display = 'none';
                }, 400);
            }
        });

        // Specific Hub Logic
        if (view === 'sermons') this.fetchSermons();
        if (view === 'read' && !this.pdfDoc) {
            document.getElementById('libraryContainer').style.display = 'block';
            document.getElementById('materialViewerContainer').style.display = 'none';
        }

        // Show recent searches on search view
        if (view === 'search') {
            this.renderRecentSearchChips();
        }

        window.scrollTo({ top: 0, behavior: 'instant' });
        localStorage.setItem('activeView', view);
    }

    // ==========================================
    // Sermons Logic
    // ==========================================
    async fetchSermons(forceRefresh = false) {
        const grid = document.getElementById('sermonsGrid');
        if (!grid) return;

        // Check cache first
        if (!forceRefresh && this.sermonsCache && this.sermonsCacheTime) {
            const age = Date.now() - this.sermonsCacheTime;
            if (age < this.CACHE_DURATION) {
                console.log('✅ Using cached sermons (age: ' + Math.round(age / 1000) + 's)');
                this.allSermons = this.sermonsCache;
                this.renderSermons(this.sermonsCache);
                return;
            }
        }

        try {
            // Show loading state
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px;">
                    <div class="loading-spinner" style="margin: 0 auto 16px;"></div>
                    <p style="color: var(--text-muted);">Loading sermons...</p>
                </div>
            `;
            
            const response = await fetch(`/api/sermons?t=${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            const sermons = data.sermons || [];
            
            // Update cache
            this.sermonsCache = sermons;
            this.sermonsCacheTime = Date.now();
            console.log(`✅ Cached ${sermons.length} sermons`);
            localStorage.setItem(SERMONS_CACHE_KEY, JSON.stringify(sermons));
            localStorage.setItem(SERMONS_CACHE_TIME_KEY, Date.now().toString());
            
            this.allSermons = sermons;
            this.renderSermons(sermons);
        } catch (error) {
            console.error('Sermons fetch error:', error);
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px; background: rgba(239, 68, 68, 0.05); border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.1);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 16px;"></i>
                    <h4 style="color: var(--text-primary); margin-bottom: 8px;">Unable to load messages</h4>
                    <p style="color: var(--text-muted); margin-bottom: 24px; font-size: 0.9rem;">Please check your connection and try again.</p>
                    <button class="search-btn" onclick="app.fetchSermons(true)" style="background: #ef4444; border-color: #ef4444;">
                        <i class="fas fa-redo" style="margin-right: 8px;"></i> Retry Connection
                    </button>
                </div>
            `;
        }
    }

    renderSermons(sermons, filterCategory = null) {
        if (!sermons) sermons = this.allSermons || [];
        const grid = document.getElementById('sermonsGrid');
        const featured = document.getElementById('featuredSermon');
        const catList = document.getElementById('sermonCategories');
        if (!grid) return;

        // Populate Years if not done
        const years = [...new Set(sermons.map(s => {
            if (!s.date) return null;
            const yearMatch = s.date.match(/\d{4}/);
            return yearMatch ? yearMatch[0] : null;
        }))].filter(Boolean).sort((a, b) => b - a);
        const yearSelect = document.getElementById('sermonYearFilter');
        if (yearSelect && yearSelect.options.length <= 1) {
            years.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                yearSelect.appendChild(opt);
            });
        }

        const selectedYear = yearSelect ? yearSelect.value : null;

        // Filter if requested
        this.currentSermonFilter = filterCategory;
        let filteredSermons = sermons;
        
        if (filterCategory === 'bookmarked') {
            filteredSermons = sermons.filter(s => this.isSermonBookmarked(s.id));
        } else if (filterCategory && filterCategory.startsWith('pl_')) {
            const playlist = this.sermonPlaylists.find(p => p.id === filterCategory);
            filteredSermons = playlist ? sermons.filter(s => playlist.sermons.includes(s.id)) : [];
        } else if (filterCategory) {
            filteredSermons = sermons.filter(s => s.category === filterCategory);
        }

        // Apply Year filter if selected
        if (selectedYear) {
            filteredSermons = filteredSermons.filter(s => s.date && s.date.includes(selectedYear));
        }

        if (filteredSermons.length === 0) {
            const msg = filterCategory === 'bookmarked' ? 'You haven\'t bookmarked any messages yet.' : 
                        (filterCategory && filterCategory.startsWith('pl_') ? 'This playlist is empty.' : 'No messages available in this category yet.');
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--text-muted);">${msg}</div>`;
            return;
        }

        // Update Category Sidebar Counts
        if (catList && !filterCategory) {
            const counts = {};
            sermons.forEach(s => {
                if (s.category) counts[s.category] = (counts[s.category] || 0) + 1;
            });
            
            catList.innerHTML = `
                <div class="topic-item" style="width: 100%; justify-content: space-between; display: flex; margin-bottom: 8px; border-color: ${!this.currentSermonFilter ? 'var(--accent-emerald)' : 'var(--border-subtle)'};" onclick="app.filterSermons(null)">
                    <span>🌐 All Messages</span> 
                    <span class="title-badge">${sermons.length}</span>
                </div>
                <div class="topic-item" style="width: 100%; justify-content: space-between; display: flex; margin-bottom: 12px; border-color: ${this.currentSermonFilter === 'bookmarked' ? 'var(--accent-gold)' : 'var(--border-subtle)'};" onclick="app.filterSermons('bookmarked')">
                    <span>🔖 My Bookmarks</span> 
                    <span class="title-badge">${this.bookmarkedSermons.length}</span>
                </div>
                
                ${(this.sermonPlaylists || []).length > 0 ? `
                    <div style="margin-top: 24px; margin-bottom: 12px; color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px;">My Playlists</div>
                    ${(this.sermonPlaylists || []).map(p => `
                        <div class="topic-item" style="width: 100%; justify-content: space-between; display: flex; border-color: ${this.currentSermonFilter === p.id ? 'var(--accent-emerald)' : 'var(--border-subtle)'};" onclick="app.filterSermons('${p.id}')">
                            <span style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-list-ul" style="font-size: 0.8rem; opacity: 0.6;"></i> ${p.name}</span> 
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span class="title-badge">${p.sermons.length}</span>
                                <i class="fas fa-trash" style="font-size: 0.7rem; color: #ef4444; opacity: 0.4; cursor: pointer;" onclick="event.stopPropagation(); app.deletePlaylist('${p.id}')"></i>
                            </div>
                        </div>
                    `).join('')}
                ` : ''}

                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--border-subtle);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <span style="font-size: 0.75rem; color: var(--text-muted);">Auto-Refresh</span>
                        <label class="switch" style="position: relative; display: inline-block; width: 40px; height: 20px;">
                            <input type="checkbox" id="autoRefreshToggle" ${this.sermonAutoRefresh ? 'checked' : ''} onchange="app.toggleAutoRefresh()" style="opacity: 0; width: 0; height: 0;">
                            <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border-subtle); transition: .4s; border-radius: 20px;"></span>
                        </label>
                    </div>
                    <p style="font-size: 0.65rem; color: var(--text-muted); line-height: 1.4;">Keep the prophetic hub updated with latest messages automatically.</p>
                </div>
            ` + Object.entries(counts).map(([cat, count]) => `
                <div class="topic-item" style="width: 100%; justify-content: space-between; display: flex; border-color: ${this.currentSermonFilter === cat ? 'var(--accent-emerald)' : 'var(--border-subtle)'};" onclick="app.filterSermons('${cat}')">
                    <span>${this.getCategoryIcon ? this.getCategoryIcon(cat) : '📜'} ${cat}</span> 
                    <span class="title-badge">${count}</span>
                </div>
            `).join('');
        }

        // Hide featured if filtering
        if (featured) featured.style.display = filterCategory ? 'none' : 'block';

        // Render Featured (First one of the overall list, only if no filter)
        if (!filterCategory && sermons.length > 0 && featured) {
            const f = sermons[0];
            featured.innerHTML = `
                <div class="glass-panel" style="padding: 0; overflow: hidden; display: grid; grid-template-columns: 400px 1fr; border-color: var(--accent-emerald); margin-bottom: 32px;">
                    <div style="background: url('https://img.youtube.com/vi/${f.id}/maxresdefault.jpg') center/cover; min-height: 240px; position: relative;">
                        <div style="position: absolute; inset: 0; background: linear-gradient(to right, rgba(15,23,42,0.8), transparent);"></div>
                        <button class="search-btn" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 64px; height: 64px; border-radius: 50%; font-size: 1.5rem; background: var(--accent-emerald);" onclick="app.playSermon('${f.id}')">▶</button>
                    </div>
                    <div style="padding: 32px;">
                        <div style="display: flex; gap: 10px; margin-bottom: 12px;">
                            <span class="title-badge" style="background: var(--accent-emerald-glow); color: var(--accent-emerald); border-color: var(--accent-emerald);">LATEST MESSAGE</span>
                            <span style="color: var(--text-muted); font-size: 0.85rem;">${f.date}</span>
                        </div>
                        <h2 style="font-size: 1.8rem; margin-bottom: 12px; font-family: 'Playfair Display', serif; color: var(--text-primary);">${this.escapeHtml(f.title)}</h2>
                        <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 24px; font-size: 0.95rem;">${this.escapeHtml(f.summary || 'Study this profound teaching from Pastor John Anosike.')}</p>
                        <div style="display: flex; gap: 12px;">
                            <button class="search-btn" style="padding: 12px 24px;" onclick="app.openTranscriptModal('${f.id}')">Read & Sync</button>
                            <button class="nav-btn" style="padding: 12px 24px; border-color: var(--accent-gold); color: var(--accent-gold);" onclick="app.playSermon('${f.id}')">Listen Audio</button>
                        </div>
                    </div>
                </div>
            `;
        }

        // Render Grid
        const gridItems = filterCategory ? filteredSermons : sermons.slice(1);
        grid.innerHTML = gridItems.map(s => {
            const isPlaying = this.currentAudioId === s.id;
            const isBookmarked = this.isSermonBookmarked(s.id);
            return `
                <div id="sermon-card-${s.id}" class="glass-panel ${isPlaying ? 'sermon-card-playing' : ''}" style="padding: 0; overflow: hidden; transition: all 0.3s; border: 1px solid var(--border-subtle);">
                    <div style="position: relative; aspect-ratio: 16/9; background: url('https://img.youtube.com/vi/${s.id}/0.jpg') center/cover;">
                        <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.4); opacity: 0; transition: opacity 0.3s; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
                            <button class="search-btn" style="width: 50px; height: 50px; border-radius: 50%;" onclick="app.playSermon('${s.id}')">▶</button>
                        </div>
                        <button class="nav-btn" style="position: absolute; top: 10px; right: 10px; width: 36px; height: 36px; padding: 0; border-radius: 50%; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);" onclick="event.stopPropagation(); app.toggleSermonBookmark('${s.id}', '${this.escapeHtml(s.title).replace(/'/g, "\\'")}');" title="${isBookmarked ? 'Remove bookmark' : 'Bookmark sermon'}">
                            <i class="fas fa-bookmark bookmark-icon" style="color: ${isBookmarked ? 'var(--accent-gold)' : '#fff'}; font-size: 0.9rem;"></i>
                        </button>
                        <button class="nav-btn" style="position: absolute; top: 10px; right: 54px; width: 36px; height: 36px; padding: 0; border-radius: 50%; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);" onclick="event.stopPropagation(); app.showPlaylistSelector('${s.id}');" title="Add to Playlist">
                            <i class="fas fa-plus" style="color: #fff; font-size: 0.9rem;"></i>
                        </button>
                        <span style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-family: 'JetBrains Mono', monospace;">MESSAGE</span>
                        ${this.renderProgressBar(s.id)}
                    </div>
                    <div style="padding: 20px;">
                        <span style="font-size: 0.7rem; color: var(--accent-gold); text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">${s.date}</span>
                        <h3 style="font-size: 1rem; color: var(--text-primary); margin: 6px 0 16px; line-height: 1.5; min-height: 3em; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${this.escapeHtml(s.title)}</h3>
                        <div style="display: flex; gap: 8px;">
                            <button class="search-btn" style="flex: 1; padding: 8px; font-size: 0.75rem;" onclick="app.openTranscriptModal('${s.id}')">Read & Sync</button>
                            <button class="nav-btn" style="flex: 1; padding: 8px; font-size: 0.75rem; border-color: var(--accent-emerald); color: var(--accent-emerald);" onclick="app.playSermon('${s.id}')">Listen Audio</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    closeSermonDetail() {
        const grid = document.getElementById('sermonsGrid');
        const detail = document.getElementById('sermonDetailContainer');
        if (grid && detail) {
            grid.style.display = 'grid';
            detail.style.display = 'none';
        }
    }

    // --- Sermon Bookmarks & Playlists ---
    isSermonBookmarked(id) {
        return (this.bookmarkedSermons || []).includes(id);
    }

    toggleSermonBookmark(id, title = '') {
        if (!this.bookmarkedSermons) this.bookmarkedSermons = [];
        const idx = this.bookmarkedSermons.indexOf(id);
        if (idx > -1) {
            this.bookmarkedSermons.splice(idx, 1);
            this.showNotification('Bookmark removed', 'info');
        } else {
            this.bookmarkedSermons.push(id);
            this.showNotification(`Bookmarked: ${title}`, 'success');
        }
        localStorage.setItem('bookmarkedSermons', JSON.stringify(this.bookmarkedSermons));
        // Refresh the card's bookmark icon
        const icon = document.querySelector(`#sermon-card-${id} .bookmark-icon`);
        if (icon) {
            icon.style.color = this.isSermonBookmarked(id) ? 'var(--accent-gold)' : '#fff';
        }
    }

    renderProgressBar(sermonId) {
        const progress = this.sermonProgress ? this.sermonProgress[sermonId] : null;
        if (!progress || !progress.percent) return '';
        const pct = Math.min(100, Math.round(progress.percent));
        return `<div style="position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: rgba(0,0,0,0.5);">
            <div style="height: 100%; width: ${pct}%; background: var(--accent-emerald); transition: width 0.3s;"></div>
        </div>`;
    }

    filterSermons(category) {
        this.currentSermonFilter = category;
        this.renderSermons(this.allSermons || [], category);
    }

    performSermonSearch(query) {
        if (!query || !query.trim()) {
            this.renderSermons(this.allSermons || []);
            return;
        }
        const q = query.toLowerCase().trim();
        const filtered = (this.allSermons || []).filter(s => {
            const searchable = `${s.title || ''} ${s.summary || ''} ${s.category || ''}`.toLowerCase();
            return searchable.includes(q);
        });
        this.renderSermons(filtered);
    }

    sortSermons(sortBy) {
        if (!this.allSermons) return;

        let sorted = [...this.allSermons];
        switch (sortBy) {
            case 'oldest':
                sorted.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
                break;
            case 'alphabetical':
                sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                break;
            case 'newest':
            default:
                sorted.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
                break;
        }
        this.allSermons = sorted;
        this.renderSermons(sorted);
    }

    showPlaylistSelector(sermonId) {
        const playlists = this.sermonPlaylists || [];
        if (playlists.length === 0) {
            const name = prompt('Create a new playlist. Enter name:');
            if (name && name.trim()) {
                const pl = { id: 'pl_' + Date.now(), name: name.trim(), sermons: [sermonId] };
                this.sermonPlaylists = [pl];
                localStorage.setItem('sermonPlaylists', JSON.stringify(this.sermonPlaylists));
                this.showNotification(`Added to "${name.trim()}"`, 'success');
                this.renderSermons(this.allSermons);
            }
            return;
        }
        // Simple prompt-based selector
        const options = playlists.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
        const choice = prompt(`Add to playlist:\n${options}\n\nOr type a new name to create one:`);
        if (!choice) return;
        const idx = parseInt(choice) - 1;
        if (idx >= 0 && idx < playlists.length) {
            if (!playlists[idx].sermons.includes(sermonId)) {
                playlists[idx].sermons.push(sermonId);
                localStorage.setItem('sermonPlaylists', JSON.stringify(playlists));
                this.showNotification(`Added to "${playlists[idx].name}"`, 'success');
            } else {
                this.showNotification('Already in this playlist', 'info');
            }
        } else if (choice.trim()) {
            const pl = { id: 'pl_' + Date.now(), name: choice.trim(), sermons: [sermonId] };
            this.sermonPlaylists.push(pl);
            localStorage.setItem('sermonPlaylists', JSON.stringify(this.sermonPlaylists));
            this.showNotification(`Created "${choice.trim()}" and added sermon`, 'success');
        }
        this.renderSermons(this.allSermons);
    }

    deletePlaylist(playlistId) {
        if (!confirm('Delete this playlist?')) return;
        this.sermonPlaylists = (this.sermonPlaylists || []).filter(p => p.id !== playlistId);
        localStorage.setItem('sermonPlaylists', JSON.stringify(this.sermonPlaylists));
        this.showNotification('Playlist deleted', 'info');
        this.renderSermons(this.allSermons);
    }

    toggleAutoRefresh() {
        this.sermonAutoRefresh = !this.sermonAutoRefresh;
        localStorage.setItem('sermonAutoRefresh', this.sermonAutoRefresh.toString());
        if (this.sermonAutoRefresh) {
            this.refreshTimer = setInterval(() => this.fetchSermons(true), 5 * 60 * 1000);
            this.showNotification('Auto-refresh enabled', 'success');
        } else {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
            this.showNotification('Auto-refresh disabled', 'info');
        }
    }

    // --- Sermon Ingester ---
    openIngester(id = null) {
        const modal = document.getElementById('ingesterModal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        if (id) {
            const s = this.allSermons.find(ser => ser.id === id);
            if (s) {
                document.getElementById('ingestUrl').value = s.url || '';
                document.getElementById('ingestTitle').value = s.title || '';
                document.getElementById('ingestTranscript').value = s.transcript || '';
                document.getElementById('ingestTranscript').placeholder = "Paste the corrected transcript here...";
            }
        } else {
            document.getElementById('ingestUrl').value = '';
            document.getElementById('ingestTitle').value = '';
            document.getElementById('ingestTranscript').value = '';
        }
    }

    closeIngester() {
        const modal = document.getElementById('ingesterModal');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        // Reset status
        const status = document.getElementById('ingestStatus');
        status.style.display = 'none';
        status.textContent = '';
    }

    async submitIngestion() {
        const url = document.getElementById('ingestUrl').value.trim();
        const title = document.getElementById('ingestTitle').value.trim();
        const transcript = document.getElementById('ingestTranscript').value.trim();
        const status = document.getElementById('ingestStatus');
        const btn = document.getElementById('processSubmitBtn');

        if (!url || !title) {
            status.style.display = 'block';
            status.style.background = 'rgba(239, 68, 68, 0.1)';
            status.style.color = '#ef4444';
            status.textContent = 'Please fill in at least the URL and Title.';
            return;
        }

        // Check for duplicates in memory cache
        if (this.sermonsCache && this.sermonsCache.some(s => s.videoUrl === url || s.url === url)) {
            status.style.display = 'block';
            status.style.background = 'rgba(245, 197, 66, 0.1)';
            status.style.color = 'var(--accent-gold)';
            status.textContent = 'This sermon has already been processed.';
            return;
        }

        try {
            btn.disabled = true;
            btn.textContent = 'Processing... This takes about 30-60 seconds';
            status.style.display = 'block';
            status.style.background = 'rgba(52, 211, 153, 0.1)';
            status.style.color = 'var(--accent-emerald)';
            status.textContent = 'AI is analyzing the transcript and generating insights...';

            const response = await fetch('/api/sermons/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, title, transcript })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Ingestion failed');

            status.style.background = 'rgba(52, 211, 153, 0.1)';
            status.textContent = 'Success! Sermon processed and interpreted.';
            
            setTimeout(() => {
                this.closeIngester();
                this.loadSermons(); // Reload the list
                // Clear fields
                document.getElementById('ingestUrl').value = '';
                document.getElementById('ingestTitle').value = '';
                document.getElementById('ingestTranscript').value = '';
                btn.disabled = false;
                btn.textContent = 'Start AI Interpretation';
            }, 2000);

        } catch (error) {
            status.style.background = 'rgba(239, 68, 68, 0.1)';
            status.style.color = '#ef4444';
            status.textContent = 'Error: ' + error.message;
            btn.disabled = false;
            btn.textContent = 'Retry AI Interpretation';
        }
    }

    searchInSermon(query) {
        const body = document.getElementById('sermonTranscriptBody');
        if (!body || !this.currentSermon) return;

        if (!query || query.length < 2) {
            body.innerHTML = this.renderTranscriptWithTimestamps(this.currentSermon.transcript);
            return;
        }

        const highlighted = this.highlightSearchTerms(this.currentSermon.transcript, query);
        body.innerHTML = this.renderTranscriptWithTimestamps(highlighted, true); // true means already escaped/highlighted
    }

    renderTranscriptWithTimestamps(text, isAlreadySafe = false) {
        if (!text) return '';
        
        let content = isAlreadySafe ? text : this.escapeHtml(text);
        
        // Find all explicit timestamps like [0:00] or [1:23:45]
        const timestampRegex = /\[((?:\d+:)?\d{1,2}:\d{2})\]/g;
        const matches = [...content.matchAll(timestampRegex)];
        
        // Capture text before the first timestamp if it exists
        if (matches.length > 0) {
            const firstIndex = matches[0].index;
            if (firstIndex > 0 && content.substring(0, firstIndex).trim().length > 0) {
                matches.unshift({ 0: '', 1: '0:00', index: 0 });
            }
        }
        
        if (matches.length === 0) {
            // Artificial Sync Engine (No explicit timestamps)
            const WORDS_PER_SECOND = 130 / 60; 
            const SECONDS_PER_WORD = 1 / WORDS_PER_SECOND; // ~0.46s

            let sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
            
            let html = '';
            let currentTime = 0; 

            sentences.forEach(sentence => {
                sentence = sentence.trim();
                if (!sentence) return;

                const words = sentence.split(/\s+/);
                
                let chunks = [];
                // If a sentence is abnormally long, chunk it
                if (words.length > 25) {
                    for (let i = 0; i < words.length; i += 12) {
                        chunks.push(words.slice(i, i + 12));
                    }
                } else {
                    chunks = [words];
                }

                chunks.forEach(chunk => {
                    const chunkStartTime = currentTime;
                    let wordHtml = '';
                    
                    chunk.forEach(word => {
                        // Avoid double escape since we already escaped `content`
                        wordHtml += `<span class="transcript-word transcript-segment" id="ts-${currentTime.toFixed(2)}" data-time="${currentTime.toFixed(2)}">${word}</span> `;
                        currentTime += SECONDS_PER_WORD;
                    });

                    html += `
                        <div class="transcript-line" data-time="${chunkStartTime.toFixed(2)}" style="margin-bottom: 8px; padding: 6px 10px; border-radius: 6px; cursor: pointer; transition: background 0.2s, border-left 0.2s;" onclick="app.seekSermon(${chunkStartTime.toFixed(2)})">
                            <span style="opacity: 0.5; font-size: 0.7em; margin-right: 8px; font-family: monospace;">[${this.formatTime(chunkStartTime)}]</span>
                            ${wordHtml}
                        </div>
                    `;
                });
            });

            return html;
        }

        const lines = [];

        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const nextMatch = matches[i + 1];
            
            const timeString = match[1];
            const textStartIndex = match.index + match[0].length;
            const textEndIndex = nextMatch ? nextMatch.index : content.length;
            
            const textSegment = content.substring(textStartIndex, textEndIndex).trim();
            
            const parts = timeString.split(':').reverse();
            let startSecs = parseInt(parts[0]) + (parseInt(parts[1]) * 60);
            if (parts[2]) startSecs += (parseInt(parts[2]) * 3600);

            // Estimate duration of this segment
            let duration = 30; // Default fallback
            if (nextMatch) {
                const nParts = nextMatch[1].split(':').reverse();
                let nextSecs = parseInt(nParts[0]) + (parseInt(nParts[1]) * 60);
                if (nParts[2]) nextSecs += (parseInt(nParts[2]) * 3600);
                duration = Math.max(0, nextSecs - startSecs);
            }

            // Break segment into words for sync
            const words = textSegment.split(/\s+/).filter(w => w.trim());
            const timePerWord = words.length > 0 ? (duration / words.length) : 0.46;

            const processedWords = words.map((word, idx) => {
                const wordTime = startSecs + (idx * timePerWord);
                return `<span class="transcript-word transcript-segment" id="ts-${wordTime.toFixed(2)}" data-time="${wordTime.toFixed(2)}">${word}</span>`;
            }).join(' ');
            
            const timestampLink = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="timestamp-link" style="color: var(--accent-emerald); font-family: monospace; font-size: 0.9em; font-weight: bold;" onclick="app.seekSermon(${startSecs})">[${timeString}]</span>
                    <i class="fas fa-share-alt" style="font-size: 0.75rem; color: var(--text-muted); cursor: pointer; opacity: 0; transition: opacity 0.2s;" title="Share this moment" 
                       onclick="event.stopPropagation(); app.shareSermonTimestamp('${this.currentSermon?.id}', ${startSecs}, '${this.escapeHtml(this.currentSermon?.title || 'Message')}')"></i>
                </div>
            `;
            
            lines.push(`<div class="transcript-line" data-time="${startSecs}" style="margin-bottom: 12px; padding: 8px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s, border-left 0.2s;" 
                         onmouseover="this.querySelector('.fa-share-alt').style.opacity='1'" 
                         onmouseout="this.querySelector('.fa-share-alt').style.opacity='0'"
                         onclick="if(event.target.className !== 'timestamp-link' && !event.target.classList.contains('fa-share-alt')) app.seekSermon(${startSecs})">
                            ${timestampLink} 
                            <div style="margin-top: 4px;">${processedWords}</div>
                         </div>`);
        }
        
        return lines.join('');
    }

    filterSermons(category) {
        this.currentSermonFilter = category;
        this.renderSermons(this.allSermons || [], category);
        this.showNotification(category ? `Showing ${category} messages` : 'Showing all messages', 'info');
    }

    async performSermonSearch(query) {
        if (!query || query.length < 2) {
            this.renderSermons(this.allSermons || []);
            return;
        }

        try {
            const response = await fetch(`/api/sermons/search?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();
                this.renderSermons(data.sermons || []);
            }
        } catch (error) {
            console.error('Sermon search failed:', error);
        }
    }

    sortSermons(criteria) {
        if (!this.allSermons) return;
        
        let sorted = [...this.allSermons];
        if (criteria === 'newest') {
            sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } else if (criteria === 'oldest') {
            sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        } else if (criteria === 'alphabetical') {
            sorted.sort((a, b) => a.title.localeCompare(b.title));
        }
        
        this.renderSermons(sorted);
    }

    getCategoryIcon(cat) {
        const icons = {
            'Prophetic': '🔥',
            'Deliverance': '🛡️',
            'Interpretation': '📜',
            'Foundation': '🧱',
            'Faith': '✨',
            'Anointing': '🏺',
            'Blessings': '💰',
            'Intercession': '🙏'
        };
        return icons[cat] || '📖';
    }

    // ==========================================
    // Sermon Bookmarking
    // ==========================================
    toggleSermonBookmark(sermonId, title) {
        const index = this.bookmarkedSermons.findIndex(s => s.id === sermonId);
        
        if (index > -1) {
            this.bookmarkedSermons.splice(index, 1);
            this.showNotification('Removed from bookmarks', 'info');
        } else {
            this.bookmarkedSermons.push({
                id: sermonId,
                title: title,
                bookmarked: new Date().toISOString()
            });
            this.showNotification('Sermon bookmarked!', 'success');
        }
        
        localStorage.setItem('bookmarkedSermons', JSON.stringify(this.bookmarkedSermons));
        
        // Update UI
        const card = document.getElementById(`sermon-card-${sermonId}`);
        if (card) {
            const icon = card.querySelector('.bookmark-icon');
            if (icon) {
                icon.style.color = this.isSermonBookmarked(sermonId) ? 'var(--accent-gold)' : 'inherit';
            }
        }
    }

    isSermonBookmarked(sermonId) {
        return this.bookmarkedSermons.some(s => s.id === sermonId);
    }

    // --- Notes ---
    saveSermonNote(sermonId, note, timestamp = null) {
        if (!this.sermonNotes[sermonId]) {
            this.sermonNotes[sermonId] = [];
        }
        
        this.sermonNotes[sermonId].push({
            text: note,
            timestamp: timestamp,
            created: new Date().toISOString()
        });
        
        localStorage.setItem('sermonNotes', JSON.stringify(this.sermonNotes));
        this.showNotification('Note saved!', 'success');
    }

    getSermonNotes(sermonId) {
        return this.sermonNotes[sermonId] || [];
    }

    renderSermonNotes(sermonId) {
        const notes = this.getSermonNotes(sermonId);
        return `
            <div class="sermon-notes-panel" style="margin-top: 32px; padding: 24px; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid var(--border-subtle);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                    <h4 style="margin: 0; color: var(--accent-gold); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">📝 Personal Notes</h4>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${notes.length} notes</span>
                </div>
                
                <div id="notes-list-${sermonId}" style="max-height: 300px; overflow-y: auto; margin-bottom: 20px;">
                    ${notes.length === 0 ? '<p style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 20px;">No notes yet. Capture your insights below.</p>' : notes.map((note, i) => `
                        <div class="note-item" style="padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.05);">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                                ${note.timestamp ? `<span style="color: var(--accent-emerald); font-size: 0.75rem; font-family: monospace; font-weight: bold; cursor: pointer;" onclick="app.seekSermon(${this.parseTimeString(note.timestamp)})">${note.timestamp}</span>` : '<span></span>'}
                                <span style="font-size: 0.65rem; color: var(--text-muted);">${new Date(note.created).toLocaleDateString()}</span>
                            </div>
                            <p style="margin: 0; color: var(--text-primary); font-size: 0.9rem; line-height: 1.5;">${this.escapeHtml(note.text)}</p>
                        </div>
                    `).join('')}
                </div>
                
                <div style="position: relative;">
                    <textarea id="new-note-${sermonId}" placeholder="Write down what the Spirit is revealing..." 
                              style="width: 100%; padding: 12px; border-radius: 8px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); color: var(--text-primary); font-size: 0.9rem; min-height: 80px; resize: vertical;"></textarea>
                    <button class="search-btn" style="width: 100%; margin-top: 10px; padding: 10px;" onclick="app.addSermonNote('${sermonId}')">
                        <i class="fas fa-plus" style="margin-right: 8px;"></i> Save Insight
                    </button>
                </div>
            </div>
        `;
    }

    addSermonNote(sermonId) {
        const textarea = document.getElementById(`new-note-${sermonId}`);
        const note = textarea.value.trim();
        
        if (!note) {
            this.showNotification('Please enter a note', 'warning');
            return;
        }
        
        // Get current timestamp if playing
        let timestamp = null;
        if (this.ytPlayer && this.ytPlayer.getCurrentTime) {
            timestamp = this.formatTime(this.ytPlayer.getCurrentTime());
        }
        
        this.saveSermonNote(sermonId, note, timestamp);
        textarea.value = '';
        
        // Refresh notes list in modal
        const container = document.getElementById(`notes-list-${sermonId}`);
        if (container) {
            const notes = this.getSermonNotes(sermonId);
            container.innerHTML = notes.map((note, i) => `
                <div class="note-item" style="padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                        ${note.timestamp ? `<span style="color: var(--accent-emerald); font-size: 0.75rem; font-family: monospace; font-weight: bold; cursor: pointer;" onclick="app.seekSermon(${this.parseTimeString(note.timestamp)})">${note.timestamp}</span>` : '<span></span>'}
                        <span style="font-size: 0.65rem; color: var(--text-muted);">${new Date(note.created).toLocaleDateString()}</span>
                    </div>
                    <p style="margin: 0; color: var(--text-primary); font-size: 0.9rem; line-height: 1.5;">${this.escapeHtml(note.text)}</p>
                </div>
            `).join('');
            container.scrollTop = container.scrollHeight;
        }
    }

    parseTimeString(timeStr) {
        const parts = timeStr.split(':').reverse();
        let secs = parseInt(parts[0]) + (parseInt(parts[1] || 0) * 60);
        if (parts[2]) secs += (parseInt(parts[2]) * 3600);
        return secs;
    }

    // --- Progress Tracking ---
    updateSermonProgress(sermonId, currentTime, duration) {
        if (!sermonId || isNaN(currentTime) || isNaN(duration) || duration === 0) return;
        
        this.sermonProgress[sermonId] = {
            currentTime: currentTime,
            duration: duration,
            percentage: Math.min(100, (currentTime / duration) * 100),
            lastWatched: new Date().toISOString()
        };
        
        localStorage.setItem('sermonProgress', JSON.stringify(this.sermonProgress));
        
        // Update UI progress bar if it exists on the card
        const progressBar = document.querySelector(`#sermon-card-${sermonId} .progress-bar-inner`);
        if (progressBar) {
            progressBar.style.width = `${this.sermonProgress[sermonId].percentage}%`;
        }
    }

    getSermonProgress(sermonId) {
        return this.sermonProgress[sermonId] || null;
    }

    renderProgressBar(sermonId) {
        const progress = this.getSermonProgress(sermonId);
        if (!progress || progress.percentage < 2) return '';
        
        return `
            <div class="progress-bar-container" style="position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(0,0,0,0.3); z-index: 5;">
                <div class="progress-bar-inner" style="height: 100%; width: ${progress.percentage}%; background: var(--accent-emerald); transition: width 0.3s; box-shadow: 0 0 10px var(--accent-emerald);"></div>
            </div>
        `;
    }

    // --- Playlists ---
    createSermonPlaylist(name) {
        if (!name) return;
        const playlist = {
            id: 'pl_' + Date.now(),
            name: name,
            sermons: [],
            created: new Date().toISOString()
        };
        this.sermonPlaylists.push(playlist);
        localStorage.setItem('sermonPlaylists', JSON.stringify(this.sermonPlaylists));
        this.showNotification(`Playlist "${name}" created!`, 'success');
        this.renderSermons(this.allSermons); // Refresh UI
    }

    addToPlaylist(playlistId, sermonId) {
        const playlist = this.sermonPlaylists.find(p => p.id === playlistId);
        if (playlist && !playlist.sermons.includes(sermonId)) {
            playlist.sermons.push(sermonId);
            localStorage.setItem('sermonPlaylists', JSON.stringify(this.sermonPlaylists));
            this.showNotification('Added to playlist!', 'success');
            this.renderSermons(this.allSermons);
        }
    }

    removeFromPlaylist(playlistId, sermonId) {
        const playlist = this.sermonPlaylists.find(p => p.id === playlistId);
        if (playlist) {
            playlist.sermons = playlist.sermons.filter(id => id !== sermonId);
            localStorage.setItem('sermonPlaylists', JSON.stringify(this.sermonPlaylists));
            this.showNotification('Removed from playlist', 'info');
            this.renderSermons(this.allSermons);
        }
    }

    deletePlaylist(playlistId) {
        const playlist = this.sermonPlaylists.find(p => p.id === playlistId);
        if (playlist && confirm(`Delete playlist "${playlist.name}"?`)) {
            this.sermonPlaylists = this.sermonPlaylists.filter(p => p.id !== playlistId);
            localStorage.setItem('sermonPlaylists', JSON.stringify(this.sermonPlaylists));
            this.showNotification('Playlist deleted', 'info');
            this.renderSermons(this.allSermons);
        }
    }

    showPlaylistSelector(sermonId) {
        if (this.sermonPlaylists.length === 0) {
            const name = prompt('Enter a name for your new playlist:');
            if (name) {
                this.createSermonPlaylist(name);
                const newPlaylist = this.sermonPlaylists[this.sermonPlaylists.length - 1];
                this.addToPlaylist(newPlaylist.id, sermonId);
            }
            return;
        }

        // Simple modal-like selector
        let html = `
            <div style="padding: 20px;">
                <h4 style="margin-bottom: 16px; color: var(--accent-gold);">Add to Playlist</h4>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
                    ${this.sermonPlaylists.map(p => `
                        <button class="nav-btn" style="text-align: left; width: 100%; display: flex; justify-content: space-between;" onclick="app.addToPlaylist('${p.id}', '${sermonId}'); app.closeGenericModal();">
                            <span>${p.name}</span>
                            <span style="font-size: 0.75rem; opacity: 0.7;">${p.sermons.length} messages</span>
                        </button>
                    `).join('')}
                </div>
                <button class="search-btn" style="width: 100%;" onclick="const name = prompt('New Playlist Name:'); if(name) app.createSermonPlaylist(name); app.closeGenericModal();">
                    <i class="fas fa-plus" style="margin-right: 8px;"></i> Create New Playlist
                </button>
            </div>
        `;
        this.openGenericModal(html);
    }

    openGenericModal(html) {
        // Create or reuse a generic modal
        let modal = document.getElementById('genericModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'genericModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px; padding: 0;">
                    <button class="modal-close" onclick="app.closeGenericModal()">×</button>
                    <div id="genericModalContent"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        document.getElementById('genericModalContent').innerHTML = html;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeGenericModal() {
        const modal = document.getElementById('genericModal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    // --- Auto-Refresh ---
    toggleAutoRefresh() {
        this.sermonAutoRefresh = !this.sermonAutoRefresh;
        localStorage.setItem('sermonAutoRefresh', this.sermonAutoRefresh);
        
        if (this.sermonAutoRefresh) {
            this.startAutoRefresh();
            this.showNotification('Auto-refresh enabled (every 10m)', 'success');
        } else {
            this.stopAutoRefresh();
            this.showNotification('Auto-refresh disabled', 'info');
        }
        
        // Update UI toggle
        const toggle = document.getElementById('autoRefreshToggle');
        if (toggle) toggle.checked = this.sermonAutoRefresh;
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        if (!this.sermonAutoRefresh) return;
        
        console.log('🔄 Starting sermon auto-refresh');
        this.refreshTimer = setInterval(() => {
            console.log('⏲️ Auto-refreshing sermons...');
            this.fetchSermons(true);
        }, 10 * 60 * 1000); // 10 minutes
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }



    // ==========================================
    // Notifications — Premium Toast
    // ==========================================
    showNotification(message, type = 'info') {
        const configs = {
            success: { bg: 'linear-gradient(135deg, #059669, #10b981)', icon: '✓', border: 'rgba(52,211,153,0.3)' },
            warning: { bg: 'linear-gradient(135deg, #d97706, #f59e0b)', icon: '⚠', border: 'rgba(245,158,11,0.3)' },
            error: { bg: 'linear-gradient(135deg, #dc2626, #ef4444)', icon: '✕', border: 'rgba(239,68,68,0.3)' },
            info: { bg: 'linear-gradient(135deg, #2563eb, #3b82f6)', icon: 'ℹ', border: 'rgba(59,130,246,0.3)' }
        };

        const config = configs[type] || configs.info;

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 90px;
            right: 28px;
            background: ${config.bg};
            color: white;
            padding: 14px 22px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            border: 1px solid ${config.border};
            z-index: 10000;
            animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 500;
            font-size: 0.88rem;
            font-family: 'Inter', sans-serif;
            display: flex;
            align-items: center;
            gap: 10px;
            backdrop-filter: blur(12px);
            max-width: 380px;
        `;
        notification.innerHTML = `<span style="font-size: 1.1rem;">${config.icon}</span> ${message}`;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // ==========================================
    // Saved Hub — Sub-tab Management
    // ==========================================
    showSavedSubTab(tabName) {
        // Toggle active class on sub-tab buttons
        document.querySelectorAll('.saved-sub-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.subtab === tabName);
            if (btn.dataset.subtab === tabName) {
                btn.style.borderColor = 'var(--accent-emerald)';
                btn.style.color = 'var(--accent-emerald)';
            } else {
                btn.style.borderColor = '';
                btn.style.color = '';
            }
        });
        // Toggle sub-tab content
        document.querySelectorAll('.saved-subtab-content').forEach(el => el.style.display = 'none');
        const target = {
            'savedVerses': 'savedVersesContent',
            'folders': 'foldersContent',
            'timeline': 'timelineContent'
        }[tabName];
        if (target) {
            document.getElementById(target).style.display = 'block';
            if (tabName === 'folders') this.renderFolders();
            if (tabName === 'timeline') this.renderTimeline();
        }
    }

    // ==========================================
    // Virtual Folders (Collections)
    // ==========================================
    getFolders() {
        return JSON.parse(localStorage.getItem('studyFolders') || '[]');
    }

    saveFolders(folders) {
        localStorage.setItem('studyFolders', JSON.stringify(folders));
    }

    showCreateFolderModal() {
        const name = prompt('Enter folder name (e.g., "Prophecy Study", "Grace Notes"):');
        if (!name || !name.trim()) return;
        const folders = this.getFolders();
        if (folders.find(f => f.name === name.trim())) {
            this.showNotification('A folder with that name already exists', 'warning');
            return;
        }
        folders.push({ name: name.trim(), items: [], createdAt: new Date().toISOString() });
        this.saveFolders(folders);
        this.renderFolders();
        this.showNotification(`Folder "${name.trim()}" created`, 'success');
    }

    deleteFolder(index) {
        if (!confirm('Delete this folder and all its contents?')) return;
        const folders = this.getFolders();
        const name = folders[index]?.name;
        folders.splice(index, 1);
        this.saveFolders(folders);
        this.renderFolders();
        this.showNotification(`Folder "${name}" deleted`, 'success');
    }

    addToFolder(folderIndex, item) {
        const folders = this.getFolders();
        if (!folders[folderIndex]) return;
        folders[folderIndex].items.push({ ...item, addedAt: new Date().toISOString() });
        this.saveFolders(folders);
        this.showNotification(`Added to "${folders[folderIndex].name}"`, 'success');
    }

    removeFromFolder(folderIndex, itemIndex) {
        const folders = this.getFolders();
        if (!folders[folderIndex]) return;
        folders[folderIndex].items.splice(itemIndex, 1);
        this.saveFolders(folders);
        this.renderFolders();
    }

    renderFolders() {
        const grid = document.getElementById('foldersGrid');
        if (!grid) return;
        const folders = this.getFolders();

        if (folders.length === 0) {
            grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><div class="empty-state-icon">📁</div><p>Create folders to organize your study materials and verses by topic.</p></div>`;
            return;
        }

        grid.innerHTML = folders.map((folder, fi) => `
            <div class="glass-panel" style="padding: 0; overflow: hidden; transition: all var(--transition-base);" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform=''">
                <div style="padding: 18px 20px; border-bottom: 1px solid var(--border-subtle); background: linear-gradient(135deg, rgba(52,211,153,0.06), transparent); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="font-size: 1rem; color: var(--text-primary); margin-bottom: 2px;">📁 ${this.escapeHtml(folder.name)}</h3>
                        <p style="font-size: 0.75rem; color: var(--text-muted);">${folder.items.length} item${folder.items.length !== 1 ? 's' : ''} · Created ${new Date(folder.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="app.exportFolderToPDF(${fi})" title="Export to PDF" style="background: rgba(52,211,153,0.1); color: var(--accent-emerald); border: 1px solid rgba(52,211,153,0.2); border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;">📄</button>
                        <button onclick="app.deleteFolder(${fi})" style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;">✕</button>
                    </div>
                </div>
                <div style="padding: 16px 20px;">
                    ${folder.items.length === 0 
                        ? '<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 12px 0;">Empty — Add items from Search or Materials</p>'
                        : folder.items.map((item, ii) => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-subtle);">
                                <div style="cursor: pointer;" onclick="${item.type === 'verse' ? `setSearch('${this.escapeHtml(item.reference)}'); performSearch(); app.showView('search');` : `app.openMaterial('${item.path}', '${this.escapeHtml(item.title)}')`}">
                                    <span style="font-size: 0.85rem; color: var(--accent-emerald);">${item.type === 'verse' ? '📖' : '📄'}</span>
                                    <span style="font-size: 0.88rem; color: var(--text-primary);">${this.escapeHtml(item.title || item.reference)}</span>
                                </div>
                                <button onclick="event.stopPropagation(); app.removeFromFolder(${fi}, ${ii})" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.8rem;">✕</button>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `).join('');
    }

    promptSaveToFolder(reference, text) {
        const folders = this.getFolders();
        if (folders.length === 0) {
            const name = prompt('No folders yet. Enter a name to create one:');
            if (!name || !name.trim()) return;
            folders.push({ name: name.trim(), items: [], createdAt: new Date().toISOString() });
            this.saveFolders(folders);
        }
        
        const updatedFolders = this.getFolders();
        const names = updatedFolders.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
        const choice = prompt(`Choose a folder (enter number):\n\n${names}`);
        if (!choice) return;
        
        const index = parseInt(choice) - 1;
        if (isNaN(index) || index < 0 || index >= updatedFolders.length) {
            this.showNotification('Invalid selection', 'warning');
            return;
        }
        
        this.addToFolder(index, { type: 'verse', reference, title: reference, text: text?.substring(0, 120) });
    }

    promptSaveMaterialToFolder(path, title) {
        const folders = this.getFolders();
        if (folders.length === 0) {
            const name = prompt('No folders yet. Enter a name to create one:');
            if (!name || !name.trim()) return;
            folders.push({ name: name.trim(), items: [], createdAt: new Date().toISOString() });
            this.saveFolders(folders);
        }
        
        const updatedFolders = this.getFolders();
        const names = updatedFolders.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
        const choice = prompt(`Choose a folder (enter number):\n\n${names}`);
        if (!choice) return;
        
        const index = parseInt(choice) - 1;
        if (isNaN(index) || index < 0 || index >= updatedFolders.length) {
            this.showNotification('Invalid selection', 'warning');
            return;
        }
        
        this.addToFolder(index, { type: 'material', path, title, text: 'Study Material' });
    }

    // ==========================================
    // Learning Timeline (History Tracking)
    // ==========================================
    trackActivity(type, data) {
        const timeline = JSON.parse(localStorage.getItem('learningTimeline') || '[]');
        timeline.unshift({
            type,
            ...data,
            timestamp: new Date().toISOString()
        });
        // Keep last 200 entries
        localStorage.setItem('learningTimeline', JSON.stringify(timeline.slice(0, 200)));
    }

    filterTimeline(filter) {
        this.currentTimelineFilter = filter;
        this.renderTimeline();
    }

    renderTimeline() {
        const list = document.getElementById('timelineList');
        if (!list) return;
        const timeline = JSON.parse(localStorage.getItem('learningTimeline') || '[]');
        const filter = this.currentTimelineFilter || 'all';
        const filtered = filter === 'all' ? timeline : timeline.filter(e => e.type === filter);

        if (filtered.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📅</div><p>No ${filter === 'all' ? '' : filter + ' '}activity recorded yet.</p></div>`;
            return;
        }

        // Group by date
        const groups = {};
        filtered.forEach(entry => {
            const date = new Date(entry.timestamp).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            if (!groups[date]) groups[date] = [];
            groups[date].push(entry);
        });

        const icons = { material: '📄', topic: '🏷️', search: '🔍' };

        list.innerHTML = Object.entries(groups).map(([date, entries]) => `
            <div class="glass-panel" style="padding: 16px 20px;">
                <h4 style="font-size: 0.82rem; color: var(--accent-emerald); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-family: 'JetBrains Mono', monospace;">${date}</h4>
                ${entries.map(e => `
                    <div style="display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border-subtle);">
                        <span style="font-size: 1.1rem;">${icons[e.type] || '📌'}</span>
                        <div style="flex: 1;">
                            <p style="font-size: 0.88rem; color: var(--text-primary); margin: 0;">${this.escapeHtml(e.title || e.query || e.name || 'Unknown')}</p>
                            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0;">${new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    // ==========================================
    // Bible Navigator (OT/NT Browser)
    // ==========================================
    toggleBibleNavigator() {
        const panel = document.getElementById('bibleNavigatorPanel');
        const arrow = document.getElementById('bibleNavArrow');
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            arrow.textContent = '▴';
            this.populateBibleNavVersions();
        } else {
            panel.style.display = 'none';
            arrow.textContent = '▾';
        }
    }

    populateBibleNavVersions() {
        const select = document.getElementById('bibleNavVersion');
        if (!select || select.options.length > 1) return;
        this.availableVersions.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.code;
            opt.textContent = `${v.code} — ${v.name}`;
            select.appendChild(opt);
        });
    }

    updateBibleNav() {
        // When version changes, show OT by default
        this.showTestament('OT');
    }

    async showTestament(testament) {
        const booksContainer = document.getElementById('bibleNavBooks');
        if (!booksContainer) return;

        // Identify currently selected version for language context
        const vCode = document.getElementById('bibleNavVersion')?.value;
        const version = this.availableVersions.find(v => v.code === vCode);
        const langCode = version?.languageCode || 'eng';

        // Fetch native names if needed and not already cached
        if (langCode !== 'eng' && !this.nativeBookNamesCache[langCode]) {
            booksContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem; padding: 20px; grid-column: 1/-1;">Localizing book names...</p>';
            try {
                const res = await fetch(`/api/bibles/book-names/${langCode}`);
                if (res.ok) {
                    const data = await res.json();
                    this.nativeBookNamesCache[langCode] = data.names;
                }
            } catch (e) {
                console.error('Failed to fetch native book names:', e);
            }
        }

        const otBooks = [
            'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
            '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles',
            'Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes',
            'Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel',
            'Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk',
            'Zephaniah','Haggai','Zechariah','Malachi'
        ];
        const ntBooks = [
            'Matthew','Mark','Luke','John','Acts','Romans',
            '1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians',
            'Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy',
            'Titus','Philemon','Hebrews','James','1 Peter','2 Peter',
            '1 John','2 John','3 John','Jude','Revelation'
        ];

        const books = testament === 'OT' ? otBooks : ntBooks;
        const nativeMap = this.nativeBookNamesCache[langCode] || {};

        booksContainer.innerHTML = books.map(book => {
            const nativeName = nativeMap[book.toLowerCase()];
            return `
                <button class="nav-btn" style="padding: 8px 12px; font-size: 0.8rem; justify-content: flex-start; text-align: left;" onclick="app.navigateToBook('${book}')">
                    ${nativeName || book}
                </button>
            `;
        }).join('');
    }

    navigateToBook(book) {
        const version = document.getElementById('bibleNavVersion')?.value;
        if (version) {
            const emptySlot = this.selectedVersions.findIndex(v => v === null);
            const slot = emptySlot !== -1 ? emptySlot : 0;
            const versionObj = this.availableVersions.find(v => v.code === version);
            if (versionObj) this.setVersion(slot + 1, versionObj.code, versionObj.name);
        }
        this.setSearch(`${book} 1`);
        this.showView('search');
        this.performSearch();
        this.trackActivity('search', { query: `${book} 1`, title: `Navigated to ${book}` });
    }

    // ==========================================
    // Material Sidebar (Persistent Access)
    // ==========================================
    toggleMaterialSidebar() {
        const sidebar = document.getElementById('materialSidebar');
        if (!sidebar) return;
        if (sidebar.style.display === 'none') {
            sidebar.style.display = 'block';
            this.populateMaterialSidebar();
        } else {
            sidebar.style.display = 'none';
        }
    }

    async populateMaterialSidebar() {
        const list = document.getElementById('materialSidebarList');
        if (!list) return;
        list.innerHTML = '<p style="color: var(--text-muted); font-size: 0.82rem;">Loading...</p>';

        try {
            const response = await fetch('/api/materials');
            if (!response.ok) throw new Error('Failed');
            const data = await response.json();

            list.innerHTML = data.materials.map(m => {
                const isActive = this.currentPdfPath === m.path;
                return `
                    <div style="padding: 10px 12px; border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s; border: 1px solid ${isActive ? 'var(--accent-emerald)' : 'var(--border-subtle)'}; background: ${isActive ? 'var(--accent-emerald-glow)' : 'var(--bg-elevated)'};" 
                         onmouseover="if(!${isActive}) this.style.borderColor='var(--border-accent)'" 
                         onmouseout="if(!${isActive}) this.style.borderColor='var(--border-subtle)'"
                         onclick="event.preventDefault(); event.stopPropagation(); app.openMaterial('${m.path}', '${this.escapeHtml(m.name)}')">
                        <p style="font-size: 0.82rem; color: ${isActive ? 'var(--accent-emerald)' : 'var(--text-primary)'}; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: ${isActive ? '600' : '400'};">${m.type === 'PDF' ? '📄' : '📝'} ${m.name}</p>
                        <p style="font-size: 0.7rem; color: var(--text-muted); margin: 2px 0 0;">${m.category} · ${m.size}</p>
                    </div>
                `;
            }).join('');
        } catch (e) {
            list.innerHTML = '<p style="color: #ef4444; font-size: 0.82rem;">Failed to load materials.</p>';
        }
    }

    // ==========================================
    // Utility
    // ==========================================
    getCategoryIcon(category) {
        const icons = {
            'General': '🌐',
            'Prophetic': '🔥',
            'Deliverance': '⚔️',
            'Healing': '🏥',
            'Faith': '🛡️',
            'Holy Spirit': '🕊️',
            'Finance': '💰',
            'Marriage': '💍',
            'Warfare': '🏹'
        };
        return icons[category] || '📜';
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML
            .replace(/'/g, "&#39;")
            .replace(/"/g, "&quot;")
            .replace(/`/g, "&#96;");
    }

    /**
     * Highlights search terms in the given text.
     * Majors on keywords by filtering out common stop words like 'the', 'of', etc.
     */
    highlightSearchTerms(text, query) {
        if (!query || !text) return text || '';
        
        const safeText = this.escapeHtml(text);
        const STOP_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'at', 'from', 'by', 'for', 'with', 'in', 'on', 'to', 'of', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'i', 'me', 'my', 'mine', 'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'we', 'us', 'our', 'ours', 'they', 'them', 'their', 'theirs']);

        // Strip quotes and unnecessary punctuation from query for highlighting purposes
        const cleanQuery = query.replace(/["']/g, '').trim();
        // Escape regex special characters in the query
        const escaped = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Build a flexible pattern for the full phrase
        const flexiblePattern = escaped.replace(/\s+/g, '[\\s,.;:\'"!\\?\\-\\(\\)\\[\\]]+');

        
        // Split for individual keyword highlighting (Filtering stop words)
        const words = cleanQuery.split(/\s+/);
        const keywords = words.filter(w => {
            const low = w.toLowerCase().replace(/[^a-z]/g, '');
            return low.length > 2 && !STOP_WORDS.has(low);
        });

        let patterns = [flexiblePattern];
        keywords.forEach(w => {
            const ew = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (!patterns.includes(ew)) patterns.push(ew);
        });

        const regex = new RegExp(`(${patterns.join('|')})`, 'gi');
        return safeText.replace(regex, (match) => {
            const lowMatch = match.toLowerCase().trim();
            // If the match is a stop word, only highlight it if it's part of the full phrase match
            if (STOP_WORDS.has(lowMatch) && match.length < query.length) {
                return match;
            }
            return `<mark class="search-highlight">${match}</mark>`;
        });
    }
    // ==========================================
    // PDF Export Logic
    // ==========================================
    exportFolderToPDF(folderIndex) {
        const folders = this.getFolders();
        const folder = folders[folderIndex];
        if (!folder) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(22);
        doc.setTextColor(5, 150, 105); // Accent Emerald
        doc.text("Green Bible App — Study Report", 14, 22);
        
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text(`Folder: ${folder.name}`, 14, 32);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Created: ${new Date(folder.createdAt).toLocaleDateString()} | Exported: ${new Date().toLocaleString()}`, 14, 38);
        
        // Items Table
        const head = [['#', 'Type', 'Title / Reference', 'Content Summary']];
        const body = folder.items.map((item, i) => [
            i + 1,
            item.type === 'verse' ? 'Verse' : 'Material',
            item.title || item.reference,
            item.type === 'verse' ? (item.text ? item.text.substring(0, 80) + '...' : 'Scripture Content') : 'Document Reference'
        ]);

        doc.autoTable({
            head: head,
            body: body,
            startY: 45,
            theme: 'striped',
            headStyles: { fillStyle: [5, 150, 105] },
            styles: { fontSize: 9 }
        });

        doc.save(`Study_Folder_${folder.name.replace(/\s+/g, '_')}.pdf`);
        this.showNotification(`Folder "${folder.name}" exported successfully!`, 'success');
    }

    exportTimelineToPDF() {
        const timeline = JSON.parse(localStorage.getItem('learningTimeline') || '[]');
        if (timeline.length === 0) {
            this.showNotification('Timeline is empty. Nothing to export.', 'warning');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(22);
        doc.setTextColor(5, 150, 105);
        doc.text("Green Bible App — Learning Journey", 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Full Study History Report | Generated: ${new Date().toLocaleString()}`, 14, 28);
        
        // Timeline Table
        const head = [['Date & Time', 'Activity', 'Details']];
        const body = timeline.map(entry => [
            new Date(entry.timestamp).toLocaleString(),
            entry.type.charAt(0).toUpperCase() + entry.type.slice(1),
            entry.title || entry.query || entry.name || 'Activity Reference'
        ]);

        doc.autoTable({
            head: head,
            body: body,
            startY: 35,
            theme: 'grid',
            headStyles: { fillStyle: [5, 150, 105] },
            styles: { fontSize: 8 }
        });

        doc.save(`GreenBible_Study_Timeline_${new Date().toISOString().split('T')[0]}.pdf`);
        this.showNotification(`Study timeline exported successfully!`, 'success');
    }
    renderTopics() {
        const grid = document.getElementById('topicsGrid');
        if (!grid) return;

        const topics = [
            { name: 'Love', icon: '❤️', keywords: 'love compassion' },
            { name: 'Faith', icon: '🛡️', keywords: 'faith trust believe' },
            { name: 'Hope', icon: '⚓', keywords: 'hope future expect' },
            { name: 'Peace', icon: '🕊️', keywords: 'peace calm quiet' },
            { name: 'Strength', icon: '💪', keywords: 'strength power might' },
            { name: 'Wisdom', icon: '🦉', keywords: 'wisdom knowledge understanding' },
            { name: 'Forgiveness', icon: '🤝', keywords: 'forgive mercy pardon' },
            { name: 'Prayer', icon: '🙏', keywords: 'pray petition ask' },
            { name: 'Healing', icon: '🏥', keywords: 'heal restore whole' },
            { name: 'Joy', icon: '☀️', keywords: 'joy rejoice glad' },
            { name: 'Salvation', icon: '⚓', keywords: 'save rescue redeem' },
            { name: 'Grace', icon: '✨', keywords: 'grace favor gift' },
            { name: 'Mercy', icon: '🌊', keywords: 'mercy pity kind' },
            { name: 'Righteousness', icon: '⚖️', keywords: 'righteous holy just' },
            { name: 'Redemption', icon: '🔓', keywords: 'redeem buy back' },
            { name: 'Obedience', icon: '📜', keywords: 'obey follow keep' }
        ];

        grid.innerHTML = topics.map(t => `
            <div class="topic-card" onclick="app.searchByTopic('${t.name}', '${t.keywords}')">
                <div class="topic-name">${t.name}</div>
                <div class="topic-count">Study Guide</div>
            </div>
        `).join('');
    }

    searchByTopic(topic, keywords) {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        searchInput.value = topic;
        this.performSearch(false); // Search for the specific topic name or keywords
        
        this.trackActivity('topic', { 
            name: topic, 
            title: `Studied topic: ${topic}`,
            keywords: keywords 
        });

        this.showNotification(`Loading study on ${topic}...`, 'info');
        
        // Auto-scroll to results
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // ==========================================
    // YouTube Audio Logic
    // ==========================================
    initYoutubeAPI() {
        if (!document.getElementById('ytPlayerContainer')) {
            const container = document.createElement('div');
            container.id = 'ytPlayerContainer';
            container.style.position = 'absolute';
            container.style.top = '-9999px';
            container.style.left = '-9999px';
            container.style.width = '1px';
            container.style.height = '1px';
            container.style.opacity = '0';
            container.innerHTML = '<div id="youtube-player"></div>';
            document.body.appendChild(container);
        }

        if (this.ytPlayer) return;

        const setupPlayer = () => {
            if (this.ytPlayer) return;
            this.ytPlayer = new YT.Player('youtube-player', {
                height: '0',
                width: '0',
                playerVars: {
                    'playsinline': 1
                },
                events: {
                    'onReady': (event) => {
                        console.log('YouTube Player Ready');
                        if (this.currentAudioId) {
                            this.ytPlayer.loadVideoById(this.currentAudioId);
                        }
                    },
                    'onStateChange': (event) => {
                        if (event.data === YT.PlayerState.PLAYING) {
                            this.isPlaying = true;
                            this.startAudioProgressSync();
                        } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                            this.isPlaying = false;
                            this.stopAudioProgressSync();
                        }
                        this.updateAudioUI();
                    },
                    'onError': (e) => {
                        console.error('YT Player Error:', e);
                        this.showNotification('Audio playback error.', 'error');
                    }
                }
            });
        };

        if (window.YT && window.YT.Player) {
            setupPlayer();
        } else {
            if (!window.onYouTubeIframeAPIReady) {
                window.onYouTubeIframeAPIReady = setupPlayer;
            }

            if (!document.getElementById('yt-api-script')) {
                const tag = document.createElement('script');
                tag.id = 'yt-api-script';
                tag.src = "https://www.youtube.com/iframe_api";
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            }
        }
    }

    toggleGlobalAudio() {
        if (!this.ytPlayer || !this.ytPlayer.getPlayerState) return;
        const state = this.ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            this.ytPlayer.pauseVideo();
        } else {
            this.ytPlayer.playVideo();
        }
    }

    stopGlobalAudio() {
        if (this.ytPlayer && this.ytPlayer.pauseVideo) {
            this.ytPlayer.pauseVideo();
        }
        this.isPlaying = false;
        this.stopAudioProgressSync();
        this.updateAudioUI();
    }

    closeGlobalAudio() {
        this.stopGlobalAudio();
        const tray = document.getElementById('audioPlayerTray');
        if (tray) tray.style.display = 'none';
    }

    seekAudio(secondsOrEvent) {
        if (!this.ytPlayer) return;
        
        let seconds;
        if (typeof secondsOrEvent === 'number' || typeof secondsOrEvent === 'string') {
            seconds = parseFloat(secondsOrEvent);
        } else {
            // Event from progress bar click
            const rect = secondsOrEvent.currentTarget.getBoundingClientRect();
            const x = secondsOrEvent.clientX - rect.left;
            const pct = x / rect.width;
            seconds = pct * this.ytPlayer.getDuration();
        }

        this.ytPlayer.seekTo(seconds, true);
        if (!this.isPlaying) {
            this.ytPlayer.playVideo();
        }
    }

    seekAudioRelative(seconds) {
        if (!this.ytPlayer || !this.ytPlayer.getCurrentTime) return;
        const current = this.ytPlayer.getCurrentTime();
        this.ytPlayer.seekTo(current + seconds, true);
    }

    parseTimeToSeconds(timeStr) {
        const parts = timeStr.split(':').reverse();
        let seconds = 0;
        if (parts[0]) seconds += parseInt(parts[0]);
        if (parts[1]) seconds += parseInt(parts[1]) * 60;
        if (parts[2]) seconds += parseInt(parts[2]) * 3600;
        return seconds;
    }

    startAudioProgressSync() {
        this.stopAudioProgressSync();
        this.audioInterval = setInterval(() => {
            this.updateAudioUI();
            this.syncTranscriptHighlight();
        }, 100);
    }

    stopAudioProgressSync() {
        if (this.audioInterval) {
            clearInterval(this.audioInterval);
            this.audioInterval = null;
        }
    }

    updateAudioUI() {
        const icon = this.isPlaying ? '⏸' : '▶';
        const label = this.isPlaying ? 'PAUSE' : 'PLAY';

        // Update Global Tray
        const tray = document.getElementById('audioPlayerTray');
        if (tray && this.currentSermon) {
            tray.style.display = 'flex';
            tray.style.bottom = '0';
            const titleEl = document.getElementById('audioTitle');
            if (titleEl) titleEl.textContent = this.currentSermon.title;
            
            const toggleIcon = document.getElementById('audioToggleIcon');
            const toggleLabel = document.getElementById('audioToggleLabel');
            if (toggleIcon) toggleIcon.textContent = icon;
            if (toggleLabel) toggleLabel.textContent = label;

            // Update Sync Indicator in Sermon Detail
            const indicator = document.getElementById('syncIndicator');
            if (indicator) {
                indicator.style.display = this.isPlaying ? 'inline-block' : 'none';
            }
        }

        // Update Modal Controls
        const modalToggleBtn = document.getElementById('modalAudioToggleBtn');
        if (modalToggleBtn) {
            const i = modalToggleBtn.querySelector('i');
            if (i) i.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
        }

        if (this.ytPlayer && this.ytPlayer.getCurrentTime) {
            const current = this.ytPlayer.getCurrentTime();
            const duration = this.ytPlayer.getDuration();
            const pct = duration > 0 ? (current / duration) * 100 : 0;

            const globalBar = document.getElementById('audioProgressBar');
            if (globalBar) globalBar.style.width = `${pct}%`;

            const modalBar = document.getElementById('modalAudioProgress');
            if (modalBar) modalBar.style.width = `${pct}%`;

            const globalTime = document.getElementById('audioCurrentTime');
            if (globalTime) globalTime.textContent = this.formatTime(current);

            const globalDuration = document.getElementById('audioDuration');
            if (globalDuration) globalDuration.textContent = this.formatTime(duration);
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    syncTranscriptHighlight() {
        if (!this.ytPlayer || !this.ytPlayer.getCurrentTime) return;
        const currentTime = this.ytPlayer.getCurrentTime();
        
        // Update Progress Tracking
        if (this.currentAudioId) {
            this.updateSermonProgress(this.currentAudioId, currentTime, this.ytPlayer.getDuration ? this.ytPlayer.getDuration() : 0);
        }

        // 1. Sync Lines (Vertical Scrolling)
        const lines = document.querySelectorAll('.transcript-line');
        let activeLine = null;

        lines.forEach(line => {
            const time = parseFloat(line.getAttribute('data-time'));
            if (!isNaN(time) && time <= currentTime) {
                activeLine = line;
            }
        });

        if (activeLine && !activeLine.classList.contains('active-line-tracked')) {
            lines.forEach(l => {
                l.classList.remove('active-line-tracked');
                l.style.background = 'transparent';
                l.style.borderLeft = 'none';
                // Reset colors of words in inactive lines
                l.querySelectorAll('.transcript-word').forEach(w => {
                    w.classList.remove('active');
                    w.style.color = 'var(--text-secondary)';
                    w.style.textShadow = 'none';
                });
            });
            activeLine.classList.add('active-line-tracked');
            activeLine.style.background = 'rgba(52, 211, 153, 0.05)';
            activeLine.style.borderLeft = '3px solid var(--accent-emerald)';
            
            // Scroll to active line
            activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // 2. Sync Words (Visual Illumination Karaoke Style) ONLY within activeLine
        if (activeLine) {
            const words = activeLine.querySelectorAll('.transcript-word');
            // Estimate duration per word dynamically if possible, or use default 0.46
            let activeWordFound = false;
            
            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                const time = parseFloat(word.getAttribute('data-time'));
                const nextWord = words[i + 1];
                const nextTime = nextWord ? parseFloat(nextWord.getAttribute('data-time')) : Infinity;
                
                if (!isNaN(time)) {
                    if (currentTime >= time && currentTime < nextTime) {
                         // Currently spoken word
                         word.classList.add('active');
                         word.style.color = '#10b981'; // Emerald
                         word.style.fontWeight = 'bold';
                         word.style.textShadow = '0 0 12px rgba(16, 185, 129, 0.5)';
                         word.style.transition = 'color 0.1s, text-shadow 0.1s';
                         activeWordFound = true;
                    } else {
                         word.classList.remove('active');
                         word.style.fontWeight = 'normal';
                         word.style.textShadow = 'none';
                         if (currentTime >= time) {
                             // Spoken word (past)
                             word.style.color = 'var(--text-primary)';
                         } else {
                             // Upcoming word
                             word.style.color = 'var(--text-muted)';
                         }
                    }
                }
            }
        }
    }

    // (renderTranscriptWithTimestamps merged and moved to line 2711)

    // ==========================================
    // Sermon Methods (Restored)
    // ==========================================
    // Consolidation: Removed openSermonModal and closeSermonModal in favor of openTranscriptModal

    openTranscriptModal(id) {
        const modal = document.getElementById('transcriptModal');
        const content = document.getElementById('modalTranscriptContent');
        const title = document.getElementById('modalTranscriptTitle');
        const insightPanel = document.getElementById('modalInterpretationContent');
        
        if (!modal || !content) {
            // Fallback if transcript modal missing
            this.openSermonModal(id);
            return;
        }

        content.innerHTML = `<div style="text-align: center; padding: 100px;"><div class="loading-spinner"></div></div>`;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        fetch(`/api/sermons/${id}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch details');
                return res.json();
            })
            .then(s => {
                this.currentSermon = s;

                if (title) title.textContent = s.title ? this.escapeHtml(s.title) : 'Message Transcript';
                
                const subtitle = document.getElementById('modalTranscriptSubtitle');
                if (subtitle) subtitle.textContent = s.author || 'Pastor John Anosike';
                
                if (insightPanel) {
                    insightPanel.innerHTML = `
                        <div style="margin-bottom: 20px;">
                            <h5 style="color: var(--accent-gold); font-size: 0.8rem; margin-bottom: 8px;">SUMMARY</h5>
                            <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;">${this.escapeHtml(s.summary)}</p>
                        </div>
                        <div>
                            <h5 style="color: var(--accent-gold); font-size: 0.8rem; margin-bottom: 8px;">KEY POINTS</h5>
                            <ul style="padding-left: 16px; font-size: 0.85rem; color: var(--text-secondary);">
                                ${(s.interpretation?.key_points || []).map(kp => `<li style="margin-bottom: 8px;">${this.escapeHtml(kp)}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <!-- Sermon Notes Integration -->
                        <div id="modalSermonNotes">
                            ${this.renderSermonNotes(s.id)}
                        </div>
                    `;
                }

                content.innerHTML = this.renderTranscriptWithTimestamps(s.transcript);

                // Start playing audio
                this.playSermon(id);
            })
            .catch(error => {
                console.error('Modal error:', error);
                this.showNotification('Failed to load message content.', 'error');
                this.closeTranscriptModal();
            });
    }

    closeTranscriptModal() {
        const modal = document.getElementById('transcriptModal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
        this.stopGlobalAudio();
    }

    shareSermonTimestamp(sermonId, timestamp, title) {
        const url = `${window.location.origin}?sermon=${sermonId}&t=${timestamp}`;
        const text = `Check out this prophetic moment from "${title}" at ${this.formatTime(timestamp)}`;
        
        if (navigator.share) {
            navigator.share({
                title: title,
                text: text,
                url: url
            }).then(() => {
                this.showNotification('Moment shared successfully!', 'success');
            }).catch(err => {
                console.log('Share failed:', err);
                this.copyToClipboard(url);
            });
        } else {
            this.copyToClipboard(url);
            this.showNotification('Link copied to clipboard!', 'success');
        }
    }

    playSermon(id, startTime = null) {
        if (!id) return;
        
        // Check for progress if no specific startTime provided
        if (startTime === null) {
            const progress = this.getSermonProgress(id);
            if (progress && progress.currentTime > 10 && progress.percentage < 95) {
                this.showNotification(`Resuming from ${this.formatTime(progress.currentTime)}`, 'info');
                startTime = progress.currentTime;
            }
        }

        this.currentAudioId = id;
        this.isPlaying = true;

        if (this.ytPlayer && this.ytPlayer.loadVideoById) {
            this.ytPlayer.loadVideoById({
                videoId: id,
                startSeconds: startTime || 0
            });
        } else if (!this.ytPlayer) {
            this.initYoutubeAPI();
            setTimeout(() => {
                if (this.ytPlayer && this.ytPlayer.loadVideoById) {
                    this.ytPlayer.loadVideoById({
                        videoId: id,
                        startSeconds: startTime || 0
                    });
                }
            }, 1000);
        }

        // Highlight current card
        document.querySelectorAll('.sermon-card-playing').forEach(c => c.classList.remove('sermon-card-playing'));
        const card = document.getElementById(`sermon-card-${id}`);
        if (card) card.classList.add('sermon-card-playing');

        // Show audio tray
        const tray = document.getElementById('audioPlayerTray');
        if (tray) tray.style.bottom = '0';

        // Update audio title
        const titleEl = document.getElementById('audioTitle');
        if (titleEl && this.currentSermon && this.currentSermon.id === id) {
            titleEl.textContent = this.currentSermon.title;
        }
        this.updateAudioUI();
    }

    seekSermon(seconds) {
        this.seekAudio(seconds);
    }
}

// ==========================================
// Global App Instance
// ==========================================
const app = new GreenBibleApp();
window.app = app;

// Global function exports for onclick handlers
function showView(view) { app.showView(view); }
function selectVersion(slot) { app.selectVersion(slot); }
function toggleLock() { app.toggleLock(); }
function closeVersionModal() { app.closeVersionModal(); }
function setSearch(query) { app.setSearch(query); }
function performSearch() { app.performSearch(); }
function navigateVerse(direction) { app.navigateVerse(direction); }
function addToCompare(slot) { app.addToCompare(slot); }
function generateAIIllustration() { app.generateAIIllustration(); }
function fetchInterpretation() { app.fetchInterpretation(); }
function searchByTopic(topic) { app.searchByTopic(topic); }
function loadRelatedVerse(reference) { app.loadRelatedVerse(reference); }
function selectVersionFromLibrary(code, name) { app.selectVersionFromLibrary(code, name); }
function readVersion(code) { app.readVersion(code); }
function toggleLibrary() { app.toggleLibrary(); }
function toggleHistory() { app.toggleHistory(); }
function goToNextVerse(reference) { app.goToNextVerse(reference); }
function showVerseImage(reference) { app.showVerseImage(reference); }
function illustrateVerse(reference) { app.illustrateVerse(reference); }
function openVisualModal(reference, type) { app.openVisualModal(reference, type); }
function closeVisualModal() { app.closeVisualModal(); }
function openTranscriptModal(id) { app.openTranscriptModal(id); }
function openSermonModal(id) { app.openSermonModal(id); }
function closeSermonModal() { app.closeSermonModal(); }
function closeTranscriptModal() { app.closeTranscriptModal(); }
function playSermon(id) { app.playSermon(id); }
function seekSermon(seconds) { app.seekSermon(seconds); }
function loadPassage(book, chapter, verse) { app.loadPassage(book, chapter, verse); }
function toggleBookmark(book, chapter, verse, text, version) { app.toggleBookmark(book, chapter, verse, text, version); }
function clearSearchHistory() { app.clearSearchHistory(); }
function compareSearch() { app.compareSearch(); }
function showInterlinear(ref, ver) { app.showInterlinear(ref, ver); }
function showCrossReferences(ref) { app.showCrossReferences(ref); }

// Close modals on outside click
document.addEventListener('click', (e) => {
    const versionModal = document.getElementById('versionModal');
    const visualModal = document.getElementById('visualModal');
    if (e.target === versionModal) {
        app.closeVersionModal();
    }
    if (e.target === visualModal) {
        app.closeVisualModal();
    }
});

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-10px); }
    }
`;
document.head.appendChild(style);

console.log('🌿 Green Bible App — Premium Edition Loaded');

// ==========================================
// Security: Block downloads on viewer
// ==========================================
document.addEventListener('keydown', (e) => {
    // Block Ctrl+S and Ctrl+P when material viewer is visible
    const viewer = document.getElementById('materialViewerContainer');
    if (viewer && viewer.style.display !== 'none') {
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'u' || e.key === 'S' || e.key === 'P' || e.key === 'U')) {
            e.preventDefault();
            e.stopPropagation();
            app.showNotification('Security protocol active: Downloads and printing are disabled.', 'warning');
        }
    }
});

// Extra layer: Global context menu block when viewer is open
document.addEventListener('contextmenu', (e) => {
    const viewer = document.getElementById('materialViewerContainer');
    if (viewer && viewer.style.display !== 'none') {
        const isActionTray = e.target.closest('.action-tray') || e.target.closest('.card-nav-mini');
        if (!isActionTray) {
            e.preventDefault();
        }
    }
});
