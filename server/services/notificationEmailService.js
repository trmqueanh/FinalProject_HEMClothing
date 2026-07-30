const { createEventKey, sendLoggedEmailOnce } = require('./emailEventService');

const normalizeBaseUrl = value => String(value || '').trim().replace(/\/+$/, '');
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const hasRefundAccountDetails = request => {
  const status = String(request && request.refund_account_status || '').toLowerCase();
  return Boolean(
    request &&
    !['', 'not_provided', 'rejected'].includes(status) &&
    request.refund_bank_name &&
    request.refund_account_number &&
    request.refund_account_holder
  );
};

const getClientBaseUrl = req =>
  normalizeBaseUrl(process.env.CLIENT_URL || process.env.FRONTEND_URL || (req ? `${req.protocol}://${req.get('host')}` : ''));

const parseRecipientList = value =>
  String(value || '')
    .split(/[;,]/)
    .map(entry => entry.trim())
    .filter(Boolean);

const getAdminNotificationRecipients = () => {
  const recipients = [
    ...parseRecipientList(process.env.ADMIN_NOTIFICATION_EMAILS),
    ...parseRecipientList(process.env.ADMIN_NOTIFICATION_EMAIL),
    ...parseRecipientList(process.env.ADMIN_EMAIL)
  ];

  if (!recipients.length && process.env.SMTP_USER) {
    recipients.push(process.env.SMTP_USER);
  }

  return [...new Set(recipients.map(normalizeEmail).filter(Boolean))];
};

const getOrderId = order => String(order && (order.id || order.order_id) || '');
const getOrderShortId = order => `#${getOrderId(order).slice(0, 8).toUpperCase() || 'ORDER'}`;
const getOrderCustomerName = order => String(order && (order.customerName || order.customer_name || order.shippingFullName || order.shipping_full_name) || 'HEM Customer');
const getOrderCustomerEmail = order => normalizeEmail(order && (order.customerEmail || order.customer_email || order.email));
const getOrderStatus = order => String(order && (order.orderStatus || order.order_status) || '').toLowerCase();
const getPaymentMethod = order => String(order && (order.paymentMethod || order.payment_method) || '').toLowerCase();
const getPaymentStatus = order => String(order && (order.paymentStatus || order.payment_status) || '').toLowerCase();
const getOrderTotal = order => Number(order && (order.totalAmount ?? order.total_amount) || 0);
const getOrderSubtotal = order => Number(order && (order.subtotal ?? order.order_subtotal) || 0);
const getOrderShippingFee = order => Number(order && (order.shippingFee ?? order.shipping_fee) || 0);
const getOrderDiscountAmount = order => Number(order && (order.discountAmount ?? order.discount_amount) || 0);
const getOrderVoucherCode = order => String(order && (order.voucherCode || order.voucher_code) || '');
const getOrderPhone = order => String(order && (order.shippingPhone || order.shipping_phone) || '');
const getOrderAddress = order => [
  order && (order.shippingAddressLine || order.shipping_address_line),
  order && (order.shippingWard || order.shipping_ward),
  order && (order.shippingDistrict || order.shipping_district),
  order && (order.shippingCity || order.shipping_city)
].map(value => String(value || '').trim()).filter(Boolean).join(', ');

const formatCurrency = value =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const orderLink = (req, order) => `${getClientBaseUrl(req)}/profile/orders/${encodeURIComponent(getOrderId(order))}`;
const adminOrderLink = (req, order) =>
  `${getClientBaseUrl(req)}/studio/orders/${encodeURIComponent(getOrderId(order))}`;
const adminPaymentsLink = req => `${getClientBaseUrl(req)}/studio/payments`;
const adminReviewsLink = req => `${getClientBaseUrl(req)}/studio/products/reviews`;
const returnLink = (req, returnRequest) => {
  const orderId = String(returnRequest && (returnRequest.orderId || returnRequest.order_id) || '').trim();
  const returnRequestId = String(returnRequest && (returnRequest.id || returnRequest.return_request_id) || '').trim();
  return orderId
    ? `${getClientBaseUrl(req)}/profile/orders/${encodeURIComponent(orderId)}?focus=refund-account${returnRequestId ? `&return=${encodeURIComponent(returnRequestId)}` : ''}`
    : `${getClientBaseUrl(req)}/profile/orders`;
};

const absoluteProductImageUrl = (req, value) => {
  const imageUrl = String(value || '').trim();
  if (!imageUrl) return '';
  if (/^(https?:|data:)/i.test(imageUrl)) return imageUrl;
  const baseUrl = normalizeBaseUrl(process.env.UPLOAD_BASE_URL || (req ? `${req.protocol}://${req.get('host')}` : ''));
  return baseUrl ? `${baseUrl}/${imageUrl.replace(/^\/+/, '')}` : imageUrl;
};

const serializeOrderEmailItem = (req, item) => {
  const quantity = Math.max(1, Number(item && item.quantity || 1));
  const unitPrice = Number(item && (item.priceAtPurchase ?? item.price_at_purchase ?? item.productPrice ?? item.product_price) || 0);

  return {
    name: String(item && (item.productName || item.product_name || item.name) || 'Product'),
    productCode: String(item && (item.productCode || item.product_code || item.product_code_at_purchase) || ''),
    color: String(item && (item.colorName || item.color_name || item.color) || ''),
    size: (() => {
      const value = String(item && (item.sizeLabel || item.size_label || item.size) || '').trim();
      return ['one size', 'free size', 'os', 'n/a'].includes(value.toLowerCase()) ? '' : value;
    })(),
    quantity,
    unitPrice,
    lineTotal: unitPrice * quantity,
    imageUrl: absoluteProductImageUrl(req, item && (item.productImage || item.product_image || item.imageUrl || item.image_url))
  };
};

const buildDetailedOrderEmailData = (req, order, items = [], options = {}) => ({
  orderId: getOrderShortId(order),
  orderDate: order && (order.createdAt || order.created_at) || null,
  customerName: getOrderCustomerName(order),
  customerEmail: getOrderCustomerEmail(order),
  recipientName: String(order && (order.shippingFullName || order.shipping_full_name) || getOrderCustomerName(order)),
  phone: getOrderPhone(order),
  address: getOrderAddress(order),
  shippingNote: String(order && (order.shippingNote || order.shipping_note) || ''),
  paymentMethod: getPaymentMethod(order),
  paymentStatus: getPaymentStatus(order),
  voucherCode: getOrderVoucherCode(order),
  subtotal: getOrderSubtotal(order),
  shippingFee: getOrderShippingFee(order),
  discountAmount: getOrderDiscountAmount(order),
  totalAmount: getOrderTotal(order),
  showDeliveryInformation: options.includeShippingAddress !== false,
  items: Array.isArray(items) ? items.map(item => serializeOrderEmailItem(req, item)) : []
});

const loadOrderEmailItems = async (db, orderId) => {
  if (!db || !orderId) return [];
  const result = await db.query(
    `
      SELECT
        oi.product_name,
        COALESCE((to_jsonb(oi)->>'product_code_at_purchase'), '') AS product_code_at_purchase,
        COALESCE((to_jsonb(oi)->>'price_at_purchase')::numeric, oi.product_price, 0) AS price_at_purchase,
        oi.quantity,
        oi.size_label,
        oi.color_name,
        oi.product_image
      FROM order_items oi
      WHERE oi.order_id = $1
      ORDER BY oi.created_at ASC, oi.id ASC
    `,
    [orderId]
  );
  return result.rows;
};

const loadReturnEmailItems = async (db, returnRequestId) => {
  if (!db || !returnRequestId) return [];
  const result = await db.query(
    `
      SELECT
        oi.product_name,
        COALESCE((to_jsonb(oi)->>'product_code_at_purchase'), '') AS product_code_at_purchase,
        COALESCE((to_jsonb(oi)->>'price_at_purchase')::numeric, oi.product_price, 0) AS price_at_purchase,
        GREATEST(ri.accepted_quantity, ri.received_quantity, ri.approved_quantity, ri.requested_quantity) AS quantity,
        oi.size_label,
        oi.color_name,
        oi.product_image
      FROM return_items ri
      JOIN order_items oi ON oi.id = ri.order_item_id
      WHERE ri.return_request_id = $1
      ORDER BY ri.created_at, ri.id
    `,
    [returnRequestId]
  );
  return result.rows;
};

const baseEmail = (req, to, subject, body, options = {}) => ({
  subject,
  ctaLabel: options.ctaLabel || 'Open HEM',
  preheader: options.preheader || subject,
  websiteUrl: getClientBaseUrl(req),
  actionUrl: options.url || getClientBaseUrl(req),
  body: Array.isArray(body) ? body.filter(Boolean).join('\n\n') : String(body || ''),
  orderDetails: options.orderDetails || null,
  nextSteps: options.nextSteps || null,
  previewOnly: true,
  from: options.from || 'HEM Customer Care <no-reply@hem.local>',
  to
});

const buildOrderConfirmationEmail = (req, order, items = []) => {
  const url = orderLink(req, order);
  const isCod = getPaymentMethod(order) === 'cod';

  return baseEmail(
    req,
    getOrderCustomerEmail(order),
    `HEM order ${getOrderShortId(order)} placed successfully`,
    [
      `Hello ${getOrderCustomerName(order)},`,
      'Thank you for shopping with HEM. Your order has been received.',
      isCod
        ? 'Payment note: please pay when your order is delivered.'
        : 'Payment note: complete the bank transfer shown at checkout, then notify HEM for verification.',
      'You can follow the latest status in your HEM account.'
    ],
    {
      ctaLabel: 'View order',
      preheader: `Your HEM order ${getOrderShortId(order)} was placed successfully.`,
      url,
      orderDetails: buildDetailedOrderEmailData(req, order, items)
    }
  );
};

const buildAdminNewOrderEmail = (req, order, items = [], recipient) =>
  baseEmail(
    req,
    recipient,
    `New HEM order ${getOrderShortId(order)}`,
    [
      'A new order needs admin review.',
      `Customer: ${getOrderCustomerName(order)} <${getOrderCustomerEmail(order) || 'no email'}>`,
      'Open the admin order dashboard to confirm, prepare, and ship this order.'
    ],
    {
      ctaLabel: 'Open orders',
      preheader: `New order ${getOrderShortId(order)} from ${getOrderCustomerName(order)}.`,
      url: adminOrderLink(req, order),
      orderDetails: buildDetailedOrderEmailData(req, order, items),
      from: 'HEM Admin Alerts <no-reply@hem.local>'
    }
  );

const ORDER_STATUS_EMAILS = {
  confirmed: {
    subject: order => `HEM order ${getOrderShortId(order)} is confirmed`,
    body: order => [
      `Hello ${getOrderCustomerName(order)},`,
      'Your order has been confirmed by HEM and will move to preparation soon.',
      `Order: ${getOrderShortId(order)}`,
      'You can follow every update in your HEM account.'
    ],
    ctaLabel: 'View order'
  },
  processing: {
    subject: order => `HEM order ${getOrderShortId(order)} is being prepared`,
    body: order => [
      `Hello ${getOrderCustomerName(order)},`,
      'Your order is being prepared by the HEM team.',
      `Order: ${getOrderShortId(order)}`
    ],
    ctaLabel: 'View order'
  },
  shipping: {
    subject: order => `HEM order ${getOrderShortId(order)} is on the way`,
    body: order => [
      `Hello ${getOrderCustomerName(order)},`,
      'Your order is now on the way.',
      `Order: ${getOrderShortId(order)}`,
      'Please keep your phone available so the delivery partner can reach you.'
    ],
    ctaLabel: 'Track order'
  },
  delivered: {
    subject: order => `Your HEM.Atelier Shop order ${getOrderShortId(order)} has been delivered`,
    body: order => [
      `Hello ${getOrderCustomerName(order)},`,
      `Your order ${getOrderShortId(order)} was successfully delivered on ${new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        dateStyle: 'long'
      }).format(new Date(order && (order.deliveredAt || order.delivered_at) || Date.now()))}.`,
      'Please sign in to HEM.Atelier Shop within 3 days to confirm that you have received your order and are satisfied with your items.',
      'After confirmation, your order will be marked as completed.'
    ],
    ctaLabel: 'Track Order'
  },
  completed: {
    subject: order => `Thanks for confirming HEM order ${getOrderShortId(order)}`,
    body: order => [
      `Hello ${getOrderCustomerName(order)},`,
      'Thank you for confirming that you received your order.',
      `Order: ${getOrderShortId(order)}`,
      'If you have a moment, your review helps other HEM customers choose the right fit and style.'
    ],
    ctaLabel: 'Review order'
  },
  delivery_failed: {
    subject: order => `Delivery issue with HEM order ${getOrderShortId(order)}`,
    body: (order, note) => [
      `Hello ${getOrderCustomerName(order)},`,
      'We could not complete delivery for your order.',
      `Order: ${getOrderShortId(order)}`,
      note ? `Delivery note: ${note}` : '',
      'Please open your order or contact HEM Customer Care so we can retry delivery, correct the address, cancel the order, or process a refund if needed.'
    ],
    ctaLabel: 'View order'
  },
  cancelled: {
    subject: order => `HEM order ${getOrderShortId(order)} was cancelled`,
    body: (order, note) => [
      `Hello ${getOrderCustomerName(order)},`,
      'Your order has been cancelled.',
      `Order: ${getOrderShortId(order)}`,
      note ? `Reason: ${note}` : '',
      getPaymentStatus(order) === 'refund_pending'
        ? 'If this order was paid online, HEM will process the refund next.'
        : ''
    ],
    ctaLabel: 'View order'
  }
};

const buildOrderStatusEmail = (req, order, status, note = '', items = []) => {
  const config = ORDER_STATUS_EMAILS[status];

  if (!config) {
    return null;
  }

  return baseEmail(
    req,
    getOrderCustomerEmail(order),
    config.subject(order),
    config.body(order, note),
    {
      ctaLabel: config.ctaLabel,
      preheader: config.subject(order),
      url: orderLink(req, order),
      orderDetails: buildDetailedOrderEmailData(req, order, items, {
        includeShippingAddress: status !== 'delivered'
      }),
      nextSteps: status === 'delivered'
        ? {
            heading: 'Not completely satisfied with your items?',
            body: 'You may submit a Return Request in HEM.Atelier Shop within 3 days of delivery.'
          }
        : null
    }
  );
};

const sendUserEmail = (req, db, eventKey, email, metadata = {}) =>
  sendLoggedEmailOnce(db, eventKey, email, metadata, { failOpen: true });

const sendAdminEmails = async (req, db, eventParts, buildMessage, metadata = {}) => {
  const recipients = getAdminNotificationRecipients();
  const deliveries = [];

  for (const recipient of recipients) {
    const eventKey = createEventKey(...eventParts, recipient);
    const message = buildMessage(recipient);
    deliveries.push(await sendLoggedEmailOnce(db, eventKey, message, {
      ...metadata,
      adminRecipient: recipient
    }, { failOpen: true }));
  }

  return deliveries;
};

const notifyOrderCreated = async (req, db, order, items = []) => {
  const orderId = getOrderId(order);
  const deliveries = [];

  if (getOrderCustomerEmail(order)) {
    deliveries.push(await sendUserEmail(
      req,
      db,
      createEventKey('order', 'confirmation', orderId),
      buildOrderConfirmationEmail(req, order, items),
      { orderId, emailType: 'order_confirmation' }
    ));
  }

  deliveries.push(...await sendAdminEmails(
    req,
    db,
    ['admin', 'new_order', orderId],
    recipient => buildAdminNewOrderEmail(req, order, items, recipient),
    { orderId, emailType: 'admin_new_order' }
  ));

  return deliveries;
};

const buildBankTransferReportedUserEmail = (req, order, items = []) =>
  baseEmail(
    req,
    getOrderCustomerEmail(order),
    `Payment notification received for HEM order ${getOrderShortId(order)}`,
    [
      `Hello ${getOrderCustomerName(order)},`,
      'We received your payment notification. Your bank transfer is now being verified.',
      `Order: ${getOrderShortId(order)}`,
      `Expected amount: ${formatCurrency(getOrderTotal(order))}`,
      'Your order will move to preparation only after HEM confirms the transfer in the shop bank account.'
    ],
    {
      ctaLabel: 'View order',
      preheader: `HEM is verifying the transfer for ${getOrderShortId(order)}.`,
      url: orderLink(req, order),
      orderDetails: buildDetailedOrderEmailData(req, order, items)
    }
  );

const buildBankTransferReportedAdminEmail = (req, order, items, recipient) =>
  baseEmail(
    req,
    recipient,
    `Bank transfer needs review for HEM order ${getOrderShortId(order)}`,
    [
      'A customer reported a completed bank transfer.',
      `Order: ${getOrderShortId(order)}`,
      `Customer: ${getOrderCustomerName(order)} <${getOrderCustomerEmail(order) || 'no email'}>`,
      `Expected amount: ${formatCurrency(getOrderTotal(order))}`,
      `Transfer description: HEM ${getOrderId(order).slice(0, 8).toUpperCase()}`,
      'Verify the amount, transfer description, recipient account, and transaction time before confirming.'
    ],
    {
      ctaLabel: 'Review payment',
      preheader: `Review the reported transfer for ${getOrderShortId(order)}.`,
      url: adminPaymentsLink(req),
      orderDetails: buildDetailedOrderEmailData(req, order, items),
      from: 'HEM Admin Alerts <no-reply@hem.local>'
    }
  );

const notifyBankTransferReported = async (req, db, order) => {
  const orderId = getOrderId(order);
  const deliveries = [];
  const items = await loadOrderEmailItems(db, orderId);

  if (getOrderCustomerEmail(order)) {
    deliveries.push(await sendUserEmail(
      req,
      db,
      createEventKey('order', 'bank_transfer', 'reported', orderId, order.payment_reported_at || order.paymentReportedAt || ''),
      buildBankTransferReportedUserEmail(req, order, items),
      { orderId, emailType: 'bank_transfer_reported' }
    ));
  }

  deliveries.push(...await sendAdminEmails(
    req,
    db,
    ['admin', 'bank_transfer', 'reported', orderId, order.payment_reported_at || order.paymentReportedAt || ''],
    recipient => buildBankTransferReportedAdminEmail(req, order, items, recipient),
    { orderId, emailType: 'admin_bank_transfer_reported' }
  ));

  return deliveries;
};

const notifyBankTransferConfirmed = async (req, db, order) => {
  const orderId = getOrderId(order);
  const deliveries = [];
  const items = await loadOrderEmailItems(db, orderId);

  if (getOrderCustomerEmail(order)) {
    deliveries.push(await sendUserEmail(
      req,
      db,
      createEventKey('order', 'bank_transfer', 'confirmed', orderId),
      baseEmail(
        req,
        getOrderCustomerEmail(order),
        `Payment confirmed for HEM order ${getOrderShortId(order)}`,
        [
          `Hello ${getOrderCustomerName(order)},`,
          'Your payment has been confirmed. Your order is now being prepared.',
          `Order: ${getOrderShortId(order)}`,
          `Paid amount: ${formatCurrency(getOrderTotal(order))}`
        ],
        {
          ctaLabel: 'View order',
          preheader: `Payment confirmed. ${getOrderShortId(order)} is being prepared.`,
          url: orderLink(req, order),
          orderDetails: buildDetailedOrderEmailData(req, order, items)
        }
      ),
      { orderId, emailType: 'bank_transfer_confirmed_processing' }
    ));
  }

  deliveries.push(...await sendAdminEmails(
    req,
    db,
    ['admin', 'new_paid_order', orderId],
    recipient => baseEmail(
      req,
      recipient,
      `New paid HEM order ${getOrderShortId(order)} ready for processing`,
      [
        'A bank transfer payment was confirmed and the order is ready for preparation.',
        `Order: ${getOrderShortId(order)}`,
        `Customer: ${getOrderCustomerName(order)} <${getOrderCustomerEmail(order) || 'no email'}>`,
        `Paid amount: ${formatCurrency(getOrderTotal(order))}`
      ],
      {
        ctaLabel: 'Open order',
        preheader: `Paid order ${getOrderShortId(order)} is ready for processing.`,
        url: adminOrderLink(req, order),
        orderDetails: buildDetailedOrderEmailData(req, order, items),
        from: 'HEM Admin Alerts <no-reply@hem.local>'
      }
    ),
    { orderId, emailType: 'admin_new_paid_order' }
  ));

  return deliveries;
};

const notifyOrderStatusChanged = async (req, db, order, status = getOrderStatus(order), note = '') => {
  const normalizedStatus = String(status || '').toLowerCase();
  const items = await loadOrderEmailItems(db, getOrderId(order));
  const email = buildOrderStatusEmail(req, order, normalizedStatus, note, items);

  if (!email || !getOrderCustomerEmail(order)) {
    return null;
  }

  return sendUserEmail(
    req,
    db,
    createEventKey('order', 'status', getOrderId(order), normalizedStatus),
    email,
    {
      orderId: getOrderId(order),
      status: normalizedStatus,
      emailType: 'order_status'
    }
  );
};

const buildRefundPendingEmail = (req, order, reason = '', items = [], returnRequest = null, refund = null) =>
  baseEmail(
    req,
    getOrderCustomerEmail(order),
    `Refund processing for HEM order ${getOrderShortId(order)}`,
    [
      `Hello ${getOrderCustomerName(order)},`,
      'A refund is now pending for your order.',
      `Order: ${getOrderShortId(order)}`,
      reason ? `Reason: ${reason}` : '',
      !hasRefundAccountDetails(returnRequest || refund)
        ? 'Action required: provide your refund bank account before HEM can transfer the money.'
        : 'HEM will update your order again when the refund is completed.'
    ],
    {
      ctaLabel: !hasRefundAccountDetails(returnRequest || refund)
        ? 'Provide refund account'
        : 'View order',
      preheader: `Refund pending for ${getOrderShortId(order)}.`,
      url: returnRequest ? returnLink(req, returnRequest) : orderLink(req, order),
      orderDetails: buildDetailedOrderEmailData(req, order, items)
    }
  );

const buildRefundCompletedEmail = (req, order, items = []) =>
  baseEmail(
    req,
    getOrderCustomerEmail(order),
    `Refund completed for HEM order ${getOrderShortId(order)}`,
    [
      `Hello ${getOrderCustomerName(order)},`,
      'Your refund has been completed.',
      `Order: ${getOrderShortId(order)}`,
      `Refund amount: ${formatCurrency(Number(order && (order.refundAmount ?? order.refund_amount) || getOrderTotal(order)))}`,
      'Depending on your bank or card provider, it may take extra time before the funds appear in your account.'
    ],
    {
      ctaLabel: 'View order',
      preheader: `Refund completed for ${getOrderShortId(order)}.`,
      url: orderLink(req, order),
      orderDetails: buildDetailedOrderEmailData(req, order, items)
    }
  );

const buildAdminRefundPendingEmail = (req, order, reason, recipient, items = []) =>
  baseEmail(
    req,
    recipient,
    `Refund needs processing for ${getOrderShortId(order)}`,
    [
      'A refund needs admin processing.',
      `Order: ${getOrderShortId(order)}`,
      `Customer: ${getOrderCustomerName(order)} <${getOrderCustomerEmail(order) || 'no email'}>`,
      `Total: ${formatCurrency(getOrderTotal(order))}`,
      reason ? `Reason: ${reason}` : '',
      'Open the admin order dashboard to review and mark the refund as completed.'
    ],
    {
      ctaLabel: 'Open orders',
      preheader: `Refund pending for ${getOrderShortId(order)}.`,
      url: adminOrderLink(req, order),
      orderDetails: buildDetailedOrderEmailData(req, order, items),
      from: 'HEM Admin Alerts <no-reply@hem.local>'
    }
  );

const notifyRefundPending = async (req, db, order, refundOrReason = '') => {
  const orderId = getOrderId(order);
  const refund = refundOrReason && typeof refundOrReason === 'object' ? refundOrReason : null;
  const reason = refund ? String(refund.reason || '') : String(refundOrReason || '');
  const refundId = String(refund && refund.id || orderId);
  const deliveries = [];
  const items = refund && refund.return_request_id
    ? await loadReturnEmailItems(db, refund.return_request_id)
    : await loadOrderEmailItems(db, orderId);
  const returnRequest = refund && refund.return_request_id
    ? await loadReturnContext(db, refund.return_request_id)
    : null;

  if (getOrderCustomerEmail(order)) {
    deliveries.push(await sendUserEmail(
      req,
      db,
      createEventKey('refund', 'pending', refundId),
      buildRefundPendingEmail(req, order, reason, items, returnRequest, refund),
      { orderId, reason, emailType: 'refund_pending' }
    ));
  }

  deliveries.push(...await sendAdminEmails(
    req,
    db,
    ['admin', 'refund_pending', refundId],
    recipient => buildAdminRefundPendingEmail(req, order, reason, recipient, items),
    { orderId, reason, emailType: 'admin_refund_pending' }
  ));

  return deliveries;
};

const notifyRefundCompleted = async (req, db, order, refund = null) => {
  if (!getOrderCustomerEmail(order)) {
    return null;
  }

  const items = refund && refund.return_request_id
    ? await loadReturnEmailItems(db, refund.return_request_id)
    : await loadOrderEmailItems(db, getOrderId(order));
  return sendUserEmail(
    req,
    db,
    createEventKey('refund', 'completed', String(refund && refund.id || getOrderId(order))),
    buildRefundCompletedEmail(req, {
      ...order,
      refund_amount: refund ? Number(refund.approved_amount || refund.requested_amount || 0) : order.refund_amount
    }, items),
    { orderId: getOrderId(order), refundId: refund && refund.id, emailType: 'refund_completed' }
  );
};

const loadReturnContext = async (db, returnRequestId) => {
  const result = await db.query(
    `
      SELECT
        rr.*,
        u.name AS customer_name,
        u.email AS customer_email,
        o.subtotal,
        o.shipping_fee,
        o.discount_amount,
        o.voucher_code,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.order_status,
        o.shipping_full_name,
        o.shipping_phone,
        o.shipping_city,
        o.shipping_district,
        o.shipping_ward,
        o.shipping_address_line,
        o.shipping_note,
        o.created_at AS order_created_at
      FROM return_requests rr
      JOIN orders o ON o.id = rr.order_id
      JOIN users u ON u.id = rr.user_id
      WHERE rr.id = $1
      LIMIT 1
    `,
    [returnRequestId]
  );

  return result.rows[0] || null;
};

const getReturnId = returnRequest => String(returnRequest && (returnRequest.id || returnRequest.return_request_id) || '');
const getReturnOrderId = returnRequest => String(returnRequest && (returnRequest.orderId || returnRequest.order_id) || '');
const getReturnStatus = returnRequest => String(returnRequest && (returnRequest.returnStatus || returnRequest.return_status) || '').toLowerCase();
const getReturnCustomerEmail = returnRequest => normalizeEmail(returnRequest && (returnRequest.customerEmail || returnRequest.customer_email || returnRequest.email));
const getReturnCustomerName = returnRequest => String(returnRequest && (returnRequest.customerName || returnRequest.customer_name) || 'HEM Customer');
const returnContextOrder = context => ({
  ...context,
  id: getReturnOrderId(context),
  created_at: context && context.order_created_at
});

const RETURN_STATUS_COPY = {
  requested: {
    subject: request => `Return request received for HEM order #${getReturnOrderId(request).slice(0, 8).toUpperCase()}`,
    body: request => [
      `Hello ${getReturnCustomerName(request)},`,
      'We received your return request.',
      `Order: #${getReturnOrderId(request).slice(0, 8).toUpperCase()}`,
      'HEM will review the request and email you again when it is approved or rejected.'
    ],
    ctaLabel: 'View order'
  },
  approved: {
    subject: request => `Return approved for HEM order #${getReturnOrderId(request).slice(0, 8).toUpperCase()}`,
    body: request => [
      `Hello ${getReturnCustomerName(request)},`,
      'Your return request has been approved.',
      `Order: #${getReturnOrderId(request).slice(0, 8).toUpperCase()}`,
      'Please send or bring back the item according to HEM Customer Care instructions.'
    ],
    ctaLabel: 'View order'
  },
  awaiting_return: {
    subject: request => `Return approved for HEM order #${getReturnOrderId(request).slice(0, 8).toUpperCase()}`,
    body: request => [
      `Hello ${getReturnCustomerName(request)},`,
      'Your selected return quantities were approved.',
      `Order: #${getReturnOrderId(request).slice(0, 8).toUpperCase()}`,
      'Please ship only the approved products back to HEM.',
      'Action required: provide your refund bank account in HEM. A refund is created only if the returned products pass inspection.',
      'For your security, do not send bank account details by replying to this email.'
    ],
    ctaLabel: 'Provide refund account'
  },
  rejected: {
    subject: request => `Return update for HEM order #${getReturnOrderId(request).slice(0, 8).toUpperCase()}`,
    body: request => [
      `Hello ${getReturnCustomerName(request)},`,
      'Your return request was not approved.',
      `Order: #${getReturnOrderId(request).slice(0, 8).toUpperCase()}`,
      request && request.admin_note ? `Admin note: ${request.admin_note}` : 'Please contact HEM Customer Care if you need more details.'
    ],
    ctaLabel: 'View order'
  },
  received: {
    subject: _request => `HEM received your returned item`,
    body: request => [
      `Hello ${getReturnCustomerName(request)},`,
      'HEM has received your returned item.',
      `Order: #${getReturnOrderId(request).slice(0, 8).toUpperCase()}`,
      'The products will now be inspected. A refund is created only for quantities that pass inspection.'
    ],
    ctaLabel: 'View order'
  },
  inspecting: {
    subject: _request => `Inspection started for your HEM return`,
    body: request => [
      `Hello ${getReturnCustomerName(request)},`,
      'HEM has started inspecting your returned products.',
      `Order: #${getReturnOrderId(request).slice(0, 8).toUpperCase()}`
    ],
    ctaLabel: 'View return'
  },
  inspection_approved: {
    subject: _request => `Inspection passed for your HEM return`,
    body: request => [
      `Hello ${getReturnCustomerName(request)},`,
      'One or more returned products passed inspection. HEM created a refund for the accepted quantities.',
      `Order: #${getReturnOrderId(request).slice(0, 8).toUpperCase()}`
    ],
    ctaLabel: 'View return'
  },
  inspection_rejected: {
    subject: _request => `Inspection result for your HEM return`,
    body: request => [
      `Hello ${getReturnCustomerName(request)},`,
      'The returned products did not pass inspection, so no refund was created.',
      `Order: #${getReturnOrderId(request).slice(0, 8).toUpperCase()}`,
      request && request.rejection_reason ? `Reason: ${request.rejection_reason}` : ''
    ],
    ctaLabel: 'View return'
  },
  refund_pending: {
    subject: _request => `Refund created for your HEM return`,
    body: request => [
      `Hello ${getReturnCustomerName(request)},`,
      'A manual refund is pending for the quantities accepted after inspection.',
      `Order: #${getReturnOrderId(request).slice(0, 8).toUpperCase()}`
    ],
    ctaLabel: 'View return'
  },
  completed: {
    subject: request => `Return completed for HEM order #${getReturnOrderId(request).slice(0, 8).toUpperCase()}`,
    body: request => [
      `Hello ${getReturnCustomerName(request)},`,
      'Your return request has been completed.',
      `Order: #${getReturnOrderId(request).slice(0, 8).toUpperCase()}`
    ],
    ctaLabel: 'View order'
  }
};

const buildReturnStatusEmail = (req, returnRequest, items = []) => {
  const status = getReturnStatus(returnRequest);
  const copy = RETURN_STATUS_COPY[status];

  if (!copy) {
    return null;
  }

  return baseEmail(
    req,
    getReturnCustomerEmail(returnRequest),
    copy.subject(returnRequest),
    copy.body(returnRequest),
    {
      ctaLabel: copy.ctaLabel,
      preheader: copy.subject(returnRequest),
      url: returnLink(req, returnRequest),
      orderDetails: buildDetailedOrderEmailData(req, returnContextOrder(returnRequest), items)
    }
  );
};

const buildAdminReturnRequestEmail = (req, returnRequest, recipient, items = []) =>
  baseEmail(
    req,
    recipient,
    `New return request for order #${getReturnOrderId(returnRequest).slice(0, 8).toUpperCase()}`,
    [
      'A customer submitted a return request.',
      `Customer: ${getReturnCustomerName(returnRequest)} <${getReturnCustomerEmail(returnRequest) || 'no email'}>`,
      `Order: #${getReturnOrderId(returnRequest).slice(0, 8).toUpperCase()}`,
      `Reason: ${String(returnRequest && returnRequest.reason || 'not provided')}`,
      returnRequest && returnRequest.note ? `Customer note: ${returnRequest.note}` : '',
      'Open the admin return request list to approve, reject, or mark the returned item as received.'
    ],
    {
      ctaLabel: 'Open returns',
      preheader: `New return request for order #${getReturnOrderId(returnRequest).slice(0, 8).toUpperCase()}.`,
      url: adminOrderLink(req, returnContextOrder(returnRequest)),
      orderDetails: buildDetailedOrderEmailData(req, returnContextOrder(returnRequest), items),
      from: 'HEM Admin Alerts <no-reply@hem.local>'
    }
  );

const notifyReturnRequested = async (req, db, returnRequest) => {
  const context = await loadReturnContext(db, getReturnId(returnRequest));

  if (!context) {
    return [];
  }

  const deliveries = [];
  const items = await loadReturnEmailItems(db, getReturnId(context));
  const userEmail = buildReturnStatusEmail(req, context, items);

  if (userEmail && getReturnCustomerEmail(context)) {
    deliveries.push(await sendUserEmail(
      req,
      db,
      createEventKey('return', 'requested', getReturnId(context)),
      userEmail,
      {
        returnRequestId: getReturnId(context),
        orderId: getReturnOrderId(context),
        emailType: 'return_requested'
      }
    ));
  }

  deliveries.push(...await sendAdminEmails(
    req,
    db,
    ['admin', 'return_requested', getReturnId(context)],
    recipient => buildAdminReturnRequestEmail(req, context, recipient, items),
    {
      returnRequestId: getReturnId(context),
      orderId: getReturnOrderId(context),
      emailType: 'admin_return_requested'
    }
  ));

  return deliveries;
};

const notifyReturnStatusChanged = async (req, db, returnRequest, statusOverride = '') => {
  const loadedContext = await loadReturnContext(db, getReturnId(returnRequest));

  if (!loadedContext) {
    return null;
  }

  const context = statusOverride
    ? { ...loadedContext, return_status: String(statusOverride).toLowerCase() }
    : loadedContext;

  const status = getReturnStatus(context);
  const items = await loadReturnEmailItems(db, getReturnId(context));
  const email = buildReturnStatusEmail(req, context, items);

  if (!email || !getReturnCustomerEmail(context)) {
    return null;
  }

  return sendUserEmail(
    req,
    db,
    createEventKey('return', 'status', getReturnId(context), status),
    email,
    {
      returnRequestId: getReturnId(context),
      orderId: getReturnOrderId(context),
      status,
      emailType: 'return_status'
    }
  );
};

const maskBankAccount = value => {
  const normalized = String(value || '').replace(/\s+/g, '');
  return normalized ? `${'*'.repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}` : '';
};

const notifyRefundAccountSubmitted = async (req, db, returnRequestId) => {
  const context = await loadReturnContext(db, returnRequestId);
  if (!context) {
    const result = await db.query(
      `SELECT r.*, o.id AS order_id, u.name AS customer_name, u.email AS customer_email
       FROM refunds r
       JOIN orders o ON o.id = r.order_id
       JOIN users u ON u.id = r.user_id
       WHERE r.id = $1 LIMIT 1`,
      [returnRequestId]
    );
    const refund = result.rows[0];
    if (!refund) return [];
    const accountLabel = `${refund.refund_bank_name || 'Bank'} ${maskBankAccount(refund.refund_account_number)}`.trim();
    const order = { id: refund.order_id, customer_name: refund.customer_name, customer_email: refund.customer_email };
    const deliveries = [];
    if (refund.customer_email) {
      deliveries.push(await sendUserEmail(
        req,
        db,
        createEventKey('refund', 'account', 'submitted', refund.id, refund.refund_account_submitted_at || ''),
        baseEmail(req, refund.customer_email, `Refund account received for order ${getOrderShortId(order)}`, [
          `Hello ${refund.customer_name || 'Customer'},`,
          `HEM received your refund account: ${accountLabel}.`,
          'The account is ready for the pending refund.'
        ], { ctaLabel: 'View order', url: orderLink(req, order) }),
        { orderId: refund.order_id, refundId: refund.id, emailType: 'refund_account_submitted' }
      ));
    }
    return deliveries;
  }
  const accountLabel = `${context.refund_bank_name || 'Bank'} ${maskBankAccount(context.refund_account_number)}`.trim();
  const deliveries = [];

  if (getReturnCustomerEmail(context)) {
    deliveries.push(await sendUserEmail(
      req,
      db,
      createEventKey('return', 'refund_account', 'submitted', returnRequestId, context.refund_account_submitted_at || ''),
      baseEmail(
        req,
        getReturnCustomerEmail(context),
        `Refund account received for return ${context.return_code}`,
        [
          `Hello ${getReturnCustomerName(context)},`,
          `HEM received your refund account: ${accountLabel}.`,
          'The account is saved and ready to receive your approved refund.'
        ],
        {
          ctaLabel: 'View return',
          url: returnLink(req, context)
        }
      ),
      { returnRequestId, emailType: 'refund_account_submitted' }
    ));
  }

  deliveries.push(...await sendAdminEmails(
    req,
    db,
    ['admin', 'refund_account', 'submitted', returnRequestId, context.refund_account_submitted_at || ''],
    recipient => baseEmail(
      req,
      recipient,
      `Refund account saved for ${context.return_code}`,
      [
        `${getReturnCustomerName(context)} submitted a refund account.`,
        `Bank: ${context.refund_bank_name || '-'}`,
        `Account: ${accountLabel}`,
        `Holder: ${context.refund_account_holder || '-'}`,
        'The account is ready to use when processing the product-return refund.'
      ],
      {
        ctaLabel: 'Review return',
        url: adminOrderLink(req, returnContextOrder(context)),
        from: 'HEM Admin Alerts <no-reply@hem.local>'
      }
    ),
    { returnRequestId, emailType: 'admin_refund_account_submitted' }
  ));

  return deliveries;
};

const loadReviewContext = async (db, reviewId) => {
  const result = await db.query(
    `
      SELECT
        pr.id,
        pr.product_id,
        pr.user_id,
        pr.order_id,
        pr.rating,
        pr.comment,
        p.name AS product_name,
        u.name AS customer_name,
        u.email AS customer_email,
        oi.color_name,
        oi.size_label
      FROM product_reviews pr
      JOIN products p ON p.id = pr.product_id
      JOIN users u ON u.id = pr.user_id
      LEFT JOIN order_items oi
        ON oi.order_id = pr.order_id
       AND oi.product_id = pr.product_id
      WHERE pr.id = $1
      LIMIT 1
    `,
    [reviewId]
  );

  return result.rows[0] || null;
};

const buildAdminReviewAlertEmail = (req, review, recipient) =>
  baseEmail(
    req,
    recipient,
    `New HEM review: ${Number(review && review.rating || 0)} stars`,
    [
      'A customer submitted a new product review.',
      `Product: ${String(review && review.product_name || 'Product')}`,
      `Customer: ${String(review && review.customer_name || 'Customer')} <${normalizeEmail(review && review.customer_email) || 'no email'}>`,
      `Rating: ${Number(review && review.rating || 0)} / 5`,
      review && review.comment ? `Comment: ${review.comment}` : 'Comment: No comment',
      'Open Product Reviews in admin to read and reply.'
    ],
    {
      ctaLabel: 'Open reviews',
      preheader: `New ${Number(review && review.rating || 0)} star review for ${String(review && review.product_name || 'a product')}.`,
      url: adminReviewsLink(req),
      from: 'HEM Admin Alerts <no-reply@hem.local>'
    }
  );

const notifyNewReview = async (req, db, reviewId) => {
  const review = await loadReviewContext(db, reviewId);

  if (!review) {
    return [];
  }

  return sendAdminEmails(
    req,
    db,
    ['admin', 'new_review', String(review.id || reviewId)],
    recipient => buildAdminReviewAlertEmail(req, review, recipient),
    {
      reviewId: String(review.id || reviewId),
      productId: String(review.product_id || ''),
      rating: Number(review.rating || 0),
      emailType: 'admin_new_review'
    }
  );
};

module.exports = {
  buildOrderConfirmationEmail,
  buildOrderStatusEmail,
  getAdminNotificationRecipients,
  notifyBankTransferConfirmed,
  notifyBankTransferReported,
  notifyNewReview,
  notifyOrderCreated,
  notifyOrderStatusChanged,
  notifyRefundAccountSubmitted,
  notifyRefundCompleted,
  notifyRefundPending,
  notifyReturnRequested,
  notifyReturnStatusChanged
};
