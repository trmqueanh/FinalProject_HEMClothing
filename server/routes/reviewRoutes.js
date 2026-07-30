const express = require('express');
const reviewController = require('../controllers/reviewController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router
    .route('/api/products/:productId/reviews')
    .get(reviewController.getProductReviews)
    .post(requireAuth, reviewController.createProductReview);

router.route('/api/account/reviews').get(requireAuth, reviewController.getAccountReviews);

router
    .route('/api/reviews/:reviewId')
    .put(requireAuth, reviewController.updateReview)
    .delete(requireAuth, reviewController.deleteReview);

module.exports = router;
