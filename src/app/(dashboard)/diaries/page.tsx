'use client';

import { MonthlyCalendar } from '@/shared/components/calendar';

export default function DiariesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">매매 일지</h1>
      <div className="space-y-4">
        <MonthlyCalendar />
      </div>
    </div>
  );
}

