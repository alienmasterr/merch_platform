const money = new Intl.NumberFormat('uk-UA', {
  style: 'currency',
  currency: 'UAH',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMoney(amount: number): string {
  return money.format(amount);
}

const COLOR_LABELS: Record<string, string> = {
  white: 'Білий',
  black: 'Чорний',
  grey: 'Сірий',
  gray: 'Сірий',
  natural: 'Натуральний',
  red: 'Червоний',
  blue: 'Синій',
  navy: 'Темно-синій',
  green: 'Зелений',
  yellow: 'Жовтий',
  beige: 'Бежевий',
  pink: 'Рожевий',
};

export function colorLabel(color: string): string {
  return COLOR_LABELS[color.toLowerCase()] ?? color;
}

const SWATCHES: Record<string, string> = {
  white: '#fafafa',
  black: '#1f1f23',
  grey: '#9b9ba3',
  gray: '#9b9ba3',
  natural: '#e8dcc4',
  beige: '#e3d3b4',
  navy: '#1f2a52',
};

export function colorSwatch(color: string): string {
  return SWATCHES[color.toLowerCase()] ?? color;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' });
}
