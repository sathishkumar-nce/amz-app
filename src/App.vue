<template>
  <div id="app-shell">
    <template v-if="authStore.isAuthenticated">
      <button
        v-if="sidebarOpen"
        type="button"
        class="sidebar-overlay"
        aria-label="Close navigation"
        @click="sidebarOpen = false"
      />

      <aside :class="['sidebar', { 'sidebar--open': sidebarOpen }]">
        <div class="sidebar__brand">
          <div class="brand">
            <div class="brand__badge">AO</div>
            <div>
              <h1 class="brand__title">Amazon Orders Manager</h1>
              <p class="brand__subtitle">Operations dashboard</p>
            </div>
          </div>
          <button type="button" class="sidebar__close" @click="sidebarOpen = false">Close</button>
        </div>

        <nav class="sidebar__nav">
          <section class="nav-section">
            <p class="nav-section__title">Shipping Filters</p>
            <button
              v-for="item in shippingFilterStore.settings"
              :key="item.filter_key"
              type="button"
              :class="['shipping-filter-button', { 'shipping-filter-button--active': shippingFilterStore.activeKey === item.filter_key }]"
              @click="handleShippingFilterSelect(item.filter_key)"
            >
              {{ item.label }}
            </button>
          </section>

          <section v-for="section in navSections" :key="section.title" class="nav-section">
            <p class="nav-section__title">{{ section.title }}</p>
            <router-link
              v-for="item in section.items"
              :key="item.to"
              :to="item.to"
              class="nav-link"
              @click="handleNavClick"
            >
              {{ item.label }}
            </router-link>
          </section>
        </nav>

        <div class="sidebar__actions">
          <router-link to="/direct-orders/new" class="quick-create-button" @click="handleNavClick">
            New Direct Order
          </router-link>
          <span class="account__user">{{ authStore.user?.username }}</span>
          <button @click="handleLogout" class="logout-button">Logout</button>
        </div>
      </aside>

      <div class="app-main">
        <header class="topbar">
          <div class="topbar__inner">
            <button type="button" class="menu-button" @click="sidebarOpen = true">Menu</button>
            <div class="topbar__copy">
              <strong>Amazon Orders Manager</strong>
              <span>{{ authStore.user?.username }}</span>
            </div>
          </div>
        </header>

        <main class="page-shell">
          <router-view :key="viewKey" />
        </main>
      </div>
    </template>

    <main v-else class="page-shell page-shell--standalone">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAmazonRowHighlightRulesStore } from '@/stores/amazonRowHighlightRules'
import { useShippingDateFiltersStore } from '@/stores/shippingDateFilters'
import { useRoute, useRouter } from 'vue-router'

const authStore = useAuthStore()
const shippingFilterStore = useShippingDateFiltersStore()
const rowHighlightRulesStore = useAmazonRowHighlightRulesStore()
const router = useRouter()
const route = useRoute()
const sidebarOpen = ref(false)
const viewKey = computed(() => `${route.fullPath}:${shippingFilterStore.activeKey}`)

const handleUnauthorized = () => {
  authStore.logout()
  sidebarOpen.value = false

  if (router.currentRoute.value.name !== 'login') {
    void router.push({ name: 'login' })
  }
}

const navSections = computed(() => {
  const sections = [
    {
      title: 'Orders',
      items: [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/return-analytics', label: 'Return Analytics' },
        { to: '/safety-claims-analytics', label: 'Safety Claims Analytics' },
        { to: '/orders', label: 'Orders' },
        { to: '/order-confirmation', label: 'Confirm' },
        { to: '/returns-initiated', label: 'Returns Initiated' },
        { to: '/other-issues', label: 'Other Issues' },
        { to: '/safety-claims', label: 'Safety Claims' },
        { to: '/repeat-customers/orders', label: 'Repeat Orders' },
        { to: '/repeat-customers/returns', label: 'Repeat Returns' },
      ],
    },
    {
      title: 'Direct',
      items: [
        { to: '/direct-orders', label: 'Direct Orders' },
      ],
    },
    {
      title: 'Tools',
      items: [
        { to: '/cnc-operator', label: 'CNC Ops' },
        { to: '/schedule-weight-parser', label: 'Schedule Weights' },
        { to: '/sku-mapper', label: 'SKU Mapper' },
        { to: '/priority-rules', label: 'Priority Rules' },
        { to: '/db-backups', label: 'DB Backups' },
        { to: '/shipping-date-filter-settings', label: 'Shipping Filter Settings' },
        { to: '/amazon-row-highlight-settings', label: 'Row Highlight Settings' },
      ],
    },
  ]

  if (authStore.user?.username === 'admin') {
    sections.push({
      title: 'Admin',
      items: [
        { to: '/users-admin', label: 'Users' },
      ],
    })
  }

  return sections
})

const handleLogout = () => {
  authStore.logout()
  sidebarOpen.value = false
  router.push('/login')
}

const handleNavClick = () => {
  sidebarOpen.value = false
}

const handleShippingFilterSelect = (key: string) => {
  void shippingFilterStore.setActiveKey(key)
  if (window.innerWidth < 1024) {
    sidebarOpen.value = false
  }
}

watch(
  () => route.fullPath,
  () => {
    if (window.innerWidth < 1024) {
      sidebarOpen.value = false
    }
  },
)

onMounted(() => {
  if (authStore.token && !authStore.user) {
    void authStore.fetchUser()
  }

  if (authStore.token) {
    void shippingFilterStore.ensureLoaded()
    void rowHighlightRulesStore.ensureLoaded()
  }

  window.addEventListener('auth:unauthorized', handleUnauthorized)
})

onUnmounted(() => {
  window.removeEventListener('auth:unauthorized', handleUnauthorized)
})
</script>

<style scoped>
#app-shell {
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  z-index: 29;
  background: rgba(15, 23, 42, 0.3);
  border: 0;
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 30;
  width: 268px;
  padding: 0.9rem;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  box-shadow: 10px 0 30px rgba(15, 23, 42, 0.08);
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 1rem;
  transform: translateX(-100%);
  transition: transform 180ms ease;
}

.sidebar--open {
  transform: translateX(0);
}

.sidebar__brand {
  display: grid;
  gap: 0.65rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.brand__badge {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 0.75rem;
  display: grid;
  place-items: center;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #ffffff;
  background: linear-gradient(135deg, #0f766e, #115e59);
}

.brand__title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 800;
  color: #0f172a;
}

.brand__subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.78rem;
  color: #64748b;
}

.sidebar__close,
.menu-button,
.logout-button {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  border-radius: 14px;
  min-height: 2.7rem;
  padding: 0.65rem 1rem;
  font-weight: 700;
  cursor: pointer;
}

.sidebar__close {
  display: inline-flex;
  justify-content: center;
}

.sidebar__nav {
  display: grid;
  align-content: start;
  gap: 0.8rem;
  overflow-y: auto;
  padding-right: 0.15rem;
}

.nav-section {
  display: grid;
  gap: 0.28rem;
}

.nav-section__title {
  margin: 0 0 0.2rem;
  padding: 0 0.4rem;
  color: #94a3b8;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.nav-link {
  display: flex;
  align-items: center;
  min-height: 2.45rem;
  padding: 0.55rem 0.8rem;
  border-radius: 12px;
  color: #475569;
  font-size: 0.9rem;
  font-weight: 700;
  border: 1px solid transparent;
}

.shipping-filter-button {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 2.4rem;
  padding: 0.55rem 0.8rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: #fff;
  color: #475569;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
}

.shipping-filter-button:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #0f172a;
}

.shipping-filter-button--active {
  background: #ecfeff;
  border-color: rgba(15, 118, 110, 0.2);
  color: #0f766e;
}

.nav-link:hover {
  background: #f1f5f9;
  border-color: #e2e8f0;
  color: #0f172a;
}

.nav-link.router-link-active {
  background: #ecfeff;
  border-color: rgba(15, 118, 110, 0.16);
  color: #0f766e;
}

.sidebar__actions {
  display: grid;
  gap: 0.65rem;
}

.quick-create-button {
  border-radius: 12px;
  min-height: 2.65rem;
  padding: 0.68rem 0.9rem;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #0f766e, #115e59);
  text-decoration: none;
  text-align: center;
}

.account__user {
  color: #334155;
  font-size: 0.88rem;
  font-weight: 700;
  padding: 0.65rem 0.8rem;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  text-align: center;
}

.app-main {
  width: 100%;
  min-width: 0;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(248, 250, 252, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #e2e8f0;
}

.topbar__inner {
  min-height: 4.25rem;
  padding: 0.75rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.topbar__copy {
  display: grid;
}

.topbar__copy strong {
  color: #0f172a;
}

.topbar__copy span {
  color: #64748b;
  font-size: 0.88rem;
}

.page-shell {
  width: 100%;
  padding: 1.25rem 1.25rem 2rem;
  box-sizing: border-box;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x pan-y;
}

.page-shell--standalone {
  padding-top: 2rem;
}

@media (max-width: 1023px) {
  .page-shell {
    padding: 1rem 0.9rem 1.6rem;
  }
}
</style>
