<template>
  <transition name="buy-again-dialog">
    <div v-if="order" class="buy-again-dialog__backdrop" @click.self="$emit('close')">
      <section class="buy-again-dialog" role="dialog" aria-modal="true" aria-labelledby="buy-again-dialog-title">
        <header class="buy-again-dialog__header">
          <div>
            <p class="eyebrow">Buy Again</p>
          </div>
          <button type="button" class="buy-again-dialog__close" :disabled="isSaving" aria-label="Close" @click="$emit('close')">×</button>
        </header>

        <div class="buy-again-dialog__toolbar">
          <label>
            <input
              type="checkbox"
              :checked="allAvailableSelected"
              :disabled="!availableEntries.length || isSaving"
              @change="toggleAll($event.target.checked)"
            />
            Select all available
          </label>
          <span>{{ selectedEntries.length }} selected</span>
        </div>

        <div class="buy-again-dialog__items">
          <article
            v-for="item in entries"
            :key="item.orderItemId"
            class="buy-again-dialog__item"
            :class="{ 'buy-again-dialog__item--unavailable': !item.available }"
          >
            <label class="buy-again-dialog__select">
              <input v-model="item.selected" type="checkbox" :disabled="!item.available || isSaving" />
              <span class="buy-again-dialog__media">
                <img v-if="item.productImage" :src="item.productImage" :alt="item.productName" />
                <ProductVisual v-else :product="item.source" compact />
              </span>
              <span class="buy-again-dialog__info">
                <strong>{{ item.productName }}</strong>
                <span class="buy-again-dialog__variant">
                  <small><b>Color</b>{{ item.colorName || 'Default' }}</small>
                  <small><b>Size</b>{{ item.sizeLabel || 'One Size' }}</small>
                </span>
                <small>{{ formatCurrency(itemPrice(item.source)) }} each</small>
              </span>
            </label>
            <p v-if="!item.available" class="buy-again-dialog__unavailable">{{ unavailableText(item.source) }}</p>
            <p v-if="resultMessage(item.orderItemId)" class="buy-again-dialog__result">{{ resultMessage(item.orderItemId) }}</p>
          </article>
        </div>

        <p v-if="validationMessage" class="buy-again-dialog__error">{{ validationMessage }}</p>

        <footer>
          <button type="button" class="buy-again-dialog__ghost" :disabled="isSaving" @click="$emit('close')">Cancel</button>
          <button
            type="button"
            class="buy-again-dialog__primary"
            :disabled="isSaving || Boolean(validationMessage)"
            :aria-busy="isSaving ? 'true' : 'false'"
            @click="submit"
          >
            {{ isSaving ? 'Adding to bag...' : `Add ${selectedEntries.length} to bag` }}
          </button>
        </footer>
      </section>
    </div>
  </transition>
</template>

<script>
import ProductVisual from '../product/ProductVisual.vue';

export default {
  name: 'BuyAgainDialog',
  components: { ProductVisual },
  props: {
    order: { type: Object, required: true },
    items: { type: Array, default: () => [] },
    isSaving: { type: Boolean, default: false },
    results: { type: Array, default: () => [] },
    formatCurrency: { type: Function, required: true },
    itemPrice: { type: Function, required: true },
    unavailableText: { type: Function, required: true }
  },
  emits: ['close', 'submit'],
  data() {
    return { entries: [] };
  },
  computed: {
    availableEntries() {
      return this.entries.filter(item => item.available);
    },
    selectedEntries() {
      return this.entries.filter(item => item.available && item.selected);
    },
    allAvailableSelected() {
      return Boolean(this.availableEntries.length) && this.availableEntries.every(item => item.selected);
    },
    validationMessage() {
      if (!this.availableEntries.length) return 'No products from this order are currently available.';
      if (!this.selectedEntries.length) return 'Select at least one product.';
      return '';
    }
  },
  created() {
    this.entries = this.items.map(item => {
      const maxQuantity = Math.min(99, Math.max(0, Number(item.availableQuantity || 0)));
      const available = Boolean(item.buyAgainAvailable) && maxQuantity > 0;
      return {
        orderItemId: item.id,
        productName: item.productName,
        productImage: item.productImage,
        colorName: item.colorName,
        sizeLabel: item.sizeLabel,
        maxQuantity,
        quantity: available ? Math.min(Math.max(1, Number(item.quantity || 1)), maxQuantity) : 1,
        selected: available,
        available,
        source: item
      };
    });
  },
  methods: {
    toggleAll(selected) {
      this.availableEntries.forEach(item => {
        item.selected = selected;
      });
    },
    resultMessage(orderItemId) {
      const result = this.results.find(item => String(item.orderItemId) === String(orderItemId));
      return result && Number(result.addedQuantity || 0) <= 0 ? result.message : '';
    },
    submit() {
      if (this.isSaving || this.validationMessage) return;
      this.$emit('submit', {
        items: this.selectedEntries.map(item => ({
          orderItemId: item.orderItemId,
          quantity: item.quantity
        }))
      });
    }
  }
};
</script>

<style scoped>
.buy-again-dialog__backdrop {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(17, 17, 17, 0.42);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.buy-again-dialog {
  width: min(900px, 100%);
  max-height: min(90vh, 860px);
  overflow: auto;
  display: grid;
  gap: 22px;
  padding: 34px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.22);
}

.buy-again-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.buy-again-dialog__header > div { display: grid; gap: 7px; }
.buy-again-dialog__header p, .buy-again-dialog__header h2 { margin: 0; }
.buy-again-dialog__header > div > p:last-child { color: var(--color-text-secondary); }

.buy-again-dialog__close {
  width: 44px;
  height: 44px;
  border: 1px solid rgba(17, 17, 17, 0.12);
  border-radius: 50%;
  background: transparent;
  font: inherit;
  font-size: 26px;
  cursor: pointer;
}

.buy-again-dialog__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 15px 18px;
  border-radius: 10px;
  background: #f7f5f2;
  font-size: 14px;
  font-weight: 700;
}

.buy-again-dialog__toolbar label { display: flex; align-items: center; gap: 11px; cursor: pointer; }
.buy-again-dialog__toolbar input, .buy-again-dialog__select > input { width: 18px; height: 18px; }
.buy-again-dialog__items { display: grid; gap: 10px; }
.buy-again-dialog__item { position: relative; display: grid; gap: 12px; align-items: center; min-height: 142px; padding: 20px; border: 1px solid rgba(17, 17, 17, 0.12); border-radius: 14px; }
.buy-again-dialog__item--unavailable { background: rgba(17, 17, 17, 0.025); }
.buy-again-dialog__select { display: flex; align-items: center; gap: 18px; min-width: 0; cursor: pointer; }
.buy-again-dialog__media { flex: 0 0 88px; width: 88px; height: 110px; overflow: hidden; border-radius: 10px; background: #f4f1ed; }
.buy-again-dialog__media img { width: 100%; height: 100%; object-fit: cover; }
.buy-again-dialog__info { min-width: 0; display: grid; gap: 8px; }
.buy-again-dialog__info strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 19px; }
.buy-again-dialog__info > small { color: var(--color-text-secondary); font-size: 15px; }
.buy-again-dialog__variant { display: flex; flex-wrap: wrap; gap: 8px; }
.buy-again-dialog__variant small { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px; background: #f4f1ed; color: var(--color-text-primary); font-size: 13px; }
.buy-again-dialog__variant b { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; }
.buy-again-dialog__unavailable { margin: 0; color: #a33b2b; font-size: 12px; font-weight: 700; }
.buy-again-dialog__result { grid-column: 1 / -1; margin: 0; padding: 8px 10px; border-radius: 8px; background: #fff0ed; color: #a33b2b; font-size: 12px; }
.buy-again-dialog__error { margin: 0; color: #b91c1c; }
.buy-again-dialog footer { display: flex; justify-content: flex-end; gap: 10px; }
.buy-again-dialog footer button { min-width: 150px; min-height: 52px; padding: 0 26px; border: 1px solid #111; border-radius: 999px; font: inherit; font-size: 15px; font-weight: 800; cursor: pointer; }
.buy-again-dialog__ghost { background: transparent; }
.buy-again-dialog__primary { background: #111; color: #fff; }
.buy-again-dialog button:disabled { cursor: not-allowed; opacity: 0.5; }

@media (max-width: 640px) {
  .buy-again-dialog__backdrop { padding: 12px; }
  .buy-again-dialog { padding: 20px; }
  .buy-again-dialog__item { min-height: 126px; padding: 15px; }
  .buy-again-dialog__select { gap: 12px; }
  .buy-again-dialog__media { flex-basis: 72px; width: 72px; height: 92px; }
  .buy-again-dialog__info strong { font-size: 16px; white-space: normal; }
  .buy-again-dialog__unavailable { padding-left: 30px; }
  .buy-again-dialog footer { display: grid; }
}

@media (min-width: 1440px) {
  .buy-again-dialog {
    width: min(1100px, calc(100vw - 140px));
    max-height: min(90vh, 940px);
    gap: 28px;
    padding: 46px;
  }

  .buy-again-dialog .eyebrow { font-size: 18px; }
  .buy-again-dialog__close { width: 52px; height: 52px; font-size: 30px; }
  .buy-again-dialog__toolbar { padding: 18px 22px; font-size: 17px; }
  .buy-again-dialog__toolbar input,
  .buy-again-dialog__select > input { width: 21px; height: 21px; }
  .buy-again-dialog__items { gap: 16px; }
  .buy-again-dialog__item { min-height: 180px; padding: 26px; }
  .buy-again-dialog__select { gap: 24px; }
  .buy-again-dialog__media { flex-basis: 116px; width: 116px; height: 145px; }
  .buy-again-dialog__info { gap: 11px; }
  .buy-again-dialog__info strong { font-size: 24px; }
  .buy-again-dialog__info > small { font-size: 18px; }
  .buy-again-dialog__variant { gap: 10px; }
  .buy-again-dialog__variant small { gap: 8px; padding: 8px 13px; font-size: 16px; }
  .buy-again-dialog__variant b { font-size: 12px; }
  .buy-again-dialog__unavailable,
  .buy-again-dialog__result,
  .buy-again-dialog__error { font-size: 16px; }
  .buy-again-dialog footer { gap: 14px; }
  .buy-again-dialog footer button { min-width: 180px; min-height: 58px; font-size: 17px; }
}

@media (min-width: 1920px) {
  .buy-again-dialog {
    width: min(1240px, calc(100vw - 180px));
    max-height: min(92vh, 1040px);
    gap: 32px;
    padding: 54px;
  }

  .buy-again-dialog .eyebrow { font-size: 21px; }
  .buy-again-dialog__close { width: 58px; height: 58px; font-size: 34px; }
  .buy-again-dialog__toolbar { padding: 21px 26px; font-size: 19px; }
  .buy-again-dialog__toolbar input,
  .buy-again-dialog__select > input { width: 24px; height: 24px; }
  .buy-again-dialog__item { min-height: 206px; padding: 30px; }
  .buy-again-dialog__select { gap: 28px; }
  .buy-again-dialog__media { flex-basis: 136px; width: 136px; height: 170px; }
  .buy-again-dialog__info strong { font-size: 28px; }
  .buy-again-dialog__info > small { font-size: 20px; }
  .buy-again-dialog__variant small { padding: 9px 15px; font-size: 18px; }
  .buy-again-dialog__variant b { font-size: 13px; }
  .buy-again-dialog footer button { min-width: 210px; min-height: 64px; font-size: 19px; }
}
</style>
