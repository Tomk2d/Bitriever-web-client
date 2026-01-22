import type { DiaryContentBlock, ParsedDiaryContent } from '../types';

/**
 * content JSONB를 마커 텍스트 형식으로 변환
 * blocks 배열을 순회하며 text 블록은 그대로, image 블록은 [image]{filename} 형식으로 변환
 * 사용자가 입력한 공백 줄을 정확히 유지 (추가/제거하지 않음)
 */
export function parseContentToText(content: string | null | undefined): string {
  if (!content) return '';
  
  try {
    const parsed: ParsedDiaryContent = JSON.parse(content);
    if (!parsed.blocks || !Array.isArray(parsed.blocks)) {
      return content;
    }
    
    // 각 블록을 순서대로 연결 (사용자가 입력한 그대로 복원)
    return parsed.blocks.map((block: DiaryContentBlock) => {
      if (block.type === 'text') {
        return block.content || '';
      } else if (block.type === 'image' && block.path) {
        // @diaryImage/{diaryId}/{filename} 형식에서 filename 추출
        const filename = block.path.split('/').pop() || '';
        return `[image]{${filename}}`;
      }
      return '';
    }).join('');
  } catch {
    // JSON이 아니면 그대로 사용
    return content;
  }
}

/**
 * 텍스트 블록의 줄바꿈을 정규화
 * - 내부: 연속된 \n을 최대 2개로 제한 (먼저 처리)
 * - 시작점: 여러 개의 \n을 1개로 제한
 * - 끝점: 여러 개의 \n을 1개로 제한
 */
function normalizeTextBlockNewlines(text: string): string {
  if (!text) return text;
  
  // 먼저 내부의 연속된 \n을 최대 2개로 제한 (3개 이상이면 2개로)
  let normalized = text.replace(/\n{3,}/g, '\n\n');
  
  // 시작점의 연속된 \n을 1개로 제한
  normalized = normalized.replace(/^\n+/, '\n');
  
  // 끝점의 연속된 \n을 1개로 제한
  normalized = normalized.replace(/\n+$/, '\n');
  
  return normalized;
}

/**
 * 마커 텍스트를 blocks 배열로 변환
 * [image]{filename} 패턴을 찾아서 image 블록으로 변환
 * 각 텍스트 블록의 줄바꿈을 정규화 (시작/끝 1개, 내부 최대 2개)
 */
export function textToContentBlocks(text: string, diaryId: number): ParsedDiaryContent {
  if (!text) {
    return { blocks: [] };
  }
  
  const blocks: DiaryContentBlock[] = [];
  const imageMarkerRegex = /\[image\]\{([^}]+)\}/g;
  let lastIndex = 0;
  let match;
  
  while ((match = imageMarkerRegex.exec(text)) !== null) {
    // 마커 이전의 텍스트가 있으면 text 블록으로 추가
    if (match.index > lastIndex) {
      const textContent = text.substring(lastIndex, match.index);
      // 앞뒤 공백(스페이스, 탭)만 제거하고 줄바꿈은 그대로 유지
      const trimmedContent = textContent.replace(/^[ \t]+|[ \t]+$/gm, '');
      // 내용이 있거나 줄바꿈이 있으면 저장 (공백 줄도 유지)
      if (trimmedContent.length > 0 || textContent.includes('\n')) {
        // trimmedContent가 비어있어도 원본에 줄바꿈이 있으면 원본 사용
        const finalContent = trimmedContent.length > 0 ? trimmedContent : textContent;
        // 줄바꿈 정규화 적용
        blocks.push({ type: 'text', content: normalizeTextBlockNewlines(finalContent) });
      }
    }
    
    // image 블록 추가
    const filename = match[1];
    const imagePath = `@diaryImage/${diaryId}/${filename}`;
    blocks.push({ type: 'image', path: imagePath });
    
    lastIndex = match.index + match[0].length;
  }
  
  // 마지막 마커 이후의 텍스트가 있으면 text 블록으로 추가
  if (lastIndex < text.length) {
    const textContent = text.substring(lastIndex);
    // 앞뒤 공백(스페이스, 탭)만 제거하고 줄바꿈은 그대로 유지
    const trimmedContent = textContent.replace(/^[ \t]+|[ \t]+$/gm, '');
    // 내용이 있거나 줄바꿈이 있으면 저장 (공백 줄도 유지)
    if (trimmedContent.length > 0 || textContent.includes('\n')) {
      // trimmedContent가 비어있어도 원본에 줄바꿈이 있으면 원본 사용
      const finalContent = trimmedContent.length > 0 ? trimmedContent : textContent;
      // 줄바꿈 정규화 적용
      blocks.push({ type: 'text', content: normalizeTextBlockNewlines(finalContent) });
    }
  }
  
  // 블록이 없으면 전체 텍스트를 하나의 text 블록으로 (공백만 있어도 저장)
  if (blocks.length === 0 && text.length > 0) {
    // 앞뒤 공백(스페이스, 탭)만 제거하고 줄바꿈은 그대로 유지
    const trimmedText = text.replace(/^[ \t]+|[ \t]+$/gm, '');
    // 내용이 있거나 줄바꿈이 있으면 저장
    if (trimmedText.length > 0 || text.includes('\n')) {
      const finalContent = trimmedText.length > 0 ? trimmedText : text;
      // 줄바꿈 정규화 적용
      blocks.push({ type: 'text', content: normalizeTextBlockNewlines(finalContent) });
    }
  }
  
  return { blocks };
}

/**
 * 텍스트에서 이미지 마커 추출
 * [image]{filename} 패턴에서 filename 추출
 */
export function extractImageFilenames(text: string): string[] {
  const filenames: string[] = [];
  const imageMarkerRegex = /\[image\]\{([^}]+)\}/g;
  let match;
  
  while ((match = imageMarkerRegex.exec(text)) !== null) {
    filenames.push(match[1]);
  }
  
  return filenames;
}
