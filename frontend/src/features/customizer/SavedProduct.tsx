import type { ReactNode } from 'react';
import type { CustomProduct } from '../../api/types';
import { formatMoney } from '../../shared/format';
import { PLACEMENT_LABELS, TECHNOLOGY_LABELS } from '../../shared/labels';

export function SavedProduct({
  product,
  actions,
}: {
  product: CustomProduct;
  actions?: ReactNode;
}) {
  return (
    <div className="stack" aria-label="Збережений дизайн">
      <div className="alert alert--success">Дизайн збережено.</div>
      {product.previewImageUrl && (
        <object
          data={product.previewImageUrl}
          type="image/svg+xml"
          className="server-preview"
          style={{
            aspectRatio: product.prints.some((p) => p.placement === 'BACK')
              ? '1200 / 740'
              : '6 / 7',
          }}
          aria-label="Прев'ю"
        >
          <a href={product.previewImageUrl} target="_blank" rel="noreferrer">
            Відкрити прев'ю
          </a>
        </object>
      )}
      <table className="table small">
        <tbody>
          <tr>
            <td>Виріб «{product.baseItem.title}»</td>
            <td className="price">{formatMoney(product.baseItem.basePrice)}</td>
          </tr>
          <tr>
            <td>Підготовка до друку</td>
            <td className="price">{formatMoney(product.baseItem.productionCost)}</td>
          </tr>
          {product.prints.map((p) => (
            <tr key={p.placement}>
              <td>
                {PLACEMENT_LABELS[p.placement]}, {TECHNOLOGY_LABELS[p.technology]}
              </td>
              <td className="price">{formatMoney(p.printCost)}</td>
            </tr>
          ))}
          <tr>
            <th>Разом</th>
            <th className="price" data-testid="saved-total">
              {formatMoney(product.totalCost)}
            </th>
          </tr>
        </tbody>
      </table>
      {actions}
    </div>
  );
}
