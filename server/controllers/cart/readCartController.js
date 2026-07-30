// Cart read handler: returns the authenticated customer cart without mutating cart items.
module.exports = ({
  ensureCustomerAccount,
  fetchCartPayload,
  getDb,
  sendError
}) => {
  const controller = {};

controller.getCart = async (req, res) => {
  try {
    ensureCustomerAccount(req);
    const db = getDb(req);
    return res.json(await fetchCartPayload(db, req.authUser.id));
  } catch (error) {
    return sendError(res, error, 401);
  }
};

  return controller;
};
