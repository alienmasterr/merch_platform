import type { ApparelItem } from '../api/types';
import { CANVAS } from './canvas';
import { colorSwatch } from './format';

type GarmentInfo = Pick<ApparelItem, 'kind' | 'color'> &
  Partial<Pick<ApparelItem, 'accessoryType' | 'hasHood'>>;

const TEE =
  'M200 40 L20 150 L70 260 L130 225 L125 670 L475 670 L470 225 L530 260 L580 150 L400 40 Q300 95 200 40 Z';
const HOOD = 'M215 48 Q300 -20 385 48 Q300 100 215 48 Z';
const POCKET = 'M200 520 L400 520 L420 610 L180 610 Z';
const PANTS = 'M140 30 L460 30 L490 680 L330 680 L300 250 L270 680 L110 680 Z';
const MUG_HANDLE = 'M430 270 Q520 270 520 360 Q520 450 430 450';
const TOTE_HANDLES = 'M210 190 Q210 60 300 60 Q390 60 390 190';

export function GarmentShape({
  item,
  view = 'front',
}: {
  item: GarmentInfo;
  view?: 'front' | 'back';
}) {
  const fill = colorSwatch(item.color);
  const stroke = 'rgb(0 0 0 / 35%)';
  const common = { fill, stroke, strokeWidth: 3, strokeLinejoin: 'round' as const };

  if (item.kind === 'BOTTOM') return <path d={PANTS} {...common} />;

  if (item.kind === 'ACCESSORY') {
    if (item.accessoryType === 'mug') {
      return (
        <g>
          <path d={MUG_HANDLE} fill="none" stroke={stroke} strokeWidth={34} strokeLinecap="round" />
          <path d={MUG_HANDLE} fill="none" stroke={fill} strokeWidth={28} strokeLinecap="round" />
          <rect x={160} y={200} width={280} height={330} rx={26} {...common} />
        </g>
      );
    }
    return (
      <g>
        <path d={TOTE_HANDLES} fill="none" stroke={stroke} strokeWidth={22} />
        <path d={TOTE_HANDLES} fill="none" stroke={fill} strokeWidth={16} />
        <rect x={130} y={180} width={340} height={460} rx={10} {...common} />
      </g>
    );
  }

  return (
    <g>
      <path d={TEE} {...common} />
      {item.hasHood && (
        <>
          <path d={HOOD} {...common} />
          {view === 'front' && <path d={POCKET} {...common} fill="none" />}
        </>
      )}
    </g>
  );
}

export function GarmentThumb({ item, label }: { item: GarmentInfo; label: string }) {
  return (
    <svg
      viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
      role="img"
      aria-label={label}
      className="garment-thumb"
    >
      <GarmentShape item={item} />
    </svg>
  );
}
