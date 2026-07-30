import { vietnamDateTimeLocalToIso } from '../../../helpers/dateTime';
import { flash } from '../../../helpers/flash';
import { adminApi } from '../../../services/adminApi';
import { LOW_STOCK_THRESHOLD } from '../../../utils/constants';

// Catalog, account, voucher, and inventory actions.
export const adminDashboardCatalogMethods = {
stockStatusLabel(item) {
      const quantity = Number(item && item.availableQuantity || 0);

      if (quantity <= 0) return 'Out of stock';
      if (quantity <= LOW_STOCK_THRESHOLD) return `Only ${quantity} left`;
      return 'In stock';
    },
stockStatusClass(item) {
      const quantity = Number(item && item.availableQuantity || 0);

      if (quantity <= 0) return 'stock-status--out';
      if (quantity <= LOW_STOCK_THRESHOLD) return 'stock-status--low';
      return 'stock-status--available';
    },
reviewReplyDraft(review) {
      if (!review || !review.id) {
        return '';
      }

      return Object.prototype.hasOwnProperty.call(this.productReviewReplyDrafts, review.id)
        ? this.productReviewReplyDrafts[review.id]
        : review.adminReply || '';
    },
setReviewReplyDraft(reviewId, value) {
      if (!reviewId) {
        return;
      }

      this.productReviewReplyDrafts = {
        ...this.productReviewReplyDrafts,
        [reviewId]: String(value || '').slice(0, 1000)
      };
    },
isSavingReviewReply(review) {
      return Boolean(review && review.id && this.savingProductReviewReplies[review.id]);
    },
isEditingReviewReply(review) {
      return Boolean(review && review.id && this.editingProductReviewReplyIds[review.id]);
    },
isReviewReplyExpanded(review) {
      return Boolean(review && review.id && this.expandedProductReviewReplyIds[review.id]);
    },
shouldShowReviewReplyToggle(review) {
      return String(review && review.adminReply || '').trim().length > 120;
    },
toggleReviewReplyExpanded(review) {
      if (!review || !review.id) {
        return;
      }

      this.expandedProductReviewReplyIds = {
        ...this.expandedProductReviewReplyIds,
        [review.id]: !this.isReviewReplyExpanded(review)
      };
    },
startProductReviewReplyEdit(review) {
      if (!review || !review.id) {
        return;
      }

      this.setReviewReplyDraft(review.id, review.adminReply || '');
      this.editingProductReviewReplyIds = {
        ...this.editingProductReviewReplyIds,
        [review.id]: true
      };
    },
cancelProductReviewReplyEdit(review) {
      if (!review || !review.id || this.isSavingReviewReply(review)) {
        return;
      }

      this.setReviewReplyDraft(review.id, review.adminReply || '');
      this.editingProductReviewReplyIds = {
        ...this.editingProductReviewReplyIds,
        [review.id]: false
      };
      this.expandedProductReviewReplyIds = {
        ...this.expandedProductReviewReplyIds,
        [review.id]: false
      };
    },
applyProductReviewUpdate(review) {
      if (!review || !review.id) {
        return;
      }

      this.productReviews = this.productReviews.map(item =>
        String(item.id) === String(review.id) ? { ...item, ...review } : item
      );
      this.setReviewReplyDraft(review.id, review.adminReply || '');
      this.editingProductReviewReplyIds = {
        ...this.editingProductReviewReplyIds,
        [review.id]: false
      };
    },
async saveProductReviewReply(review) {
      if (!review || !review.id) {
        return;
      }

      const adminReply = this.reviewReplyDraft(review).trim();

      if (!adminReply) {
        flash('Reply cannot be empty.', 'error');
        return;
      }

      this.savingProductReviewReplies = {
        ...this.savingProductReviewReplies,
        [review.id]: true
      };

      let response;

      try {
        response = await adminApi.updateAdminProductReviewReply(review.id, adminReply);
      } finally {
        this.savingProductReviewReplies = {
          ...this.savingProductReviewReplies,
          [review.id]: false
        };
      }

      if (!response || !response.review) return;
      this.applyProductReviewUpdate(response.review);
      flash(response.message || 'Review reply saved successfully.', 'success');
    },
async clearProductReviewReply(review) {
      if (!review || !review.id || (!review.adminReply && !this.reviewReplyDraft(review))) {
        return;
      }

      this.savingProductReviewReplies = {
        ...this.savingProductReviewReplies,
        [review.id]: true
      };

      let response;

      try {
        response = await adminApi.deleteAdminProductReviewReply(review.id);
      } finally {
        this.savingProductReviewReplies = {
          ...this.savingProductReviewReplies,
          [review.id]: false
        };
      }

      if (!response || !response.review) return;
      this.applyProductReviewUpdate(response.review);
      flash(response.message || 'Review reply cleared successfully.', 'success');
    },
async openInventoryHistory(item) {
      if (!item || !item.id) {
        return;
      }

      this.isLoadingInventoryHistory = true;
      this.selectedInventoryHistory = null;
      const response = await adminApi.getAdminInventoryHistory(item.id);
      this.isLoadingInventoryHistory = false;

      if (!response) {
        flash('Unable to load stock history.', 'error');
        return;
      }

      this.selectedInventoryHistory = {
        variant: response.variant || {
          productName: item.productName,
          colorName: item.colorName,
          sizeLabel: item.sizeLabel,
          productCode: item.productCode,
          articleNumber: item.articleNumber
        },
        items: Array.isArray(response.items) ? response.items : []
      };
    },
closeInventoryHistory() {
      if (this.isLoadingInventoryHistory) {
        return;
      }

      this.selectedInventoryHistory = null;
    },
formatInventoryMovementType(type) {
      const value = String(type || '').toLowerCase();
      const labels = {
        import: 'Imported stock',
        sale: 'Sold from order',
        cancel: 'Restored from cancelled order',
        adjustment: 'Manual adjustment',
        return: 'Returned stock',
        return_restock: 'Returned stock',
        return_damaged: 'Returned damaged',
        delivery_failed_return: 'Delivery failed return'
      };

      return labels[value] || this.formatLabel(value);
    },
inventoryChangeClass(entry) {
      const type = String(entry && entry.movementType || '').toLowerCase();

      if (['import', 'cancel', 'return', 'return_restock', 'delivery_failed_return'].includes(type)) return 'stock-change--positive';
      if (type === 'sale') return 'stock-change--negative';
      return Number(entry && entry.quantity || 0) >= 0 ? 'stock-change--positive' : 'stock-change--negative';
    },
formatInventoryQuantityChange(entry) {
      const type = String(entry && entry.movementType || '').toLowerCase();
      const quantity = Math.abs(Number(entry && entry.quantity || 0));
      const sign = ['import', 'cancel', 'return', 'return_restock', 'delivery_failed_return'].includes(type)
        ? '+'
        : type === 'sale'
          ? '-'
          : Number(entry && entry.quantity || 0) >= 0
            ? '+'
            : '-';

      return `${sign}${quantity}`;
    },
requestDeleteAccount(account) {
      if (!account || !account.id) {
        return;
      }

      this.openConfirm({
        title: 'Delete account?',
        message: `${account.email || account.name} will be permanently removed. Accounts with order or transaction history cannot be deleted; deactivate them instead.`,
        confirmLabel: 'Delete account',
        onConfirm: async () => {
          const response = await adminApi.deleteAdminAccount(account.id);
          if (!response) return;
          await Promise.all([this.loadAccounts(), this.loadDashboard()]);
          flash(response.message || 'Account deleted successfully.', 'success');
        }
      });
    },
requestToggleAccountStatus(account) {
      if (!account || !account.id) {
        return;
      }

      if (String(this.currentUser && this.currentUser.id) === String(account.id)) {
        flash('You cannot change the status of your own admin account.', 'error');
        return;
      }

      const nextStatus = account.status === 'inactive' ? 'active' : 'inactive';
      const isDeactivating = nextStatus === 'inactive';

      this.openConfirm({
        title: `${isDeactivating ? 'Deactivate' : 'Activate'} account?`,
        message: isDeactivating
          ? `${account.email || account.name} will be signed out and unable to log in until this account is activated again.`
          : `${account.email || account.name} will be allowed to log in and use the store again.`,
        confirmLabel: `${isDeactivating ? 'Deactivate' : 'Activate'} account`,
        onConfirm: async () => {
          const response = await adminApi.updateAdminAccountStatus(account.id, nextStatus);
          if (!response) return;
          await Promise.all([this.loadAccounts(), this.loadDashboard()]);
          flash(response.message || `Account ${isDeactivating ? 'deactivated' : 'activated'} successfully.`, 'success');
        }
      });
    },
openConfirm(options) {
      this.pendingActionConfirm = {
        title: options.title,
        message: options.message,
      confirmLabel: options.confirmLabel || 'Confirm',
        fields: options.fields ? { ...options.fields } : null,
        fieldConfig: Array.isArray(options.fieldConfig) ? options.fieldConfig : [],
        onConfirm: options.onConfirm
      };
    },
closeActionConfirm() {
      if (this.isAdminActionConfirmSaving) return;
      this.pendingActionConfirm = null;
    },
async confirmAction() {
      const action = this.pendingActionConfirm;

      if (this.isAdminActionConfirmSaving) return;
      if (!action || typeof action.onConfirm !== 'function') {
        this.pendingActionConfirm = null;
        return;
      }

      this.isAdminActionConfirmSaving = true;
      try {
        await action.onConfirm(action.fields || {});
        this.pendingActionConfirm = null;
      } finally {
        this.isAdminActionConfirmSaving = false;
      }
    },
nextActiveStatus(item) {
      return String(item && item.status || '').toLowerCase() === 'active' ? 'inactive' : 'active';
    },
async toggleProductStatus(product) {
      const nextStatus = this.nextActiveStatus(product);
      const response = await adminApi.updateAdminProductStatus(product.id, nextStatus);

      if (!response) return;
      await Promise.all([this.loadProducts(), this.loadDashboard()]);
      flash(response.message || `Product ${nextStatus === 'active' ? 'activated' : 'deactivated'} successfully.`, 'success');
    },
async saveCategory() {
      const payload = {
        name: this.categoryForm.name.trim(),
        label: this.categoryForm.label.trim() || this.categoryForm.name.trim(),
        slug: this.categoryForm.slug.trim(),
        departmentId: this.categoryForm.departmentId || null,
        productGroupId: this.categoryForm.productGroupId || null,
        status: this.categoryForm.status
      };
      const wasEditing = Boolean(this.categoryForm.id);
      const response = wasEditing
        ? await adminApi.updateAdminCategory(this.categoryForm.id, payload)
        : await adminApi.createAdminCategory(payload);

      if (!response) return;
      this.resetCategoryForm();
      await Promise.all([this.loadCategories(), this.loadDashboard()]);
      flash(wasEditing ? 'Category updated successfully.' : 'Category created successfully.', 'success');
    },
async toggleCategoryStatus(category) {
      const nextStatus = this.nextActiveStatus(category);
      const response = await adminApi.updateAdminCategoryStatus(category.id, nextStatus);

      if (!response) return;
      await Promise.all([
        this.loadCategories(),
        this.loadFilterCategories(),
        this.loadDashboard()
      ]);
      flash(response.message || `Category ${nextStatus === 'active' ? 'activated' : 'deactivated'} successfully.`, 'success');
    },
async archiveCategory(category) {
      this.openConfirm({
        title: 'Archive category?',
        message: `Hide ${category.label || category.name} from the storefront while keeping existing products and orders safe.`,
        confirmLabel: 'Archive category',
        onConfirm: async () => {
          const response = await adminApi.deleteAdminCategory(category.id);
          if (!response) return;
          await Promise.all([this.loadCategories(), this.loadDashboard()]);
          flash(response.message || 'Category archived successfully.', 'success');
        }
      });
    },
async saveCollection() {
      const payload = {
        name: this.collectionForm.name.trim(),
        slug: this.collectionForm.slug.trim(),
        bannerImage: this.collectionForm.bannerImage.trim(),
        status: this.collectionForm.status
      };
      const response = this.collectionForm.id
        ? await adminApi.updateAdminCollection(this.collectionForm.id, payload)
        : await adminApi.createAdminCollection(payload);

      if (!response) return;
      const wasEditing = Boolean(this.collectionForm.id);
      this.resetCollectionForm();
      await Promise.all([this.loadCollections(), this.loadDashboard()]);
      flash(wasEditing ? 'Collection updated successfully.' : 'Collection created successfully.', 'success');
    },
async toggleCollectionStatus(collection) {
      const nextStatus = this.nextActiveStatus(collection);
      const response = await adminApi.updateAdminCollectionStatus(collection.id, nextStatus);

      if (!response) return;
      await Promise.all([this.loadCollections(), this.loadDashboard()]);
      flash(response.message || `Collection ${nextStatus === 'active' ? 'activated' : 'deactivated'} successfully.`, 'success');
    },
async archiveCollection(collection) {
      this.openConfirm({
        title: 'Archive collection?',
        message: `Hide ${collection.name} from collection pages and homepage slots.`,
        confirmLabel: 'Archive collection',
        onConfirm: async () => {
          const response = await adminApi.deleteAdminCollection(collection.id);
          if (!response) return;
          await Promise.all([this.loadCollections(), this.loadDashboard()]);
          flash(response.message || 'Collection archived successfully.', 'success');
        }
      });
    },
async saveVoucher() {
      const payload = {
        code: this.voucherForm.code.trim(),
        discountType: this.voucherForm.discountType,
        discountValue: Number(this.voucherForm.discountValue) || 0,
        minOrderAmount: Number(this.voucherForm.minOrderAmount) || 0,
        maxDiscountAmount: this.voucherForm.maxDiscountAmount === '' ? null : Number(this.voucherForm.maxDiscountAmount),
        startDate: vietnamDateTimeLocalToIso(this.voucherForm.startDate),
        endDate: vietnamDateTimeLocalToIso(this.voucherForm.endDate),
        usageLimit: this.voucherForm.usageLimit === '' ? null : Number(this.voucherForm.usageLimit),
        status: this.voucherForm.status
      };
      const wasEditing = Boolean(this.voucherForm.id);
      const response = wasEditing
        ? await adminApi.updateAdminVoucher(this.voucherForm.id, payload)
        : await adminApi.createAdminVoucher(payload);

      if (!response) return;
      this.resetVoucherForm();
      await this.loadVouchers();
      flash(wasEditing ? 'Voucher updated successfully.' : 'Voucher created successfully.', 'success');
    },
async toggleVoucherStatus(voucher) {
      const response = await adminApi.updateAdminVoucher(voucher.id, {
        code: voucher.code,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        minOrderAmount: voucher.minOrderAmount,
        maxDiscountAmount: voucher.maxDiscountAmount,
        startDate: voucher.startDate,
        endDate: voucher.endDate,
        usageLimit: voucher.usageLimit,
        status: voucher.status === 'active' ? 'inactive' : 'active'
      });

      if (!response) return;
      await this.loadVouchers();
      flash(`Voucher ${voucher.status === 'active' ? 'deactivated' : 'activated'} successfully.`, 'success');
    },
async archiveVoucher(voucher) {
      this.openConfirm({
        title: 'Archive voucher?',
        message: `Soft delete ${voucher.code}. Existing order history will be preserved.`,
        confirmLabel: 'Archive voucher',
        onConfirm: async () => {
          const response = await adminApi.deleteAdminVoucher(voucher.id);
          if (!response) return;
          await this.loadVouchers();
          flash(response.message || 'Voucher archived successfully.', 'success');
        }
      });
    },
openInventoryImport(item) {
      if (!item || !item.id) {
        return;
      }

      this.selectedInventoryImportVariant = item;
      this.inventoryImport = {
        variantId: item.id,
        quantity: 1,
        note: ''
      };
    },
closeInventoryImport() {
      if (this.isImportingInventory) {
        return;
      }

      this.selectedInventoryImportVariant = null;
      this.inventoryImport = {
        variantId: '',
        quantity: 1,
        note: ''
      };
    },
applyImportedInventory(variant) {
      if (!variant || !variant.id) {
        return;
      }

      const variantId = String(variant.id);
      const stockQuantity = Number(variant.stockQuantity ?? variant.stock_quantity ?? 0);
      const reservedQuantity = Number(variant.reservedQuantity ?? variant.reserved_quantity ?? 0);
      const soldQuantity = Number(variant.soldQuantity ?? variant.sold_quantity ?? 0);
      const availableQuantity = Math.max(0, stockQuantity - reservedQuantity);

      this.inventoryItems = this.inventoryItems.map(item => {
        if (String(item.id) !== variantId) {
          return item;
        }

        return {
          ...item,
          stockQuantity,
          reservedQuantity,
          soldQuantity,
          availableQuantity,
          updatedAt: variant.updatedAt || variant.updated_at || new Date().toISOString()
        };
      });

      if (this.selectedInventoryImportVariant && String(this.selectedInventoryImportVariant.id) === variantId) {
        this.selectedInventoryImportVariant = {
          ...this.selectedInventoryImportVariant,
          stockQuantity,
          reservedQuantity,
          soldQuantity,
          availableQuantity,
          updatedAt: variant.updatedAt || variant.updated_at || new Date().toISOString()
        };
      }
    },
async importInventory() {
      if (this.isImportingInventory) {
        return;
      }

      const variantId = this.inventoryImport.variantId || (this.selectedInventoryImportVariant && this.selectedInventoryImportVariant.id);
      const quantity = Number(this.inventoryImport.quantity) || 0;

      if (!variantId || quantity <= 0) {
        flash('Please choose a variant and enter an import quantity greater than 0.', 'error');
        return;
      }

      this.isImportingInventory = true;
      const response = await adminApi.importAdminInventory({
        variantId,
        quantity,
        note: this.inventoryImport.note
      });
      this.isImportingInventory = false;

      if (!response) return;
      this.applyImportedInventory(response.variant);
      this.inventoryImport = {
        variantId: '',
        quantity: 1,
        note: ''
      };
      this.selectedInventoryImportVariant = null;
      this.loadInventory({ silent: true });
      flash(response.message || 'Inventory imported successfully.', 'success');
    },
async removeProduct(product) {
      this.pendingProductDelete = product;
    }
};
