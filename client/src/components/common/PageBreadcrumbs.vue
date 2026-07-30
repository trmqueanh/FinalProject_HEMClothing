<template>
  <nav v-if="items.length" class="page-breadcrumbs" aria-label="Breadcrumb">
    <ol class="page-breadcrumbs__list">
      <li v-for="(item, index) in items" :key="`${item.label}-${index}`" class="page-breadcrumbs__item">
        <router-link
          v-if="item.route && !item.current"
          :to="item.route"
          class="page-breadcrumbs__link"
        >
          {{ item.label }}
        </router-link>

        <span v-else class="page-breadcrumbs__current" :aria-current="item.current ? 'page' : undefined">
          {{ item.label }}
        </span>

        <span v-if="index < items.length - 1" class="page-breadcrumbs__separator" aria-hidden="true">/</span>
      </li>
    </ol>
  </nav>
</template>

<script>
export default {
  name: 'PageBreadcrumbs',
  props: {
    items: {
      type: Array,
      default: () => []
    }
  }
};
</script>

<style scoped>
.page-breadcrumbs {
  display: block;
  width: 100%;
  padding: 6px 0;
}

.page-breadcrumbs__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.page-breadcrumbs__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 22px;
}

.page-breadcrumbs__link,
.page-breadcrumbs__current {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.page-breadcrumbs__link {
  color: rgba(20, 20, 20, 0.56);
  text-decoration: none;
  border-bottom: 1px solid transparent;
}

.page-breadcrumbs__link:hover {
  color: #111111;
  border-bottom-color: currentColor;
}

.page-breadcrumbs__current {
  color: #111111;
  border-bottom: 1px solid currentColor;
}

.page-breadcrumbs__separator {
  color: rgba(20, 20, 20, 0.24);
  font-size: 12px;
}
</style>
