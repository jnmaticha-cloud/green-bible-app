// Bookmark Model
export interface Bookmark {
  id: string;
  userId: string;
  version: string;
  book: string;
  chapter: number;
  verse?: number;
  note?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookmarkInput {
  userId: string;
  version: string;
  book: string;
  chapter: number;
  verse?: number;
  note?: string;
  tags?: string[];
}
