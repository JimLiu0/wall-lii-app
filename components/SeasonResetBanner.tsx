import { AlertTriangle } from 'lucide-react';
import { Banner } from '@/components/ui/banner';

function isWithinWindow(startDate: string, endDate: string): boolean {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }

  return now >= start && now <= end;
}

export default function SeasonResetBanner() {
  // Update these two dates each season.
  const bannerStartDate = '2026-04-12T00:00:00-07:00';
  const bannerEndDate = '2026-04-23T00:00:00-07:00';

  if (!isWithinWindow(bannerStartDate, bannerEndDate)) {
    return null;
  }

  return (
    <Banner
      variant="warning"
      icon={<AlertTriangle className="h-5 w-5" />}
      title={"Season 13 Database Reset"}
    >
    </Banner>
  );
}