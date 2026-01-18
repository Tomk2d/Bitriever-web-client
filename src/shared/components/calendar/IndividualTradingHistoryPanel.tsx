'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type { TradingHistoryResponse } from '@/features/trading/services/tradingHistoryService';
import { formatCurrency, formatQuantity } from '@/features/asset/utils/assetCalculations';
import { diaryService, type DiaryResponse } from '@/features/diary/services/diaryService';
import { parseContentToText, textToContentBlocks } from '@/features/diary/utils/contentParser';
import type { ParsedDiaryContent } from '@/features/diary/types';
import CoinPriceLineChart from '@/shared/components/charts/CoinPriceLineChart';
import CoinPriceCandleChart from '@/shared/components/charts/CoinPriceCandleChart';
import './IndividualTradingHistoryPanel.css';

interface IndividualTradingHistoryPanelProps {
  tradingHistory: TradingHistoryResponse | null;
  onClose: () => void;
}

const IndividualTradingHistoryPanel = forwardRef<IndividualTradingHistoryPanelRef, IndividualTradingHistoryPanelProps>(({
  tradingHistory,
  onClose: originalOnClose,
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const deletingByButtonRef = useRef<Set<string>>(new Set()); // x 버튼으로 삭제 중인 마커 추적
  const isRenderingRef = useRef<boolean>(false); // renderContentToEditor 실행 중인지 추적
  // 임시 이미지 파일 저장 (저장 버튼 클릭 시 일괄 업로드)
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
        const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        
        for (const block of parsed.blocks) {
          if (block.type === 'image' && block.path) {
            const filename = block.path.split('/').pop() || '';
            const imageKey = `${diary.id}_${filename}`;
            
            if (!imageUrls[imageKey]) {
              try {
                const imageUrl = diaryService.getImageUrl(diary.id, filename);
                const response = await fetch(imageUrl, {
                  headers: {
                    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
                  },
                });
                
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

  // 키보드로 이미지 마커 삭제 감지 (MutationObserver 사용)
  useEffect(() => {
    const editor = textareaRef.current;
    if (!editor || !isEditMode) return;

    // 삭제 전 이미지 마커 목록 저장
    let previousMarkers: Set<string> = new Set();
    const updateMarkerList = () => {
      const markers = editor.querySelectorAll('.image-marker');
      previousMarkers = new Set();
      markers.forEach((marker) => {
        const filename = marker.getAttribute('data-filename');
        if (filename) {
          previousMarkers.add(filename);
        }
      });
    };
    updateMarkerList();

    // MutationObserver로 DOM 변경 감지
    const observer = new MutationObserver((mutations) => {
      // renderContentToEditor 실행 중이면 무시
      if (isRenderingRef.current) {
        return;
      }

      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            // 삭제된 노드가 이미지 마커인지 확인
            if (element.classList?.contains('image-marker')) {
              const filename = element.getAttribute('data-filename');
              console.log('[MutationObserver] 이미지 마커 삭제 감지:', { filename, diaryId: diary?.id, isRendering: isRenderingRef.current });
              if (filename && previousMarkers.has(filename)) {
                // x 버튼 클릭으로 삭제된 경우가 아닌지 확인
                if (!deletingByButtonRef.current.has(filename)) {
                  // 키보드로 삭제된 경우
                  setTimeout(() => {
                    // renderContentToEditor 실행 중이거나 저장 중이면 무시
                    if (isRenderingRef.current || isSaving) {
                      console.log('[MutationObserver] renderContentToEditor 실행 중이거나 저장 중이므로 삭제 요청 생략');
                      return;
                    }
                    // 현재 마커가 실제로 제거되었는지 확인
                    const currentMarkers = editor.querySelectorAll('.image-marker');
                    const stillExists = Array.from(currentMarkers).some(
                      (marker) => marker.getAttribute('data-filename') === filename
                    );
                    if (!stillExists && diary?.id) {
                      console.log('[MutationObserver] 키보드 삭제 확인, 서버에 삭제 요청:', { filename, diaryId: diary.id });
                      handleImageMarkerDelete(filename, false);
                    }
                  }, 100);
                } else {
                  console.log('[MutationObserver] x 버튼 클릭으로 삭제된 것으로 판단, 서버 요청 생략');
                }
              } else {
                console.warn('[MutationObserver] filename이 없거나 이전 마커 목록에 없음:', { filename, hasFilename: !!filename, inPreviousMarkers: filename ? previousMarkers.has(filename) : false });
              }
            }
          }
        });
      });
      // 마커 목록 업데이트
      updateMarkerList();
    });

    observer.observe(editor, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [isEditMode, diary?.id, isSaving]);

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
      // contentEditable에 렌더링
      setTimeout(() => {
        renderContentToEditor(textContent);
      }, 0);
    } else {
      setFormContent('');
    }
    setIsEditMode(true);
  };

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

  // contentEditable에 이미지 마커 삽입 (시각적 마커 요소로)
  const insertImageMarker = (filename: string) => {
    const editor = textareaRef.current;
    if (!editor) return;

    // 이미지 마커 삽입 중 플래그 설정 (MutationObserver 무시)
    isRenderingRef.current = true;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      isRenderingRef.current = false;
      return;
    }

    const range = selection.getRangeAt(0);
    
    // 시각적 이미지 마커 요소 생성
    const imageMarkerElement = document.createElement('span');
    imageMarkerElement.className = 'image-marker';
    imageMarkerElement.setAttribute('data-filename', filename);
    imageMarkerElement.setAttribute('contenteditable', 'false');
    
    // 표시할 파일명 결정 (임시 이미지인 경우 파일명 표시, 아니면 filename 그대로)
    const displayName = filename.startsWith('temp_') 
      ? (pendingImages.get(filename)?.name || '새 이미지')
      : filename;
    
    imageMarkerElement.innerHTML = `
      <span class="image-marker-filename">${displayName}</span>
      <button class="image-marker-delete" type="button" data-filename="${filename}">×</button>
    `;
    
    // 삭제 버튼 이벤트 리스너 추가
    const deleteButton = imageMarkerElement.querySelector('.image-marker-delete');
    if (deleteButton) {
      deleteButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleImageMarkerDelete(filename, true); // x 버튼 클릭임을 표시
      });
    }
    
    // 현재 커서 위치에 마커 삽입
    range.insertNode(imageMarkerElement);
    
    // 커서를 마커 뒤로 이동
    range.setStartAfter(imageMarkerElement);
    range.setEndAfter(imageMarkerElement);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // formContent 업데이트
    updateFormContentFromEditor();

    // 플래그 해제 (약간의 지연을 두어 MutationObserver가 안정적으로 동작하도록)
    setTimeout(() => {
      isRenderingRef.current = false;
    }, 200);
  };

  // HTML을 Markdown으로 변환
  const htmlToMarkdown = (html: string): string => {
    // 임시 div에 HTML 삽입
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const processNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        
        // 이미지 마커 처리
        if (element.classList.contains('image-marker')) {
          const filename = element.getAttribute('data-filename');
          if (filename) {
            return `[image]{${filename}}`;
          }
          return '';
        }
        
        // 이미지 마커 내부 요소는 무시
        if (element.closest('.image-marker') && !element.classList.contains('image-marker')) {
          return '';
        }
        
        const tagName = element.tagName.toLowerCase();
        let content = '';
        
        // 자식 노드 처리
        for (let i = 0; i < element.childNodes.length; i++) {
          content += processNode(element.childNodes[i]);
        }
        
        // 태그에 따른 Markdown 변환
        if (tagName === 'strong' || tagName === 'b') {
          return `**${content}**`;
        } else if (tagName === 'u') {
          return `<u>${content}</u>`;
        } else if (tagName === 'br') {
          return '\n';
        } else if (tagName === 'div' || tagName === 'p') {
          // 이미지 마커만 포함된 경우 줄바꿈 추가하지 않음
          const hasImageMarker = element.querySelector('.image-marker') !== null;
          if (hasImageMarker) {
            return content;
          }
          // div/p 앞뒤 줄바꿈 처리
          const prefix = element.previousSibling ? '\n' : '';
          const suffix = element.nextSibling ? '\n' : '';
          return prefix + content + suffix;
        }
        
        return content;
      }
      return '';
    };
    
    let result = '';
    for (let i = 0; i < tempDiv.childNodes.length; i++) {
      result += processNode(tempDiv.childNodes[i]);
    }
    
    return result;
  };

  // contentEditable의 내용을 formContent에 반영하고 결과 반환 (Markdown 형식)
  const updateFormContentFromEditor = (): string => {
    const editor = textareaRef.current;
    if (!editor) return formContent || '';

    // HTML을 Markdown으로 변환
    const markdown = htmlToMarkdown(editor.innerHTML);
    setFormContent(markdown);
    return markdown;
  };

  // 이미지 마커 삭제 핸들러 (임시 삭제 - 저장 버튼 클릭 시 일괄 삭제)
  const handleImageMarkerDelete = (filename: string, isButtonClick: boolean = false) => {
    console.log('[handleImageMarkerDelete] 삭제 요청:', { filename, diaryId: diary?.id, isButtonClick });

    // filename 유효성 검사
    if (!filename || filename.trim().length === 0) {
      console.error('[handleImageMarkerDelete] filename이 비어있음');
      alert('이미지 파일명을 찾을 수 없습니다.');
      return;
    }

    const editor = textareaRef.current;
    if (!editor) return;

    // x 버튼 클릭인 경우: DOM에서 마커 요소 직접 제거
    if (isButtonClick) {
      const markerElement = editor.querySelector(`.image-marker[data-filename="${filename}"]`);
      if (markerElement) {
        // 플래그 설정 (MutationObserver에서 중복 삭제 방지)
        deletingByButtonRef.current.add(filename);
        
        // DOM에서 마커 제거
        markerElement.remove();
        
        // 플래그 해제
        setTimeout(() => {
          deletingByButtonRef.current.delete(filename);
        }, 200);
      }
    }

    // 임시 이미지인지 확인 (temp_로 시작)
    const isTempImage = filename.startsWith('temp_');
    
    if (isTempImage) {
      // 임시 이미지인 경우: 로컬에서만 삭제
      setPendingImages(prev => {
        const newMap = new Map(prev);
        newMap.delete(filename);
        return newMap;
      });
    } else {
      // 서버에 저장된 이미지인 경우: pendingDeletions에 추가 (저장 시 일괄 삭제)
      setPendingDeletions(prev => {
        const newSet = new Set(prev);
        newSet.add(filename);
        return newSet;
      });
    }
    
    // 에디터 내용 업데이트 (마커가 제거된 상태 반영)
    updateFormContentFromEditor();
  };

  // Markdown을 HTML로 변환
  const markdownToHtml = (markdown: string): string => {
    // 이미지 마커와 텍스트를 분리
    const imageMarkerRegex = /\[image\]\{([^}]+)\}/g;
    const parts: Array<{ type: 'text' | 'image'; content: string; filename?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = imageMarkerRegex.exec(markdown)) !== null) {
      // 마커 이전의 텍스트
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: markdown.substring(lastIndex, match.index),
        });
      }
      
      // 이미지 마커
      parts.push({
        type: 'image',
        content: match[0],
        filename: match[1],
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // 마지막 마커 이후의 텍스트
    if (lastIndex < markdown.length) {
      parts.push({
        type: 'text',
        content: markdown.substring(lastIndex),
      });
    }
    
    // 블록이 없으면 전체 텍스트
    if (parts.length === 0) {
      parts.push({ type: 'text', content: markdown });
    }

    // 각 부분을 HTML로 변환
    let html = '';
    parts.forEach((part) => {
      if (part.type === 'image' && part.filename) {
        // 이미지 마커는 그대로 유지
        html += `<span class="image-marker" data-filename="${part.filename}" contenteditable="false">
          <span class="image-marker-filename">${part.filename.startsWith('temp_') ? (pendingImages.get(part.filename)?.name || '새 이미지') : part.filename}</span>
          <button class="image-marker-delete" type="button" data-filename="${part.filename}">×</button>
        </span>`;
      } else {
        // Markdown을 HTML로 변환
        let text = part.content;
        
        // 볼드 처리 (**text**)
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        
        // 밑줄 처리 (<u>text</u>)
        text = text.replace(/<u>(.+?)<\/u>/g, '<u>$1</u>');
        
        // 줄바꿈 처리
        text = text.replace(/\n/g, '<br>');
        
        html += text;
      }
    });
    
    return html;
  };

  // contentEditable에 내용 렌더링 (Markdown을 HTML로 변환)
  const renderContentToEditor = (content: string) => {
    const editor = textareaRef.current;
    if (!editor) return;

    // 렌더링 시작 플래그 설정
    isRenderingRef.current = true;

    // Markdown을 HTML로 변환
    const html = markdownToHtml(content);
    editor.innerHTML = html;

    // 삭제 버튼 이벤트 리스너 추가
    editor.querySelectorAll('.image-marker-delete').forEach((button) => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const filename = button.getAttribute('data-filename');
        if (filename) {
          handleImageMarkerDelete(filename, true); // x 버튼 클릭임을 표시
        }
      });
    });

    // 렌더링 완료 플래그 해제 (약간의 지연을 두어 MutationObserver가 안정적으로 동작하도록)
    // 지연 시간을 늘려서 MutationObserver가 DOM 변경을 잘못 감지하지 않도록 함
    setTimeout(() => {
      isRenderingRef.current = false;
    }, 500);
  };

  // 이미지 업로드 핸들러 (임시 저장)
  const handleImageUpload = async (file: File) => {
    // 이미지 파일인지 확인
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // 파일 크기 확인 (5MB = 5 * 1024 * 1024 bytes)
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxFileSize) {
      alert('파일 크기는 5MB를 초과할 수 없습니다.');
      return;
    }

    // 임시 ID 생성 (타임스탬프 + 랜덤)
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // 임시 이미지 저장
    setPendingImages(prev => {
      const newMap = new Map(prev);
      newMap.set(tempId, file);
      return newMap;
    });

    // 에디터에 임시 마커 추가
    insertImageMarker(tempId);
  };

  // Drag & Drop 핸들러
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // 업로드/삭제 중이면 드래그 무시
    if (isUploading || isDeleting) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // 업로드/삭제 중이면 무시
    if (isUploading || isDeleting) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    // 업로드/삭제 중이면 드롭 무시
    if (isUploading || isDeleting) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    imageFiles.forEach(file => {
      handleImageUpload(file);
    });
  };

  // Paste 핸들러
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // 업로드/삭제 중이면 붙여넣기 무시
    if (isUploading || isDeleting) {
      e.preventDefault();
      return;
    }
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length === 0) {
      return; // 이미지가 아니면 기본 동작 수행
    }

    e.preventDefault();
    
    imageItems.forEach(item => {
      const file = item.getAsFile();
      if (file) {
        handleImageUpload(file);
      }
    });
  };

  // contentEditable 입력 핸들러
  const handleEditorInput = () => {
    // 업로드/삭제 중이면 입력 무시
    if (isUploading || isDeleting) {
      return;
    }
    updateFormContentFromEditor();
  };

  // 키보드로 이미지 마커 삭제 감지
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // 업로드/삭제 중이면 키보드 입력 무시
    if (isUploading || isDeleting) {
      e.preventDefault();
      return;
    }
    // Delete 또는 Backspace 키를 눌렀을 때
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const editor = textareaRef.current;
      if (!editor) return;

      // 삭제될 노드 확인
      let nodeToDelete: Node | null = null;
      
      if (e.key === 'Delete') {
        // Delete 키: 커서 뒤의 노드 삭제
        nodeToDelete = range.endContainer.nextSibling || 
                      (range.endContainer.parentElement?.nextSibling || null);
      } else if (e.key === 'Backspace') {
        // Backspace 키: 커서 앞의 노드 삭제
        if (range.startOffset === 0) {
          // 텍스트 노드의 시작이면 이전 형제 노드 확인
          nodeToDelete = range.startContainer.previousSibling || 
                        (range.startContainer.parentElement?.previousSibling || null);
        }
      }

      // 이미지 마커인지 확인
      if (nodeToDelete) {
        const element = nodeToDelete.nodeType === Node.ELEMENT_NODE 
          ? nodeToDelete as HTMLElement 
          : nodeToDelete.parentElement;
        
        if (element && element.classList?.contains('image-marker')) {
          const filename = element.getAttribute('data-filename');
          if (filename) {
            e.preventDefault();
            handleImageMarkerDelete(filename);
            return;
          }
        }
      }

      // 선택된 영역이 이미지 마커를 포함하는지 확인
      const commonAncestor = range.commonAncestorContainer;
      const imageMarker = (commonAncestor.nodeType === Node.ELEMENT_NODE 
        ? commonAncestor as HTMLElement 
        : commonAncestor.parentElement)?.closest('.image-marker');
      
      if (imageMarker) {
        const filename = imageMarker.getAttribute('data-filename');
        if (filename) {
          e.preventDefault();
          handleImageMarkerDelete(filename);
        }
      }
    }
  };

  // 저장
  const handleSave = async () => {
    if (!tradingHistory?.id) return;

    setIsSaving(true);
    setIsUploading(true);
    // 저장 중에는 MutationObserver가 동작하지 않도록 플래그 설정
    isRenderingRef.current = true;
    try {
      // 저장 전에 contentEditable의 최신 내용을 가져와서 사용
      let currentContent = updateFormContentFromEditor();
      
      // 일지가 없으면 먼저 생성
      let currentDiaryId = diary?.id;
      if (!currentDiaryId) {
        const requestData = {
          tradingHistoryId: tradingHistory.id,
          tradingMind: formTradingMind,
          content: undefined,
        };
        const newDiary = await diaryService.create(requestData);
        currentDiaryId = newDiary.id;
        setDiary(newDiary);
      }
      
      // 삭제할 이미지들을 일괄 삭제
      if (pendingDeletions.size > 0) {
        setIsDeleting(true);
        try {
          for (const filename of pendingDeletions) {
            try {
              console.log('[handleSave] 이미지 삭제 요청:', { diaryId: currentDiaryId, filename });
              await diaryService.deleteImage(currentDiaryId, filename);
            } catch (error) {
              console.error(`[IndividualTradingHistoryPanel] 이미지 삭제 실패 (${filename}):`, error);
              alert(`이미지 삭제에 실패했습니다: ${filename}`);
              throw error;
            }
          }
        } finally {
          setIsDeleting(false);
        }
      }
      
      // 임시 이미지들을 일괄 업로드하고 임시 ID를 실제 filename으로 교체
      const tempIdToFilenameMap = new Map<string, string>();
      
      if (pendingImages.size > 0) {

        setIsUploading(true);
        try {
          // 임시 이미지들을 순차적으로 업로드
          for (const [tempId, file] of pendingImages.entries()) {
            try {
              const updatedDiary = await diaryService.uploadImage(currentDiaryId, file);
              
              // 서버 응답에서 새로 추가된 이미지의 filename 추출
              if (updatedDiary.content) {
                try {
                  const parsed: ParsedDiaryContent = JSON.parse(updatedDiary.content);
                  const blocks = parsed.blocks || [];
                  
                  // 마지막 image 블록 찾기 (새로 추가된 것)
                  for (let i = blocks.length - 1; i >= 0; i--) {
                    const block = blocks[i];
                    if (block.type === 'image' && block.path) {
                      const filename = block.path.split('/').pop() || '';
                      tempIdToFilenameMap.set(tempId, filename);
                      break;
                    }
                  }
                } catch (e) {
                  console.error('Content 파싱 실패:', e);
                }
              }
            } catch (error) {
              console.error(`[IndividualTradingHistoryPanel] 임시 이미지 업로드 실패 (${tempId}):`, error);
              alert(`이미지 업로드에 실패했습니다: ${file.name}`);
              throw error;
            }
          }
        } finally {
          setIsUploading(false);
        }
        
        // content에서 임시 ID를 실제 filename으로 교체
        if (currentContent) {
          for (const [tempId, filename] of tempIdToFilenameMap.entries()) {
            currentContent = currentContent.replace(
              new RegExp(`\\[image\\]\\{${tempId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g'),
              `[image]{${filename}}`
            );
          }
        }
      }
      
      // content를 JSONB 형식으로 변환 (마커 텍스트를 blocks로 변환)
      let contentJson: string | undefined = undefined;
      if (currentContent !== null && currentContent !== undefined && currentContent.length > 0) {
        const diaryId = diary?.id || 0; // 일지가 없으면 0 (생성 시에는 서버에서 처리)
        const parsedContent = textToContentBlocks(currentContent, diaryId);
        // 디버깅: 변환된 내용 확인
        console.log('저장할 content:', JSON.stringify(parsedContent, null, 2));
        contentJson = JSON.stringify(parsedContent);
      }

      const requestData = {
        tradingHistoryId: tradingHistory.id,
        tradingMind: formTradingMind,
        content: contentJson,
      };

      let savedDiary: DiaryResponse;
      if (diary?.id) {
        // 수정
        savedDiary = await diaryService.update(diary.id, requestData);
      } else {
        // 생성
        savedDiary = await diaryService.create(requestData);
      }

      // 임시 이미지 목록 및 삭제 목록 초기화
      setPendingImages(new Map());
      setPendingDeletions(new Set());
      
      // 원본 데이터 초기화
      originalDataRef.current = null;

      // 편집 모드를 먼저 닫아서 MutationObserver를 disconnect (렌더링 모드로 전환)
      setIsEditMode(false);
      
      // contentEditable 즉시 초기화 (편집 모드가 닫힌 후, observer가 disconnect된 후)
      if (textareaRef.current) {
        textareaRef.current.innerHTML = '';
      }
      
      // 저장된 diary로 상태 업데이트 (렌더링 모드에서 올바른 데이터 표시)
      setDiary(savedDiary);
      
      // formContent와 formTradingMind를 저장된 diary의 값으로 업데이트
      if (savedDiary.content) {
        const textContent = parseContentToText(savedDiary.content);
        setFormContent(textContent);
      } else {
        setFormContent('');
      }
      setFormTradingMind(savedDiary.tradingMind ?? null);
      
      // 저장 완료 후 플래그 해제
      setTimeout(() => {
        isRenderingRef.current = false;
      }, 100);
    } catch (error) {
      console.error('[IndividualTradingHistoryPanel] 매매일지 저장 실패:', error);
      alert('매매일지 저장에 실패했습니다.');
      // 에러 발생 시에도 플래그 해제
      isRenderingRef.current = false;
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
        <div className="individual-trading-history-panel-header">
          <div className="individual-trading-history-panel-header-left">
            <h3 className="individual-trading-history-panel-title">매매일지</h3>
            <div className="individual-trading-history-trade-time">
              {formatTradeTime(tradingHistory.tradeTime)}
            </div>
          </div>
          <div className="individual-trading-history-panel-header-right">
            {!isEditMode && (
              <button
                className="individual-trading-history-write-button-header"
                onClick={handleEditClick}
                aria-label="작성하기"
              >
                📝
              </button>
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
                      {coin?.exchange || '-'}
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
                <label className="individual-trading-history-diary-edit-label">투자심리</label>
                <select
                  className="individual-trading-history-diary-edit-select"
                  value={formTradingMind ?? ''}
                  onChange={(e) => setFormTradingMind(e.target.value === '' ? null : Number(e.target.value))}
                >
                  <option value="">선택 안함</option>
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
                  className={`individual-trading-history-diary-edit-textarea ${isDragOver ? 'drag-over' : ''} ${isUploading || isDeleting ? 'disabled' : ''}`}
                  contentEditable={!isUploading && !isDeleting}
                  onInput={handleEditorInput}
                  onKeyDown={handleKeyDown}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onPaste={handlePaste}
                  data-placeholder="매매시 고려한 점을 입력해서 매매일지를 작성해보세요.                                     (이미지를 드래그하거나 붙여넣을 수 있습니다)"
                  suppressContentEditableWarning
                  style={{
                    pointerEvents: isUploading || isDeleting ? 'none' : 'auto',
                  }}
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
                        <h3 className="individual-trading-history-diary-value individual-trading-history-diary-value-mind">
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
                      📝
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

