<template>
  <!-- AdminCollectionsSection: section UI được tách khỏi AdminDashboard.vue, logic dùng adminSectionProxy để giữ hành vi cũ. -->
  <section class="admin-panel">
            <div class="admin-panel__top">
              <div>
                <p class="admin-panel__eyebrow">Collection Management</p>
                <h2>{{ collectionPagination.totalItems || filteredCollections.length }} collections</h2>
              </div>

              <router-link to="/studio/collections/new" class="admin-hero__primary" @click="saveAdminListViewState('collections')">Create Collection</router-link>
            </div>
  
            <div class="admin-toolbar">
              <input v-model="collectionSearch" type="text" placeholder="Search collections..." />
            </div>
  
            <div class="dashboard-table">
              <table>
                <thead>
                  <tr>
                    <th>Collection</th>
                    <th>Storefronts</th>
                    <th>Products</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
  
                <tbody>
                  <tr
                    v-for="collection in filteredCollections"
                    :key="collection.id"
                    :class="{ 'admin-return-focus': isAdminListFocus('collections', collection.id) }"
                    :data-admin-focus-id="collection.id"
                  >
                    <td>{{ collection.name }}</td>
                    <td>
                      <span
                        v-for="department in collection.departments"
                        :key="department.departmentId"
                        class="status status--completed"
                      >
                        {{ department.departmentLabel || formatLabel(department.departmentName) }}
                      </span>
                      <span v-if="!collection.departments?.length" class="status status--pending">None</span>
                    </td>
                    <td>{{ collection.productCount }}</td>
                    <td>
                      <span class="status" :class="collection.status === 'active' ? 'status--completed' : 'status--pending'">
                        {{ formatLabel(collection.status) }}
                      </span>
                    </td>
                    <td class="table-actions">
                      <button
                        type="button"
                        class="table-icon-btn table-icon-btn--status"
                        :class="{ 'is-active': collection.status === 'active' }"
                        :title="collection.status === 'active' ? 'Deactivate collection' : 'Activate collection'"
                        @click="toggleCollectionStatus(collection)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v10"/><path d="M6.4 5.6a8 8 0 1011.2 0"/></svg>
                      </button>
                      <router-link
                        :to="{ name: 'studio-collection-edit', params: { id: collection.id }, query: { returnFocus: collection.id } }"
                        class="table-icon-btn table-icon-btn--edit"
                        title="Edit"
                        @click="saveAdminListViewState('collections')"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </router-link>
                      <button type="button" class="table-icon-btn table-icon-btn--danger" title="Archive" @click="archiveCollection(collection)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
  
              <p v-if="isSectionLoading('collections')" class="admin-empty">Loading collections...</p>
              <p v-else-if="!filteredCollections.length" class="admin-empty">No collections matched your search.</p>
            </div>
  
            <nav v-if="collectionPagination.totalPages > 1" class="admin-pagination" aria-label="Admin collection pagination">
              <button type="button" :disabled="collectionPagination.page <= 1" @click="setCollectionPage(collectionPagination.page - 1)">
                Previous
              </button>
              <span>Page {{ collectionPagination.page }} of {{ collectionPagination.totalPages }}</span>
              <button
                type="button"
                :disabled="collectionPagination.page >= collectionPagination.totalPages"
                @click="setCollectionPage(collectionPagination.page + 1)"
              >
                Next
              </button>
            </nav>
          </section>
</template>

<script>
import { createAdminSectionProxy } from '../adminSectionProxy';

export default createAdminSectionProxy('AdminCollectionsSection');
</script>
<style scoped src="../adminSectionShared.css"></style>
