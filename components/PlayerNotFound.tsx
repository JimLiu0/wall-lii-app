'use client';

import PlayerHeader from './PlayerHeader';

interface PlayerNotFoundProps {
  player: string;
}

export default function PlayerNotFound({ player }: PlayerNotFoundProps) {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex flex-col gap-4">
          <PlayerHeader backUrl="/lb/na/solo" />
          <div className="text-2xl font-bold text-white mb-4 text-center mt-8">
            {`Couldn't find ${player}`}
          </div>
        </div>
      </div>
    </div>
  );
}