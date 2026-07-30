<template>
  <!-- AdminInventorySection: section UI được tách khỏi AdminDashboard.vue, logic dùng adminSectionProxy để giữ hành vi cũ. -->
  <section class="admin-panel">
            <div class="admin-panel__top">
              <div>
                <p class="admin-panel__eyebrow">Inventory Management</p>
                <h2>{{ inventoryPagination.totalItems || filteredInventoryItems.length }} variants</h2>
              </div>
            </div>
  
            <div class="admin-toolbar">
              <input v-model="inventorySearch" type="text" placeholder="Search product, product code, color, or size..." />
              <select v-model="inventoryGenderFilter" aria-label="Filter inventory gender">
                <option value="">Gender</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
              </select>
              <select
                v-model="inventoryProductGroupFilter"
                :disabled="!inventoryGenderFilter"
                aria-label="Filter inventory product group"
              >
                <option value="">{{ inventoryGenderFilter ? 'Product group' : 'Choose gender first' }}</option>
                <option v-for="group in inventoryProductGroupOptions" :key="group.id || group.value" :value="group.value">
                  {{ group.label }}
                </option>
              </select>
              <select
                v-model="inventoryCategoryFilter"
                :disabled="!inventoryGenderFilter"
                aria-label="Filter inventory category"
              >
                <option value="">{{ inventoryGenderFilter ? 'Category' : 'Choose gender first' }}</option>
                <option v-for="category in inventoryCategoryOptions" :key="category.id" :value="category.slug">
                  {{ category.label || category.name }}
                </option>
              </select>
              <select v-model="inventoryStockRangeFilter" aria-label="Filter inventory stock range">
                <option value="">Stock Range</option>
                <option value="available">In stock</option>
                <option value="low">Only 1-5 left</option>
                <option value="out">Out of stock</option>
              </select>
            </div>
  
            <div class="dashboard-table">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Group</th>
                    <th>Category</th>
                    <th>Variant</th>
                    <th>Product code</th>
                    <th>Stock</th>
                    <th>Reserved</th>
                    <th>Available</th>
                    <th>Sold</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in filteredInventoryItems" :key="item.id">
                    <td>
                      <div class="admin-stock-product-cell">
                        <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.productName" loading="lazy" />
                        <span v-else>{{ String(item.productName || '').charAt(0) || 'H' }}</span>
                        <strong>{{ item.productName }}</strong>
                      </div>
                    </td>
                    <td>{{ item.productGroupLabel || item.productGroup || '-' }}</td>
                    <td>{{ item.category || '-' }}</td>
                    <td>{{ item.colorName }} / {{ item.sizeLabel }}</td>
                    <td>{{ item.productCode || '-' }}</td>
                    <td>{{ item.stockQuantity }}</td>
                    <td>{{ item.reservedQuantity }}</td>
                    <td>{{ item.availableQuantity }}</td>
                    <td>{{ item.soldQuantity }}</td>
                    <td class="table-actions">
                      <button type="button" class="table-action" @click="openInventoryHistory(item)">View History</button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p v-if="isSectionLoading('inventory')" class="admin-empty">Loading inventory...</p>
              <p v-else-if="!filteredInventoryItems.length" class="admin-empty">No inventory variants matched your search.</p>
            </div>
  
            <nav v-if="inventoryPagination.totalPages > 1" class="admin-pagination" aria-label="Admin inventory pagination">
              <button type="button" :disabled="inventoryPagination.page <= 1" @click="setInventoryPage(inventoryPagination.page - 1)">
                Previous
              </button>
              <span>Page {{ inventoryPagination.page }} of {{ inventoryPagination.totalPages }}</span>
              <button
                type="button"
                :disabled="inventoryPagination.page >= inventoryPagination.totalPages"
                @click="setInventoryPage(inventoryPagination.page + 1)"
              >
                Next
              </button>
            </nav>
          </section>
</template>

<script>
import { createAdminSectionProxy } from '../adminSectionProxy';

export default createAdminSectionProxy('AdminInventorySection');
</script>
<style scoped src="../adminSectionShared.css"></style>
