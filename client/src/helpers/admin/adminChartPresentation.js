export const ADMIN_ORDER_STATUS_COLORS = Object.freeze([
  '#b7791f',
  '#2563eb',
  '#7c3aed',
  '#0891b2',
  '#ea580c',
  '#10b981',
  '#047857',
  '#b91c1c',
  '#be185d'
]);

export const ADMIN_ORDER_STATUS_COLOR_MAP = Object.freeze({
  pending: ADMIN_ORDER_STATUS_COLORS[0],
  confirmed: ADMIN_ORDER_STATUS_COLORS[1],
  processing: ADMIN_ORDER_STATUS_COLORS[2],
  shipping: ADMIN_ORDER_STATUS_COLORS[3],
  delivery_failed: ADMIN_ORDER_STATUS_COLORS[4],
  delivered: ADMIN_ORDER_STATUS_COLORS[5],
  completed: ADMIN_ORDER_STATUS_COLORS[6],
  refunded: ADMIN_ORDER_STATUS_COLORS[8],
  cancelled: ADMIN_ORDER_STATUS_COLORS[7],
  canceled: ADMIN_ORDER_STATUS_COLORS[7]
});

export const adminOrderStatusColor = (status, fallbackIndex = 0) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  if (ADMIN_ORDER_STATUS_COLOR_MAP[normalizedStatus]) {
    return ADMIN_ORDER_STATUS_COLOR_MAP[normalizedStatus];
  }

  const index = Math.max(0, Number(fallbackIndex) || 0);
  return ADMIN_ORDER_STATUS_COLORS[index % ADMIN_ORDER_STATUS_COLORS.length];
};

const fullCirclePath = startAngle => {
  const x1 = Math.cos(startAngle);
  const y1 = Math.sin(startAngle);
  const oppositeAngle = startAngle + Math.PI;
  const x2 = Math.cos(oppositeAngle);
  const y2 = Math.sin(oppositeAngle);

  return `M 0 0 L ${x1} ${y1} A 1 1 0 1 1 ${x2} ${y2} A 1 1 0 1 1 ${x1} ${y1} Z`;
};

export const buildAdminPieSlices = items => {
  const summary = Array.isArray(items) ? items : [];
  const total = summary.reduce((sum, item) => sum + Number(item.count || 0), 0);

  if (!total) return [];

  let startAngle = -Math.PI / 2;
  return summary.map(item => {
    const count = Number(item.count || 0);
    const angle = (count / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = Math.cos(startAngle);
    const y1 = Math.sin(startAngle);
    const x2 = Math.cos(endAngle);
    const y2 = Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const isFullCircle = angle >= 2 * Math.PI - Number.EPSILON * 10;
    const path = isFullCircle
      ? fullCirclePath(startAngle)
      : `M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} Z`;
    const midAngle = startAngle + angle / 2;
    const midX = Math.cos(midAngle) * 0.65;
    const midY = Math.sin(midAngle) * 0.65;

    startAngle = endAngle;
    return { status: item.status, count, path, midX, midY };
  });
};
