<template>
  <!-- AdminCategoriesSection: section UI được tách khỏi AdminDashboard.vue, logic dùng adminSectionProxy để giữ hành vi cũ. -->
  <section class="admin-panel">
            <div class="admin-panel__top">
              <div>
                <p class="admin-panel__eyebrow">Category Management</p>
                <h2>{{ categoryPagination.totalItems || filteredCategories.length }} categories</h2>
              </div>

              <router-link to="/studio/categories/new" class="admin-hero__primary" @click="saveAdminListViewState('categories')">Create Category</router-link>
            </div>
  
            <div class="admin-toolbar">
              <input v-model="categorySearch" type="text" placeholder="Search categories..." />
              <select v-model="categoryGenderFilter" aria-label="Filter category gender">
                <option value="">Gender</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
              </select>
              <select
                v-model="categoryProductGroupFilter"
                :disabled="!categoryGenderFilter"
                aria-label="Filter category product group"
              >
                <option value="">{{ categoryGenderFilter ? 'Product group' : 'Choose gender first' }}</option>
                <option v-for="group in categoryProductGroupOptions" :key="group.id || group.value" :value="group.value">
                  {{ group.label }}
                </option>
              </select>
            </div>
  
            <div class="dashboard-table">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Slug</th>
                    <th>Department</th>
                    <th>Group</th>
                    <th>Products</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
  
                <tbody>
                  <tr
                    v-for="category in filteredCategories"
                    :key="category.id"
                    :class="{ 'admin-return-focus': isAdminListFocus('categories', category.id) }"
                    :data-admin-focus-id="category.id"
                  >
                    <td>{{ formatCategoryRowLabel(category) }}</td>
                    <td>{{ category.slug }}</td>
                    <td>{{ category.departmentName || 'No department' }}</td>
                    <td>{{ category.productGroupLabel || category.productGroup || 'No group' }}</td>
                    <td>{{ category.productCount }}</td>
                    <td>
                      <span class="status" :class="category.status === 'active' ? 'status--completed' : 'status--pending'">
                        {{ formatLabel(category.status) }}
                      </span>
                    </td>
                    <td class="table-actions">
                      <button
                        type="button"
                        class="table-icon-btn table-icon-btn--status"
                        :class="{ 'is-active': category.status === 'active' }"
                        :title="category.status === 'active' ? 'Deactivate category' : 'Activate category'"
                        @click="toggleCategoryStatus(category)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v10"/><path d="M6.4 5.6a8 8 0 1011.2 0"/></svg>
                      </button>
                      <router-link
                        :to="{ name: 'studio-category-edit', params: { id: category.id }, query: { returnFocus: category.id } }"
                        class="table-icon-btn table-icon-btn--edit"
                        title="Edit"
                        @click="saveAdminListViewState('categories')"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </router-link>
                      <button type="button" class="table-icon-btn table-icon-btn--danger" title="Archive" @click="archiveCategory(category)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
  
              <p v-if="isSectionLoading('categories')" class="admin-empty">Loading categories...</p>
              <p v-else-if="!filteredCategories.length" class="admin-empty">No categories matched your search.</p>
            </div>
  
            <nav v-if="categoryPagination.totalPages > 1" class="admin-pagination" aria-label="Admin category pagination">
              <button type="button" :disabled="categoryPagination.page <= 1" @click="setCategoryPage(categoryPagination.page - 1)">
                Previous
              </button>
              <span>Page {{ categoryPagination.page }} of {{ categoryPagination.totalPages }}</span>
              <button
                type="button"
                :disabled="categoryPagination.page >= categoryPagination.totalPages"
                @click="setCategoryPage(categoryPagination.page + 1)"
              >
                Next
              </button>
            </nav>
          </section>
</template>

<script>
import { createAdminSectionProxy } from '../adminSectionProxy';

export default createAdminSectionProxy('AdminCategoriesSection');
</script>
<style scoped src="../adminSectionShared.css"></style>
