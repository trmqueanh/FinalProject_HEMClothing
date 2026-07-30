const { pool } = require('../config/database');
const { hashPassword } = require('../utils/authUtils');
const { calculateVoucherDiscount } = require('../services/voucherService');

const DEMO_DOMAIN = 'demo.hem.com';
const DEMO_PASSWORD = process.env.DEMO_CUSTOMER_PASSWORD || 'HemDemo@2026';
const REVIEW_MARKER_PREFIX = 'HEM DEMO REVIEW';
const STATUS_MARKER_PREFIX = 'HEM DEMO STATUS';
const HOLD_STATUSES = new Set(['confirmed', 'processing', 'shipping', 'delivery_failed', 'delivered']);

const demoUsers = [
  {
    name: 'Emily Carter',
    email: `emily.carter@${DEMO_DOMAIN}`,
    gender: 'female',
    phone: '0901002001',
    birthDate: '1998-04-12',
    city: 'Ho Chi Minh City',
    district: 'District 1',
    ward: 'Ben Nghe Ward',
    address: '22 Le Loi Street'
  },
  {
    name: 'Anna Nguyen',
    email: `anna.nguyen@${DEMO_DOMAIN}`,
    gender: 'female',
    phone: '0901002002',
    birthDate: '2000-08-24',
    city: 'Ho Chi Minh City',
    district: 'District 3',
    ward: 'Vo Thi Sau Ward',
    address: '118 Nguyen Dinh Chieu Street'
  },
  {
    name: 'Sofia Martinez',
    email: `sofia.martinez@${DEMO_DOMAIN}`,
    gender: 'female',
    phone: '0901002003',
    birthDate: '1996-11-05',
    city: 'Da Nang',
    district: 'Hai Chau District',
    ward: 'Hai Chau I Ward',
    address: '45 Bach Dang Street'
  },
  {
    name: 'Linh Tran',
    email: `linh.tran@${DEMO_DOMAIN}`,
    gender: 'female',
    phone: '0901002004',
    birthDate: '2001-02-19',
    city: 'Ha Noi',
    district: 'Hoan Kiem District',
    ward: 'Hang Trong Ward',
    address: '16 Trang Tien Street'
  },
  {
    name: 'Chloe Wilson',
    email: `chloe.wilson@${DEMO_DOMAIN}`,
    gender: 'female',
    phone: '0901002005',
    birthDate: '1999-06-30',
    city: 'Can Tho',
    district: 'Ninh Kieu District',
    ward: 'Tan An Ward',
    address: '7 Hoa Binh Avenue'
  },
  {
    name: 'Daniel Brooks',
    email: `daniel.brooks@${DEMO_DOMAIN}`,
    gender: 'male',
    phone: '0901002006',
    birthDate: '1995-01-14',
    city: 'Ho Chi Minh City',
    district: 'Binh Thanh District',
    ward: 'Ward 25',
    address: '92 Xo Viet Nghe Tinh Street'
  },
  {
    name: 'Minh Pham',
    email: `minh.pham@${DEMO_DOMAIN}`,
    gender: 'male',
    phone: '0901002007',
    birthDate: '1997-09-22',
    city: 'Ha Noi',
    district: 'Ba Dinh District',
    ward: 'Ngoc Ha Ward',
    address: '31 Kim Ma Street'
  },
  {
    name: 'Noah Bennett',
    email: `noah.bennett@${DEMO_DOMAIN}`,
    gender: 'male',
    phone: '0901002008',
    birthDate: '1994-12-03',
    city: 'Da Nang',
    district: 'Son Tra District',
    ward: 'An Hai Bac Ward',
    address: '64 Ngo Quyen Street'
  },
  {
    name: 'Ryan Lee',
    email: `ryan.lee@${DEMO_DOMAIN}`,
    gender: 'male',
    phone: '0901002009',
    birthDate: '1998-07-17',
    city: 'Ho Chi Minh City',
    district: 'District 7',
    ward: 'Tan Phu Ward',
    address: '11 Nguyen Luong Bang Street'
  },
  {
    name: 'Khoa Le',
    email: `khoa.le@${DEMO_DOMAIN}`,
    gender: 'male',
    phone: '0901002010',
    birthDate: '1996-05-27',
    city: 'Can Tho',
    district: 'Cai Rang District',
    ward: 'Hung Phu Ward',
    address: '28 Nguyen Van Cu Street'
  }
];

const reviewComments = [
  'The fit feels polished and easy to style. The fabric also looks good after a full day out.',
  'Really happy with the quality. It matches the photos and the color is easy to pair with my wardrobe.',
  'Comfortable, clean, and true to size. This became one of the pieces I reach for first.',
  'The material feels better than expected for the price. I would buy this again in another color.',
  'Great everyday piece. The shape is simple but still looks considered.',
  'The details are neat and the sizing was accurate. Delivery was smooth too.',
  'Looks sharp in person and works well for both casual and slightly dressed-up outfits.',
  'The color and texture feel premium. I like that it is easy to mix with other HEM pieces.',
  'Nice design and comfortable for long wear. The product page was accurate.',
  'Very satisfied with this order. It feels sturdy, flattering, and worth the price.'
];

const adminReplies = [
  'Thank you so much for your kind feedback. We are happy this piece works well for your wardrobe.',
  'We appreciate your review. Your note helps us understand what customers enjoy most about this item.',
  'Thank you for shopping with HEM. We hope this piece keeps serving you well.',
  'Thanks for sharing your experience. We are glad the fit and quality met your expectations.'
];

const statusScenarios = [
  'pending',
  'confirmed',
  'processing',
  'shipping',
  'delivered',
  'delivery_failed',
  'cancelled',
  'completed',
  'shipping',
  'delivered',
  'processing',
  'completed',
  'confirmed',
  'delivery_failed',
  'completed',
  'cancelled',
  'pending',
  'shipping'
];

const toNumber = value => Number.parseFloat(value || 0) || 0;

const addHours = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000);

const safeSlug = value =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'demo';

const buildDemoDate = (index, offsetHours = 0) => {
  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth();
  const month = index % (currentMonth + 1);
  const maxDay = month === currentMonth ? Math.max(1, now.getDate() - 1) : 25;
  const day = 1 + ((index * 5) % maxDay);

  return new Date(year, month, day, 9 + (index % 8), (index * 11) % 60, 0 + offsetHours);
};

const getColumns = async (client, tableName) => {
  const result = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [tableName]
  );

  return new Set(result.rows.map(row => row.column_name));
};

const fetchAdminId = async client => {
  const result = await client.query(
    `
      SELECT id
      FROM users
      WHERE LOWER(COALESCE(role, '')) = 'admin'
      ORDER BY created_at ASC
      LIMIT 1
    `
  );

  return result.rows[0] ? result.rows[0].id : null;
};

const upsertDemoUsers = async client => {
  const passwordHash = hashPassword(DEMO_PASSWORD);
  const users = [];

  for (const user of demoUsers) {
    const result = await client.query(
      `
        INSERT INTO users (
          name,
          email,
          password_hash,
          role,
          email_verified,
          email_verified_at,
          email_verification_expires_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, 'user', true, now(), null, now(), now())
        ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            role = 'user',
            email_verified = true,
            email_verified_at = COALESCE(users.email_verified_at, now()),
            email_verification_expires_at = null,
            updated_at = now()
        RETURNING id, name, email, created_at
      `,
      [user.name, user.email, passwordHash]
    );

    const savedUser = {
      ...user,
      id: result.rows[0].id
    };
    users.push(savedUser);

    await client.query(
      `
        INSERT INTO user_profiles (
          user_id,
          full_name,
          phone,
          gender,
          birth_date,
          payment_provider,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, now(), now())
        ON CONFLICT (user_id) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            gender = EXCLUDED.gender,
            birth_date = EXCLUDED.birth_date,
            payment_provider = EXCLUDED.payment_provider,
            updated_at = now()
      `,
      [
        savedUser.id,
        savedUser.name,
        savedUser.phone,
        savedUser.gender,
        savedUser.birthDate,
        savedUser.email.includes('carter') || savedUser.email.includes('brooks') ? 'bank_transfer' : 'cod'
      ]
    );

    await client.query(
      `
        UPDATE user_addresses
        SET is_default = false,
            updated_at = now()
        WHERE user_id = $1
          AND is_default = true
          AND address_label <> 'Demo home'
      `,
      [savedUser.id]
    );

    await client.query(
      `
        INSERT INTO user_addresses (
          user_id,
          receiver_name,
          receiver_phone,
          country,
          city,
          district,
          ward,
          address_line,
          address_label,
          is_default,
          created_at,
          updated_at
        )
        SELECT $1, $2, $3, 'Vietnam', $4, $5, $6, $7, 'Demo home', true, now(), now()
        WHERE NOT EXISTS (
          SELECT 1
          FROM user_addresses
          WHERE user_id = $1
            AND address_label = 'Demo home'
        )
      `,
      [
        savedUser.id,
        savedUser.name,
        savedUser.phone,
        savedUser.city,
        savedUser.district,
        savedUser.ward,
        savedUser.address
      ]
    );

    await client.query(
      `
        UPDATE user_addresses
        SET receiver_name = $2,
            receiver_phone = $3,
            country = 'Vietnam',
            city = $4,
            district = $5,
            ward = $6,
            address_line = $7,
            is_default = true,
            updated_at = now()
        WHERE user_id = $1
          AND address_label = 'Demo home'
      `,
      [
        savedUser.id,
        savedUser.name,
        savedUser.phone,
        savedUser.city,
        savedUser.district,
        savedUser.ward,
        savedUser.address
      ]
    );
  }

  return users;
};

const fetchProducts = async client => {
  const result = await client.query(
    `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.price,
        p.original_price,
        p.pricing_mode,
        p.sale_price,
        COALESCE(d.name, '') AS department_name,
        COALESCE(c.label, c.name, '') AS category_label,
        variant.id AS variant_id,
        variant.color_variant_id,
        variant.color_name,
        variant.size_label,
        variant.product_code,
        variant.article_number,
        variant.stock_quantity,
        variant.reserved_quantity,
        GREATEST(COALESCE(variant.stock_quantity, 0) - COALESCE(variant.reserved_quantity, 0), 0)::int AS available_quantity,
        image.image_url AS product_image
      FROM products p
      LEFT JOIN departments d ON d.id = p.department_id
      LEFT JOIN categories c ON c.id = p.category_id
      JOIN LATERAL (
        SELECT
          pi.id,
          pi.color_variant_id,
          pi.color_name,
          pi.size_label,
          pi.product_code,
          pi.article_number,
          pi.stock_quantity,
          pi.reserved_quantity
        FROM product_inventory pi
        WHERE pi.product_id = p.id
        ORDER BY GREATEST(COALESCE(pi.stock_quantity, 0) - COALESCE(pi.reserved_quantity, 0), 0) DESC,
                 pi.created_at ASC,
                 pi.id ASC
        LIMIT 1
      ) variant ON true
      LEFT JOIN LATERAL (
        SELECT image_url
        FROM product_images
        WHERE product_id = p.id
        ORDER BY is_primary DESC, sort_order ASC, created_at ASC, id ASC
        LIMIT 1
      ) image ON true
      WHERE LOWER(COALESCE(p.status, 'active')) = 'active'
        AND p.deleted_at IS NULL
      ORDER BY
        CASE LOWER(COALESCE(d.name, ''))
          WHEN 'women' THEN 1
          WHEN 'men' THEN 2
          ELSE 3
        END,
        p.created_at DESC,
        p.name ASC
    `
  );

  return result.rows;
};

const existingApprovedReviewProductIds = async client => {
  const result = await client.query(
    `
      SELECT DISTINCT product_id
      FROM product_reviews
      WHERE is_approved = true
    `
  );

  return new Set(result.rows.map(row => String(row.product_id)));
};

const calculateTotals = (product, quantity, _orderIndex) => {
  const price = Math.max(0, toNumber(product.price));
  const subtotal = price * quantity;
  const shippingFee = subtotal >= 500000 ? 0 : 30000;
  const discountAmount = 0;

  return {
    subtotal,
    shippingFee,
    discountAmount,
    totalAmount: Math.max(0, subtotal + shippingFee - discountAmount)
  };
};

const paymentValuesForStatus = (status, index) => {
  const paymentMethod = index % 3 === 0 ? 'bank_transfer' : 'cod';
  const paymentStatus = paymentMethod === 'bank_transfer'
    ? status === 'cancelled'
      ? 'refund_pending'
      : status === 'pending'
        ? 'pending_payment'
        : 'paid'
    : status === 'completed'
      ? 'paid'
      : 'pending_payment';

  return {
    paymentMethod,
    paymentStatus
  };
};

const statusDates = (status, createdAt) => {
  const updates = {
    completed_at: null,
    cancelled_at: null,
    returned_to_warehouse_at: null
  };

  if (status === 'completed') {
    updates.completed_at = addHours(createdAt, 96);
  }

  if (status === 'cancelled') {
    updates.cancelled_at = addHours(createdAt, 24);
  }

  if (status === 'delivery_failed') {
    updates.returned_to_warehouse_at = addHours(createdAt, 72);
  }

  return updates;
};

const insertOrderStatusHistory = async (client, {
  orderId,
  userId,
  adminId,
  finalStatus,
  createdAt,
  compact = false
}) => {
  const statusPaths = {
    pending: ['pending'],
    confirmed: ['pending', 'confirmed'],
    processing: ['pending', 'confirmed', 'processing'],
    shipping: ['pending', 'confirmed', 'processing', 'shipping'],
    delivered: ['pending', 'confirmed', 'processing', 'shipping', 'delivered'],
    delivery_failed: ['pending', 'confirmed', 'processing', 'shipping', 'delivery_failed'],
    completed: ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'completed'],
    cancelled: ['pending', 'confirmed', 'processing', 'cancelled']
  };
  const statuses = compact && finalStatus === 'completed'
    ? ['pending', 'completed']
    : statusPaths[finalStatus] || ['pending'];

  for (let index = 0; index < statuses.length; index += 1) {
    const newStatus = statuses[index];
    const oldStatus = index === 0 ? null : statuses[index - 1];
    const changedByRole = index === 0 || newStatus === 'completed' ? 'user' : 'admin';
    const changedBy = changedByRole === 'admin' ? adminId : userId;

    await client.query(
      `
        INSERT INTO order_status_history (
          order_id,
          old_status,
          new_status,
          changed_by,
          changed_by_role,
          note,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        orderId,
        oldStatus,
        newStatus,
        changedBy || null,
        changedByRole,
        newStatus === 'pending' ? 'Demo order placed.' : `Demo order moved to ${newStatus}.`,
        addHours(createdAt, index * 8)
      ]
    );
  }
};

const insertOrderItem = async (client, {
  columns,
  orderId,
  product,
  quantity,
  reservedQuantity,
  createdAt
}) => {
  const productPrice = toNumber(product.price);
  const originalPrice = toNumber(product.original_price || product.price);
  const valuesByColumn = {
    order_id: orderId,
    product_id: product.id,
    variant_id: product.variant_id,
    color_variant_id: product.color_variant_id,
    product_name: product.name,
    product_price: productPrice,
    price_at_purchase: productPrice,
    original_price_at_purchase: originalPrice,
    pricing_mode_at_purchase: product.pricing_mode || 'regular',
    gross_line_total: productPrice * quantity,
    item_discount_amount: Math.max(0, originalPrice - productPrice) * quantity,
    voucher_discount_allocated: 0,
    net_line_total: productPrice * quantity,
    refunded_quantity: 0,
    refunded_amount: 0,
    quantity,
    reserved_quantity: reservedQuantity,
    size_label: product.size_label,
    color_name: product.color_name,
    product_image: product.product_image || '',
    product_code_at_purchase: product.product_code || '',
    article_number_at_purchase: product.article_number || product.product_code || '',
    created_at: createdAt,
    updated_at: createdAt
  };
  const insertColumns = Object.keys(valuesByColumn).filter(column => columns.has(column));
  const placeholders = insertColumns.map((_, index) => `$${index + 1}`);
  const values = insertColumns.map(column => valuesByColumn[column]);

  const result = await client.query(
    `
      INSERT INTO order_items (${insertColumns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING id
    `,
    values
  );

  return result.rows[0].id;
};

const applyInventoryEffect = async (client, {
  product,
  status,
  quantity,
  reservedQuantity
}) => {
  if (status === 'completed') {
    await client.query(
      `
        UPDATE product_inventory
        SET stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - $2, 0),
            sold_quantity = COALESCE(sold_quantity, 0) + $2,
            updated_at = now()
        WHERE id = $1
      `,
      [product.variant_id, quantity]
    );
    return;
  }

  if (HOLD_STATUSES.has(status) && reservedQuantity > 0) {
    await client.query(
      `
        UPDATE product_inventory
        SET reserved_quantity = LEAST(COALESCE(stock_quantity, 0), COALESCE(reserved_quantity, 0) + $2),
            updated_at = now()
        WHERE id = $1
      `,
      [product.variant_id, reservedQuantity]
    );
  }
};

const createOrderWithItem = async (client, {
  columns,
  user,
  product,
  status,
  quantity,
  createdAt,
  marker,
  orderIndex,
  adminId,
  historyCompact = false
}) => {
  const existing = await client.query(
    `
      SELECT id
      FROM orders
      WHERE shipping_note = $1
      LIMIT 1
    `,
    [marker]
  );

  if (existing.rowCount) {
    return {
      id: existing.rows[0].id,
      created: false
    };
  }

  const totals = calculateTotals(product, quantity, orderIndex);
  const payment = paymentValuesForStatus(status, orderIndex);
  const dates = statusDates(status, createdAt);
  const reservedQuantity = HOLD_STATUSES.has(status)
    ? Math.max(0, Math.min(quantity, Number(product.available_quantity || 0)))
    : 0;

  const orderResult = await client.query(
    `
      INSERT INTO orders (
        user_id,
        subtotal,
        shipping_fee,
        discount_amount,
        voucher_code,
        total_amount,
        payment_method,
        payment_status,
        order_status,
        shipping_full_name,
        shipping_phone,
        shipping_city,
        shipping_district,
        shipping_ward,
        shipping_address_line,
        shipping_note,
        cancel_reason,
        cancelled_by,
        cancelled_at,
        completed_at,
        returned_to_warehouse_at,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22,
        $23
      )
      RETURNING id
    `,
    [
      user.id,
      totals.subtotal,
      totals.shippingFee,
      totals.discountAmount,
      null,
      totals.totalAmount,
      payment.paymentMethod,
      payment.paymentStatus,
      status,
      user.name,
      user.phone,
      user.city,
      user.district,
      user.ward,
      user.address,
      marker,
      status === 'cancelled' ? 'Demo cancellation for admin workflow.' : null,
      status === 'cancelled' ? 'admin' : null,
      dates.cancelled_at,
      dates.completed_at,
      dates.returned_to_warehouse_at,
      createdAt,
      status === 'completed' ? dates.completed_at : addHours(createdAt, 24)
    ]
  );

  const orderId = orderResult.rows[0].id;

  await insertOrderItem(client, {
    columns,
    orderId,
    product,
    quantity,
    reservedQuantity,
    createdAt
  });
  await applyInventoryEffect(client, {
    product,
    status,
    quantity,
    reservedQuantity
  });
  await insertOrderStatusHistory(client, {
    orderId,
    userId: user.id,
    adminId,
    finalStatus: status,
    createdAt,
    compact: historyCompact
  });

  return {
    id: orderId,
    created: true
  };
};

const createReview = async (client, {
  product,
  user,
  orderId,
  rating,
  comment,
  adminId,
  reply,
  createdAt
}) => {
  const result = await client.query(
    `
      INSERT INTO product_reviews (
        product_id,
        user_id,
        order_id,
        rating,
        comment,
        admin_reply,
        admin_reply_by,
        admin_reply_at,
        admin_reply_updated_at,
        is_approved,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, true, $9, $9)
      ON CONFLICT ON CONSTRAINT unique_user_order_product_review DO NOTHING
      RETURNING id
    `,
    [
      product.id,
      user.id,
      orderId,
      rating,
      comment,
      reply || null,
      reply ? adminId : null,
      reply ? addHours(createdAt, 18) : null,
      createdAt
    ]
  );

  return result.rowCount > 0;
};

const seedProductReviews = async (client, {
  columns,
  users,
  products,
  adminId
}) => {
  const reviewedProductIds = await existingApprovedReviewProductIds(client);
  let createdOrders = 0;
  let createdReviews = 0;

  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];

    if (index > 0 && index % 25 === 0) {
      console.log(`Seeded review coverage check for ${index}/${products.length} products...`);
    }

    if (reviewedProductIds.has(String(product.id))) {
      continue;
    }

    const user = users[index % users.length];
    const quantity = 1 + ((index * 7) % 4);
    const createdAt = buildDemoDate(index);
    const marker = `${REVIEW_MARKER_PREFIX} ${product.id}`;
  const order = await createOrderWithItem(client, {
      columns,
      user,
      product,
      status: 'completed',
      quantity,
      createdAt,
      marker,
      orderIndex: index,
      adminId,
      historyCompact: true
    });
    const rating = index % 13 === 0 ? 4 : 5;
    const comment = reviewComments[index % reviewComments.length];
    const reply = index % 4 === 0 ? adminReplies[index % adminReplies.length] : '';
    const reviewCreated = await createReview(client, {
      product,
      user,
      orderId: order.id,
      rating,
      comment,
      adminId,
      reply,
      createdAt: addHours(createdAt, 120)
    });

    createdOrders += order.created ? 1 : 0;
    createdReviews += reviewCreated ? 1 : 0;
    reviewedProductIds.add(String(product.id));
  }

  return { createdOrders, createdReviews };
};

const seedStatusOrders = async (client, {
  columns,
  users,
  products,
  adminId
}) => {
  const availableProducts = products.filter(product => Number(product.available_quantity || 0) > 0);
  const sourceProducts = availableProducts.length ? availableProducts : products;
  let createdOrders = 0;

  for (let index = 0; index < statusScenarios.length; index += 1) {
    if (index > 0 && index % 6 === 0) {
      console.log(`Seeded ${index}/${statusScenarios.length} extra dashboard status orders...`);
    }

    const status = statusScenarios[index];
    const user = users[(index * 3) % users.length];
    const product = sourceProducts[(index * 5) % sourceProducts.length];
    const maxAvailable = Math.max(1, Number(product.available_quantity || 1));
    const targetQuantity = status === 'completed' ? 2 + (index % 3) : 1 + (index % 2);
    const quantity = HOLD_STATUSES.has(status)
      ? Math.max(1, Math.min(targetQuantity, maxAvailable))
      : targetQuantity;
    const createdAt = addHours(buildDemoDate(products.length + index), index * 3);
    const marker = `${STATUS_MARKER_PREFIX} ${index + 1} ${status} ${safeSlug(product.name)}`;

    const order = await createOrderWithItem(client, {
      columns,
      user,
      product,
      status,
      quantity,
      createdAt,
      marker,
      orderIndex: products.length + index,
      adminId
    });

    createdOrders += order.created ? 1 : 0;
  }

  return { createdOrders };
};

const seedReturnAndRefundWorkflows = async client => {
  const demoOrderResult = await client.query(
    `
      SELECT o.id, o.user_id, o.order_status, o.payment_status
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE u.email LIKE $1
        AND o.shipping_note LIKE 'HEM DEMO%'
      ORDER BY o.created_at DESC
    `,
    [`%@${DEMO_DOMAIN}`]
  );
  const completedOrders = demoOrderResult.rows.filter(order => order.order_status === 'completed');
  const cancelledOrders = demoOrderResult.rows.filter(order => order.order_status === 'cancelled');
  let returnRequests = 0;
  let refundRequests = 0;
  const returnRequestScenarios = [
    {
      reason: 'wrong_size',
      note: 'The item fits smaller than expected. I would like to return it and choose another size.',
      adminNote: 'Size issue reviewed. Customer is eligible to send the item back.'
    },
    {
      reason: 'not_as_expected',
      note: 'The fabric and fit are different from what I expected from the product photos.',
      adminNote: 'Return approved after reviewing the customer feedback.'
    },
    {
      reason: 'changed_mind',
      note: 'I changed my mind after trying the item on and would like to return it.',
      adminNote: 'Item can be accepted if returned unused with tags attached.'
    },
    {
      reason: 'defective',
      note: 'The stitching is loose near the seam, so I would like to return this item.',
      adminNote: 'Quality issue confirmed. Refund can be processed after the item is received.'
    }
  ];
  for (const [index, order] of completedOrders.slice(0, 3).entries()) {
    const status = ['requested', 'awaiting_return', 'received'][index] || 'requested';
    const scenario = returnRequestScenarios[index % returnRequestScenarios.length];
    const result = await client.query(
      `
        INSERT INTO return_requests (
          return_code,
          order_id,
          user_id,
          reason,
          note,
          return_status,
          admin_note,
          requested_at,
          approved_at,
          received_at,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6::text, $7,
          now() - (($8::int + 2) * interval '1 day'),
          CASE WHEN $6::text IN ('awaiting_return', 'received') THEN now() - (($8::int + 1) * interval '1 day') ELSE null END,
          CASE WHEN $6::text = 'received' THEN now() - (($8::int) * interval '1 day') ELSE null END,
          now() - (($8::int + 2) * interval '1 day'),
          now()
        )
        ON CONFLICT (return_code) DO UPDATE SET updated_at = now()
        RETURNING id
      `,
      [
        `DEMO-RET-${String(order.id).slice(0, 8).toUpperCase()}`,
        order.id,
        order.user_id,
        scenario.reason,
        scenario.note,
        status,
        status === 'requested' ? null : scenario.adminNote,
        index
      ]
    );

    returnRequests += result.rowCount;
    if (result.rowCount) {
      await client.query(
        `
          INSERT INTO return_items (
            return_request_id, order_item_id, requested_quantity, approved_quantity,
            received_quantity, reason, customer_note, created_at, updated_at
          )
          SELECT $1, oi.id, 1,
                 CASE WHEN $2 IN ('awaiting_return', 'received') THEN 1 ELSE 0 END,
                 CASE WHEN $2 = 'received' THEN 1 ELSE 0 END,
                 $3, $4, now(), now()
          FROM order_items oi
          WHERE oi.order_id = $5
          ORDER BY oi.created_at, oi.id
          LIMIT 1
          ON CONFLICT (return_request_id, order_item_id) DO NOTHING
        `,
        [result.rows[0].id, status, scenario.reason, scenario.note, order.id]
      );
    }
  }

  for (const [index, order] of cancelledOrders.filter(item => ['paid', 'refund_pending', 'refunded'].includes(item.payment_status)).slice(0, 4).entries()) {
    const status = ['pending', 'processing', 'completed', 'failed'][index] || 'pending';
    const result = await client.query(
      `
        INSERT INTO refunds (
          refund_code, order_id, user_id, refund_type, source_key,
          requested_amount, approved_amount, reason, status, admin_note,
          processing_at, completed_at, failed_at, created_at, updated_at
        )
        SELECT $1, o.id, o.user_id, 'cancellation', $2,
               COALESCE(NULLIF(o.payment_received_amount, 0), o.total_amount),
               CASE WHEN $3 = 'completed' THEN COALESCE(NULLIF(o.payment_received_amount, 0), o.total_amount) ELSE null END,
               'System-created refund for a paid cancelled demo order.', $3, 'Demo manual refund workflow.',
               CASE WHEN $3 IN ('processing', 'completed', 'failed') THEN now() - interval '1 day' ELSE null END,
               CASE WHEN $3 = 'completed' THEN now() ELSE null END,
               CASE WHEN $3 = 'failed' THEN now() ELSE null END,
               now() - (($4::int + 1) * interval '1 day'), now()
        FROM orders o WHERE o.id = $5
        ON CONFLICT (source_key) DO NOTHING
        RETURNING id
      `,
      [
        `DEMO-RFD-${String(order.id).slice(0, 8).toUpperCase()}`,
        `order_cancellation:${order.id}`,
        status,
        index,
        order.id
      ]
    );

    refundRequests += result.rowCount;
  }

  return { returnRequests, refundRequests };
};

const getVoucherPerUserLimit = voucher => {
  const value = voucher && voucher.per_user_limit;
  return value === null || value === undefined || value === '' ? null : Number(value);
};

const buildVoucherUsageKey = (voucherId, userId) => `${voucherId}:${userId}`;

const fetchActiveVouchersForDemo = async client => {
  const result = await client.query(
    `
      SELECT
        v.*,
        COALESCE(redemptions.usage_count, 0)::int AS actual_used_count,
        CURRENT_TIMESTAMP AS current_time
      FROM vouchers v
      LEFT JOIN (
        SELECT voucher_id, COUNT(*)::int AS usage_count
        FROM voucher_redemptions
        GROUP BY voucher_id
      ) redemptions ON redemptions.voucher_id = v.id
      WHERE v.deleted_at IS NULL
        AND LOWER(v.status) = 'active'
        AND (v.start_date IS NULL OR v.start_date <= CURRENT_TIMESTAMP)
        AND (v.end_date IS NULL OR v.end_date >= CURRENT_TIMESTAMP)
      ORDER BY v.min_order_amount ASC, v.code ASC
    `
  );

  return result.rows;
};

const fetchVoucherUsageMaps = async client => {
  const globalResult = await client.query(
    `
      SELECT voucher_id, COUNT(*)::int AS usage_count
      FROM voucher_redemptions
      GROUP BY voucher_id
    `
  );
  const userResult = await client.query(
    `
      SELECT voucher_id, user_id, COUNT(*)::int AS usage_count
      FROM voucher_redemptions
      GROUP BY voucher_id, user_id
    `
  );
  const globalUsage = new Map();
  const userUsage = new Map();

  globalResult.rows.forEach(row => {
    globalUsage.set(String(row.voucher_id), Number(row.usage_count || 0));
  });
  userResult.rows.forEach(row => {
    userUsage.set(
      buildVoucherUsageKey(String(row.voucher_id), String(row.user_id)),
      Number(row.usage_count || 0)
    );
  });

  return { globalUsage, userUsage };
};

const chooseVoucherForOrder = (order, vouchers, usageMaps) => {
  const subtotal = toNumber(order.subtotal);
  const userId = String(order.user_id);

  return vouchers
    .map(voucher => {
      const voucherId = String(voucher.id);
      const usageLimit = voucher.usage_limit === null ? null : Number(voucher.usage_limit);
      const globalUsed = usageMaps.globalUsage.get(voucherId) || 0;
      const perUserLimit = getVoucherPerUserLimit(voucher);
      const userUsed = usageMaps.userUsage.get(buildVoucherUsageKey(voucherId, userId)) || 0;
      const minOrderAmount = toNumber(voucher.min_order_amount);
      const discountAmount = calculateVoucherDiscount(voucher, subtotal);

      return {
        voucher,
        discountAmount,
        isEligible:
          subtotal >= minOrderAmount &&
          discountAmount > 0 &&
          (usageLimit === null || globalUsed < usageLimit) &&
          (perUserLimit === null || userUsed < perUserLimit)
      };
    })
    .filter(candidate => candidate.isEligible)
    .sort((left, right) => {
      if (right.discountAmount !== left.discountAmount) {
        return right.discountAmount - left.discountAmount;
      }

      const leftMin = toNumber(left.voucher.min_order_amount);
      const rightMin = toNumber(right.voucher.min_order_amount);
      if (rightMin !== leftMin) return rightMin - leftMin;

      return String(left.voucher.code || '').localeCompare(String(right.voucher.code || ''));
    })[0] || null;
};

const applyEligibleDemoVouchers = async client => {
  const vouchers = await fetchActiveVouchersForDemo(client);

  if (!vouchers.length) {
    return { appliedVouchers: 0 };
  }

  const usageMaps = await fetchVoucherUsageMaps(client);
  const existingRedemptionResult = await client.query(
    `
      SELECT order_id
      FROM voucher_redemptions
    `
  );
  const redeemedOrderIds = new Set(existingRedemptionResult.rows.map(row => String(row.order_id)));

  await client.query(
    `
      UPDATE orders o
      SET voucher_code = null,
          discount_amount = 0,
          total_amount = o.subtotal + o.shipping_fee,
          updated_at = now()
      FROM users u
      WHERE u.id = o.user_id
        AND u.email LIKE $1
        AND o.voucher_code = 'HEMDEMO'
        AND NOT EXISTS (
          SELECT 1
          FROM voucher_redemptions vr
          WHERE vr.order_id = o.id
        )
    `,
    [`%@${DEMO_DOMAIN}`]
  );

  const ordersResult = await client.query(
    `
      SELECT
        o.id,
        o.user_id,
        o.subtotal,
        o.shipping_fee,
        o.order_status,
        o.voucher_code
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE u.email LIKE $1
        AND o.subtotal > 0
        AND o.order_status NOT IN ('cancelled', 'delivery_failed')
      ORDER BY o.created_at DESC, o.id DESC
    `,
    [`%@${DEMO_DOMAIN}`]
  );
  let appliedVouchers = 0;

  for (const order of ordersResult.rows) {
    const orderId = String(order.id);

    if (redeemedOrderIds.has(orderId)) {
      continue;
    }

    const chosen = chooseVoucherForOrder(order, vouchers, usageMaps);

    if (!chosen) {
      continue;
    }

    const voucher = chosen.voucher;
    const voucherId = String(voucher.id);
    const voucherCode = String(voucher.code || '').toUpperCase();
    const userId = String(order.user_id);
    const discountAmount = chosen.discountAmount;

    await client.query(
      `
        UPDATE orders
        SET voucher_code = $2,
            discount_amount = $3,
            total_amount = GREATEST(subtotal + shipping_fee - $3, 0),
            updated_at = now()
        WHERE id = $1
      `,
      [orderId, voucherCode, discountAmount]
    );

    const redemption = await client.query(
      `
        INSERT INTO voucher_redemptions (
          voucher_id,
          user_id,
          order_id,
          voucher_code,
          order_subtotal,
          discount_amount,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, now())
        ON CONFLICT (order_id) DO NOTHING
        RETURNING id
      `,
      [
        voucherId,
        userId,
        orderId,
        voucherCode,
        order.subtotal,
        discountAmount
      ]
    );

    if (!redemption.rowCount) {
      continue;
    }

    appliedVouchers += 1;
    redeemedOrderIds.add(orderId);
    usageMaps.globalUsage.set(voucherId, (usageMaps.globalUsage.get(voucherId) || 0) + 1);
    usageMaps.userUsage.set(
      buildVoucherUsageKey(voucherId, userId),
      (usageMaps.userUsage.get(buildVoucherUsageKey(voucherId, userId)) || 0) + 1
    );
  }

  await client.query(
    `
      UPDATE vouchers v
      SET used_count = COALESCE(redemptions.usage_count, 0),
          updated_at = now()
      FROM (
        SELECT voucher_id, COUNT(*)::int AS usage_count
        FROM voucher_redemptions
        GROUP BY voucher_id
      ) redemptions
      WHERE redemptions.voucher_id = v.id
    `
  );

  await client.query(
    `
      UPDATE vouchers v
      SET used_count = 0,
          updated_at = now()
      WHERE NOT EXISTS (
        SELECT 1
        FROM voucher_redemptions vr
        WHERE vr.voucher_id = v.id
      )
    `
  );

  await client.query(
    `
      UPDATE order_items oi
      SET gross_line_total = ROUND(COALESCE(NULLIF(oi.price_at_purchase, 0), oi.product_price, 0) * oi.quantity, 2),
          item_discount_amount = ROUND(GREATEST(COALESCE(oi.original_price_at_purchase, oi.product_price, 0) - COALESCE(NULLIF(oi.price_at_purchase, 0), oi.product_price, 0), 0) * oi.quantity, 2),
          voucher_discount_allocated = LEAST(o.discount_amount, ROUND(COALESCE(NULLIF(oi.price_at_purchase, 0), oi.product_price, 0) * oi.quantity, 2)),
          net_line_total = GREATEST(ROUND(COALESCE(NULLIF(oi.price_at_purchase, 0), oi.product_price, 0) * oi.quantity, 2) - o.discount_amount, 0),
          updated_at = now()
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE oi.order_id = o.id
        AND u.email LIKE $1
    `,
    [`%@${DEMO_DOMAIN}`]
  );

  return { appliedVouchers };
};

const syncProductStats = async client => {
  await client.query(
    `
      WITH review_stats AS (
        SELECT
          product_id,
          COALESCE(AVG(rating), 0)::numeric(3, 2) AS average_rating,
          COUNT(*)::int AS review_count
        FROM product_reviews
        WHERE is_approved = true
        GROUP BY product_id
      )
      UPDATE products p
      SET rating = COALESCE(review_stats.average_rating, 0),
          reviews = COALESCE(review_stats.review_count, 0),
          updated_at = now()
      FROM review_stats
      WHERE p.id = review_stats.product_id
    `
  );

  await client.query(
    `
      UPDATE products p
      SET rating = 0,
          reviews = 0,
          updated_at = now()
      WHERE NOT EXISTS (
        SELECT 1
        FROM product_reviews pr
        WHERE pr.product_id = p.id
          AND pr.is_approved = true
      )
    `
  );

  const soldCountFunction = await client.query(
    `
      SELECT to_regprocedure('public.calculate_product_sold_count(uuid)') AS fn
    `
  );

  if (soldCountFunction.rows[0] && soldCountFunction.rows[0].fn) {
    await client.query(
      `
        UPDATE products p
        SET sold_count = public.calculate_product_sold_count(p.id),
            updated_at = now()
      `
    );
  }
};

const readSummary = async client => {
  const result = await client.query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM users WHERE email LIKE $1) AS demo_users,
        (SELECT COUNT(*)::int FROM orders o JOIN users u ON u.id = o.user_id WHERE u.email LIKE $1) AS demo_orders,
        (SELECT COUNT(*)::int FROM product_reviews pr JOIN users u ON u.id = pr.user_id WHERE u.email LIKE $1) AS demo_reviews,
        (SELECT COUNT(*)::int FROM products WHERE LOWER(COALESCE(status, 'active')) = 'active' AND deleted_at IS NULL) AS active_products,
        (
          SELECT COUNT(*)::int
          FROM products p
          WHERE LOWER(COALESCE(p.status, 'active')) = 'active'
            AND p.deleted_at IS NULL
            AND EXISTS (
              SELECT 1
              FROM product_reviews pr
              WHERE pr.product_id = p.id
                AND pr.is_approved = true
            )
        ) AS active_products_with_reviews,
        (SELECT COUNT(*)::int FROM return_requests) AS return_requests,
        (SELECT COUNT(*)::int FROM refunds) AS refund_requests,
        (
          SELECT COUNT(*)::int
          FROM orders o
          JOIN users u ON u.id = o.user_id
          WHERE u.email LIKE $1
            AND COALESCE(o.voucher_code, '') <> ''
            AND COALESCE(o.discount_amount, 0) > 0
        ) AS demo_voucher_orders,
        (
          SELECT COUNT(*)::int
          FROM voucher_redemptions vr
          JOIN users u ON u.id = vr.user_id
          WHERE u.email LIKE $1
        ) AS demo_voucher_redemptions
    `,
    [`%@${DEMO_DOMAIN}`]
  );

  return result.rows[0] || {};
};

const main = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const [orderItemColumns, adminId] = await Promise.all([
      getColumns(client, 'order_items'),
      fetchAdminId(client)
    ]);
    console.log('Preparing demo users...');
    const users = await upsertDemoUsers(client);
    console.log('Loading active catalog with real inventory variants...');
    const products = await fetchProducts(client);

    if (!products.length) {
      throw new Error('No active products with inventory variants were found.');
    }

    console.log(`Creating review orders for ${products.length} active products...`);
    const reviewSeed = await seedProductReviews(client, {
      columns: orderItemColumns,
      users,
      products,
      adminId
    });
    console.log('Creating extra dashboard orders across statuses...');
    const statusSeed = await seedStatusOrders(client, {
      columns: orderItemColumns,
      users,
      products,
      adminId
    });
    console.log('Creating return/refund request examples...');
    const requestSeed = await seedReturnAndRefundWorkflows(client);

    console.log('Applying eligible real vouchers to demo orders...');
    const voucherSeed = await applyEligibleDemoVouchers(client);

    console.log('Syncing product rating/review/sold counters...');
    await syncProductStats(client);

    const summary = await readSummary(client);

    await client.query('COMMIT');

    console.log(JSON.stringify({
      ok: true,
      password: DEMO_PASSWORD,
      createdReviewOrders: reviewSeed.createdOrders,
      createdReviews: reviewSeed.createdReviews,
      createdStatusOrders: statusSeed.createdOrders,
      createdReturnRequests: requestSeed.returnRequests,
      createdRefundRequests: requestSeed.refundRequests,
      appliedVouchers: voucherSeed.appliedVouchers,
      summary
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error.stack || error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

main();
