import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/dashboard',
      name: 'home',
      component: () => import('@/views/ExecutiveDashboardView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/change-password',
      name: 'change-password',
      component: () => import('@/views/ChangePasswordView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/users-admin',
      name: 'users-admin',
      component: () => import('@/views/UsersAdminView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('@/views/OrdersView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/cnc-operator',
      name: 'cnc-operator',
      component: () => import('@/views/CncOperatorView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/cnc-operator/pdf-sequence',
      name: 'cnc-operator-pdf-sequence',
      component: () => import('@/views/PdfOrderedCncOpsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/order-confirmation',
      name: 'order-confirmation',
      component: () => import('@/views/OrderConfirmationView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/order-extractor-confirm',
      name: 'order-extractor-confirm',
      component: () => import('@/views/OrderExtractorConfirmView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/returns-initiated',
      name: 'returns-initiated',
      component: () => import('@/views/ReturnsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/extract-return-initiated',
      name: 'extract-return-initiated',
      component: () => import('@/views/ExtractReturnInitiatedView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/returned',
      name: 'returned',
      component: () => import('@/views/ReturnedView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/fresh-roll-issues',
      name: 'fresh-roll-issues',
      component: () => import('@/views/FreshRollIssuesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/return-analytics',
      name: 'return-analytics',
      component: () => import('@/views/ReturnAnalyticsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/other-issues',
      name: 'other-issues',
      component: () => import('@/views/IssuesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/safety-claims',
      name: 'safety-claims',
      component: () => import('@/views/SafetyClaimsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/review-requests',
      name: 'review-requests',
      component: () => import('@/views/ReviewRequestsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/review-followup-settings',
      name: 'review-followup-settings',
      component: () => import('@/views/ReviewFollowupSettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/safety-claims-analytics',
      name: 'safety-claims-analytics',
      component: () => import('@/views/SafetyClaimsAnalyticsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/sku-mapper',
      name: 'sku-mapper',
      component: () => import('@/views/SKUMapperView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/schedule-weight-parser',
      name: 'schedule-weight-parser',
      component: () => import('@/views/ScheduleWeightParserView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/priority-rules',
      name: 'priority-rules',
      component: () => import('@/views/PriorityRulesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/db-backups',
      name: 'db-backups',
      component: () => import('@/views/DBBackupsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/shipping-date-filter-settings',
      name: 'shipping-date-filter-settings',
      component: () => import('@/views/ShippingDateFilterSettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/amazon-row-highlight-settings',
      name: 'amazon-row-highlight-settings',
      component: () => import('@/views/AmazonRowHighlightSettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/interakt-settings',
      name: 'interakt-settings',
      component: () => import('@/views/InteraktSettingsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/orders/:id',
      name: 'order-detail',
      component: () => import('@/views/OrderDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/direct-orders',
      name: 'direct-orders',
      component: () => import('@/views/DirectOrdersView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/direct-orders/dashboard',
      name: 'direct-order-dashboard',
      component: () => import('@/views/DirectOrderExecutiveDashboardView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/direct-orders/new',
      name: 'direct-order-create',
      component: () => import('@/views/DirectOrderFormView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/direct-orders/cnc-ops',
      name: 'direct-order-cnc-ops',
      component: () => import('@/views/DirectOrderCncOpsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/direct-orders/:id',
      name: 'direct-order-detail',
      component: () => import('@/views/DirectOrderDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/direct-orders/:id/edit',
      name: 'direct-order-edit',
      component: () => import('@/views/DirectOrderFormView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/repeat-customers/orders',
      name: 'repeat-order-customers',
      component: () => import('@/views/RepeatCustomersView.vue'),
      props: { scope: 'orders' },
      meta: { requiresAuth: true }
    },
    {
      path: '/repeat-customers/returns',
      name: 'repeat-return-customers',
      component: () => import('@/views/RepeatCustomersView.vue'),
      props: { scope: 'returns' },
      meta: { requiresAuth: true }
    }
  ]
})

// Navigation guard for authentication
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login' })
  } else if (authStore.user?.must_change_password && to.name !== 'change-password') {
    next({ name: 'change-password' })
  } else if (to.name === 'change-password' && authStore.user && !authStore.user.must_change_password) {
    next({ name: 'home' })
  } else if (to.name === 'login' && authStore.isAuthenticated) {
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router
