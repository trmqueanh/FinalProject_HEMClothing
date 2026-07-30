// Admin account handlers: customer/admin list summaries and guarded account deletion.
const { USER_ROLES } = require('../../constants/domainConstants');

module.exports = ({
  buildPaginationPayload,
  getDb,
  invalidateAuthUser,
  isValidUuid,
  normalizeActiveStatus,
  parseListQuery,
  sendError,
  serializeRecentUser,
  userModel
}) => {
  const controller = {};

const serializeCustomerOrder = row => ({
  id: String(row.id || ''),
  totalAmount: Number(row.total_amount || 0),
  paymentMethod: String(row.payment_method || ''),
  paymentStatus: String(row.payment_status || ''),
  orderStatus: String(row.order_status || ''),
  shippingFullName: String(row.shipping_full_name || ''),
  shippingPhone: String(row.shipping_phone || ''),
  itemCount: Number(row.item_count || 0),
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null
});

controller.listAccounts = async (req, res) => {
  try {
    const db = getDb(req);
    const pagination = parseListQuery(req.query, { limit: 10 });
    const role = String(req.query.role || '').trim().toLowerCase();
    const dateRange = String(req.query.dateRange || '').trim().toLowerCase();
    const result = await userModel.listAdmin(db, {
      ...pagination,
      role: USER_ROLES.has(role) ? role : '',
      dateRange
    });

    return res.json({
      summary: result.summary,
      accounts: result.rows.map(serializeRecentUser),
      items: result.rows.map(serializeRecentUser),
      pagination: buildPaginationPayload(pagination, result.total)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.readCustomer = async (req, res) => {
  try {
    const db = getDb(req);
    const customerId = String(req.params.accountId || '').trim();

    if (!isValidUuid(customerId)) {
      return res.status(400).json({ message: 'A valid customer id is required.' });
    }

    const pagination = parseListQuery(req.query, { limit: 10, maxLimit: 50 });
    const detail = await userModel.findAdminCustomerDetail(db, customerId, pagination);

    if (!detail) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    const account = detail.account;
    const statistics = detail.statistics || {};

    return res.json({
      customer: {
        id: String(account.id),
        name: String(account.name || ''),
        email: String(account.email || ''),
        role: String(account.role || 'user'),
        status: String(account.status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active',
        emailVerified: Boolean(account.email_verified),
        emailVerifiedAt: account.email_verified_at || null,
        createdAt: account.created_at || null,
        updatedAt: account.updated_at || null,
        profile: {
          fullName: String(account.full_name || account.name || ''),
          phone: String(account.phone || ''),
          gender: String(account.gender || ''),
          birthDate: account.birth_date || null
        }
      },
      statistics: {
        orderCount: Number(statistics.order_count || 0),
        completedOrderCount: Number(statistics.completed_order_count || 0),
        cancelledOrderCount: Number(statistics.cancelled_order_count || 0),
        returnRequestCount: Number(statistics.return_request_count || 0),
        totalSpent: Number(statistics.total_spent || 0),
        averageOrderValue: Number(statistics.average_order_value || 0),
        lastOrderAt: statistics.last_order_at || null
      },
      orderStatusSummary: detail.orderStatusSummary.map(item => ({
        status: String(item.order_status || ''),
        count: Number(item.count || 0)
      })),
      orders: detail.orders.map(serializeCustomerOrder),
      pagination: buildPaginationPayload(pagination, Number(statistics.order_count || 0))
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.readCustomerOrders = async (req, res) => {
  try {
    const db = getDb(req);
    const customerId = String(req.params.accountId || '').trim();

    if (!isValidUuid(customerId)) {
      return res.status(400).json({ message: 'A valid customer id is required.' });
    }

    const pagination = parseListQuery(req.query, { limit: 10, maxLimit: 50 });
    const result = await userModel.findAdminCustomerOrders(db, customerId, pagination);

    return res.json({
      orders: result.rows.map(serializeCustomerOrder),
      pagination: buildPaginationPayload(pagination, result.total)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.deleteAccount = async (req, res) => {
  try {
    const db = getDb(req);
    const accountId = String(req.params.accountId || '').trim();

    if (!accountId) {
      return res.status(400).json({ message: 'Account id is required.' });
    }

    if (String(req.authUser && req.authUser.id) === accountId) {
      return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }

    const result = await userModel.deleteById(db, accountId);

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    invalidateAuthUser(result.rows[0]);

    return res.json({
      message: 'Account deleted successfully. The user must register again to shop.',
      id: String(result.rows[0].id)
    });
  } catch (error) {
    if (error && error.code === '23503') {
      return res.status(409).json({
        message: 'This account has order or transaction history. Deactivate it instead.'
      });
    }

    return sendError(res, error, 400);
  }
};

controller.updateAccountStatus = async (req, res) => {
  try {
    const db = getDb(req);
    const accountId = String(req.params.accountId || '').trim();
    const status = normalizeActiveStatus(req.body && req.body.status);

    if (!accountId) {
      return res.status(400).json({ message: 'Account id is required.' });
    }

    if (String(req.authUser && req.authUser.id) === accountId) {
      return res.status(400).json({ message: 'You cannot change the status of your own admin account.' });
    }

    const result = await userModel.updateStatus(db, accountId, status);

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    const account = result.rows[0];
    invalidateAuthUser(account);

    return res.json({
      message: `Account ${status === 'active' ? 'activated' : 'deactivated'} successfully.`,
      account: serializeRecentUser(account)
    });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

  return controller;
};
