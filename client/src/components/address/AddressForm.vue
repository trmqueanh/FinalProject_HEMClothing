<template>
  <form class="profile-panel profile-form profile-form-page" @submit.prevent="submitForm">
    <div class="profile-panel__top">
      <button type="button" class="profile-form__back" aria-label="Back to account settings" @click="$emit('cancel')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        <span>Back</span>
      </button>
      <div>
        <p class="eyebrow">Settings</p>
        <h1>{{ isEditingAddress ? 'Edit address' : 'Add address' }}</h1>
      </div>
    </div>

    <div class="profile-form__grid">
      <label>
      <span>Address label <abbr title="required">*</abbr></span>
      <select
        :value="addressForm.addressLabel"
        required
        @change="updateField('addressLabel', $event.target.value)"
      >
        <option value="">Select address label</option>
        <option value="Home">Home</option>
        <option value="Office">Office</option>
        <option value="Dorm">Dorm</option>
      </select>
    </label>
      <label>
        <span>Country</span>
        <input :value="addressForm.country" type="text" @input="updateField('country', $event.target.value.trim())" />
      </label>
      <label>
        <span>Receiver name <abbr title="required">*</abbr></span>
        <input :value="addressForm.receiverName" type="text" required @input="updateField('receiverName', $event.target.value.trim())" />
      </label>
      <label :class="{ 'profile-field--invalid': phoneTouched && phoneError }">
        <span>Receiver phone <abbr title="required">*</abbr></span>
        <div class="profile-phone-field__control">
          <select :value="phoneCountryCode" aria-label="Phone country code" required @change="$emit('update-phone-country-code', $event.target.value)">
            <option v-for="phoneCode in phoneCodes" :key="phoneCode.value" :value="phoneCode.value">
              {{ phoneCode.label }}
            </option>
          </select>
          <input
            :value="phoneLocalNumber"
            type="tel"
            inputmode="numeric"
            autocomplete="tel-national"
            maxlength="10"
            placeholder="912345678"
            required
            @blur="phoneTouched = true"
            @input="updatePhoneNumber"
          />
        </div>
        <small v-if="phoneTouched && phoneError" class="profile-field-error">{{ phoneError }}</small>
      </label>
      <label>
        <span>City / Province <abbr title="required">*</abbr></span>
        <select :value="addressForm.city" required @change="updateField('city', $event.target.value)">
          <option value="">{{ isLoadingLocations ? 'Loading cities...' : 'Select city / province' }}</option>
          <option v-for="city in cityOptions" :key="city.name" :value="city.name">
            {{ city.name }}
          </option>
        </select>
      </label>
      <label>
        <span>District <abbr title="required">*</abbr></span>
        <select :value="addressForm.district" :disabled="!addressForm.city" required @change="updateField('district', $event.target.value)">
          <option value="">Select district</option>
          <option v-for="district in districtOptions" :key="district.name" :value="district.name">
            {{ district.name }}
          </option>
        </select>
      </label>
      <label>
        <span>Ward <abbr title="required">*</abbr></span>
        <select :value="addressForm.ward" :disabled="!addressForm.district" required @change="updateField('ward', $event.target.value)">
          <option value="">Select ward</option>
          <option v-for="ward in wardOptions" :key="ward" :value="ward">
            {{ ward }}
          </option>
        </select>
      </label>
      <label class="profile-form__span">
        <span>Address line <abbr title="required">*</abbr></span>
        <input :value="addressForm.addressLine" type="text" required @input="updateField('addressLine', $event.target.value.trim())" />
      </label>
      <label class="profile-form__check profile-form__span">
        <input :checked="addressForm.isDefault" type="checkbox" @change="updateField('isDefault', $event.target.checked)" />
        <span>Use as default shipping address</span>
      </label>
    </div>

    <div class="profile-form__actions">
      <button type="submit" class="profile-form__submit" :disabled="isSaving">
        {{ submitLabel }}
      </button>
      <button type="button" class="profile-form__ghost" @click="$emit('cancel')">Cancel</button>
    </div>
  </form>
</template>

<script>
import {
  isValidVietnamPhoneParts,
  sanitizeVietnamPhoneLocal
} from '../../utils/vietnamLocations';

export default {
  name: 'AddressForm',
  props: {
    addressForm: {
      type: Object,
      required: true
    },
    editingAddressId: {
      type: String,
      default: ''
    },
    mode: {
      type: String,
      default: ''
    },
    phoneCountryCode: {
      type: String,
      default: '+84'
    },
    phoneLocalNumber: {
      type: String,
      default: ''
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
    isSaving: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'save',
    'cancel',
    'update-address-form',
    'update-phone-country-code',
    'update-phone-local-number'
  ],
  data() {
    return {
      phoneTouched: false
    };
  },
  computed: {
    isEditingAddress() {
      return this.mode === 'edit' || Boolean(this.editingAddressId || (this.addressForm && (this.addressForm.id || this.addressForm.addressId || this.addressForm.address_id)));
    },
    submitLabel() {
      if (this.isSaving) {
        return this.isEditingAddress ? 'Updating...' : 'Saving...';
      }

      return this.isEditingAddress ? 'Update address' : 'Add address';
    },
    phoneError() {
      return isValidVietnamPhoneParts(this.phoneCountryCode, this.phoneLocalNumber)
        ? ''
        : 'Enter a valid Vietnamese mobile number, for example 0912345678.';
    }
  },
  methods: {
    updateField(field, value) {
      this.$emit('update-address-form', { field, value });
    },
    updatePhoneNumber(event) {
      this.phoneTouched = true;
      this.$emit('update-phone-local-number', sanitizeVietnamPhoneLocal(event && event.target ? event.target.value : ''));
    },
    submitForm() {
      this.phoneTouched = true;
      if (this.phoneError) return;
      this.$emit('save');
    }
  }
};
</script>

<style scoped>
.profile-panel {
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
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0;
  text-transform: none;
}

.profile-panel__top .eyebrow {
  display: none;
}

.profile-form {
  display: grid;
  gap: 24px;
  width: 100%;
  max-width: 680px;
}

.profile-form__back {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid rgba(17, 17, 17, 0.16);
  border-radius: 999px;
  background: transparent;
  color: #111111;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 160ms ease, background 160ms ease, color 160ms ease, border-color 160ms ease;
}

.profile-form__back svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.profile-form__back:hover {
  transform: translateY(-1px);
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.profile-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.profile-form__span {
  grid-column: 1 / -1;
}

.profile-form label {
  position: relative;
  display: grid;
  gap: 8px;
}

.profile-form label span {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}

.profile-form abbr {
  color: #b42318;
  text-decoration: none;
}

.profile-form input,
.profile-form select {
  width: 100%;
  height: 46px;
  padding: 0 14px;
  border: 1px solid rgba(17,17,17,0.18);
  border-radius: 8px;
  background: rgba(255,255,255,0.9);
  color: #111111;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.profile-form input:focus,
.profile-form select:focus {
  border-color: #111111;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(17,17,17,0.08);
}

.profile-field--invalid input,
.profile-field--invalid select {
  border-color: #b42318;
  box-shadow: 0 0 0 3px rgba(180, 35, 24, 0.1);
}

.profile-field-error {
  color: #b42318;
  font-size: 12px;
  line-height: 1.4;
}

.profile-phone-field__control {
  display: grid;
  grid-template-columns: minmax(170px, 0.48fr) minmax(0, 1fr);
  gap: 10px;
}

.profile-form__check {
  display: flex !important;
  align-items: center;
  gap: 10px;
}

.profile-form__check input {
  width: 18px;
  height: 18px;
}

.profile-form__submit,
.profile-form__ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: min(300px, 100%);
  min-height: 46px;
  padding: 0 24px;
  border: 1px solid rgba(17, 17, 17, 0.18);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-decoration: none;
  text-transform: none;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  font-family: inherit;
}

.profile-form__submit:hover:not(:disabled),
.profile-form__ghost:hover {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.profile-form__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.profile-form__ghost {
  background: transparent;
  color: var(--color-text-primary);
}

@media (max-width: 768px) {
  .profile-panel__top h1 {
    font-size: 18px;
  }

  .profile-form__grid {
    grid-template-columns: 1fr;
  }

  .profile-phone-field__control {
    grid-template-columns: 1fr;
  }

  .profile-form__span {
    grid-column: auto;
  }
}
</style>
