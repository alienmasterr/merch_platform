import { ValidationError } from '../errors';
import { ApparelKind } from '../enums/apparel-kind';
import { PrintPlacement } from '../enums/print-placement';
import { MerchApparelItem, type MerchApparelItemProps } from './merch-apparel-item';

export interface BottomWearItemProps extends MerchApparelItemProps {
  waistCm: number;
  lengthCm: number;
}

export class BottomWearItem extends MerchApparelItem {
  readonly kind = ApparelKind.BOTTOM;
  readonly waistCm: number;
  readonly lengthCm: number;

  constructor(props: BottomWearItemProps) {
    super(props);
    if (!(props.waistCm > 0) || !(props.lengthCm > 0)) {
      throw new ValidationError('waistCm and lengthCm must be positive');
    }
    this.waistCm = props.waistCm;
    this.lengthCm = props.lengthCm;
  }

  calculateProductionCost(): number {
    return 40 + (this.lengthCm > 100 ? 10 : 0);
  }

  getAllowedPlacements(): PrintPlacement[] {
    return [PrintPlacement.LEFT_LEG, PrintPlacement.RIGHT_LEG];
  }
}
