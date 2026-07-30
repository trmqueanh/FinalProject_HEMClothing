<template>
  <section id="product-reviews" class="product-reviews">
    <div class="product-reviews__container">
      <p class="product-reviews__eyebrow">Customer Reviews</p>

      <div v-if="reviewCount > 0" class="product-reviews__dashboard">
        <!-- Average Rating Score Column -->
        <div class="product-reviews__score-panel">
          <strong class="product-reviews__score-number">{{ Number(displayAverageRating || 0).toFixed(1) }}</strong>
          <div class="product-reviews__stars" aria-label="Average rating">
            <span v-for="star in 5" :key="star" :class="{ 'is-active': star <= Math.round(displayAverageRating) }">&#9733;</span>
          </div>
          <span class="product-reviews__count">{{ reviewCountLabel }}</span>
        </div>

        <!-- Rating Breakdown Progress Bars -->
        <div class="product-reviews__distribution">
          <div
            v-for="row in starDistribution"
            :key="row.stars"
            class="product-reviews__distribution-row"
          >
            <span class="product-reviews__distribution-label">{{ row.stars }} ★</span>
            <div class="product-reviews__bar-bg">
              <div class="product-reviews__bar-fill" :style="{ width: row.percentage + '%' }"></div>
            </div>
            <span class="product-reviews__distribution-percentage">{{ row.percentage }}%</span>
            <span class="product-reviews__distribution-count">({{ row.count }})</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isLoadingReviews" class="product-reviews__loading">
      <span>Loading reviews…</span>
    </div>

    <template v-else>
      <!-- My review card -->
      <article v-if="myProductReview && !editingReviewId" class="product-review-card product-review-card--mine">
        <div class="product-review-card__content">
          <div class="product-review-card__header-row">
            <div class="product-review-card__identity">
              <div class="product-review-card__author-row">
                <span class="product-review-card__own-label">Your review</span>
                <span class="product-review-card__verified">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  Verified purchase
                </span>
              </div>
              <span v-if="reviewVariantMeta(myProductReview)" class="product-review-card__purchase">
                Purchased: {{ reviewVariantMeta(myProductReview) }}
              </span>
            </div>
            <time class="product-review-card__date">{{ formatDate(myProductReview.updatedAt || myProductReview.createdAt) }}</time>
          </div>

          <div class="product-review-card__stars" :aria-label="`${myProductReview.rating} out of 5 stars`">
            <span v-for="star in 5" :key="star" :class="{ 'is-active': star <= myProductReview.rating }">&#9733;</span>
          </div>

          <p v-if="myProductReview.comment || myProductReview.body" class="product-review-card__text">{{ myProductReview.comment || myProductReview.body }}</p>

          <blockquote v-if="myProductReview.adminReply" class="product-review-card__reply">
            <span class="product-review-card__reply-title">HEM Response</span>
            <p class="product-review-card__reply-text">{{ myProductReview.adminReply }}</p>
          </blockquote>
        </div>
      </article>

      <!-- Write / Edit Review Form -->
      <form v-if="shouldShowReviewForm" class="product-review-form" @submit.prevent="$emit('submit-review')">
        <p class="product-review-form__heading">{{ editingReviewId ? 'Update your review' : 'Write a review' }}</p>

        <div class="product-review-form__rating-container">
          <span class="product-review-form__label-text">Your Rating</span>
          <div class="product-review-form__stars" aria-label="Choose rating">
            <button
              v-for="star in 5"
              :key="star"
              type="button"
              :class="{ 'is-active': star <= (hoverStar || reviewForm.rating) }"
              :aria-pressed="star <= reviewForm.rating ? 'true' : 'false'"
              @click="$emit('update-review-rating', star)"
              @mouseenter="hoverStar = star"
              @mouseleave="hoverStar = 0"
            >&#9733;</button>
          </div>
          <span class="product-review-form__rating-label">{{ getRatingDescription(hoverStar || reviewForm.rating) }}</span>
        </div>

        <label class="product-review-form__label">
          <span>Comment</span>
          <textarea
            :value="reviewForm.comment"
            rows="4"
            placeholder="Share fit, fabric, styling, or delivery notes."
            @input="$emit('update-review-comment', $event.target.value)"
          ></textarea>
        </label>

        <div class="product-review-form__actions">
          <button type="submit" class="primary-button product-review-form__submit-btn" :disabled="isSavingReview">
            {{ isSavingReview ? 'Saving…' : editingReviewId ? 'Save review' : 'Submit review' }}
          </button>
          <button v-if="editingReviewId" type="button" class="ghost-button" :disabled="isSavingReview" @click="$emit('cancel-edit-review')">Cancel</button>
        </div>
      </form>


      <!-- Reviews List -->
      <div v-if="visibleProductReviews.length" class="product-reviews__list">
        <article v-for="review in visibleProductReviews" :key="review.id" class="product-review-card">
          <div class="product-review-card__content">
            <div class="product-review-card__header-row">
              <div class="product-review-card__identity">
                <div class="product-review-card__author-row">
                  <strong class="product-review-card__author">{{ review.userName || 'HEM Customer' }}</strong>
                  <span class="product-review-card__verified">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    Verified purchase
                  </span>
                </div>
                <span v-if="reviewVariantMeta(review)" class="product-review-card__purchase">
                  Purchased: {{ reviewVariantMeta(review) }}
                </span>
              </div>
              <time class="product-review-card__date">{{ formatDate(review.createdAt) }}</time>
            </div>

            <div class="product-review-card__stars" :aria-label="`${review.rating} out of 5 stars`">
              <span v-for="star in 5" :key="star" :class="{ 'is-active': star <= review.rating }">&#9733;</span>
            </div>

            <p v-if="review.comment" class="product-review-card__text">{{ review.comment }}</p>

            <!-- Admin reply block -->
            <blockquote v-if="review.adminReply" class="product-review-card__reply">
              <span class="product-review-card__reply-title">HEM Response</span>
              <p class="product-review-card__reply-text">{{ review.adminReply }}</p>
            </blockquote>
          </div>
        </article>
      </div>

      <div v-if="showReviewToggle" class="product-reviews__more">
        <button type="button" class="ghost-button" @click="$emit('toggle-review-visibility')">
          {{ allReviewsVisible ? 'Show less' : 'View more reviews' }}
        </button>
      </div>

      <div v-if="!visibleProductReviews.length && !myProductReview" class="product-reviews__empty">
        No reviews yet.
      </div>
    </template>
  </section>
</template>

<script>
export default {
  name: 'ProductReviews',
  props: {
    displayAverageRating: {
      type: Number,
      default: 0
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    reviewCountLabel: {
      type: String,
      default: ''
    },
    starDistribution: {
      type: Array,
      default: () => []
    },
    isLoadingReviews: {
      type: Boolean,
      default: false
    },
    myProductReview: {
      type: Object,
      default: null
    },
    editingReviewId: {
      type: [String, Number],
      default: ''
    },
    shouldShowReviewForm: {
      type: Boolean,
      default: false
    },
    reviewForm: {
      type: Object,
      required: true
    },
    isSavingReview: {
      type: Boolean,
      default: false
    },
    isUser: {
      type: Boolean,
      default: false
    },
    hasPurchasedProduct: {
      type: Boolean,
      default: false
    },
    visibleProductReviews: {
      type: Array,
      default: () => []
    },
    showReviewToggle: {
      type: Boolean,
      default: false
    },
    allReviewsVisible: {
      type: Boolean,
      default: false
    },
    formatDate: {
      type: Function,
      required: true
    },
    reviewVariantMeta: {
      type: Function,
      required: true
    },
    getRatingDescription: {
      type: Function,
      required: true
    }
  },
  emits: [
    'submit-review',
    'update-review-rating',
    'update-review-comment',
    'cancel-edit-review',
    'toggle-review-visibility'
  ],
  data() {
    return {
      hoverStar: 0
    };
  }
};
</script>

<style scoped>
.product-reviews {
  display: flex;
  flex-direction: column;
  gap: clamp(0.9rem, 1.4vw, 1.2rem);
  width: 100%;
  padding: clamp(1.6rem, 2.4vw, 2.6rem) clamp(1rem, 4vw, 6.25rem) 0;
  border-top: 1px solid var(--color-border-subtle);
  margin-top: 48px;
  background: transparent;
  box-sizing: border-box;
  scroll-margin-top: calc(var(--store-header-height, 98px) + 24px);
}

.product-reviews__container {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.product-reviews__eyebrow {
  margin: 0;
  color: var(--color-ink);
  font-size: clamp(1.35rem, 1.7vw, 1.9rem);
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.05;
  text-transform: none;
}

.product-reviews__heading {
  margin: 0;
  color: var(--color-text-primary);
  font-size: clamp(20px, 3vw, 24px);
  font-weight: 500;
  letter-spacing: -0.01em;
}

.product-reviews__dashboard {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 48px;
  background: rgba(255, 255, 255, 0.32);
  border: 1px solid var(--color-border-subtle);
  padding: 32px;
  margin-top: 24px;
}

.product-reviews__score-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-right: 1px solid var(--color-border-subtle);
  padding-right: 48px;
}

.product-reviews__score-number {
  font-size: 48px;
  font-weight: 600;
  line-height: 1;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
  margin-bottom: 12px;
}

.product-reviews__stars {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-bottom: 8px;
}

.product-reviews__stars span {
  color: var(--color-rating-star-muted);
  font-size: 16px;
  line-height: 1;
}

.product-reviews__stars span.is-active {
  color: var(--color-rating-star);
}

.product-reviews__count {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.product-reviews__distribution {
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: center;
}

.product-reviews__distribution-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px 32px;
  align-items: center;
  column-gap: 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.product-reviews__distribution-label {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  text-align: right;
  font-weight: 500;
  color: var(--color-rating-star);
  line-height: 1;
  white-space: nowrap;
}

.product-reviews__bar-bg {
  flex: 1;
  height: 6px;
  background: var(--color-border-subtle);
  border-radius: 3px;
  overflow: hidden;
}

.product-reviews__bar-fill {
  height: 100%;
  background: var(--color-rating-star);
  border-radius: 3px;
  transition: width 0.8s ease;
}

.product-reviews__distribution-percentage {
  min-width: 0;
  font-weight: 600;
  text-align: right;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.product-reviews__distribution-count {
  min-width: 0;
  color: var(--color-text-secondary);
  opacity: 0.7;
  white-space: nowrap;
}

.product-reviews__loading {
  padding: 40px 0;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.product-reviews__notice,
.product-reviews__empty {
  padding: 32px 0;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 13px;
  background: rgba(255, 255, 255, 0.30);
  border: 1px solid var(--color-border-subtle);
}

.product-review-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 32px;
  border: 1px solid var(--color-border-default);
  background: rgba(255, 255, 255, 0.34);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  margin-bottom: 24px;
}

.product-review-form__heading {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.product-review-form__rating-container {
  display: flex;
  align-items: center;
  gap: 16px;
}

.product-review-form__label-text {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-primary);
}

.product-review-form__stars {
  display: flex;
  align-items: center;
  gap: 4px;
}

.product-review-form__stars button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-rating-star-muted);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  transition: all var(--duration-fast) ease;
}

.product-review-form__stars button.is-active {
  color: var(--color-rating-star);
}

.product-review-form__stars button:hover {
  transform: scale(1.15);
}

.product-review-form__rating-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.product-review-form__label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.product-review-form__label span {
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.product-review-form textarea {
  width: 100%;
  resize: vertical;
  padding: 12px;
  border: 1px solid var(--color-border-default);
  background: var(--color-surface-base);
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.55;
  box-sizing: border-box;
  transition: border-color var(--duration-fast) ease;
}

.product-review-form textarea:focus {
  border-color: var(--color-border-strong);
  outline: none;
}

.product-review-form__actions {
  display: flex;
  gap: 12px;
}

.product-reviews__list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.product-review-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 32px 0;
  border-bottom: 1px solid var(--color-border-subtle);
}

.product-review-card--mine {
  border-top: 1px solid var(--color-border-subtle);
}

.product-review-card__own-label {
  display: inline-flex;
  align-items: center;
  padding: 3px 7px;
  border: 1px solid rgba(17, 17, 17, 0.14);
  background: rgba(17, 17, 17, 0.04);
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.product-review-card__stars {
  display: flex;
  gap: 3px;
}

.product-review-card__stars span {
  color: var(--color-rating-star-muted);
  font-size: 17px;
  line-height: 1;
}

.product-review-card__stars span.is-active {
  color: var(--color-rating-star);
}

.product-review-card__content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.product-review-card__header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.product-review-card__identity {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.product-review-card__author-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.product-review-card__author {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.product-review-card__verified {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border: 1px solid rgba(21, 128, 61, 0.18);
  background: rgba(21, 128, 61, 0.06);
  color: #15803d;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.product-review-card__purchase {
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.4;
}

.product-review-card__date {
  font-size: 14px;
  color: var(--color-text-secondary);
  opacity: 0.8;
}

.product-review-card__text {
  font-size: 16px;
  line-height: 1.6;
  color: var(--color-text-primary);
  margin: 0;
  opacity: 0.95;
}

.product-review-card__reply {
  background: var(--color-bg-canvas);
  border-left: 2px solid var(--color-rating-star);
  padding: 16px;
  margin: 8px 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.product-review-card__reply-title {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94711c;
}

.product-review-card__reply-text {
  font-size: 15px;
  line-height: 1.5;
  color: var(--color-text-secondary);
  margin: 0;
}

.product-reviews__more {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

@media (max-width: 960px) {
  .product-reviews__dashboard {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 24px;
  }

  .product-reviews__score-panel {
    border-right: none;
    border-bottom: 1px solid var(--color-border-subtle);
    padding-right: 0;
    padding-bottom: 24px;
  }

}

@media (min-width: 1440px) {
  .product-reviews {
    gap: 28px;
    padding-top: 48px;
  }

  .product-reviews__dashboard {
    grid-template-columns: 220px minmax(0, 1fr);
    gap: 44px;
    padding: 40px 48px;
  }

  .product-reviews__score-number {
    font-size: 44px;
  }

  .product-reviews__stars span {
    font-size: 20px;
  }

  .product-reviews__count,
  .product-reviews__distribution-row {
    font-size: 15px;
  }

  .product-review-card {
    padding: 40px 0;
  }

  .product-review-card__content {
    gap: 14px;
  }

  .product-review-card__own-label,
  .product-review-card__reply-title {
    font-size: 14px;
  }

  .product-review-card__stars span {
    font-size: 20px;
  }

  .product-review-card__text {
    font-size: 19px;
    line-height: 1.65;
  }

  .product-review-card__reply {
    margin-top: 12px;
    padding: 22px 24px;
    gap: 10px;
  }

  .product-review-card__reply-text {
    font-size: 18px;
    line-height: 1.65;
  }

  .product-review-card__meta span,
  .product-review-card__purchase,
  .product-review-card__date {
    font-size: 15px;
  }

  .product-review-card__author {
    font-size: 19px;
  }

  .product-review-card__verified {
    font-size: 13px;
    padding: 5px 10px;
  }
}

@media (max-width: 560px) {
  .product-reviews {
    padding-inline: 1rem;
  }

  .product-review-card {
    padding: 24px 0;
  }

  .product-review-card__header-row {
    flex-direction: column;
    gap: 10px;
  }

  .product-review-card__date {
    order: -1;
    font-size: 11px;
  }
}
</style>
