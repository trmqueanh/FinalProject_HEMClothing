<template>
  <section class="profile-panel return-detail">
    <button type="button" class="return-detail__back" @click="$emit('back')">← Return history</button>

    <div v-if="isLoading" class="profile-empty">Loading return...</div>
    <template v-else-if="returnRequest">
      <header class="return-detail__header">
        <div>
          <p class="eyebrow">Return request</p>
          <h1>{{ returnRequest.returnCode }}</h1>
          <span>Order #{{ String(returnRequest.orderId).slice(0, 8).toUpperCase() }}</span>
        </div>
        <span class="return-detail__status">{{ formatLabel(returnRequest.returnStatus) }}</span>
      </header>

      <section class="return-detail__section">
        <h2>Products</h2>
        <article v-for="item in returnRequest.items || []" :key="item.id" class="return-detail__item">
          <router-link :to="productLink(item)" class="return-detail__product-media" :aria-label="`View ${item.productName}`">
            <img v-if="item.productImage" :src="item.productImage" :alt="item.productName" />
          </router-link>
          <div>
            <strong><router-link :to="productLink(item)">{{ item.productName }}</router-link></strong>
            <span>{{ [item.colorName, item.sizeLabel].filter(Boolean).join(' / ') }}</span>
            <span>{{ formatLabel(item.reason) }} · {{ item.requestedQuantity }} requested</span>
          </div>
          <strong>{{ item.acceptedQuantity || item.approvedQuantity || item.requestedQuantity }} unit{{ (item.acceptedQuantity || item.approvedQuantity || item.requestedQuantity) === 1 ? '' : 's' }}</strong>
        </article>
      </section>

      <section class="return-detail__section return-detail__refund-account">
        <div class="return-detail__section-heading">
          <div>
            <p class="eyebrow">Refund information</p>
            <h2>Bank account</h2>
          </div>
          <span class="return-detail__status">{{ hasSavedAccount ? 'Saved' : 'Not provided' }}</span>
        </div>

        <p v-if="!canProvideAccount && refundAccount.status === 'not_provided'" class="return-detail__note">
          Bank account information becomes available after HEM approves this return.
        </p>

        <div v-if="hasSavedAccount" class="return-detail__account-summary">
          <div><span>Bank</span><strong>{{ refundAccount.bankName }}</strong></div>
          <div><span>Account</span><strong>{{ refundAccount.maskedAccountNumber }}</strong></div>
          <div><span>Account holder</span><strong>{{ refundAccount.accountHolder }}</strong></div>
          <button v-if="canProvideAccount" type="button" class="return-detail__edit-account" @click="editingAccount = !editingAccount">
            {{ editingAccount ? 'Cancel change' : 'Change bank account' }}
          </button>
        </div>

        <template v-if="canProvideAccount && (!hasSavedAccount || editingAccount)">
          <p v-if="refundAccount.status === 'rejected'" class="return-detail__error">
            Please submit a different bank account before the refund can be processed.
          </p>

          <form class="return-detail__form" @submit.prevent="submit">
            <label>
              <span>Bank name</span>
              <select v-model="form.bankName" required>
                <option value="" disabled>Select bank</option>
                <option v-for="bank in banks" :key="bank.code" :value="bank.name">{{ bank.name }}</option>
                <option value="Other bank">Other bank</option>
              </select>
            </label>
            <label v-if="form.bankName === 'Other bank'">
              <span>Other bank name</span>
              <input :value="form.customBankName" type="text" maxlength="120" placeholder="BANK NAME" required @input="updateCustomBankName" />
            </label>
            <label>
              <span>Account number</span>
              <input :value="form.accountNumber" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="30" placeholder="Enter account number" required @input="updateAccountNumber" />
            </label>
            <label>
              <span>Account holder</span>
              <input :value="form.accountHolder" type="text" autocomplete="name" maxlength="160" placeholder="NGUYEN VAN A" required @input="updateAccountHolder" />
            </label>
            <label class="return-detail__confirm">
              <input v-model="form.confirmed" type="checkbox" required />
              <span>I confirm that this account is correct and can receive the refund.</span>
            </label>
            <p class="return-detail__security">HEM never asks for your bank password, PIN, or banking OTP.</p>
            <button type="submit" :disabled="isSaving || !isFormReady">
              {{ isSaving ? 'Saving...' : hasSavedAccount ? 'Save new bank account' : 'Save refund account' }}
            </button>
          </form>
        </template>
      </section>

      <section v-if="returnRequest.refunds && returnRequest.refunds.length" class="return-detail__section">
        <h2>Refund progress</h2>
        <div v-for="refund in returnRequest.refunds" :key="refund.id" class="return-detail__refund">
          <span>{{ refund.refundCode }} · {{ formatLabel(refund.status) }}</span>
          <strong>{{ formatCurrency(refund.approvedAmount || refund.requestedAmount) }}</strong>
        </div>
      </section>
    </template>
  </section>
</template>

<script>
import { orderItemProductLink } from '../../helpers/cart/cartItemHelpers';

const normalizeUpperAscii = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toUpperCase();

const BANKS = [
  { code: 'VCB', name: 'VIETCOMBANK' },
  { code: 'CTG', name: 'VIETINBANK' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'VBA', name: 'AGRIBANK' },
  { code: 'TCB', name: 'TECHCOMBANK' },
  { code: 'MB', name: 'MB BANK' },
  { code: 'ACB', name: 'ACB' },
  { code: 'VPB', name: 'VPBANK' },
  { code: 'TPB', name: 'TPBANK' },
  { code: 'STB', name: 'SACOMBANK' },
  { code: 'HDB', name: 'HDBANK' },
  { code: 'VIB', name: 'VIB' },
  { code: 'SHB', name: 'SHB' },
  { code: 'MSB', name: 'MSB' },
  { code: 'OCB', name: 'OCB' }
];

const ACCOUNT_RETURN_STATUSES = new Set(['awaiting_return', 'received', 'inspecting', 'inspection_approved', 'refund_pending']);

export default {
  name: 'ReturnDetail',
  props: {
    returnRequest: { type: Object, default: null },
    isLoading: { type: Boolean, default: false },
    isSaving: { type: Boolean, default: false },
    formatLabel: { type: Function, required: true },
    formatCurrency: { type: Function, required: true }
  },
  emits: ['back', 'save-refund-account'],
  data() {
    return {
      banks: BANKS,
      editingAccount: false,
      form: {
        bankName: '',
        customBankName: '',
        accountNumber: '',
        accountHolder: '',
        confirmed: false
      }
    };
  },
  computed: {
    refundAccount() {
      return this.returnRequest && this.returnRequest.refundAccount
        ? this.returnRequest.refundAccount
        : { status: 'not_provided', bankName: '', maskedAccountNumber: '', accountHolder: '', rejectionReason: '' };
    },
    hasSavedAccount() {
      const status = String(this.refundAccount.status || '').toLowerCase();
      return Boolean(
        !['', 'not_provided', 'rejected'].includes(status) &&
        this.refundAccount.bankName &&
        this.refundAccount.maskedAccountNumber &&
        this.refundAccount.accountHolder
      );
    },
    canProvideAccount() {
      return ACCOUNT_RETURN_STATUSES.has(String(this.returnRequest && this.returnRequest.returnStatus || '').toLowerCase()) &&
        !(this.returnRequest && this.returnRequest.refunds || []).some(refund => ['processing', 'completed'].includes(refund.status));
    },
    resolvedBankName() {
      return this.form.bankName === 'Other bank' ? this.form.customBankName.trim() : this.form.bankName;
    },
    isFormReady() {
      return Boolean(
        this.resolvedBankName &&
        /^\d{6,30}$/.test(this.form.accountNumber) &&
        /^[A-Z\s.'-]{2,160}$/.test(this.form.accountHolder.trim()) &&
        this.form.confirmed
      );
    }
  },
  watch: {
    isSaving(value, previousValue) {
      if (previousValue && !value && this.hasSavedAccount) {
        this.editingAccount = false;
      }
    }
  },
  methods: {
    productLink: orderItemProductLink,
    updateCustomBankName(event) {
      const value = normalizeUpperAscii(event.target.value)
        .replace(/[^A-Z0-9\s&.'-]/g, '')
        .replace(/\s+/g, ' ')
        .slice(0, 120);
      this.form.customBankName = value;
      event.target.value = value;
    },
    updateAccountNumber(event) {
      const value = String(event.target.value || '').replace(/\D/g, '').slice(0, 30);
      this.form.accountNumber = value;
      event.target.value = value;
    },
    updateAccountHolder(event) {
      const value = normalizeUpperAscii(event.target.value)
        .replace(/[^A-Z\s.'-]/g, '')
        .replace(/\s+/g, ' ')
        .slice(0, 160);
      this.form.accountHolder = value;
      event.target.value = value;
    },
    submit() {
      if (!this.isFormReady || this.isSaving) return;
      const selectedBank = this.banks.find(bank => bank.name === this.form.bankName);
      this.$emit('save-refund-account', {
        bankCode: selectedBank ? selectedBank.code : '',
        bankName: this.resolvedBankName,
        accountNumber: this.form.accountNumber,
        accountHolder: normalizeUpperAscii(this.form.accountHolder).trim()
      });
    }
  }
};
</script>

<style scoped>
.return-detail { display: grid; gap: 18px; }
.return-detail__back { justify-self: start; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; font-weight: 700; cursor: pointer; }
.return-detail__header, .return-detail__section-heading, .return-detail__item, .return-detail__refund { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.return-detail__header h1, .return-detail__header p, .return-detail__section h2, .return-detail__section-heading p { margin: 0; }
.return-detail__header > div, .return-detail__section-heading > div { display: grid; gap: 5px; }
.return-detail__status { padding: 6px 10px; border-radius: 999px; background: #f2efe9; font-size: 11px; font-weight: 700; white-space: nowrap; }
.return-detail__section { display: grid; gap: 14px; padding: 20px; border: 1px solid rgba(17,17,17,.1); border-radius: 12px; }
.return-detail__item { align-items: center; padding-block: 10px; border-bottom: 1px solid rgba(17,17,17,.08); }
.return-detail__item:last-child { border-bottom: 0; }
.return-detail__item img { width: 58px; height: 72px; object-fit: cover; border-radius: 8px; }
.return-detail__product-media { display: block; flex: 0 0 auto; }
.return-detail__item a { color: inherit; text-decoration: none; }
.return-detail__item strong a:hover { text-decoration: underline; text-underline-offset: 3px; }
.return-detail__item > div { display: grid; flex: 1; gap: 4px; }
.return-detail__item span, .return-detail__note, .return-detail__security { color: var(--color-text-secondary); }
.return-detail__account-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.return-detail__account-summary div { display: grid; gap: 5px; }
.return-detail__account-summary p { grid-column: 1 / -1; margin: 4px 0 0; }
.return-detail__edit-account { grid-column: 1 / -1; justify-self: start; padding: 8px 14px; border: 1px solid rgba(17,17,17,.2); border-radius: 999px; background: #fff; font: inherit; font-weight: 700; cursor: pointer; }
.return-detail__form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.return-detail__form label:not(.return-detail__confirm) { display: grid; gap: 6px; }
.return-detail__form label > span { font-size: 12px; font-weight: 700; }
.return-detail__form input:not([type='checkbox']), .return-detail__form select { width: 100%; min-height: 44px; padding: 0 12px; border: 1px solid rgba(17,17,17,.18); border-radius: 8px; background: #fff; font: inherit; }
.return-detail__confirm, .return-detail__security, .return-detail__form button { grid-column: 1 / -1; }
.return-detail__confirm { display: flex; align-items: flex-start; gap: 9px; }
.return-detail__security { margin: 0; font-size: 12px; }
.return-detail__form button { min-height: 44px; border: 1px solid #111; border-radius: 999px; background: #111; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
.return-detail__form button:disabled { cursor: not-allowed; opacity: .5; }
.return-detail__error { margin: 0; color: #b91c1c; }
@media (max-width: 680px) {
  .return-detail__header, .return-detail__section-heading, .return-detail__item, .return-detail__refund { align-items: stretch; flex-direction: column; }
  .return-detail__account-summary, .return-detail__form { grid-template-columns: 1fr; }
  .return-detail__confirm, .return-detail__security, .return-detail__form button, .return-detail__account-summary p { grid-column: auto; }
}
</style>
