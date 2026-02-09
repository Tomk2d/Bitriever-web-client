'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { communityService } from '@/features/community/services/communityService';
import { textToContentBlocks } from '@/features/community/utils/contentParser';
import { Category } from '@/features/community/types';
import './page.css';

const categoryLabels: Record<Category, string> = {
  [Category.FREE]: '자유',
  [Category.GOOD_BAD_NEWS]: '호재/악재',
  [Category.PROFIT_PROOF]: '손익인증',
  [Category.CHART_ANALYSIS]: '차트분석',
};

export default function CommunityWritePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const [category, setCategory] = useState<Category | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingImages, setPendingImages] = useState<Map<string, File>>(new Map());
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const getProfileImageUrl = (profileUrl: string | null | undefined) => {
    if (!profileUrl) return '/profile/profile1.png';
    return `/profile${profileUrl}.png`;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

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

    // 임시 ID 생성
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    setPendingImages(prev => new Map(prev).set(tempId, file));

    // contentEditable에 이미지 미리보기 삽입 (커뮤니티 작성 페이지 전용)
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
          // 원본 크기로 설정 (너무 크면 max-width로 제한)
          const naturalWidth = img.naturalWidth;
          const naturalHeight = img.naturalHeight;
          
          // 에디터 너비를 초과하지 않도록 조정
          const editorWidth = editorRef.current?.clientWidth || 800;
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

    // 에디터 DOM을 복제한 뒤, 이미지 블록만 토큰으로 치환하고
    // 블록 요소와 <br>을 명시적으로 \n으로 변환
    const clone = editor.cloneNode(true) as HTMLDivElement;

    const imageBlocks = clone.querySelectorAll('.write-image-block');
    imageBlocks.forEach((block) => {
      const tempId = block.getAttribute('data-temp-id');
      const token = tempId ? `[image]{${tempId}}` : '';
      const textNode = clone.ownerDocument.createTextNode(token);
      block.replaceWith(textNode);
    });

    // DOM을 순회하면서 블록 요소와 <br>을 \n으로 변환
    // 최상위 레벨의 블록 요소들 사이에만 줄바꿈 추가
    const serializeNode = (node: Node, isTopLevel: boolean = false): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }

      if (!(node instanceof HTMLElement)) {
        return '';
      }

      const tagName = node.tagName.toLowerCase();
      
      // <br> 태그는 줄바꿈으로 변환
      if (tagName === 'br') {
        return '\n';
      }

      // 블록 요소 처리
      if (['div', 'p'].includes(tagName)) {
        // 자식 노드 내용 추출
        let content = '';
        node.childNodes.forEach((child) => {
          content += serializeNode(child, false);
        });
        
        // 최상위 레벨에서만 블록 요소 사이에 줄바꿈 추가
        if (isTopLevel) {
          // 이전 형제가 있고, 이전 형제나 현재 블록에 내용이 있으면 줄바꿈 추가
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

      // 인라인 요소: 자식 노드만 처리
      let result = '';
      node.childNodes.forEach((child) => {
        result += serializeNode(child, false);
      });
      return result;
    };

    // 최상위 레벨 노드들을 순회하면서 블록 요소 사이에 줄바꿈 추가
    // Enter와 Shift+Enter 모두 동일하게 처리
    let text = '';
    const topLevelNodes = Array.from(clone.childNodes);
    let prevWasEmpty = false; // 이전 블록이 빈 블록이었는지 추적
    
    topLevelNodes.forEach((child, index) => {
      if (child instanceof HTMLElement && ['div', 'p'].includes(child.tagName.toLowerCase())) {
        // 블록 요소: 내용 추출
        let content = '';
        child.childNodes.forEach((grandchild) => {
          content += serializeNode(grandchild, false);
        });
        
        const isEmpty = content.trim().length === 0;
        
        // 이전 형제가 있으면 줄바꿈 추가
        // 단, 이전 블록이 빈 블록이고 현재 블록도 빈 블록이면 줄바꿈 추가 안 함 (연속된 빈 블록은 하나로 처리)
        if (index > 0) {
          if (!prevWasEmpty || !isEmpty) {
            text += '\n';
          }
        }
        
        // 빈 블록이 아니면 내용 추가
        if (!isEmpty) {
          text += content;
        }
        
        prevWasEmpty = isEmpty;
      } else {
        // 텍스트 노드나 다른 요소 (예: <br>)
        if (index > 0 && !prevWasEmpty) {
          text += '\n';
        }
        const nodeContent = serializeNode(child, false);
        text += nodeContent;
        prevWasEmpty = false;
      }
    });

    // 앞뒤 공백 제거 (줄바꿈은 유지)
    text = text.replace(/^[\n\r]+|[\n\r]+$/g, '');
      setContent(text);
  };

  const handleHashtagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
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

    setIsSubmitting(true);
    setIsUploading(true);

    try {
      // 먼저 게시글 생성 (임시 ID로)
      let currentContent = content;
      const tempIdToFilenameMap = new Map<string, string>();

      // 임시 이미지들을 업로드하고 실제 filename으로 교체
      if (pendingImages.size > 0) {
        // 게시글을 먼저 생성해야 이미지를 업로드할 수 있음
        // 임시로 빈 게시글 생성
        const createResponse = await communityService.create({
          category: category,
          title: title,
          content: undefined,
          hashtags: hashtags,
        });

        const communityId = createResponse.id;

        // 1) 임시 이미지들을 순차적으로 업로드하면서 tempId -> filename 매핑
        for (const [tempId, file] of pendingImages.entries()) {
          try {
            const updatedCommunity = await communityService.uploadImage(communityId, file);

            // 서버 응답에서 새로 추가된 이미지의 filename 추출
            if (updatedCommunity.content) {
              try {
                const parsed = JSON.parse(updatedCommunity.content);
                const blocks = parsed.blocks || [];

                // 마지막 image 블록(방금 추가된 것) 찾기
                for (let i = blocks.length - 1; i >= 0; i--) {
                  const block = blocks[i];
                  if (block.type === 'image' && block.path) {
                    const filename = (block.path as string).split('/').pop() || '';
                    if (filename) {
                    tempIdToFilenameMap.set(tempId, filename);
                    }
                    break;
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

        // 2) content에서 임시 ID를 실제 filename으로 교체 (매매일지 로직과 동일하게 정규식 사용)
        if (currentContent) {
          for (const [tempId, filename] of tempIdToFilenameMap.entries()) {
            const escapedTempId = tempId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\[image\\]\\{${escapedTempId}\\}`, 'g');
            currentContent = currentContent.replace(regex, `[image]{${filename}}`);
          }
        }

        // content를 JSONB 형식으로 변환
        let contentJson: string | undefined = undefined;
        if (currentContent && currentContent.length > 0) {
          const parsedContent = textToContentBlocks(currentContent, communityId);
          contentJson = JSON.stringify(parsedContent);
        }

        // 게시글 업데이트
        await communityService.update(communityId, {
          category: category,
          title: title,
          content: contentJson,
          hashtags: hashtags,
        });

        router.push(`/communities/${communityId}`);
      } else {
        // 이미지가 없으면 바로 생성
        let contentJson: string | undefined = undefined;
        if (currentContent && currentContent.length > 0) {
          // 임시로 0을 사용 (실제로는 생성 후 ID를 받아서 처리해야 함)
          const parsedContent = textToContentBlocks(currentContent, 0);
          contentJson = JSON.stringify(parsedContent);
        }

        const response = await communityService.create({
          category: category,
          title: title,
          content: contentJson,
          hashtags: hashtags,
        });

        router.push(`/communities/${response.id}`);
      }
    } catch (error) {
      console.error('게시글 작성 실패:', error);
      alert('게시글 작성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto pt-8 pb-8">
      <div className="community-write">
        <div className="write-header">
          <button
            type="button"
            onClick={() => {
              // 게시글 목록 캐시 무효화
              queryClient.invalidateQueries({ queryKey: ['communities'] });
              router.push('/communities');
            }}
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
                <img
                  src={getProfileImageUrl(user?.profileUrl)}
                  alt="프로필"
                  className="comment-profile-img"
                />
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
                    {[Category.FREE, Category.GOOD_BAD_NEWS, Category.PROFIT_PROOF, Category.CHART_ANALYSIS].map((cat) => (
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
                placeholder="해시태그를 입력하고 Enter 를 누르세요"
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
                {isSubmitting ? '작성 중...' : '게시글 작성'}
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
