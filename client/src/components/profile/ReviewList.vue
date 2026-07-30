<template>
  <section class="profile-panel">
    <div class="profile-panel__top">
      <div>
        <p class="eyebrow">Reviews</p>
        <h1>My Reviews</h1>
      </div>
    </div>

    <div v-if="isLoading" class="profile-empty">
      Loading reviews...
    </div>

    <div v-else-if="!reviews.length" class="profile-empty">
      <h3>No reviews posted yet.</h3>
      <p>Your product reviews will appear here after you submit them.</p>
    </div>

    <template v-else>
      <div class="profile-reviews">
      <article v-for="review in paginatedReviews" :key="review.id" class="profile-review">
        <template v-if="editingReviewId === review.id">
          <form class="profile-review__editor" @submit.prevent="$emit('save-review', review)">
            <div class="profile-review__rating">
              <button
                v-for="star in 5"
                :key="star"
                type="button"
                :class="{ 'is-active': star <= reviewDraft.rating }"
                @click="$emit('update-review-draft', { rating: star })"
              >
                &#9733;
              </button>
            </div>
            <label>
              <span>Comment</span>
              <textarea :value="reviewDraft.comment" rows="4" placeholder="Update your product review." @input="$emit('update-review-draft', { comment: $event.target.value })"></textarea>
            </label>
            <div class="profile-review__actions">
              <button type="submit" :disabled="isSaving">{{ isSaving ? 'Saving...' : 'Save review' }}</button>
              <button type="button" :disabled="isSaving" @click="$emit('cancel-edit')">Cancel</button>
            </div>
          </form>
        </template>

        <template v-else>
          <div class="profile-review__main">
            <router-link v-if="review.productId" :to="productRoute(review)" class="profile-review__media">
              <img v-if="review.productImage" :src="review.productImage" :alt="review.productName || 'Product review'" />
              <span v-else>HEM</span>
            </router-link>
            <div v-else class="profile-review__media">
              <img v-if="review.productImage" :src="review.productImage" :alt="review.productName || 'Product review'" />
              <span v-else>HEM</span>
            </div>

            <div class="profile-review__body">
              <router-link v-if="review.productId" :to="productRoute(review)" class="profile-review__product">
                {{ review.productName || 'Product review' }}
              </router-link>
              <span v-else>{{ review.productName || 'Product review' }}</span>
              <small v-if="reviewVariantLabel(review)">{{ reviewVariantLabel(review) }}</small>
              <div class="profile-review__stars" :aria-label="`${review.rating} out of 5 stars`">
                <span v-for="star in 5" :key="star" :class="{ 'is-active': star <= review.rating }">&#9733;</span>
              </div>
              <p v-if="review.comment || review.body">{{ review.comment || review.body }}</p>
              <blockquote v-if="review.adminReply">
                <span>HEM reply</span>
                {{ review.adminReply }}
              </blockquote>
              <small>{{ formatDate(review.updatedAt || review.createdAt) }} · {{ formatLabel(review.status) }}</small>
            </div>
          </div>

          <div class="profile-review__side">
            <button type="button" @click="$emit('start-edit', review)">Edit</button>
            <button type="button" @click="$emit('delete-review', review)">Delete</button>
          </div>
        </template>
      </article>
      </div>

      <nav v-if="totalPages > 1" class="profile-list-pagination" aria-label="Review pagination">
        <button type="button" :disabled="currentPage <= 1" @click="setPage(currentPage - 1)">Previous</button>
        <span>Page {{ currentPage }} of {{ totalPages }}</span>
        <button type="button" :disabled="currentPage >= totalPages" @click="setPage(currentPage + 1)">Next</button>
      </nav>
    </template>
  </section>
</template>

<script>
import { orderItemProductLink } from '../../helpers/cart/cartItemHelpers';

export default {
  name: 'ReviewList',
  props: {
    reviews: {
      type: Array,
      default: () => []
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    editingReviewId: {
      type: String,
      default: ''
    },
    reviewDraft: {
      type: Object,
      default: () => ({
        rating: 5,
        comment: ''
      })
    },
    isSaving: {
      type: Boolean,
      default: false
    },
    reviewVariantLabel: {
      type: Function,
      required: true
    },
    formatDate: {
      type: Function,
      required: true
    },
    formatLabel: {
      type: Function,
      required: true
    }
  },
  data() {
    return {
      currentPage: 1,
      itemsPerPage: 6
    };
  },
  computed: {
    totalPages() {
      return Math.max(1, Math.ceil(this.reviews.length / this.itemsPerPage));
    },
    paginatedReviews() {
      const safePage = Math.min(Math.max(1, this.currentPage), this.totalPages);
      const start = (safePage - 1) * this.itemsPerPage;
      return this.reviews.slice(start, start + this.itemsPerPage);
    }
  },
  watch: {
    reviews() {
      this.currentPage = 1;
    },
    totalPages(nextValue) {
      if (this.currentPage > nextValue) {
        this.currentPage = nextValue;
      }
    }
  },
  emits: [
    'update-review-draft',
    'save-review',
    'cancel-edit',
    'start-edit',
    'delete-review'
  ],
  methods: {
    productRoute(review) {
      return orderItemProductLink(review);
    },
    setPage(page) {
      this.currentPage = Math.min(Math.max(1, Number(page) || 1), this.totalPages);
      this.$nextTick(() => {
        this.$el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }
};
</script>

<style scoped>
.profile-panel {
  --accent: #201c18;
  display: grid;
  gap: 32px;
}

.profile-panel__top {
  display: grid;
  gap: 8px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(17, 17, 17, 0.10);
}

.profile-panel__top h1 {
  margin: 0;
  font-size: 21px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
  text-transform: none;
}

.profile-panel__top .eyebrow {
  display: none;
}

.profile-empty {
  display: grid;
  gap: 14px;
  justify-items: start;
  padding: 48px 28px;
  border-radius: 10px;
  background: rgba(17, 17, 17, 0.02);
}

.profile-empty h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0;
}

/* ── Review list ───────────────────────────────── */
.profile-reviews {
  display: grid;
  gap: 14px;
}

.profile-list-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding-top: 8px;
}

.profile-list-pagination button {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 16px;
  border: 1px solid rgba(17, 17, 17, 0.14);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
}

.profile-list-pagination button:hover:not(:disabled) {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.profile-list-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.profile-list-pagination span {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.profile-review {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0;
  border: 1px solid rgba(17, 17, 17, 0.08);
  border-radius: 10px;
  background: var(--color-bg-page);
  overflow: hidden;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.profile-review:hover {
  border-color: rgba(17, 17, 17, 0.16);
  box-shadow: 0 4px 16px rgba(17, 17, 17, 0.06);
}

/* ── Main content area ─────────────────────────── */
.profile-review__main {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  align-items: start;
  gap: 16px;
  padding: 20px;
}

/* ── Product image ─────────────────────────────── */
.profile-review__media {
  display: block;
  width: 80px;
  height: 100px;
  overflow: hidden;
  border-radius: 8px;
  background: transparent;
  color: rgba(17, 17, 17, 0.3);
  text-decoration: none;
  flex-shrink: 0;
}

.profile-review__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: transparent;
  transition: opacity 0.2s ease;
}

.profile-review__media:hover img {
  opacity: 0.88;
}

.profile-review__media span {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

/* ── Review body ───────────────────────────────── */
.profile-review__body {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.profile-review__product {
  display: block;
  width: fit-content;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--color-text-primary);
  text-decoration: none;
  line-height: 1.3;
  transition: color 0.15s ease;
}

.profile-review__product:hover {
  color: var(--accent);
}

/* variant label */
.profile-review__body > small:first-of-type {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 400;
  margin-top: -2px;
}

/* ── Stars ─────────────────────────────────────── */
.profile-review__stars {
  display: inline-flex;
  gap: 2px;
  margin: 2px 0;
}

.profile-review .profile-review__stars span {
  color: var(--color-rating-star-muted);
  font-size: 14px;
  line-height: 1;
  transition: color 0.15s ease;
}

.profile-review .profile-review__stars span.is-active {
  color: var(--color-rating-star);
}

/* ── Comment text ──────────────────────────────── */
.profile-review p {
  margin: 2px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--color-text-primary);
}

/* ── Admin reply blockquote ────────────────────── */
.profile-review blockquote {
  display: grid;
  gap: 5px;
  margin: 4px 0 0;
  padding: 10px 14px;
  border-left: 3px solid var(--accent);
  border-radius: 0 10px 10px 0;
  background: rgba(32, 28, 24, 0.05);
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.profile-review blockquote span {
  display: block;
  color: var(--accent);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ── Date + status footer ──────────────────────── */
.profile-review__body > small:last-of-type {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

/* ── Side action buttons ───────────────────────── */
.profile-review__side {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  border-left: 1px solid rgba(17, 17, 17, 0.07);
}

.profile-review__side button {
  flex: 1;
  padding: 0 18px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
  min-width: 64px;
}

.profile-review__side button + button {
  border-top: 1px solid rgba(17, 17, 17, 0.07);
}

.profile-review__side button:hover {
  background: var(--accent);
  color: #ffffff;
}

.profile-review__side button:last-child {
  color: #b91c1c;
}

.profile-review__side button:last-child:hover {
  background: #b91c1c;
  color: #ffffff;
}

/* ── Editor (edit mode) ────────────────────────── */
.profile-review__editor {
  grid-column: 1 / -1;
  display: grid;
  gap: 16px;
  padding: 24px;
  background: rgba(32, 28, 24, 0.025);
  border-top: 1px solid rgba(17, 17, 17, 0.07);
}

.profile-review__rating {
  display: inline-flex;
  gap: 4px;
}

.profile-review__rating button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-rating-star-muted);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition: color 120ms ease, transform 120ms ease;
}

.profile-review__rating button.is-active,
.profile-review__rating button:hover {
  color: var(--color-rating-star);
}

.profile-review__rating button:hover {
  transform: scale(1.15);
}

.profile-review__editor label {
  display: grid;
  gap: 8px;
}

.profile-review__editor label span {
  color: var(--color-text-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.profile-review__editor textarea {
  width: 100%;
  resize: vertical;
  padding: 10px 12px;
  border: 1px solid rgba(17, 17, 17, 0.14);
  border-radius: 8px;
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.55;
  transition: border-color 150ms ease;
  box-sizing: border-box;
}

.profile-review__editor textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(32, 28, 24, 0.08);
}

.profile-review__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.profile-review__actions button {
  min-height: 38px;
  padding: 0 18px;
  border: 1px solid rgba(17, 17, 17, 0.16);
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
}

.profile-review__actions button:first-child {
  border-color: var(--accent);
  background: var(--accent);
  color: #ffffff;
}

.profile-review__actions button:first-child:hover:not(:disabled) {
  background: #3a332b;
  border-color: #3a332b;
}

.profile-review__actions button:last-child:hover:not(:disabled) {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.profile-review__actions button:disabled {
  cursor: wait;
  opacity: 0.5;
}

@media (max-width: 768px) {
  .profile-panel__top h1 {
    font-size: 18px;
  }

  .profile-review {
    grid-template-columns: 1fr;
  }

  .profile-review__side {
    flex-direction: row;
    border-left: none;
    border-top: 1px solid rgba(17, 17, 17, 0.07);
  }

  .profile-review__side button + button {
    border-top: none;
    border-left: 1px solid rgba(17, 17, 17, 0.07);
  }

  .profile-review__side button {
    padding: 12px 0;
  }
}
</style>
