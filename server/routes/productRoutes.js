const express = require('express');
const productController = require('../controllers/productController');
const requireAdmin = require('../middleware/requireAdmin');
const uploadProductImage = require('../middleware/uploadProductImage');

const router = express.Router();

router.route('/departments').get(productController.listDepartments);
router.route('/collections').get(productController.listCollections);
router.route('/landing-collections').get(productController.listLandingCollections);
router.route('/categories').get(productController.listCategories);
router.route('/materials').get(productController.listMaterials);
router.route('/api/size-guides/category/:categoryId').get(productController.getCategorySizeGuide);

router
    .route('/products')
    .get(productController.listAllProducts)
    .post(requireAdmin, productController.createProduct);

router.route('/products/search').get(productController.searchProducts);

router
    .route('/products/:productId')
    .get(productController.readProduct)
    .put(requireAdmin, productController.updateProduct)
    .delete(requireAdmin, productController.deleteProduct);

router.route('/admin/products/:productId').get(requireAdmin, productController.readAdminProduct);

router
    .route('/products/:productId/images')
    .put(requireAdmin, productController.syncProductImages)
    .post(requireAdmin, uploadProductImage.single('image'), productController.uploadProductImage);

module.exports = router;
