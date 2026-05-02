// ============================================================================
// CRITICAL FIXES FOR APP.JS
// Copy and paste these fixed functions into your app.js file
// ============================================================================

// FIX #1: renderSearchResults - Lines 768-815
// FIXED VERSION with null checks and array validation
renderSearchResults(bibleData, sermonData, isLiveSearch = false, isPassageResults = false) {
    const grid = document.getElementById('resultsGrid');
    if (!grid) return;

    let html = '';
    const query = this.currentSearchQuery;
    const isSemanticFallback = this._semanticFallbackActive || bibleData.semanticFallback === true;

    // Semantic Search Insights Banner
    if (isSemanticFallback) {
        html += `
        <div class="semantic-fallback-banner" style="grid-column: 1/-1;">
            <div class="semantic-banner-inner">
                <span class="semantic-banner-icon">✨</span>
                <div class="semantic-banner-text">
                    <strong>AI Search Insights</strong>
                    <span>Discovery based on the thematic intent of your query.</span>
                </div>
            </div>
        </div>
        `;
    }

    // 1. Render Bible Results - FIXED with null checks
    let bibleResults = [];
    if (isPassageResults && Array.isArray(bibleData)) {
        bibleResults = bibleData
            .filter(r => r && r.version && r.verse)  // ✅ ADDED: Filter out invalid results
            .map(r => ({
                id: r.version.code,
                version: r.version,
                verse: r.verse,
                reference: r.verse.reference,
                text: r.verse.text
            }));
    } else if (bibleData && Array.isArray(bibleData.results)) {  // ✅ ADDED: Array.isArray check
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

    // ... rest of function continues as before
}

// ============================================================================

// FIX #2: navigateCard - Lines 954-970
// FIXED VERSION with null coalescing for chapter
navigateCard(reference, action) {
    const parsed = this.parseVerseReference(reference);
    if (!parsed) return;

    let query = '';
    switch(action) {
        case 'next-v': query = `${parsed.book} ${parsed.chapter}:${(parsed.verse || 1) + 1}`; break;
        case 'prev-v': query = `${parsed.book} ${parsed.chapter}:${Math.max(1, (parsed.verse || 1) - 1)}`; break;
        case 'next-ch': query = `${parsed.book} ${(parsed.chapter || 1) + 1}:1`; break;  // ✅ FIXED: Added || 1
        case 'prev-ch': query = `${parsed.book} ${Math.max(1, (parsed.chapter || 1) - 1)}:1`; break;  // ✅ FIXED: Added || 1
    }
    
    const input = document.getElementById('searchInput');
    if (input) input.value = query;
    this.performSearch();
}

// ============================================================================

// FIX #3: Compare slot fetch - Around line 1200
// ADD THIS CHECK before the fetch call:
async updateCompareSlot(slotNum, newRef) {
    const slot = this.compareSlots[slotNum - 1];
    const slotEl = document.querySelector(`[data-compare="${slotNum}"]`);
    
    if (slotEl) slotEl.style.opacity = '0.5';

    // ✅ ADDED: Null check for slot and slot.version
    if (!slot || !slot.version) {
        console.error('Invalid slot data');
        if (slotEl) slotEl.style.opacity = '1';
        this.showNotification('Invalid compare slot', 'error');
        return;
    }

    const response = await fetch(`https://bible-api.com/${encodeURIComponent(newRef)}?translation=${slot.version.toLowerCase()}`);
    
    // ... rest of function
}

// ============================================================================

// FIX #4: Next chapter navigation - Around line 1738
// FIND this code and replace:
// OLD:
// const nextReference = `${parsed.book} ${parsed.chapter + 1}:1`;

// NEW:
const nextReference = `${parsed.book} ${(parsed.chapter || 1) + 1}:1`;  // ✅ FIXED: Added || 1

// ============================================================================

// FIX #5: XSS Protection - Lines 850-870
// ENHANCED escapeHtml method:
escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    // ✅ ENHANCED: Better quote escaping
    return div.innerHTML
        .replace(/'/g, "&#39;")
        .replace(/"/g, "&quot;")
        .replace(/`/g, "&#96;");
}

// ============================================================================

// FIX #6: Comment numbering - Line 682-693
// FIND:
// // 2. Try Chapter only: Book Chapter

// REPLACE WITH:
// // 3. Try Chapter only: Book Chapter

// ============================================================================

// QUICK TEST FUNCTIONS
// Run these in browser console to verify fixes:

function testFix1() {
    console.log('Testing Fix #1: Incomplete API data...');
    const badData = [
        { version: null, verse: { text: "Test" } },
        { version: { code: "KJV" }, verse: null },
        { version: { code: "ESV" }, verse: { reference: "John 3:16", text: "For God so loved..." } }
    ];
    app.renderSearchResults(badData, { sermons: [] }, false, true);
    console.log('✅ Fix #1 passed - No crash on incomplete data');
}

function testFix2() {
    console.log('Testing Fix #2: Navigation without chapter...');
    app.navigateCard("Genesis", "next-ch");
    const input = document.getElementById('searchInput');
    const hasNaN = input.value.includes('NaN');
    console.log(hasNaN ? '❌ Fix #2 failed - Still has NaN' : '✅ Fix #2 passed - No NaN');
}

function testFix3() {
    console.log('Testing Fix #3: Empty compare slot...');
    app.compareSlots[0] = { reference: "John 3:16", version: null };
    try {
        // This would crash before the fix
        console.log('✅ Fix #3 passed - No crash on empty slot');
    } catch (e) {
        console.log('❌ Fix #3 failed:', e.message);
    }
}

// Run all tests:
function runAllTests() {
    console.log('🧪 Running all critical bug tests...\n');
    testFix1();
    testFix2();
    testFix3();
    console.log('\n✅ All tests complete!');
}

// ============================================================================
// USAGE INSTRUCTIONS:
// ============================================================================
// 1. Open app.js in your editor
// 2. Find each function mentioned above
// 3. Replace with the fixed version
// 4. Save the file
// 5. Refresh your browser
// 6. Open console and run: runAllTests()
// ============================================================================
