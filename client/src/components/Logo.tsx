/** Two stacked sheets: violet behind, lime in front. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="4" y="7" width="16" height="21" rx="4" fill="#8b7cf6" />
      <rect x="11" y="3" width="17" height="22" rx="4" fill="#cdf564" />
      <path d="M15.5 10h8M15.5 14h8M15.5 18h5" stroke="#0c0f06" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
