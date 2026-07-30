<template>
  <div class="studio-page">
    <div class="studio-page__header">
      <router-link :to="voucherBackTarget" class="studio-back">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Back to vouchers
      </router-link>
    </div>

    <div class="studio-page__body">
      <section class="admin-entity-editor">
        <header class="admin-entity-editor__heading">
          <h1>{{ isEditing ? 'Edit voucher' : 'Create voucher' }}</h1>
          <p>Set the discount rules, validity period, usage limit, and storefront availability.</p>
        </header>

        <form class="admin-editor-form" @submit.prevent="saveVoucher">
          <label class="admin-editor-field">
            <span>Voucher code</span>
            <input v-model.trim="form.code" type="text" placeholder="Example: WELCOME10" required />
          </label>

          <label class="admin-editor-field">
            <span>Discount type</span>
            <select v-model="form.discountType">
              <option value="percent">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </label>

          <label class="admin-editor-field">
            <span>Discount value</span>
            <input
              v-model.number="form.discountValue"
              type="number"
              min="0.01"
              :max="form.discountType === 'percent' ? 100 : undefined"
              :step="form.discountType === 'percent' ? '0.01' : '1000'"
              required
            />
          </label>

          <label class="admin-editor-field">
            <span>Minimum order amount</span>
            <input v-model.number="form.minOrderAmount" type="number" min="0" step="1000" />
          </label>

          <label class="admin-editor-field">
            <span>Maximum discount amount</span>
            <input v-model="form.maxDiscountAmount" type="number" min="1000" step="1000" placeholder="Optional" />
            <small>Leave blank when the discount has no maximum cap.</small>
          </label>

          <label class="admin-editor-field">
            <span>Usage limit</span>
            <input v-model="form.usageLimit" type="number" min="0" step="1" placeholder="Optional" />
            <small>Leave blank for unlimited uses.</small>
          </label>

          <label class="admin-editor-field">
            <span>Start date (Vietnam time)</span>
            <input v-model="form.startDate" type="datetime-local" required />
          </label>

          <label class="admin-editor-field">
            <span>End date (Vietnam time)</span>
            <input v-model="form.endDate" type="datetime-local" required />
          </label>

          <label class="admin-editor-field">
            <span>Status</span>
            <select v-model="form.status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <div class="admin-editor-form__actions">
            <router-link :to="voucherBackTarget" class="admin-hero__secondary">Cancel</router-link>
            <button type="submit" class="admin-hero__primary" :disabled="isSaving || isLoading">
              {{ isSaving ? 'Saving...' : isEditing ? 'Save voucher' : 'Create voucher' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script>
import { EMPTY_VOUCHER_FORM } from '../../../helpers/admin/adminDashboardConfig';
import { toVietnamDateTimeLocal, vietnamDateTimeLocalToIso } from '../../../helpers/dateTime';
import { adminApi } from '../../../services/adminApi';

export default {
  name: 'AdminVoucherEditor',
  data() {
    return {
      form: EMPTY_VOUCHER_FORM(),
      isLoading: Boolean(this.$route.params.id),
      isSaving: false
    };
  },
  computed: {
    isEditing() {
      return Boolean(this.$route.params.id);
    },
    voucherBackTarget() {
      const returnFocus = String(this.$route.query.returnFocus || (this.isEditing ? this.$route.params.id : '') || '').trim();
      return {
        name: 'studio-vouchers',
        query: returnFocus ? { focus: returnFocus } : {}
      };
    }
  },
  async mounted() {
    document.title = `${this.isEditing ? 'Edit' : 'Create'} Voucher | HEM. Studio`;

    if (!this.isEditing) return;
    const response = await adminApi.getAdminVoucher(this.$route.params.id);
    const voucher = response && response.voucher;

    if (!voucher) {
      this.$router.replace('/studio/vouchers');
      return;
    }

    this.form = {
      id: voucher.id,
      code: voucher.code,
      discountType: voucher.discountType || 'percent',
      discountValue: voucher.discountValue || 0,
      minOrderAmount: voucher.minOrderAmount || 0,
      maxDiscountAmount: voucher.maxDiscountAmount === null ? '' : voucher.maxDiscountAmount,
      startDate: toVietnamDateTimeLocal(voucher.startDate),
      endDate: toVietnamDateTimeLocal(voucher.endDate),
      usageLimit: voucher.usageLimit === null ? '' : voucher.usageLimit,
      status: voucher.status || 'active'
    };
    this.isLoading = false;
  },
  methods: {
    async saveVoucher() {
      if (this.isSaving || this.isLoading) return;
      this.isSaving = true;

      const payload = {
        code: this.form.code.trim(),
        discountType: this.form.discountType,
        discountValue: Number(this.form.discountValue) || 0,
        minOrderAmount: Number(this.form.minOrderAmount) || 0,
        maxDiscountAmount: this.form.maxDiscountAmount === '' ? null : Number(this.form.maxDiscountAmount),
        startDate: vietnamDateTimeLocalToIso(this.form.startDate),
        endDate: vietnamDateTimeLocalToIso(this.form.endDate),
        usageLimit: this.form.usageLimit === '' ? null : Number(this.form.usageLimit),
        status: this.form.status
      };
      const response = this.isEditing
        ? await adminApi.updateAdminVoucher(this.$route.params.id, payload)
        : await adminApi.createAdminVoucher(payload);

      if (!response) {
        this.isSaving = false;
        return;
      }

      this.flash(this.isEditing ? 'Voucher updated successfully.' : 'Voucher created successfully.', 'success');
      this.$router.push(this.voucherBackTarget);
    }
  }
};
</script>

<style scoped src="@/assets/styles/admin/products/AdminCreateProduct.css"></style>
<style scoped src="@/components/admin/sections/adminSectionShared.css"></style>
<style scoped src="@/assets/styles/admin/AdminEntityEditor.css"></style>
