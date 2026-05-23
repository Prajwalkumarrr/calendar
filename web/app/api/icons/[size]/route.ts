import { NextRequest, NextResponse } from 'next/server';

// Generates PNG app icons at /api/icons/192 and /api/icons/512
// Referenced by manifest.json via /icons/icon-192.png and /icons/icon-512.png
// (rewrite in next.config.mjs maps /icons/*.png → /api/icons/:size)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const sz = parseInt(size, 10);
  if (![192, 512].includes(sz)) {
    return NextResponse.json({ error: 'unsupported size' }, { status: 400 });
  }

  const r = sz * 0.219; // corner radius ~112/512 * sz
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sz} ${sz}" width="${sz}" height="${sz}">
  <rect width="${sz}" height="${sz}" rx="${r}" fill="#D97757"/>
  <text
    x="${sz / 2}" y="${sz * 0.664}"
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    font-size="${sz * 0.547}"
    font-weight="700"
    text-anchor="middle"
    fill="#FFFFFF"
  >E</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
