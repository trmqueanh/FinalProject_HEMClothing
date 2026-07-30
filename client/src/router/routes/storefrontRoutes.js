import { productTitle, shopTitle, TITLE_SUFFIX } from '../routeTitles';

const ShopLayout = () => import('../../layouts/shop/ShopLayout.vue');
const Shop = () => import('../../views/shop/Shop.vue');
const Search = () => import('../../views/search/Search.vue');
const Collections = () => import('../../views/collections/Collections.vue');
const ProductDetail = () => import('../../views/product/ProductDetail.vue');
const Cart = () => import('../../views/cart/Cart.vue');
const Checkout = () => import('../../views/checkout/Checkout.vue');
const Wishlist = () => import('../../views/wishlist/FavoritesList.vue');
const Profile = () => import('../../views/profile/Profile.vue');
const ResetPassword = () => import('../../views/auth/ResetPassword.vue');
const VerifyEmail = () => import('../../views/auth/VerifyEmail.vue');
const InformationPage = () => import('../../views/information/InformationPage.vue');
const NotFound = () => import('../../views/system/NotFound.vue');

const SPECIAL_PAGES = [
  { segment: 'new-arrivals', key: 'new-arrivals' },
  { segment: 'bestsellers', key: 'bestsellers' },
  { segment: 'best-sellers', key: 'best-sellers' },
  { segment: 'sale', key: 'sale' }
];

const createDepartmentRoutes = department => {
  const routePrefix = department === 'men' ? 'men' : 'women';

  return [
    {
      path: routePrefix,
      name: routePrefix,
      component: Shop,
      meta: {
        title: shopTitle,
        department: routePrefix,
        pageType: 'landing'
      }
    },
    {
      path: `${routePrefix}/all-products`,
      name: `${routePrefix}-all-products`,
      component: Shop,
      meta: {
        title: shopTitle,
        department: routePrefix,
        pageType: 'all-products'
      }
    },
    ...SPECIAL_PAGES.map(page => ({
      path: `${routePrefix}/${page.segment}`,
      name: `${routePrefix}-${page.segment}`,
      component: Shop,
      meta: {
        title: shopTitle,
        department: routePrefix,
        pageType: 'special',
        pageKey: page.key
      }
    })),
    {
      path: `${routePrefix}/collections/:collectionSlug`,
      name: `${routePrefix}-collection`,
      component: Shop,
      meta: {
        title: shopTitle,
        department: routePrefix,
        pageType: 'collection'
      }
    },
    {
      path: `${routePrefix}/product/:id`,
      name: `${routePrefix}-product-details`,
      component: ProductDetail,
      meta: {
        title: productTitle,
        department: routePrefix,
        pageType: 'product'
      }
    },
    {
      path: `${routePrefix}/:productGroupSlug/:categorySlug`,
      name: `${routePrefix}-product-group-category`,
      component: Shop,
      meta: {
        title: shopTitle,
        department: routePrefix,
        pageType: 'product-group-category'
      }
    },
    {
      path: `${routePrefix}/:categorySlug`,
      name: `${routePrefix}-category`,
      component: Shop,
      meta: {
        title: shopTitle,
        department: routePrefix,
        pageType: 'category'
      }
    }
  ];
};

const customerRoutes = [
  {
    path: 'sale',
    name: 'sale',
    component: Shop,
    meta: {
      title: `Sale | ${TITLE_SUFFIX}`,
      pageType: 'sale',
      pageKey: 'sale',
      globalSale: true
    }
  },
  {
    path: 'collections',
    name: 'collections',
    component: Collections,
    meta: {
      title: `Collections | ${TITLE_SUFFIX}`,
      pageType: 'collections'
    }
  },
  {
    path: 'collections/:collectionSlug',
    name: 'collection',
    component: Shop,
    meta: {
      title: shopTitle,
      pageType: 'collection',
      globalCollection: true
    }
  },
  {
    path: 'search',
    name: 'search',
    component: Search,
    meta: {
      title: route => {
        const query = String((route.query && route.query.q) || '').trim();
        return query ? `Search results for: "${query}" | ${TITLE_SUFFIX}` : `Search | ${TITLE_SUFFIX}`;
      },
      pageType: 'search'
    }
  },
  {
    path: 'products/:id',
    name: 'product-details',
    component: ProductDetail,
    meta: {
      title: productTitle,
      pageType: 'product'
    }
  },
  {
    path: 'cart',
    name: 'cart',
    component: Cart,
    meta: {
      title: `Shopping Bag | ${TITLE_SUFFIX}`,
      requiresUser: true
    }
  },
  {
    path: 'favorites',
    name: 'favorites',
    component: Wishlist,
    meta: {
      title: `Favorites | ${TITLE_SUFFIX}`,
      requiresUser: true
    }
  },
  {
    path: 'checkout',
    name: 'checkout',
    component: Checkout,
    meta: {
      title: `Checkout | ${TITLE_SUFFIX}`,
      requiresUser: true
    }
  },
  {
    path: 'checkout/payment/:orderId',
    name: 'checkout-payment',
    component: Checkout,
    meta: {
      title: `Complete Payment | ${TITLE_SUFFIX}`,
      requiresUser: true
    }
  },
  {
    path: 'orders',
    name: 'orders',
    redirect: '/profile/orders',
    meta: {
      title: `Orders | ${TITLE_SUFFIX}`,
      requiresUser: true
    }
  },
  {
    path: 'profile/orders',
    name: 'profile-orders',
    component: Profile,
    meta: {
      title: `Orders | ${TITLE_SUFFIX}`,
      requiresUser: true
    }
  },
  {
    path: 'profile/orders/:orderId',
    name: 'profile-order-detail',
    component: Profile,
    meta: {
      title: `Order Detail | ${TITLE_SUFFIX}`,
      requiresUser: true
    }
  },
  {
    path: 'profile/returns/:returnRequestId',
    name: 'profile-return-detail',
    component: Profile,
    meta: {
      title: `Return Detail | ${TITLE_SUFFIX}`,
      requiresUser: true
    }
  },
  {
    path: 'profile',
    name: 'profile',
    component: Profile,
    meta: {
      title: `My Account | ${TITLE_SUFFIX}`,
      requiresUser: true
    }
  },
  {
    path: 'reset-password',
    name: 'reset-password',
    component: ResetPassword,
    meta: {
      title: `Reset Password | ${TITLE_SUFFIX}`
    }
  },
  {
    path: 'verify-email',
    name: 'verify-email',
    component: VerifyEmail,
    meta: {
      title: `Verify Email | ${TITLE_SUFFIX}`
    }
  },
  {
    path: 'size-guide',
    name: 'size-guide',
    component: InformationPage,
    meta: {
      title: `Size Guide | ${TITLE_SUFFIX}`,
      informationPage: 'size-guide'
    }
  },
  {
    path: 'shipping-policy',
    name: 'shipping-policy',
    component: InformationPage,
    meta: {
      title: `Shipping Policy | ${TITLE_SUFFIX}`,
      informationPage: 'shipping-policy'
    }
  },
  {
    path: 'refund-policy',
    name: 'refund-policy',
    component: InformationPage,
    meta: {
      title: `Return Policy | ${TITLE_SUFFIX}`,
      informationPage: 'refund-policy'
    }
  },
  {
    path: 'privacy-policy',
    name: 'privacy-policy',
    component: InformationPage,
    meta: {
      title: `Privacy Policy | ${TITLE_SUFFIX}`,
      informationPage: 'privacy-policy'
    }
  },
  {
    path: 'admin/login',
    redirect: {
      path: '/women',
      query: {
        auth: 'email',
        redirect: '/studio'
      }
    },
    meta: {
      title: `Login | ${TITLE_SUFFIX}`
    }
  },
  {
    path: ':pathMatch(.*)*',
    name: 'not-found',
    component: NotFound,
    meta: {
      title: `Page Not Found | ${TITLE_SUFFIX}`
    }
  }
];

export const storefrontRoutes = [
  {
    path: '/',
    component: ShopLayout,
    meta: {
      storefront: true
    },
    children: [
      {
        path: '',
        redirect: '/women',
        meta: {
          title: 'HEM. Atelier | Refined Minimalism'
        }
      },
      {
        path: 'shop',
        redirect: '/women',
        meta: {
          title: `Shop | ${TITLE_SUFFIX}`
        }
      },
      ...createDepartmentRoutes('women'),
      ...createDepartmentRoutes('men'),
      ...customerRoutes
    ]
  }
];
