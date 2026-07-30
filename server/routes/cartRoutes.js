const express = require('express');
const cartController = require('../controllers/cartController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.route('/cart')
    .get(requireAuth, cartController.getCart)
    .delete(requireAuth, cartController.clearCart);

router.route('/cart/items')
    .post(requireAuth, cartController.addCartItem);

router.route('/cart/items/:cartItemId')
    .put(requireAuth, cartController.updateCartItem)
    .delete(requireAuth, cartController.removeCartItem);

module.exports = router;
