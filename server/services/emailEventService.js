const { sendTransactionalEmail } = require('./emailService');
const emailLogModel = require('../models/emailLogModel');

const normalizeEmail = value => String(value || '').trim().toLowerCase();

const createEventKey = (...parts) =>
  parts
    .flat()
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join(':');

const timestampMarker = value => {
  const time = new Date(value || Date.now()).getTime();
  return Number.isFinite(time) ? String(time) : String(Date.now());
};

const sendLoggedEmailOnce = async (db, eventKey, message, metadata = {}, options = {}) => {
  if (!db || !eventKey || !message || !message.to || !message.subject) {
    return {
      skipped: true,
      eventKey,
      subject: message && message.subject,
      to: message && message.to
    };
  }

  const insertResult = await emailLogModel.reserveRetryable(db, {
    eventKey,
    recipientEmail: normalizeEmail(message.to),
    subject: String(message.subject || ''),
    metadata
  });

  if (!insertResult.rowCount) {
    return {
      skipped: true,
      duplicate: true,
      eventKey,
      subject: message.subject,
      to: message.to
    };
  }

  const logId = insertResult.rows[0].id;

  try {
    const delivery = await sendTransactionalEmail(message);
    await emailLogModel.markSent(db, logId, delivery);

    return {
      ...delivery,
      eventKey
    };
  } catch (error) {
    await emailLogModel.markFailed(db, logId, error && error.message);

    if (options.failOpen) {
      return {
        error: true,
        eventKey,
        subject: message.subject,
        to: message.to,
        message: error && error.message ? error.message : 'Unable to send email.'
      };
    }

    throw error;
  }
};

module.exports = {
  createEventKey,
  sendLoggedEmailOnce,
  timestampMarker
};
