const EMAIL_LOG_TABLE = 'transactional_email_logs';

const createOnce = (db, { eventKey, recipientEmail, subject, metadata }) => db.query(
  `
    INSERT INTO ${EMAIL_LOG_TABLE} (
      event_key, recipient_email, subject, metadata, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4::jsonb, now(), now())
    ON CONFLICT (event_key) DO NOTHING
    RETURNING id
  `,
  [eventKey, recipientEmail, subject, JSON.stringify(metadata || {})]
);

const reserveRetryable = (db, { eventKey, recipientEmail, subject, metadata }) => db.query(
  `
    INSERT INTO ${EMAIL_LOG_TABLE} (
      event_key, recipient_email, subject, metadata, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4::jsonb, now(), now())
    ON CONFLICT (event_key) DO UPDATE
    SET status = 'sending',
        recipient_email = EXCLUDED.recipient_email,
        subject = EXCLUDED.subject,
        metadata = EXCLUDED.metadata,
        error_message = '',
        updated_at = now()
    WHERE ${EMAIL_LOG_TABLE}.status = 'failed'
    RETURNING id
  `,
  [eventKey, recipientEmail, subject, JSON.stringify(metadata || {})]
);

const markSent = (db, id, delivery = {}) => db.query(
  `
    UPDATE ${EMAIL_LOG_TABLE}
    SET status = 'sent',
        message_id = $2,
        preview_only = $3,
        smtp_configured = $4,
        sent_at = now(),
        updated_at = now()
    WHERE id = $1
  `,
  [id, delivery.messageId || '', Boolean(delivery.previewOnly), Boolean(delivery.smtpConfigured)]
);

const markFailed = (db, id, errorMessage) => db.query(
  `
    UPDATE ${EMAIL_LOG_TABLE}
    SET status = 'failed',
        error_message = $2,
        updated_at = now()
    WHERE id = $1
  `,
  [id, String(errorMessage || 'Unable to send email.').slice(0, 1000)]
);

const listRecent = async (db, { status = '', limit = 20, offset = 0 } = {}) => {
  const values = [];
  const whereSql = status ? `WHERE status = $${values.push(status)}` : '';
  const listValues = [...values, limit, offset];
  const [rowsResult, countResult] = await Promise.all([
    db.query(
      `
        SELECT *
        FROM ${EMAIL_LOG_TABLE}
        ${whereSql}
        ORDER BY created_at DESC, id DESC
        LIMIT $${listValues.length - 1} OFFSET $${listValues.length}
      `,
      listValues
    ),
    db.query(`SELECT COUNT(*)::int AS total FROM ${EMAIL_LOG_TABLE} ${whereSql}`, values)
  ]);
  return {
    rows: rowsResult.rows,
    total: Number(countResult.rows[0]?.total || 0)
  };
};

module.exports = {
  createOnce,
  listRecent,
  markFailed,
  markSent,
  reserveRetryable
};
