'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type { TradingHistoryResponse } from '@/features/trading/services/tradingHistoryService';
import { formatCurrency, formatQuantity } from '@/features/asset/utils/assetCalculations';
import { diaryService, type DiaryResponse } from '@/features/diary/services/diaryService';
import { parseContentToText, textToContentBlocks } from '@/features/diary/utils/contentParser';
import { authenticatedFetch } from '@/lib/authenticatedFetch';
import { requestTradeEvaluationWithPolling } from '@/features/tradeEvaluation/services/tradeEvaluationService';
import type { TradeEvaluationStatusResponse } from '@/features/tradeEvaluation/types';
import type { ParsedDiaryContent } from '@/features/diary/types';
import CoinPriceLineChart from '@/shared/components/charts/CoinPriceLineChart';
import CoinPriceCandleChart from '@/shared/components/charts/CoinPriceCandleChart';
import './IndividualTradingHistoryPanel.css';

interface IndividualTradingHistoryPanelProps {
  tradingHistory: TradingHistoryResponse | null;
  onClose: () => void;
  /** 다른 매매일지에서 분석 진행 중이면 true → AI 분석 버튼 비활성화 */
  isAnalysisInProgress?: boolean;
  /** 분석 시작/종료 시 호출 (전역에서 한 번에 하나만 진행되도록) */
  onAnalysisProgressChange?: (inProgress: boolean) => void;
  /** 분석 완료 시 결과 전달 (우측 결과 패널 렌더링용) */
  onAnalysisResult?: (data: TradeEvaluationStatusResponse) => void;
}

// exchangeCode를 거래소 이름으로 변환하는 함수
const getExchangeName = (exchangeCode: number | undefined): string => {
  if (!exchangeCode) return '-';
  const exchangeMap: Record<number, string> = {
    1: 'UPBIT',
    2: 'BITHUMB',
    3: 'COINONE',
    11: 'BINANCE',
    12: 'BYBIT',
    13: 'COINBASE',
    14: 'OKX',
  };
  return exchangeMap[exchangeCode] || '-';
};

export interface IndividualTradingHistoryPanelRef {
  hasUnsavedChanges: () => boolean;
  handleSave: () => Promise<void>;
}

const IndividualTradingHistoryPanel = forwardRef<IndividualTradingHistoryPanelRef, IndividualTradingHistoryPanelProps>(({
  tradingHistory,
  onClose: originalOnClose,
  isAnalysisInProgress = false,
  onAnalysisProgressChange,
  onAnalysisResult,
}, ref) => {
  if (!tradingHistory) {
    return null;
  }

  const coin = tradingHistory.coin;
  const isBuy = tradingHistory.tradeType === 0;
  const koreanName = coin?.koreanName || coin?.symbol || `코인 ${tradingHistory.coinId}`;
  const marketCode = coin?.marketCode || '-';
  
  // 이미지 URL 구성 (public 폴더는 루트 경로로 제공됨)
  const imageBasePath = process.env.NEXT_PUBLIC_IMAGE_BASE_PATH || '';
  const imageUrl = coin?.imgUrl ? `${imageBasePath}${coin.imgUrl}` : null;
  
  // 시간 정보 포맷팅 (오전/오후 형식)
  const formatTradeTime = (timeString: string): string => {
    const date = new Date(timeString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    
    const isAM = hours < 12;
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = isAM ? '오전' : '오후';
    
    return `${ampm} ${displayHours}시 ${minutes}분 ${seconds}초`;
  };
  
  // 매도시 실제 득실 금액 계산
  const calculateProfitLoss = (): number | null => {
    if (isBuy || !tradingHistory.avgBuyPrice) {
      return null;
    }
    const sellAmount = tradingHistory.price * tradingHistory.quantity;
    const buyAmount = tradingHistory.avgBuyPrice * tradingHistory.quantity;
    return sellAmount - buyAmount;
  };
  
  const profitLoss = calculateProfitLoss();
  const profitLossRate = tradingHistory.profitLossRate ?? 0;

  // 매매일지 데이터
  const [diary, setDiary] = useState<DiaryResponse | null>(null);
  const [isLoadingDiary, setIsLoadingDiary] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formTradingMind, setFormTradingMind] = useState<number | null>(null);
  const [formContent, setFormContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');
  const textareaRef = useRef<HTMLDivElement>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  // 임시 이미지 파일 저장 (일지 생성 후 즉시 업로드)
  const [pendingImages, setPendingImages] = useState<Map<string, File>>(new Map()); // key: 임시 ID, value: File 객체
  // 삭제할 이미지 목록 저장 (저장 버튼 클릭 시 일괄 삭제)
  const [pendingDeletions, setPendingDeletions] = useState<Set<string>>(new Set()); // 삭제할 filename 목록
  // 편집 모드 진입 시 원본 데이터 저장 (변경사항 감지용)
  const originalDataRef = useRef<{ content: string; tradingMind: number | null } | null>(null);

  // tradingMind를 한국어로 변환
  const getTradingMindText = (mindCode: number | null | undefined): string => {
    if (mindCode === null || mindCode === undefined) return '';
    
    const mindMap: Record<number, string> = {
      0: '무념무상',
      1: '확신',
      2: '약간 확신',
      3: '기대감',
      11: '욕심',
      12: '조급함',
      13: '불안',
      14: '두려움',
    };
    
    return mindMap[mindCode] || '';
  };

  // tradingMind에 따른 색상 반환
  const getTradingMindColor = (mindCode: number | null | undefined): string => {
    if (mindCode === null || mindCode === undefined) return '';
    
    const colorMap: Record<number, string> = {
      0: '#6b7280', // 무념무상 - 회색
      1: '#10b981', // 확신 - 초록색
      2: '#84cc16', // 약간 확신 - 연두색
      3: '#3b82f6', // 기대감 - 파란색
      11: '#f59e0b', // 욕심 - 주황색
      12: '#ef4444', // 조급함 - 빨간색
      13: '#8b5cf6', // 불안 - 보라색
      14: '#6366f1', // 두려움 - 인디고
    };
    
    return colorMap[mindCode] || '';
  };


  // tradingHistory 변경 시 변경사항 확인 및 정리
  const prevTradingHistoryIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevTradingHistoryIdRef.current !== null && 
        prevTradingHistoryIdRef.current !== tradingHistory?.id) {
      // 다른 매매일지로 변경될 때 편집 모드 종료 및 임시 데이터 정리
      if (isEditMode) {
        setIsEditMode(false);
        setPendingImages(new Map());
        setPendingDeletions(new Set());
        originalDataRef.current = null;
      }
    }
    prevTradingHistoryIdRef.current = tradingHistory?.id ?? null;
  }, [tradingHistory?.id, isEditMode]);

  // 매매일지 데이터 가져오기
  useEffect(() => {
    if (!tradingHistory?.id) {
      setDiary(null);
      return;
    }

    setIsLoadingDiary(true);
    diaryService.getByTradingHistoryId(tradingHistory.id)
      .then((data) => {
        setDiary(data);
        if (data) {
          setFormTradingMind(data.tradingMind ?? null);
          // content가 JSON 형식이면 파싱해서 텍스트로 변환
          const contentText = parseContentToText(data.content);
          setFormContent(contentText);
        } else {
          setFormTradingMind(null);
          setFormContent('');
        }
        // 편집 모드가 아니면 원본 데이터 초기화
        if (!isEditMode) {
          originalDataRef.current = null;
        }
      })
      .catch((error) => {
        console.error('[IndividualTradingHistoryPanel] 매매일지 조회 실패:', error);
        setDiary(null);
        setFormTradingMind(null);
        setFormContent('');
      })
      .finally(() => {
        setIsLoadingDiary(false);
      });
  }, [tradingHistory?.id]);

  // 이미지 로드
  useEffect(() => {
    if (!diary?.content) {
      return;
    }

    try {
      const parsed: ParsedDiaryContent = JSON.parse(diary.content);
      if (!parsed.blocks) return;

      const loadImages = async () => {
        for (const block of parsed.blocks) {
          if (block.type === 'image' && block.path) {
            const filename = block.path.split('/').pop() || '';
            const imageKey = `${diary.id}_${filename}`;
            
            if (!imageUrls[imageKey]) {
              try {
                const imageUrl = diaryService.getImageUrl(diary.id, filename);
                const response = await authenticatedFetch(imageUrl);
                
                if (response.ok) {
                  const blob = await response.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  setImageUrls(prev => ({ ...prev, [imageKey]: blobUrl }));
                }
              } catch (error) {
                // 에러 발생 시 무시
              }
            }
          }
        }
      };

      loadImages();
    } catch (e) {
      // JSON 파싱 실패 시 무시
    }
  }, [diary?.id, diary?.content]);

  // 컴포넌트 언마운트 시 blob URL 정리
  useEffect(() => {
    return () => {
      Object.values(imageUrls).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);


  // 변경사항이 있는지 확인
  const hasUnsavedChanges = (): boolean => {
    if (!isEditMode) return false;
    
    // 원본 데이터와 비교
    const originalContent = originalDataRef.current?.content || '';
    const originalTradingMind = originalDataRef.current?.tradingMind ?? null;
    
    // 현재 content 가져오기
    const currentContent = updateFormContentFromEditor();
    
    // content 변경 확인
    const contentChanged = currentContent !== originalContent;
    
    // tradingMind 변경 확인
    const tradingMindChanged = formTradingMind !== originalTradingMind;
    
    // 임시 이미지나 삭제 목록이 있는지 확인
    const hasPendingImages = pendingImages.size > 0;
    const hasPendingDeletions = pendingDeletions.size > 0;
    
    return contentChanged || tradingMindChanged || hasPendingImages || hasPendingDeletions;
  };

  // ref를 통해 노출할 메서드들
  useImperativeHandle(ref, () => ({
    hasUnsavedChanges,
    handleSave,
  }));

  // AI 매매 분석 요청
  const handleAiAnalysisClick = async () => {
    if (!tradingHistory || isAnalysisInProgress) return;
    const targetDate = tradingHistory.tradeTime
      ? new Date(tradingHistory.tradeTime).toISOString().slice(0, 10)
      : '';
    if (!targetDate) {
      alert('거래 일시를 확인할 수 없습니다.');
      return;
    }
    const body = {
      tradeId: tradingHistory.id,
      targetDate,
      coinId: tradingHistory.coinId,
    };
    onAnalysisProgressChange?.(true);
    try {
      const data = await requestTradeEvaluationWithPolling(body);
      onAnalysisProgressChange?.(false);
      onAnalysisResult?.(data);
    } catch (err) {
      onAnalysisProgressChange?.(false);
      const message = err instanceof Error ? err.message : '매매 분석 요청에 실패했습니다.';
      alert(message);
    }
  };

  // 작성하기 모드로 전환
  const handleEditClick = () => {
    // 임시 이미지 목록 및 삭제 목록 초기화 (편집 모드 진입 시)
    setPendingImages(new Map());
    setPendingDeletions(new Set());
    
    // 원본 데이터 저장
    const originalContent = diary?.content ? parseContentToText(diary.content) : '';
    originalDataRef.current = {
      content: originalContent,
      tradingMind: diary?.tradingMind ?? null,
    };
    
    // 현재 diary의 content를 텍스트로 변환해서 폼에 설정
    if (diary?.content) {
      const textContent = parseContentToText(diary.content);
      setFormContent(textContent);
    } else {
      setFormContent('');
    }
    setIsEditMode(true);
  };

  // 편집 모드 진입 시 에디터에 내용 렌더링 (게시글과 동일한 방식)
  useEffect(() => {
    if (isEditMode && diary && diary.id && textareaRef.current) {
      const textContent = parseContentToText(diary.content);
      // 게시글과 동일하게 바로 렌더링
      renderContentToEditor(textContent, diary.id);
    }
  }, [isEditMode, diary?.id, diary?.content]);

  // 작성 취소
  const handleCancel = () => {
    setIsEditMode(false);
    // 임시 이미지 목록 및 삭제 목록 초기화
    setPendingImages(new Map());
    setPendingDeletions(new Set());
    // 원본 데이터 초기화
    originalDataRef.current = null;
    if (diary) {
      setFormTradingMind(diary.tradingMind ?? null);
      // content를 JSON에서 텍스트로 변환
      const contentText = parseContentToText(diary.content);
      setFormContent(contentText);
      // contentEditable 초기화
      if (textareaRef.current) {
        textareaRef.current.innerHTML = '';
      }
    } else {
      setFormTradingMind(null);
      setFormContent('');
      if (textareaRef.current) {
        textareaRef.current.innerHTML = '';
      }
    }
  };

  // 패널 닫기 (변경사항 확인)
  const handleClose = async () => {
    if (hasUnsavedChanges()) {
      const shouldSave = window.confirm('저장하지 않은 변경사항이 있습니다. 저장하시겠습니까?');
      if (shouldSave) {
        try {
          await handleSave();
          originalOnClose();
        } catch (error) {
          // 저장 실패 시 사용자가 선택할 수 있도록 확인
          const shouldClose = window.confirm('저장에 실패했습니다. 그래도 닫으시겠습니까?');
          if (shouldClose) {
            originalOnClose();
          }
        }
      } else {
        const shouldDiscard = window.confirm('변경사항을 저장하지 않고 닫으시겠습니까?');
        if (shouldDiscard) {
          originalOnClose();
        }
      }
    } else {
      originalOnClose();
    }
  };

  // 텍스트 포맷 적용
  const applyFormat = (command: string, value?: string) => {
    const editor = textareaRef.current;
    if (!editor) return;
    
    editor.focus();
    document.execCommand(command, false, value);
    updateFormContentFromEditor();
  };

  // contentEditable의 내용을 formContent에 반영 (게시판과 동일한 방식)
  const updateFormContentFromEditor = (): string => {
    const editor = textareaRef.current;
    if (!editor) return '';

    const clone = editor.cloneNode(true) as HTMLDivElement;

    const imageBlocks = clone.querySelectorAll('.write-image-block');
    imageBlocks.forEach((block) => {
      const tempId = block.getAttribute('data-temp-id');
      const filename = block.getAttribute('data-filename');
      const tokenId = tempId || filename;
      const token = tokenId ? `[image]{${tokenId}}` : '';
      const textNode = clone.ownerDocument.createTextNode(token);
      block.replaceWith(textNode);
    });

    const serializeNode = (node: Node, isTopLevel: boolean = false): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }

      if (!(node instanceof HTMLElement)) {
        return '';
      }

      const tagName = node.tagName.toLowerCase();
      
      if (tagName === 'br') {
        return '\n';
      }

      if (['div', 'p'].includes(tagName)) {
        let content = '';
        node.childNodes.forEach((child) => {
          content += serializeNode(child, false);
        });
        
        if (isTopLevel) {
          if (node.previousSibling) {
            const prevContent = serializeNode(node.previousSibling, true).trim();
            const currentContent = content.trim();
            if (prevContent || currentContent) {
              return '\n' + content;
            }
          }
        }
        
        return content;
      }

      // 볼드 처리
      if (tagName === 'strong' || tagName === 'b') {
        let content = '';
        node.childNodes.forEach((child) => {
          content += serializeNode(child, false);
        });
        return `**${content}**`;
      }

      // 밑줄 처리
      if (tagName === 'u') {
        let content = '';
        node.childNodes.forEach((child) => {
          content += serializeNode(child, false);
        });
        return `<u>${content}</u>`;
      }

      let result = '';
      node.childNodes.forEach((child) => {
        result += serializeNode(child, false);
      });
      return result;
    };

    let text = '';
    const topLevelNodes = Array.from(clone.childNodes);
    let prevWasEmpty = false;
    
    topLevelNodes.forEach((child, index) => {
      if (child instanceof HTMLElement && ['div', 'p'].includes(child.tagName.toLowerCase())) {
        let content = '';
        child.childNodes.forEach((grandchild) => {
          content += serializeNode(grandchild, false);
        });
        
        const isEmpty = content.trim().length === 0;
        
        if (index > 0) {
          if (!prevWasEmpty || !isEmpty) {
            text += '\n';
          }
        }
        
        if (!isEmpty) {
          text += content;
        }
        
        prevWasEmpty = isEmpty;
      } else {
        if (index > 0 && !prevWasEmpty) {
          text += '\n';
        }
        const nodeContent = serializeNode(child, false);
        text += nodeContent;
        prevWasEmpty = false;
      }
    });

    text = text.replace(/^[\n\r]+|[\n\r]+$/g, '');
    setFormContent(text);
    return text;
  };

  // 에디터에서 blocks 추출하는 함수 (게시글과 동일한 방식)
  const extractBlocksFromEditor = (editor: HTMLDivElement, diaryId: number): any[] => {
    // 1. 에디터를 클론하고 이미지 블록을 마커로 변환 (게시글과 동일)
    const clone = editor.cloneNode(true) as HTMLDivElement;
    const imageBlocks = clone.querySelectorAll('.write-image-block');
    
    imageBlocks.forEach((block) => {
      const tempId = block.getAttribute('data-temp-id');
      const filename = block.getAttribute('data-filename');
      const tokenId = tempId || filename;
      const token = tokenId ? `[image]{${tokenId}}` : '';
      const textNode = clone.ownerDocument.createTextNode(token);
      block.replaceWith(textNode);
    });

    // 2. 텍스트 추출 (div/p 태그 사이에 자동 줄바꿈 추가하지 않음)
    const serializeNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }

      if (!(node instanceof HTMLElement)) {
        return '';
      }

      const tagName = node.tagName.toLowerCase();
      
      if (tagName === 'br') {
        return '\n';
      }

      if (['div', 'p'].includes(tagName)) {
        let content = '';
        node.childNodes.forEach((child) => {
          content += serializeNode(child);
        });
        // div/p 태그 사이에 자동으로 줄바꿈을 추가하지 않음 (사용자가 입력한 그대로 유지)
        return content;
      }

      // 볼드 처리
      if (tagName === 'strong' || tagName === 'b') {
        let content = '';
        node.childNodes.forEach((child) => {
          content += serializeNode(child);
        });
        return `**${content}**`;
      }

      // 밑줄 처리
      if (tagName === 'u') {
        let content = '';
        node.childNodes.forEach((child) => {
          content += serializeNode(child);
        });
        return `<u>${content}</u>`;
      }

      let result = '';
      node.childNodes.forEach((child) => {
        result += serializeNode(child);
      });
      return result;
    };

    // 3. 최상위 노드들을 순회하면서 텍스트 추출
    // Enter와 Shift+Enter 모두 동일하게 1번의 줄바꿈 추가
    let text = '';
    const topLevelNodes = Array.from(clone.childNodes);
    
    topLevelNodes.forEach((child, index) => {
      if (child instanceof HTMLElement && ['div', 'p'].includes(child.tagName.toLowerCase())) {
        let content = '';
        child.childNodes.forEach((grandchild) => {
          content += serializeNode(grandchild);
        });
        
        // 이전 형제가 있으면 1번의 줄바꿈 추가 (Enter로 생성된 div/p 태그 사이)
        if (index > 0) {
          text += '\n';
        }
        
        text += content;
      } else {
        const nodeContent = serializeNode(child);
        text += nodeContent;
      }
    });

    text = text.replace(/^[\n\r]+|[\n\r]+$/g, '');

    // 4. 텍스트를 blocks로 변환 (게시글과 동일: textToContentBlocks 사용)
    const parsed = textToContentBlocks(text, diaryId);
    return parsed.blocks;
  };


  // contentEditable에 내용 렌더링 (게시판과 동일한 방식)
  const renderContentToEditor = (text: string, diaryId: number) => {
    if (!textareaRef.current) return;

    const editor = textareaRef.current;
    editor.innerHTML = '';

    const fragment = document.createDocumentFragment();
    const imageMarkerRegex = /\[image\]\{([^}]+)\}/g;
    let lastIndex = 0;
    let match;

    const appendText = (raw: string) => {
      if (!raw) return;
      
      // 마크다운 형식을 HTML로 변환
      let processedText = raw;
      
      // 볼드 처리: **text** -> <strong>text</strong>
      processedText = processedText.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      
      // 밑줄 처리: <u>text</u>는 이미 HTML 형식이므로 그대로 유지
      
      // 줄바꿈을 기준으로 분할
      const lines = processedText.split('\n');
      
      lines.forEach((line, lineIndex) => {
        if (line.length > 0) {
          // 임시 div를 사용하여 HTML 파싱
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = line;
          
          // 파싱된 노드들을 fragment에 추가
          Array.from(tempDiv.childNodes).forEach(node => {
            fragment.appendChild(node.cloneNode(true));
          });
        }
        
        // 마지막 줄이 아니면 <br> 추가
        if (lineIndex < lines.length - 1) {
          fragment.appendChild(document.createElement('br'));
        }
      });
    };

    while ((match = imageMarkerRegex.exec(text)) !== null) {
      const beforeText = text.substring(lastIndex, match.index);
      appendText(beforeText);

      const filename = match[1];
      if (filename) {
        const container = document.createElement('span');
        container.className = 'write-image-block';
        container.setAttribute('data-filename', filename);
        container.setAttribute('contenteditable', 'false');

        // 뷰 모드와 동일하게 imageUrls에서 blob URL 가져오기
        const imageKey = `${diaryId}_${filename}`;
        const blobUrl = imageUrls[imageKey];
        
        if (blobUrl) {
          // blob URL이 이미 로드된 경우
          const img = document.createElement('img');
          img.className = 'write-image';
          img.src = blobUrl;
          img.alt = filename;
          
          img.onload = () => {
            const naturalWidth = img.naturalWidth;
            const naturalHeight = img.naturalHeight;
            
            const editorWidth = textareaRef.current?.clientWidth || 800;
            const maxDisplayWidth = editorWidth - 36;
            
            if (naturalWidth > maxDisplayWidth) {
              img.style.width = `${maxDisplayWidth}px`;
              img.style.height = 'auto';
            } else {
              img.style.width = `${naturalWidth}px`;
              img.style.height = `${naturalHeight}px`;
            }
          };
          
          container.appendChild(img);
        } else {
          // blob URL이 아직 로드되지 않은 경우, 로드 중 표시
          const loadingDiv = document.createElement('div');
          loadingDiv.style.cssText = 'padding: 20px; text-align: center; color: #999; font-size: 12px;';
          loadingDiv.textContent = '이미지 로딩 중...';
          container.appendChild(loadingDiv);
          
          // 이미지 로드 시도
          const loadImage = async () => {
            try {
              const imageUrl = diaryService.getImageUrl(diaryId, filename);
              const response = await authenticatedFetch(imageUrl);
              
              if (response.ok) {
                const blob = await response.blob();
                const newBlobUrl = URL.createObjectURL(blob);
                setImageUrls(prev => ({ ...prev, [imageKey]: newBlobUrl }));
                
                // 로딩 표시 제거하고 이미지 추가
                container.innerHTML = '';
                const img = document.createElement('img');
                img.className = 'write-image';
                img.src = newBlobUrl;
                img.alt = filename;
                
                img.onload = () => {
                  const naturalWidth = img.naturalWidth;
                  const naturalHeight = img.naturalHeight;
                  
                  const editorWidth = textareaRef.current?.clientWidth || 800;
                  const maxDisplayWidth = editorWidth - 36;
                  
                  if (naturalWidth > maxDisplayWidth) {
                    img.style.width = `${maxDisplayWidth}px`;
                    img.style.height = 'auto';
                  } else {
                    img.style.width = `${naturalWidth}px`;
                    img.style.height = `${naturalHeight}px`;
                  }
                };
                
                // removeButton 추가
                const removeButton = document.createElement('button');
                removeButton.type = 'button';
                removeButton.className = 'write-image-remove-button';
                removeButton.textContent = '×';
                removeButton.onclick = (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  container.remove();
                  setPendingDeletions(prev => new Set(prev).add(filename));
                  updateFormContentFromEditor();
                };
                
                container.appendChild(img);
                container.appendChild(removeButton);
              }
            } catch (error) {
              console.error('[renderContentToEditor] 이미지 로드 실패:', error);
              loadingDiv.textContent = '이미지 로드 실패';
            }
          };
          
          loadImage();
        }

        // removeButton 추가 (blob URL이 이미 로드된 경우)
        if (blobUrl) {
          const removeButton = document.createElement('button');
          removeButton.type = 'button';
          removeButton.className = 'write-image-remove-button';
          removeButton.textContent = '×';
          removeButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // DOM에서 이미지 블록 제거 (프론트엔드에서만)
            container.remove();
            
            // pendingDeletions에 추가 (수정 버튼 클릭 시 일괄 삭제)
            setPendingDeletions(prev => new Set(prev).add(filename));

            // 내용 갱신
            updateFormContentFromEditor();
          };

          container.appendChild(removeButton);
        }
        
        fragment.appendChild(container);
      }

      lastIndex = match.index + match[0].length;
    }

    const remainingText = text.substring(lastIndex);
    appendText(remainingText);

    editor.appendChild(fragment);
  };

  // 이미지 업로드 핸들러 (게시판과 동일한 방식)
  const handleImageUpload = async (file: File) => {
    // 파일 크기 확인 (5MB = 5,242,880 바이트)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      alert('이미지 파일 크기는 5MB를 초과할 수 없습니다.');
      return;
    }

    // 이미지 개수 확인 (에디터 내 이미지 블록만 카운트)
    const currentImageCount = textareaRef.current?.querySelectorAll('.write-image-block').length || 0;
    if (currentImageCount >= 5) {
      alert('이미지는 최대 5개까지 추가할 수 있습니다.');
      return;
    }

    // 임시 ID 생성
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    setPendingImages(prev => new Map(prev).set(tempId, file));

    // contentEditable에 이미지 미리보기 삽입
    if (textareaRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        const container = document.createElement('span');
        container.className = 'write-image-block';
        container.setAttribute('data-temp-id', tempId);
        container.setAttribute('contenteditable', 'false');

        const img = document.createElement('img');
        img.className = 'write-image';
        img.src = URL.createObjectURL(file);
        img.alt = file.name;
        
        // 이미지 로드 후 원본 크기 유지
        img.onload = () => {
          const naturalWidth = img.naturalWidth;
          const naturalHeight = img.naturalHeight;
          
          const editorWidth = textareaRef.current?.clientWidth || 800;
          const maxDisplayWidth = editorWidth - 36; // padding 고려
          
          if (naturalWidth > maxDisplayWidth) {
            img.style.width = `${maxDisplayWidth}px`;
            img.style.height = 'auto';
          } else {
            img.style.width = `${naturalWidth}px`;
            img.style.height = `${naturalHeight}px`;
          }
        };

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'write-image-remove-button';
        removeButton.textContent = '×';
        removeButton.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();

          // DOM에서 이미지 블록 제거
          container.remove();
          // pendingImages에서 제거
          setPendingImages(prev => {
            const next = new Map(prev);
            next.delete(tempId);
            return next;
          });

          // 내용 갱신
          updateFormContentFromEditor();
        };

        container.appendChild(img);
        container.appendChild(removeButton);

        range.insertNode(container);
        range.setStartAfter(container);
        selection.removeAllRanges();
        selection.addRange(range);

        updateFormContentFromEditor();
      }
    }
  };

  // Drag & Drop 핸들러
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const items = e.dataTransfer.items;
    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));

    imageItems.forEach(item => {
      const file = item.getAsFile();
      if (file) {
        handleImageUpload(file);
      }
    });
  };

  // Paste 핸들러
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));

    if (imageItems.length > 0) {
      e.preventDefault();
      imageItems.forEach(item => {
        const file = item.getAsFile();
        if (file) {
          handleImageUpload(file);
        }
      });
    }
  };


  // 저장 (게시판과 동일한 방식)
  const handleSave = async () => {
    if (!tradingHistory?.id) return;

    setIsSaving(true);
    setIsUploading(true);

    try {
      // 먼저 일지 생성 (임시 ID로)
      let currentDiaryId = diary?.id;
      if (!currentDiaryId) {
        // 일지가 없으면 먼저 빈 일지 생성
        const createResponse = await diaryService.create({
          tradingHistoryId: tradingHistory.id,
          tradingMind: formTradingMind,
          content: undefined,
        });
        currentDiaryId = createResponse.id;
        setDiary(createResponse);
      }

      // 1. 기존 상태 확인
      if (!originalDataRef.current) {
        alert('기존 상태를 불러올 수 없습니다.');
        return;
      }

      // 2. 새로운 상태 생성 (에디터에서 직접 읽기)
      const editor = textareaRef.current;
      if (!editor) {
        alert('에디터를 찾을 수 없습니다.');
        return;
      }

      const newBlocks = extractBlocksFromEditor(editor, currentDiaryId);

      // 2-1. 새로 추가된 이미지 확인 및 MinIO 저장
      const tempIdToFilenameMap = new Map<string, string>();
      if (pendingImages.size > 0) {
        for (const [tempId, file] of pendingImages.entries()) {
          try {
            // 이미지 업로드 (서버에서 content를 업데이트하지만, 우리는 무시하고 filename만 추출)
            const updatedDiary = await diaryService.uploadImage(currentDiaryId, file);

            // 서버 응답의 content를 파싱해서 마지막에 추가된 이미지의 filename 추출
            // 서버의 content 업데이트는 무시하고, filename만 사용
            if (updatedDiary.content) {
              try {
                const parsed = JSON.parse(updatedDiary.content);
                const blocks = parsed.blocks || [];

                // 마지막에 추가된 이미지 블록 찾기 (서버가 방금 추가한 것)
                for (let i = blocks.length - 1; i >= 0; i--) {
                  const block = blocks[i];
                  if (block.type === 'image' && block.path) {
                    const filename = block.path.split('/').pop() || '';
                    if (filename) {
                      tempIdToFilenameMap.set(tempId, filename);
                      break;
                    }
                  }
                }
              } catch (e) {
                console.error('Content 파싱 실패:', e);
              }
            }
          } catch (error) {
            console.error(`이미지 업로드 실패 (${tempId}):`, error);
            alert(`이미지 업로드에 실패했습니다: ${file.name}`);
            throw error;
          }
        }
      }

      // 2-2. 새로운 blocks에서 tempId를 실제 filename으로 교체
      // 먼저 모든 tempId가 매핑되었는지 확인
      const tempIdsInBlocks = new Set<string>();
      newBlocks.forEach((block: any) => {
        if (block.type === 'image' && block.path) {
          const pathParts = block.path.split('/');
          const filename = pathParts[pathParts.length - 1];
          if (filename.startsWith('temp_')) {
            tempIdsInBlocks.add(filename);
          }
        }
      });

      // 매핑되지 않은 tempId가 있으면 에러 발생
      const unmappedTempIds = Array.from(tempIdsInBlocks).filter(tempId => !tempIdToFilenameMap.has(tempId));
      if (unmappedTempIds.length > 0) {
        console.error('매핑되지 않은 이미지 tempId:', unmappedTempIds);
        alert(`이미지 업로드에 실패했습니다. 다시 시도해주세요.`);
        throw new Error(`이미지 매핑 실패: ${unmappedTempIds.join(', ')}`);
      }

      const finalBlocks = newBlocks.map((block: any) => {
        if (block.type === 'image' && block.path) {
          const pathParts = block.path.split('/');
          const filename = pathParts[pathParts.length - 1];
          
          // tempId인 경우 실제 filename으로 교체
          if (filename.startsWith('temp_')) {
            const tempId = filename;
            if (tempIdToFilenameMap.has(tempId)) {
              const actualFilename = tempIdToFilenameMap.get(tempId)!;
              return {
                type: 'image',
                path: `@diaryImage/${currentDiaryId}/${actualFilename}`
              };
            }
          }
        }
        return block;
      });

      // 최종 blocks를 JSON 문자열로 변환
      const contentJson = JSON.stringify({ blocks: finalBlocks });

      const requestData = {
        tradingHistoryId: tradingHistory.id,
        tradingMind: formTradingMind,
        content: contentJson,
      };

      // 일지 업데이트 (이미지 관리 포함 - 삭제된 이미지는 서버에서 자동 처리)
      const savedDiary = await diaryService.updateContent(currentDiaryId, requestData);

      // 임시 이미지 목록 및 삭제 목록 초기화
      setPendingImages(new Map());
      setPendingDeletions(new Set());
      
      // 원본 데이터 초기화
      originalDataRef.current = null;

      // 편집 모드 종료
      setIsEditMode(false);
      
      // contentEditable 초기화
      if (textareaRef.current) {
        textareaRef.current.innerHTML = '';
      }
      
      // 저장된 diary로 상태 업데이트
      setDiary(savedDiary);
      
      // formContent와 formTradingMind를 저장된 diary의 값으로 업데이트
      if (savedDiary.content) {
        const textContent = parseContentToText(savedDiary.content);
        setFormContent(textContent);
      } else {
        setFormContent('');
      }
      setFormTradingMind(savedDiary.tradingMind ?? null);
    } catch (error) {
      console.error('[IndividualTradingHistoryPanel] 매매일지 저장 실패:', error);
      alert('매매일지 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
      setIsUploading(false);
      setIsDeleting(false);
    }
  };

  const tradingMindText = diary?.tradingMind !== null && diary?.tradingMind !== undefined 
    ? getTradingMindText(diary.tradingMind)
    : null;

  const tradingMindColor = diary?.tradingMind !== null && diary?.tradingMind !== undefined
    ? getTradingMindColor(diary.tradingMind)
    : '';

  // 매매일지가 있고, 최소 하나의 필드라도 값이 있는 경우에만 섹션 표시
  const hasDiaryContent = diary && (
    (tradingMindText !== null && tradingMindText !== '') ||
    (diary.content !== null && diary.content !== undefined && diary.content.trim() !== '') ||
    (diary.tags !== null && diary.tags !== undefined && diary.tags.length > 0)
  );

  return (
    <div className="individual-trading-history-panel">
      <div className="individual-trading-history-panel-content">
        {(isSaving || isUploading || isDeleting) && (
          <div className="diary-loading-overlay">
            <div className="diary-loading-spinner" />
            <div className="diary-loading-text">
              {isSaving ? '저장 중입니다...' : isUploading ? '이미지 업로드 중입니다...' : '이미지 삭제 중입니다...'}
            </div>
          </div>
        )}
        <div className="individual-trading-history-panel-header">
          <div className="individual-trading-history-panel-header-left">
            <h3 className="individual-trading-history-panel-title">매매일지</h3>
            <div className="individual-trading-history-trade-time">
              {formatTradeTime(tradingHistory.tradeTime)}
            </div>
          </div>
          <div className="individual-trading-history-panel-header-right">
            {!isEditMode && (
              <>
                <button
                  type="button"
                  className="individual-trading-history-ai-analysis-button-header"
                  onClick={handleAiAnalysisClick}
                  disabled={isAnalysisInProgress}
                  aria-label="AI 분석하기"
                  title="AI 분석하기"
                >
                  {isAnalysisInProgress ? (
                    <span className="individual-trading-history-ai-analysis-spinner" aria-hidden />
                  ) : (
                    <span className="individual-trading-history-ai-analysis-label">AI 분석</span>
                  )}
                </button>
                <button
                  className="individual-trading-history-write-button-header"
                  onClick={handleEditClick}
                  aria-label="작성하기"
                >
                  <img src="/icon/pen.png" alt="작성하기" className="individual-trading-history-write-icon" />
                </button>
              </>
            )}
            <button
              className="individual-trading-history-panel-close"
              onClick={handleClose}
              aria-label="패널 닫기"
            >
              ×
            </button>
          </div>
        </div>
        <div className="individual-trading-history-panel-body">
          {!isEditMode && (
            <>
              <div className="individual-trading-history-info">
                {imageUrl && (
                  <img 
                    src={imageUrl} 
                    alt={koreanName}
                    className="individual-trading-history-coin-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div className="individual-trading-history-coin-info">
                  <div className="individual-trading-history-coin-name">{koreanName}</div>
                  <div className="individual-trading-history-market-code">{marketCode}</div>
                </div>
                <div className={`individual-trading-history-trade-type ${isBuy ? 'buy' : 'sell'}`}>
                  {isBuy ? '매수' : '매도'}
                </div>
              </div>
              
              <div className="individual-trading-history-chart-controls">
                <button
                  className={`individual-trading-history-chart-type-button ${chartType === 'candle' ? 'active' : ''}`}
                  onClick={() => setChartType('candle')}
                >
                  캔들
                </button>
                <button
                  className={`individual-trading-history-chart-type-button ${chartType === 'line' ? 'active' : ''}`}
                  onClick={() => setChartType('line')}
                >
                  라인
                </button>
              </div>
              
              {chartType === 'line' ? (
                <CoinPriceLineChart
                  coinId={tradingHistory.coinId}
                  selectedDate={tradingHistory.tradeTime}
                  tradingPrice={tradingHistory.price}
                  isBuy={isBuy}
                  avgBuyPrice={tradingHistory.avgBuyPrice}
                  containerClassName="individual-trading-history-chart"
                />
              ) : (
                <CoinPriceCandleChart
                  coinId={tradingHistory.coinId}
                  selectedDate={tradingHistory.tradeTime}
                  tradingPrice={tradingHistory.price}
                  isBuy={isBuy}
                  avgBuyPrice={tradingHistory.avgBuyPrice}
                  containerClassName="individual-trading-history-chart"
                />
              )}
              
              <div className="individual-trading-history-details">
                <div className="individual-trading-history-details-left">
                  <div className="individual-trading-history-detail-row">
                    <span className="individual-trading-history-detail-label">매수평균가</span>
                    <span className="individual-trading-history-detail-value">
                      {isBuy 
                        ? formatCurrency(tradingHistory.price, coin?.quoteCurrency)
                        : (tradingHistory.avgBuyPrice !== null ? formatCurrency(tradingHistory.avgBuyPrice, coin?.quoteCurrency) : '-')
                      }
                    </span>
                  </div>
                  
                  <div className="individual-trading-history-detail-row">
                    <span className="individual-trading-history-detail-label">매도평균가</span>
                    <span className="individual-trading-history-detail-value">
                      {!isBuy ? formatCurrency(tradingHistory.price, coin?.quoteCurrency) : '-'}
                    </span>
                  </div>
                  
                  <div className="individual-trading-history-detail-row">
                    <span className="individual-trading-history-detail-label">거래수량</span>
                    <span className="individual-trading-history-detail-value">
                      {formatQuantity(tradingHistory.quantity)} {coin?.symbol || ''}
                    </span>
                  </div>
                </div>
                
                <div className="individual-trading-history-details-right">
                  <div className="individual-trading-history-detail-row">
                    <span className="individual-trading-history-detail-label">총거래금액</span>
                    <span className="individual-trading-history-detail-value">
                      {formatCurrency(tradingHistory.totalPrice, coin?.quoteCurrency)}
                    </span>
                  </div>
                  
                  <div className="individual-trading-history-detail-row">
                    <span className="individual-trading-history-detail-label">수익률</span>
                    <span className={`individual-trading-history-detail-value ${profitLossRate >= 0 ? 'positive' : 'negative'}`}>
                      {!isBuy ? `${profitLossRate >= 0 ? '+' : ''}${profitLossRate.toFixed(2)}%` : '-'}
                    </span>
                  </div>
                  
                  <div className="individual-trading-history-detail-row">
                    <span className="individual-trading-history-detail-label">총수익금</span>
                    <span className={`individual-trading-history-detail-value ${profitLoss !== null && profitLoss >= 0 ? 'positive' : 'negative'}`}>
                      {profitLoss !== null ? `${profitLoss >= 0 ? '+' : ''}${formatCurrency(profitLoss, coin?.quoteCurrency)}` : '-'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="individual-trading-history-additional-info">
                <div className="individual-trading-history-additional-row">
                  <div className="individual-trading-history-additional-item">
                    <span className="individual-trading-history-detail-label">거래방식</span>
                    <span className="individual-trading-history-detail-value">
                      {coin?.quoteCurrency || '-'}
                    </span>
                  </div>
                  <div className="individual-trading-history-additional-item">
                    <span className="individual-trading-history-detail-label">거래소</span>
                    <span className="individual-trading-history-detail-value">
                      {getExchangeName(tradingHistory.exchangeCode)}
                    </span>
                  </div>
                  <div className="individual-trading-history-additional-item">
                    <span className="individual-trading-history-detail-label">수수료</span>
                    <span className="individual-trading-history-detail-value">
                      {formatCurrency(tradingHistory.fee, coin?.quoteCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {isEditMode ? (
            <div className="individual-trading-history-diary-edit">
              <div className="individual-trading-history-diary-edit-item">
                <select
                  className="individual-trading-history-diary-edit-select"
                  value={formTradingMind ?? ''}
                  onChange={(e) => setFormTradingMind(e.target.value === '' ? null : Number(e.target.value))}
                >
                  <option value="">투자심리를 선택해주세요.</option>
                  <option value="0">무념무상</option>
                  <option value="1">확신</option>
                  <option value="2">약간 확신</option>
                  <option value="3">기대감</option>
                  <option value="11">욕심</option>
                  <option value="12">조급함</option>
                  <option value="13">불안</option>
                  <option value="14">두려움</option>
                </select>
              </div>
              <div className="individual-trading-history-diary-edit-item">
                <div className="diary-edit-label-toolbar-wrapper">
                <label className="individual-trading-history-diary-edit-label">매매근거 & 고려사항</label>
                  {/* 포맷 버튼 툴바 */}
                  <div className="diary-edit-toolbar">
                  <button
                    type="button"
                    className="diary-edit-toolbar-button"
                    onClick={() => applyFormat('bold')}
                    title="볼드체"
                    disabled={isUploading || isDeleting}
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    type="button"
                    className="diary-edit-toolbar-button"
                    onClick={() => applyFormat('underline')}
                    title="밑줄"
                    disabled={isUploading || isDeleting}
                  >
                    <u>U</u>
                  </button>
                  </div>
                </div>
                <div
                  ref={textareaRef}
                  className="individual-trading-history-diary-edit-textarea"
                  contentEditable
                  onInput={updateFormContentFromEditor}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onPaste={handlePaste}
                  data-placeholder="매매시 고려한 점을 입력해서 매매일지를 작성해보세요.                                              (이미지를 드래그하거나 붙여넣을 수 있습니다)"
                  suppressContentEditableWarning
                />
                <div className="textarea-hint">(이미지 파일은 JPEG, PNG, GIF, WEBP 형식만 지원되며, 최대 5MB까지 업로드 가능합니다)</div>
                {isUploading && (
                  <div className="uploading-indicator">이미지 업로드 중...</div>
                )}
              </div>
              <div className="individual-trading-history-diary-edit-actions">
                <button
                  className="individual-trading-history-diary-edit-cancel"
                  onClick={handleCancel}
                  disabled={isSaving || isUploading || isDeleting}
                >
                  취소
                </button>
                <button
                  className="individual-trading-history-diary-edit-save"
                  onClick={handleSave}
                  disabled={isSaving || isUploading || isDeleting || !formContent || formContent.length === 0}
                >
                  {isSaving ? '저장 중...' : isUploading ? '업로드 중...' : isDeleting ? '삭제 중...' : '저장'}
                </button>
              </div>
            </div>
          ) : (
            <div className="individual-trading-history-diary">
              {hasDiaryContent ? (
                <>
                  {tradingMindText !== null && tradingMindText !== '' && (
                    <div className="individual-trading-history-diary-item">
                      <div className="individual-trading-history-diary-mind-wrapper">
                        <h3 
                          className="individual-trading-history-diary-value individual-trading-history-diary-value-mind"
                          style={{ borderLeftColor: tradingMindColor }}
                        >
                          <span 
                            className="individual-trading-history-diary-mind-text"
                            style={{ color: tradingMindColor }}
                          >
                            {tradingMindText}
                          </span>의 마인드로 진행한 거래에요.
                        </h3>
                      </div>
                    </div>
                  )}
                  {diary && diary.content !== null && diary.content !== undefined && diary.content.trim() !== '' && (() => {
                    // content가 JSON 형식이면 파싱해서 표시 (blocks 기반 렌더링)
                    try {
                      const parsed: ParsedDiaryContent = JSON.parse(diary.content);
                      if (parsed.blocks && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
                        return (
                          <div className="individual-trading-history-diary-item">
                            <span className="individual-trading-history-diary-label">매매근거 & 고려사항</span>
                            <div className="individual-trading-history-diary-value individual-trading-history-diary-content">
                              {(() => {
                                // blocks를 markdown 형식으로 변환
                                const markdown = parsed.blocks.map((block) => {
                                  if (block.type === 'text') {
                                    return block.content || '';
                                  } else if (block.type === 'image' && block.path) {
                                    const filename = block.path.split('/').pop() || '';
                                    return `[image]{${filename}}`;
                                  }
                                  return '';
                                }).join('');
                                
                                // Markdown을 파싱하여 렌더링
                                const imageMarkerRegex = /\[image\]\{([^}]+)\}/g;
                                const parts: Array<{ type: 'text' | 'image'; content: string; filename?: string }> = [];
                                let lastIndex = 0;
                                let match;

                                while ((match = imageMarkerRegex.exec(markdown)) !== null) {
                                  if (match.index > lastIndex) {
                                    parts.push({ type: 'text', content: markdown.substring(lastIndex, match.index) });
                                  }
                                  parts.push({ type: 'image', content: match[0], filename: match[1] });
                                  lastIndex = match.index + match[0].length;
                                }
                                
                                if (lastIndex < markdown.length) {
                                  parts.push({ type: 'text', content: markdown.substring(lastIndex) });
                                }
                                
                                if (parts.length === 0) {
                                  parts.push({ type: 'text', content: markdown });
                                }

                                return parts.map((part, index) => {
                                  if (part.type === 'image' && part.filename) {
                                    const imageKey = `${diary.id}_${part.filename}`;
                                    const blobUrl = imageUrls[imageKey];
                                    
                                    return (
                                      <div key={index} className="diary-image-container">
                                        {blobUrl ? (
                                          <img
                                            src={blobUrl}
                                            alt={`Diary image ${index + 1}`}
                                            className="diary-image"
                                            style={{
                                              maxWidth: '100%',
                                              height: 'auto',
                                              borderRadius: '8px',
                                              display: 'block',
                                            }}
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                          />
                                        ) : (
                                          <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                                            이미지 로딩 중...
                                          </div>
                                        )}
                                      </div>
                                    );
                                  } else {
                                    // Markdown을 HTML로 변환
                                    let text = part.content;
                                    
                                    // 볼드 처리
                                    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                                    
                                    // 밑줄 처리
                                    text = text.replace(/<u>(.+?)<\/u>/g, '<u>$1</u>');
                                    
                                    // 줄바꿈 처리
                                    text = text.replace(/\n/g, '<br>');
                                    
                                    return (
                                      <div 
                                        key={index} 
                                        className="diary-markdown-content"
                                        dangerouslySetInnerHTML={{ __html: text }}
                                      />
                                    );
                                  }
                                });
                              })()}
                            </div>
                          </div>
                        );
                      }
                    } catch {
                      // JSON 파싱 실패 시 markdown으로 간주하여 렌더링
                    }
                    // JSON이 아니거나 blocks가 없는 경우 markdown으로 렌더링
                    const renderMarkdown = (md: string) => {
                      const imageMarkerRegex = /\[image\]\{([^}]+)\}/g;
                      const parts: Array<{ type: 'text' | 'image'; content: string; filename?: string }> = [];
                      let lastIndex = 0;
                      let match;

                      while ((match = imageMarkerRegex.exec(md)) !== null) {
                        if (match.index > lastIndex) {
                          parts.push({ type: 'text', content: md.substring(lastIndex, match.index) });
                        }
                        parts.push({ type: 'image', content: match[0], filename: match[1] });
                        lastIndex = match.index + match[0].length;
                      }
                      
                      if (lastIndex < md.length) {
                        parts.push({ type: 'text', content: md.substring(lastIndex) });
                      }
                      
                      if (parts.length === 0) {
                        parts.push({ type: 'text', content: md });
                      }

                      return parts.map((part, index) => {
                        if (part.type === 'image' && part.filename) {
                          const imageKey = `${diary.id}_${part.filename}`;
                          const blobUrl = imageUrls[imageKey];
                          
                          return (
                            <div key={index} className="diary-image-container">
                              {blobUrl ? (
                                <img
                                  src={blobUrl}
                                  alt={`Diary image ${index + 1}`}
                                  className="diary-image"
                                  style={{
                                    maxWidth: '100%',
                                    height: 'auto',
                                    borderRadius: '8px',
                                    display: 'block',
                                  }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                                  이미지 로딩 중...
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          // Markdown을 HTML로 변환
                          let text = part.content;
                          
                          // 볼드 처리
                          text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                          
                          // 밑줄 처리
                          text = text.replace(/<u>(.+?)<\/u>/g, '<u>$1</u>');
                          
                          // 줄바꿈 처리
                          text = text.replace(/\n/g, '<br>');
                          
                          return (
                            <div 
                              key={index} 
                              className="diary-markdown-content"
                              dangerouslySetInnerHTML={{ __html: text }}
                            />
                          );
                        }
                      });
                    };
                    
                    return (
                      <div className="individual-trading-history-diary-item">
                        <span className="individual-trading-history-diary-label">매매근거 & 고려사항</span>
                        <div className="individual-trading-history-diary-value individual-trading-history-diary-content">
                          {renderMarkdown(diary.content)}
                        </div>
                      </div>
                    );
                  })()}
                  {diary && diary.tags !== null && diary.tags !== undefined && diary.tags.length > 0 && (
                    <div className="individual-trading-history-diary-item">
                      <span className="individual-trading-history-diary-label">태그</span>
                      <span className="individual-trading-history-diary-value">
                        {diary.tags.join(', ')}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="individual-trading-history-diary-item">
                  <div className="individual-trading-history-diary-mind-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="individual-trading-history-diary-value individual-trading-history-diary-value-mind">
                      매매일지를 작성해보세요!
                    </h3>
                    <button
                      className="individual-trading-history-write-button-header"
                      onClick={handleEditClick}
                      aria-label="작성하기"
                    >
                      <img src="/icon/pen.png" alt="작성하기" className="individual-trading-history-write-icon" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ref를 통해 노출할 메서드들
IndividualTradingHistoryPanel.displayName = 'IndividualTradingHistoryPanel';

export default IndividualTradingHistoryPanel;

