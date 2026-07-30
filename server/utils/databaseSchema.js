const schemaCache = new Map();

const readCachedSchemaFlag = async (key, queryFn) => {
  if (schemaCache.has(key)) {
    return schemaCache.get(key);
  }

  const promise = queryFn()
    .then(value => {
      schemaCache.set(key, Boolean(value));
      return Boolean(value);
    })
    .catch(error => {
      schemaCache.delete(key);
      throw error;
    });

  schemaCache.set(key, promise);
  return promise;
};

const tableExists = async (db, tableName) =>
  readCachedSchemaFlag(`table:${tableName}`, async () => {
    const result = await db.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = $1
        ) AS "exists"
      `,
      [tableName]
    );

    return Boolean(result.rows[0]?.exists);
  });

const columnExists = async (db, tableName, columnName) =>
  readCachedSchemaFlag(`column:${tableName}.${columnName}`, async () => {
    const result = await db.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = $1
            AND column_name = $2
        ) AS "exists"
      `,
      [tableName, columnName]
    );

    return Boolean(result.rows[0]?.exists);
  });

module.exports = {
  columnExists,
  tableExists
};
