<template>
  <section class="refund-account-form">
    <div class="refund-account-form__heading">
      <h3>Refund account</h3>
      <div v-if="hasAccount && !editing" class="refund-account-form__summary">
        <strong>{{ account.bankName }}</strong>
        <span>{{ account.maskedAccountNumber || account.accountNumber }}</span>
        <span>{{ account.accountHolder }}</span>
        <button v-if="canEdit" type="button" @click="editing = true">Change account</button>
      </div>
      <span v-else-if="!hasAccount" class="refund-account-form__required">Required</span>
    </div>
    <form v-if="canEdit && (!hasAccount || editing)" @submit.prevent="submit">
      <p v-if="accountStatus === 'rejected'" class="refund-account-form__error">
        Please submit a different bank account before the refund can be processed.
      </p>
      <label><span>Bank</span><select v-model="form.bankName" required><option value="" disabled>Select bank</option><option v-for="bank in banks" :key="bank.code" :value="bank.name">{{ bank.name }}</option><option value="OTHER">Other bank</option></select></label>
      <label v-if="form.bankName === 'OTHER'"><span>Bank name</span><input :value="form.customBankName" maxlength="120" required @input="updateBankName" /></label>
      <label><span>Account number</span><input :value="form.accountNumber" inputmode="numeric" maxlength="30" required @input="updateAccountNumber" /></label>
      <label><span>Account holder</span><input :value="form.accountHolder" maxlength="160" required @input="updateAccountHolder" /></label>
      <label class="refund-account-form__confirm"><input v-model="form.confirmed" type="checkbox" /><span>I confirm this account is correct and can receive the refund.</span></label>
      <p>HEM never asks for your password, PIN, or banking OTP.</p>
      <div class="refund-account-form__actions"><button v-if="hasAccount" type="button" @click="editing = false">Cancel</button><button type="submit" :disabled="isSaving || !isReady">{{ isSaving ? 'Saving...' : 'Save refund account' }}</button></div>
    </form>
    <p v-else-if="!hasAccount">The account is locked because refund processing has started.</p>
  </section>
</template>

<script>
const BANKS = [
  ['VCB', 'VIETCOMBANK'], ['CTG', 'VIETINBANK'], ['BIDV', 'BIDV'], ['VBA', 'AGRIBANK'],
  ['TCB', 'TECHCOMBANK'], ['MB', 'MB BANK'], ['ACB', 'ACB'], ['VPB', 'VPBANK'],
  ['TPB', 'TPBANK'], ['STB', 'SACOMBANK'], ['HDB', 'HDBANK'], ['VIB', 'VIB'],
  ['SHB', 'SHB'], ['MSB', 'MSB'], ['OCB', 'OCB']
].map(([code, name]) => ({ code, name }));
const upperAscii = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase();

export default {
  name: 'RefundAccountForm',
  props: {
    account: { type: Object, default: () => ({}) },
    canEdit: { type: Boolean, default: false },
    isSaving: { type: Boolean, default: false }
  },
  emits: ['submit'],
  data: () => ({ banks: BANKS, editing: false, form: { bankName: '', customBankName: '', accountNumber: '', accountHolder: '', confirmed: false } }),
  computed: {
    accountStatus() { return String(this.account.status || '').toLowerCase(); },
    hasAccount() {
      return Boolean(
        !['', 'not_provided', 'rejected'].includes(this.accountStatus) &&
        this.account.bankName &&
        (this.account.maskedAccountNumber || this.account.accountNumber) &&
        this.account.accountHolder
      );
    },
    resolvedBankName() { return this.form.bankName === 'OTHER' ? this.form.customBankName.trim() : this.form.bankName; },
    isReady() { return Boolean(this.resolvedBankName && /^\d{6,30}$/.test(this.form.accountNumber) && /^[A-Z\s.'-]{2,160}$/.test(this.form.accountHolder) && this.form.confirmed); }
  },
  watch: {
    isSaving(value, previousValue) {
      if (previousValue && !value && this.hasAccount) this.editing = false;
    }
  },
  methods: {
    updateBankName(event) { this.form.customBankName = upperAscii(event.target.value).replace(/[^A-Z0-9\s&.'-]/g, '').slice(0, 120); event.target.value = this.form.customBankName; },
    updateAccountNumber(event) { this.form.accountNumber = String(event.target.value || '').replace(/\D/g, '').slice(0, 30); event.target.value = this.form.accountNumber; },
    updateAccountHolder(event) { this.form.accountHolder = upperAscii(event.target.value).replace(/[^A-Z\s.'-]/g, '').replace(/\s+/g, ' ').slice(0, 160); event.target.value = this.form.accountHolder; },
    submit() {
      if (!this.isReady || this.isSaving) return;
      const bank = this.banks.find(item => item.name === this.form.bankName);
      this.$emit('submit', { bankCode: bank ? bank.code : '', bankName: this.resolvedBankName, accountNumber: this.form.accountNumber, accountHolder: this.form.accountHolder.trim() });
    }
  }
};
</script>

<style scoped>
.refund-account-form { display: grid; gap: 14px; margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(17,17,17,.1); }
.refund-account-form__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.refund-account-form__heading h3, .refund-account-form p { margin: 0; }
.refund-account-form__heading h3 { flex-shrink: 0; font-size: 14px; }
.refund-account-form__required { align-self: start; padding: 5px 9px; border-radius: 999px; background: #f2efe9; font-size: 11px; font-weight: 700; }
.refund-account-form__summary { display: grid; justify-items: end; gap: 5px; min-width: 0; text-align: right; }
.refund-account-form__summary strong, .refund-account-form__summary span { overflow-wrap: anywhere; }
.refund-account-form form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.refund-account-form label { display: grid; gap: 5px; font-size: 12px; font-weight: 700; }
.refund-account-form input:not([type='checkbox']), .refund-account-form select { min-height: 42px; padding: 0 10px; border: 1px solid rgba(17,17,17,.18); border-radius: 8px; background: #fff; }
.refund-account-form__confirm, .refund-account-form form > p, .refund-account-form__actions { grid-column: 1 / -1; }
.refund-account-form__error { color: #9d251d; font-weight: 700; }
.refund-account-form__confirm { display: flex !important; flex-direction: row; align-items: flex-start; }
.refund-account-form button { min-height: 38px; padding: 0 14px; border: 1px solid #111; border-radius: 999px; background: #111; color: #fff; font-weight: 700; }
.refund-account-form__actions { display: flex; justify-content: flex-end; gap: 8px; }
.refund-account-form button:disabled { opacity: .5; }
@media (max-width: 680px) { .refund-account-form form { grid-template-columns: 1fr; } .refund-account-form__confirm, .refund-account-form form > p, .refund-account-form__actions { grid-column: auto; } }
@media (min-width: 1440px) {
  .refund-account-form { gap: 18px; margin-top: 18px; padding-top: 18px; }
  .refund-account-form__heading h3 { font-size: 20px; line-height: 1.25; }
  .refund-account-form__required { padding: 7px 12px; font-size: 14px; }
  .refund-account-form__summary { gap: 7px; font-size: 14px; }
  .refund-account-form form { gap: 16px; }
  .refund-account-form label { gap: 8px; font-size: 14px; }
  .refund-account-form input:not([type='checkbox']), .refund-account-form select {
    min-height: 48px;
    padding: 0 14px;
    font-size: 15px;
  }
  .refund-account-form__confirm { gap: 10px; line-height: 1.5; }
  .refund-account-form__confirm input { width: 18px; height: 18px; margin-top: 1px; }
  .refund-account-form form > p { font-size: 14px; line-height: 1.6; }
  .refund-account-form button { min-height: 44px; padding: 0 18px; font-size: 14px; }
}
@media (min-width: 1920px) {
  .refund-account-form { gap: 22px; margin-top: 22px; padding-top: 22px; }
  .refund-account-form__heading h3 { font-size: 24px; }
  .refund-account-form__required { padding: 8px 14px; font-size: 16px; }
  .refund-account-form__summary { font-size: 16px; }
  .refund-account-form form { gap: 20px; }
  .refund-account-form label { font-size: 16px; }
  .refund-account-form input:not([type='checkbox']), .refund-account-form select {
    min-height: 54px;
    padding: 0 16px;
    font-size: 16px;
  }
  .refund-account-form__confirm input { width: 20px; height: 20px; }
  .refund-account-form form > p { font-size: 16px; }
  .refund-account-form button { min-height: 50px; padding: 0 22px; font-size: 16px; }
}
</style>
