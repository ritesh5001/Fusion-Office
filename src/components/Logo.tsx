export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="3" y="6" width="17" height="22" rx="3" fill="#c7d2fe" />
      <rect x="10" y="3" width="19" height="23" rx="3" fill="#4f46e5" />
      <path d="M15 10h9M15 14.5h9M15 19h5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
