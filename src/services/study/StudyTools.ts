// Study Tools Service Implementation
import { StudyTools } from '../interfaces';
import {
  VerseReference,
  CrossReference,
  Commentary,
  WordStudy,
  ParallelPassage,
  TopicalStudy,
  ThematicStudy
} from '../../types';

export class StudyToolsService implements StudyTools {
  private crossReferenceData: Map<string, CrossReference[]> = new Map();
  private commentaryData: Map<string, Commentary[]> = new Map();
  private wordStudyData: Map<string, WordStudy> = new Map();
  private topicalStudyData: Map<string, TopicalStudy> = new Map();
  private thematicStudies: ThematicStudy[] = [];

  constructor() {
    this.seedCrossReferences();
    this.seedStudyResources();
  }

  async getCrossReferences(reference: VerseReference): Promise<CrossReference[]> {
    const key = this.createReferenceKey(reference);
    return this.crossReferenceData.get(key) || [];
  }

  private calculateParallelSimilarity(
    source: VerseReference,
    target: VerseReference,
    strength: number
  ): number {
    const base = Math.min(1, Math.max(0, strength / 10));
    const sameBookBonus = source.book === target.book ? 0.1 : 0;
    const sameChapterBonus = source.chapter === target.chapter ? 0.05 : 0;
    const sameVerseBonus = source.verse === target.verse ? 0.05 : 0;
    return Math.min(1, base + sameBookBonus + sameChapterBonus + sameVerseBonus);
  }

  private calculateParallelDifferences(source: VerseReference, target: VerseReference): string[] {
    const differences: string[] = [];
    if (source.book !== target.book) {
      differences.push(`Different book: ${source.book} vs ${target.book}`);
    }
    if (source.chapter !== target.chapter) {
      differences.push(`Different chapter: ${source.chapter} vs ${target.chapter}`);
    }
    if (source.verse !== target.verse) {
      differences.push(`Different verse: ${source.verse} vs ${target.verse}`);
    }
    return differences;
  }

  async getParallelPassages(_reference: VerseReference): Promise<ParallelPassage[]> {
    const refs = await this.getCrossReferences(_reference);
    return refs
      .filter(r => r.relationship === 'parallel')
      .map(r => {
        const similarity = this.calculateParallelSimilarity(_reference, r.targetReference, r.strength);
        return {
          reference: r.targetReference,
          similarity,
          differences: this.calculateParallelDifferences(_reference, r.targetReference)
        };
      });
  }

  async getCommentary(reference: VerseReference): Promise<Commentary[]> {
    const key = this.createReferenceKey(reference);
    return this.commentaryData.get(key) || [];
  }

  async getWordStudy(word: string, language: 'hebrew' | 'greek'): Promise<WordStudy> {
    const key = `${language}_${word.toLowerCase()}`;
    const study = this.wordStudyData.get(key);
    
    if (!study) {
      throw new Error(`Word study not found for ${word} in ${language}`);
    }
    
    return study;
  }

  async getTopicalReferences(topic: string): Promise<TopicalStudy> {
    const key = (topic || '').trim().toLowerCase();
    const existing = this.topicalStudyData.get(key);
    if (existing) {
      return existing;
    }

    return {
      topic,
      description: `Study on ${topic}`,
      references: [],
      keyThemes: []
    };
  }

  async getThematicStudies(): Promise<ThematicStudy[]> {
    return this.thematicStudies;
  }

  private createReferenceKey(reference: VerseReference): string {
    return `${reference.book}_${reference.chapter}_${reference.verse}`;
  }

  private seedCrossReferences(): void {
    const entries: Array<{ source: VerseReference; targets: Array<{ target: VerseReference; relationship: CrossReference['relationship']; strength: number }> }> = [
      {
        source: { book: 'John', chapter: 3, verse: 16 },
        targets: [
          { target: { book: 'Romans', chapter: 5, verse: 8 }, relationship: 'theme', strength: 9 },
          { target: { book: '1 John', chapter: 4, verse: 9 }, relationship: 'theme', strength: 8 }
        ]
      },
      {
        source: { book: 'Psalms', chapter: 23, verse: 1 },
        targets: [
          { target: { book: 'Ezekiel', chapter: 34, verse: 11 }, relationship: 'theme', strength: 7 },
          { target: { book: 'John', chapter: 10, verse: 11 }, relationship: 'theme', strength: 8 }
        ]
      },
      {
        source: { book: 'Genesis', chapter: 1, verse: 1 },
        targets: [
          { target: { book: 'John', chapter: 1, verse: 1 }, relationship: 'parallel', strength: 8 },
          { target: { book: 'Hebrews', chapter: 11, verse: 3 }, relationship: 'theme', strength: 7 }
        ]
      }
    ];

    for (const entry of entries) {
      const key = this.createReferenceKey(entry.source);
      const refs: CrossReference[] = entry.targets.map(t => ({
        sourceReference: entry.source,
        targetReference: t.target,
        relationship: t.relationship,
        strength: t.strength
      }));
      this.crossReferenceData.set(key, refs);
    }
  }

  private seedStudyResources(): void {
    const j316Key = this.createReferenceKey({ book: 'John', chapter: 3, verse: 16 });
    this.commentaryData.set(j316Key, [
      {
        reference: { book: 'John', chapter: 3, verse: 16 },
        author: 'Sample Commentary',
        text: 'This verse summarizes the gospel message: God’s love shown through the giving of His Son.',
        type: 'verse',
        source: 'Seed Data'
      }
    ]);

    const genesis11Key = this.createReferenceKey({ book: 'Genesis', chapter: 1, verse: 1 });
    this.commentaryData.set(genesis11Key, [
      {
        reference: { book: 'Genesis', chapter: 1, verse: 1 },
        author: 'Sample Commentary',
        text: 'The opening statement of Scripture affirms God as Creator and establishes the foundation for the biblical narrative.',
        type: 'verse',
        source: 'Seed Data'
      }
    ]);

    this.wordStudyData.set('greek_agape', {
      word: 'agape',
      originalLanguage: 'greek',
      transliteration: 'agápē',
      definition: 'Self-giving love; a love characterized by commitment and action.',
      usage: ['John 3:16', '1 Corinthians 13:4-7'],
      relatedVerses: [
        { book: 'John', chapter: 3, verse: 16 },
        { book: '1 Corinthians', chapter: 13, verse: 4 }
      ]
    });

    this.wordStudyData.set('hebrew_chesed', {
      word: 'chesed',
      originalLanguage: 'hebrew',
      transliteration: 'ḥé·sed',
      definition: 'Steadfast love; covenant loyalty; mercy.',
      usage: ['Psalms 136:1', 'Micah 6:8'],
      relatedVerses: [
        { book: 'Psalms', chapter: 136, verse: 1 },
        { book: 'Micah', chapter: 6, verse: 8 }
      ]
    });

    this.topicalStudyData.set('love', {
      topic: 'Love',
      description: 'A study of God’s love and the call to love others.',
      references: [
        { book: 'John', chapter: 3, verse: 16 },
        { book: '1 John', chapter: 4, verse: 8 }
      ],
      keyThemes: ['God’s love', 'Sacrifice', 'Love one another']
    });

    this.thematicStudies = [
      {
        id: 'creation',
        title: 'Creation',
        description: 'Key passages on God as Creator and the doctrine of creation.',
        passages: [
          { book: 'Genesis', chapter: 1, verse: 1 },
          { book: 'John', chapter: 1, verse: 3 }
        ],
        studyGuide: 'Read the passages and note the attributes of God emphasized in each.'
      }
    ];
  }
}