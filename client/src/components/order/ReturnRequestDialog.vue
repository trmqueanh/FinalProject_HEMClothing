<template>
  <transition name="return-dialog">
    <div v-if="order" class="return-dialog__backdrop" @click.self="$emit('close')">
      <section class="return-dialog" role="dialog" aria-modal="true" aria-labelledby="return-dialog-title">
        <header>
          <p class="eyebrow">Returns</p>
          <p>Choose only the variants and quantities you are sending back. A refund is created only after admin inspection accepts them.</p>
        </header>

        <div class="return-dialog__items">
          <article v-for="item in entries" :key="item.orderItemId" class="return-dialog__item">
            <label class="return-dialog__select">
              <input v-model="item.selected" type="checkbox" :disabled="item.maxQuantity <= 0" />
              <img v-if="item.productImage" :src="item.productImage" alt="" />
              <span class="return-dialog__info">
                <strong>{{ item.productName }}</strong>
                <span class="return-dialog__variant">
                  <small><b>Color</b>{{ item.colorName || 'Default' }}</small>
                  <small><b>Size</b>{{ item.sizeLabel || 'One Size' }}</small>
                </span>
                <small>{{ item.maxQuantity }} unit{{ item.maxQuantity === 1 ? '' : 's' }} available to return</small>
              </span>
            </label>
            <div v-if="item.selected" class="return-dialog__fields">
              <label>
                <span>Quantity</span>
                <input v-model.number="item.quantity" type="number" min="1" :max="item.maxQuantity" />
              </label>
              <label>
                <span>Reason</span>
                <select v-model="item.reason">
                  <option v-for="reason in reasons" :key="reason.value" :value="reason.value">{{ reason.label }}</option>
                </select>
              </label>
              <label class="return-dialog__wide">
                <span>Item note</span>
                <textarea v-model.trim="item.note" rows="2" placeholder="Describe the issue or condition."></textarea>
              </label>
              <div class="return-dialog__wide return-dialog__upload">
                <span>Evidence photos (optional, up to 8)</span>
                <div class="return-dialog__upload-control">
                  <label
                    class="return-dialog__upload-button"
                    :class="{ 'is-disabled': isSaving || item.evidenceFiles.length >= 8 }"
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      multiple
                      :disabled="isSaving || item.evidenceFiles.length >= 8"
                      @change="selectEvidence($event, item)"
                    />
                    <span>{{ item.evidenceFiles.length ? 'Add more photos' : 'Choose photos' }}</span>
                  </label>
                  <strong class="return-dialog__upload-status">
                    {{ item.evidenceFiles.length
                      ? `${item.evidenceFiles.length} photo${item.evidenceFiles.length === 1 ? '' : 's'} selected`
                      : 'No photos selected' }}
                  </strong>
                </div>
                <small>JPG, PNG, WebP, or AVIF. Photos are uploaded securely when you submit.</small>
              </div>
              <div v-if="item.evidenceFiles.length" class="return-dialog__evidence return-dialog__wide">
                <figure v-for="(evidence, evidenceIndex) in item.evidenceFiles" :key="evidence.previewUrl">
                  <img :src="evidence.previewUrl" :alt="`Return evidence ${evidenceIndex + 1}`" />
                  <button type="button" :disabled="isSaving" @click="removeEvidence(item, evidenceIndex)">Remove</button>
                </figure>
              </div>
            </div>
          </article>
        </div>

        <p v-if="validationMessage" class="return-dialog__error">{{ validationMessage }}</p>
        <footer>
          <button type="button" class="return-dialog__ghost" :disabled="isSaving" @click="$emit('close')">Cancel</button>
          <button type="button" class="return-dialog__primary" :disabled="isSaving || Boolean(validationMessage)" @click="submit">
            {{ isSaving ? 'Submitting...' : 'Submit return request' }}
          </button>
        </footer>
      </section>
    </div>
  </transition>
</template>

<script>
const REASONS = [
  { value: 'wrong_size', label: 'Wrong size' },
  { value: 'not_as_expected', label: 'Product not as expected' },
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'defective', label: 'Defective item' },
  { value: 'other', label: 'Other' }
];

export default {
  name: 'ReturnRequestDialog',
  props: {
    order: { type: Object, required: true },
    items: { type: Array, default: () => [] },
    isSaving: { type: Boolean, default: false }
  },
  emits: ['close', 'submit'],
  data() {
    return { reasons: REASONS, entries: [] };
  },
  computed: {
    selectedEntries() { return this.entries.filter(item => item.selected); },
    validationMessage() {
      if (!this.selectedEntries.length) return 'Select at least one product.';
      if (this.selectedEntries.some(item => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > item.maxQuantity)) {
        return 'Each selected quantity must be within the available amount.';
      }
      return '';
    }
  },
  created() {
    this.entries = this.items.map(item => ({
      orderItemId: item.id,
      productName: item.productName,
      productImage: item.productImage,
      colorName: item.colorName,
      sizeLabel: item.sizeLabel,
      maxQuantity: Math.max(0, Number(item.returnableQuantity || 0)),
      selected: false,
      quantity: 1,
      reason: REASONS[0].value,
      note: '',
      evidenceFiles: []
    }));
  },
  methods: {
    selectEvidence(event, item) {
      const remaining = Math.max(0, 8 - item.evidenceFiles.length);
      const files = Array.from(event.target.files || []).slice(0, remaining);
      item.evidenceFiles.push(...files.map(file => ({ file, previewUrl: URL.createObjectURL(file) })));
      event.target.value = '';
    },
    removeEvidence(item, index) {
      const [removed] = item.evidenceFiles.splice(index, 1);
      if (removed && removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    },
    submit() {
      if (this.isSaving || this.validationMessage) return;
      this.$emit('submit', {
        items: this.selectedEntries.map(item => ({
          orderItemId: item.orderItemId,
          quantity: item.quantity,
          reason: item.reason,
          note: item.note,
          evidenceFiles: item.evidenceFiles.map(evidence => evidence.file)
        }))
      });
    }
  },
  beforeUnmount() {
    this.entries.forEach(item => item.evidenceFiles.forEach(evidence => URL.revokeObjectURL(evidence.previewUrl)));
  }
};
</script>

<style scoped>
.return-dialog__backdrop { position: fixed; inset: 0; z-index: 12000; display: grid; place-items: center; padding: 24px; background: rgba(17,17,17,.42); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); pointer-events: auto; }
.return-dialog { width: min(900px, 100%); max-height: min(90vh, 860px); overflow: auto; display: grid; gap: 22px; padding: 34px; border-radius: 16px; background: #fff; box-shadow: 0 24px 80px rgba(0,0,0,.22); }
.return-dialog header, .return-dialog header p, .return-dialog h2 { margin: 0; }
.return-dialog header { display: grid; gap: 8px; }
.return-dialog header > p:last-child { color: var(--color-text-secondary); line-height: 1.55; }
.return-dialog__items { display: grid; gap: 12px; }
.return-dialog__item { min-height: 142px; padding: 20px; border: 1px solid rgba(17,17,17,.12); border-radius: 14px; }
.return-dialog__select { display: flex; align-items: center; gap: 18px; cursor: pointer; }
.return-dialog__select > input { width: 18px; height: 18px; }
.return-dialog__select img { flex: 0 0 88px; width: 88px; height: 110px; border-radius: 10px; object-fit: cover; background: #f4f1ed; }
.return-dialog__info { display: grid; gap: 8px; min-width: 0; }
.return-dialog__info strong { overflow: hidden; font-size: 19px; text-overflow: ellipsis; white-space: nowrap; }
.return-dialog__info > small { color: var(--color-text-secondary); font-size: 15px; }
.return-dialog__variant { display: flex; flex-wrap: wrap; gap: 8px; }
.return-dialog__variant small { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px; background: #f4f1ed; color: var(--color-text-primary); font-size: 13px; }
.return-dialog__variant b { font-size: 10px; letter-spacing: .06em; text-transform: uppercase; }
.return-dialog__fields { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(17,17,17,.08); }
.return-dialog__fields label { display: grid; gap: 6px; }
.return-dialog__fields label > span, .return-dialog__upload > span { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.return-dialog__fields input, .return-dialog__fields select, .return-dialog__fields textarea { width: 100%; min-height: 42px; padding: 10px; border: 1px solid rgba(17,17,17,.16); border-radius: 8px; font: inherit; }
.return-dialog__wide { grid-column: 1 / -1; }
.return-dialog__upload { display: grid; gap: 8px; }
.return-dialog__upload-control { display: flex; align-items: center; gap: 12px; }
.return-dialog__upload-button { position: relative; display: inline-flex !important; align-items: center; justify-content: center; width: fit-content; min-height: 42px; padding: 0 16px; border: 1px solid #111; border-radius: 999px; background: #fff; color: #111; font-weight: 800; cursor: pointer; transition: background 160ms ease, color 160ms ease; }
.return-dialog__upload-button:hover:not(.is-disabled) { background: #111; color: #fff; }
.return-dialog__upload-button.is-disabled { cursor: not-allowed; opacity: .5; }
.return-dialog__upload-button input { position: absolute; width: 1px; height: 1px; min-height: 0; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; white-space: nowrap; }
.return-dialog__upload-button > span { font-size: 13px; letter-spacing: 0; text-transform: none; }
.return-dialog__upload-status { color: var(--color-text-secondary); font-size: 13px; font-weight: 600; }
.return-dialog__upload small { color: var(--color-text-secondary); font-weight: 400; text-transform: none; }
.return-dialog__evidence { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.return-dialog__evidence figure { position: relative; margin: 0; overflow: hidden; border-radius: 8px; background: #f4f1ed; }
.return-dialog__evidence img { width: 100%; aspect-ratio: 1; object-fit: cover; }
.return-dialog__evidence button { position: absolute; right: 8px; bottom: 8px; min-width: 76px; min-height: 38px; padding: 0 13px; border: 0; border-radius: 999px; background: rgba(17,17,17,.88); color: #fff; font-size: 12px; font-weight: 800; cursor: pointer; }
.return-dialog__error { margin: 0; color: #b91c1c; }
.return-dialog footer { display: flex; justify-content: flex-end; gap: 10px; }
.return-dialog footer button { min-width: 150px; min-height: 52px; padding: 0 26px; border: 1px solid #111; border-radius: 999px; font: inherit; font-size: 15px; font-weight: 800; cursor: pointer; }
.return-dialog__ghost { background: transparent; }
.return-dialog__primary { background: #111; color: #fff; }
.return-dialog footer button:disabled { cursor: not-allowed; opacity: .5; }
@media (max-width: 640px) { .return-dialog__backdrop { padding: 12px; } .return-dialog { padding: 20px; } .return-dialog__item { min-height: 126px; padding: 15px; } .return-dialog__select { gap: 12px; } .return-dialog__select img { flex-basis: 72px; width: 72px; height: 92px; } .return-dialog__info strong { font-size: 16px; white-space: normal; } .return-dialog__fields { grid-template-columns: 1fr; } .return-dialog__wide { grid-column: auto; } .return-dialog__evidence { grid-template-columns: repeat(2, minmax(0, 1fr)); } .return-dialog footer { display: grid; } }
@media (min-width: 1440px) {
  .return-dialog { width: min(1100px, calc(100vw - 140px)); max-height: min(90vh, 940px); gap: 28px; padding: 46px; }
  .return-dialog .eyebrow { font-size: 18px; }
  .return-dialog header > p:last-child { font-size: 18px; }
  .return-dialog__items { gap: 16px; }
  .return-dialog__item { min-height: 180px; padding: 26px; }
  .return-dialog__select { gap: 24px; }
  .return-dialog__select > input { width: 21px; height: 21px; }
  .return-dialog__select img { flex-basis: 116px; width: 116px; height: 145px; }
  .return-dialog__info { gap: 11px; }
  .return-dialog__info strong { font-size: 24px; }
  .return-dialog__info > small { font-size: 18px; }
  .return-dialog__variant { gap: 10px; }
  .return-dialog__variant small { gap: 8px; padding: 8px 13px; font-size: 16px; }
  .return-dialog__variant b { font-size: 12px; }
  .return-dialog__fields { gap: 16px; margin-top: 20px; padding-top: 20px; }
  .return-dialog__fields label > span, .return-dialog__upload > span { font-size: 15px; }
  .return-dialog__fields input, .return-dialog__fields select, .return-dialog__fields textarea { min-height: 52px; padding: 13px; font-size: 17px; }
  .return-dialog__upload-button { min-height: 52px; padding: 0 22px; }
  .return-dialog__upload-button > span, .return-dialog__upload-status { font-size: 16px; }
  .return-dialog__evidence button { right: 10px; bottom: 10px; min-width: 96px; min-height: 46px; padding: 0 17px; font-size: 15px; }
  .return-dialog__error { font-size: 16px; }
  .return-dialog footer { gap: 14px; }
  .return-dialog footer button { min-width: 180px; min-height: 58px; font-size: 17px; }
}
@media (min-width: 1920px) {
  .return-dialog { width: min(1240px, calc(100vw - 180px)); max-height: min(92vh, 1040px); gap: 32px; padding: 54px; }
  .return-dialog .eyebrow { font-size: 21px; }
  .return-dialog header > p:last-child { font-size: 20px; }
  .return-dialog__item { min-height: 206px; padding: 30px; }
  .return-dialog__select { gap: 28px; }
  .return-dialog__select > input { width: 24px; height: 24px; }
  .return-dialog__select img { flex-basis: 136px; width: 136px; height: 170px; }
  .return-dialog__info strong { font-size: 28px; }
  .return-dialog__info > small { font-size: 20px; }
  .return-dialog__variant small { padding: 9px 15px; font-size: 18px; }
  .return-dialog__variant b { font-size: 13px; }
  .return-dialog__fields label > span, .return-dialog__upload > span { font-size: 17px; }
  .return-dialog__fields input, .return-dialog__fields select, .return-dialog__fields textarea { min-height: 58px; font-size: 19px; }
  .return-dialog__upload-button { min-height: 58px; padding: 0 26px; }
  .return-dialog__upload-button > span, .return-dialog__upload-status { font-size: 18px; }
  .return-dialog__evidence button { min-width: 112px; min-height: 52px; padding: 0 20px; font-size: 17px; }
  .return-dialog__error { font-size: 18px; }
  .return-dialog footer button { min-width: 210px; min-height: 64px; font-size: 19px; }
}
</style>
