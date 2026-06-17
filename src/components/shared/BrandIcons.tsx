// filepath: src/components/shared/BrandIcons.tsx
// Нақты бренд логотиптері (SVG) — профессионал көрініс үшін

export function ExcelIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M28 4H10a2 2 0 0 0-2 2v36a2 2 0 0 0 2 2h28a2 2 0 0 0 2-2V16L28 4z" fill="#185C37"/>
      <path d="M28 4l12 12H30a2 2 0 0 1-2-2V4z" fill="#21A366"/>
      <path d="M40 16H30a2 2 0 0 1-2-2V4l12 12z" fill="#107C41" opacity=".5"/>
      <rect x="6" y="18" width="22" height="20" rx="1.5" fill="#107C41"/>
      <path d="M12.5 23l2.4 4 2.5-4h2.6l-3.7 5.5L20.1 34h-2.7l-2.6-4.2L12.2 34H9.6l3.8-5.6L9.8 23h2.7z" fill="#fff"/>
    </svg>
  );
}

export function PdfIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2h18l10 10v32a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#F40F02"/>
      <path d="M30 2l10 10H32a2 2 0 0 1-2-2V2z" fill="#FF6A5C"/>
      <rect x="6" y="26" width="28" height="13" rx="1.5" fill="#C30B02"/>
      <text x="20" y="35.5" fontSize="8" fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="Arial, sans-serif">PDF</text>
    </svg>
  );
}

export function PrintIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="6" width="24" height="14" rx="1.5" fill="#94A3B8"/>
      <rect x="6" y="18" width="36" height="18" rx="2.5" fill="#475569"/>
      <rect x="12" y="28" width="24" height="14" rx="1.5" fill="#E2E8F0"/>
      <rect x="15" y="32" width="18" height="2.2" rx="1.1" fill="#94A3B8"/>
      <rect x="15" y="36" width="18" height="2.2" rx="1.1" fill="#94A3B8"/>
      <circle cx="36" cy="24" r="2" fill="#34D399"/>
    </svg>
  );
}
