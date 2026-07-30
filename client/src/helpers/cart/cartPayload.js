// Chuẩn hóa payload cart từ API để các component luôn nhận cùng một cấu trúc dữ liệu.
export const isValidCartPayload = payload => Boolean(payload && Array.isArray(payload.items));

export const normalizeCartItems = value =>
  (Array.isArray(value) ? value : []).map(item => {
    const quantity = Number(item.quantity || 0);
    const rawStockLimit = Number(
      item.maxQuantity ??
      item.max_quantity ??
      item.availableQuantity ??
      item.available_quantity ??
      NaN
    );
    const maxQuantity = Number.isFinite(rawStockLimit) ? rawStockLimit : quantity;

    return {
      ...item,
      lineId: String(item.lineId || item.cartItemId || ''),
      cartItemId: String(item.cartItemId || item.lineId || ''),
      productId: String(item.productId || ''),
      colorVariantId: String(item.colorVariantId || item.color_variant_id || ''),
      price: Number(item.price ?? item.productPrice ?? item.unitPrice ?? 0),
      originalPrice: Number(item.originalPrice ?? item.original_price ?? item.price ?? item.productPrice ?? item.unitPrice ?? 0),
      pricingMode: String(item.pricingMode || item.pricing_mode || 'regular'),
      priceLabel: String(item.priceLabel || item.price_label || ''),
      quantity,
      availableQuantity: maxQuantity,
      maxQuantity,
      isMaxQuantity: Boolean(item.isMaxQuantity ?? item.is_max_quantity ?? (quantity >= maxQuantity))
    };
  });
