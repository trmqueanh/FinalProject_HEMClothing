<template>
  <section class="profile-panel return-history">
    <header><h1>Return history</h1></header>
    <div v-if="isLoading" class="profile-empty">Loading returns...</div>
    <div v-else-if="!returns.length" class="profile-empty"><h3>No returns yet.</h3><p>Item-level return requests and refund progress will appear here.</p></div>
    <article v-for="request in returns" v-else :key="request.id" class="return-history__card">
      <div class="return-history__heading">
        <span><strong>{{ request.returnCode }}</strong> · Order #{{ String(request.orderId).slice(0, 8).toUpperCase() }}</span>
        <span class="return-history__status">{{ formatLabel(request.returnStatus) }}</span>
      </div>
      <p>{{ formatDate(request.requestedAt) }}</p>
      <ul>
        <li v-for="item in request.items" :key="item.id" class="return-history__item">
          <router-link
            :to="productLink(item)"
            class="return-history__media"
            :aria-label="`View ${item.productName}`"
          >
            <img v-if="item.productImage" :src="item.productImage" :alt="`${item.productName} in ${item.colorName || 'selected colour'}`" />
            <span v-else>HEM</span>
          </router-link>
          <div class="return-history__item-copy">
            <router-link :to="productLink(item)" class="return-history__product">{{ item.productName }}</router-link>
            <span>{{ [item.colorName, item.sizeLabel && `Size ${item.sizeLabel}`].filter(Boolean).join(' · ') }}</span>
          </div>
          <strong>{{ item.acceptedQuantity || item.requestedQuantity }} item{{ (item.acceptedQuantity || item.requestedQuantity) === 1 ? '' : 's' }}</strong>
        </li>
      </ul>
      <div v-for="refund in request.refunds" :key="refund.id" class="return-history__refund">
        <span>{{ refund.refundCode }} · {{ formatLabel(refund.status) }}</span>
        <strong>{{ formatCurrency(refund.approvedAmount || refund.requestedAmount) }}</strong>
      </div>
      <p v-if="request.rejectionReason" class="return-history__rejection">{{ request.rejectionReason }}</p>
      <p
        v-if="canProvideRefundAccount(request) && (!request.refundAccount || ['not_provided', 'rejected'].includes(request.refundAccount.status))"
        class="return-history__account-action"
      >Refund account information is required.</p>
      <div class="return-history__links">
        <router-link :to="`/profile/returns/${request.id}`">View return</router-link>
        <router-link :to="`/profile/orders/${request.orderId}`">View order</router-link>
      </div>
    </article>
  </section>
</template>

<script>
import { orderItemProductLink } from '../../helpers/cart/cartItemHelpers';

export default {
  name: 'ReturnHistory',
  props: {
    returns: { type: Array, default: () => [] },
    isLoading: { type: Boolean, default: false },
    formatLabel: { type: Function, required: true },
    formatDate: { type: Function, required: true },
    formatCurrency: { type: Function, required: true }
  },
  methods: {
    productLink: orderItemProductLink,
    canProvideRefundAccount(request) {
      return String(request && request.returnStatus || '').toLowerCase() === 'refund_pending' &&
        (request && request.refunds || []).some(refund =>
          ['pending', 'failed'].includes(String(refund && refund.status || '').toLowerCase())
        );
    }
  }
};
</script>

<style scoped>
.return-history { display: grid; gap: 18px; }
.return-history header h1, .return-history header p, .return-history__card > p { margin: 0; }
.return-history__card { display: grid; gap: 10px; padding: 20px; border: 1px solid rgba(17,17,17,.1); border-radius: 12px; }
.return-history__heading, .return-history__refund { display: flex; justify-content: space-between; gap: 14px; }
.return-history__status { padding: 5px 10px; border-radius: 999px; background: #f2efe9; font-size: 11px; font-weight: 700; }
.return-history ul { display: grid; gap: 0; margin: 0; padding: 12px 0; border-block: 1px solid rgba(17,17,17,.08); list-style: none; }
.return-history__item { display: grid; grid-template-columns: 72px minmax(0, 1fr) auto; align-items: center; gap: 14px; padding: 10px 0; }
.return-history__item + .return-history__item { border-top: 1px solid rgba(17,17,17,.07); }
.return-history__media { display: grid; place-items: center; width: 72px; height: 92px; overflow: hidden; background: #f4f2ee; color: rgba(17,17,17,.45); text-decoration: none; }
.return-history__media img { width: 100%; height: 100%; object-fit: cover; }
.return-history__media span { font-size: 10px; font-weight: 800; letter-spacing: .12em; }
.return-history__item-copy { display: grid; gap: 6px; min-width: 0; }
.return-history__item-copy > span { color: var(--color-text-secondary); font-size: 13px; line-height: 1.45; }
.return-history__product { width: fit-content; color: inherit; font-weight: 700; text-decoration: none; }
.return-history__product:hover { text-decoration: underline; text-underline-offset: 3px; }
.return-history__rejection { color: #b91c1c; }
.return-history__account-action { color: #9a5a00; font-weight: 700; }
.return-history__links { display: flex; gap: 16px; }
.return-history a { color: inherit; font-weight: 700; }
@media (max-width: 560px) {
  .return-history__heading, .return-history__refund { align-items: flex-start; flex-direction: column; }
  .return-history__item { grid-template-columns: 60px minmax(0, 1fr); }
  .return-history__media { width: 60px; height: 78px; }
  .return-history__item > strong { grid-column: 2; }
}
</style>
