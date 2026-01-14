'use client';

import { useState, useEffect, useRef } from 'react';
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

export default function IndividualTradingHistoryPanel({
  tradingHistory,
  onClose,
}: IndividualTradingHistoryPanelProps) {
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

  // 작성하기 모드로 전환
  const handleEditClick = () => {
    // 현재 diary의 content를 텍스트로 변환해서 폼에 설정
    if (diary?.content) {
      const textContent = parseContentToText(diary.content);
      setFormContent(textContent);
      // contentEditable에 렌더링
      setTimeout(() => {
        renderContentToEditor(textContent);
      }, 0);
    }
    setIsEditMode(true);
  };

  // 작성 취소
  const handleCancel = () => {
    setIsEditMode(false);
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
    imageMarkerElement.innerHTML = `
      <span class="image-marker-filename">${filename}</span>
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

  // contentEditable의 내용을 formContent에 반영하고 결과 반환
  const updateFormContentFromEditor = (): string => {
    const editor = textareaRef.current;
    if (!editor) return formContent || '';

    // contentEditable의 HTML을 파싱해서 이미지 마커를 찾고 텍스트로 변환
    // 줄바꿈을 정확히 보존하기 위해 HTML 구조를 직접 파싱
    const processNode = (node: Node): string => {
      let result = '';
      
      if (node.nodeType === Node.TEXT_NODE) {
        // 텍스트 노드는 그대로 추가
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
        
        // 줄바꿈을 생성하는 요소들 처리
        if (tagName === 'br') {
          return '\n';
        } else if (tagName === 'div' || tagName === 'p') {
          // div나 p 태그는 줄바꿈으로 변환
          // 단, 이미지 마커만 포함된 경우는 줄바꿈을 추가하지 않음
          let content = '';
          for (let i = 0; i < element.childNodes.length; i++) {
            content += processNode(element.childNodes[i]);
          }
          
          // 이미지 마커가 포함된 div/p인지 확인
          const hasImageMarker = element.querySelector('.image-marker') !== null;
          
          // 이미지 마커가 포함된 경우 줄바꿈 추가하지 않음 (자식 노드의 내용만 반환)
          // contentEditable이 이미지 마커를 자동으로 div/p로 감싸는 경우를 방지
          if (hasImageMarker) {
            return content;
          }
          
          // div/p 앞에 줄바꿈 추가 (이전 형제가 있는 경우)
          if (element.previousSibling) {
            result = '\n';
          }
          result += content;
          // div/p 뒤에 줄바꿈 추가 (다음 형제가 있는 경우)
          if (element.nextSibling) {
            result += '\n';
          }
          
          return result;
        } else {
          // 기타 요소는 자식 노드만 처리
          for (let i = 0; i < element.childNodes.length; i++) {
            result += processNode(element.childNodes[i]);
          }
          return result;
        }
      }
      
      return '';
    };
    
    // editor의 모든 자식 노드를 처리
    let result = '';
    for (let i = 0; i < editor.childNodes.length; i++) {
      result += processNode(editor.childNodes[i]);
    }

    setFormContent(result);
    return result;
  };

  // 이미지 마커 삭제 핸들러
  const handleImageMarkerDelete = async (filename: string, isButtonClick: boolean = false) => {
    if (!diary?.id) {
      alert('일지가 없어 이미지를 삭제할 수 없습니다.');
      return;
    }

    console.log('[handleImageMarkerDelete] 삭제 요청:', { filename, diaryId: diary.id, isButtonClick });

    // filename 유효성 검사
    if (!filename || filename.trim().length === 0) {
      console.error('[handleImageMarkerDelete] filename이 비어있음');
      alert('이미지 파일명을 찾을 수 없습니다.');
      return;
    }

    // x 버튼 클릭인 경우 플래그 설정
    if (isButtonClick) {
      deletingByButtonRef.current.add(filename);
    }

    setIsDeleting(true);
    try {
      // 서버에 삭제 요청
      console.log('[handleImageMarkerDelete] 서버에 삭제 요청 전송:', { diaryId: diary.id, filename });
      const updatedDiary = await diaryService.deleteImage(diary.id, filename);
      
      // 업데이트된 diary의 content를 텍스트로 변환
      const textContent = parseContentToText(updatedDiary.content);
      
      // formContent를 서버에서 받은 정확한 내용으로 업데이트
      setFormContent(textContent);
      
      // contentEditable을 완전히 초기화하고 서버 응답으로 다시 렌더링
      if (textareaRef.current) {
        // 완전히 초기화
        textareaRef.current.innerHTML = '';
        // 서버에서 받은 정확한 content로 다시 렌더링
        renderContentToEditor(textContent);
      }
      
      // diary 상태 업데이트
      setDiary(updatedDiary);
    } catch (error) {
      console.error('[IndividualTradingHistoryPanel] 이미지 삭제 실패:', error);
      alert('이미지 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
      // 플래그 제거
      if (isButtonClick) {
        setTimeout(() => {
          deletingByButtonRef.current.delete(filename);
        }, 200);
      }
    }
  };

  // contentEditable에 내용 렌더링 (이미지 마커를 시각적 컴포넌트로)
  const renderContentToEditor = (content: string) => {
    const editor = textareaRef.current;
    if (!editor) return;

    // 렌더링 시작 플래그 설정
    isRenderingRef.current = true;

    // content를 파싱해서 이미지 마커를 찾고 시각적으로 렌더링
    const imageMarkerRegex = /\[image\]\{([^}]+)\}/g;
    const parts: Array<{ type: 'text' | 'image'; content: string; filename?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = imageMarkerRegex.exec(content)) !== null) {
      // 마커 이전의 텍스트
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.substring(lastIndex, match.index),
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
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex),
      });
    }
    
    // 블록이 없으면 전체 텍스트
    if (parts.length === 0) {
      parts.push({ type: 'text', content });
    }

    // contentEditable에 렌더링
    editor.innerHTML = '';
    parts.forEach((part) => {
      if (part.type === 'text') {
        const textNode = document.createTextNode(part.content);
        editor.appendChild(textNode);
      } else if (part.type === 'image' && part.filename) {
        const imageMarkerElement = document.createElement('span');
        imageMarkerElement.className = 'image-marker';
        imageMarkerElement.setAttribute('data-filename', part.filename);
        imageMarkerElement.setAttribute('contenteditable', 'false');
        imageMarkerElement.innerHTML = `
          <span class="image-marker-filename">${part.filename}</span>
          <button class="image-marker-delete" type="button" data-filename="${part.filename}">×</button>
        `;
        editor.appendChild(imageMarkerElement);
      }
    });

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

  // 이미지 업로드 핸들러
  const handleImageUpload = async (file: File) => {
    if (!diary?.id) {
      alert('먼저 일지를 저장해주세요.');
      return;
    }

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

    setIsUploading(true);
    try {
      const updatedDiary = await diaryService.uploadImage(diary.id, file);
      
      // 서버 응답에서 새로 추가된 이미지의 filename 추출
      if (updatedDiary.content) {
        try {
          const parsed: ParsedDiaryContent = JSON.parse(updatedDiary.content);
          const blocks = parsed.blocks || [];
          
          // 마지막 image 블록 찾기 (새로 추가된 것)
          for (let i = blocks.length - 1; i >= 0; i--) {
            const block = blocks[i];
            if (block.type === 'image' && block.path) {
              // 경로에서 filename 추출: @diaryImage/{diaryId}/{filename}
              const filename = block.path.split('/').pop() || '';
              
              // 새 마커만 추가 (기존 내용은 유지)
              insertImageMarker(filename);
              
              // diary 상태만 업데이트 (formContent는 insertImageMarker에서 updateFormContentFromEditor 호출로 업데이트됨)
              setDiary(updatedDiary);
              break;
            }
          }
        } catch (e) {
          console.error('Content 파싱 실패:', e);
          setDiary(updatedDiary);
        }
      } else {
        setDiary(updatedDiary);
      }
    } catch (error) {
      console.error('[IndividualTradingHistoryPanel] 이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
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
    // 저장 중에는 MutationObserver가 동작하지 않도록 플래그 설정
    isRenderingRef.current = true;
    try {
      // 저장 전에 contentEditable의 최신 내용을 가져와서 사용
      const currentContent = updateFormContentFromEditor();
      
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
              onClick={onClose}
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
                <label className="individual-trading-history-diary-edit-label">매매근거 & 고려사항</label>
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
                              {parsed.blocks.map((block, index) => {
                                if (block.type === 'text') {
                                  // 이전 블록이 이미지인지 확인
                                  const prevBlock = index > 0 ? parsed.blocks[index - 1] : null;
                                  const isAfterImage = prevBlock?.type === 'image';
                                  // 다음 블록이 이미지인지 확인
                                  const nextBlock = index < parsed.blocks.length - 1 ? parsed.blocks[index + 1] : null;
                                  const isBeforeImage = nextBlock?.type === 'image';
                                  
                                  // 이미지 앞뒤가 아닌 경우에만 marginBottom 적용
                                  const marginBottom = (!isAfterImage && !isBeforeImage) ? '8px' : '0';
                                  
                                  return (
                                    <div key={index} style={{ whiteSpace: 'pre-wrap', marginBottom }}>
                                      {block.content}
                                    </div>
                                  );
                                } else if (block.type === 'image' && block.path) {
                                  const filename = block.path.split('/').pop() || '';
                                  const imageKey = `${diary.id}_${filename}`;
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
                                }
                                return null;
                              })}
                            </div>
                          </div>
                        );
                      }
                    } catch {
                      // JSON이 아니면 그대로 사용
                    }
                    return (
                      <div className="individual-trading-history-diary-item">
                        <span className="individual-trading-history-diary-label">매매근거 & 고려사항</span>
                        <span className="individual-trading-history-diary-value individual-trading-history-diary-content">
                          {diary.content}
                        </span>
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
}

