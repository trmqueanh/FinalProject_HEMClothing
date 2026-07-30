const nodemailer = require('nodemailer');
const { isProduction, readBoolean } = require('../config/env');

const hasSmtpConfig = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const createTransporter = () => {
  if (!hasSmtpConfig()) {
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: readBoolean(process.env.SMTP_SECURE),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const escapeHtml = value =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatCurrency = value =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const formatOrderDate = value => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const formatPaymentMethod = value =>
  String(value || '').toLowerCase() === 'cod' ? 'Cash on Delivery' : 'Bank Transfer (QR Code)';

const formatStatus = value =>
  String(value || 'pending')
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const buildOrderDetailsText = details => {
  if (!details) return '';
  const showDeliveryInformation = details.showDeliveryInformation !== false;
  const itemLines = Array.isArray(details.items)
    ? details.items.map(item => [
        `- ${item.name}`,
        item.productCode ? `Code ${item.productCode}` : '',
        [item.color, item.size].filter(Boolean).join(' / '),
        `Qty ${item.quantity}`,
        `${formatCurrency(item.unitPrice)} each`,
        `Line total ${formatCurrency(item.lineTotal)}`
      ].filter(Boolean).join(' · '))
    : [];

  return [
    `Order: ${details.orderId || ''}`,
    details.orderDate ? `Order date: ${formatOrderDate(details.orderDate)}` : '',
    showDeliveryInformation ? `Recipient: ${details.recipientName || ''}` : '',
    showDeliveryInformation && details.customerEmail ? `Email: ${details.customerEmail}` : '',
    showDeliveryInformation && details.phone ? `Phone: ${details.phone}` : '',
    showDeliveryInformation && details.address ? `Address: ${details.address}` : '',
    showDeliveryInformation && details.shippingNote ? `Delivery note: ${details.shippingNote}` : '',
    '',
    'Items:',
    ...itemLines,
    '',
    `Subtotal: ${formatCurrency(details.subtotal)}`,
    `Shipping fee: ${Number(details.shippingFee || 0) === 0 ? 'Free' : formatCurrency(details.shippingFee)}`,
    details.voucherCode ? `Voucher: ${details.voucherCode}` : '',
    `Discount: -${formatCurrency(details.discountAmount)}`,
    `Total: ${formatCurrency(details.totalAmount)}`,
    `Payment: ${formatPaymentMethod(details.paymentMethod)} (${formatStatus(details.paymentStatus)})`
  ].filter(line => line !== null && line !== undefined).join('\n');
};

const buildTextBody = message => [
  String(message.body || '').trim(),
  buildOrderDetailsText(message.orderDetails),
  message.nextSteps
    ? [
        'NEXT STEPS',
        String(message.nextSteps.heading || '').trim(),
        String(message.nextSteps.body || '').trim()
      ].filter(Boolean).join('\n\n')
    : '',
  'Kind regards,\nThe HEM.Atelier Shop Team'
].filter(Boolean).join('\n\n');

const buildOrderDetailsHtml = details => {
  if (!details) return '';
  const items = Array.isArray(details.items) ? details.items : [];
  const itemRows = items.map(item => {
    const image = item.imageUrl
      ? `<img src="${escapeHtml(item.imageUrl)}" width="72" height="90" alt="${escapeHtml(item.name || 'HEM product')}" style="display:block;width:72px;height:90px;border:0;background:#f5f5f3;object-fit:cover;" />`
      : `<div style="display:table-cell;width:72px;height:90px;background:#f2f1ee;color:#77736d;text-align:center;vertical-align:middle;font-size:12px;font-weight:700;">HEM</div>`;
    const variants = [item.color ? `Color ${item.color}` : '', item.size ? `Size ${item.size}` : ''].filter(Boolean).join(' · ');

    return `
      <tr>
        <td width="88" valign="top" style="padding:16px 16px 16px 0;border-bottom:1px solid #ece8e1;">${image}</td>
        <td valign="top" style="padding:16px 12px 16px 0;border-bottom:1px solid #ece8e1;">
          <p style="margin:0 0 5px;color:#111111;font-size:14px;line-height:1.4;font-weight:700;">${escapeHtml(item.name || 'Product')}</p>
          ${item.productCode ? `<p style="margin:0 0 4px;color:#77736d;font-size:12px;line-height:1.4;">Product code ${escapeHtml(item.productCode)}</p>` : ''}
          ${variants ? `<p style="margin:0 0 4px;color:#77736d;font-size:12px;line-height:1.4;">${escapeHtml(variants)}</p>` : ''}
          <p style="margin:0;color:#77736d;font-size:12px;line-height:1.4;">Quantity ${escapeHtml(item.quantity)}</p>
        </td>
        <td width="126" valign="top" align="right" style="padding:16px 0;border-bottom:1px solid #ece8e1;white-space:nowrap;">
          <p style="margin:0 0 5px;color:#77736d;font-size:12px;line-height:1.4;">${escapeHtml(formatCurrency(item.unitPrice))} each</p>
          <p style="margin:0;color:#111111;font-size:14px;line-height:1.4;font-weight:700;">${escapeHtml(formatCurrency(item.lineTotal))}</p>
        </td>
      </tr>
    `;
  }).join('');
  const orderDate = formatOrderDate(details.orderDate);
  const shippingFee = Number(details.shippingFee || 0) === 0 ? 'Free' : formatCurrency(details.shippingFee);
  const deliveryInformation = details.showDeliveryInformation === false
    ? ''
    : `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 0;background:#f7f6f3;">
      <tr>
        <td style="padding:18px;">
          <p style="margin:0 0 10px;color:#8b6f58;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Delivery information</p>
          <p style="margin:0 0 5px;color:#111111;font-size:14px;font-weight:700;">${escapeHtml(details.recipientName || details.customerName || 'Customer')}</p>
          ${details.customerEmail ? `<p style="margin:0 0 4px;color:#55524e;font-size:13px;line-height:1.5;">${escapeHtml(details.customerEmail)}</p>` : ''}
          ${details.phone ? `<p style="margin:0 0 4px;color:#55524e;font-size:13px;line-height:1.5;">${escapeHtml(details.phone)}</p>` : ''}
          ${details.address ? `<p style="margin:0;color:#55524e;font-size:13px;line-height:1.55;">${escapeHtml(details.address)}</p>` : ''}
          ${details.shippingNote ? `<p style="margin:8px 0 0;color:#77736d;font-size:12px;line-height:1.5;font-style:italic;">Delivery note: ${escapeHtml(details.shippingNote)}</p>` : ''}
        </td>
      </tr>
    </table>`;

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:26px 0 0;border-top:1px solid #dcd6cd;">
      <tr>
        <td style="padding:22px 0 10px;">
          <p style="margin:0 0 8px;color:#8b6f58;font-size:11px;line-height:1.4;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Order details</p>
          <p style="margin:0;color:#111111;font-size:20px;line-height:1.35;font-weight:700;">${escapeHtml(details.orderId || 'HEM order')}</p>
          ${orderDate ? `<p style="margin:5px 0 0;color:#77736d;font-size:12px;line-height:1.4;">${escapeHtml(orderDate)}</p>` : ''}
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;">
      ${itemRows || `<tr><td style="padding:16px 0;color:#77736d;font-size:13px;border-bottom:1px solid #ece8e1;">No item details available.</td></tr>`}
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 0;">
      <tr><td style="padding:5px 0;color:#77736d;font-size:13px;">Subtotal</td><td align="right" style="padding:5px 0;color:#111111;font-size:13px;">${escapeHtml(formatCurrency(details.subtotal))}</td></tr>
      <tr><td style="padding:5px 0;color:#77736d;font-size:13px;">Shipping fee</td><td align="right" style="padding:5px 0;color:#111111;font-size:13px;">${escapeHtml(shippingFee)}</td></tr>
      ${details.voucherCode ? `<tr><td style="padding:5px 0;color:#77736d;font-size:13px;">Voucher (${escapeHtml(details.voucherCode)})</td><td align="right" style="padding:5px 0;color:#16803c;font-size:13px;">-${escapeHtml(formatCurrency(details.discountAmount))}</td></tr>` : `<tr><td style="padding:5px 0;color:#77736d;font-size:13px;">Discount</td><td align="right" style="padding:5px 0;color:#111111;font-size:13px;">-${escapeHtml(formatCurrency(details.discountAmount))}</td></tr>`}
      <tr><td style="padding:12px 0 5px;border-top:1px solid #dcd6cd;color:#111111;font-size:15px;font-weight:700;">Total</td><td align="right" style="padding:12px 0 5px;border-top:1px solid #dcd6cd;color:#111111;font-size:18px;font-weight:700;">${escapeHtml(formatCurrency(details.totalAmount))}</td></tr>
    </table>

    ${deliveryInformation}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:14px 0 0;">
      <tr><td style="color:#77736d;font-size:12px;">Payment method</td><td align="right" style="color:#111111;font-size:12px;font-weight:700;">${escapeHtml(formatPaymentMethod(details.paymentMethod))}</td></tr>
      <tr><td style="padding-top:6px;color:#77736d;font-size:12px;">Payment status</td><td align="right" style="padding-top:6px;color:#111111;font-size:12px;font-weight:700;">${escapeHtml(formatStatus(details.paymentStatus))}</td></tr>
    </table>
  `;
};

const getBrandLogoUrl = () => {
  const configuredLogoUrl = String(process.env.EMAIL_LOGO_URL || '').trim();

  if (configuredLogoUrl) {
    return configuredLogoUrl;
  }

  return '';
};

const buildHtmlBody = message => {
  const body = String(message.body || '')
    .split(/\n{2,}/)
    .map(paragraph => `<p style="margin:0 0 18px;color:#2b2b2b;font-size:15px;line-height:1.7;">${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
  const orderDetails = buildOrderDetailsHtml(message.orderDetails);
  const nextSteps = message.nextSteps
    ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:26px 0 0;border-top:1px solid #dcd6cd;">
        <tr>
          <td style="padding:22px 0 0;">
            <p style="margin:0 0 12px;color:#8b6f58;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Next steps</p>
            <p style="margin:0 0 8px;color:#111111;font-size:15px;font-weight:700;">${escapeHtml(message.nextSteps.heading || '')}</p>
            <p style="margin:0;color:#55524e;font-size:14px;line-height:1.65;">${escapeHtml(message.nextSteps.body || '').replace(/Return Request/g, '<span style="color:#c62828;font-weight:700;">Return Request</span>')}</p>
          </td>
        </tr>
      </table>
    `
    : '';

  const actionUrl = message.actionUrl || message.resetUrl || message.verificationUrl || message.websiteUrl;
  const action = actionUrl
    ? `
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 6px;">
        <tr>
          <td>
            <a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:.08em;text-transform:uppercase;padding:13px 22px;">
              ${escapeHtml(message.ctaLabel || 'Open HEM')}
            </a>
          </td>
        </tr>
      </table>
    `
    : '';
  const logoUrl = getBrandLogoUrl();
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" width="132" alt="HEM" style="display:block;width:132px;max-width:132px;height:auto;margin:0 auto;" />`
    : '<div role="img" aria-label="HEM" style="font-family:Didot,Georgia,\'Times New Roman\',serif;font-size:42px;line-height:1;font-weight:700;color:#111111;text-align:center;">HEM</div>';
  const preheader = message.preheader
    ? `<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(message.preheader)}</span>`
    : '';

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f5f3ef;font-family:Arial,sans-serif;color:#111111;">
    ${preheader}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f3ef;margin:0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e0d8;">
            <tr>
              <td style="padding:34px 36px 24px;text-align:center;border-bottom:1px solid #eee9e2;">
                ${logo}
              </td>
            </tr>
            <tr>
              <td style="padding:34px 36px 26px;">
                ${body}
                ${orderDetails}
                ${action}
                ${nextSteps}
                <p style="margin:30px 0 0;color:#2b2b2b;font-size:14px;line-height:1.7;">Kind regards,<br />The HEM.Atelier Shop Team</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 36px;background:#111111;color:#ffffff;">
                <p style="margin:0 0 6px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;">HEM.Atelier Shop</p>
                <p style="margin:0;color:#d6d0c8;font-size:12px;line-height:1.6;">This email was sent for your HEM account. If you did not request this action, please contact support.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const sendTransactionalEmail = async message => {
  const transporter = createTransporter();
  const isPreviewTransport = !hasSmtpConfig();
  const exposePreview = readBoolean(process.env.EXPOSE_EMAIL_PREVIEWS, !isProduction);
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || message.from || 'HEM <no-reply@hem.local>',
    to: message.to,
    subject: message.subject,
    text: buildTextBody(message),
    html: buildHtmlBody(message)
  });

  const delivery = {
    subject: message.subject,
    to: message.to,
    previewOnly: isPreviewTransport,
    sent: !isPreviewTransport,
    messageId: info.messageId || '',
    smtpConfigured: !isPreviewTransport
  };

  return exposePreview
    ? {
        ...delivery,
        ...message,
        previewOnly: isPreviewTransport,
        sent: !isPreviewTransport,
        messageId: info.messageId || '',
        smtpConfigured: !isPreviewTransport
      }
    : delivery;
};

module.exports = {
  buildHtmlBody,
  buildTextBody,
  hasSmtpConfig,
  sendTransactionalEmail
};
