const {
  REFUND_STATUS_TRANSITIONS: REFUND_TRANSITIONS,
  RETURN_STATUS_TRANSITIONS: RETURN_TRANSITIONS
} = require('../constants/domainConstants');

const normalizeStatus = value => String(value || '').trim().toLowerCase();

const assertTransition = (transitions, currentStatus, nextStatus, label) => {
  const current = normalizeStatus(currentStatus);
  const next = normalizeStatus(nextStatus);
  const allowed = transitions[current];

  if (!allowed || !allowed.has(next)) {
    const error = new Error(`${label} status cannot move from ${current || 'unknown'} to ${next || 'unknown'}.`);
    error.statusCode = 409;
    throw error;
  }

  return next;
};

const assertReturnTransition = (currentStatus, nextStatus) =>
  assertTransition(RETURN_TRANSITIONS, currentStatus, nextStatus, 'Return');

const assertRefundTransition = (currentStatus, nextStatus) =>
  assertTransition(REFUND_TRANSITIONS, currentStatus, nextStatus, 'Refund');

module.exports = {
  REFUND_TRANSITIONS,
  RETURN_TRANSITIONS,
  assertRefundTransition,
  assertReturnTransition,
  normalizeStatus
};
