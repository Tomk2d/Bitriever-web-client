'use client';

export default function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <div className="text-xl font-bold">Bitriever</div>
          <div className="flex items-center gap-4">
            {/* 네비게이션 메뉴 */}
            {/* 사용자 메뉴 */}
          </div>
        </nav>
      </div>
    </header>
  );
}

