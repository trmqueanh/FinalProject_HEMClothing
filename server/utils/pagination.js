const parseOptionalPagination = (query, { defaultLimit = 10, maxLimit = 100 } = {}) => {
  if (!Object.prototype.hasOwnProperty.call(query || {}, 'page')) {
    return null;
  }

  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit)
  );

  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
};

const buildPaginationPayload = (pagination, totalItems) => {
  const total = Number(totalItems || 0);
  const totalPages = Math.max(1, Math.ceil(total / pagination.limit));

  return {
    page: pagination.page,
    limit: pagination.limit,
    totalItems: total,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPreviousPage: pagination.page > 1
  };
};

module.exports = {
  buildPaginationPayload,
  parseOptionalPagination
};
