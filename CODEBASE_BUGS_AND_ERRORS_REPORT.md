# Codebase Bugs and Errors Report

## Critical Issues

### 1. CSS Syntax Error in index.html (Lines 1994-2002)
**Severity:** HIGH  
**Location:** `index.html` lines 1994-2002

**Issue:** Missing CSS selector before property declarations
```css
/* Line 1993 - End of .sermon-card-playing::after */
}
    background: var(--bg-card);  /* ❌ No selector! */
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: 20px;
    cursor: pointer;
    transition: all var(--transition-base);
    position: relative;
    overflow: hidden;
}
```

**Fix:** Add the missing `.related-card` selector:
```css
}

.related-card {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: 20px;
    cursor: pointer;
    transition: all var(--transition-base);
    position: relative;
    overflow: hidden;
}
```

**Impact:** CSS parsing errors, potential styling issues for related cards

---

## TypeScript Type Errors

### 2. Unknown Type 'data' in src/routes/api/bibles.ts
**Severity:** MEDIUM  
**Location:** Multiple locations in `src/routes/api/bibles.ts`

**Issues:**
- Lines 565, 615, 1118, 1199: `'data' is of type 'unknown'`
- Lines 1151-1152: `'textData' is of type 'unknown'`

**Fix:** Add proper type assertions or type guards:
```typescript
// Before
const verse = data.verses[0];

// After
const verse = (data as BibleApiResponse).verses[0];
// OR
if (typeof data === 'object' && data !== null && 'verses' in data) {
    const verse = data.verses[0];
}
```

### 3. Missing Return Statements
**Severity:** MEDIUM  
**Locations:**
- `src/routes/api/bibles.ts:889` - Function may not return a value
- `src/routes/api/bibles.ts:979` - Function may not return a value
- `src/routes/api/bibles.ts:1090` - Function may not return a value
- `src/routes/commentary.ts:39` - Function may not return a value

**Fix:** Ensure all code paths return a value or add explicit return statements:
```typescript
// Add at end of function
return undefined; // or appropriate default value
```

### 4. Unused Variables
**Severity:** LOW  
**Locations:**
- `src/database/connection.ts:23` - 'params' is declared but never used
- `src/index.ts:11` - 'config' is declared but never used
- `src/routes/api/bibles.ts:848` - 'chapterNum' is declared but never used
- `src/routes/api/sermons.ts:11` - 'req' is declared but never used
- `src/routes/auth.ts:6,10,14` - 'req' is declared but never used (3 instances)
- `src/routes/bookmarks.ts:6,10,14` - 'req' is declared but never used (3 instances)

**Fix:** Remove unused variables or prefix with underscore:
```typescript
// Before
router.get('/login', async (req, res) => {

// After
router.get('/login', async (_req, res) => {
```

---

## Potential Runtime Issues in app.js

### 5. Null Reference Risks
**Severity:** MEDIUM  
**Location:** Multiple locations in `app.js`

**Issues:** Many `getElementById` and `querySelector` calls without null checks

**Examples:**
```javascript
// Line 452 - No null check
document.getElementById('searchInput').value = query;

// Line 497-499 - No null checks
document.getElementById('resultsSection').classList.add('active');
document.getElementById('topicsSection').style.display = 'none';
document.getElementById('interpretationSection').style.display = 'block';

// Line 798 - Inline onclick without null check
onclick="document.getElementById('searchInput').value=''; app.performSearch()"

// Line 1043 - No null check
document.getElementById('searchInput').value = query;
```

**Fix:** Add null checks:
```javascript
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.value = query;
}
```

### 6. Missing Error Handling in Async Functions
**Severity:** MEDIUM  
**Location:** Various async functions in `app.js`

**Issue:** Some async functions don't have try-catch blocks

**Example from line 1123:**
```javascript
async loadInterpretation(reference) {
    // ... code ...
    const response = await fetch(`/api/commentary?ref=${encodeURIComponent(reference)}`);
    const data = await response.json();
    // ❌ No error handling if fetch fails
}
```

**Fix:** Already has catch block, but ensure all async operations are wrapped

---

## CSS Warnings in index.html

### 7. Unknown CSS Property 'composes'
**Severity:** LOW  
**Locations:** Lines 314, 346, 914, 1082, 1178, 1293, 1433, 1495

**Issue:** CSS property 'composes' is not standard CSS (it's from CSS Modules)

**Fix:** If not using CSS Modules, remove or replace with standard CSS:
```css
/* Before */
.class-name {
    composes: other-class;
}

/* After - Use standard CSS */
.class-name {
    /* Copy properties from other-class or use multiple classes in HTML */
}
```

---

## Recommendations

### High Priority
1. ✅ Fix CSS syntax error in index.html (line 1994)
2. ✅ Add type assertions for 'unknown' types in bibles.ts
3. ✅ Add return statements to functions with missing returns
4. ✅ Add null checks for DOM element access in app.js

### Medium Priority
5. ✅ Remove or prefix unused variables with underscore
6. ✅ Review and enhance error handling in async functions
7. ✅ Fix 'composes' CSS property usage

### Low Priority
8. ✅ Code cleanup and refactoring for better maintainability
9. ✅ Add JSDoc comments for better documentation
10. ✅ Consider migrating to TypeScript for better type safety

---

## Testing Recommendations

1. **Unit Tests:** Add tests for functions with missing return statements
2. **Integration Tests:** Test API endpoints with various input types
3. **E2E Tests:** Test UI interactions with missing DOM elements
4. **Type Coverage:** Run `tsc --noEmit` regularly in CI/CD pipeline

---

## Summary

**Total Issues Found:** 7 categories
- **Critical:** 1 (CSS syntax error)
- **High:** 0
- **Medium:** 4 (Type errors, missing returns, null references, error handling)
- **Low:** 2 (Unused variables, CSS warnings)

**Estimated Fix Time:**
- Critical issues: 30 minutes
- Medium issues: 2-3 hours
- Low issues: 1 hour

**Total:** ~4 hours for complete resolution
