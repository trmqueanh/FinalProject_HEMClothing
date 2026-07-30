// Search history handlers: save, list, and clear authenticated customer searches.
module.exports = ({
  getDb,
  normalizeSearchKeyword,
  searchHistoryModel,
  sendError,
  serializeSearchHistoryRow
}) => {
  const controller = {};

controller.getSearchHistory = async (req, res) => {
  try {
    const db = getDb(req);

    if (!req.authUser) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    const result = await searchHistoryModel.listByUser(db, req.authUser.id);

    return res.json({
      items: result.rows.map(serializeSearchHistoryRow)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.saveSearchHistory = async (req, res) => {
  try {
    const db = getDb(req);

    if (!req.authUser) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    const keyword = normalizeSearchKeyword(req.body.keyword);

    if (!keyword) {
      return res.status(400).json({
        message: 'Search keyword is required.'
      });
    }

    const result = await searchHistoryModel.save(db, req.authUser.id, keyword, 12);

    return res.status(201).json({
      item: serializeSearchHistoryRow(result.row),
      items: result.rows.map(serializeSearchHistoryRow)
    });
  } catch (error) {
    return sendError(res, error);
  }
};

controller.clearSearchHistory = async (req, res) => {
  try {
    const db = getDb(req);

    if (!req.authUser) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    await searchHistoryModel.clear(db, req.authUser.id);

    return res.json({
      items: []
    });
  } catch (error) {
    return sendError(res, error);
  }
};

  return controller;
};
