# API Versioning and Bulk Operations

## Overview
This document describes the API versioning strategy and bulk operations support.

## API Versioning

### Current Version
- Version: v1
- Base Path: `/api/v1`

### Version Header
Clients can specify API version via:
- URL path: `/api/v1/endpoint`
- Header: `X-API-Version: v1`

## Bulk Operations

### Supported Operations
1. **Bulk Bookmark Creation**
   - Endpoint: `POST /api/v1/bookmarks/bulk`
   - Max items: 100 per request

2. **Bulk Search**
   - Endpoint: `POST /api/v1/search/bulk`
   - Supports multiple versions in single query

### Rate Limiting
- Bulk endpoints have stricter rate limits
- Default: 10 requests per minute

## Response Format
```json
{
  "version": "v1",
  "data": {},
  "meta": {
    "total": 0,
    "page": 1,
    "per_page": 20
  }
}
```
