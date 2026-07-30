<template>
  <div class="page-section collections-page">
    <PageBreadcrumbs :items="breadcrumbItems" />

    <section class="collections-header">
      <h1>Collections</h1>
      <p>{{ visibleCollections.length }} {{ visibleCollections.length === 1 ? 'collection' : 'collections' }}</p>
    </section>

    <section v-if="visibleCollections.length" class="collections-grid" aria-label="Collections">
      <router-link
        v-for="collection in visibleCollections"
        :key="collection.id || collection.slug || collection.name"
        :to="collectionRoute(collection)"
        class="collection-card"
      >
        <span class="collection-card__image-wrap">
          <img
            v-if="collectionImage(collection)"
            :src="collectionImage(collection)"
            :alt="collection.label || collection.name"
            class="collection-card__image"
            loading="lazy"
          />
          <span v-else class="collection-card__fallback">HEM</span>
        </span>

        <span class="collection-card__copy">
          <strong>{{ collection.label || collection.name }}</strong>
          <small>{{ collection.productCount || 0 }} items</small>
        </span>
      </router-link>
    </section>

    <section v-else class="collections-empty">
      <h2>No collections available yet.</h2>
    </section>
  </div>
</template>

<script>
import PageBreadcrumbs from '../../components/common/PageBreadcrumbs.vue';
import { catalogStore } from '../../stores/catalogStore';

export default {
  name: 'CollectionsPage',
  components: {
    PageBreadcrumbs
  },
  data() {
    return {
      collections: []
    };
  },
  computed: {
    activeDepartment() {
      return String(this.$route.query.department || '').toLowerCase() === 'men' ? 'men' : 'women';
    },
    visibleCollections() {
      return this.collections.filter(collection =>
        !Array.isArray(collection.availableDepartments) ||
        !collection.availableDepartments.length ||
        collection.availableDepartments.includes(this.activeDepartment)
      );
    },
    breadcrumbItems() {
      return [
        {
          label: 'HEM.COM',
          route: { path: `/${this.activeDepartment}` }
        },
        {
          label: 'Collections',
          current: true
        }
      ];
    }
  },
  async mounted() {
    const collections = await catalogStore.getCollections();
    this.collections = Array.isArray(collections) ? collections : [];
  },
  methods: {
    collectionImage(collection) {
      const departmentBanner = (Array.isArray(collection && collection.departments) ? collection.departments : [])
        .find(department => department.departmentName === this.activeDepartment && department.status === 'active');

      return String(
        departmentBanner && departmentBanner.bannerImage ||
        collection && (collection.imageUrl || collection.bannerImage || '') ||
        ''
      ).trim();
    },
    collectionRoute(collection) {
      const slug = String(collection && (collection.slug || collection.name) || '').trim();
      return {
        path: `/collections/${encodeURIComponent(slug)}`,
        query: { department: this.activeDepartment }
      };
    }
  }
};
</script>

<style scoped>
.collections-page {
  --color-ink: #0a0a0a;
  --color-ink-60: rgba(10,10,10,0.60);
  --color-ink-12: rgba(10,10,10,0.12);
  --color-paper: #ffffff;
  display: grid;
  gap: clamp(24px, 4vw, 48px);
  background: var(--color-paper);
}

.collections-header {
  padding: clamp(32px, 5vw, 64px) clamp(20px, 5vw, 72px) 0;
}

.collections-header h1 {
  margin: 0;
  font-size: clamp(32px, 5vw, 64px);
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: -0.03em;
}

.collections-header p {
  margin: 10px 0 0;
  color: var(--color-ink-60);
}

.collections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
  padding: 0 clamp(20px, 5vw, 72px) clamp(48px, 7vw, 96px);
}

.collection-card {
  display: grid;
  gap: 12px;
  color: inherit;
  text-decoration: none;
}

.collection-card__image-wrap {
  display: block;
  overflow: visible;
  border-radius: 16px;
  background: transparent;
}

.collection-card__image {
  width: 100%;
  height: auto;
  display: block;
  transition: opacity 180ms ease;
}

.collection-card:hover .collection-card__image {
  opacity: 0.94;
}

.collection-card__fallback {
  display: grid;
  place-items: center;
  min-height: 220px;
  color: rgba(10,10,10,0.22);
  font-weight: 800;
  letter-spacing: 0.2em;
}

.collection-card__copy {
  display: grid;
  gap: 4px;
}

.collection-card__copy strong {
  font-size: 1rem;
}

.collection-card__copy small {
  color: var(--color-ink-60);
}

.collections-empty {
  padding: 0 clamp(20px, 5vw, 72px) clamp(48px, 7vw, 96px);
}
</style>
