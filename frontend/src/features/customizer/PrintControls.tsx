import { PRINT_TECHNOLOGIES, type PrintPlacement, type PrintTechnology } from '@merch/contracts';
import { useRef, useState, type DragEvent } from 'react';
import { describeError } from '../../api/errors';
import { formatMoney } from '../../shared/format';
import { PLACEMENT_LABELS, TECHNOLOGY_LABELS } from '../../shared/labels';
import { estimatePrintCost, MAX_SCALE, MIN_SCALE, PLACEMENT_LIMITS } from './placement';
import { PRINT_FILE_ACCEPT } from './printFile';
import type { CustomizerApi } from './useCustomizer';

const round1 = (n: number) => Math.round(n * 10) / 10;

export function PrintControls({ customizer }: { customizer: CustomizerApi }) {
  const { state, activePrint, upload, fileError } = customizer;
  const placement: PrintPlacement = state.activePlacement;
  const limit = PLACEMENT_LIMITS[placement];
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pickFile = (files: FileList | null) => {
    const file = files?.[0];
    if (file) customizer.addFile(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files);
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={PRINT_FILE_ACCEPT}
      className="visually-hidden"
      aria-label={`Файл принта для зони «${PLACEMENT_LABELS[placement]}»`}
      onChange={(e) => pickFile(e.target.files)}
    />
  );

  const errors = (
    <>
      {fileError && (
        <p className="alert alert--error" role="alert">
          {fileError}
        </p>
      )}
      {upload.isError && (
        <p className="alert alert--error" role="alert">
          Не вдалося завантажити файл: {describeError(upload.error)}
        </p>
      )}
    </>
  );

  if (!activePrint) {
    return (
      <div className="stack">
        <div
          className={`dropzone${dragOver ? ' dropzone--over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {upload.isPending ? (
            <span className="row">
              <span className="spinner" aria-hidden="true" /> Завантаження…
            </span>
          ) : (
            <>
              <p>
                Перетягніть зображення сюди або{' '}
                <button
                  type="button"
                  className="btn btn--small"
                  onClick={() => inputRef.current?.click()}
                >
                  оберіть файл
                </button>
              </p>
              <p className="small muted">
                PNG, JPG, WEBP або SVG до 20 МБ. Зона «{PLACEMENT_LABELS[placement]}»: до{' '}
                {limit.maxWidthMm}×{limit.maxHeightMm} мм.
              </p>
            </>
          )}
          {fileInput}
        </div>
        {errors}
      </div>
    );
  }

  const width = activePrint.widthMm * activePrint.scale;
  const height = activePrint.heightMm * activePrint.scale;
  const maxScale = Math.min(
    MAX_SCALE,
    limit.maxWidthMm / activePrint.widthMm,
    limit.maxHeightMm / activePrint.heightMm,
  );
  const maxX = Math.max(0, (limit.maxWidthMm - width) / 2);
  const maxY = Math.max(0, (limit.maxHeightMm - height) / 2);
  const update = (patch: Parameters<CustomizerApi['updatePrint']>[1]) =>
    customizer.updatePrint(placement, patch);

  return (
    <div className="stack">
      <div className="row">
        <span className="small spacer" title={activePrint.fileName}>
          Файл: <strong>{activePrint.fileName}</strong>
        </span>
        <button type="button" className="btn btn--small" onClick={() => inputRef.current?.click()}>
          Замінити
        </button>
        <button
          type="button"
          className="btn btn--small btn--danger"
          onClick={() => customizer.removePrint(placement)}
        >
          Видалити
        </button>
        {fileInput}
      </div>
      {upload.isPending && <span className="small muted">Завантаження…</span>}
      {errors}

      <label className="field">
        Технологія друку
        <select
          value={activePrint.technology}
          onChange={(e) => customizer.setTechnology(placement, e.target.value as PrintTechnology)}
        >
          {PRINT_TECHNOLOGIES.map((t) => (
            <option key={t} value={t}>
              {TECHNOLOGY_LABELS[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        Масштаб: {Math.round(activePrint.scale * 100)}% ({round1(width)}×{round1(height)} мм)
        <input
          type="range"
          min={MIN_SCALE}
          max={Math.max(MIN_SCALE, maxScale)}
          step={0.01}
          value={activePrint.scale}
          onChange={(e) => update({ scale: Number(e.target.value) })}
        />
      </label>

      <label className="field">
        Зміщення по X: {round1(activePrint.offsetX)} мм
        <input
          type="range"
          min={-maxX}
          max={maxX}
          step={1}
          value={activePrint.offsetX}
          disabled={maxX === 0}
          onChange={(e) => update({ offsetX: Number(e.target.value) })}
        />
      </label>

      <label className="field">
        Зміщення по Y: {round1(activePrint.offsetY)} мм
        <input
          type="range"
          min={-maxY}
          max={maxY}
          step={1}
          value={activePrint.offsetY}
          disabled={maxY === 0}
          onChange={(e) => update({ offsetY: Number(e.target.value) })}
        />
      </label>

      <div className="row">
        <button
          type="button"
          className="btn btn--small"
          onClick={() => update({ offsetX: 0, offsetY: 0 })}
        >
          По центру
        </button>
        <button
          type="button"
          className="btn btn--small"
          onClick={() => update({ scale: maxScale, offsetX: 0, offsetY: 0 })}
        >
          На всю зону
        </button>
        <span className="spacer" />
        <span className="small muted">
          Принт ≈ {formatMoney(estimatePrintCost(activePrint, activePrint.technology))}
        </span>
      </div>
    </div>
  );
}
