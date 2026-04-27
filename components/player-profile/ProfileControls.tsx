import { DateTime } from 'luxon';
import { Info } from 'lucide-react';

import DatePicker from '../DatePicker';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type TimeView = 'all' | 'week' | 'day';
type GameMode = 's' | 'd';

interface Props {
  gameMode: GameMode;
  currentRegion: string;
  currentView: TimeView;
  showSoloButton: boolean;
  showDuoButton: boolean;
  showRegionButtons: string[];
  selectedDate: DateTime;
  calculatedMinDate: DateTime;
  showTimeModal: boolean;
  onGameModeChange: (newGameMode: GameMode) => void;
  onRegionChange: (newRegion: string) => void;
  onViewChange: (newView: TimeView) => void;
  onDateChange: (date: DateTime) => void;
  onInfoClick: () => void;
}

export default function ProfileControls({
  gameMode,
  currentRegion,
  currentView,
  showSoloButton,
  showDuoButton,
  showRegionButtons,
  selectedDate,
  calculatedMinDate,
  showTimeModal,
  onGameModeChange,
  onRegionChange,
  onViewChange,
  onDateChange,
  onInfoClick,
}: Props) {
  return (
    <div>
      <div className="mb-2 flex flex-row flex-wrap items-center gap-4">
        <ToggleGroup
          type="single"
          value={gameMode}
          onValueChange={(value) => {
            if (value === 's' || value === 'd') onGameModeChange(value);
          }}
        >
          {showSoloButton && <ToggleGroupItem value="s">Solo</ToggleGroupItem>}
          {showDuoButton && <ToggleGroupItem value="d">Duo</ToggleGroupItem>}
        </ToggleGroup>

        <ToggleGroup
          type="single"
          value={currentRegion}
          onValueChange={(value) => {
            if (value) onRegionChange(value);
          }}
        >
          {showRegionButtons.map((regionOption) => (
            <ToggleGroupItem key={regionOption} value={regionOption}>
              {regionOption.toUpperCase()}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <ToggleGroup
          type="single"
          value={currentView}
          onValueChange={(value) => {
            if (value === 'all' || value === 'week' || value === 'day') onViewChange(value);
          }}
        >
          <ToggleGroupItem value="all">Season</ToggleGroupItem>
          <ToggleGroupItem value="week">Week</ToggleGroupItem>
          <ToggleGroupItem value="day">Day</ToggleGroupItem>
        </ToggleGroup>

        {currentView !== 'all' && (
          <div className="flex flex-row items-center gap-2">
            <DatePicker
              selectedDate={selectedDate}
              onDateChange={onDateChange}
              maxDate={DateTime.now().setZone('America/Los_Angeles').endOf('day')}
              minDate={calculatedMinDate}
              weekNavigation={currentView === 'week'}
            />

            <Info onClick={onInfoClick} className="cursor-pointer" />
          </div>
        )}
      </div>
      {showTimeModal && (
        <div className="mt-2">
          All stats and resets use Pacific Time (PT) midnight as the daily/weekly reset.
        </div>
      )}
    </div>
  );
}
