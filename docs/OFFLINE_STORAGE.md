# Offline Storage Documentation

## Overview
The Green Bible App supports offline storage for Bible content and user data.

## Storage Mechanisms

### Service Worker Cache
- Static assets (HTML, CSS, JS)
- Bible text data
- User bookmarks

### IndexedDB
- Search indexes
- User preferences
- Reading history

### LocalStorage
- Authentication tokens
- UI state
- Cached verses (recent)

## Sync Strategy

### Online to Offline
1. Cache frequently accessed content
2. Pre-download selected Bible versions
3. Background sync of bookmarks

### Offline to Online
1. Queue user actions
2. Sync on connection restore
3. Conflict resolution (last-write-wins)

## Storage Quotas
- Estimated usage: ~50MB per Bible version
- Recommended: Download 2-3 versions max

## Implementation
```javascript
// Check storage availability
if ('serviceWorker' in navigator) {
  // Register offline cache
}

if ('indexedDB' in window) {
  // Use IndexedDB for search
}
```
