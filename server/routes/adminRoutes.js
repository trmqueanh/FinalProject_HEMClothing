const express = require('express');
const adminController = require('../controllers/adminController');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.route('/admin/dashboard').get(requireAdmin, adminController.dashboard);
router.route('/admin/notifications').get(requireAdmin, adminController.listNotifications);
router.route('/admin/products').get(requireAdmin, adminController.listProducts);
router.route('/admin/products/:productId/status').patch(requireAdmin, adminController.updateProductStatus);
router.route('/admin/product-reviews').get(requireAdmin, adminController.listProductReviews);
router
    .route('/admin/product-reviews/:reviewId/reply')
    .put(requireAdmin, adminController.updateProductReviewReply)
    .delete(requireAdmin, adminController.deleteProductReviewReply);
router.route('/admin/product-groups').get(requireAdmin, adminController.listProductGroups);
router.route('/admin/styles').get(requireAdmin, adminController.listStyles);
router.route('/admin/fits').get(requireAdmin, adminController.listFits);
router.route('/admin/materials').get(requireAdmin, adminController.listMaterials);
router.route('/admin/categories').get(requireAdmin, adminController.listCategories).post(requireAdmin, adminController.createCategory);
router
    .route('/admin/categories/:categoryId')
    .get(requireAdmin, adminController.readCategory)
    .put(requireAdmin, adminController.updateCategory)
    .delete(requireAdmin, adminController.deleteCategory);
router.route('/admin/categories/:categoryId/status').patch(requireAdmin, adminController.updateCategoryStatus);
router.route('/admin/collections').get(requireAdmin, adminController.listCollections).post(requireAdmin, adminController.createCollection);
router
    .route('/admin/collections/:collectionId')
    .get(requireAdmin, adminController.readCollection)
    .put(requireAdmin, adminController.updateCollection)
    .delete(requireAdmin, adminController.deleteCollection);
router.route('/admin/collections/:collectionId/status').patch(requireAdmin, adminController.updateCollectionStatus);
router.route('/admin/accounts').get(requireAdmin, adminController.listAccounts);
router.route('/admin/accounts/:accountId/orders').get(requireAdmin, adminController.readCustomerOrders);
router.route('/admin/accounts/:accountId/status').patch(requireAdmin, adminController.updateAccountStatus);
router.route('/admin/accounts/:accountId').get(requireAdmin, adminController.readCustomer);
router.route('/admin/inventory').get(requireAdmin, adminController.listInventory);
router.route('/admin/inventory/:variantId/history').get(requireAdmin, adminController.getInventoryHistory);
router.route('/admin/inventory/import').post(requireAdmin, adminController.importInventory);
router.route('/admin/vouchers').get(requireAdmin, adminController.listVouchers).post(requireAdmin, adminController.createVoucher);
router
    .route('/admin/vouchers/:voucherId')
    .get(requireAdmin, adminController.readVoucher)
    .put(requireAdmin, adminController.updateVoucher)
    .delete(requireAdmin, adminController.deleteVoucher);

module.exports = router;
