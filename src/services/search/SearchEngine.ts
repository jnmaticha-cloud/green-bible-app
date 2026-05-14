// Search Engine Service Implementation
import { SearchEngine } from '../interfaces';
import {
  SearchOptions,
  SearchResult,
  SearchFilters,
  Verse,
  BibleContent
} from '../../types';

import { parseReference } from '../content/ReferenceParser';

export class SearchEngineService implements SearchEngine {
  private searchIndex: Map<string, Set<string>> = new Map();
  private contentCache: Map<string, BibleContent> = new Map();
  private verseIndex: Map<
    string,
    {
      verse: Verse;
      normalizedText: string;
      testament?: 'OT' | 'NT';
      versionId: string;
    }
  > = new Map();
  private termFrequency: Map<string, number> = new Map();

  async searchText(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const normalizedQuery = (query || '').trim();
    if (!normalizedQuery) {
      return [];
    }

    const versionIds = options?.versions?.map(v => v.id);
    const candidates = this.getCandidates(normalizedQuery, options?.exactPhrase === true);
    const filtered = this.filterCandidateIds(candidates, {
      ...(versionIds ? { versions: versionIds } : {}),
      ...(options?.books ? { books: options.books } : {}),
      ...(options?.testament ? { testament: options.testament } : {})
    });

    const results = filtered
      .map(id => this.toSearchResult(id, normalizedQuery))
      .filter((r): r is SearchResult => r !== null)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, options?.maxResults ?? 50);

    return results;
  }

  async searchByReference(reference: string): Promise<Verse[]> {
    const parsed = parseReference(reference);
    if (!parsed) {
      return [];
    }

    const results: Verse[] = [];
    for (const entry of this.verseIndex.values()) {
      const ref = entry.verse.reference;
      if (ref.book === parsed.book && ref.chapter === parsed.chapter && ref.verse === parsed.verse) {
        results.push(entry.verse);
      }
    }
    return results;
  }

  async getSearchSuggestions(partialQuery: string): Promise<string[]> {
    const normalizedPartialQuery = (partialQuery || '').trim().toLowerCase();
    if (!normalizedPartialQuery) {
      return [];
    }

    return [...this.termFrequency.entries()]
      .filter(([term]) => term.startsWith(normalizedPartialQuery))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term]) => term);
  }

  async searchWithFilters(query: string, filters: SearchFilters): Promise<SearchResult[]> {
    const normalizedQuery = (query || '').trim();
    if (!normalizedQuery) {
      return [];
    }

    const candidates = this.getCandidates(normalizedQuery, false);
    const filtered = this.filterCandidateIds(candidates, {
      ...(filters.versions ? { versions: filters.versions } : {}),
      ...(filters.books ? { books: filters.books } : {}),
      ...(filters.testament ? { testament: filters.testament } : {})
    });

    return filtered
      .map(id => this.toSearchResult(id, normalizedQuery))
      .filter((r): r is SearchResult => r !== null)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  async indexContent(content: BibleContent): Promise<void> {
    const key = `${content.version.id}_${content.metadata.checksum}`;
    this.contentCache.set(key, content);

    for (const book of content.books) {
      for (const chapter of book.chapters) {
        for (const verse of chapter.verses) {
          const id = this.makeVerseId(content.version.id, verse);
          const normalizedText = this.normalizeText(verse.text);
          this.verseIndex.set(id, {
            verse,
            normalizedText,
            testament: book.testament,
            versionId: content.version.id
          });

          const terms = this.tokenize(normalizedText);
          for (const term of terms) {
            if (!term) continue;
            const set = this.searchIndex.get(term);
            if (set) {
              set.add(id);
            } else {
              this.searchIndex.set(term, new Set([id]));
            }
            this.termFrequency.set(term, (this.termFrequency.get(term) ?? 0) + 1);
          }
        }
      }
    }
  }

  async clearSearchIndex(): Promise<void> {
    this.searchIndex.clear();
    this.contentCache.clear();
    this.verseIndex.clear();
    this.termFrequency.clear();
  }

  private makeVerseId(versionId: string, verse: Verse): string {
    const r = verse.reference;
    return `${versionId}|${r.book}|${r.chapter}|${r.verse}`;
  }

  private normalizeText(text: string): string {
    return (text || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s']/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(normalizedText: string): string[] {
    if (!normalizedText) {
      return [];
    }
    return normalizedText
      .split(' ')
      .map(t => t.trim())
      .filter(t => t.length > 1);
  }

  private getCandidates(query: string, exactPhrase: boolean): Set<string> {
    const normalizedQuery = this.normalizeText(query);
    const phrase = this.extractQuotedPhrase(query);

    if (exactPhrase && phrase) {
      const normalizedPhrase = this.normalizeText(phrase);
      const ids = new Set<string>();
      for (const [id, entry] of this.verseIndex.entries()) {
        if (entry.normalizedText.includes(normalizedPhrase)) {
          ids.add(id);
        }
      }
      return ids;
    }

    const terms = this.tokenize(normalizedQuery);
    if (terms.length === 0) {
      return new Set();
    }

    let result: Set<string> | null = null;
    for (const term of terms) {
      const set = this.searchIndex.get(term);
      if (!set) {
        return new Set();
      }
      if (!result) {
        result = new Set(set);
      } else {
        for (const id of [...result]) {
          if (!set.has(id)) {
            result.delete(id);
          }
        }
      }
    }
    return result ?? new Set();
  }

  private filterCandidateIds(
    candidates: Set<string>,
    filters: { versions?: string[]; books?: string[]; testament?: 'OT' | 'NT' }
  ): string[] {
    const versionSet = filters.versions ? new Set(filters.versions) : null;
    const bookSet = filters.books ? new Set(filters.books) : null;
    const testament = filters.testament;

    const results: string[] = [];
    for (const id of candidates) {
      const entry = this.verseIndex.get(id);
      if (!entry) continue;

      if (versionSet && !versionSet.has(entry.versionId)) continue;
      if (bookSet && !bookSet.has(entry.verse.reference.book)) continue;
      if (testament && entry.testament && entry.testament !== testament) continue;

      results.push(id);
    }
    return results;
  }

  private toSearchResult(id: string, query: string): SearchResult | null {
    const entry = this.verseIndex.get(id);
    if (!entry) {
      return null;
    }

    const normalizedQuery = this.normalizeText(query);
    const terms = this.tokenize(normalizedQuery);
    const phrase = this.extractQuotedPhrase(query);
    const normalizedPhrase = phrase ? this.normalizeText(phrase) : null;

    const totalDocs = Math.max(this.verseIndex.size, 1);

    let score = 0;
    if (normalizedPhrase && entry.normalizedText.includes(normalizedPhrase)) {
      score += 10;
    }

    for (const term of terms) {
      const df = this.searchIndex.get(term)?.size ?? 0;
      const idf = Math.log((totalDocs + 1) / (df + 1)) + 1;
      const tf = this.countOccurrences(entry.normalizedText, term);
      score += tf * idf;
    }

    const highlightedText = this.highlightText(entry.verse.text, query);

    return {
      verse: entry.verse,
      relevanceScore: score,
      highlightedText,
      context: entry.verse.text
    };
  }

  private countOccurrences(haystack: string, needle: string): number {
    if (!haystack || !needle) return 0;
    const pattern = new RegExp(`\\b${this.escapeRegExp(needle)}\\b`, 'g');
    const matches = haystack.match(pattern);
    return matches ? matches.length : 0;
  }

  private extractQuotedPhrase(query: string): string | null {
    const m = query.match(/"([^"]+)"/);
    return m && m[1] ? m[1] : null;
  }

  private highlightText(text: string, query: string): string {
    const phrase = this.extractQuotedPhrase(query);
    if (phrase) {
      const re = new RegExp(this.escapeRegExp(phrase), 'gi');
      return text.replace(re, match => `<mark>${match}</mark>`);
    }

    const normalizedQuery = this.normalizeText(query);
    const terms = this.tokenize(normalizedQuery);
    if (terms.length === 0) {
      return text;
    }

    let result = text;
    for (const term of terms) {
      const re = new RegExp(`\\b${this.escapeRegExp(term)}\\b`, 'gi');
      result = result.replace(re, match => `<mark>${match}</mark>`);
    }
    return result;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}