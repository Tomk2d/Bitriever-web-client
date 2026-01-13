export type DiaryContentBlock = 
  | { type: 'text'; content: string }
  | { type: 'image'; path: string };

export interface ParsedDiaryContent {
  blocks: DiaryContentBlock[];
}
