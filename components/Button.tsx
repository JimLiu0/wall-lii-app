import React from 'react';

export default function Button({ text, selected, onClick }: { text: string, selected: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full transition ${
        selected
          ? 'bg-blue-600 text-white'
          : 'text-gray-300 hover:bg-gray-700'
      }`}
    >
      {text}
    </button>
  );
}