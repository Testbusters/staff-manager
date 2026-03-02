'use client';

import { useState } from 'react';

export function InfoTooltip({ tip }: { tip: string }) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-block leading-none"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className={`cursor-default text-xs select-none transition-colors ${show ? 'text-gray-300' : 'text-gray-500'}`}>
        ℹ
      </span>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-xs text-gray-200 z-50 shadow-xl whitespace-normal text-left leading-relaxed pointer-events-none">
          {tip}
        </span>
      )}
    </span>
  );
}
