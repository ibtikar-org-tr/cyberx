import { QRCodeSVG } from 'qrcode.react';

export function getPublicSiteUrl(): string {
  const fromEnv = (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

type SiteQrCodeProps = {
  size?: number;
  className?: string;
  showUrl?: boolean;
};

export default function SiteQrCode({ size = 180, className = '', showUrl = true }: SiteQrCodeProps) {
  const url = getPublicSiteUrl();

  if (!url) {
    return null;
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200">
        <QRCodeSVG value={url} size={size} level="M" includeMargin={false} title={`QR code for ${url}`} />
      </div>
      {showUrl && (
        <p className="max-w-xs break-all text-center text-xs text-gray-500" title={url}>
          {url}
        </p>
      )}
    </div>
  );
}
