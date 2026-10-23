import { describe, expect, it } from 'vitest';
import {
  customizerReducer,
  initialCustomizerState,
  listPrints,
  toPrintInputs,
  type CustomizerState,
} from './customizerState';
import { isWithinArea, PLACEMENT_LIMITS } from './placement';

const withChestPrint = (): CustomizerState =>
  customizerReducer(initialCustomizerState('BACK'), {
    type: 'addPrint',
    placement: 'CHEST',
    printFileUrl: 'http://localhost:3000/files/a.png',
    fileName: 'a.png',
    aspect: 2,
    technology: 'DTG',
  });

describe('customizerReducer', () => {
  it('adds a print fitted to the area and activates its placement', () => {
    const state = withChestPrint();
    expect(state.activePlacement).toBe('CHEST');
    expect(state.prints.CHEST).toMatchObject({
      widthMm: 180,
      heightMm: 90,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      technology: 'DTG',
      fileName: 'a.png',
    });
  });

  it('keeps the chosen technology when a file is replaced', () => {
    let state = customizerReducer(withChestPrint(), {
      type: 'setTechnology',
      placement: 'CHEST',
      technology: 'EMBROIDERY',
    });
    state = customizerReducer(state, {
      type: 'addPrint',
      placement: 'CHEST',
      printFileUrl: 'http://x/b.png',
      fileName: 'b.png',
      aspect: 1,
      technology: 'DTG',
    });
    expect(state.prints.CHEST?.technology).toBe('EMBROIDERY');
    expect(state.prints.CHEST?.fileName).toBe('b.png');
  });

  it('clamps moves to the area', () => {
    const state = customizerReducer(withChestPrint(), {
      type: 'moveBy',
      placement: 'CHEST',
      dx: 1000,
      dy: 0,
    });
    const print = state.prints.CHEST;
    expect(print?.offsetX).toBeCloseTo(59.9, 5);
    expect(print && isWithinArea(print, PLACEMENT_LIMITS.CHEST)).toBe(true);
  });

  it('accumulates relative moves', () => {
    let state = customizerReducer(withChestPrint(), {
      type: 'moveBy',
      placement: 'CHEST',
      dx: 5,
      dy: -10,
    });
    state = customizerReducer(state, { type: 'moveBy', placement: 'CHEST', dx: 5, dy: -10 });
    expect(state.prints.CHEST).toMatchObject({ offsetX: 10, offsetY: -20 });
  });

  it('clamps scale updates', () => {
    const state = customizerReducer(withChestPrint(), {
      type: 'updatePrint',
      placement: 'CHEST',
      patch: { scale: 9 },
    });
    expect(state.prints.CHEST?.scale).toBeCloseTo(300 / 180, 2);
  });

  it('ignores updates for an empty placement', () => {
    const state = withChestPrint();
    expect(customizerReducer(state, { type: 'moveBy', placement: 'BACK', dx: 1, dy: 1 })).toBe(
      state,
    );
    expect(
      customizerReducer(state, { type: 'setTechnology', placement: 'BACK', technology: 'DTF' }),
    ).toBe(state);
  });

  it('removes a print and resets everything', () => {
    const removed = customizerReducer(withChestPrint(), {
      type: 'removePrint',
      placement: 'CHEST',
    });
    expect(listPrints(removed)).toEqual([]);
    expect(customizerReducer(withChestPrint(), { type: 'reset', placement: 'BACK' })).toEqual(
      initialCustomizerState('BACK'),
    );
  });

  it('selects another placement without touching prints', () => {
    const state = customizerReducer(withChestPrint(), {
      type: 'selectPlacement',
      placement: 'SLEEVE',
    });
    expect(state.activePlacement).toBe('SLEEVE');
    expect(state.prints.CHEST).toBeDefined();
  });
});

describe('toPrintInputs', () => {
  it('produces the API payload without UI-only fields', () => {
    expect(toPrintInputs(withChestPrint())).toEqual([
      {
        printFileUrl: 'http://localhost:3000/files/a.png',
        placement: 'CHEST',
        technology: 'DTG',
        widthMm: 180,
        heightMm: 90,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      },
    ]);
  });
});
