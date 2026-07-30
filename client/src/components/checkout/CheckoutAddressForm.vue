<template>
  <div class="shell-card checkout-form__section">
    <p class="eyebrow">Contact</p>

    <label>
      <span>Email <abbr title="required">*</abbr></span>
      <input :value="customerEmail" type="email" disabled />
    </label>
  </div>

  <div class="shell-card checkout-form__section">
    <p class="eyebrow">Shipping address</p>

    <div class="checkout-form__grid">
      <label v-if="savedAddresses.length" class="checkout-form__grid-span">
        <span>Saved address</span>
        <select :value="form.addressId" @change="selectSavedAddress">
          <option v-for="address in savedAddresses" :key="address.id" :value="address.id">
            {{ address.addressLabel || 'Shipping address' }}
            {{ address.addressLine ? ' - ' + address.addressLine : '' }}
            {{ address.ward ? ', ' + address.ward : '' }}
            {{ address.district ? ', ' + address.district : '' }}
            {{ address.city ? ', ' + address.city : '' }}
            {{ address.isDefault ? ' · Default' : '' }}
          </option>
          <option value="">Other / Use another address</option>
        </select>
      </label>

      <label>
        <span>Address label</span>
        <input :value="form.addressLabel" type="text" placeholder="Home, Office, Dorm..." @input="updateTextField('addressLabel', $event)" />
      </label>

      <label>
        <span>Country</span>
        <input :value="form.country" type="text" @input="updateTextField('country', $event)" />
      </label>

      <label :class="fieldStatusClass('receiverName')">
        <span>Receiver name <abbr title="required">*</abbr></span>
        <input :value="form.receiverName" type="text" required @blur="$emit('touch-field', 'receiverName')" @input="updateValidatedField('receiverName', $event)" />
        <small v-if="fieldError('receiverName')" class="checkout-field-error">{{ fieldError('receiverName') }}</small>
      </label>

      <label class="checkout-phone-field" :class="fieldStatusClass('phoneLocalNumber')">
        <span>Receiver phone <abbr title="required">*</abbr></span>
        <div class="checkout-phone-field__control">
          <select :value="form.phoneCountryCode" aria-label="Phone country code" required @change="updateField('phoneCountryCode', $event.target.value)">
            <option v-for="phoneCode in phoneCodes" :key="phoneCode.value" :value="phoneCode.value">
              {{ phoneCode.label }}
            </option>
          </select>
          <input
            :value="form.phoneLocalNumber"
            type="tel"
            inputmode="numeric"
            autocomplete="tel-national"
            maxlength="10"
            placeholder="912345678"
            required
            @blur="$emit('touch-field', 'phoneLocalNumber')"
            @input="updatePhoneField"
          />
        </div>
        <small v-if="fieldError('phoneLocalNumber')" class="checkout-field-error">{{ fieldError('phoneLocalNumber') }}</small>
      </label>

      <label :class="fieldStatusClass('city')">
        <span>City / Province <abbr title="required">*</abbr></span>
        <select :value="form.city" required @blur="$emit('touch-field', 'city')" @change="updateSelectField('city', $event)">
          <option value="" disabled>{{ isLoadingLocations ? 'Loading cities...' : 'Select city / province' }}</option>
          <option v-for="city in cityOptions" :key="city.name" :value="city.name">
            {{ city.name }}
          </option>
        </select>
        <small v-if="fieldError('city')" class="checkout-field-error">{{ fieldError('city') }}</small>
      </label>

      <label :class="fieldStatusClass('district')">
        <span>District <abbr title="required">*</abbr></span>
        <select :value="form.district" :disabled="!form.city" required @blur="$emit('touch-field', 'district')" @change="updateSelectField('district', $event)">
          <option value="" disabled>Select district</option>
          <option v-for="district in districtOptions" :key="district.name" :value="district.name">
            {{ district.name }}
          </option>
        </select>
        <small v-if="fieldError('district')" class="checkout-field-error">{{ fieldError('district') }}</small>
      </label>

      <label :class="fieldStatusClass('ward')">
        <span>Ward <abbr title="required">*</abbr></span>
        <select :value="form.ward" :disabled="!form.district" required @blur="$emit('touch-field', 'ward')" @change="updateSelectField('ward', $event)">
          <option value="" disabled>Select ward</option>
          <option v-for="ward in wardOptions" :key="ward" :value="ward">
            {{ ward }}
          </option>
        </select>
        <small v-if="fieldError('ward')" class="checkout-field-error">{{ fieldError('ward') }}</small>
      </label>

      <label class="checkout-form__grid-span" :class="fieldStatusClass('addressLine')">
        <span>Address line <abbr title="required">*</abbr></span>
        <input :value="form.addressLine" type="text" required @blur="$emit('touch-field', 'addressLine')" @input="updateValidatedField('addressLine', $event)" />
        <small v-if="fieldError('addressLine')" class="checkout-field-error">{{ fieldError('addressLine') }}</small>
      </label>

      <label class="checkout-form__grid-span">
        <span>Note</span>
        <textarea :value="form.shippingNote" rows="3" placeholder="Optional delivery note" @input="updateTextField('shippingNote', $event)"></textarea>
      </label>

      <label v-if="form.addressId" class="checkout-form__check checkout-form__grid-span">
        <input :checked="Boolean(form.updateSavedAddress)" type="checkbox" @change="updateField('updateSavedAddress', $event.target.checked)" />
        <span>Update this saved address for future orders</span>
      </label>

      <label v-else class="checkout-form__check checkout-form__grid-span">
        <input :checked="Boolean(form.saveAddress)" type="checkbox" @change="updateField('saveAddress', $event.target.checked)" />
        <span>Save this address for future orders</span>
      </label>
    </div>
  </div>
</template>

<script>
import { sanitizeVietnamPhoneLocal } from '../../utils/vietnamLocations';

export default {
  name: 'CheckoutAddressForm',
  props: {
    customerEmail: {
      type: String,
      default: ''
    },
    form: {
      type: Object,
      required: true
    },
    savedAddresses: {
      type: Array,
      default: () => []
    },
    phoneCodes: {
      type: Array,
      default: () => []
    },
    cityOptions: {
      type: Array,
      default: () => []
    },
    districtOptions: {
      type: Array,
      default: () => []
    },
    wardOptions: {
      type: Array,
      default: () => []
    },
    isLoadingLocations: {
      type: Boolean,
      default: false
    },
    touched: {
      type: Object,
      default: () => ({})
    },
    errors: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['update-form', 'select-saved-address', 'touch-field', 'clear-field-error'],
  methods: {
    updateField(field, value) {
      this.$emit('update-form', { field, value });
    },
    updateTextField(field, event) {
      this.updateField(field, event && event.target ? event.target.value : '');
    },
    updateValidatedField(field, event) {
      const value = event && event.target ? event.target.value : '';
      this.updateField(field, value);
      this.$emit('clear-field-error', field);
    },
    updatePhoneField(event) {
      const value = sanitizeVietnamPhoneLocal(event && event.target ? event.target.value : '');
      this.updateField('phoneLocalNumber', value);
      this.$emit('clear-field-error', 'phoneLocalNumber');
    },
    updateSelectField(field, event) {
      this.updateField(field, event && event.target ? event.target.value : '');
      this.$emit('clear-field-error', field);
    },
    selectSavedAddress(event) {
      const addressId = event && event.target ? event.target.value : '';
      this.updateField('addressId', addressId);
      this.$emit('select-saved-address', addressId);
    },
    fieldError(field) {
      return this.touched[field] && this.errors[field] ? this.errors[field] : '';
    },
    fieldStatusClass(field) {
      if (!this.touched[field]) {
        return '';
      }

      return this.errors[field] ? 'checkout-field--invalid' : 'checkout-field--valid';
    }
  }
};
</script>

<style scoped>
.checkout-form__section {
  display: grid;
  gap: 12px;
}

.checkout-form__section > .eyebrow {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.checkout-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.checkout-form__grid label,
.checkout-form__section label {
  display: grid;
  gap: 6px;
  position: relative;
}

.checkout-form__grid label > span,
.checkout-form__section label > span {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}

.checkout-form__section abbr {
  color: #b42318;
  text-decoration: none;
}

.checkout-form__grid-span {
  grid-column: 1 / -1;
}

.checkout-form__section input:not([type='radio']):not([type='checkbox']),
.checkout-form__section select,
.checkout-form__section textarea {
  width: 100%;
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid rgba(17,17,17,0.18);
  border-radius: 8px;
  background: rgba(255,255,255,0.9);
  color: #111111;
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
}

.checkout-form__section textarea {
  min-height: 88px;
  padding-top: 12px;
  resize: vertical;
}

.checkout-form__section input:not([type='radio']):not([type='checkbox']):focus,
.checkout-form__section select:focus,
.checkout-form__section textarea:focus {
  border-color: #111111;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(17,17,17,0.08);
}

.checkout-field--valid input,
.checkout-field--valid select {
  border-color: #16803c;
  box-shadow: 0 0 0 3px rgba(22, 128, 60, 0.1);
}

.checkout-field--invalid input,
.checkout-field--invalid select {
  border-color: #b42318;
  box-shadow: 0 0 0 3px rgba(180, 35, 24, 0.1);
}

.checkout-field--valid::after,
.checkout-field--invalid::after {
  position: absolute;
  right: 14px;
  bottom: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
  pointer-events: none;
}

.checkout-field--valid::after {
  content: '✓';
  background: #16803c;
}

.checkout-field--invalid::after {
  content: '×';
  background: #b42318;
}

.checkout-field-error {
  margin: 0;
  color: #b42318;
  font-size: 12px;
  font-weight: 700;
}

.checkout-phone-field__control {
  display: grid;
  grid-template-columns: minmax(170px, 0.48fr) minmax(0, 1fr);
  gap: 10px;
}

.checkout-form__check {
  display: flex !important;
  align-items: center;
  gap: 10px;
}

.checkout-form__check input {
  width: 18px;
  height: 18px;
}

@media (max-width: 960px) {
  .checkout-form__grid,
  .checkout-phone-field__control {
    grid-template-columns: 1fr;
  }
}
</style>
