<template>
  <div class="returns-analytics">
    <section class="hero-card">
      <div>
        <p class="eyebrow">Return performance intelligence</p>
        <h1>Return Analytics</h1>
        <p class="hero-copy">
          Detailed analytics for return initiated orders, compromise signals, follow-up actions, and pending return workload.
        </p>
      </div>
      <div class="hero-meta">
        <span class="meta-pill">{{ dashboard?.summary.total_orders ?? 0 }} filtered orders</span>
        <span class="meta-pill">{{ dashboard?.summary.returns_initiated ?? 0 }} initiated returns</span>
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
            list="returns-analytics-states"
            class="filter-input"
            placeholder="All States"
          />
          <datalist id="returns-analytics-states">
            <option v-for="state in dashboard?.available_states || []" :key="state" :value="state" />
          </datalist>
        </label>

        <label class="filter-field">
          <span>City</span>
          <input
            v-model="filters.city"
            list="returns-analytics-cities"
            class="filter-input"
            placeholder="All Cities"
          />
          <datalist id="returns-analytics-cities">
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
          <span>Return Initiated</span>
          <select v-model="filters.returnInitiated" class="filter-input">
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>

        <label class="filter-field">
          <span>Return Compromised</span>
          <select v-model="filters.returnInitiatedCompromised" class="filter-input">
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

    <section class="kpi-section">
      <div v-if="loading" class="kpi-grid">
        <div v-for="index in 8" :key="`returns-kpi-${index}`" class="skeleton skeleton--card" />
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
            <h2>Returns Trend</h2>
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
              <button type="button" class="export-button" @click="exportRows('returns-trend', trendExportRows, 'csv')">CSV</button>
              <button type="button" class="export-button" @click="exportRows('returns-trend', trendExportRows, 'excel')">Excel</button>
              <button type="button" class="export-button" @click="exportRows('returns-trend', trendExportRows, 'pdf')">PDF</button>
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
              :key="`trend-label-${tick.value}`"
              x="40"
              :y="tick.y + 4"
              text-anchor="end"
              class="trend-axis"
            >
              {{ formatCompactNumber(tick.value) }}
            </text>

            <path :d="trendAreaPath" fill="url(#returns-trend-fill)" />
            <defs>
              <linearGradient id="returns-trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#0f766e" stop-opacity="0.28" />
                <stop offset="100%" stop-color="#0f766e" stop-opacity="0.04" />
              </linearGradient>
            </defs>
            <path :d="trendLinePath" class="trend-line" />

            <g v-for="point in plottedTrendPoints" :key="point.date">
              <circle :cx="point.x" :cy="point.y" r="4" class="trend-dot" />
              <circle
                :cx="point.x"
                :cy="point.y"
                r="12"
                class="trend-hit"
                @click="activateTrendDrilldown(point)"
              />
            </g>
          </svg>

          <div class="trend-axis-row">
            <button
              v-for="point in xAxisTrendPoints"
              :key="`trend-axis-${point.date}`"
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
            <h2>Return Funnel</h2>
          </div>
          <div class="export-actions">
            <button type="button" class="export-button" @click="exportRows('return-funnel', funnelExportRows, 'csv')">CSV</button>
            <button type="button" class="export-button" @click="exportRows('return-funnel', funnelExportRows, 'excel')">Excel</button>
            <button type="button" class="export-button" @click="exportRows('return-funnel', funnelExportRows, 'pdf')">PDF</button>
          </div>
        </header>

        <div v-if="loading" class="skeleton skeleton--chart" />
        <div v-else-if="!returnFunnelStages.length || !dashboard?.summary.total_orders" class="empty-card">No Data Available</div>
        <div v-else class="funnel-card">
          <div class="funnel-pyramid">
            <button
              v-for="stage in returnFunnelStages"
              :key="stage.key"
              type="button"
              class="funnel-stage"
              :style="{ width: `${stage.width}%`, background: stage.gradient }"
              @click="activateFunnelDrilldown(stage.key)"
            >
              <span>{{ stage.label }}</span>
              <strong>{{ stage.count }}</strong>
              <small>{{ formatPercent(stage.rate) }}</small>
            </button>
          </div>
          <div class="legend-list">
            <button
              v-for="stage in returnFunnelStages"
              :key="`legend-${stage.key}`"
              type="button"
              class="legend-button"
              @click="activateFunnelDrilldown(stage.key)"
            >
              <span class="legend-button__swatch" :style="{ background: stage.color }" />
              <span class="legend-button__label">{{ stage.label }}</span>
              <span class="legend-button__meta">{{ stage.count }} · {{ formatPercent(stage.rate) }}</span>
            </button>
          </div>
        </div>
      </article>
    </section>

    <section class="chart-grid chart-grid--double">
      <article class="chart-card">
        <header class="section-header">
          <div>
            <p class="eyebrow">Chart 2</p>
            <h2>Returns By Thickness</h2>
          </div>
          <div class="export-actions">
            <button type="button" class="export-button" @click="exportRows('returns-by-thickness', thicknessExportRows, 'csv')">CSV</button>
            <button type="button" class="export-button" @click="exportRows('returns-by-thickness', thicknessExportRows, 'excel')">Excel</button>
            <button type="button" class="export-button" @click="exportRows('returns-by-thickness', thicknessExportRows, 'pdf')">PDF</button>
          </div>
        </header>

        <div v-if="loading" class="skeleton skeleton--chart" />
        <div v-else-if="!dashboard?.thickness_performance.length" class="empty-card">No Data Available</div>
        <div v-else class="vertical-bars">
          <button
            v-for="row in dashboard.thickness_performance"
            :key="`returns-${row.thickness}`"
            type="button"
            class="vertical-bar"
            @click="activateDrilldown('thickness', row.thickness, `${row.thickness} returns`)"
          >
            <span class="vertical-bar__value">{{ row.returns }}</span>
            <span class="vertical-bar__track">
              <span class="vertical-bar__fill" :style="{ height: `${toBarHeight(row.returns, maxThicknessReturns)}%` }" />
            </span>
            <span class="vertical-bar__label">{{ row.thickness }}</span>
          </button>
        </div>
      </article>

      <article class="chart-card">
        <header class="section-header">
          <div>
            <p class="eyebrow">Chart 3</p>
            <h2>Return Rate By Thickness</h2>
          </div>
          <div class="export-actions">
            <button type="button" class="export-button" @click="exportRows('return-rate-by-thickness', thicknessExportRows, 'csv')">CSV</button>
            <button type="button" class="export-button" @click="exportRows('return-rate-by-thickness', thicknessExportRows, 'excel')">Excel</button>
            <button type="button" class="export-button" @click="exportRows('return-rate-by-thickness', thicknessExportRows, 'pdf')">PDF</button>
          </div>
        </header>

        <div v-if="loading" class="skeleton skeleton--chart" />
        <div v-else-if="!dashboard?.thickness_performance.length" class="empty-card">No Data Available</div>
        <div v-else class="vertical-bars">
          <button
            v-for="row in dashboard.thickness_performance"
            :key="`rate-${row.thickness}`"
            type="button"
            class="vertical-bar vertical-bar--rose"
            @click="activateDrilldown('thickness', row.thickness, `${row.thickness} return rate`)"
          >
            <span class="vertical-bar__value">{{ formatPercent(row.return_rate) }}</span>
            <span class="vertical-bar__track">
              <span class="vertical-bar__fill" :style="{ height: `${toBarHeight(row.return_rate, maxThicknessRate)}%` }" />
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
            <h2>Returns By State</h2>
          </div>
          <div class="export-actions">
            <button type="button" class="export-button" @click="exportRows('returns-by-state', stateExportRows, 'csv')">CSV</button>
            <button type="button" class="export-button" @click="exportRows('returns-by-state', stateExportRows, 'excel')">Excel</button>
            <button type="button" class="export-button" @click="exportRows('returns-by-state', stateExportRows, 'pdf')">PDF</button>
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
            @click="activateDrilldown('state', row.state, `${row.state} returns`)"
          >
            <span class="horizontal-row__label">{{ row.state }}</span>
            <span class="horizontal-row__bar">
              <span class="horizontal-row__fill" :style="{ width: `${toBarWidth(row.returns, maxStateReturns)}%` }" />
            </span>
            <span class="horizontal-row__stats">{{ row.orders }} orders · {{ row.returns }} returns · {{ formatPercent(row.return_rate) }}</span>
          </button>
        </div>
      </article>

      <article class="chart-card">
        <header class="section-header">
          <div>
            <p class="eyebrow">Chart 5</p>
            <h2>Top 20 Cities With Returns</h2>
          </div>
          <div class="export-actions">
            <button type="button" class="export-button" @click="exportRows('top-return-cities', topCitiesExportRows, 'csv')">CSV</button>
            <button type="button" class="export-button" @click="exportRows('top-return-cities', topCitiesExportRows, 'excel')">Excel</button>
            <button type="button" class="export-button" @click="exportRows('top-return-cities', topCitiesExportRows, 'pdf')">PDF</button>
          </div>
        </header>

        <div v-if="loading" class="skeleton skeleton--chart" />
        <div v-else-if="!dashboard?.top_return_cities.length" class="empty-card">No Data Available</div>
        <div v-else class="horizontal-list">
          <button
            v-for="slice in dashboard.top_return_cities"
            :key="slice.label"
            type="button"
            class="horizontal-row horizontal-row--sky"
            @click="activateDrilldown('city', slice.label, `${slice.label} returns`)"
          >
            <span class="horizontal-row__label">{{ slice.label }}</span>
            <span class="horizontal-row__bar">
              <span class="horizontal-row__fill" :style="{ width: `${toBarWidth(slice.count, maxCityReturns)}%` }" />
            </span>
            <span class="horizontal-row__stats">{{ slice.count }} returns</span>
          </button>
        </div>
      </article>
    </section>

    <section class="chart-grid chart-grid--double">
      <article class="chart-card">
        <header class="section-header">
          <div>
            <p class="eyebrow">Chart 6</p>
            <h2>Return Reasons</h2>
          </div>
          <div class="export-actions">
            <button type="button" class="export-button" @click="exportRows('return-reasons', returnReasonsExportRows, 'csv')">CSV</button>
            <button type="button" class="export-button" @click="exportRows('return-reasons', returnReasonsExportRows, 'excel')">Excel</button>
            <button type="button" class="export-button" @click="exportRows('return-reasons', returnReasonsExportRows, 'pdf')">PDF</button>
          </div>
        </header>

        <div v-if="loading" class="skeleton skeleton--chart" />
        <div v-else-if="!dashboard?.return_reasons.length" class="empty-card">No Data Available</div>
        <div v-else class="horizontal-list">
          <button
            v-for="slice in dashboard.return_reasons"
            :key="slice.label"
            type="button"
            class="horizontal-row horizontal-row--amber"
            @click="activateDrilldown('reason', slice.label, `Reason: ${slice.label}`)"
          >
            <span class="horizontal-row__label">{{ slice.label }}</span>
            <span class="horizontal-row__bar">
              <span class="horizontal-row__fill" :style="{ width: `${toBarWidth(slice.count, maxReasonCount)}%` }" />
            </span>
            <span class="horizontal-row__stats">{{ slice.count }} rows</span>
          </button>
        </div>
      </article>

      <article class="chart-card">
        <header class="section-header">
          <div>
            <p class="eyebrow">Chart 7</p>
            <h2>Follow-Up Actions</h2>
          </div>
          <div class="export-actions">
            <button type="button" class="export-button" @click="exportRows('followup-actions', followupExportRows, 'csv')">CSV</button>
            <button type="button" class="export-button" @click="exportRows('followup-actions', followupExportRows, 'excel')">Excel</button>
            <button type="button" class="export-button" @click="exportRows('followup-actions', followupExportRows, 'pdf')">PDF</button>
          </div>
        </header>

        <div v-if="loading" class="skeleton skeleton--chart" />
        <div v-else-if="!followupSlices.length" class="empty-card">No Data Available</div>
        <div v-else class="pie-layout">
          <div class="donut-shell">
            <div class="donut donut--alt" :style="{ background: followupGradient }">
              <div class="donut__center">
                <strong>{{ followupTotal }}</strong>
                <span>actions</span>
              </div>
            </div>
          </div>
          <div class="legend-list">
            <button
              v-for="(slice, index) in followupSlices"
              :key="slice.label"
              type="button"
              class="legend-button"
              @click="activateDrilldown('followup', slice.label, `Follow-up: ${slice.label}`)"
            >
              <span class="legend-button__swatch" :style="{ background: donutPalette[index % donutPalette.length] }" />
              <span class="legend-button__label">{{ slice.label }}</span>
              <span class="legend-button__meta">{{ slice.count }} · {{ formatPercent((slice.count / Math.max(followupTotal, 1)) * 100) }}</span>
            </button>
          </div>
        </div>
      </article>
    </section>

    <section class="chart-grid">
      <article class="chart-card">
        <header class="section-header">
          <div>
            <p class="eyebrow">Chart 9</p>
            <h2>Returns By Order Status</h2>
          </div>
          <div class="export-actions">
            <button type="button" class="export-button" @click="exportRows('returns-by-order-status', statusExportRows, 'csv')">CSV</button>
            <button type="button" class="export-button" @click="exportRows('returns-by-order-status', statusExportRows, 'excel')">Excel</button>
            <button type="button" class="export-button" @click="exportRows('returns-by-order-status', statusExportRows, 'pdf')">PDF</button>
          </div>
        </header>

        <div v-if="loading" class="skeleton skeleton--chart" />
        <div v-else-if="!dashboard?.returns_by_order_status.length" class="empty-card">No Data Available</div>
        <div v-else class="stack-card">
          <div class="stack-bar">
            <button
              v-for="slice in dashboard.returns_by_order_status"
              :key="slice.label"
              type="button"
              class="stack-bar__segment"
              :style="{ width: `${(slice.count / Math.max(statusTotal, 1)) * 100}%`, background: orderStatusColor(slice.label) }"
              @click="activateDrilldown('status', slice.label, `${slice.label} return orders`)"
            >
              <span>{{ slice.label }}</span>
              <strong>{{ slice.count }}</strong>
            </button>
          </div>
          <div class="stack-legend">
            <button
              v-for="slice in dashboard.returns_by_order_status"
              :key="`legend-${slice.label}`"
              type="button"
              class="stack-legend__item"
              @click="activateDrilldown('status', slice.label, `${slice.label} return orders`)"
            >
              <span class="stack-legend__swatch" :style="{ background: orderStatusColor(slice.label) }" />
              {{ slice.label }} · {{ slice.count }}
            </button>
          </div>
        </div>
      </article>
    </section>

    <section class="table-card">
      <header class="section-header">
        <div>
          <p class="eyebrow">Pending Return Cases</p>
          <h2>Pending Return Cases</h2>
        </div>
        <div class="export-actions">
          <button type="button" class="export-button" @click="exportRows('pending-return-cases', pendingExportRows, 'csv')">CSV</button>
          <button type="button" class="export-button" @click="exportRows('pending-return-cases', pendingExportRows, 'excel')">Excel</button>
          <button type="button" class="export-button" @click="exportRows('pending-return-cases', pendingExportRows, 'pdf')">PDF</button>
        </div>
      </header>

      <div v-if="loading" class="table-skeleton">
        <div v-for="index in 7" :key="`pending-skeleton-${index}`" class="skeleton skeleton--row" />
      </div>
      <div v-else-if="!sortedPendingRows.length" class="empty-card">No Data Available</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th v-for="column in pendingColumns" :key="column.key">
                <button type="button" class="sort-button" @click="setPendingSort(column.key)">
                  {{ column.label }}
                  <span v-if="pendingSortKey === column.key">{{ pendingSortDir === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in sortedPendingRows" :key="`pending-${row.amazon_order_id}`">
              <td>{{ row.amazon_order_id }}</td>
              <td>{{ formatDate(row.confirmed_date) }}</td>
              <td>{{ row.customer }}</td>
              <td>{{ row.phone }}</td>
              <td>{{ row.state }}</td>
              <td>{{ row.city }}</td>
              <td>{{ row.thickness }}</td>
              <td>{{ formatCompactNumber(row.quantity) }}</td>
              <td>{{ row.return_reason }}</td>
              <td>{{ row.followup_action }}</td>
              <td><span :class="booleanPillClass(row.compromised)">{{ row.compromised ? 'Yes' : 'No' }}</span></td>
              <td><span class="status-pill">{{ row.order_status }}</span></td>
              <td>{{ formatDateTime(row.updated_at) }}</td>
              <td><router-link :to="`/orders/${row.amazon_order_id}`" class="view-link">View</router-link></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="table-card">
      <header class="section-header">
        <div>
          <p class="eyebrow">Top Returning Products</p>
          <h2>Top Returning Products</h2>
        </div>
        <div class="export-actions">
          <button type="button" class="export-button" @click="exportRows('top-returning-products', productExportRows, 'csv')">CSV</button>
          <button type="button" class="export-button" @click="exportRows('top-returning-products', productExportRows, 'excel')">Excel</button>
          <button type="button" class="export-button" @click="exportRows('top-returning-products', productExportRows, 'pdf')">PDF</button>
        </div>
      </header>

      <div v-if="loading" class="table-skeleton">
        <div v-for="index in 7" :key="`product-skeleton-${index}`" class="skeleton skeleton--row" />
      </div>
      <div v-else-if="!sortedTopProducts.length" class="empty-card">No Data Available</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th v-for="column in productColumns" :key="column.key">
                <button type="button" class="sort-button" @click="setProductSort(column.key)">
                  {{ column.label }}
                  <span v-if="productSortKey === column.key">{{ productSortDir === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
              <th>Drill Down</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in sortedTopProducts" :key="row.product">
              <td>{{ row.product }}</td>
              <td>{{ row.orders }}</td>
              <td>{{ row.returns }}</td>
              <td>{{ formatPercent(row.return_rate) }}</td>
              <td>
                <button type="button" class="inline-link" @click="activateDrilldown('product', row.product, `Product: ${row.product}`)">
                  View matching returns
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="activeDrilldown" class="table-card table-card--accent">
      <header class="section-header">
        <div>
          <p class="eyebrow">Drill Down</p>
          <h2>{{ activeDrilldown.title }}</h2>
        </div>
        <div class="section-header__actions">
          <div class="export-actions">
            <button type="button" class="export-button" @click="exportRows('return-drilldown', drilldownExportRows, 'csv')">CSV</button>
            <button type="button" class="export-button" @click="exportRows('return-drilldown', drilldownExportRows, 'excel')">Excel</button>
            <button type="button" class="export-button" @click="exportRows('return-drilldown', drilldownExportRows, 'pdf')">PDF</button>
          </div>
          <button type="button" class="clear-button" @click="activeDrilldown = null">Clear</button>
        </div>
      </header>

      <div v-if="!drilldownRows.length" class="empty-card">No Data Available</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Confirmed Date</th>
              <th>Product</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>State</th>
              <th>City</th>
              <th>Thickness</th>
              <th>Quantity</th>
              <th>Return Reason</th>
              <th>Follow-up Action</th>
              <th>Compromised</th>
              <th>Order Status</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in drilldownRows" :key="`drilldown-${row.amazon_order_id}-${row.updated_at}`">
              <td>{{ row.amazon_order_id }}</td>
              <td>{{ formatDate(row.confirmed_date) }}</td>
              <td>{{ row.product }}</td>
              <td>{{ row.customer }}</td>
              <td>{{ row.phone }}</td>
              <td>{{ row.state }}</td>
              <td>{{ row.city }}</td>
              <td>{{ row.thickness }}</td>
              <td>{{ formatCompactNumber(row.quantity) }}</td>
              <td>{{ row.return_reason }}</td>
              <td>{{ row.followup_action }}</td>
              <td><span :class="booleanPillClass(row.compromised)">{{ row.compromised ? 'Yes' : 'No' }}</span></td>
              <td><span class="status-pill">{{ row.order_status }}</span></td>
              <td>{{ formatDateTime(row.updated_at) }}</td>
              <td><router-link :to="`/orders/${row.amazon_order_id}`" class="view-link">View</router-link></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="error" class="error-banner">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  Squares2X2Icon,
  WrenchScrewdriverIcon,
} from '@heroicons/vue/24/outline'
import { ordersApi } from '@/api/orders'
import ExecutiveKpiCard from '@/components/ExecutiveKpiCard.vue'
import type {
  AnalyticsChartSlice,
  AnalyticsTimePoint,
  ReturnsDashboardDetailRow,
  ReturnsDashboardPendingRow,
  ReturnsDashboardResponse,
  ReturnsDashboardTopProductRow,
} from '@/types'
import { exportRowsAsCsv, exportRowsAsExcel, exportRowsAsPdf, type ExportRow } from '@/utils/exportData'

type KpiTone = 'teal' | 'amber' | 'rose' | 'sky' | 'slate'
type TrendGranularity = 'daily' | 'weekly' | 'monthly'
type FunnelStageKey = 'total' | 'initiated' | 'compromised'
type PendingSortKey =
  | 'amazon_order_id'
  | 'confirmed_date'
  | 'customer'
  | 'phone'
  | 'state'
  | 'city'
  | 'thickness'
  | 'quantity'
  | 'return_reason'
  | 'followup_action'
  | 'compromised'
  | 'order_status'
  | 'updated_at'
type ProductSortKey = 'product' | 'orders' | 'returns' | 'return_rate'
type DrilldownType = 'trend' | 'thickness' | 'state' | 'city' | 'reason' | 'followup' | 'compromised' | 'status' | 'product' | 'funnel'

type DrilldownState = {
  type: DrilldownType
  title: string
  value: string
  from?: string
  to?: string
}

const dashboard = ref<ReturnsDashboardResponse | null>(null)
const loading = ref(false)
const error = ref('')
const trendGranularity = ref<TrendGranularity>('daily')
const activeDrilldown = ref<DrilldownState | null>(null)
const pendingSortKey = ref<PendingSortKey>('updated_at')
const pendingSortDir = ref<'asc' | 'desc'>('desc')
const productSortKey = ref<ProductSortKey>('return_rate')
const productSortDir = ref<'asc' | 'desc'>('desc')

const filters = reactive({
  fromDate: '',
  toDate: '',
  state: '',
  city: '',
  thickness: '',
  orderStatus: '',
  returnInitiated: '',
  returnInitiatedCompromised: '',
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

const pendingColumns: Array<{ key: PendingSortKey; label: string }> = [
  { key: 'amazon_order_id', label: 'Order ID' },
  { key: 'confirmed_date', label: 'Confirmed Date' },
  { key: 'customer', label: 'Customer' },
  { key: 'phone', label: 'Phone' },
  { key: 'state', label: 'State' },
  { key: 'city', label: 'City' },
  { key: 'thickness', label: 'Thickness' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'return_reason', label: 'Return Reason' },
  { key: 'followup_action', label: 'Follow-up Action' },
  { key: 'compromised', label: 'Compromised' },
  { key: 'order_status', label: 'Order Status' },
  { key: 'updated_at', label: 'Last Updated' },
]

const productColumns: Array<{ key: ProductSortKey; label: string }> = [
  { key: 'product', label: 'Product' },
  { key: 'orders', label: 'Orders' },
  { key: 'returns', label: 'Returns' },
  { key: 'return_rate', label: 'Return %' },
]

const donutPalette = ['#0f766e', '#2563eb', '#f59e0b', '#e11d48', '#475569', '#14b8a6']

const formatCompactNumber = (value: number) => {
  if (Math.abs(value % 1) < 0.001) return value.toFixed(0)
  return value.toFixed(2)
}

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

const orderStatusColor = (status: string) => {
  const normalized = status.trim().toLowerCase()
  if (normalized === 'received') return '#0f766e'
  if (normalized === 'manufactured') return '#2563eb'
  if (normalized === 'cancelled') return '#f59e0b'
  if (normalized === 'returned') return '#e11d48'
  return '#64748b'
}

const currentTrend = computed(() => {
  if (!dashboard.value) return []
  if (trendGranularity.value === 'weekly') return dashboard.value.returns_trend_weekly
  if (trendGranularity.value === 'monthly') return dashboard.value.returns_trend_monthly
  return dashboard.value.returns_trend_daily
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
  return indexes
    .map((index) => currentTrend.value[index])
    .filter((point): point is AnalyticsTimePoint => Boolean(point))
})

const maxThicknessReturns = computed(() => Math.max(...(dashboard.value?.thickness_performance.map((row) => row.returns) || [0]), 1))
const maxThicknessRate = computed(() => Math.max(...(dashboard.value?.thickness_performance.map((row) => row.return_rate) || [0]), 1))
const maxStateReturns = computed(() => Math.max(...(dashboard.value?.state_performance.map((row) => row.returns) || [0]), 1))
const maxCityReturns = computed(() => Math.max(...(dashboard.value?.top_return_cities.map((row) => row.count) || [0]), 1))
const maxReasonCount = computed(() => Math.max(...(dashboard.value?.return_reasons.map((row) => row.count) || [0]), 1))

const followupSlices = computed(() => (dashboard.value?.followup_actions || []).filter((slice) => slice.count > 0))
const compromisedSlices = computed(() => (dashboard.value?.compromised_breakdown || []).filter((slice) => slice.count > 0))
const followupTotal = computed(() => followupSlices.value.reduce((sum, slice) => sum + slice.count, 0))
const compromisedTotal = computed(() => compromisedSlices.value.reduce((sum, slice) => sum + slice.count, 0))
const statusTotal = computed(() => (dashboard.value?.returns_by_order_status || []).reduce((sum, slice) => sum + slice.count, 0))

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

const followupGradient = computed(() => buildConicGradient(followupSlices.value))
const compromisedGradient = computed(() => buildConicGradient(compromisedSlices.value))
const returnFunnelStages = computed(() => {
  const summary = dashboard.value?.summary
  if (!summary) return []

  const totalOrders = Math.max(summary.total_orders, 1)

  return [
    {
      key: 'total' as FunnelStageKey,
      label: 'Total Orders',
      count: summary.total_orders,
      rate: 100,
      width: 100,
      color: '#0f766e',
      gradient: 'linear-gradient(135deg, #0f766e, #14b8a6)',
    },
    {
      key: 'initiated' as FunnelStageKey,
      label: 'Return Initiated',
      count: summary.returns_initiated,
      rate: (summary.returns_initiated / totalOrders) * 100,
      width: Math.max((summary.returns_initiated / totalOrders) * 100, summary.returns_initiated > 0 ? 58 : 46),
      color: '#2563eb',
      gradient: 'linear-gradient(135deg, #2563eb, #38bdf8)',
    },
    {
      key: 'compromised' as FunnelStageKey,
      label: 'Compromised',
      count: summary.returns_compromised,
      rate: (summary.returns_compromised / totalOrders) * 100,
      width: Math.max((summary.returns_compromised / totalOrders) * 100, summary.returns_compromised > 0 ? 42 : 34),
      color: '#e11d48',
      gradient: 'linear-gradient(135deg, #e11d48, #fb7185)',
    },
  ]
})

const kpiCards = computed(() => {
  if (!dashboard.value) return []
  const summary = dashboard.value.summary

  return [
    { title: 'Total Orders', value: String(summary.total_orders), percentage: null, tone: 'teal' as KpiTone, icon: Squares2X2Icon },
    { title: 'Returns Initiated', value: String(summary.returns_initiated), percentage: formatPercent(summary.return_rate), tone: 'rose' as KpiTone, icon: ArrowUturnLeftIcon },
    { title: 'Return Initiated Rate', value: formatPercent(summary.return_rate), percentage: null, tone: 'amber' as KpiTone, icon: ChartBarIcon },
    { title: 'Returned Orders', value: String(summary.returned_orders), percentage: null, tone: 'sky' as KpiTone, icon: WrenchScrewdriverIcon },
    { title: 'Returns Compromised', value: String(summary.returns_compromised), percentage: formatPercent(summary.compromise_rate), tone: 'rose' as KpiTone, icon: ShieldExclamationIcon },
    { title: 'Compromise Rate', value: formatPercent(summary.compromise_rate), percentage: null, tone: 'amber' as KpiTone, icon: ExclamationTriangleIcon },
    { title: 'Pending Returns', value: String(summary.pending_returns), percentage: null, tone: 'slate' as KpiTone, icon: ClockIcon },
    { title: 'Average Returns Per Day', value: formatCompactNumber(summary.average_returns_per_day), percentage: null, tone: 'teal' as KpiTone, icon: ChartBarIcon },
  ]
})

const sortedPendingRows = computed(() => {
  const rows = [...(dashboard.value?.pending_returns || [])]
  rows.sort((left, right) => compareValues(left[pendingSortKey.value], right[pendingSortKey.value], pendingSortDir.value))
  return rows
})

const sortedTopProducts = computed(() => {
  const rows = [...(dashboard.value?.top_returning_products || [])]
  rows.sort((left, right) => compareValues(left[productSortKey.value], right[productSortKey.value], productSortDir.value))
  return rows
})

const splitPipeValues = (value: string) => value.split('|').map((part) => part.trim()).filter(Boolean)
const splitCommaValues = (value: string) => value.split(',').map((part) => part.trim()).filter(Boolean)

const drilldownRows = computed(() => {
  if (!dashboard.value || !activeDrilldown.value) return []

  return dashboard.value.return_order_details.filter((row) => {
    const active = activeDrilldown.value
    if (!active) return true

    if (active.type === 'thickness') return splitCommaValues(row.thickness).includes(active.value)
    if (active.type === 'state') return row.state === active.value
    if (active.type === 'city') return row.city === active.value
    if (active.type === 'reason') return splitPipeValues(row.return_reason).includes(active.value)
    if (active.type === 'followup') return splitPipeValues(row.followup_action).includes(active.value)
    if (active.type === 'compromised') return active.value === 'true' ? row.compromised : !row.compromised
    if (active.type === 'status') return row.order_status === active.value
    if (active.type === 'product') return splitPipeValues(row.product).includes(active.value)
    if (active.type === 'funnel') {
      if (active.value === 'total') return true
      if (active.value === 'initiated') return true
      if (active.value === 'compromised') return row.compromised
    }
    if (active.type === 'trend' && active.from && active.to) {
      const eventAt = row.event_at ? new Date(row.event_at).getTime() : Number.NaN
      const from = new Date(active.from).getTime()
      const to = new Date(active.to).getTime()
      if (Number.isNaN(eventAt) || Number.isNaN(from) || Number.isNaN(to)) return false
      return eventAt >= from && eventAt < to
    }
    return true
  })
})

const trendExportRows = computed<ExportRow[]>(() =>
  currentTrend.value.map((point) => ({
    period: point.label,
    date_key: point.date,
    returns_initiated: point.count,
  })),
)

const thicknessExportRows = computed<ExportRow[]>(() =>
  (dashboard.value?.thickness_performance || []).map((row) => ({
    thickness: row.thickness,
    orders: row.orders,
    returns: row.returns,
    return_rate: formatPercent(row.return_rate),
  })),
)

const stateExportRows = computed<ExportRow[]>(() =>
  (dashboard.value?.state_performance || []).map((row) => ({
    state: row.state,
    orders: row.orders,
    returns: row.returns,
    return_rate: formatPercent(row.return_rate),
  })),
)

const topCitiesExportRows = computed<ExportRow[]>(() =>
  (dashboard.value?.top_return_cities || []).map((row) => ({
    city: row.label,
    returns: row.count,
  })),
)

const returnReasonsExportRows = computed<ExportRow[]>(() =>
  (dashboard.value?.return_reasons || []).map((row) => ({
    return_reason: row.label,
    count: row.count,
  })),
)

const followupExportRows = computed<ExportRow[]>(() =>
  (dashboard.value?.followup_actions || []).map((row) => ({
    followup_action: row.label,
    count: row.count,
  })),
)

const compromisedExportRows = computed<ExportRow[]>(() =>
  (dashboard.value?.compromised_breakdown || []).map((row) => ({
    bucket: row.label,
    count: row.count,
  })),
)
const funnelExportRows = computed<ExportRow[]>(() =>
  returnFunnelStages.value.map((stage) => ({
    stage: stage.label,
    count: stage.count,
    percent_of_total_orders: formatPercent(stage.rate),
  })),
)

const statusExportRows = computed<ExportRow[]>(() =>
  (dashboard.value?.returns_by_order_status || []).map((row) => ({
    order_status: row.label,
    returns: row.count,
  })),
)

const pendingExportRows = computed<ExportRow[]>(() => sortedPendingRows.value.map(toPendingExportRow))
const productExportRows = computed<ExportRow[]>(() =>
  sortedTopProducts.value.map((row) => ({
    product: row.product,
    orders: row.orders,
    returns: row.returns,
    return_rate: formatPercent(row.return_rate),
  })),
)
const drilldownExportRows = computed<ExportRow[]>(() =>
  drilldownRows.value.map((row) => ({
    order_id: row.amazon_order_id,
    confirmed_date: formatDate(row.confirmed_date),
    product: row.product,
    customer: row.customer,
    phone: row.phone,
    state: row.state,
    city: row.city,
    thickness: row.thickness,
    quantity: formatCompactNumber(row.quantity),
    return_reason: row.return_reason,
    followup_action: row.followup_action,
    compromised: row.compromised ? 'Yes' : 'No',
    order_status: row.order_status,
    updated_at: formatDateTime(row.updated_at),
  })),
)

const toPendingExportRow = (row: ReturnsDashboardPendingRow): ExportRow => ({
  order_id: row.amazon_order_id,
  confirmed_date: formatDate(row.confirmed_date),
  customer: row.customer,
  phone: row.phone,
  state: row.state,
  city: row.city,
  thickness: row.thickness,
  quantity: formatCompactNumber(row.quantity),
  return_reason: row.return_reason,
  followup_action: row.followup_action,
  compromised: row.compromised ? 'Yes' : 'No',
  order_status: row.order_status,
  updated_at: formatDateTime(row.updated_at),
})

const compareValues = (left: unknown, right: unknown, direction: 'asc' | 'desc') => {
  const multiplier = direction === 'asc' ? 1 : -1

  if (typeof left === 'number' && typeof right === 'number') {
    return (left - right) * multiplier
  }

  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return ((Number(left) - Number(right))) * multiplier
  }

  const leftDate = typeof left === 'string' ? Date.parse(left) : Number.NaN
  const rightDate = typeof right === 'string' ? Date.parse(right) : Number.NaN
  if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
    return (leftDate - rightDate) * multiplier
  }

  return String(left ?? '').localeCompare(String(right ?? '')) * multiplier
}

const setPendingSort = (key: PendingSortKey) => {
  if (pendingSortKey.value === key) {
    pendingSortDir.value = pendingSortDir.value === 'asc' ? 'desc' : 'asc'
    return
  }
  pendingSortKey.value = key
  pendingSortDir.value = key === 'updated_at' ? 'desc' : 'asc'
}

const setProductSort = (key: ProductSortKey) => {
  if (productSortKey.value === key) {
    productSortDir.value = productSortDir.value === 'asc' ? 'desc' : 'asc'
    return
  }
  productSortKey.value = key
  productSortDir.value = key === 'return_rate' ? 'desc' : 'asc'
}

const toBarHeight = (value: number, max: number) => Math.max((value / Math.max(max, 1)) * 100, value > 0 ? 8 : 0)
const toBarWidth = (value: number, max: number) => Math.max((value / Math.max(max, 1)) * 100, value > 0 ? 8 : 0)

const activateDrilldown = (type: DrilldownType, value: string, title: string) => {
  activeDrilldown.value = { type, value, title }
}

const activateCompromisedDrilldown = (label: string) => {
  activateDrilldown('compromised', label === 'Compromised' ? 'true' : 'false', label)
}

const activateFunnelDrilldown = (stage: FunnelStageKey) => {
  const titleMap = {
    total: 'Return Funnel: Total Orders',
    initiated: 'Return Funnel: Return Initiated',
    returned: 'Return Funnel: Returned',
    compromised: 'Return Funnel: Compromised',
  }

  activeDrilldown.value = {
    type: 'funnel',
    value: stage,
    title: titleMap[stage],
  }
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
    title: `Returns Trend: ${point.label}`,
    from: start.toISOString(),
    to: end.toISOString(),
  }
}

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
    dashboard.value = await ordersApi.getReturnsDashboard({
      dateRange: 'custom_range',
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
      state: filters.state.trim() || undefined,
      city: filters.city.trim() || undefined,
      thickness: filters.thickness || undefined,
      orderStatus: filters.orderStatus || undefined,
      returnInitiated: filters.returnInitiated || undefined,
      returnInitiatedCompromised: filters.returnInitiatedCompromised || undefined,
    })
  } catch (err: any) {
    error.value = err?.response?.data?.error || err?.message || 'Failed to load return analytics'
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
.returns-analytics {
  max-width: 1880px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.hero-card,
.filter-panel,
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
    radial-gradient(circle at top right, rgba(15, 118, 110, 0.16), transparent 34%),
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

.meta-pill,
.status-pill,
.boolean-pill,
.view-link,
.inline-link {
  border-radius: 999px;
  font-weight: 700;
}

.meta-pill {
  padding: 0.6rem 0.95rem;
  background: rgba(240, 253, 250, 0.9);
  color: #0f766e;
  border: 1px solid rgba(20, 184, 166, 0.18);
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
.axis-trigger {
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

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
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
  text-align: center;
}

.pie-layout {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 1rem;
  align-items: center;
}

.funnel-card {
  display: grid;
  grid-template-columns: minmax(340px, 1fr) minmax(320px, 0.9fr);
  gap: 1.25rem;
  align-items: start;
}

.funnel-pyramid {
  display: grid;
  gap: 0.85rem;
  justify-items: center;
  padding: 0.4rem 0;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
}

.funnel-stage {
  min-height: 82px;
  min-width: 220px;
  max-width: 100%;
  border: 0;
  border-radius: 22px;
  color: #ffffff;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.18rem;
  text-align: center;
  padding: 0.95rem 1rem;
  box-shadow: 0 20px 36px rgba(15, 23, 42, 0.12);
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
}

.funnel-stage:hover {
  transform: translateY(-1px);
  box-shadow: 0 24px 40px rgba(15, 23, 42, 0.16);
  filter: saturate(1.03);
}

.funnel-stage span,
.funnel-stage strong,
.funnel-stage small {
  pointer-events: none;
}

.funnel-stage span {
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1.2;
}

.funnel-stage strong {
  font-size: 1.45rem;
  line-height: 1;
}

.funnel-stage small {
  font-size: 0.82rem;
  font-weight: 700;
  opacity: 0.95;
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

.donut--alt {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.24);
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

.legend-list,
.horizontal-list {
  display: grid;
  gap: 0.7rem;
}

.legend-button,
.horizontal-row,
.stack-legend__item,
.vertical-bar {
  border: 1px solid rgba(203, 213, 225, 0.8);
  background: rgba(248, 250, 252, 0.88);
  cursor: pointer;
}

.legend-button {
  padding: 0.8rem 0.9rem;
  border-radius: 18px;
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  gap: 0.8rem;
  align-items: center;
}

.legend-button__swatch,
.stack-legend__swatch {
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

.vertical-bars {
  min-height: 260px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  align-items: end;
}

.vertical-bar {
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

.vertical-bar--rose .vertical-bar__fill {
  background: linear-gradient(180deg, #fb7185, #e11d48);
}

.vertical-bar__label {
  color: #475569;
  font-weight: 800;
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

.stack-card {
  display: grid;
  gap: 1rem;
}

.stack-bar {
  display: flex;
  min-height: 92px;
  overflow: hidden;
  border-radius: 22px;
  background: rgba(226, 232, 240, 0.7);
}

.stack-bar__segment {
  border: 0;
  color: #ffffff;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.2rem;
  min-width: 86px;
  cursor: pointer;
}

.stack-bar__segment span,
.stack-bar__segment strong {
  pointer-events: none;
}

.stack-legend {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.stack-legend__item {
  padding: 0.7rem 0.9rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: #0f172a;
  font-weight: 700;
}

.table-wrap {
  overflow: auto;
}

.data-table {
  width: 100%;
  min-width: 1180px;
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

.sort-button {
  border: 0;
  background: transparent;
  padding: 0;
  color: inherit;
  font: inherit;
  font-weight: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  cursor: pointer;
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

.inline-link {
  cursor: pointer;
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
  .pie-layout,
  .funnel-card {
    grid-template-columns: 1fr;
  }

  .horizontal-row {
    grid-template-columns: 1fr;
  }

  .horizontal-row__stats {
    white-space: normal;
  }

  .funnel-pyramid {
    max-width: 100%;
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

  .stack-bar {
    flex-direction: column;
  }

  .stack-bar__segment {
    width: 100% !important;
    min-height: 72px;
  }
}
</style>
