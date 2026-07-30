<template>
  <div class="studio-page">
    <div class="studio-page__header">
      <router-link :to="collectionBackTarget" class="studio-back">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Back to collections
      </router-link>
    </div>

    <div class="studio-page__body">
      <section class="admin-entity-editor">
        <header class="admin-entity-editor__heading">
          <h1>{{ isEditing ? 'Edit collection' : 'Create collection' }}</h1>
          <p>Configure the collection identity, storefront departments, Cloudinary banners, and visibility.</p>
        </header>

        <form class="admin-editor-form" @submit.prevent="saveCollection">
          <label class="admin-editor-field">
            <span>Collection name</span>
            <input v-model.trim="form.name" type="text" placeholder="Example: Summer 2026" required />
          </label>

          <label class="admin-editor-field">
            <span>Slug</span>
            <input v-model.trim="form.slug" type="text" placeholder="summer-2026" required />
          </label>

          <fieldset
            v-for="gender in genderConfigs"
            :key="gender.key"
            class="collection-department-card admin-entity-editor__full"
          >
            <div class="collection-department-card__heading">
              <div>
                <strong>{{ gender.label }} storefront</strong>
                <small>Recommended banner: 2590 × 607 px (64:15), minimum 1920 px wide.</small>
              </div>
              <label class="collection-department-toggle">
                <input v-model="form.departments[gender.key].enabled" type="checkbox" />
                <span>{{ form.departments[gender.key].enabled ? 'Enabled' : 'Disabled' }}</span>
              </label>
            </div>

            <div v-if="form.departments[gender.key].enabled" class="collection-banner-upload">
              <div class="collection-banner-upload__preview">
                <img
                  v-if="bannerPreview(gender.key)"
                  :src="bannerPreview(gender.key)"
                  :alt="`${gender.label} collection banner preview`"
                />
                <span v-else>No banner selected</span>
              </div>

              <div class="collection-banner-upload__actions">
                <label class="admin-hero__secondary collection-banner-upload__choose">
                  {{ bannerPreview(gender.key) ? 'Replace image' : 'Choose image' }}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    @change="selectBanner(gender.key, $event)"
                  />
                </label>
                <button
                  v-if="bannerPreview(gender.key)"
                  type="button"
                  class="admin-hero__secondary"
                  @click="removeBanner(gender.key)"
                >
                  Remove
                </button>
              </div>
            </div>
          </fieldset>

          <label class="admin-editor-field">
            <span>Status</span>
            <select v-model="form.status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <div class="admin-editor-form__actions">
            <router-link :to="collectionBackTarget" class="admin-hero__secondary">Cancel</router-link>
            <button type="submit" class="admin-hero__primary" :disabled="isSaving || isLoading">
              {{ isSaving ? 'Saving...' : isEditing ? 'Save collection' : 'Create collection' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script>
import { EMPTY_COLLECTION_FORM } from '../../../helpers/admin/adminDashboardConfig';
import { prepareCollectionBannerForSave } from '../../../helpers/cloudinary';
import { adminApi } from '../../../services/adminApi';
import { catalogStore } from '../../../stores/catalogStore';

export default {
  name: 'AdminCollectionEditor',
  data() {
    return {
      form: EMPTY_COLLECTION_FORM(),
      genderConfigs: [
        { key: 'women', label: 'Women' },
        { key: 'men', label: 'Men' }
      ],
      isLoading: Boolean(this.$route.params.id),
      isSaving: false
    };
  },
  computed: {
    isEditing() {
      return Boolean(this.$route.params.id);
    },
    collectionBackTarget() {
      const returnFocus = String(this.$route.query.returnFocus || (this.isEditing ? this.$route.params.id : '') || '').trim();
      return {
        name: 'studio-collections',
        query: returnFocus ? { focus: returnFocus } : {}
      };
    }
  },
  async mounted() {
    document.title = `${this.isEditing ? 'Edit' : 'Create'} Collection | HEM. Studio`;

    const [departments, response] = await Promise.all([
      catalogStore.getDepartments(),
      this.isEditing ? adminApi.getAdminCollection(this.$route.params.id) : Promise.resolve(null)
    ]);
    const departmentItems = Array.isArray(departments) ? departments : [];
    this.genderConfigs.forEach(gender => {
      const department = departmentItems.find(item => String(item.name || '').toLowerCase() === gender.key);
      this.form.departments[gender.key].departmentId = department ? department.id : '';
    });

    if (!this.isEditing) {
      this.isLoading = false;
      return;
    }
    const collection = response && response.collection;

    if (!collection) {
      this.$router.replace('/studio/collections');
      return;
    }

    this.form.id = collection.id;
    this.form.name = collection.name;
    this.form.slug = collection.slug;
    this.form.status = collection.status || 'active';
    this.genderConfigs.forEach(gender => {
      const existing = (Array.isArray(collection.departments) ? collection.departments : [])
        .find(item => String(item.departmentName || '').toLowerCase() === gender.key);
      const config = this.form.departments[gender.key];
      config.enabled = Boolean(existing && existing.status === 'active');
      config.departmentId = existing?.departmentId || config.departmentId;
      config.bannerImage = existing?.bannerImage || '';
      config.bannerPublicId = existing?.bannerPublicId || '';
    });
    this.isLoading = false;
  },
  beforeUnmount() {
    this.genderConfigs.forEach(gender => this.revokePreview(gender.key));
  },
  methods: {
    bannerPreview(gender) {
      const config = this.form.departments[gender];
      return config ? config.previewUrl || config.bannerImage : '';
    },
    revokePreview(gender) {
      const config = this.form.departments[gender];
      if (config?.previewUrl) URL.revokeObjectURL(config.previewUrl);
      if (config) config.previewUrl = '';
    },
    selectBanner(gender, event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      this.revokePreview(gender);
      const config = this.form.departments[gender];
      config.file = file;
      config.previewUrl = URL.createObjectURL(file);
      event.target.value = '';
    },
    removeBanner(gender) {
      this.revokePreview(gender);
      const config = this.form.departments[gender];
      config.file = null;
      config.bannerImage = '';
      config.bannerPublicId = '';
    },
    async saveCollection() {
      if (this.isSaving || this.isLoading) return;
      this.isSaving = true;

      let response;

      try {
        const enabledConfigs = this.genderConfigs.filter(gender => this.form.departments[gender.key].enabled);
        if (!enabledConfigs.length) throw new Error('Enable at least one storefront department.');

        const departments = await Promise.all(enabledConfigs.map(async gender => {
          const config = this.form.departments[gender.key];
          if (!config.departmentId) throw new Error(`${gender.label} department could not be loaded.`);

          let bannerImage = config.bannerImage;
          let bannerPublicId = config.bannerPublicId;
          if (config.file) {
            const uploaded = await prepareCollectionBannerForSave(config.file);
            bannerImage = uploaded.imageUrl;
            bannerPublicId = uploaded.publicId;
          }
          if (!bannerImage) throw new Error(`${gender.label} banner is required.`);

          return {
            departmentId: config.departmentId,
            bannerImage,
            bannerPublicId,
            status: 'active'
          };
        }));

        const payload = {
          name: this.form.name.trim(),
          slug: this.form.slug.trim(),
          departments,
          status: this.form.status
        };
        response = this.isEditing
          ? await adminApi.updateAdminCollection(this.$route.params.id, payload)
          : await adminApi.createAdminCollection(payload);
      } catch (error) {
        this.flash(error?.message || 'Could not save collection banners.', 'error');
        this.isSaving = false;
        return;
      }

      if (!response) {
        this.isSaving = false;
        return;
      }

      catalogStore.invalidate();
      this.flash(this.isEditing ? 'Collection updated successfully.' : 'Collection created successfully.', 'success');
      this.$router.push(this.collectionBackTarget);
    }
  }
};
</script>

<style scoped src="@/assets/styles/admin/products/AdminCreateProduct.css"></style>
<style scoped src="@/components/admin/sections/adminSectionShared.css"></style>
<style scoped src="@/assets/styles/admin/AdminEntityEditor.css"></style>
