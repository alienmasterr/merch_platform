import type { PrintPlacement } from '@merch/contracts';
import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import type { ApparelItem } from '../../api/types';
import { CANVAS } from '../../shared/canvas';
import { GarmentShape } from '../../shared/Garment';
import { PLACEMENT_LABELS } from '../../shared/labels';
import type { CustomizerState } from './customizerState';
import { areaRect, calculatePosition, viewOf } from './placement';

interface Props {
  baseItem: ApparelItem;
  state: CustomizerState;
  onSelect: (placement: PrintPlacement) => void;
  onMove: (placement: PrintPlacement, dx: number, dy: number) => void;
}

const KEY_STEP: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Інтерактивний мокап: зони друку, принти (перетягування мишею/пальцем або стрілками). */
export function PrintCanvas({ baseItem, state, onSelect, onMove }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ placement: PrintPlacement; x: number; y: number } | null>(null);
  const view = viewOf(state.activePlacement);
  const placements = (baseItem.allowedPlacements as PrintPlacement[]).filter(
    (p) => viewOf(p) === view,
  );

  /** Екранні координати → координати полотна (мм). */
  const toCanvas = (clientX: number, clientY: number) => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    const point = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: point.x, y: point.y };
  };

  const startDrag = (placement: PrintPlacement) => (e: PointerEvent<SVGGElement>) => {
    onSelect(placement);
    const point = toCanvas(e.clientX, e.clientY);
    if (!point) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { placement, ...point };
  };

  const moveDrag = (e: PointerEvent<SVGGElement>) => {
    const current = drag.current;
    const point = current && toCanvas(e.clientX, e.clientY);
    if (!current || !point) return;
    onMove(current.placement, point.x - current.x, point.y - current.y);
    drag.current = { ...current, ...point };
  };

  const endDrag = () => {
    drag.current = null;
  };

  const onKeyDown = (placement: PrintPlacement) => (e: KeyboardEvent<SVGGElement>) => {
    const step = KEY_STEP[e.key];
    if (!step) return;
    e.preventDefault();
    const distance = e.shiftKey ? 20 : 5;
    onMove(placement, step[0] * distance, step[1] * distance);
  };

  return (
    <div className="canvas-wrap">
      <span className="badge canvas-view">
        {view === 'back' ? 'Вигляд ззаду' : 'Вигляд спереду'}
      </span>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
        className="print-canvas"
        role="group"
        aria-label="Мокап виробу"
      >
        <GarmentShape item={baseItem} />

        {placements.map((placement) => {
          const area = areaRect(placement);
          const active = placement === state.activePlacement;
          return (
            <rect
              key={placement}
              {...area}
              className={`print-area${active ? ' print-area--active' : ''}`}
              onClick={() => onSelect(placement)}
            >
              <title>{PLACEMENT_LABELS[placement]}</title>
            </rect>
          );
        })}

        {placements.map((placement) => {
          const print = state.prints[placement];
          if (!print) return null;
          const rect = calculatePosition(print, placement);
          const active = placement === state.activePlacement;
          return (
            <g
              key={placement}
              className="print-item"
              tabIndex={0}
              role="button"
              aria-label={`Принт: ${PLACEMENT_LABELS[placement]}. Перетягніть або рухайте стрілками`}
              data-testid={`print-${placement}`}
              data-x={rect.x}
              data-y={rect.y}
              onPointerDown={startDrag(placement)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={onKeyDown(placement)}
              onFocus={() => onSelect(placement)}
            >
              <image href={print.printFileUrl} {...rect} preserveAspectRatio="xMidYMid meet" />
              {active && <rect {...rect} className="print-outline" />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
