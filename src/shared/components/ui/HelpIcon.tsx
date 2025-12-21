'use client';

import './HelpIcon.css';

interface HelpIconProps {
  tooltip: string;
  className?: string;
}

export default function HelpIcon({ tooltip, className = '' }: HelpIconProps) {
  return (
    <span 
      className={`help-icon ${className}`}
      data-tooltip={tooltip}
    >
      💬
    </span>
  );
}

