// Commentary File Format Schema
export interface CommentaryEntry {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  author: string;
  source: string;
}

export interface CommentaryFile {
  version: string;
  author: string;
  entries: CommentaryEntry[];
}

export const validateCommentary = (data: any): data is CommentaryFile => {
  return (
    typeof data.version === 'string' &&
    typeof data.author === 'string' &&
    Array.isArray(data.entries)
  );
};
