import type { PrintPlacement, PrintTechnology } from '@merch/contracts';
import type { PrintConfigurationInput } from '../../api/types';
import { clampToArea, fitToArea, PLACEMENT_LIMITS, type PrintGeometry } from './placement';

/** Принт у конструкторі: геометрія для API + те, що треба лише інтерфейсу. */
export interface PrintDraft extends PrintGeometry {
  placement: PrintPlacement;
  technology: PrintTechnology;
  printFileUrl: string;
  fileName: string;
}

export interface CustomizerState {
  activePlacement: PrintPlacement;
  prints: Partial<Record<PrintPlacement, PrintDraft>>;
}

export type CustomizerAction =
  | { type: 'selectPlacement'; placement: PrintPlacement }
  | {
      type: 'addPrint';
      placement: PrintPlacement;
      printFileUrl: string;
      fileName: string;
      aspect: number;
      technology: PrintTechnology;
    }
  | { type: 'updatePrint'; placement: PrintPlacement; patch: Partial<PrintGeometry> }
  | { type: 'moveBy'; placement: PrintPlacement; dx: number; dy: number }
  | { type: 'setTechnology'; placement: PrintPlacement; technology: PrintTechnology }
  | { type: 'removePrint'; placement: PrintPlacement }
  | { type: 'reset'; placement: PrintPlacement };

export const DEFAULT_TECHNOLOGY: PrintTechnology = 'DTG';

export function initialCustomizerState(placement: PrintPlacement): CustomizerState {
  return { activePlacement: placement, prints: {} };
}

/** Чистий редюсер конструктора: кожна зміна геометрії проходить через clampToArea. */
export function customizerReducer(
  state: CustomizerState,
  action: CustomizerAction,
): CustomizerState {
  switch (action.type) {
    case 'selectPlacement':
      return { ...state, activePlacement: action.placement };

    case 'addPrint': {
      const limit = PLACEMENT_LIMITS[action.placement];
      const size = fitToArea(action.aspect, limit);
      const draft: PrintDraft = {
        placement: action.placement,
        technology: state.prints[action.placement]?.technology ?? action.technology,
        printFileUrl: action.printFileUrl,
        fileName: action.fileName,
        ...clampToArea({ ...size, scale: 1, offsetX: 0, offsetY: 0 }, limit),
      };
      return {
        activePlacement: action.placement,
        prints: { ...state.prints, [action.placement]: draft },
      };
    }

    case 'updatePrint':
    case 'moveBy': {
      const current = state.prints[action.placement];
      if (!current) return state;
      const patch =
        action.type === 'moveBy'
          ? { offsetX: current.offsetX + action.dx, offsetY: current.offsetY + action.dy }
          : action.patch;
      const geometry = clampToArea({ ...current, ...patch }, PLACEMENT_LIMITS[action.placement]);
      return {
        ...state,
        prints: { ...state.prints, [action.placement]: { ...current, ...geometry } },
      };
    }

    case 'setTechnology': {
      const current = state.prints[action.placement];
      if (!current) return state;
      return {
        ...state,
        prints: {
          ...state.prints,
          [action.placement]: { ...current, technology: action.technology },
        },
      };
    }

    case 'removePrint': {
      const prints = { ...state.prints };
      delete prints[action.placement];
      return { ...state, prints };
    }

    case 'reset':
      return initialCustomizerState(action.placement);
  }
}

export function listPrints(state: CustomizerState): PrintDraft[] {
  return Object.values(state.prints);
}

/** Тіло запиту POST /customizer/products. */
export function toPrintInputs(state: CustomizerState): PrintConfigurationInput[] {
  return listPrints(state).map((p) => ({
    printFileUrl: p.printFileUrl,
    placement: p.placement,
    technology: p.technology,
    widthMm: p.widthMm,
    heightMm: p.heightMm,
    offsetX: p.offsetX,
    offsetY: p.offsetY,
    scale: p.scale,
  }));
}
