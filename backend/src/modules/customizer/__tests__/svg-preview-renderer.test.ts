import { describe, expect, it } from 'vitest';
import { PrintPlacement } from '@merch/contracts';
import { SvgPreviewRenderer } from '../infrastructure/svg-preview-renderer';
import { makeTee } from '../../../test-utils/fixtures';
import { makePrint } from './helpers';

const render = (...args: Parameters<SvgPreviewRenderer['render']>) =>
  new TextDecoder().decode(new SvgPreviewRenderer().render(...args));

describe('SvgPreviewRenderer', () => {
  it('малює силует і image для кожного принта', () => {
    const svg = render(makeTee(), [makePrint(), makePrint({ placement: PrintPlacement.BACK })]);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.match(/<image /g)).toHaveLength(2);
    expect(svg).toContain('data-placement="CHEST"');
    expect(svg).toContain('fill="white"');
  });

  it('позиціонує принт: центр зони + зміщення, мінус половина розміру', () => {
    const svg = render(makeTee(), [makePrint({ offsetX: 10, offsetY: 20, widthMm: 100, heightMm: 100, scale: 2 })]);
    // CHEST anchor (300, 250): x = 300 + 10 - 100 = 210, y = 250 + 20 - 100 = 170, w = h = 200
    expect(svg).toContain('x="210" y="170" width="200" height="200"');
  });

  it('безпека: спецсимволи в URL екрануються', () => {
    const svg = render(makeTee(), [makePrint({ printFileUrl: 'http://x/a.png?a=1&b="2"<script>' })]);
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&amp;b=&quot;2&quot;&lt;script&gt;');
  });

  it('безпека: небезпечний колір замінюється на запасний', () => {
    const evil = makeTee({ color: '"/><script>alert(1)</script>' });
    expect(render(evil, [])).toContain('fill="#cccccc"');
  });
});
