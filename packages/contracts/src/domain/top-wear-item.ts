import { ApparelKind } from '../enums/apparel-kind';
import { PrintPlacement } from '../enums/print-placement';
import { MerchApparelItem, type MerchApparelItemProps } from './merch-apparel-item';

export interface TopWearItemProps extends MerchApparelItemProps {
  hasHood: boolean;
  hasPockets: boolean;
}

export class TopWearItem extends MerchApparelItem {
  readonly kind = ApparelKind.TOP;
  readonly hasHood: boolean;
  readonly hasPockets: boolean;

  constructor(props: TopWearItemProps) {
    super(props);
    this.hasHood = props.hasHood;
    this.hasPockets = props.hasPockets;
  }

  calculateProductionCost(): number {
    return 50 + (this.hasHood ? 30 : 0) + (this.hasPockets ? 10 : 0);
  }

  getAllowedPlacements(): PrintPlacement[] {
    return [PrintPlacement.CHEST, PrintPlacement.BACK, PrintPlacement.SLEEVE];
  }
}
