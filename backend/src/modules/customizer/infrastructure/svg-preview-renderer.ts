import {
  AccessoryItem,
  PrintPlacement,
  TopWearItem,
  type IPrintConfiguration,
  type MerchApparelItem,
} from '@merch/contracts';
import type { IPreviewRenderer } from '../domain/preview-renderer';

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 700;
const LABEL_HEIGHT = 40;

const ANCHORS: Record<PrintPlacement, { x: number; y: number }> = {
  [PrintPlacement.CHEST]: { x: 300, y: 300 },
  [PrintPlacement.BACK]: { x: 300, y: 330 },
  [PrintPlacement.SLEEVE]: { x: 90, y: 185 },
  [PrintPlacement.LEFT_LEG]: { x: 215, y: 450 },
  [PrintPlacement.RIGHT_LEG]: { x: 385, y: 450 },
  [PrintPlacement.ACCESSORY_FRONT]: { x: 300, y: 375 },
};

const TEE = 'M200 40 L20 150 L70 260 L130 225 L125 670 L475 670 L470 225 L530 260 L580 150 L400 40 Q300 95 200 40 Z';
const HOOD = 'M215 48 Q300 -20 385 48 Q300 100 215 48 Z';
const POCKET = 'M200 520 L400 520 L420 610 L180 610 Z';
const PANTS = 'M140 30 L460 30 L490 680 L330 680 L300 250 L270 680 L110 680 Z';
const MUG_HANDLE = 'M430 270 Q520 270 520 360 Q520 450 430 450';
const TOTE_HANDLES = 'M210 190 Q210 60 300 60 Q390 60 390 190';
const OUTLINE = '#00000059';

const SWATCHES: Record<string, string> = {
  white: '#fafafa',
  black: '#1f1f23',
  grey: '#9b9ba3',
  gray: '#9b9ba3',
  natural: '#e8dcc4',
  beige: '#e3d3b4',
  navy: '#1f2a52',
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
  const swatch = SWATCHES[color.toLowerCase()];
  if (swatch) return swatch;
  return /^[a-zA-Z0-9#(),.% -]{1,40}$/.test(color) ? color : '#cccccc';
}

function garment(item: MerchApparelItem, fill: string, view: 'front' | 'back'): string {
  const shape = `fill="${fill}" stroke="${OUTLINE}" stroke-width="3" stroke-linejoin="round"`;
  if (item.kind === 'BOTTOM') return `<path d="${PANTS}" ${shape}/>`;
  if (item.kind === 'ACCESSORY') {
    const handle = (d: string, outer: number, inner: number) =>
      `<path d="${d}" fill="none" stroke="${OUTLINE}" stroke-width="${outer}" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${inner}" stroke-linecap="round"/>`;
    return item instanceof AccessoryItem && item.accessoryType === 'mug'
      ? handle(MUG_HANDLE, 34, 28) + `<rect x="160" y="200" width="280" height="330" rx="26" ${shape}/>`
      : handle(TOTE_HANDLES, 22, 16) + `<rect x="130" y="180" width="340" height="460" rx="10" ${shape}/>`;
  }
  const hood =
    item instanceof TopWearItem && item.hasHood
      ? `<path d="${HOOD}" ${shape}/>` +
        (view === 'front' ? `<path d="${POCKET}" fill="none" stroke="${OUTLINE}" stroke-width="3"/>` : '')
      : '';
  return `<path d="${TEE}" ${shape}/>${hood}`;
}

function printImage(p: IPrintConfiguration): string {
  const w = p.widthMm * p.scale;
  const h = p.heightMm * p.scale;
  const anchor = ANCHORS[p.placement];
  const x = anchor.x + p.offsetX - w / 2;
  const y = anchor.y + p.offsetY - h / 2;
  return (
    `<image href="${escapeXml(p.printFileUrl)}" x="${x}" y="${y}" width="${w}" height="${h}" ` +
    `preserveAspectRatio="xMidYMid meet" data-placement="${p.placement}"/>`
  );
}

export class SvgPreviewRenderer implements IPreviewRenderer {
  readonly fileExtension = 'svg';

  render(baseItem: MerchApparelItem, prints: IPrintConfiguration[]): Uint8Array {
    const fill = escapeXml(safeColor(baseItem.getColor()));
    const front = prints.filter((p) => p.placement !== PrintPlacement.BACK);
    const back = prints.filter((p) => p.placement === PrintPlacement.BACK);
    const views = back.length > 0 ? [{ label: 'Спереду', side: 'front' as const, prints: front }, { label: 'Ззаду', side: 'back' as const, prints: back }] : [{ label: '', side: 'front' as const, prints: front }];
    const labelled = views.length > 1;
    const width = VIEW_WIDTH * views.length;
    const height = VIEW_HEIGHT + (labelled ? LABEL_HEIGHT : 0);

    const body = views
      .map((view, i) => {
        const dx = i * VIEW_WIDTH;
        const dy = labelled ? LABEL_HEIGHT : 0;
        const label = labelled
          ? `<text x="${dx + VIEW_WIDTH / 2}" y="28" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#61616b">${view.label}</text>\n  `
          : '';
        return (
          `${label}<g transform="translate(${dx} ${dy})" data-view="${view.side}">` +
          `${garment(baseItem, fill, view.side)}\n    ${view.prints.map(printImage).join('\n    ')}</g>`
        );
      })
      .join('\n  ');

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n` +
      `  <title>${escapeXml(baseItem.getTitle())}</title>\n` +
      `  <rect width="${width}" height="${height}" fill="#f4f4f5"/>\n` +
      `  ${body}\n` +
      `</svg>`;

    return new TextEncoder().encode(svg);
  }
}
