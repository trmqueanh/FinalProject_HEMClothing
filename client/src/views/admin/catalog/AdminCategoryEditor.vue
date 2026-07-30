<template>
  <div class="studio-page">
    <div class="studio-page__header">
      <router-link :to="categoryBackTarget" class="studio-back">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Back to categories
      </router-link>
    </div>

    <div class="studio-page__body">
      <section class="admin-entity-editor">
        <header class="admin-entity-editor__heading">
          <h1>{{ isEditing ? 'Edit category' : 'Create category' }}</h1>
          <p>Define the storefront label, URL, department, product group, and visibility.</p>
        </header>

        <form class="admin-editor-form" @submit.prevent="saveCategory">
          <label class="admin-editor-field">
            <span>Category name</span>
            <input v-model.trim="form.name" type="text" placeholder="Example: Dresses" required />
          </label>

          <label class="admin-editor-field">
            <span>Display label</span>
            <input v-model.trim="form.label" type="text" placeholder="Example: Dresses" />
          </label>

          <label class="admin-editor-field">
            <span>Slug</span>
            <input v-model.trim="form.slug" type="text" placeholder="dresses" required />
          </label>

          <label class="admin-editor-field">
            <span>Department</span>
            <select v-model="form.departmentId">
              <option value="">No department</option>
              <option v-for="department in departments" :key="department.id" :value="department.id">
                {{ department.label || department.name }}
              </option>
            </select>
          </label>

          <label class="admin-editor-field">
            <span>Product group</span>
            <select v-model="form.productGroupId">
              <option value="">No product group</option>
              <option v-for="group in productGroups" :key="group.id" :value="group.id">
                {{ group.label || group.name }}
              </option>
            </select>
          </label>

          <label class="admin-editor-field">
            <span>Status</span>
            <select v-model="form.status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <div class="admin-editor-form__actions">
            <router-link :to="categoryBackTarget" class="admin-hero__secondary">Cancel</router-link>
            <button type="submit" class="admin-hero__primary" :disabled="isSaving || isLoading">
              {{ isSaving ? 'Saving...' : isEditing ? 'Save category' : 'Create category' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script>
import { EMPTY_CATEGORY_FORM } from '../../../helpers/admin/adminDashboardConfig';
import { adminApi } from '../../../services/adminApi';
import { catalogStore } from '../../../stores/catalogStore';

export default {
  name: 'AdminCategoryEditor',
  data() {
    return {
      form: EMPTY_CATEGORY_FORM(),
      departments: [],
      productGroups: [],
      isLoading: Boolean(this.$route.params.id),
      isSaving: false
    };
  },
  computed: {
    isEditing() {
      return Boolean(this.$route.params.id);
    },
    categoryBackTarget() {
      const returnFocus = String(this.$route.query.returnFocus || (this.isEditing ? this.$route.params.id : '') || '').trim();
      return {
        name: 'studio-categories',
        query: returnFocus ? { focus: returnFocus } : {}
      };
    }
  },
  async mounted() {
    document.title = `${this.isEditing ? 'Edit' : 'Create'} Category | HEM. Studio`;
    const requests = [catalogStore.getDepartments(), adminApi.getAdminProductGroups()];

    if (this.isEditing) {
      requests.push(adminApi.getAdminCategory(this.$route.params.id));
    }

    const [departments, groupsResponse, categoryResponse] = await Promise.all(requests);
    this.departments = Array.isArray(departments) ? departments : [];
    this.productGroups = groupsResponse && Array.isArray(groupsResponse.items) ? groupsResponse.items : [];

    if (this.isEditing) {
      const category = categoryResponse && categoryResponse.category;
      if (!category) {
        this.$router.replace('/studio/categories');
        return;
      }

      this.form = {
        id: category.id,
        name: category.name,
        label: category.label,
        slug: category.slug,
        departmentId: category.departmentId || '',
        productGroupId: category.productGroupId || '',
        status: category.status || 'active'
      };
    }

    this.isLoading = false;
  },
  methods: {
    async saveCategory() {
      if (this.isSaving || this.isLoading) return;
      this.isSaving = true;

      const payload = {
        name: this.form.name.trim(),
        label: this.form.label.trim() || this.form.name.trim(),
        slug: this.form.slug.trim(),
        departmentId: this.form.departmentId || null,
        productGroupId: this.form.productGroupId || null,
        status: this.form.status
      };
      const response = this.isEditing
        ? await adminApi.updateAdminCategory(this.$route.params.id, payload)
        : await adminApi.createAdminCategory(payload);

      if (!response) {
        this.isSaving = false;
        return;
      }

      catalogStore.invalidate();
      this.flash(this.isEditing ? 'Category updated successfully.' : 'Category created successfully.', 'success');
      this.$router.push(this.categoryBackTarget);
    }
  }
};
</script>

<style scoped src="@/assets/styles/admin/products/AdminCreateProduct.css"></style>
<style scoped src="@/components/admin/sections/adminSectionShared.css"></style>
<style scoped src="@/assets/styles/admin/AdminEntityEditor.css"></style>
