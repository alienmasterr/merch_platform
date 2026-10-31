import { describe, expect, it } from 'vitest';
import { PrintPlacement } from '@merch/contracts';
import { SvgPreviewRenderer } from '../infrastructure/svg-preview-renderer';
import { makeHoodie, makeMug, makePants, makeTee } from '../../../test-utils/fixtures';
import { makePrint } from './helpers';

const render = (...args: Parameters<SvgPreviewRenderer['render']>) =>
  new TextDecoder().decode(new SvgPreviewRenderer().render(...args));

describe('SvgPreviewRenderer', () => {
  it('малює силует футболки в кольорі виробу і image для кожного принта', () => {
    const svg = render(makeTee(), [makePrint(), makePrint({ placement: PrintPlacement.SLEEVE, widthMm: 50, heightMm: 50 })]);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('<path d="M200 40 L20 150');
    expect(svg).toContain('fill="#fafafa"');
    expect(svg.match(/<image /g)).toHaveLength(2);
    expect(svg).toContain('data-placement="CHEST"');
    expect(svg).not.toContain('data-view="back"');
  });

  it('позиціонує принт: центр зони + зміщення, мінус половина розміру', () => {
    const svg = render(makeTee(), [makePrint({ offsetX: 10, offsetY: 20, widthMm: 100, heightMm: 100, scale: 2 })]);
    expect(svg).toContain('x="210" y="220" width="200" height="200"');
  });

  it('принт на спині: два види поруч, спина у правій половині', () => {
    const svg = render(makeTee(), [makePrint(), makePrint({ placement: PrintPlacement.BACK })]);
    expect(svg).toContain('viewBox="0 0 1200 740"');
    expect(svg).toContain('>Спереду</text>');
    expect(svg).toContain('<g transform="translate(600 40)" data-view="back">');
    const back = svg.slice(svg.indexOf('data-view="back"'));
    expect(back).toContain('data-placement="BACK"');
    expect(back).not.toContain('data-placement="CHEST"');
  });

  it('інші вироби: капюшон у худі, штани, чашка', () => {
    expect(render(makeHoodie(), [])).toContain('<path d="M215 48 Q300 -20');
    const hoodie = render(makeHoodie(), [makePrint({ placement: PrintPlacement.BACK })]);
    expect(hoodie.match(/M200 520 L400 520/g)).toHaveLength(1);
    expect(render(makePants(), [])).toContain('<path d="M140 30 L460 30');
    const mug = render(makeMug(), []);
    expect(mug).toContain('<rect x="160" y="200" width="280" height="330"');
    expect(mug).not.toContain('M200 40 L20 150');
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
