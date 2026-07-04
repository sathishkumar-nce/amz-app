<template>
  <div class="safety-analytics">
    <section class="hero-card">
      <div>
        <p class="eyebrow">Product quality intelligence</p>
        <h1>Safety Claims Analytics</h1>
        <p class="hero-copy">
          Detailed analytics for safety claims, quality issue patterns, and manufacturing risk hotspots across products, states, cities, and thicknesses.
        </p>
      </div>
      <div class="hero-meta">
        <span class="meta-pill">{{ dashboard?.summary.total_orders ?? 0 }} filtered orders</span>
        <span class="meta-pill">{{ dashboard?.summary.safety_claimed_orders ?? 0 }} safety claim orders</span>
      </div>
    </section>

    <section class="filter-panel">
      <div class="filter-grid">
        <label class="filter-field">
          <span>From Date</span>
          <input v-model="filters.fromDate" type="date" class="filter-input" />
        </label>

        <label class="filter-field">
          <span>To Date</span>
          <input v-model="filters.toDate" type="date" class="filter-input" />
        </label>

        <label class="filter-field">
          <span>State</span>
          <input
            v-model="filters.state"
            list="safety-analytics-states"
            class="filter-input"
            placeholder="All States"
          />
          <datalist id="safety-analytics-states">
            <option v-for="state in dashboard?.available_states || []" :key="state" :value="state" />
          </datalist>
        </label>

        <label class="filter-field">
          <span>City</span>
          <input
            v-model="filters.city"
            list="safety-analytics-cities"
            class="filter-input"
            placeholder="All Cities"
          />
          <datalist id="safety-analytics-cities">
            <option v-for="city in dashboard?.available_cities || []" :key="city" :value="city" />
          </datalist>
        </label>

        <label class="filter-field">
          <span>Thickness</span>
          <select v-model="filters.thickness" class="filter-input">
            <option value="">All</option>
            <option value="1 mm">1 mm</option>
            <option value="1.5 mm">1.5 mm</option>
            <option value="2 mm">2 mm</option>
            <option value="3 mm">3 mm</option>
          </select>
        </label>

        <label class="filter-field">
          <span>Order Status</span>
          <select v-model="filters.orderStatus" class="filter-input">
            <option value="">All</option>
            <option value="received">received</option>
            <option value="manufactured">manufactured</option>
            <option value="cancelled">cancelled</option>
            <option value="returned">returned</option>
          </select>
        </label>

        <label class="filter-field">
          <span>Safety Claimed</span>
          <select v-model="filters.safetyClaimed" class="filter-input">
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>

        <div class="filter-actions">
          <button type="button" class="refresh-button" :disabled="loading" @click="refreshDashboard">
            <ArrowPathIcon class="refresh-button__icon" />
            {{ loading ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>
      </div>
    </section>

    <section class="insights-panel">
      <div class="section-header section-header--tight">
        <div>
          <p class="eyebrow">Bonus Insights</p>
          <h2>Highest Claim Signals</h2>
        </div>
      </div>

      <div v-if="loading" class="insight-grid">
        <div v-for="index in 4" :key="`insight-skeleton-${index}`" class="skeleton skeleton--badge" />
      </div>
      <div v-else class="insight-grid">
        <article v-for="badge in insightBadges" :key="badge.label" class="insight-badge">
          <span class="insight-badge__label">{{ badge.label }}</span>
          <strong>{{ badge.value }}</strong>
        </article>
      </div>
    </section>

    <section class="kpi-section">
      <div v-if="loading" class="kpi-grid">
        <div v-for="index in 7" :key="`safety-kpi-${index}`" class="skeleton skeleton--card" />
      </div>
      <div v-else class="kpi-grid">
        <ExecutiveKpiCard
          v-for="card in kpiCards"
          :key="card.title"
          :icon="card.icon"
          :title="card.title"
          :value="card.value"
          :percentage="card.percentage"
          :tone="card.tone"
        />
      </div>
    </section>

    <section class="chart-grid chart-grid--double">
      <article class="chart-card">
        <header class="section-header">
          <div>
            <p class="eyebrow">Chart 1</p>
            <h2>Safety Claims Over Time</h2>
          </div>
          <div class="section-header__actions">
            <div class="segmented-control">
              <button
                v-for="option in trendOptions"
                :key="option.value"
                type="button"
                :class="['segmented-control__button', { 'segmented-control__button--active': trendGranularity === option.value }]"
                @click="trendGranularity = option.value"
              >
                {{ option.label }}
              </button>
            </div>
            <div class="export-actions">
              <button type="button" class="export-button" @click="exportRows('safety-claims-trend', trendExportRows, 'csv')">CSV</button>
              <button type="button" class="export-button" @click="exportRows('safety-claims-trend', trendExportRows, 'excel')">Excel</button>
              <button type="button" class="export-button" @click="exportRows('safety-claims-trend', trendExportRows, 'pdf')">PDF</button>
            </div>
          </div>
        </header>

        <div v-if="loading" class="skeleton skeleton--chart" />
        <div v-else-if="!currentTrend.length" class="empty-card">No Data Available</div>
        <div v-else class="trend-visual">
          <svg viewBox="0 0 520 250" preserveAspectRatio="none" class="trend-svg">
            <line
              v-for="tick in trendYTicks"
              :key="`trend-grid-${tick.value}`"
              x1="48"
              :y1="tick.y"
              x2="500"
              :y2="tick.y"
              class="trend-grid"
            />
            <text
              v-for="tick in trendYTicks"
              :key="`trend-axis-${tick.value}`"
              x="40"
              :y="tick.y + 4"
              text-anchor="end"
              class="trend-axis"
            >
              {{ formatCompactNumber(tick.value) }}
            </text>
            <defs>
              <linearGradient id="safety-trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#0f766e" stop-opacity="0.28" />
                <stop offset="100%" stop-color="#0f766e" stop-opacity="0.04" />
              </linearGradient>
            </defs>
            <path :d="trendAreaPath" fill="url(#safety-trend-fill)" />
            <path :d="trendLinePath" class="trend-line" />
            <g v-for="point in plottedTrendPoints" :key="point.date">
              <circle :cx="point.x" :cy="point.y" r="4" class="trend-dot" />
              <circle :cx="point.x" :cy="point.y" r="12" class="trend-hit" @click="activateTrendDrilldown(point)" />
            </g>
          </svg>
          <div class="trend-axis-row">
            <button
              v-for="point in xAxisTrendPoints"
              :key="`trend-point-${point.date}`"
              type="button"
              class="axis-trigger"
              @click="activateTrendDrilldown(point)"
            >
              {{ point.label }}
            </button>
          </div>
        </div>
      </article>

      <article class="chart-card">
        <header class="section-header">
          <div>
            <p class="eyebrow">Chart 8</p>
            <h2>Returned vs Safety Claimed</h2>
          </div>
          <div class="export-actions">
            <button type="button" class="export-button" @click="exportRows('returned-vs-safety-claimed', funnelExportRows, 'csv')">CSV</button>
            <button type="button" class="export-button" @click="exportRows('returned-vs-safety-claimed', funnelExportRows, 'excel')">Excel</button>
            <button type="button" class="export-button" @click="exportRows('returned-vs-safety-claimed', funnelExportRows, 'pdf')">PDF</button>
          </div>
        </header>

        <div v-if="loading" class="skeleton skeleton--chart" />
        <div v-else class="funnel">
          <button type="button" class="funnel-stage funnel-stage--wide" @click="activateFunnelDrilldown('total')">
            <span>Total Orders</span>
            <strong>{{ dashboard?.summary.total_orders ?? 0 }}</strong>
          </button>
          <span class="funnel-arrow">↓</span>
          <button type="button" class="funnel-stage funnel-stage--mid" @click="activateFunnelDrilldown('returned')">
            <span>Returned Orders</span>
            <strong>{{ dashboard?.summary.returned_orders ?? 0 }}</strong>
          </button>
          <span class="funnel-arrow">↓</span>
          <button type="button" class="funnel-stage funnel-stage--narrow" @click="activateFunnelDrilldown('claimed')">
            <span>Safety Claimed Orders</span>
            <strong>{{ dashboard?.summary.safety_claimed_orders ?? 0 }}</strong>
          </button>
        </div>
      </article>
    </section>

    <section class="chart-grid chart-grid--double">
      <article class="chart-card">
        <header class="section-header">
          <div>
            <p class="eyebrow">Chart 2</p>
            <h2>Safety Claims By Thickness</h2>
          </div>
          <div class="export-actions">
            <button type="button" class="export-button" @click="exportRows('safety-claims-by-thickness', thicknessExportRows, 'csv')">CSV</button>
            <button type="button" class="export-button" @click="exportRows('safety-claims-by-thickness', thicknessExportRows, 'excel')">Excel</button>
            <button type="button" class="export-button" @click="exportRows('safety-claims-by-thickness', thicknessExportRows, 'pdf')">PDF</button>
          </div>
        </header>

        <div v-if="loading" class="skeleton skeleton--chart" />
        <div v-else-if="!dashboard?.thickness_performance.length" class="empty-card">No Data Available</div>
        <div v-else class="vertical-bars">
          <button
            v-for="row in dashboard.thickness_performance"
            :key="`claims-${row.thickness}`"
            type="button"
            class="vertical-bar"
            @click="activateDrilldown('thickness', row.thickness, `${row.thickness} safety claims`)"
          >
            <span class="vertical-bar__value">{{ row.claims }}</span>
            <span class="vertical-bar__track">
              <span class="vertical-bar__fill" :style="{ height: `${toBarHeight(row.claims, maxThicknessClaims)}%` }" />
            </span>
            <span class="vertical-bar__label">{{ row.thickness }}</span>
          </button>
        </div>
      </article>

      <article class="chart-card">
        <header class="section-header">
          <div>
            <p class="eyebrow">Chart 3</p>
            <h2>Safety Claim Rate By Thickness</h2>
          </div>
          <div class="export-actions">
            <button type="button" class="export-button" @click="exportRows('safety-claim-rate-by-thickness', thicknessExportRows, 'csv')">CSV</button>
            <button type="button" class="export-button" @click="exportRows('safety-claim-rate-by-thickness', thicknessExportRows, 'excel')">Excel</button>
            <button type="button" class="export-button" @click="exportRows('safety-claim-rate-by-thickness', thicknessExportRows, 'pdf')">PDF</button>
          </div>
        </header>

        <div v-if="loading" class="skeleton skeleton--chart" />
        <div v-else-if="!dashboard?.thickness_performance.length" class="empty-card">No Data Available</div>
        <div v-else class="vertical-bars">
          <button
            v-for="row in dashboard.thickness_performance"
            :key="`rate-${row.thickness}`"
            type="button"
            class="vertical-bar vertical-bar--amber"
            @click="activateDrilldown('thickness', row.thickness, `${row.thickness} claim rate`)"
          >
            <span class="vertical-bar__value">{{ formatPercent(row.claim_rate) }}</span>
            <span class="vertical-bar__track">
              <span class="vertical-bar__fill" :style="{ height: `${toBarHeight(row.claim_rate, maxThicknessRate)}%` }" />
            </span>
            <span class="vertical-bar__label">{{ row.thickness }}</span>
          </button>
        </div>
      </article>
    </section>

    <section class="chart-grid chart-grid--double">
      <article class="chart-card">
        <header class="section-header">
          <div>
            <p class="eyebrow">Chart 4</p>
            <h2>Safety Claims By State</h2>
          </div>
          <div class="export-actions">
            <button type="button" class="export-button" @click="exportRows('safety-claims-by-state', stateExportRows, 'csv')">CSV</button>
            <button type="button" class="export-button" @click="exportRows('safety-claims-by-state', stateExportRows, 'excel')">Excel</button>
            <button type="button" class="export-button" @click="exportRows('safety-claims-by-state', stateExportRows, 'pdf')">PDF</button>
          </div>
        </header>

        <div v-if="loading" class="skeleton skeleton--chart" />
        <div v-else-if="!dashboard?.state_performance.length" class="empty-card">No Data Available</div>
        <div v-else class="horizontal-list">
          <button
            v-for="row in dashboard.state_performance"
            :key="row.state"
            type="button"
            class="horizontal-row"
            @click="activateDrilldown('state', row.state, `${row.state} safety claims`)"
          >
            <span class="horizontal-row__label">{{ row.state }}</span>
            <span class="horizontal-row__bar">
              <span class="horizontal-row__fill" :style="{ width: `${toBarWidth(row.claims, maxStateClaims)}%` }" />
            </span>
            <span class="horizontal-row__stats">{{ row.orders }} orders · {{ row.claims }} claims · {{ formatPercent(row.claim_rate) }}</span>
          </button>
        </div>
      </article>

      <article class="chart-card">
        <header class="section-header">
          <div>
            <p class="eyebrow">Chart 5</p>
            <h2>Top Cities With Safety Claims</h2>
          </div>
          <div class="export-actions">
            <button type="button" class="export-button" @click="exportRows('top-cities-with-safety-claims', topCitiesExportRows, 'csv')">CSV</button>
            <button type="button" class="export-button" @click="exportRows('top-cities-with-safety-claims', topCitiesExportRows, 'excel')">Excel</button>
            <button type="button" class="export-button" @click="exportRows('top-cities-with-safety-claims', topCitiesExportRows, 'pdf')">PDF</button>
          </div>
        </header>

        <div v-if="loading" class="skeleton skeleton--chart" />
        <div v-else-if="!dashboard?.top_claim_cities.length" class="empty-card">No Data Available</div>
        <div v-else class="horizontal-list">
          <button
            v-for="slice in dashboard.top_claim_cities"
            :key="slice.label"
            type="button"
            class="horizontal-row horizontal-row--sky"
            @click="activateDrilldown('city', slice.label, `${slice.label} safety claims`)"
          >
            <span class="horizontal-row__label">{{ slice.label }}</span>
            <span class="horizontal-row__bar">
              <span class="horizontal-row__fill" :style="{ width: `${toBarWidth(slice.count, maxCityClaims)}%` }" />
            </span>
            <span class="horizontal-row__stats">{{ slice.count }} claims</span>
          </button>
        </div>
      </article>
    </section>

    <section class="chart-grid chart-grid--double">
      <article class="chart-card">
        <header class="section-header">
          <div>
            <p class="eyebrow">Chart 6</p>
            <h2>Safety Claim Issues</h2>
          </div>
          <div class="export-actions">
            <button type="button" class="export-button" @click="exportRows('safety-claim-issues', issueExportRows, 'csv')">CSV</button>
            <button type="button" class="export-button" @click="exportRows('safety-claim-issues', issueExportRows, 'excel')">Excel</button>
            <button type="button" class="export-button" @click="exportRows('safety-claim-issues', issueExportRows, 'pdf')">PDF</button>
          </div>
        </header>

        <div v-if="loading" class="skeleton skeleton--chart" />
        <div v-else-if="!dashboard?.safety_claim_issues.length" class="empty-card">No Data Available</div>
        <div v-else class="horizontal-list">
          <button
            v-for="slice in dashboard.safety_claim_issues"
            :key="slice.label"
            type="button"
            class="horizontal-row horizontal-row--amber"
            @click="activateDrilldown('issue', slice.label, `Issue: ${slice.label}`)"
          >
            <span class="horizontal-row__label">{{ slice.label }}</span>
            <span class="horizontal-row__bar">
              <span class="horizontal-row__fill" :style="{ width: `${toBarWidth(slice.count, maxIssueCount)}%` }" />
            </span>
            <span class="horizontal-row__stats">{{ slice.count }} claims</span>
          </button>
        </div>
      </article>

      <article class="chart-card">
        <header class="section-header">
          <div>
            <p class="eyebrow">Chart 7</p>
            <h2>Claims By Order Status</h2>
          </div>
          <div class="export-actions">
            <button type="button" class="export-button" @click="exportRows('claims-by-order-status', statusExportRows, 'csv')">CSV</button>
            <button type="button" class="export-button" @click="exportRows('claims-by-order-status', statusExportRows, 'excel')">Excel</button>
            <button type="button" class="export-button" @click="exportRows('claims-by-order-status', statusExportRows, 'pdf')">PDF</button>
          </div>
        </header>

        <div v-if="loading" class="skeleton skeleton--chart" />
        <div v-else-if="!claimStatusSlices.length" class="empty-card">No Data Available</div>
        <div v-else class="pie-layout">
          <div class="donut-shell">
            <div class="donut" :style="{ background: statusGradient }">
              <div class="donut__center">
                <strong>{{ claimStatusTotal }}</strong>
                <span>claims</span>
              </div>
            </div>
          </div>
          <div class="legend-list">
            <button
              v-for="(slice, index) in claimStatusSlices"
              :key="slice.label"
              type="button"
              class="legend-button"
              @click="activateDrilldown('status', slice.label, `${slice.label} claim orders`)"
            >
              <span class="legend-button__swatch" :style="{ background: donutPalette[index % donutPalette.length] }" />
              <span class="legend-button__label">{{ slice.label }}</span>
              <span class="legend-button__meta">{{ slice.count }} · {{ formatPercent((slice.count / Math.max(claimStatusTotal, 1)) * 100) }}</span>
            </button>
          </div>
        </div>
      </article>
    </section>

    <section class="table-card">
      <header class="section-header">
        <div>
          <p class="eyebrow">Top Products With Safety Claims</p>
          <h2>Top Products With Safety Claims</h2>
        </div>
        <div class="export-actions">
          <button type="button" class="export-button" @click="exportRows('safety-claim-products', productExportRows, 'csv')">CSV</button>
          <button type="button" class="export-button" @click="exportRows('safety-claim-products', productExportRows, 'excel')">Excel</button>
          <button type="button" class="export-button" @click="exportRows('safety-claim-products', productExportRows, 'pdf')">PDF</button>
        </div>
      </header>

      <div v-if="loading" class="table-skeleton">
        <div v-for="index in 6" :key="`product-skeleton-${index}`" class="skeleton skeleton--row" />
      </div>
      <div v-else-if="!sortedTopProducts.length" class="empty-card">No Data Available</div>
      <div v-else ref="productTableWrapRef" class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Orders</th>
              <th>Safety Claims</th>
              <th>Claim Rate %</th>
              <th>Drill Down</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in sortedTopProducts" :key="row.product">
              <td>{{ row.product }}</td>
              <td>{{ row.orders }}</td>
              <td>{{ row.claims }}</td>
              <td>{{ formatPercent(row.claim_rate) }}</td>
              <td>
                <button type="button" class="inline-link" @click="activateDrilldown('product', row.product, `Product: ${row.product}`)">
                  View matching orders
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <StickyHorizontalScrollbar :target="productTableWrapRef" />
    </section>

    <section class="table-card">
      <header class="section-header">
        <div>
          <p class="eyebrow">Safety Claim Cases</p>
          <h2>Safety Claim Cases</h2>
        </div>
        <div class="export-actions">
          <button type="button" class="export-button" @click="exportRows('safety-claim-cases', caseExportRows, 'csv')">CSV</button>
          <button type="button" class="export-button" @click="exportRows('safety-claim-cases', caseExportRows, 'excel')">Excel</button>
          <button type="button" class="export-button" @click="exportRows('safety-claim-cases', caseExportRows, 'pdf')">PDF</button>
        </div>
      </header>

      <div v-if="loading" class="table-skeleton">
        <div v-for="index in 6" :key="`case-skeleton-${index}`" class="skeleton skeleton--row" />
      </div>
      <div v-else-if="!sortedCases.length" class="empty-card">No Data Available</div>
      <div v-else ref="casesTableWrapRef" class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Confirmed Date</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>State</th>
              <th>City</th>
              <th>Thickness</th>
              <th>Product</th>
              <th>Order Status</th>
              <th>Safety Claim Issues</th>
              <th>Updated At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in sortedCases" :key="`case-${row.amazon_order_id}-${row.updated_at}`">
              <td>{{ row.amazon_order_id }}</td>
              <td>{{ formatDate(row.confirmed_date) }}</td>
              <td>{{ row.customer }}</td>
              <td>{{ row.phone }}</td>
              <td>{{ row.state }}</td>
              <td>{{ row.city }}</td>
              <td>{{ row.thickness }}</td>
              <td>{{ row.product }}</td>
              <td><span class="status-pill">{{ row.order_status }}</span></td>
              <td>{{ row.safety_claim_issues }}</td>
              <td>{{ formatDateTime(row.updated_at) }}</td>
              <td><router-link :to="`/orders/${row.amazon_order_id}`" class="view-link">View</router-link></td>
            </tr>
          </tbody>
        </table>
      </div>
      <StickyHorizontalScrollbar :target="casesTableWrapRef" />
    </section>

    <section v-if="activeDrilldown" class="table-card table-card--accent">
      <header class="section-header">
        <div>
          <p class="eyebrow">Drill Down</p>
          <h2>{{ activeDrilldown.title }}</h2>
        </div>
        <div class="section-header__actions">
          <div class="export-actions">
            <button type="button" class="export-button" @click="exportRows('safety-claim-drilldown', drilldownExportRows, 'csv')">CSV</button>
            <button type="button" class="export-button" @click="exportRows('safety-claim-drilldown', drilldownExportRows, 'excel')">Excel</button>
            <button type="button" class="export-button" @click="exportRows('safety-claim-drilldown', drilldownExportRows, 'pdf')">PDF</button>
          </div>
          <button type="button" class="clear-button" @click="activeDrilldown = null">Clear</button>
        </div>
      </header>

      <div v-if="!drilldownRows.length" class="empty-card">No Data Available</div>
      <div v-else ref="drilldownTableWrapRef" class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Confirmed Date</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>State</th>
              <th>City</th>
              <th>Thickness</th>
              <th>Product</th>
              <th>Order Status</th>
              <th>Safety Claimed</th>
              <th>Safety Claim Issues</th>
              <th>Updated At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in drilldownRows" :key="`drill-${row.amazon_order_id}-${row.updated_at}`">
              <td>{{ row.amazon_order_id }}</td>
              <td>{{ formatDate(row.confirmed_date) }}</td>
              <td>{{ row.customer }}</td>
              <td>{{ row.phone }}</td>
              <td>{{ row.state }}</td>
              <td>{{ row.city }}</td>
              <td>{{ row.thickness }}</td>
              <td>{{ row.product }}</td>
              <td><span class="status-pill">{{ row.order_status }}</span></td>
              <td><span :class="booleanPillClass(row.safety_claimed)">{{ row.safety_claimed ? 'Yes' : 'No' }}</span></td>
              <td>{{ row.safety_claim_issues }}</td>
              <td>{{ formatDateTime(row.updated_at) }}</td>
              <td><router-link :to="`/orders/${row.amazon_order_id}`" class="view-link">View</router-link></td>
            </tr>
          </tbody>
        </table>
      </div>
      <StickyHorizontalScrollbar :target="drilldownTableWrapRef" />
    </section>

    <div v-if="error" class="error-banner">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import StickyHorizontalScrollbar from '@/components/StickyHorizontalScrollbar.vue'
import {
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  ShieldExclamationIcon,
  Squares2X2Icon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import { ordersApi } from '@/api/orders'
import ExecutiveKpiCard from '@/components/ExecutiveKpiCard.vue'
import type {
  AnalyticsChartSlice,
  AnalyticsTimePoint,
  SafetyClaimsDashboardDetailRow,
  SafetyClaimsDashboardResponse,
} from '@/types'
import { exportRowsAsCsv, exportRowsAsExcel, exportRowsAsPdf, type ExportRow } from '@/utils/exportData'

type KpiTone = 'teal' | 'amber' | 'rose' | 'sky' | 'slate'
type TrendGranularity = 'daily' | 'weekly' | 'monthly'
type DrilldownType = 'trend' | 'thickness' | 'state' | 'city' | 'issue' | 'status' | 'product' | 'funnel'

type DrilldownState = {
  type: DrilldownType
  title: string
  value: string
  from?: string
  to?: string
}

const dashboard = ref<SafetyClaimsDashboardResponse | null>(null)
const loading = ref(false)
const error = ref('')
const productTableWrapRef = ref<HTMLElement | null>(null)
const casesTableWrapRef = ref<HTMLElement | null>(null)
const drilldownTableWrapRef = ref<HTMLElement | null>(null)
const trendGranularity = ref<TrendGranularity>('daily')
const activeDrilldown = ref<DrilldownState | null>(null)

const filters = reactive({
  fromDate: '',
  toDate: '',
  state: '',
  city: '',
  thickness: '',
  orderStatus: '',
  safetyClaimed: '',
})

const toDateInput = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const initializeDateRange = () => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const from = new Date(today)
  from.setDate(from.getDate() - 29)
  filters.fromDate = toDateInput(from)
  filters.toDate = toDateInput(today)
}

const trendOptions: Array<{ value: TrendGranularity; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const donutPalette = ['#0f766e', '#2563eb', '#f59e0b', '#e11d48', '#475569']

const formatCompactNumber = (value: number) => (Math.abs(value % 1) < 0.001 ? value.toFixed(0) : value.toFixed(2))
const formatPercent = (value: number) => `${value.toFixed(2)}%`

const formatDate = (value?: string | null) => {
  if (!value) return 'Not available'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not available'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const booleanPillClass = (value: boolean) => value ? 'boolean-pill boolean-pill--true' : 'boolean-pill boolean-pill--false'

const currentTrend = computed(() => {
  if (!dashboard.value) return []
  if (trendGranularity.value === 'weekly') return dashboard.value.claims_trend_weekly
  if (trendGranularity.value === 'monthly') return dashboard.value.claims_trend_monthly
  return dashboard.value.claims_trend_daily
})

const maxTrendValue = computed(() => currentTrend.value.reduce((max, point) => Math.max(max, point.count), 0))

const plottedTrendPoints = computed(() => {
  if (!currentTrend.value.length) return []

  const maxValue = Math.max(maxTrendValue.value, 1)
  const chartLeft = 48
  const chartRight = 500
  const chartTop = 18
  const chartBottom = 210
  const chartWidth = chartRight - chartLeft
  const chartHeight = chartBottom - chartTop
  const stepX = currentTrend.value.length === 1 ? 0 : chartWidth / (currentTrend.value.length - 1)

  return currentTrend.value.map((point, index) => ({
    ...point,
    x: chartLeft + (stepX * index),
    y: chartBottom - ((point.count / maxValue) * chartHeight),
  }))
})

const trendLinePath = computed(() => plottedTrendPoints.value.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' '))

const trendAreaPath = computed(() => {
  const first = plottedTrendPoints.value[0]
  const last = plottedTrendPoints.value[plottedTrendPoints.value.length - 1]
  if (!first || !last) return ''
  return `${trendLinePath.value} L ${last.x} 210 L ${first.x} 210 Z`
})

const trendYTicks = computed(() => {
  const maxValue = Math.max(maxTrendValue.value, 1)
  return Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3
    return {
      value: Math.round(maxValue * (1 - ratio)),
      y: 18 + (192 * ratio),
    }
  })
})

const xAxisTrendPoints = computed(() => {
  if (currentTrend.value.length <= 4) return currentTrend.value
  const indexes = [
    0,
    Math.floor((currentTrend.value.length - 1) / 3),
    Math.floor(((currentTrend.value.length - 1) * 2) / 3),
    currentTrend.value.length - 1,
  ]
  return indexes.map((index) => currentTrend.value[index]).filter((point): point is AnalyticsTimePoint => Boolean(point))
})

const insightBadges = computed(() => {
  const insights = dashboard.value?.insights
  return [
    { label: 'Highest Claim State', value: insights?.highest_claim_state || 'No data' },
    { label: 'Highest Claim Thickness', value: insights?.highest_claim_thickness || 'No data' },
    { label: 'Highest Claim Product', value: insights?.highest_claim_product || 'No data' },
    { label: 'Highest Claim Day Of Week', value: insights?.highest_claim_day_of_week || 'No data' },
  ]
})

const kpiCards = computed(() => {
  if (!dashboard.value) return []
  const summary = dashboard.value.summary
  return [
    { title: 'Total Orders', value: String(summary.total_orders), percentage: null, tone: 'teal' as KpiTone, icon: Squares2X2Icon },
    { title: 'Safety Claimed Orders', value: String(summary.safety_claimed_orders), percentage: formatPercent(summary.safety_claim_rate), tone: 'rose' as KpiTone, icon: ShieldExclamationIcon },
    { title: 'Safety Claim Rate', value: formatPercent(summary.safety_claim_rate), percentage: null, tone: 'amber' as KpiTone, icon: ChartBarIcon },
    { title: 'Returned Orders', value: String(summary.returned_orders), percentage: null, tone: 'sky' as KpiTone, icon: WrenchScrewdriverIcon },
    { title: 'Returned Orders With Safety Claims', value: String(summary.returned_orders_with_safety_claims), percentage: formatPercent(summary.safety_claim_conversion_rate), tone: 'rose' as KpiTone, icon: ExclamationTriangleIcon },
    { title: 'Safety Claim Conversion Rate', value: formatPercent(summary.safety_claim_conversion_rate), percentage: null, tone: 'amber' as KpiTone, icon: ChartBarIcon },
    { title: 'Pending Safety Claims', value: String(summary.pending_safety_claims), percentage: null, tone: 'slate' as KpiTone, icon: ClockIcon },
  ]
})

const maxThicknessClaims = computed(() => Math.max(...(dashboard.value?.thickness_performance.map((row) => row.claims) || [0]), 1))
const maxThicknessRate = computed(() => Math.max(...(dashboard.value?.thickness_performance.map((row) => row.claim_rate) || [0]), 1))
const maxStateClaims = computed(() => Math.max(...(dashboard.value?.state_performance.map((row) => row.claims) || [0]), 1))
const maxCityClaims = computed(() => Math.max(...(dashboard.value?.top_claim_cities.map((row) => row.count) || [0]), 1))
const maxIssueCount = computed(() => Math.max(...(dashboard.value?.safety_claim_issues.map((row) => row.count) || [0]), 1))
const claimStatusSlices = computed(() => (dashboard.value?.claims_by_order_status || []).filter((slice) => slice.count > 0))
const claimStatusTotal = computed(() => claimStatusSlices.value.reduce((sum, slice) => sum + slice.count, 0))

const buildConicGradient = (slices: AnalyticsChartSlice[]) => {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0)
  if (!total) return 'conic-gradient(#e2e8f0 0deg 360deg)'

  let current = 0
  const segments = slices.map((slice, index) => {
    const start = current
    current += (slice.count / total) * 360
    return `${donutPalette[index % donutPalette.length]} ${start}deg ${current}deg`
  })
  return `conic-gradient(${segments.join(', ')})`
}

const statusGradient = computed(() => buildConicGradient(claimStatusSlices.value))

const sortedTopProducts = computed(() =>
  [...(dashboard.value?.top_claim_products || [])]
    .sort((left, right) => right.claim_rate - left.claim_rate || right.claims - left.claims || left.product.localeCompare(right.product)),
)

const sortedCases = computed(() =>
  [...(dashboard.value?.safety_claim_cases || [])]
    .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()),
)

const splitPipeValues = (value: string) => value.split('|').map((part) => part.trim()).filter(Boolean)
const splitCommaValues = (value: string) => value.split(',').map((part) => part.trim()).filter(Boolean)

const drilldownRows = computed(() => {
  if (!dashboard.value || !activeDrilldown.value) return []

  return dashboard.value.order_details.filter((row) => {
    const active = activeDrilldown.value
    if (!active) return true

    if (active.type === 'thickness') return row.safety_claimed && splitCommaValues(row.thickness).includes(active.value)
    if (active.type === 'state') return row.safety_claimed && row.state === active.value
    if (active.type === 'city') return row.safety_claimed && row.city === active.value
    if (active.type === 'issue') return row.safety_claimed && splitPipeValues(row.safety_claim_issues).includes(active.value)
    if (active.type === 'status') return row.safety_claimed && row.order_status === active.value
    if (active.type === 'product') return row.safety_claimed && splitPipeValues(row.product).includes(active.value)
    if (active.type === 'trend' && active.from && active.to) {
      const eventAt = row.event_at ? new Date(row.event_at).getTime() : Number.NaN
      const from = new Date(active.from).getTime()
      const to = new Date(active.to).getTime()
      return row.safety_claimed && !Number.isNaN(eventAt) && eventAt >= from && eventAt < to
    }
    if (active.type === 'funnel') {
      if (active.value === 'total') return true
      if (active.value === 'returned') return row.order_status === 'returned'
      return row.safety_claimed
    }
    return true
  })
})

const toBarHeight = (value: number, max: number) => Math.max((value / Math.max(max, 1)) * 100, value > 0 ? 8 : 0)
const toBarWidth = (value: number, max: number) => Math.max((value / Math.max(max, 1)) * 100, value > 0 ? 8 : 0)

const activateDrilldown = (type: DrilldownType, value: string, title: string) => {
  activeDrilldown.value = { type, value, title }
}

const activateTrendDrilldown = (point: AnalyticsTimePoint) => {
  const start = new Date(point.date)
  const end = new Date(start)
  if (trendGranularity.value === 'weekly') {
    end.setDate(end.getDate() + 7)
  } else if (trendGranularity.value === 'monthly') {
    end.setMonth(end.getMonth() + 1)
  } else {
    end.setDate(end.getDate() + 1)
  }

  activeDrilldown.value = {
    type: 'trend',
    value: point.date,
    title: `Safety Claims Over Time: ${point.label}`,
    from: start.toISOString(),
    to: end.toISOString(),
  }
}

const activateFunnelDrilldown = (stage: 'total' | 'returned' | 'claimed') => {
  const titleMap = {
    total: 'Funnel: Total Orders',
    returned: 'Funnel: Returned Orders',
    claimed: 'Funnel: Safety Claimed Orders',
  }
  activeDrilldown.value = { type: 'funnel', value: stage, title: titleMap[stage] }
}

const trendExportRows = computed<ExportRow[]>(() =>
  currentTrend.value.map((point) => ({
    period: point.label,
    date_key: point.date,
    safety_claims: point.count,
  })),
)

const thicknessExportRows = computed<ExportRow[]>(() =>
  (dashboard.value?.thickness_performance || []).map((row) => ({
    thickness: row.thickness,
    orders: row.orders,
    safety_claims: row.claims,
    claim_rate: formatPercent(row.claim_rate),
  })),
)

const stateExportRows = computed<ExportRow[]>(() =>
  (dashboard.value?.state_performance || []).map((row) => ({
    state: row.state,
    orders: row.orders,
    safety_claims: row.claims,
    claim_rate: formatPercent(row.claim_rate),
  })),
)

const topCitiesExportRows = computed<ExportRow[]>(() =>
  (dashboard.value?.top_claim_cities || []).map((row) => ({
    city: row.label,
    safety_claims: row.count,
  })),
)

const issueExportRows = computed<ExportRow[]>(() =>
  (dashboard.value?.safety_claim_issues || []).map((row) => ({
    safety_claim_issue: row.label,
    count: row.count,
  })),
)

const statusExportRows = computed<ExportRow[]>(() =>
  (dashboard.value?.claims_by_order_status || []).map((row) => ({
    order_status: row.label,
    safety_claims: row.count,
  })),
)

const funnelExportRows = computed<ExportRow[]>(() => {
  const summary = dashboard.value?.summary
  if (!summary) return []

  return [
    { stage: 'Total Orders', count: summary.total_orders },
    { stage: 'Returned Orders', count: summary.returned_orders },
    { stage: 'Safety Claimed Orders', count: summary.safety_claimed_orders },
  ]
})

const productExportRows = computed<ExportRow[]>(() =>
  sortedTopProducts.value.map((row) => ({
    product: row.product,
    orders: row.orders,
    safety_claims: row.claims,
    claim_rate: formatPercent(row.claim_rate),
  })),
)

const caseExportRows = computed<ExportRow[]>(() =>
  sortedCases.value.map((row) => ({
    order_id: row.amazon_order_id,
    confirmed_date: formatDate(row.confirmed_date),
    customer: row.customer,
    phone: row.phone,
    state: row.state,
    city: row.city,
    thickness: row.thickness,
    product: row.product,
    order_status: row.order_status,
    safety_claim_issues: row.safety_claim_issues,
    updated_at: formatDateTime(row.updated_at),
  })),
)

const drilldownExportRows = computed<ExportRow[]>(() =>
  drilldownRows.value.map((row) => ({
    order_id: row.amazon_order_id,
    confirmed_date: formatDate(row.confirmed_date),
    customer: row.customer,
    phone: row.phone,
    state: row.state,
    city: row.city,
    thickness: row.thickness,
    product: row.product,
    order_status: row.order_status,
    safety_claimed: row.safety_claimed ? 'Yes' : 'No',
    safety_claim_issues: row.safety_claim_issues,
    updated_at: formatDateTime(row.updated_at),
  })),
)

const exportRows = (title: string, rows: ExportRow[], type: 'csv' | 'excel' | 'pdf') => {
  if (!rows.length) return
  if (type === 'csv') {
    exportRowsAsCsv(`${title}.csv`, rows)
    return
  }
  if (type === 'excel') {
    exportRowsAsExcel(`${title}.xls`, title, rows)
    return
  }
  exportRowsAsPdf(title, rows)
}

const refreshDashboard = async () => {
  loading.value = true
  error.value = ''

  try {
    dashboard.value = await ordersApi.getSafetyClaimsDashboard({
      dateRange: 'custom_range',
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
      state: filters.state.trim() || undefined,
      city: filters.city.trim() || undefined,
      thickness: filters.thickness || undefined,
      orderStatus: filters.orderStatus || undefined,
      safetyClaimed: filters.safetyClaimed || undefined,
    })
  } catch (err: any) {
    error.value = err?.response?.data?.error || err?.message || 'Failed to load safety claims analytics'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  initializeDateRange()
  void refreshDashboard()
})
</script>

<style scoped>
.safety-analytics {
  max-width: 1880px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.hero-card,
.filter-panel,
.insights-panel,
.table-card,
.chart-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  box-shadow: 0 20px 44px rgba(15, 23, 42, 0.08);
}

.hero-card {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  background:
    radial-gradient(circle at top right, rgba(225, 29, 72, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
}

.hero-copy {
  margin: 0.65rem 0 0;
  max-width: 60rem;
  color: #475569;
  line-height: 1.65;
}

.hero-meta {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.meta-pill {
  padding: 0.6rem 0.95rem;
  border-radius: 999px;
  background: rgba(254, 242, 242, 0.9);
  color: #be123c;
  border: 1px solid rgba(244, 63, 94, 0.16);
  font-weight: 700;
}

.eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
  font-weight: 800;
  color: #0f766e;
}

h1,
h2 {
  margin: 0;
  color: #0f172a;
}

h1 {
  font-size: clamp(2rem, 4vw, 2.8rem);
}

h2 {
  font-size: 1.18rem;
}

.filter-panel,
.insights-panel,
.table-card,
.chart-card {
  padding: 1.2rem;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.95rem;
  align-items: end;
}

.filter-field {
  display: grid;
  gap: 0.45rem;
}

.filter-field span {
  font-size: 0.82rem;
  font-weight: 800;
  color: #475569;
}

.filter-input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 16px;
  padding: 0.82rem 0.95rem;
  font: inherit;
  color: #0f172a;
  background: #fff;
}

.filter-input:focus {
  outline: none;
  border-color: #14b8a6;
  box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.14);
}

.filter-actions,
.section-header__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.refresh-button,
.export-button,
.clear-button,
.segmented-control__button,
.axis-trigger,
.inline-link {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  border-radius: 999px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.filter-actions {
  align-items: flex-end;
}

.refresh-button {
  min-height: 3.1rem;
  min-width: 10.5rem;
  padding: 0.85rem 1.2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  border: 0;
  background: linear-gradient(135deg, #0f766e, #0d9488);
  color: #ffffff;
  font-weight: 800;
  box-shadow: 0 12px 24px rgba(15, 118, 110, 0.18);
  transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
}

.refresh-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 16px 30px rgba(15, 118, 110, 0.22);
  filter: saturate(1.04);
}

.refresh-button:disabled {
  cursor: wait;
  opacity: 0.7;
  box-shadow: none;
}

.refresh-button__icon {
  width: 1rem;
  height: 1rem;
}

.insight-grid,
.kpi-grid {
  display: grid;
  gap: 1rem;
}

.insight-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.insight-badge {
  padding: 1rem 1.05rem;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.96));
  border: 1px solid rgba(203, 213, 225, 0.82);
  display: grid;
  gap: 0.35rem;
}

.insight-badge__label {
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.insight-badge strong {
  color: #0f172a;
  font-size: 1.15rem;
}

.kpi-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.chart-grid {
  display: grid;
  gap: 1rem;
}

.chart-grid--double {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.section-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.section-header--tight {
  margin-bottom: 0.85rem;
}

.export-actions {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.export-button,
.clear-button {
  padding: 0.55rem 0.85rem;
}

.segmented-control {
  display: inline-flex;
  padding: 0.2rem;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.segmented-control__button {
  padding: 0.48rem 0.8rem;
  border-color: transparent;
}

.segmented-control__button--active {
  background: #0f766e;
  color: #ffffff;
}

.empty-card {
  min-height: 220px;
  display: grid;
  place-items: center;
  border: 1px dashed rgba(148, 163, 184, 0.52);
  border-radius: 20px;
  color: #64748b;
  font-weight: 700;
}

.trend-visual {
  display: grid;
  gap: 0.75rem;
}

.trend-svg {
  width: 100%;
  height: 250px;
}

.trend-grid {
  stroke: rgba(148, 163, 184, 0.24);
  stroke-dasharray: 4 6;
}

.trend-axis {
  fill: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
}

.trend-line {
  fill: none;
  stroke: #0f766e;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-dot {
  fill: #0f766e;
}

.trend-hit {
  fill: transparent;
  cursor: pointer;
}

.trend-axis-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 0.5rem;
}

.axis-trigger {
  padding: 0.45rem 0.6rem;
}

.funnel {
  min-height: 250px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.75rem;
}

.funnel-stage {
  border: 0;
  border-radius: 24px;
  padding: 1rem 1.2rem;
  color: #ffffff;
  display: grid;
  gap: 0.3rem;
  text-align: center;
  cursor: pointer;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
}

.funnel-stage span {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 800;
}

.funnel-stage strong {
  font-size: 1.7rem;
}

.funnel-stage--wide {
  width: min(100%, 420px);
  background: linear-gradient(135deg, #0f766e, #14b8a6);
}

.funnel-stage--mid {
  width: min(100%, 320px);
  background: linear-gradient(135deg, #2563eb, #38bdf8);
}

.funnel-stage--narrow {
  width: min(100%, 220px);
  background: linear-gradient(135deg, #e11d48, #fb7185);
}

.funnel-arrow {
  color: #94a3b8;
  font-size: 1.4rem;
  font-weight: 800;
}

.vertical-bars {
  min-height: 260px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  align-items: end;
}

.vertical-bar {
  border: 1px solid rgba(203, 213, 225, 0.8);
  background: rgba(248, 250, 252, 0.88);
  cursor: pointer;
  padding: 0.9rem 0.8rem;
  border-radius: 22px;
  display: grid;
  gap: 0.7rem;
  justify-items: center;
}

.vertical-bar__value {
  color: #0f172a;
  font-weight: 800;
}

.vertical-bar__track {
  width: 100%;
  min-height: 150px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(226, 232, 240, 0.9), rgba(241, 245, 249, 0.9));
  display: flex;
  align-items: flex-end;
  padding: 0.35rem;
}

.vertical-bar__fill {
  width: 100%;
  border-radius: 14px;
  background: linear-gradient(180deg, #0f766e, #0d9488);
}

.vertical-bar--amber .vertical-bar__fill {
  background: linear-gradient(180deg, #f59e0b, #f97316);
}

.vertical-bar__label {
  color: #475569;
  font-weight: 800;
}

.horizontal-list,
.legend-list {
  display: grid;
  gap: 0.7rem;
}

.horizontal-row,
.legend-button {
  border: 1px solid rgba(203, 213, 225, 0.8);
  background: rgba(248, 250, 252, 0.88);
  cursor: pointer;
}

.horizontal-row {
  padding: 0.85rem 0.95rem;
  border-radius: 18px;
  display: grid;
  grid-template-columns: minmax(120px, 220px) minmax(0, 1fr) auto;
  gap: 0.9rem;
  align-items: center;
}

.horizontal-row__label {
  color: #0f172a;
  font-weight: 700;
  text-align: left;
}

.horizontal-row__bar {
  height: 0.9rem;
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.9);
  overflow: hidden;
}

.horizontal-row__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #0f766e, #14b8a6);
}

.horizontal-row--sky .horizontal-row__fill {
  background: linear-gradient(90deg, #2563eb, #38bdf8);
}

.horizontal-row--amber .horizontal-row__fill {
  background: linear-gradient(90deg, #f59e0b, #f97316);
}

.horizontal-row__stats {
  color: #475569;
  font-weight: 700;
  white-space: nowrap;
}

.pie-layout {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 1rem;
  align-items: center;
}

.donut-shell {
  display: grid;
  place-items: center;
}

.donut {
  width: 168px;
  height: 168px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.donut__center {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.98);
  display: grid;
  place-items: center;
  text-align: center;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.09);
}

.donut__center strong {
  color: #0f172a;
  font-size: 1.25rem;
}

.donut__center span {
  color: #64748b;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.legend-button {
  padding: 0.8rem 0.9rem;
  border-radius: 18px;
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  gap: 0.8rem;
  align-items: center;
}

.legend-button__swatch {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}

.legend-button__label {
  color: #0f172a;
  font-weight: 700;
  text-align: left;
}

.legend-button__meta {
  color: #475569;
  font-weight: 700;
}

.table-wrap {
  overflow: auto;
}

.data-table {
  width: 100%;
  min-width: 1160px;
  border-collapse: collapse;
}

.data-table th {
  padding: 0.8rem 0.7rem;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #0f766e;
}

.data-table td {
  padding: 0.85rem 0.7rem;
  border-bottom: 1px solid #f1f5f9;
  color: #0f172a;
  vertical-align: top;
}

.status-pill,
.boolean-pill,
.view-link {
  border-radius: 999px;
  font-weight: 700;
}

.status-pill {
  display: inline-flex;
  padding: 0.42rem 0.75rem;
  background: rgba(226, 232, 240, 0.82);
  color: #0f172a;
}

.boolean-pill {
  display: inline-flex;
  padding: 0.42rem 0.75rem;
}

.boolean-pill--true {
  background: rgba(220, 252, 231, 0.92);
  color: #166534;
}

.boolean-pill--false {
  background: rgba(241, 245, 249, 0.96);
  color: #475569;
}

.view-link,
.inline-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 0.85rem;
  border: 1px solid rgba(37, 99, 235, 0.14);
  color: #2563eb;
  background: rgba(239, 246, 255, 0.9);
  text-decoration: none;
}

.table-card--accent {
  border-color: rgba(20, 184, 166, 0.28);
  box-shadow: 0 20px 44px rgba(20, 184, 166, 0.12);
}

.table-skeleton {
  display: grid;
  gap: 0.7rem;
}

.skeleton {
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  background: linear-gradient(90deg, rgba(226, 232, 240, 0.84), rgba(241, 245, 249, 0.96), rgba(226, 232, 240, 0.84));
}

.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.72), transparent);
  animation: shimmer 1.4s infinite;
}

.skeleton--badge {
  min-height: 90px;
}

.skeleton--card {
  min-height: 120px;
}

.skeleton--chart {
  min-height: 280px;
}

.skeleton--row {
  min-height: 64px;
}

.error-banner {
  padding: 0.95rem 1.1rem;
  border-radius: 18px;
  background: rgba(254, 226, 226, 0.92);
  border: 1px solid rgba(239, 68, 68, 0.16);
  color: #b91c1c;
  font-weight: 700;
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

@media (max-width: 1180px) {
  .chart-grid--double,
  .pie-layout {
    grid-template-columns: 1fr;
  }

  .horizontal-row {
    grid-template-columns: 1fr;
  }

  .horizontal-row__stats {
    white-space: normal;
  }
}

@media (max-width: 760px) {
  .hero-card,
  .section-header {
    flex-direction: column;
  }

  .hero-meta,
  .filter-actions,
  .section-header__actions {
    justify-content: flex-start;
  }

  .filter-actions,
  .refresh-button {
    width: 100%;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .vertical-bars {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
