// Green Bible App - Enhanced JavaScript Application
// Classic Green Theme with Advanced Features

class GreenBibleApp {
    constructor() {
        this.selectedVersions = [null, null, null, null];
        this.lockedVersions = false;
        this.currentVerse = null;
        this.currentBook = null;
        this.currentChapter = null;
        this.currentVerseNum = null;
        this.compareSlots = [null, null, null, null];
        this.availableVersions = [
            { code: 'ESV', name: 'English Standard Version', language: 'English' },
            { code: 'NIV', name: 'New International Version', language: 'English' },
            { code: 'KJV', name: 'King James Version', language: 'English' },
            { code: 'NLT', name: 'New Living Translation', language: 'English' },
            { code: 'NASB', name: 'New American Standard Bible', language: 'English' },
            { code: 'AMP', name: 'Amplified Bible', language: 'English' },
            { code: 'SWAHILI', name: 'Biblia Takatifu', language: 'Swahili' },
            { code: 'EKEGUSII', name: 'Ekegusii Bible', language: 'Ekegusii' },
            { code: 'KALENJIN', name: 'Kalenjin Bible', language: 'Kalenjin' },
            { code: 'KIKUYU', name: 'Kikuyu Bible', language: 'Kikuyu' },
            { code: 'LUO', name: 'Dholuo Bible', language: 'Dholuo' },
            { code: 'AMHARIC', name: 'Amharic Bible', language: 'Amharic' },
            { code: 'AFRIKAANS', name: 'Afrikaans Bible', language: 'Afrikaans' }
        ];
        this.init();
    }

    init() {
        console.log('Green Bible App - Classic Edition Initialized');
        this.loadFromStorage();
        this.updateVersionSlots();
        this.renderLibrary();
    }

    // Storage Methods
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
    }

    saveToStorage() {
        localStorage.setItem('selectedVersions', JSON.stringify(this.selectedVersions));
        localStorage.setItem('lockedVersions', JSON.stringify(this.lockedVersions));
    }

    // Version Selection
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
        
        list.innerHTML = this.availableVersions.map(v => `
            <button onclick="app.setVersion(${slotNum}, '${v.code}', '${v.name}')" 
                    style="padding: 15px; text-align: left; background: #0f2918; border: 2px solid #1a4d30; border-radius: 10px; cursor: pointer; transition: all 0.3s; display: flex; justify-content: space-between; align-items: center;"
                    onmouseover="this.style.borderColor='#4a8c6a'; this.style.background='#143d24';"
                    onmouseout="this.style.borderColor='#1a4d30'; this.style.background='#0f2918';">
                <div>
                    <strong style="color: #a8d5ba; font-size: 1.1rem;">${v.code}</strong>
                    <div style="color: #6b9b7a; font-size: 0.9rem;">${v.name}</div>
                </div>
                <span style="color: #4a8c6a; font-size: 0.8rem;">${v.language}</span>
            </button>
        `).join('');
        
        modal.style.display = 'flex';
    }

    closeVersionModal() {
        document.getElementById('versionModal').style.display = 'none';
    }

    setVersion(slotNum, code, name) {
        this.selectedVersions[slotNum - 1] = { code, name };
        this.saveToStorage();
        this.updateVersionSlots();
        this.closeVersionModal();
        this.showNotification(`${code} added to slot ${slotNum}`, 'success');
    }

    updateVersionSlots() {
        for (let i = 0; i < 4; i++) {
            const slot = document.querySelector(`[data-slot="${i + 1}"]`);
            const version = this.selectedVersions[i];
            
            if (version) {
                slot.classList.remove('empty');
                slot.classList.add('selected');
                slot.innerHTML = `
                    <span class="version-slot-number">${i + 1}</span>
                    <span class="version-code">${version.code}</span>
                    <span class="version-name">${version.name}</span>
                    ${!this.lockedVersions ? `<button onclick="event.stopPropagation(); app.clearVersion(${i + 1})" style="position: absolute; bottom: 10px; right: 10px; background: #ff6b6b; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 12px;">├ù</button>` : ''}
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

    // Lock Functionality
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
        if (this.lockedVersions) {
            btn.classList.add('locked');
            btn.innerHTML = '<span>≡ƒöÆ</span> Locked';
        } else {
            btn.classList.remove('locked');
            btn.innerHTML = '<span>≡ƒöô</span> Lock Versions';
        }
    }

    // Search Functionality
    setSearch(query) {
        document.getElementById('searchInput').value = query;
    }

    async performSearch() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) {
            this.showNotification('Please enter a search query', 'warning');
            return;
        }

        const activeVersions = this.selectedVersions.filter(v => v !== null);
        if (activeVersions.length === 0) {
            this.showNotification('Please select at least one Bible version', 'warning');
            return;
        }

        // Parse verse reference
        const parsed = this.parseVerseReference(query);
        if (parsed) {
            this.currentBook = parsed.book;
            this.currentChapter = parsed.chapter;
            this.currentVerseNum = parsed.verse;
        }

        // Show results section
        document.getElementById('resultsSection').classList.add('active');

        // Show interpretation and related sections
        document.getElementById('interpretationSection').style.display = 'block';
        document.getElementById('interpretationReference').textContent = query;
        
        // Fetch results for each selected version
        const resultsGrid = document.getElementById('resultsGrid');
        resultsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><div style="font-size: 2rem;">≡ƒôû</div><p>Searching...</p></div>';

        try {
            console.log('Fetching results for versions:', activeVersions.map(v => v.code));
            const results = await Promise.all(
                activeVersions.map(async (version) => {
                    const verse = await this.fetchVerse(version.code, query);
                    console.log(`Fetched verse for ${version.code}:`, verse);
                    return { version, verse };
                })
            );

            console.log('All results fetched:', results);
            this.displayResults(results);
        } catch (error) {
            this.showNotification('Error fetching results', 'error');
            console.error('Error in performSearch:', error);
        }
    }

    parseVerseReference(query) {
        // Simple parser for "Book Chapter:Verse" format
        const match = query.match(/^([\w\s]+)\s+(\d+)(?::(\d+))?$/i);
        if (match) {
            return {
                book: match[1].trim(),
                chapter: parseInt(match[2]),
                verse: match[3] ? parseInt(match[3]) : null
            };
        }
        return null;
    }

    async fetchVerse(versionCode, query) {
        // Mock data - replace with actual API call
        const mockVerses = {
            'John 3:16': {
                reference: 'John 3:16',
                text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'
            },
            'Genesis 1:1': {
                reference: 'Genesis 1:1',
                text: 'In the beginning God created the heaven and the earth.'
            },
            'Psalm 23:1': {
                reference: 'Psalm 23:1',
                text: 'The LORD is my shepherd; I shall not want.'
            }
        };

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        return mockVerses[query] || {
            reference: query,
            text: `Sample verse text for ${query} in ${versionCode}. (Connect to actual Bible API for real data)`
        };
    }

    displayResults(results) {
        const grid = document.getElementById('resultsGrid');
        if (!grid) {
            console.error('resultsGrid element not found');
            return;
        }
        
        grid.innerHTML = results.map(({ version, verse }) => {
            const safeRef = verse.reference.replace(/\s+/g, '-');
            return `
            <div class="result-card" id="card-${version.code}-${safeRef}" style="background: linear-gradient(145deg, #0f2918, #143d24); border: 1px solid #1a4d30; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3); transition: all 0.3s ease;">
                <div class="result-header" style="background: linear-gradient(135deg, #0a2f1a, #1a4d30); padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1a4d30;">
                    <span class="result-version" style="color: #ffffff; font-weight: 700; font-size: 1.3rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${version.code}</span>
                    <span class="result-language" style="color: #ffffff; font-size: 0.9rem; font-weight: 500;">${version.name}</span>
                </div>
                <div class="result-body" style="background: linear-gradient(180deg, #0f2918, #0a1f14); padding: 25px;">
                    <div class="reference" style="color: #ffffff; font-weight: 700; font-size: 1.1rem; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${verse.reference}</div>
                    <div class="verse-text" style="color: #ffffff; font-size: 1.3rem; line-height: 1.9; margin-bottom: 25px; font-family: 'Cormorant Garamond', serif; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${verse.text}</div>
                    
                    <!-- Visual Study Area - Inline -->
                    <div id="visual-area-${version.code}-${safeRef}" style="display: none; margin-bottom: 20px; padding: 20px; background: linear-gradient(145deg, #0a1f14, #143d24); border-radius: 15px; border: 1px solid #2d6a4f;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div style="text-align: center; padding: 15px; background: rgba(26, 77, 48, 0.3); border-radius: 10px;">
                                <div style="font-size: 2rem; margin-bottom: 8px;">≡ƒû╝∩╕Å</div>
                                <p style="color: #ffffff; font-size: 0.9rem; margin: 0;">Historical Image</p>
                                <p style="color: #a8d5ba; font-size: 0.75rem; margin-top: 5px;">Loading...</p>
                            </div>
                            <div style="text-align: center; padding: 15px; background: rgba(26, 77, 48, 0.3); border-radius: 10px;">
                                <div style="font-size: 2rem; margin-bottom: 8px;">≡ƒÄ¿</div>
                                <p style="color: #ffffff; font-size: 0.9rem; margin: 0;">AI Illustration</p>
                                <p style="color: #a8d5ba; font-size: 0.75rem; margin-top: 5px;">Generating...</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Action Buttons Row -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
                        <button onclick="app.addToCompareSlot('${verse.reference}', '${verse.text}', '${version.code}')" 
                                style="padding: 12px 8px; background: linear-gradient(135deg, #d4af37, #b8941f); color: #0a2f1a; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 4px; box-shadow: 0 4px 12px rgba(212,175,55,0.3);">
                            Γ₧ò Compare
                        </button>
                        <button onclick="app.goToNextVerse('${verse.reference}')" 
                                style="padding: 12px 8px; background: linear-gradient(135deg, #1a4d30, #2d6a4f); color: #ffffff; border: 1px solid #4a8c6a; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 4px;">
                            Next Γû╢
                        </button>
                        <button onclick="app.toggleVisualInCard('${version.code}', '${verse.reference}', 'image')" 
                                style="padding: 12px 8px; background: linear-gradient(135deg, #143d24, #1a4d30); color: #ffffff; border: 1px solid #2d6a4f; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 4px;">
                            ≡ƒû╝∩╕Å Image
                        </button>
                        <button onclick="app.toggleVisualInCard('${version.code}', '${verse.reference}', 'illustrate')" 
                                style="padding: 12px 8px; background: linear-gradient(135deg, #143d24, #1a4d30); color: #ffffff; border: 1px solid #2d6a4f; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 4px;">
                            ≡ƒÄ¿ AI Art
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
        
        console.log(`Displayed ${results.length} results`);
    }

    // Navigation
    navigateVerse(direction) {
        if (!this.currentBook || !this.currentChapter) {
            this.showNotification('No verse loaded to navigate from', 'warning');
            return;
        }

        switch(direction) {
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

    // Comparison
    addToCompare(slotNum) {
        this.showNotification('Click "Add to Compare" on a verse result to add it here', 'info');
    }

    addToCompareSlot(reference, text, version) {
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
            const verse = this.compareSlots[i];

            if (verse) {
                slot.classList.add('filled');
                slot.innerHTML = `
                    <span class="slot-label">${verse.version}</span>
                    <strong style="color: #1a472a; margin-bottom: 10px;">${verse.reference}</strong>
                    <p style="font-size: 0.9rem; color: #666; text-align: center; margin: 10px 0;">${verse.text.substring(0, 100)}...</p>
                    <button onclick="event.stopPropagation(); app.clearCompareSlot(${i})" style="padding: 8px 16px; background: #ff6b6b; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">Remove</button>
                `;
            } else {
                slot.classList.remove('filled');
                slot.innerHTML = `
                    <span class="slot-label">Slot ${i + 1}</span>
                    <span>Click to add verse</span>
                `;
            }
        }
    }

    clearCompareSlot(index) {
        this.compareSlots[index] = null;
        this.updateCompareSlots();
    }

    // AI Illustration - Now integrated into result cards
    generateAIIllustration() {
        if (!this.currentBook || !this.currentChapter) {
            this.showNotification('Search for a verse first to generate illustration', 'warning');
            return;
        }

        this.showNotification('AI illustration now available in each verse card - click "≡ƒÄ¿ AI Art" button', 'info');
    }

    // Interpretation / Commentary
    async fetchInterpretation() {
        if (!this.currentBook || !this.currentChapter) {
            this.showNotification('Search for a verse first to get interpretation', 'warning');
            return;
        }

        const reference = `${this.currentBook} ${this.currentChapter}${this.currentVerseNum ? ':' + this.currentVerseNum : ''}`;
        document.getElementById('interpretationReference').textContent = reference;
        
        // Show loading state
        document.getElementById('interpretationContent').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 2rem; animation: spin 1s linear infinite;">≡ƒôû</div>
                <p style="color: #666; margin-top: 15px;">Loading commentary...</p>
            </div>
        `;

        // Mock interpretation data - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 1000));

        const interpretations = {
            'John 3:16': {
                text: `This verse is the heart of the Gospel message. "For God so loved" - Here is the fountain head of all blessings: the infinite, eternal love of God. The love is not merely emotional but active and self-giving. "The world" - Not just Israel, but all humanity, Jew and Gentile alike. "Gave his only begotten Son" - The costliest gift heaven could offer. This speaks of incarnation, sacrifice, and redemption. "Whosoever believeth" - The condition is simple faith, available to all without distinction. "Should not perish" - Salvation from eternal destruction. "But have everlasting life" - Not just existence, but abundant, eternal, joyful life in fellowship with God.`,
                topics: ['God\'s Love', 'Salvation', 'Faith', 'Eternal Life', 'Jesus Christ', 'Gospel']
            },
            'Genesis 1:1': {
                text: `In these opening words, we find the foundation of all truth. "In the beginning" - Time itself had a commencement; God is eternal, existing before time. "God created" - Here is the declaration of God's absolute power and sovereignty. The Hebrew word "bara" implies creation out of nothing (ex nihilo). "The heaven and the earth" - The entire universe, both spiritual and material realms. This verse refutes atheism, pantheism, and materialism. It establishes God as the sole, supreme, self-existent Creator who spoke all things into being through His word.`,
                topics: ['Creation', 'God\'s Power', 'Sovereignty', 'Beginnings', 'Faith', 'Theology']
            },
            'Psalm 23:1': {
                text: `David, the shepherd-king, speaks from experience. "The LORD is my shepherd" - Jehovah, the covenant-keeping God, personally cares for me. The shepherd imagery speaks of guidance, protection, provision, and intimate relationship. Sheep are helpless and need constant care; we are God's sheep. "I shall not want" - With the Good Shepherd leading, every need is met - physical, emotional, and spiritual. This is not about luxury but sufficiency in God's abundant provision. Contentment flows from recognizing His care.`,
                topics: ['Divine Care', 'Provision', 'Contentment', 'Trust', 'Guidance', 'Relationship with God']
            }
        };

        const interpretation = interpretations[reference] || {
            text: `Commentary for ${reference}: This verse speaks to the heart of God's revelation to humanity. The context suggests themes of divine love, redemption, and human response to God's grace. Further study of the surrounding passages reveals deeper theological significance and practical application for daily living. Connect to commentary API for full Matthew Henry or other scholarly commentary.`,
            topics: ['Study', 'Scripture', 'Theology', 'Application', 'Faith']
        };

        // Display interpretation
        document.getElementById('interpretationContent').innerHTML = `
            <p class="interpretation-text">${interpretation.text}</p>
        `;

        // Display topics
        const topicsHtml = interpretation.topics.map(topic => `
            <span class="topic-tag" onclick="app.searchByTopic('${topic}')">${topic}</span>
        `).join('');
        
        document.getElementById('topicTags').innerHTML = topicsHtml;
        document.getElementById('interpretationTopics').style.display = 'block';

        // Also fetch related verses
        this.fetchRelatedVerses();
    }

    searchByTopic(topic) {
        document.getElementById('searchInput').value = topic;
        this.performSearch();
        this.showNotification(`Searching verses about: ${topic}`, 'info');
    }

    // Related Verses
    async fetchRelatedVerses() {
        if (!this.currentBook) return;

        const reference = `${this.currentBook} ${this.currentChapter}${this.currentVerseNum ? ':' + this.currentVerseNum : ''}`;
        
        // Mock related verses with relevance scores
        const relatedVerses = [
            { reference: 'Romans 5:8', text: 'But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.', relevance: 95, reason: 'Same theme: God\'s love and sacrifice' },
            { reference: '1 John 4:9', text: 'In this was manifested the love of God toward us, because that God sent his only begotten Son into the world...', relevance: 92, reason: 'Similar wording: "only begotten Son"' },
            { reference: 'John 3:17', text: 'For God sent not his Son into the world to condemn the world; but that the world through him might be saved.', relevance: 88, reason: 'Immediate context, same passage' },
            { reference: 'Ephesians 2:8-9', text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God...', relevance: 85, reason: 'Complementary theme: salvation by faith' },
            { reference: 'Romans 6:23', text: 'For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.', relevance: 82, reason: 'Contrasts death with eternal life' },
            { reference: 'Galatians 2:20', text: 'I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me...', relevance: 78, reason: 'Christ\'s sacrifice for us' }
        ];

        // Show section
        document.getElementById('relatedSection').style.display = 'block';
        
        // Display related verses sorted by relevance
        const grid = document.getElementById('relatedGrid');
        grid.innerHTML = relatedVerses.map(v => `
            <div class="related-card" onclick="app.loadRelatedVerse('${v.reference}')">
                <div class="relevance-score">${v.relevance}%</div>
                <div class="related-reference">${v.reference}</div>
                <div class="related-text">${v.text}</div>
                <div class="related-reason">${v.reason}</div>
            </div>
        `).join('');
    }

    loadRelatedVerse(reference) {
        document.getElementById('searchInput').value = reference;
        this.performSearch();
        document.getElementById('relatedSection').scrollIntoView({ behavior: 'smooth' });
    }

    // Library
    renderLibrary() {
        const libraryVersions = [
            { code: 'ESV', name: 'English Standard Version', language: 'English', icon: '≡ƒôÿ', status: 'available', progress: 100 },
            { code: 'NIV', name: 'New International Version', language: 'English', icon: '≡ƒôù', status: 'available', progress: 100 },
            { code: 'KJV', name: 'King James Version', language: 'English', icon: '≡ƒôò', status: 'available', progress: 100 },
            { code: 'NLT', name: 'New Living Translation', language: 'English', icon: '≡ƒôÖ', status: 'available', progress: 100 },
            { code: 'NASB', name: 'New American Standard Bible', language: 'English', icon: '≡ƒôô', status: 'available', progress: 100 },
            { code: 'AMP', name: 'Amplified Bible', language: 'English', icon: '≡ƒôö', status: 'available', progress: 100 },
            { code: 'SWAHILI', name: 'Biblia Takatifu', language: 'Swahili', icon: '≡ƒîì', status: 'available', progress: 100 },
            { code: 'EKEGUSII', name: 'Ekegusii Bible', language: 'Ekegusii', icon: '≡ƒç░≡ƒç¬', status: 'available', progress: 100 },
            { code: 'KALENJIN', name: 'Kalenjin Bible', language: 'Kalenjin', icon: '≡ƒç░≡ƒç¬', status: 'offline', progress: 0 },
            { code: 'KIKUYU', name: 'Kikuyu Bible', language: 'Kikuyu', icon: '≡ƒç░≡ƒç¬', status: 'offline', progress: 0 },
            { code: 'LUO', name: 'Dholuo Bible', language: 'Dholuo', icon: '≡ƒç░≡ƒç¬', status: 'available', progress: 100 },
            { code: 'AMHARIC', name: 'Amharic Bible', language: 'Amharic', icon: '≡ƒç¬≡ƒç╣', status: 'available', progress: 100 },
            { code: 'AFRIKAANS', name: 'Afrikaans Bible', language: 'Afrikaans', icon: '≡ƒç┐≡ƒçª', status: 'available', progress: 100 }
        ];

        const grid = document.getElementById('libraryGrid');
        grid.innerHTML = libraryVersions.map(v => `
            <div class="library-item" onclick="app.selectVersionFromLibrary('${v.code}', '${v.name}')">
                <div class="library-cover">
                    <div class="library-cover-icon">${v.icon}</div>
                    <div class="library-language-badge">${v.language}</div>
                </div>
                <div class="library-info">
                    <div class="library-code">${v.code}</div>
                    <div class="library-name">${v.name}</div>
                    <div class="library-meta">
                        <span class="library-status ${v.status}">${v.status === 'available' ? 'Γ£ô Available' : 'Γ¼ç Download'}</span>
                        <button class="library-action" onclick="event.stopPropagation(); app.readVersion('${v.code}')">Read</button>
                    </div>
                    ${v.status === 'offline' ? `
                        <div class="library-progress">
                            <div class="library-progress-bar" style="width: ${v.progress}%"></div>
                        </div>
                        <div class="library-progress-text">${v.progress}% downloaded</div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    selectVersionFromLibrary(code, name) {
        // Find first empty slot
        const emptySlot = this.selectedVersions.findIndex(v => v === null);
        if (emptySlot !== -1) {
            this.setVersion(emptySlot + 1, code, name);
            this.showNotification(`${code} added to slot ${emptySlot + 1}`, 'success');
        } else {
            this.showNotification('All slots full. Clear a slot first.', 'warning');
        }
    }

    readVersion(code) {
        this.showNotification(`Opening ${code} for reading...`, 'info');
        // Would open full Bible reader
    }

    // Library Toggle
    toggleLibrary() {
        const librarySection = document.getElementById('librarySection');
        const libraryTrigger = document.getElementById('libraryTrigger');
        const libraryArrow = document.getElementById('libraryArrow');
        
        if (librarySection.style.display === 'none') {
            librarySection.style.display = 'block';
            libraryTrigger.classList.add('active');
            libraryArrow.textContent = 'Γû▓';
            // Scroll to library after a brief delay for animation
            setTimeout(() => {
                librarySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } else {
            librarySection.style.display = 'none';
            libraryTrigger.classList.remove('active');
            libraryArrow.textContent = 'Γû╝';
        }
    }

    // Individual Result Actions
    goToNextVerse(reference) {
        const parsed = this.parseVerseReference(reference);
        if (parsed && parsed.verse) {
            const nextReference = `${parsed.book} ${parsed.chapter}:${parsed.verse + 1}`;
            document.getElementById('searchInput').value = nextReference;
            this.performSearch();
            this.showNotification(`Loading ${nextReference}...`, 'info');
        } else if (parsed) {
            // If no verse number, go to next chapter
            const nextReference = `${parsed.book} ${parsed.chapter + 1}:1`;
            document.getElementById('searchInput').value = nextReference;
            this.performSearch();
            this.showNotification(`Loading ${nextReference}...`, 'info');
        }
    }

    // Toggle Visual Area in Result Card
    toggleVisualInCard(versionCode, reference, type) {
        const cardId = `card-${versionCode}-${reference.replace(/\s+/g, '-')}`;
        const visualAreaId = `visual-area-${versionCode}-${reference.replace(/\s+/g, '-')}`;
        const visualArea = document.getElementById(visualAreaId);
        
        if (!visualArea) return;
        
        if (visualArea.style.display === 'none') {
            visualArea.style.display = 'block';
            
            // Update content based on type
            if (type === 'image') {
                this.showNotification(`Loading historical image for ${reference}...`, 'info');
                visualArea.innerHTML = `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="text-align: center; padding: 20px; background: rgba(26, 77, 48, 0.4); border-radius: 12px; border: 1px solid #4a8c6a;">
                            <div style="font-size: 3rem; margin-bottom: 10px;">≡ƒû╝∩╕Å</div>
                            <p style="color: #ffffff; font-size: 1rem; margin: 0; font-weight: 600;">Historical Artwork</p>
                            <p style="color: #ffffff; font-size: 0.85rem; margin-top: 8px;">${reference}</p>
                            <p style="color: #a8d5ba; font-size: 0.75rem; margin-top: 10px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 6px;">Bible imagery API connection needed</p>
                        </div>
                        <div style="text-align: center; padding: 20px; background: rgba(26, 77, 48, 0.2); border-radius: 12px; border: 1px dashed #4a8c6a;">
                            <div style="font-size: 2.5rem; margin-bottom: 10px; opacity: 0.7;">≡ƒô£</div>
                            <p style="color: #ffffff; font-size: 0.9rem; margin: 0;">Related Manuscripts</p>
                            <p style="color: #a8d5ba; font-size: 0.75rem; margin-top: 8px;">Ancient texts & parchments</p>
                        </div>
                    </div>
                `;
            } else if (type === 'illustrate') {
                this.showNotification(`Generating AI art for ${reference}...`, 'info');
                visualArea.innerHTML = `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, rgba(212,175,55,0.15), rgba(26,77,48,0.3)); border-radius: 12px; border: 1px solid rgba(212,175,55,0.4);">
                            <div style="font-size: 3rem; margin-bottom: 10px;">≡ƒÄ¿</div>
                            <p style="color: #ffffff; font-size: 1rem; margin: 0; font-weight: 600;">AI Creative Art</p>
                            <p style="color: #ffffff; font-size: 0.85rem; margin-top: 8px;">${reference}</p>
                            <p style="color: #d4af37; font-size: 0.75rem; margin-top: 10px; padding: 8px; background: rgba(212,175,55,0.1); border-radius: 6px;">Γ£¿ DALL-E/Midjourney/Stable Diffusion API</p>
                        </div>
                        <div style="text-align: center; padding: 20px; background: rgba(26, 77, 48, 0.2); border-radius: 12px; border: 1px dashed #4a8c6a;">
                            <div style="font-size: 2.5rem; margin-bottom: 10px; opacity: 0.7;">Γ£¿</div>
                            <p style="color: #ffffff; font-size: 0.9rem; margin: 0;">Style Options</p>
                            <p style="color: #a8d5ba; font-size: 0.75rem; margin-top: 8px;">Renaissance ΓÇó Modern ΓÇó Abstract</p>
                        </div>
                    </div>
                `;
            }
        } else {
            visualArea.style.display = 'none';
        }
    }

    showVerseImage(reference) {
        // Legacy method - now handled by toggleVisualInCard
        this.showNotification(`Use the Image button in the verse card for ${reference}`, 'info');
    }

    illustrateVerse(reference) {
        // Legacy method - now handled by toggleVisualInCard
        this.showNotification(`Use the AI Art button in the verse card for ${reference}`, 'info');
    }

    // Navigation Tabs
    showView(view) {
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        event.target.classList.add('active');
        
        // Scroll to relevant section
        const sections = {
            'search': '.search-section',
            'read': '.version-section',
            'compare': '.comparison-section',
            'bookmarks': '.search-section'
        };
        
        const section = document.querySelector(sections[view]);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Notifications
    showNotification(message, type = 'info') {
        const colors = {
            success: '#40916c',
            warning: '#f39c12',
            error: '#e74c3c',
            info: '#3498db'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 30px;
            background: ${colors[type]};
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-weight: 500;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Global app instance
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
function goToNextVerse(reference) { app.goToNextVerse(reference); }
function showVerseImage(reference) { app.showVerseImage(reference); }
function illustrateVerse(reference) { app.illustrateVerse(reference); }
function toggleVisualInCard(versionCode, reference, type) { app.toggleVisualInCard(versionCode, reference, type); }

// Close modal on outside click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('versionModal');
    if (e.target === modal) {
        app.closeVersionModal();
    }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

console.log('≡ƒî┐ Green Bible App - Classic Edition Loaded');
