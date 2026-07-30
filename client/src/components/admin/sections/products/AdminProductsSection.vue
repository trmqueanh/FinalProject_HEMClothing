<template>
  <!-- AdminProductsSection: section UI được tách khỏi AdminDashboard.vue, logic dùng adminSectionProxy để giữ hành vi cũ. -->
  <section class="admin-panel">
            <div class="admin-panel__top">
              <div>
                <p class="admin-panel__eyebrow">{{ productPanelEyebrow }}</p>
              </div>
  
              <router-link
                v-if="productPanelMode === 'products'"
                to="/studio/new"
                class="admin-hero__primary"
                @click="saveProductListViewState"
              >
                Create Product
              </router-link>
            </div>
  
            <div class="admin-toolbar">
              <input
                v-if="productPanelMode === 'products'"
                v-model="productSearch"
                type="text"
                placeholder="Search products..."
              />
              <input
                v-else-if="productPanelMode === 'stock'"
                v-model="inventorySearch"
                type="text"
                placeholder="Search product, product code, color, or size..."
              />
              <input
                v-else
                v-model="productReviewSearch"
                type="text"
                placeholder="Search reviews, products, or customers..."
              />
              <select v-if="productPanelMode === 'products'" v-model="productGenderFilter" aria-label="Filter product gender">
                <option value="">Gender</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
              </select>
              <select
                v-if="productPanelMode === 'products'"
                v-model="productGroupFilter"
                :disabled="!productGenderFilter"
                aria-label="Filter product group"
              >
                <option value="">{{ productGenderFilter ? 'Product group' : 'Choose gender first' }}</option>
                <option v-for="group in productGroupOptions" :key="group.id || group.value" :value="group.value">
                  {{ group.label }}
                </option>
              </select>
              <select
                v-if="productPanelMode === 'products'"
                v-model="productCategoryFilter"
                :disabled="!productGenderFilter"
                aria-label="Filter product category"
              >
                <option value="">{{ productGenderFilter ? 'Category' : 'Choose gender first' }}</option>
                <option v-for="category in productCategoryOptions" :key="category.id" :value="category.slug">
                  {{ category.label || category.name }}
                </option>
              </select>
              <select v-if="productPanelMode === 'products'" v-model="productCollectionFilter" aria-label="Filter product collection">
                <option value="">Collection</option>
                <option v-for="collection in collections" :key="collection.id" :value="collection.slug">
                  {{ collection.name }}
                </option>
              </select>
              <select v-if="productPanelMode === 'products'" v-model="productStatusFilter" aria-label="Filter product status">
                <option value="">Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select v-if="productPanelMode === 'stock'" v-model="inventoryGenderFilter" aria-label="Filter stock gender">
                <option value="">Gender</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
              </select>
              <select
                v-if="productPanelMode === 'stock'"
                v-model="inventoryProductGroupFilter"
                :disabled="!inventoryGenderFilter"
                aria-label="Filter stock product group"
              >
                <option value="">{{ inventoryGenderFilter ? 'Product group' : 'Choose gender first' }}</option>
                <option v-for="group in inventoryProductGroupOptions" :key="group.id || group.value" :value="group.value">
                  {{ group.label }}
                </option>
              </select>
              <select
                v-if="productPanelMode === 'stock'"
                v-model="inventoryCategoryFilter"
                :disabled="!inventoryGenderFilter"
                aria-label="Filter stock category"
              >
                <option value="">{{ inventoryGenderFilter ? 'Category' : 'Choose gender first' }}</option>
                <option v-for="category in inventoryCategoryOptions" :key="category.id" :value="category.slug">
                  {{ category.label || category.name }}
                </option>
              </select>
              <select v-if="productPanelMode === 'stock'" v-model="inventoryStockRangeFilter" aria-label="Filter stock range">
                <option value="">Stock Range</option>
                <option value="available">In stock</option>
                <option value="low">Only 1-5 left</option>
                <option value="out">Out of stock</option>
              </select>
              <select v-if="productPanelMode === 'reviews'" v-model="productReviewGenderFilter" aria-label="Filter review gender">
                <option value="">Gender</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
              </select>
              <select
                v-if="productPanelMode === 'reviews'"
                v-model="productReviewProductGroupFilter"
                :disabled="!productReviewGenderFilter"
                aria-label="Filter review product group"
              >
                <option value="">{{ productReviewGenderFilter ? 'Product group' : 'Choose gender first' }}</option>
                <option v-for="group in productReviewProductGroupOptions" :key="group.id || group.value" :value="group.value">
                  {{ group.label }}
                </option>
              </select>
              <select
                v-if="productPanelMode === 'reviews'"
                v-model="productReviewCategoryFilter"
                :disabled="!productReviewGenderFilter"
                aria-label="Filter review category"
              >
                <option value="">{{ productReviewGenderFilter ? 'Category' : 'Choose gender first' }}</option>
                <option v-for="category in productReviewCategoryOptions" :key="category.id" :value="category.slug">
                  {{ category.label || category.name }}
                </option>
              </select>
              <select v-if="productPanelMode === 'reviews'" v-model="productReviewRatingFilter" aria-label="Filter review rating">
                <option value="">Rating</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
              <select v-if="productPanelMode === 'reviews'" v-model="productReviewDateRange" aria-label="Filter review date">
                <option value="">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
  
            <section v-if="productPanelMode === 'stock'" class="admin-stats admin-section-stats">
              <article class="admin-stat-card">
                <p>Total Products</p>
                <strong>{{ inventoryStats.totalProducts }}</strong>
              </article>
              <article class="admin-stat-card">
                <p>In Stock Products</p>
                <strong>{{ inventoryStats.inStockProducts }}</strong>
              </article>
              <article class="admin-stat-card">
                <p>Low Stock Products</p>
                <strong>{{ inventoryStats.lowStockProducts }}</strong>
              </article>
              <article class="admin-stat-card">
                <p>Out of Stock</p>
                <strong>{{ inventoryStats.outOfStockProducts }}</strong>
              </article>
            </section>
  
            <div v-if="productPanelMode === 'products'" class="dashboard-table">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Gender</th>
                    <th>Group</th>
                    <th>Category</th>
                    <th>Collection</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
  
                <tbody>
                  <tr
                    v-for="product in filteredProducts"
                    :key="product.id"
                    :class="{ 'admin-return-focus': isAdminListFocus('products', product.id) }"
                    :data-admin-focus-id="product.id"
                  >
                    <td>
                      <div class="admin-stock-product-cell">
                        <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" loading="lazy" />
                        <span v-else>{{ String(product.name || '').charAt(0) || 'H' }}</span>
                        <strong>{{ product.name }}</strong>
                      </div>
                    </td>
                    <td>{{ formatLabel(product.gender) }}</td>
                    <td>{{ product.productGroupLabel || product.productGroup || '-' }}</td>
                    <td>{{ formatLabel(product.category) }}</td>
                    <td>{{ product.collection }}</td>
                    <td>{{ formatPricing(product) }}</td>
                    <td>
                      <span class="status" :class="product.status === 'active' ? 'status--completed' : 'status--pending'">
                        {{ formatLabel(product.status) }}
                      </span>
                    </td>
                    <td class="table-actions">
                      <button
                        type="button"
                        class="table-icon-btn table-icon-btn--status"
                        :class="{ 'is-active': product.status === 'active' }"
                        :title="product.status === 'active' ? 'Deactivate product' : 'Activate product'"
                        @click="toggleProductStatus(product)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v10"/><path d="M6.4 5.6a8 8 0 1011.2 0"/></svg>
                      </button>
                      <router-link
                        :to="{ name: 'studio-product-detail', params: { productId: product.id }, query: { returnFocus: product.id } }"
                        class="table-icon-btn table-icon-btn--view"
                        title="View product detail"
                        @click="saveProductListViewState"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </router-link>
                      <router-link
                        :to="{ name: 'edit-product', params: { id: product.id }, query: { returnFocus: product.id } }"
                        class="table-icon-btn table-icon-btn--edit"
                        title="Edit"
                        @click="saveProductListViewState"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </router-link>
                      <button type="button" class="table-icon-btn table-icon-btn--danger" title="Delete" @click="removeProduct(product)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
  
              <p v-if="isSectionLoading('products')" class="admin-empty">Loading products...</p>
              <p v-else-if="!filteredProducts.length" class="admin-empty">No products matched your search.</p>
            </div>
  
            <div v-else-if="productPanelMode === 'stock'" class="dashboard-table">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Group</th>
                    <th>Category</th>
                    <th>Variant</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Product code</th>
                    <th>Last Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in filteredInventoryItems" :key="item.id">
                    <td>
                      <div class="admin-stock-product-cell">
                        <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.productName" loading="lazy" />
                        <span v-else>{{ item.productName.charAt(0) || 'H' }}</span>
                        <strong>{{ item.productName }}</strong>
                      </div>
                    </td>
                    <td>{{ item.productGroupLabel || item.productGroup || '-' }}</td>
                    <td>{{ item.category || '-' }}</td>
                    <td>{{ item.colorName }} / {{ item.sizeLabel }}</td>
                    <td>{{ item.availableQuantity }} pcs</td>
                    <td>
                      <span class="stock-status" :class="stockStatusClass(item)">
                        {{ stockStatusLabel(item) }}
                      </span>
                    </td>
                    <td>{{ item.productCode || '-' }}</td>
                    <td>{{ formatDate(item.updatedAt) }}</td>
                    <td class="table-actions">
                      <button type="button" class="table-action" @click="openInventoryImport(item)">Stock</button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p v-if="isSectionLoading('inventory')" class="admin-empty">Loading stock products...</p>
              <p v-else-if="!filteredInventoryItems.length" class="admin-empty">No stock products matched your filters.</p>
            </div>
  
            <div v-else class="dashboard-table admin-product-reviews-table">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Customer</th>
                    <th>Review</th>
                    <th>HEM Reply</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="review in productReviews" :key="review.id">
                    <td data-label="Product">
                      <div class="admin-stock-product-cell">
                        <img v-if="review.productImage" :src="review.productImage" :alt="review.productName" loading="lazy" />
                        <span v-else>{{ review.productName.charAt(0) || 'H' }}</span>
                        <div class="admin-review-product__details">
                          <strong>{{ review.productName }}</strong>
                          <small>
                            {{ review.colorName || 'Default' }}<template v-if="review.sizeLabel && !['one size', 'free size', 'os', 'n/a'].includes(String(review.sizeLabel).trim().toLowerCase())"> / {{ review.sizeLabel }}</template>
                          </small>
                        </div>
                      </div>
                    </td>
                    <td class="admin-review-customer" data-label="Customer">
                      <strong>{{ review.customerName || 'Customer' }}</strong>
                    </td>
                    <td class="admin-review-comment" data-label="Review">
                      <p>{{ review.comment || 'No comment' }}</p>
                      <div class="admin-review-comment__meta">
                        <span class="admin-review-stars">{{ starRating(review.rating) }}</span>
                        <small>{{ formatDate(review.createdAt) }}</small>
                      </div>
                    </td>
                    <td class="admin-review-reply-cell" data-label="HEM Reply">
                      <template v-if="isEditingReviewReply(review)">
                        <textarea
                          class="admin-review-reply-cell__input"
                          :value="reviewReplyDraft(review)"
                          rows="3"
                          maxlength="1000"
                          placeholder="Reply as HEM..."
                          :disabled="isSavingReviewReply(review)"
                          @input="setReviewReplyDraft(review.id, $event.target.value)"
                        ></textarea>
                        <div class="admin-review-reply-cell__actions">
                          <button
                            type="button"
                            class="table-action"
                            :disabled="isSavingReviewReply(review) || !reviewReplyDraft(review).trim()"
                            @click="saveProductReviewReply(review)"
                          >
                            {{ isSavingReviewReply(review) ? 'Saving' : 'Save' }}
                          </button>
                          <button
                            type="button"
                            class="table-action table-action--ghost"
                            :disabled="isSavingReviewReply(review)"
                            @click="cancelProductReviewReplyEdit(review)"
                          >
                            Cancel
                          </button>
                          <button
                            v-if="review.adminReply"
                            type="button"
                            class="table-action table-action--ghost"
                            :disabled="isSavingReviewReply(review)"
                            @click="clearProductReviewReply(review)"
                          >
                            Clear
                          </button>
                        </div>
                      </template>

                      <template v-else>
                        <template v-if="review.adminReply">
                          <p
                            class="admin-review-reply-cell__text"
                            :class="{ 'admin-review-reply-cell__text--expanded': isReviewReplyExpanded(review) }"
                          >
                            {{ review.adminReply }}
                          </p>
                          <button
                            v-if="shouldShowReviewReplyToggle(review)"
                            type="button"
                            class="admin-review-reply-cell__toggle"
                            @click="toggleReviewReplyExpanded(review)"
                          >
                            {{ isReviewReplyExpanded(review) ? 'Show less' : 'Show more' }}
                          </button>
                        </template>
                        <p v-else class="admin-review-reply-cell__empty">No reply yet</p>
                        <div class="admin-review-reply-cell__actions">
                          <button
                            type="button"
                            class="table-action"
                            :disabled="isSavingReviewReply(review)"
                            @click="startProductReviewReplyEdit(review)"
                          >
                            {{ review.adminReply ? 'Edit' : 'Reply' }}
                          </button>
                          <button
                            v-if="review.adminReply"
                            type="button"
                            class="table-action table-action--ghost"
                            :disabled="isSavingReviewReply(review)"
                            @click="clearProductReviewReply(review)"
                          >
                            Clear
                          </button>
                        </div>
                      </template>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p v-if="isSectionLoading('productReviews')" class="admin-empty">Loading product reviews...</p>
              <p v-else-if="!productReviews.length" class="admin-empty">No product reviews matched your filters.</p>
            </div>
  
            <nav v-if="productPanelMode === 'products' && productPagination.totalPages > 1" class="admin-pagination" aria-label="Admin product pagination">
              <button type="button" :disabled="productPagination.page <= 1" @click="setProductPage(productPagination.page - 1)">
                Previous
              </button>
              <span>Page {{ productPagination.page }} of {{ productPagination.totalPages }}</span>
              <button
                type="button"
                :disabled="productPagination.page >= productPagination.totalPages"
                @click="setProductPage(productPagination.page + 1)"
              >
                Next
              </button>
            </nav>
  
            <nav v-if="productPanelMode === 'stock' && inventoryPagination.totalPages > 1" class="admin-pagination" aria-label="Admin stock product pagination">
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
  
            <nav v-if="productPanelMode === 'reviews' && productReviewPagination.totalPages > 1" class="admin-pagination" aria-label="Admin product review pagination">
              <button type="button" :disabled="productReviewPagination.page <= 1" @click="setProductReviewPage(productReviewPagination.page - 1)">
                Previous
              </button>
              <span>Page {{ productReviewPagination.page }} of {{ productReviewPagination.totalPages }}</span>
              <button
                type="button"
                :disabled="productReviewPagination.page >= productReviewPagination.totalPages"
                @click="setProductReviewPage(productReviewPagination.page + 1)"
              >
                Next
              </button>
            </nav>
          </section>
</template>

<script>
import { createAdminSectionProxy } from '../adminSectionProxy';

export default createAdminSectionProxy('AdminProductsSection');
</script>
<style scoped src="../adminSectionShared.css"></style>
