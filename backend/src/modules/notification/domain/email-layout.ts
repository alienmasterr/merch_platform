const COLORS = {
  brand: '#4f46e5',
  text: '#18181b',
  muted: '#71717a',
  border: '#e4e4e7',
  page: '#f4f4f7',
  soft: '#fafafa',
};

const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type BadgeTone = 'success' | 'info' | 'warning' | 'danger';

const BADGE: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: '#e7f6ec', fg: '#1b7f3b' },
  info: { bg: '#eef0ff', fg: '#4338ca' },
  warning: { bg: '#fff5e0', fg: '#9a6200' },
  danger: { bg: '#fdecec', fg: '#c62828' },
};

export function badge(label: string, tone: BadgeTone): string {
  const { bg, fg } = BADGE[tone];
  return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${bg};color:${fg};font-size:13px;font-weight:600;">${escapeHtml(label)}</span>`;
}

export function paragraph(html: string, muted = false): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${muted ? COLORS.muted : COLORS.text};">${html}</p>`;
}

export function button(label: string, href: string): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;"><tr>` +
    `<td style="border-radius:8px;background:${COLORS.brand};">` +
    `<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>` +
    `</td></tr></table>`
  );
}

export function infoBox(title: string, html: string): string {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:${COLORS.soft};border:1px solid ${COLORS.border};border-radius:8px;"><tr>` +
    `<td style="padding:14px 16px;font-size:14px;line-height:1.6;color:${COLORS.text};">` +
    `<div style="font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:${COLORS.muted};margin-bottom:4px;">${escapeHtml(title)}</div>${html}` +
    `</td></tr></table>`
  );
}

export interface TableRow {
  label: string;
  value: string;
  total?: boolean;
  muted?: boolean;
}

export function amountTable(rows: TableRow[]): string {
  const cells = rows
    .map((r) => {
      const border = r.total ? `border-top:2px solid ${COLORS.text};` : `border-bottom:1px solid ${COLORS.border};`;
      const weight = r.total ? 'font-weight:700;font-size:16px;' : 'font-size:14px;';
      const color = r.muted ? COLORS.muted : COLORS.text;
      return (
        `<tr><td style="padding:10px 0;${border}${weight}color:${color};">${escapeHtml(r.label)}</td>` +
        `<td align="right" style="padding:10px 0;${border}${weight}color:${color};white-space:nowrap;">${escapeHtml(r.value)}</td></tr>`
      );
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse;">${cells}</table>`;
}

export interface LayoutOptions {
  title: string;
  preheader: string;
  heading: string;
  bodyHtml: string;
}

export function renderEmailLayout({ title, preheader, heading, bodyHtml }: LayoutOptions): string {
  return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:${FONT};color:${COLORS.text};">
<tr><td style="background:${COLORS.brand};padding:20px 28px;font-size:20px;font-weight:700;color:#ffffff;">Merch Platform</td></tr>
<tr><td style="padding:28px 28px 12px;">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${COLORS.text};">${escapeHtml(heading)}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 28px;background:${COLORS.soft};border-top:1px solid ${COLORS.border};font-size:12px;line-height:1.5;color:${COLORS.muted};">
Дякуємо, що обрали Merch Platform.<br>Лист надіслано автоматично, відповідати на нього не потрібно.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
