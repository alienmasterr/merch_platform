import { PrintPlacement, type IPrintConfiguration, type MerchApparelItem } from '@merch/contracts';
import type { IPreviewRenderer } from '../domain/preview-renderer';

const WIDTH = 600;
const HEIGHT = 700;

/** Центри зон нанесення на полотні (px, 1 мм = 1 px). */
const ANCHORS: Record<PrintPlacement, { x: number; y: number }> = {
  [PrintPlacement.CHEST]: { x: 300, y: 250 },
  [PrintPlacement.BACK]: { x: 300, y: 270 },
  [PrintPlacement.SLEEVE]: { x: 90, y: 190 },
  [PrintPlacement.LEFT_LEG]: { x: 215, y: 420 },
  [PrintPlacement.RIGHT_LEG]: { x: 385, y: 420 },
  [PrintPlacement.ACCESSORY_FRONT]: { x: 300, y: 350 },
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeColor(color: string): string {
  return /^[a-zA-Z0-9#(),.% -]{1,40}$/.test(color) ? color : '#cccccc';
}

/** Простий векторний мокап без нативних залежностей: силует виробу + принти в зонах. */
export class SvgPreviewRenderer implements IPreviewRenderer {
  readonly fileExtension = 'svg';

  render(baseItem: MerchApparelItem, prints: IPrintConfiguration[]): Uint8Array {
    const images = prints
      .map((p) => {
        const w = p.widthMm * p.scale;
        const h = p.heightMm * p.scale;
        const anchor = ANCHORS[p.placement];
        const x = anchor.x + p.offsetX - w / 2;
        const y = anchor.y + p.offsetY - h / 2;
        return (
          `<image href="${escapeXml(p.printFileUrl)}" x="${x}" y="${y}" width="${w}" height="${h}" ` +
          `preserveAspectRatio="xMidYMid meet" data-placement="${p.placement}"/>`
        );
      })
      .join('\n  ');

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">\n` +
      `  <title>${escapeXml(baseItem.getTitle())}</title>\n` +
      `  <rect width="${WIDTH}" height="${HEIGHT}" fill="#f4f4f5"/>\n` +
      `  <rect x="100" y="60" width="400" height="580" rx="24" fill="${escapeXml(safeColor(baseItem.getColor()))}" stroke="#999999"/>\n` +
      `  ${images}\n` +
      `</svg>`;

    return new TextEncoder().encode(svg);
  }
}
