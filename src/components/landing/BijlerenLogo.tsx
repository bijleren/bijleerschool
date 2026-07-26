import React from 'react';

interface BijlerenLogoProps {
  size?: number;
  className?: string;
}

export function BijlerenLogo({ size = 48, className = '' }: BijlerenLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Top center hexagon - black */}
      <polygon points="24,2 30,7 30,15 24,19 18,15 18,7" fill="#2F2A22" />
      {/* Bottom-left hexagon - yellow/gold */}
      <polygon points="14,18 20,14 26,18 26,26 20,30 14,26" fill="#F5B731" />
      {/* Bottom-right hexagon - outline */}
      <polygon points="22,18 28,14 34,18 34,26 28,30 22,26" fill="none" stroke="#2F2A22" strokeWidth="1.5" />
      {/* Center small hexagon - white */}
      <polygon points="21,21 24,19 27,21 27,25 24,27 21,25" fill="white" />
      {/* Antenna left */}
      <line x1="20" y1="7" x2="16" y2="2" stroke="#2F2A22" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="15.5" cy="1.5" r="1.5" fill="#2F2A22" />
      {/* Antenna right */}
      <line x1="28" y1="7" x2="32" y2="2" stroke="#2F2A22" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="32.5" cy="1.5" r="1.5" fill="#2F2A22" />
    </svg>
  );
}
