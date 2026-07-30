import { ADMIN_TITLE_SUFFIX, adminStudioTitle } from '../routeTitles';

const AdminLayout = () => import('../../layouts/admin/AdminLayout.vue');
const AdminDashboard = () => import('../../views/admin/AdminDashboard.vue');
const AdminCreateProduct = () => import('../../views/admin/products/AdminCreateProduct.vue');
const AdminEditProduct = () => import('../../views/admin/products/AdminEditProduct.vue');
const AdminProductDetail = () => import('../../views/admin/products/AdminProductDetail.vue');
const AdminOrderDetail = () => import('../../views/admin/orders/AdminOrderDetail.vue');
const AdminCustomerDetail = () => import('../../views/admin/customers/AdminCustomerDetail.vue');
const AdminCategoryEditor = () => import('../../views/admin/catalog/AdminCategoryEditor.vue');
const AdminCollectionEditor = () => import('../../views/admin/catalog/AdminCollectionEditor.vue');
const AdminVoucherEditor = () => import('../../views/admin/vouchers/AdminVoucherEditor.vue');

const dashboardRoute = (path, name, title, section, productMode = '') => ({
  path,
  name,
  component: AdminDashboard,
  meta: {
    title: `${title} | ${ADMIN_TITLE_SUFFIX}`,
    adminSection: section,
    ...(productMode ? { adminProductMode: productMode } : {}),
    requiresAdmin: true
  }
});

export const adminRoutes = [
  {
    path: '/admin',
    redirect: '/studio',
    meta: {
      title: `Dashboard | ${ADMIN_TITLE_SUFFIX}`,
      requiresAdmin: true
    }
  },
  {
    path: '/studio',
    component: AdminLayout,
    meta: {
      requiresAdmin: true
    },
    children: [
      {
        path: '',
        name: 'studio',
        component: AdminDashboard,
        meta: {
          title: adminStudioTitle,
          adminTitle: 'Dashboard',
          adminSection: 'dashboard',
          requiresAdmin: true
        }
      },
      dashboardRoute('products', 'studio-products', 'Products', 'products', 'products'),
      dashboardRoute('products/stock', 'studio-products-stock', 'Stock Products', 'products', 'stock'),
      dashboardRoute('products/reviews', 'studio-products-reviews', 'Product Reviews', 'products', 'reviews'),
      {
        path: 'products/:productId',
        name: 'studio-product-detail',
        component: AdminProductDetail,
        meta: {
          title: `Product Detail | ${ADMIN_TITLE_SUFFIX}`,
          adminSection: 'products',
          adminProductMode: 'products',
          preserveScrollOnQuery: true,
          requiresAdmin: true
        }
      },
      dashboardRoute('orders', 'studio-orders', 'Orders', 'orders'),
      {
        path: 'orders/:orderId',
        name: 'studio-order-detail',
        component: AdminOrderDetail,
        meta: {
          title: `Order Detail | ${ADMIN_TITLE_SUFFIX}`,
          adminSection: 'orders',
          requiresAdmin: true
        }
      },
      dashboardRoute('payments', 'studio-payments', 'Payments', 'payments'),
      dashboardRoute('requests', 'studio-requests', 'Requests', 'requests'),
      dashboardRoute('notifications', 'studio-notifications', 'Notifications', 'notifications'),
      dashboardRoute('categories', 'studio-categories', 'Categories', 'categories'),
      dashboardRoute('collections', 'studio-collections', 'Collections', 'collections'),
      dashboardRoute('inventory', 'studio-inventory', 'Inventory', 'inventory'),
      dashboardRoute('vouchers', 'studio-vouchers', 'Vouchers', 'vouchers'),
      dashboardRoute('customers', 'studio-customers', 'Accounts', 'accounts'),
      {
        path: 'customers/:customerId',
        name: 'studio-customer-detail',
        component: AdminCustomerDetail,
        meta: {
          title: `Customer Detail | ${ADMIN_TITLE_SUFFIX}`,
          adminSection: 'accounts',
          preserveScrollOnQuery: true,
          requiresAdmin: true
        }
      },
      {
        path: 'categories/new',
        name: 'studio-category-new',
        component: AdminCategoryEditor,
        meta: {
          title: `Create Category | ${ADMIN_TITLE_SUFFIX}`,
          adminSection: 'categories',
          adminEditor: 'category',
          requiresAdmin: true
        }
      },
      {
        path: 'categories/:id/edit',
        name: 'studio-category-edit',
        component: AdminCategoryEditor,
        meta: {
          title: `Edit Category | ${ADMIN_TITLE_SUFFIX}`,
          adminSection: 'categories',
          adminEditor: 'category',
          requiresAdmin: true
        }
      },
      {
        path: 'collections/new',
        name: 'studio-collection-new',
        component: AdminCollectionEditor,
        meta: {
          title: `Create Collection | ${ADMIN_TITLE_SUFFIX}`,
          adminSection: 'collections',
          adminEditor: 'collection',
          requiresAdmin: true
        }
      },
      {
        path: 'collections/:id/edit',
        name: 'studio-collection-edit',
        component: AdminCollectionEditor,
        meta: {
          title: `Edit Collection | ${ADMIN_TITLE_SUFFIX}`,
          adminSection: 'collections',
          adminEditor: 'collection',
          requiresAdmin: true
        }
      },
      {
        path: 'vouchers/new',
        name: 'studio-voucher-new',
        component: AdminVoucherEditor,
        meta: {
          title: `Create Voucher | ${ADMIN_TITLE_SUFFIX}`,
          adminSection: 'vouchers',
          adminEditor: 'voucher',
          requiresAdmin: true
        }
      },
      {
        path: 'vouchers/:id/edit',
        name: 'studio-voucher-edit',
        component: AdminVoucherEditor,
        meta: {
          title: `Edit Voucher | ${ADMIN_TITLE_SUFFIX}`,
          adminSection: 'vouchers',
          adminEditor: 'voucher',
          requiresAdmin: true
        }
      },
      {
        path: 'accounts',
        redirect: '/studio/customers',
        meta: {
          title: `Accounts | ${ADMIN_TITLE_SUFFIX}`,
          requiresAdmin: true
        }
      },
      {
        path: 'new',
        name: 'new-product',
        component: AdminCreateProduct,
        meta: {
          title: `Create Product | ${ADMIN_TITLE_SUFFIX}`,
          adminSection: 'products',
          adminProductMode: 'products',
          requiresAdmin: true
        }
      },
      {
        path: ':id/edit',
        name: 'edit-product',
        component: AdminEditProduct,
        meta: {
          title: `Edit Product | ${ADMIN_TITLE_SUFFIX}`,
          adminSection: 'products',
          adminProductMode: 'products',
          requiresAdmin: true
        }
      }
    ]
  }
];
