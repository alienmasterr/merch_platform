import { ApparelKind } from '../enums/apparel-kind';
import { PrintPlacement } from '../enums/print-placement';
import { MerchApparelItem, type MerchApparelItemProps } from './merch-apparel-item';

export interface AccessoryItemProps extends MerchApparelItemProps {
  accessoryType: string;
}

export class AccessoryItem extends MerchApparelItem {
  readonly kind = ApparelKind.ACCESSORY;
  readonly accessoryType: string;

  constructor(props: AccessoryItemProps) {
    super(props);
    this.accessoryType = props.accessoryType;
  }

  calculateProductionCost(): number {
    return 20;
  }

  getAllowedPlacements(): PrintPlacement[] {
    return [PrintPlacement.ACCESSORY_FRONT];
  }
}
