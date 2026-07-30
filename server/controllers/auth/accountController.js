// Auth account handlers: admin account listing and current member voucher lookup.
module.exports = ({
  getDb,
  readActiveVoucherPayload,
  sendError,
  serializeAccountRecord,
  userModel
}) => {
  const controller = {};

controller.listAccounts = async (req, res) => {
  try {
    const db = getDb(req);
    const result = await userModel.listAll(db);

    const serializedAccounts = result.rows.map(serializeAccountRecord);

    const summary = {
      total: serializedAccounts.length,
      admins: serializedAccounts.filter(account => account.role === 'admin').length,
      users: serializedAccounts.filter(account => account.role === 'user').length
    };

    return res.json({
      summary,
      accounts: serializedAccounts
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.getMyVouchers = async (req, res) => {
  try {
    const db = getDb(req);

    if (!req.authUser) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    return res.json(await readActiveVoucherPayload(db));
  } catch (error) {
    return sendError(res, error);
  }
};

  return controller;
};
