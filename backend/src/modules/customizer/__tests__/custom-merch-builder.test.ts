import { beforeEach, describe, expect, it } from 'vitest';
import { PrintPlacement, ValidationError } from '@merch/contracts';
import { CustomMerchBuilder } from '../domain/custom-merch-builder';
import { InMemoryStorageService } from '../infrastructure/in-memory-storage-service';
import { SvgPreviewRenderer } from '../infrastructure/svg-preview-renderer';
import { makeMug, makePants, makeTee } from '../../../test-utils/fixtures';
import { makePrint } from './helpers';

describe('CustomMerchBuilder (Builder)', () => {
  let storage: InMemoryStorageService;
  let builder: CustomMerchBuilder;
  let n = 0;

  beforeEach(() => {
    n = 0;
    storage = new InMemoryStorageService(() => `file${++n}`);
    builder = new CustomMerchBuilder({ storage, renderer: new SvgPreviewRenderer(), idGenerator: () => `prod-${++n}` });
  });

  it('збирає продукт: базовий виріб + принт + прев\u02bcю', async () => {
    builder.setBaseItem(makeTee());
    builder.addPrint(makePrint());
    const url = await builder.generatePreview();
    const product = builder.getResult();

    expect(product.getBaseItem().getId()).toBe('tee-1');
    expect(product.getPrintConfigs()).toHaveLength(1);
    expect(product.getPreviewImageUrl()).toBe(url);
    expect(url).toContain('previews/');
    expect(product.isMockupApproved()).toBe(false);
  });

  it('вартість: ціна + підготовка + друк', () => {
    builder.setBaseItem(makeTee());
    builder.addPrint(makePrint());
    expect(builder.getResult().getTotalCost()).toBe(450);
  });

  it('після getResult білдер скинутий і готовий до повторного використання', () => {
    builder.setBaseItem(makeTee());
    builder.addPrint(makePrint());
    const first = builder.getResult();
    expect(() => builder.getResult()).toThrow(/Base item is not set/);

    builder.setBaseItem(makeMug());
    builder.addPrint(makePrint({ placement: PrintPlacement.ACCESSORY_FRONT }));
    const second = builder.getResult();
    expect(second.getId()).not.toBe(first.getId());
  });

  it('reset() очищає стан', () => {
    builder.setBaseItem(makeTee());
    builder.addPrint(makePrint());
    builder.reset();
    expect(() => builder.addPrint(makePrint())).toThrow(ValidationError);
  });

  it('негатив: addPrint / generatePreview / getResult без базового виробу', async () => {
    expect(() => builder.addPrint(makePrint())).toThrow(/Base item is not set/);
    await expect(builder.generatePreview()).rejects.toThrow(/Base item is not set/);
    expect(() => builder.getResult()).toThrow(/Base item is not set/);
  });

  it('негатив: getResult без жодного принта', () => {
    builder.setBaseItem(makeTee());
    expect(() => builder.getResult()).toThrow(/at least one print/);
  });

  it('негатив: зона не дозволена для типу виробу', () => {
    builder.setBaseItem(makePants());
    expect(() => builder.addPrint(makePrint({ placement: PrintPlacement.CHEST }))).toThrow(/not allowed/);
  });

  it('негатив: друга зона з тим самим placement', () => {
    builder.setBaseItem(makeTee());
    builder.addPrint(makePrint());
    expect(() => builder.addPrint(makePrint())).toThrow(/already has a print/);
  });

  it('негатив: принт виходить за межі зони', () => {
    builder.setBaseItem(makeTee());
    expect(() => builder.addPrint(makePrint({ widthMm: 301, heightMm: 100 }))).toThrow(/exceeds/);
  });

  it('зміна базового виробу скидає попередні принти', () => {
    builder.setBaseItem(makeTee());
    builder.addPrint(makePrint());
    builder.setBaseItem(makeMug());
    expect(() => builder.getResult()).toThrow(/at least one print/);
  });

  it('прев\u02bcю зберігається у storage з розширенням рендерера', async () => {
    builder.setBaseItem(makeTee());
    builder.addPrint(makePrint());
    await builder.generatePreview();
    const keys = [...storage.files.keys()];
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^previews\/.*\.svg$/);
  });
});
