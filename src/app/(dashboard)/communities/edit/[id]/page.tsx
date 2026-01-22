'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { communityService } from '@/features/community/services/communityService';
import { parseContentToText, textToContentBlocks } from '@/features/community/utils/contentParser';
import { Category } from '@/features/community/types';
import { useQueryClient } from '@tanstack/react-query';
import '../../write/page.css';

const categoryLabels: Record<Category, string> = {
  [Category.FREE]: '자유',
  [Category.GOOD_BAD_NEWS]: '호재/악재',
  [Category.PROFIT_PROOF]: '손익인증',
  [Category.CHART_ANALYSIS]: '차트분석',
  [Category.NEWS]: '뉴스',
};

export default function CommunityEditPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const id = params?.id ? parseInt(String(params.id)) : null;

  const { data: community, isLoading } = useCommunity(id);
  const [category, setCategory] = useState<Category | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingImages, setPendingImages] = useState<Map<string, File>>(new Map());
  const [pendingDeletions, setPendingDeletions] = useState<Set<string>>(new Set());
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  
  // 기존 상태 저장
  const originalStateRef = useRef<{
    category: Category | null;
    title: string;
    hashtags: string[];
    blocks: any[];
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (community) {
      if (user?.userId !== community.userId) {
        router.push(`/communities/${community.id}`);
        return;
      }

      setCategory(community.category as Category);
      setTitle(community.title);
      setHashtags(community.hashtags || []);
      
      // content를 마커 텍스트로 변환하여 상태에 저장
      const contentText = parseContentToText(community.content);
      setContent(contentText);
      
      // 기존 상태 저장 (blocks 구조 포함)
      try {
        const parsed = JSON.parse(community.content || '{}');
        originalStateRef.current = {
          category: community.category as Category,
          title: community.title,
          hashtags: community.hashtags || [],
          blocks: parsed.blocks || []
        };
      } catch {
        originalStateRef.current = {
          category: community.category as Category,
          title: community.title,
          hashtags: community.hashtags || [],
          blocks: []
        };
      }
      
      // 에디터에 텍스트 + 이미지 렌더링 (작성 페이지와 동일하게 이미지 미리보기 사용)
      if (editorRef.current) {
        renderContentToEditor(contentText, community.id);
      }
    }
  }, [community, user, router]);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };

    if (categoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [categoryDropdownOpen]);

  const handleCategorySelect = (selectedCategory: Category) => {
    setCategory(selectedCategory);
    setCategoryDropdownOpen(false);
  };

  const handleImageUpload = async (file: File) => {
    if (!id) return;

    // 파일 크기 확인 (5MB = 5,242,880 바이트)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      alert('이미지 파일 크기는 5MB를 초과할 수 없습니다.');
      return;
    }

    // 이미지 개수 확인 (에디터 내 이미지 블록만 카운트)
    const currentImageCount = editorRef.current?.querySelectorAll('.write-image-block').length || 0;
    if (currentImageCount >= 5) {
      alert('이미지는 최대 5개까지 추가할 수 있습니다.');
      return;
    }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    setPendingImages(prev => new Map(prev).set(tempId, file));

    // contentEditable에 이미지 미리보기 삽입
    if (editorRef.current) {
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
          
          const editorWidth = editorRef.current?.clientWidth || 800;
          const maxDisplayWidth = editorWidth - 36;
          
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

          container.remove();
          setPendingImages(prev => {
            const next = new Map(prev);
            next.delete(tempId);
            return next;
          });

          updateContentFromEditor();
        };

        container.appendChild(img);
        container.appendChild(removeButton);

        range.insertNode(container);
        range.setStartAfter(container);
        selection.removeAllRanges();
        selection.addRange(range);

        updateContentFromEditor();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
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

  const handleDrop = (e: React.DragEvent) => {
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

  const updateContentFromEditor = () => {
    const editor = editorRef.current;
    if (!editor) return;

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
    setContent(text);
  };

  const renderContentToEditor = (text: string, communityId: number) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    editor.innerHTML = '';

    const fragment = document.createDocumentFragment();
    const imageMarkerRegex = /\[image\]\{([^}]+)\}/g;
    let lastIndex = 0;
    let match;

    const appendText = (raw: string) => {
      if (!raw) return;
      const parts = raw.split('\n');
      parts.forEach((part, index) => {
        if (part.length > 0) {
          fragment.appendChild(document.createTextNode(part));
        }
        if (index < parts.length - 1) {
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

        const img = document.createElement('img');
        img.className = 'write-image';
        img.src = communityService.getImageUrl(communityId, filename);
        img.alt = filename;
        
        img.onload = () => {
          const naturalWidth = img.naturalWidth;
          const naturalHeight = img.naturalHeight;
          
          const editorWidth = editorRef.current?.clientWidth || 800;
          const maxDisplayWidth = editorWidth - 36;
          
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

          // DOM에서 이미지 블록 제거 (프론트엔드에서만)
          container.remove();
          
          // pendingDeletions에 추가 (수정 버튼 클릭 시 일괄 삭제)
          setPendingDeletions(prev => new Set(prev).add(filename));

          // 내용 갱신
          updateContentFromEditor();
        };

        container.appendChild(img);
        container.appendChild(removeButton);
        fragment.appendChild(container);
      }

      lastIndex = match.index + match[0].length;
    }

    const remainingText = text.substring(lastIndex);
    appendText(remainingText);

    editor.appendChild(fragment);
  };

  const handleHashtagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = hashtagInput.trim().replace(/^#/, '');
      if (tag && !hashtags.includes(tag)) {
        if (hashtags.length >= 5) {
          alert('해시태그는 최대 5개까지 추가할 수 있습니다.');
          return;
        }
        setHashtags([...hashtags, tag]);
        setHashtagInput('');
      }
    }
  };

  const removeHashtag = (tagToRemove: string) => {
    setHashtags(hashtags.filter(tag => tag !== tagToRemove));
  };

  // 수정 사항이 있는지 확인하는 함수
  const checkForChanges = (): boolean => {
    if (!originalStateRef.current || !editorRef.current) {
      return false;
    }

    const editor = editorRef.current;
    const newBlocks = extractBlocksFromEditor(editor, id || 0);

    const newState = {
      category: category,
      title: title,
      hashtags: hashtags,
      blocks: newBlocks
    };

    return (
      originalStateRef.current.category !== newState.category ||
      originalStateRef.current.title !== newState.title ||
      JSON.stringify([...originalStateRef.current.hashtags].sort()) !== JSON.stringify([...newState.hashtags].sort()) ||
      JSON.stringify(originalStateRef.current.blocks) !== JSON.stringify(newState.blocks) ||
      pendingImages.size > 0
    );
  };

  // 취소 버튼 핸들러
  const handleCancel = () => {
    if (checkForChanges()) {
      if (confirm('수정 사항이 있습니다. 정말 취소하시겠습니까?')) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  // 페이지 이탈 시 확인
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (checkForChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [category, title, hashtags, pendingImages]);

  // 에디터에서 blocks 추출하는 함수 (새 게시글 작성과 동일한 방식)
  const extractBlocksFromEditor = (editor: HTMLDivElement, communityId: number): any[] => {
    // 1. 에디터를 클론하고 이미지 블록을 마커로 변환 (write 페이지와 동일)
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

    // 4. 텍스트를 blocks로 변환 (write 페이지와 동일: textToContentBlocks 사용)
    const parsed = textToContentBlocks(text, communityId);
    return parsed.blocks;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id || !title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    // 제목 바이트 수 확인 (100byte = 한글 33자 제한)
    const titleBytes = new TextEncoder().encode(title).length;
    if (titleBytes > 100) {
      alert('제목은 100byte 이하로 작성해주세요. (한글 33자)');
      return;
    }

    if (!category) {
      alert('카테고리를 선택해주세요.');
      return;
    }

    // 1. 기존 상태 확인
    if (!originalStateRef.current) {
      alert('기존 상태를 불러올 수 없습니다.');
      return;
    }

    // 2. 새로운 상태 생성 (에디터에서 직접 읽기)
    const editor = editorRef.current;
    if (!editor) {
      alert('에디터를 찾을 수 없습니다.');
      return;
    }

    const newBlocks = extractBlocksFromEditor(editor, id);
    
    // 새로운 상태
    const newState = {
      category: category,
      title: title,
      hashtags: hashtags,
      blocks: newBlocks
    };

    // 2-1. 변경사항 확인
    const hasChanges = 
      originalStateRef.current.category !== newState.category ||
      originalStateRef.current.title !== newState.title ||
      JSON.stringify(originalStateRef.current.hashtags.sort()) !== JSON.stringify(newState.hashtags.sort()) ||
      JSON.stringify(originalStateRef.current.blocks) !== JSON.stringify(newState.blocks);

    if (!hasChanges) {
      alert('변경사항이 없습니다.');
      return;
    }

    setIsSubmitting(true);
    setIsUploading(true);

    try {
      // 2-2-1. 새로 추가된 이미지 확인 및 MinIO 저장
      const tempIdToFilenameMap = new Map<string, string>();
      if (pendingImages.size > 0) {
        for (const [tempId, file] of pendingImages.entries()) {
          try {
            // 이미지 업로드 (서버에서 content를 업데이트하지만, 우리는 무시하고 filename만 추출)
            const updatedCommunity = await communityService.uploadImage(id, file);

            // 서버 응답의 content를 파싱해서 마지막에 추가된 이미지의 filename 추출
            // 서버의 content 업데이트는 무시하고, filename만 사용
            if (updatedCommunity.content) {
              try {
                const parsed = JSON.parse(updatedCommunity.content);
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

      // 2-2-2. 새로운 blocks에서 tempId를 실제 filename으로 교체
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
                path: `@communityImage/${id}/${actualFilename}`
              };
            }
          }
        }
        return block;
      });

      // 최종 blocks를 JSON 문자열로 변환
      const contentJson = JSON.stringify({ blocks: finalBlocks });

      // 게시글 업데이트 (새로운 API 사용: 삭제된 이미지는 서버에서 자동으로 처리)
      await communityService.updateContent(id, {
        category: newState.category,
        title: newState.title,
        content: contentJson,
        hashtags: newState.hashtags,
      });

      // 캐시 무효화 후 상세 페이지로 이동 (서버에서 다시 GET)
      await queryClient.invalidateQueries({ queryKey: ['community', id] });
      await queryClient.invalidateQueries({ queryKey: ['communities'] });

      router.push(`/communities/${id}`);
    } catch (error) {
      console.error('게시글 수정 실패:', error);
      alert('게시글 수정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto pt-8 pb-8">
        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(0, 19, 43, 0.6)', fontFamily: 'Pretendard, sans-serif' }}>
          로딩 중...
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="container mx-auto pt-8 pb-8">
        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(0, 19, 43, 0.6)', fontFamily: 'Pretendard, sans-serif' }}>
          게시글을 불러오는데 실패했습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto pt-8 pb-8">
      <div className="community-write">
        <div className="write-header">
          <button
            type="button"
            onClick={handleCancel}
            className="write-back-button"
          >
            &lt;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="write-form">
          {/* 프로필 및 폼 컨텐츠 래퍼 */}
          <div className="write-form-wrapper">
            {/* 프로필 사진 */}
            <div className="write-form-profile">
              <div className="comment-profile-image">
                <span className="comment-profile-initial">
                  {user?.nickname ? user.nickname.charAt(0).toUpperCase() : '익'}
                </span>
              </div>
            </div>

            {/* 폼 컨텐츠 */}
            <div className="write-form-content">
              {/* 제목 및 카테고리 선택 + 내용 에디터 */}
              <div className="form-group form-group-title-category">
                <div className="title-category-wrapper">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  // 바이트 수 확인 (100byte = 한글 33자 제한)
                  const titleBytes = new TextEncoder().encode(newTitle).length;
                  if (titleBytes > 100) {
                    alert('제목은 100byte 이하로 작성해주세요. (한글 33자)');
                    // 현재 제목을 100바이트 이하로 자르기
                    let truncatedTitle = newTitle;
                    while (new TextEncoder().encode(truncatedTitle).length > 100 && truncatedTitle.length > 0) {
                      truncatedTitle = truncatedTitle.slice(0, -1);
                    }
                    setTitle(truncatedTitle);
                    return;
                  }
                  setTitle(newTitle);
                }}
                className="form-input"
                placeholder="제목을 입력하세요"
                required
              />
              <div className="write-category-dropdown" ref={categoryDropdownRef}>
                <button
                  type="button"
                  onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  className={`write-category-button ${!category ? 'write-category-button-placeholder' : ''}`}
                >
                  {category ? categoryLabels[category] : '카테고리 선택'}{' '}
                  <span className={`write-dropdown-arrow ${categoryDropdownOpen ? 'open' : ''}`}>▼</span>
                </button>
                {categoryDropdownOpen && (
                  <div className="write-category-menu">
                    {Object.values(Category).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategorySelect(cat)}
                        className={`write-category-menu-item ${category === cat ? 'active' : ''}`}
                      >
                        {categoryLabels[cat]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div
              ref={editorRef}
              contentEditable
              className="form-editor"
              onInput={updateContentFromEditor}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              data-placeholder="내용을 입력하세요. 이미지를 드래그하거나 붙여넣을 수 있습니다."
            />
            {isUploading && (
              <div className="upload-indicator">이미지 업로드 중...</div>
            )}
          </div>

          {/* 해시태그 및 버튼 */}
          <div className="form-group-hashtag-actions-wrapper">
            {/* 해시태그 */}
            <div className="form-group-hashtag-input">
              <input
                type="text"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyPress={handleHashtagKeyPress}
                className="form-input"
                placeholder="해시태그를 입력하고 Enter 또는 쉼표를 누르세요"
              />
              {hashtags.length > 0 && (
                <div className="hashtags-list">
                  {hashtags.map((tag, index) => (
                    <span key={index} className="hashtag-tag">
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeHashtag(tag)}
                        className="hashtag-remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 버튼 */}
            <div className="form-actions">
              <button
                type="submit"
                className="form-button-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? '수정 중...' : '게시글 수정'}
              </button>
            </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
