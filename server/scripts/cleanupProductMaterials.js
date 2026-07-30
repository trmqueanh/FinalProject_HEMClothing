const { pool } = require('../config/database');

const PART_NAMES = new Set(['Main', 'Shell', 'Lining', 'Upper', 'Sole', 'Trim', 'Coating', 'Base fabric', 'Frame', 'Temple', 'Lens']);
const PART_NAME_PATTERN = 'Main|Shell|Lining|Upper|Sole|Trim|Coating|Base fabric|Frame|Temple|Lens';

const slugify = value =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const titleCase = value =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, character => character.toUpperCase());

const parseCompositionRows = rows => {
  let currentPart = 'Main';
  const items = [];

  rows.forEach(row => {
    let text = String(row.material_name || '')
      .replace(/composition/gi, ' ')
      .replace(/[,;]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    text = text.replace(new RegExp(`\\b(${PART_NAME_PATTERN})\\s*:`, 'gi'), '|$1:');

    text
      .split('|')
      .map(segment => segment.trim())
      .filter(Boolean)
      .forEach(segmentRaw => {
        const partMatch = segmentRaw.match(new RegExp(`^(${PART_NAME_PATTERN}):\\s*(.*)$`, 'i'));
        const segment = partMatch ? partMatch[2] : segmentRaw;

        if (partMatch) {
          currentPart = titleCase(partMatch[1]);
          if (!PART_NAMES.has(currentPart)) currentPart = 'Main';
        }

        const materialPattern = /([A-Za-z][A-Za-z\s-]*?)\s+([0-9]+(?:\.[0-9]+)?)%/g;
        let match;

        while ((match = materialPattern.exec(segment))) {
          const materialName = titleCase(
            match[1]
              .replace(new RegExp(`\\b(${PART_NAME_PATTERN})\\b:?`, 'gi'), '')
              .trim()
          );
          const materialPercent = Number(match[2]);

          if (materialName && Number.isFinite(materialPercent)) {
            items.push({
              partName: currentPart,
              materialName,
              materialPercent
            });
          }
        }
      });
  });

  return items;
};

const main = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const badRows = await client.query(
      `
        SELECT
          pm.id,
          pm.product_id,
          pm.material_name,
          p.name AS product_name,
          pg.id AS product_group_id,
          pg.slug AS product_group_slug,
          d.id AS department_id,
          d.name AS department_name
        FROM product_materials pm
        JOIN products p ON p.id = pm.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN product_groups pg ON pg.id = COALESCE(p.product_group_id, c.product_group_id)
        LEFT JOIN departments d ON d.id = COALESCE(p.department_id, c.department_id)
        WHERE pm.material_name ~* '(composition|shell:|lining:|[0-9]+%)'
        ORDER BY p.name, pm.id
      `
    );

    const rowsByProduct = badRows.rows.reduce((map, row) => {
      if (!map.has(row.product_id)) {
        map.set(row.product_id, []);
      }
      map.get(row.product_id).push(row);
      return map;
    }, new Map());

    let insertedRows = 0;

    for (const [productId, rows] of rowsByProduct) {
      const scope = rows[0];
      const parsedRows = parseCompositionRows(rows);

      await client.query(
        'DELETE FROM product_materials WHERE id::text = ANY($1::text[])',
        [rows.map(row => String(row.id)).filter(Boolean)]
      );

      for (const [index, item] of parsedRows.entries()) {
        const materialSlug = [
          slugify(scope.product_group_slug),
          slugify(scope.department_name),
          slugify(item.materialName)
        ]
          .filter(Boolean)
          .join('-');
        let materialResult = await client.query(
          `
            SELECT id, name
            FROM materials
            WHERE product_group_id = $1
              AND department_id = $2
              AND LOWER(name) = LOWER($3)
              AND deleted_at IS NULL
            LIMIT 1
          `,
          [scope.product_group_id, scope.department_id, item.materialName]
        );

        if (!materialResult.rowCount) {
          materialResult = await client.query(
            `
              INSERT INTO materials (
                product_group_id,
                department_id,
                name,
                slug,
                status,
                sort_order
              )
              VALUES ($1, $2, $3, $4, 'active', 999)
              ON CONFLICT (slug)
              DO UPDATE SET name = EXCLUDED.name
              RETURNING id, name
            `,
            [scope.product_group_id, scope.department_id, item.materialName, materialSlug]
          );
        }

        await client.query(
          `
            INSERT INTO product_materials (
              product_id,
              material_id,
              part_name,
              material_name,
              material_percent,
              sort_order
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            productId,
            materialResult.rows[0].id,
            item.partName,
            materialResult.rows[0].name,
            item.materialPercent,
            index
          ]
        );
        insertedRows += 1;
      }
    }

    const remainingBadRows = await client.query(
      `
        SELECT COUNT(*)::int AS count
        FROM product_materials
        WHERE material_name ~* '(composition|shell:|lining:|[0-9]+%)'
      `
    );

    await client.query('COMMIT');

    console.log(JSON.stringify({
      productsCleaned: rowsByProduct.size,
      rowsInserted: insertedRows,
      remainingBadRows: remainingBadRows.rows[0].count
    }));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
