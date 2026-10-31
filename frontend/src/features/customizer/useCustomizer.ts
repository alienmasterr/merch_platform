import type { PrintPlacement, PrintTechnology } from '@merch/contracts';
import { useMutation } from '@tanstack/react-query';
import { useReducer, useState } from 'react';
import { createCustomProduct, uploadPrint } from '../../api/customizer';
import type { ApparelItem, CustomProduct } from '../../api/types';
import {
  customizerReducer,
  DEFAULT_TECHNOLOGY,
  initialCustomizerState,
  listPrints,
  toPrintInputs,
} from './customizerState';
import { estimatePrintCost, type PrintGeometry } from './placement';
import { readImageAspect, validatePrintFile } from './printFile';

export function useCustomizer(baseItem: ApparelItem) {
  const firstPlacement = (baseItem.allowedPlacements[0] ?? 'CHEST') as PrintPlacement;
  const [state, dispatch] = useReducer(customizerReducer, firstPlacement, initialCustomizerState);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saved, setSaved] = useState<CustomProduct | null>(null);

  const upload = useMutation({
    mutationFn: async ({ file, placement }: { file: File; placement: PrintPlacement }) => {
      const [{ printFileUrl }, aspect] = await Promise.all([
        uploadPrint(file),
        readImageAspect(file),
      ]);
      return { printFileUrl, aspect, placement, fileName: file.name };
    },
    onSuccess: (r) => {
      setSaved(null);
      dispatch({ type: 'addPrint', ...r, technology: DEFAULT_TECHNOLOGY });
    },
  });

  const save = useMutation({
    mutationFn: () =>
      createCustomProduct({ baseItemId: baseItem.id, prints: toPrintInputs(state) }),
    onSuccess: setSaved,
  });

  const prints = listPrints(state);
  const printsCost = prints.reduce((sum, p) => sum + estimatePrintCost(p, p.technology), 0);
  const estimate =
    Math.round((baseItem.basePrice + baseItem.productionCost + printsCost) * 100) / 100;

  const edit =
    <T extends unknown[]>(fn: (...args: T) => void) =>
    (...args: T) => {
      setSaved(null);
      fn(...args);
    };

  return {
    state,
    prints,
    activePrint: state.prints[state.activePlacement],
    estimate,
    fileError,
    saved,
    upload,
    save,
    selectPlacement: (placement: PrintPlacement) =>
      dispatch({ type: 'selectPlacement', placement }),
    addFile: (file: File) => {
      const check = validatePrintFile(file);
      setFileError(check.ok ? null : check.error);
      if (check.ok) upload.mutate({ file, placement: state.activePlacement });
    },
    updatePrint: edit((placement: PrintPlacement, patch: Partial<PrintGeometry>) =>
      dispatch({ type: 'updatePrint', placement, patch }),
    ),
    moveBy: edit((placement: PrintPlacement, dx: number, dy: number) =>
      dispatch({ type: 'moveBy', placement, dx, dy }),
    ),
    setTechnology: edit((placement: PrintPlacement, technology: PrintTechnology) =>
      dispatch({ type: 'setTechnology', placement, technology }),
    ),
    removePrint: edit((placement: PrintPlacement) => dispatch({ type: 'removePrint', placement })),
  };
}

export type CustomizerApi = ReturnType<typeof useCustomizer>;
