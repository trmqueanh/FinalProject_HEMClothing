export const ADMIN_STATUS_COLORS = Object.freeze({
  pending: '#92400e',
  processing: '#1e40af',
  completed: '#065f46',
  danger: '#991b1b'
});

export const adminPaymentStatusClass = value => {
  const status = String(value || '').toLowerCase();

  if (status === 'paid') return 'status--completed';
  if (status === 'payment_expired' || status === 'payment_cancelled' || status === 'payment_rejected' || status === 'failed' || status === 'refunded') {
    return 'status--danger';
  }
  if (status === 'payment_under_review' || status === 'refund_pending') {
    return 'status--processing';
  }

  return 'status--pending';
};

export const adminOrderStatusClass = value => {
  const status = String(value || '').toLowerCase();

  if (status === 'delivered' || status === 'completed') return 'status--completed';
  if (status === 'confirmed' || status === 'processing' || status === 'shipping') {
    return 'status--processing';
  }
  if (status === 'cancelled' || status === 'refunded' || status === 'delivery_failed') {
    return 'status--danger';
  }

  return 'status--pending';
};

export const adminWorkflowStatusClass = value => {
  const status = String(value || '').toLowerCase();

  if (['completed', 'received'].includes(status)) return 'status--completed';
  if (['approved', 'awaiting_return', 'inspecting', 'processing', 'refund_pending'].includes(status)) {
    return 'status--processing';
  }
  if (['rejected', 'failed', 'cancelled'].includes(status)) return 'status--danger';

  return 'status--pending';
};
