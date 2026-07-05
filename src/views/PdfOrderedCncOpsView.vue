<template>
  <div class="cnc-page">
    <div v-if="remoteUpdateToasts.length" class="toast-stack" aria-live="polite" aria-atomic="true">
      <article v-for="toast in remoteUpdateToasts" :key="toast.id" class="update-toast">
        <strong>{{ toast.orderId }}</strong>
        <span>{{ toast.message }}</span>
      </article>
    </div>

    <section class="cnc-hero">
      <div>
        <p class="eyebrow">PDF driven CNC queue</p>
        <h1>PDF Ordered CNC Ops</h1>
        <p class="cnc-hero__copy">
          Upload one or more PDFs, extract Amazon order IDs in page order, and render the CNC queue in that exact sequence.
        </p>
      </div>
      <div class="cnc-hero__summary">
        <span class="summary-pill">{{ queuedOrderIdCount }} IDs queued</span>
        <span class="summary-pill">{{ extractedEntries.length }} active IDs</span>
        <span class="summary-pill">{{ visibleRows.length }} product rows</span>
        <span class="summary-pill">{{ redundantOrderEntries.length }} redundant removed</span>
        <span class="summary-pill">{{ missingOrderIds.length }} missing orders</span>
      </div>
    </section>

    <section v-if="remoteUpdateLog.length" class="update-log-card">
      <div class="update-log-card__header">
        <h2>Live Update Log</h2>
        <p>Every toast is copied here so operators can review past remote updates without losing the history.</p>
        <span class="summary-pill">{{ remoteUpdateLog.length }} updates</span>
      </div>
      <div class="update-log-list">
        <article v-for="log in remoteUpdateLog" :key="`log-${log.id}`" class="update-log-item">
          <div class="update-log-item__meta">
            <strong>{{ log.orderId }}</strong>
            <span>{{ formatDateTime(log.createdAt) }}</span>
          </div>
          <p>{{ log.message }}</p>
        </article>
      </div>
    </section>

    <section class="upload-card">
      <div class="upload-card__copy">
        <h2>Upload PDFs</h2>
        <p>Select one or more PDF files. The app keeps file order, then page order, then order ID order within each page.</p>
      </div>
      <div class="upload-card__actions">
        <label class="upload-button">
          <input
            :key="fileInputKey"
            type="file"
            accept="application/pdf"
            multiple
            class="upload-input"
            @change="handleFileSelection"
          />
          {{ loadingPdf ? 'Reading PDFs...' : 'Upload PDFs' }}
        </label>
        <button type="button" class="secondary-button" :disabled="loadingPdf || !extractedEntries.length" @click="clearUploadedPdfs">
          Clear Queue
        </button>
      </div>
      <p v-if="uploadError" class="upload-message upload-message--error">{{ uploadError }}</p>
      <p v-if="uploadWarning" class="upload-message upload-message--warning">{{ uploadWarning }}</p>
      <p v-if="redundantQueueWarning" class="upload-message upload-message--warning">{{ redundantQueueWarning }}</p>
      <p v-if="missingOrderIds.length" class="upload-message upload-message--warning">
        Missing orders in system: {{ missingOrderIds.join(', ') }}
      </p>
    </section>

    <section v-if="showUploadSummary" class="result-card">
      <div class="result-card__header">
        <h2>Upload Result</h2>
        <p>Summary of order ID extraction and database matching for the latest upload.</p>
      </div>
      <div class="result-grid">
        <article class="result-stat result-stat--neutral">
          <span class="result-stat__label">Queued from PDFs</span>
          <strong class="result-stat__value">{{ queuedOrderIdCount }}</strong>
        </article>
        <article class="result-stat result-stat--success">
          <span class="result-stat__label">Active Unique IDs</span>
          <strong class="result-stat__value">{{ extractedOrderIdCount }}</strong>
        </article>
        <article class="result-stat result-stat--warning">
          <span class="result-stat__label">Redundant Removed</span>
          <strong class="result-stat__value">{{ redundantOrderEntries.length }}</strong>
        </article>
        <article class="result-stat result-stat--success">
          <span class="result-stat__label">Available in DB</span>
          <strong class="result-stat__value">{{ successfulOrderIdCount }}</strong>
        </article>
        <article class="result-stat result-stat--warning">
          <span class="result-stat__label">Not available in DB</span>
          <strong class="result-stat__value">{{ unavailableOrderIdCount }}</strong>
        </article>
      </div>
    </section>

    <section v-if="fileSummaries.length" class="active-files-card">
      <div class="active-files-card__header active-files-card__header--actions">
        <h2>Active PDF Files</h2>
        <p>These uploaded PDFs are the source for the currently displayed CNC order list.</p>
        <button type="button" class="secondary-button" :disabled="loadingPdf" @click="clearUploadedPdfs">Clear Queue</button>
      </div>
      <div class="active-files-list">
        <article v-for="summary in fileSummaries" :key="summary.fileKey" class="active-file-card">
          <div class="active-file-card__copy">
            <strong>{{ summary.fileName }}</strong>
            <span>
              {{ summary.activeIds }} active
              <template v-if="summary.redundantIds">, {{ summary.redundantIds }} redundant removed</template>
              , {{ summary.totalIds }} total extracted
            </span>
          </div>
          <button type="button" class="secondary-button active-file-card__remove" :disabled="loadingPdf" @click="removeQueuedFile(summary.fileKey)">
            Remove
          </button>
        </article>
      </div>
    </section>

    <section v-if="missingOrderIds.length" class="missing-orders-card">
      <div class="missing-orders-card__header">
        <h2>Missing Order IDs</h2>
        <p>These order IDs were extracted from the uploaded PDFs but were not available in the database.</p>
      </div>
      <div class="missing-orders-list">
        <span v-for="orderId in missingOrderIds" :key="orderId" class="missing-order-pill">{{ orderId }}</span>
      </div>
    </section>

    <section v-if="redundantOrderEntries.length" class="redundant-orders-card">
      <div class="redundant-orders-card__header">
        <h2>Removed Redundant Order IDs</h2>
        <p>These order IDs were repeated in later PDFs. The first occurrence stays in the CNC list and the later duplicates are removed.</p>
      </div>
      <div class="redundant-orders-list">
        <article v-for="entry in redundantOrderEntries" :key="entry.removedEntryKey" class="redundant-order-card">
          <strong class="redundant-order-card__id">{{ entry.amazonOrderId }}</strong>
          <span class="redundant-order-card__meta" :title="`Removed from ${entry.removedFileName} (page ${entry.removedPageNumber})`">
            <span class="redundant-order-card__tag">Removed</span>
            <span class="redundant-order-card__text">{{ entry.removedFileName }} · p{{ entry.removedPageNumber }}</span>
          </span>
          <span class="redundant-order-card__meta" :title="`Kept from ${entry.keptFileName} (page ${entry.keptPageNumber})`">
            <span class="redundant-order-card__tag redundant-order-card__tag--kept">Kept</span>
            <span class="redundant-order-card__text">{{ entry.keptFileName }} · p{{ entry.keptPageNumber }}</span>
          </span>
        </article>
      </div>
    </section>

    <section v-if="fileSummaries.length" class="sequence-card">
      <div class="sequence-card__header">
        <h2>Extracted Sequence</h2>
        <p>Preview of the exact order ID flow from the uploaded PDFs.</p>
      </div>
      <div class="sequence-list">
        <article v-for="summary in fileSummaries" :key="summary.fileKey" class="sequence-item">
          <strong class="sequence-item__file" :title="summary.fileName">{{ summary.fileName }}</strong>
          <p class="sequence-item__meta">{{ summary.totalIds }} IDs</p>
          <p class="sequence-item__line" :title="summary.orderIds.join(' -> ')">
            {{ summary.orderIds.join(' -> ') }}
          </p>
        </article>
      </div>
    </section>

    <section class="cnc-shell">
      <div v-if="loadingPdf" class="empty-state">Reading PDFs and loading matching Amazon orders...</div>
      <div v-else-if="!extractedEntries.length" class="empty-state">Upload PDFs to build a CNC queue from their order sequence.</div>
      <template v-else>
        <div class="cnc-shell__controls">
          <div class="row-order-lanes-card">
            <div class="row-order-lanes-card__header">
              <div>
                <h3>Row Order Lanes</h3>
                <p>Move cards into the active lane. Rows follow that top-to-bottom rule order, then the remaining rows keep their original PDF sequence.</p>
              </div>
              <span class="summary-pill">{{ activeRowOrderRules.length }} active</span>
            </div>

            <div class="row-order-lanes">
              <section
                class="row-order-lane"
                @dragover.prevent="handleRowOrderRuleDragOver"
                @drop.prevent="handleRowOrderRuleDrop('available')"
              >
                <div class="row-order-lane__header">
                  <strong>Available</strong>
                  <span>{{ availableRowOrderRules.length }}</span>
                </div>
                <div class="row-order-lane__body" :class="{ 'row-order-lane__body--empty': availableRowOrderRules.length === 0 }">
                  <p v-if="availableRowOrderRules.length === 0" class="row-order-lane__empty">No cards left in this lane.</p>
                  <article
                    v-for="(rule, index) in availableRowOrderRules"
                    :key="`available-${rule.key}`"
                    class="row-order-rule-card"
                    draggable="true"
                    @dragstart="handleRowOrderRuleDragStart($event, rule.key, 'available')"
                    @dragend="clearDraggedRowOrderRule"
                    @dragover.prevent="handleRowOrderRuleDragOver"
                    @drop.prevent.stop="handleRowOrderRuleDrop('available', index)"
                  >
                    <div class="row-order-rule-card__copy">
                      <strong>{{ rule.label }}</strong>
                      <span>{{ rule.description }}</span>
                    </div>
                    <button type="button" class="row-order-rule-card__action" @click.stop="toggleRowOrderRuleLane(rule.key, 'available')">
                      Add
                    </button>
                  </article>
                </div>
              </section>

              <section
                class="row-order-lane row-order-lane--active"
                @dragover.prevent="handleRowOrderRuleDragOver"
                @drop.prevent="handleRowOrderRuleDrop('active')"
              >
                <div class="row-order-lane__header">
                  <strong>Active Order</strong>
                  <span>{{ activeRowOrderRules.length }}</span>
                </div>
                <div class="row-order-lane__body" :class="{ 'row-order-lane__body--empty': activeRowOrderRules.length === 0 }">
                  <p v-if="activeRowOrderRules.length === 0" class="row-order-lane__empty">Drop cards here to prioritize matching rows.</p>
                  <article
                    v-for="(rule, index) in activeRowOrderRules"
                    :key="`active-${rule.key}`"
                    class="row-order-rule-card row-order-rule-card--active"
                    draggable="true"
                    @dragstart="handleRowOrderRuleDragStart($event, rule.key, 'active')"
                    @dragend="clearDraggedRowOrderRule"
                    @dragover.prevent="handleRowOrderRuleDragOver"
                    @drop.prevent.stop="handleRowOrderRuleDrop('active', index)"
                  >
                    <div class="row-order-rule-card__copy">
                      <strong>{{ rule.label }}</strong>
                      <span>{{ rule.description }}</span>
                    </div>
                    <div class="row-order-rule-card__actions">
                      <button
                        type="button"
                        class="row-order-rule-card__action"
                        :disabled="index === 0"
                        @click.stop="shiftActiveRowOrderRule(rule.key, -1)"
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        class="row-order-rule-card__action"
                        :disabled="index === activeRowOrderRules.length - 1"
                        @click.stop="shiftActiveRowOrderRule(rule.key, 1)"
                      >
                        Down
                      </button>
                      <button type="button" class="row-order-rule-card__action" @click.stop="toggleRowOrderRuleLane(rule.key, 'active')">
                        Remove
                      </button>
                    </div>
                  </article>
                </div>
              </section>
            </div>
          </div>

          <div class="bulk-toolbar">
            <label class="bulk-toolbar__select-all">
              <input
                :checked="allVisibleRowsSelected"
                type="checkbox"
                @change="toggleVisibleRowsSelection(($event.target as HTMLInputElement).checked)"
              />
              <span>Select visible rows</span>
            </label>
            <span class="bulk-toolbar__count">{{ selectedVisibleRowCount }} selected</span>
            <select v-model="bulkOrderStatus" class="sheet-input bulk-toolbar__status">
              <option value="">Bulk order status</option>
              <option value="received">received</option>
              <option value="manufactured">manufactured</option>
              <option value="cancelled">cancelled</option>
              <option value="returned">returned</option>
            </select>
            <button
              type="button"
              class="action-button action-button--inline"
              :disabled="bulkSaving || !bulkOrderStatus || selectedVisibleRowCount === 0"
              @click="applyBulkStatusUpdate"
            >
              {{ bulkSaving ? 'Updating...' : 'Update Selected Status' }}
            </button>
            <span v-if="bulkFeedback" class="bulk-toolbar__feedback">{{ bulkFeedback }}</span>
          </div>

          <div class="sync-actions">
            <button
              type="button"
              class="secondary-button sync-button"
              :disabled="loadingPdf || pollInFlight"
              @click="triggerManualSync"
            >
              {{ pollInFlight ? 'Syncing...' : 'Sync Now' }}
            </button>
          </div>

          <OrderSearchBar
            v-model:searchKey="searchKey"
            v-model:searchValue="searchValue"
            v-model:searchOperator="searchOperator"
            :loading="loadingPdf"
            @search="applySearch"
            @clear="clearSearch"
          />

          <OrderListFilterBar
            v-model="advancedFilters"
            :loading="loadingPdf"
            @apply="applySearch"
            @clear="clearSearch"
          />
        </div>

        <ListUtilityBar
          :total="visibleRows.length"
          :page="1"
          :total-pages="1"
          item-label="rows"
          editable
          :helper-text="listUtilityHelperText"
        />
        <div v-if="visibleRows.length === 0" class="empty-state empty-state--inline">
          No matching Amazon CNC rows found for the current filter/search selection.
        </div>
        <template v-else>
          <div ref="sheetWrapRef" class="sheet-wrap">
            <table class="cnc-sheet">
              <thead>
                <tr>
                  <th class="cell-check">
                    <input
                      :checked="allVisibleRowsSelected"
                      type="checkbox"
                      @change="toggleVisibleRowsSelection(($event.target as HTMLInputElement).checked)"
                    />
                  </th>
                  <th>PDF</th>
                  <th>Page</th>
                  <th>Products</th>
                  <th>Order ID</th>
                  <th>Quantity</th>
                  <th>Thickness</th>
                  <th>Round Product</th>
                  <th>SKU</th>
                  <th>Default Width (in)</th>
                  <th>Default Length (in)</th>
                  <th>Customer Width (in)</th>
                  <th>Customer Length (in)</th>
                  <th>Customer Width (mm)</th>
                  <th>Customer Length (mm)</th>
                  <th>Corner Radius and Notes</th>
                  <th>Order Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="row in visibleRows"
                  :key="row.rowKey"
                  :class="{
                    'row-has-custom-inputs': rowWasInitiallyCustom(row.rowKey),
                    'row-updated': isRowUpdated(row.rowKey),
                  }"
                  :style="getRowStyle(row)"
                >
                  <td class="cell-check">
                    <input
                      :checked="isRowSelected(row.rowKey)"
                      type="checkbox"
                      @change="setRowSelected(row.rowKey, ($event.target as HTMLInputElement).checked)"
                    />
                  </td>
                  <td class="cell-pdf">{{ row.source.fileName }}</td>
                  <td class="cell-page">{{ row.source.pageNumber }}</td>
                  <td class="cell-product">
                    <div class="product-title" :title="row.product.name || 'Unnamed product'">{{ row.product.name || 'Unnamed product' }}</div>
                  </td>
                  <td class="cell-order">
                    <div class="order-id-line">{{ row.order.amazon_order_id }}</div>
                    <div class="order-subline">BL #{{ row.order.baselinker_order_id }}</div>
                  </td>
                  <td class="cell-quantity">{{ formatNumber(row.product.quantity) }}</td>
                  <td class="cell-thickness">{{ row.product.thickness || 'Not set' }}</td>
                  <td class="cell-round"><span class="status-pill">{{ row.product.is_round ? 'Yes' : 'No' }}</span></td>
                  <td class="cell-sku">{{ row.product.sku || 'Not set' }}</td>
                  <td class="cell-metric">{{ formatNumber(row.product.default_width_in_inches) }}</td>
                  <td class="cell-metric">{{ formatNumber(row.product.default_length_in_inches) }}</td>

                  <td class="cell-input-group">
                    <input
                      v-model="row.productEdit.customer_width_in_inches"
                      type="number"
                      step="0.01"
                      :class="['sheet-input', { 'sheet-input--remote-updated': isCellUpdated(row.rowKey, 'customer_width_in_inches') }]"
                      placeholder="Width in"
                    />
                    <div class="increment-row">
                      <button
                        v-for="step in incrementSteps"
                        :key="`${row.rowKey}-width-${step}`"
                        @click="applyInchIncrement(row.productEdit, 'customer_width_in_inches', step)"
                        type="button"
                        class="increment-button"
                      >
                        +{{ step.toFixed(2) }}
                      </button>
                    </div>
                  </td>

                  <td class="cell-input-group">
                    <input
                      v-model="row.productEdit.customer_length_in_inches"
                      type="number"
                      step="0.01"
                      :class="['sheet-input', { 'sheet-input--remote-updated': isCellUpdated(row.rowKey, 'customer_length_in_inches') }]"
                      placeholder="Length in"
                    />
                    <div class="increment-row">
                      <button
                        v-for="step in incrementSteps"
                        :key="`${row.rowKey}-length-${step}`"
                        @click="applyInchIncrement(row.productEdit, 'customer_length_in_inches', step)"
                        type="button"
                        class="increment-button"
                      >
                        +{{ step.toFixed(2) }}
                      </button>
                    </div>
                  </td>

                  <td class="cell-mm">
                    <input
                      v-model="row.productEdit.customer_width_in_mm"
                      type="number"
                      step="0.01"
                      class="sheet-input sheet-input--mm"
                      placeholder="Width mm"
                    />
                    <div class="increment-row">
                      <button type="button" class="increment-button increment-button--indicator" disabled>
                        {{ formatInchDifference(row.productEdit, 'customer_width_in_inches') }}
                      </button>
                    </div>
                  </td>
                  <td class="cell-mm">
                    <input
                      v-model="row.productEdit.customer_length_in_mm"
                      type="number"
                      step="0.01"
                      class="sheet-input sheet-input--mm"
                      placeholder="Length mm"
                    />
                    <div class="increment-row">
                      <button type="button" class="increment-button increment-button--indicator" disabled>
                        {{ formatInchDifference(row.productEdit, 'customer_length_in_inches') }}
                      </button>
                    </div>
                  </td>
                  <td class="cell-notes">
                    <textarea
                      v-model="row.productEdit.corner_radius_and_notes"
                      rows="3"
                      :class="['sheet-textarea', { 'sheet-textarea--remote-updated': isCellUpdated(row.rowKey, 'corner_radius_and_notes') }]"
                      placeholder="Corner radius and notes"
                    />
                  </td>
                  <td class="cell-status-edit">
                    <select v-model="row.orderEdit.order_status" class="sheet-input">
                      <option value="received">received</option>
                      <option value="manufactured">manufactured</option>
                      <option value="cancelled">cancelled</option>
                      <option value="returned">returned</option>
                    </select>
                  </td>
                  <td class="cell-actions">
                    <button
                      type="button"
                      @click.stop.prevent="saveProductRow(row)"
                      :disabled="savingProducts[row.rowKey]"
                      class="save-button"
                    >
                      {{ savingProducts[row.rowKey] ? 'Saving...' : 'Save' }}
                    </button>
                    <router-link :to="`/orders/${row.order.amazon_order_id}`" class="view-link">View</router-link>
                    <p v-if="productFeedback[row.rowKey]" class="product-feedback">{{ productFeedback[row.rowKey] }}</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <StickyHorizontalScrollbar :target="sheetWrapRef" always-visible />
        </template>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import ListUtilityBar from '@/components/ListUtilityBar.vue'
import OrderListFilterBar from '@/components/OrderListFilterBar.vue'
import OrderSearchBar from '@/components/OrderSearchBar.vue'
import StickyHorizontalScrollbar from '@/components/StickyHorizontalScrollbar.vue'
import { ordersApi } from '@/api/orders'
import { useAmazonRowHighlightRulesStore } from '@/stores/amazonRowHighlightRules'
import { useOrdersStore } from '@/stores/orders'
import { usePdfCncQueueStore, type PdfQueueExtractedEntry } from '@/stores/pdfCncQueue'
import type { ChangedAmazonOrderResult, Order, OrderProduct, OrderedAmazonOrderResult, UpdateManualFieldsRequest, UpdateProductManualFieldsRequest } from '@/types'
import { formatStandardDate } from '@/utils/orderData'
import { extractAmazonOrderIdsFromPdf } from '@/utils/pdfOrderExtraction'
import { createOrderListAdvancedFilters, type OrderListAdvancedFilters } from '@/utils/orderListFilters'

type ProductEditRow = {
  customer_width_in_inches: string
  customer_length_in_inches: string
  customer_width_in_mm: string
  customer_length_in_mm: string
  corner_radius_and_notes: string
}

type OrderEditRow = {
  order_status: string
}

type ExtractedEntry = PdfQueueExtractedEntry

type SheetRow = {
  rowKey: string
  order: Order
  product: OrderProduct
  source: ExtractedEntry
}

type VisibleRow = SheetRow & {
  productEdit: ProductEditRow
  orderEdit: OrderEditRow
}

type RemoteTrackedField = 'customer_width_in_inches' | 'customer_length_in_inches' | 'corner_radius_and_notes'
type RowOrderRuleKey = 'manufactured' | 'has_custom_inputs' | 'no_custom_inputs' | 'is_round' | 'more_than_1_qty'
type RowOrderLaneKey = 'available' | 'active'

type RemoteUpdateToast = {
  id: number
  orderId: string
  message: string
  createdAt: string
}

type RowOrderRuleCard = {
  key: RowOrderRuleKey
  label: string
  description: string
}

type RemoteFieldChange = {
  rowKey: string
  orderId: string
  field: RemoteTrackedField
  value: string
  nextProduct: OrderProduct
}

const ordersStore = useOrdersStore()
const rowHighlightRulesStore = useAmazonRowHighlightRulesStore()
const pdfQueueStore = usePdfCncQueueStore()
const { extractedEntries, lookupResults, missingOrderIds, lastSuccessfulSyncAt, fileSummaries, queuedOrderIdCount, redundantOrderEntries } = storeToRefs(pdfQueueStore)
const incrementSteps = [0, 0.1, 0.2, 0.25, 0.5, 0.75, 1]
const SAVE_TIMEOUT_MS = 15000
const POLL_INTERVAL_MS = 5000
const UPDATE_VISUAL_MS = 15000

const REMOTE_FIELD_LABELS: Record<RemoteTrackedField, string> = {
  customer_width_in_inches: 'Customer width (in)',
  customer_length_in_inches: 'Customer length (in)',
  corner_radius_and_notes: 'Corner radius and notes',
}

const ROW_ORDER_RULES: Record<RowOrderRuleKey, RowOrderRuleCard> = {
  manufactured: {
    key: 'manufactured',
    label: 'Manufactured',
    description: 'Rows with order status manufactured',
  },
  has_custom_inputs: {
    key: 'has_custom_inputs',
    label: 'Has Custom Inputs',
    description: 'Rows with any customer-entered size or notes',
  },
  no_custom_inputs: {
    key: 'no_custom_inputs',
    label: 'No Custom Inputs',
    description: 'Rows without customer-entered size or notes',
  },
  is_round: {
    key: 'is_round',
    label: 'Is Round',
    description: 'Rows marked as round products',
  },
  more_than_1_qty: {
    key: 'more_than_1_qty',
    label: 'More Than 1 Qty',
    description: 'Rows where quantity is greater than 1',
  },
}

const DEFAULT_ROW_ORDER_RULE_KEYS: RowOrderRuleKey[] = [
  'manufactured',
  'has_custom_inputs',
  'no_custom_inputs',
  'is_round',
  'more_than_1_qty',
]

const loadingPdf = ref(false)
const uploadError = ref('')
const uploadWarning = ref('')
const fileInputKey = ref(0)
const advancedFilters = ref(createOrderListAdvancedFilters())
const appliedAdvancedFilters = ref(createOrderListAdvancedFilters())
const searchKey = ref('order_id')
const searchValue = ref('')
const searchOperator = ref<'gt' | 'gte' | 'lt' | 'lte' | 'eq'>('gte')
const appliedSearchKey = ref('order_id')
const appliedSearchValue = ref('')
const appliedSearchOperator = ref<'gt' | 'gte' | 'lt' | 'lte' | 'eq'>('gte')
const productEdits = reactive<Record<string, ProductEditRow>>({})
const orderEdits = reactive<Record<string, OrderEditRow>>({})
const savingProducts = reactive<Record<string, boolean>>({})
const productFeedback = reactive<Record<string, string>>({})
const initialCustomInputRows = reactive<Record<string, boolean>>({})
const rowUpdateHighlights = reactive<Record<string, boolean>>({})
const cellUpdateHighlights = reactive<Record<string, boolean>>({})
const remoteUpdateToasts = ref<RemoteUpdateToast[]>([])
const remoteUpdateLog = ref<RemoteUpdateToast[]>([])
const pollInFlight = ref(false)
const selectedRows = reactive<Record<string, boolean>>({})
const bulkOrderStatus = ref('')
const bulkSaving = ref(false)
const bulkFeedback = ref('')
const availableRowOrderRuleKeys = ref<RowOrderRuleKey[]>([...DEFAULT_ROW_ORDER_RULE_KEYS])
const activeRowOrderRuleKeys = ref<RowOrderRuleKey[]>([])
const sheetWrapRef = ref<HTMLElement | null>(null)

let pollTimerId: number | undefined
let toastSequence = 0
let draggedRowOrderRule: { key: RowOrderRuleKey; fromLane: RowOrderLaneKey } | null = null
const toastTimers = new Map<number, number>()

const extractedOrderIdCount = computed(() => extractedEntries.value.length)
const successfulOrderIdCount = computed(() => lookupResults.value.filter((result) => result.found && result.order).length)
const unavailableOrderIdCount = computed(() => lookupResults.value.filter((result) => !result.found).length)
const showUploadSummary = computed(() =>
  extractedOrderIdCount.value > 0 || successfulOrderIdCount.value > 0 || unavailableOrderIdCount.value > 0,
)
const redundantQueueWarning = computed(() =>
  redundantOrderEntries.value.length
    ? `Removed ${redundantOrderEntries.value.length} redundant order ID entries from later PDFs. See details below.`
    : '',
)
const availableRowOrderRules = computed(() => availableRowOrderRuleKeys.value.map((key) => ROW_ORDER_RULES[key]))
const activeRowOrderRules = computed(() => activeRowOrderRuleKeys.value.map((key) => ROW_ORDER_RULES[key]))
const listUtilityHelperText = computed(() =>
  activeRowOrderRuleKeys.value.length > 0
    ? 'Rows are grouped by the active row-order cards, then remaining rows follow the original PDF sequence'
    : 'This queue preserves the uploaded PDF order and does not auto-sort',
)

const sequenceOrders = computed(() =>
  extractedEntries.value
    .map((entry, index) => {
      const result = lookupResults.value[index]
      const order = result?.order
      if (!result?.found || !order) return null
      return { entry, order }
    })
    .filter((item): item is { entry: ExtractedEntry; order: Order } => item != null),
)

const baseRows = computed<VisibleRow[]>(() =>
  sequenceOrders.value.flatMap(({ entry, order }) =>
    (order.products || [])
      .filter((product) => !product.is_discount_line)
      .map((product) => {
        const rowKey = `${entry.entryKey}:${product.order_product_id}`
        return {
          rowKey,
          order,
          product,
          source: entry,
          productEdit: ensureProductEdit(rowKey, product),
          orderEdit: ensureOrderEdit(order),
        }
      }),
  ),
)

const filteredRows = computed<VisibleRow[]>(() =>
  baseRows.value.filter((row) =>
    matchesVisibleRowFilters(
      row,
      appliedAdvancedFilters.value,
      appliedSearchKey.value,
      appliedSearchValue.value,
      appliedSearchOperator.value,
    ),
  ),
)

const visibleRows = computed<VisibleRow[]>(() => orderRowsByActiveRules(filteredRows.value, activeRowOrderRuleKeys.value))

const formatDate = (dateString?: string | null) => formatStandardDate(dateString)
const formatDateTime = (dateString?: string | null) => formatStandardDate(dateString)
const formatText = (value?: string | null) => value?.trim() || 'Not available'
const formatNumber = (value?: number | null) => (value == null ? 'Not set' : String(value))
const numberToString = (value?: number | null) => (value == null ? '' : String(value))

const buildProductEdit = (product: OrderProduct): ProductEditRow => ({
  customer_width_in_inches: numberToString(product.customer_width_in_inches),
  customer_length_in_inches: numberToString(product.customer_length_in_inches),
  customer_width_in_mm: numberToString(product.customer_width_in_mm),
  customer_length_in_mm: numberToString(product.customer_length_in_mm),
  corner_radius_and_notes: product.corner_radius_and_notes ?? '',
})

const buildOrderEdit = (order: Order): OrderEditRow => ({
  order_status: order.order_status || 'received',
})

const ensureProductEdit = (rowKey: string, product: OrderProduct) => {
  if (!productEdits[rowKey]) {
    productEdits[rowKey] = buildProductEdit(product)
  }
  return productEdits[rowKey] as ProductEditRow
}

const ensureOrderEdit = (order: Order) => {
  if (!orderEdits[order.amazon_order_id]) {
    orderEdits[order.amazon_order_id] = buildOrderEdit(order)
  }
  return orderEdits[order.amazon_order_id] as OrderEditRow
}

const syncOrdersStore = (results: OrderedAmazonOrderResult[]) => {
  ordersStore.orders = results
    .map((result) => result.order)
    .filter((order): order is Order => Boolean(order))
}

const syncProductEdits = () => {
  for (const row of baseRows.value) {
    productEdits[row.rowKey] = buildProductEdit(row.product)
    orderEdits[row.order.amazon_order_id] = buildOrderEdit(row.order)
    savingProducts[row.rowKey] = false
    productFeedback[row.rowKey] = ''
  }
}

const captureInitialCustomInputRows = () => {
  for (const key of Object.keys(initialCustomInputRows)) {
    delete initialCustomInputRows[key]
  }

  for (const row of baseRows.value) {
    initialCustomInputRows[row.rowKey] = productHasInitialCustomInputs(row.product)
  }
}

const clearTimerMap = (timers: Map<string | number, number>) => {
  for (const timerId of timers.values()) {
    window.clearTimeout(timerId)
  }
  timers.clear()
}

const removeToast = (id: number) => {
  remoteUpdateToasts.value = remoteUpdateToasts.value.filter((toast) => toast.id !== id)
  const timerId = toastTimers.get(id)
  if (timerId) {
    window.clearTimeout(timerId)
    toastTimers.delete(id)
  }
}

const markRowUpdated = (rowKey: string) => {
  rowUpdateHighlights[rowKey] = true
}

const markCellUpdated = (rowKey: string, field: RemoteTrackedField) => {
  cellUpdateHighlights[`${rowKey}:${field}`] = true
}

const isRowUpdated = (rowKey: string) => Boolean(rowUpdateHighlights[rowKey])
const isCellUpdated = (rowKey: string, field: RemoteTrackedField) => Boolean(cellUpdateHighlights[`${rowKey}:${field}`])

const queueRemoteUpdateToast = (orderId: string, message: string) => {
  const id = ++toastSequence
  const nextToast = {
    id,
    orderId,
    message,
    createdAt: new Date().toISOString(),
  } satisfies RemoteUpdateToast

  remoteUpdateToasts.value = [
    nextToast,
    ...remoteUpdateToasts.value,
  ].slice(0, 6)
  remoteUpdateLog.value = [nextToast, ...remoteUpdateLog.value]

  const timerId = window.setTimeout(() => {
    removeToast(id)
  }, UPDATE_VISUAL_MS)
  toastTimers.set(id, timerId)
}

const clearLiveUpdateUiState = () => {
  clearTimerMap(toastTimers)

  for (const key of Object.keys(rowUpdateHighlights)) {
    delete rowUpdateHighlights[key]
  }
  for (const key of Object.keys(cellUpdateHighlights)) {
    delete cellUpdateHighlights[key]
  }

  remoteUpdateToasts.value = []
  remoteUpdateLog.value = []
}

const toOptionalNumber = (value?: string | number | null) => {
  if (value == null) return undefined
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const roundForInput = (value: number) => {
  const rounded = Math.round(value * 100) / 100
  return rounded.toFixed(2)
}

const applyInchIncrement = (
  edit: ProductEditRow,
  field: 'customer_width_in_inches' | 'customer_length_in_inches',
  delta: number,
) => {
  const mmField = field === 'customer_width_in_inches' ? 'customer_width_in_mm' : 'customer_length_in_mm'
  const currentInches = Number(edit[field] || 0)
  const nextInches = currentInches + delta

  edit[mmField] = roundForInput(nextInches * 25.4)
}

const formatInchDifference = (
  edit: ProductEditRow,
  field: 'customer_width_in_inches' | 'customer_length_in_inches',
) => {
  const mmField = field === 'customer_width_in_inches' ? 'customer_width_in_mm' : 'customer_length_in_mm'
  const mmValue = edit[mmField]

  if (!mmValue || Number.isNaN(Number(mmValue))) {
    return '+0.00 in'
  }

  const inches = Number(edit[field] || 0)
  const delta = Number(mmValue) / 25.4 - (Number.isFinite(inches) ? inches : 0)
  const normalized = Math.abs(delta) < 0.005 ? 0 : Math.round(delta * 100) / 100
  const sign = normalized >= 0 ? '+' : '-'
  return `${sign}${Math.abs(normalized).toFixed(2)} in`
}

const getRowStyle = (row: SheetRow) => {
  const highlightStyle = rowHighlightRulesStore.getRowHighlightStyle(row.order, [row.product])
  if (highlightStyle['--row-highlight-background']) {
    return highlightStyle
  }

  if (row.order.order_status?.trim().toLowerCase() === 'manufactured') {
    return {
      '--row-highlight-background': 'rgba(226, 232, 240, 0.92)',
    }
  }

  return {}
}
const selectedVisibleRows = computed(() => visibleRows.value.filter((row) => Boolean(selectedRows[row.rowKey])))
const selectedVisibleRowCount = computed(() => selectedVisibleRows.value.length)
const allVisibleRowsSelected = computed(() => visibleRows.value.length > 0 && selectedVisibleRows.value.length === visibleRows.value.length)

const isRowSelected = (rowKey: string) => Boolean(selectedRows[rowKey])

const setRowSelected = (rowKey: string, checked: boolean) => {
  if (checked) {
    selectedRows[rowKey] = true
    return
  }
  delete selectedRows[rowKey]
}

const toggleVisibleRowsSelection = (checked: boolean) => {
  for (const row of visibleRows.value) {
    setRowSelected(row.rowKey, checked)
  }
}

const pruneRowSelection = (allowedRowKeys: string[]) => {
  const allowed = new Set(allowedRowKeys)
  for (const rowKey of Object.keys(selectedRows)) {
    if (!allowed.has(rowKey)) {
      delete selectedRows[rowKey]
    }
  }
}

const applySearch = () => {
  appliedSearchKey.value = searchKey.value
  appliedSearchValue.value = searchValue.value.trim()
  appliedSearchOperator.value = searchOperator.value
  appliedAdvancedFilters.value = { ...advancedFilters.value }
}

const clearSearch = () => {
  searchKey.value = 'order_id'
  searchValue.value = ''
  searchOperator.value = 'gte'
  advancedFilters.value = createOrderListAdvancedFilters()
  appliedSearchKey.value = 'order_id'
  appliedSearchValue.value = ''
  appliedSearchOperator.value = 'gte'
  appliedAdvancedFilters.value = createOrderListAdvancedFilters()
}

const clearDraggedRowOrderRule = () => {
  draggedRowOrderRule = null
}

const handleRowOrderRuleDragStart = (event: DragEvent, ruleKey: RowOrderRuleKey, fromLane: RowOrderLaneKey) => {
  draggedRowOrderRule = {
    key: ruleKey,
    fromLane,
  }

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.dropEffect = 'move'
    event.dataTransfer.setData('text/plain', ruleKey)
  }
}

const handleRowOrderRuleDragOver = (event: DragEvent) => {
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const moveRowOrderRule = (ruleKey: RowOrderRuleKey, targetLane: RowOrderLaneKey, targetIndex?: number) => {
  const nextAvailable = availableRowOrderRuleKeys.value.filter((key) => key !== ruleKey)
  const nextActive = activeRowOrderRuleKeys.value.filter((key) => key !== ruleKey)
  const targetKeys = targetLane === 'available' ? nextAvailable : nextActive
  const sourceKeys = draggedRowOrderRule?.fromLane === 'available' ? availableRowOrderRuleKeys.value : activeRowOrderRuleKeys.value
  const sourceIndex = sourceKeys.indexOf(ruleKey)
  let normalizedIndex =
    targetIndex == null ? targetKeys.length : Math.min(Math.max(targetIndex, 0), targetKeys.length)

  // Preserve intuitive "drop before target card" behavior when reordering inside the same lane.
  if (draggedRowOrderRule?.fromLane === targetLane && sourceIndex >= 0 && targetIndex != null && sourceIndex < targetIndex) {
    normalizedIndex -= 1
  }

  targetKeys.splice(normalizedIndex, 0, ruleKey)

  availableRowOrderRuleKeys.value = nextAvailable
  activeRowOrderRuleKeys.value = nextActive
}

const handleRowOrderRuleDrop = (targetLane: RowOrderLaneKey, targetIndex?: number) => {
  if (!draggedRowOrderRule) return
  moveRowOrderRule(draggedRowOrderRule.key, targetLane, targetIndex)
  clearDraggedRowOrderRule()
}

const toggleRowOrderRuleLane = (ruleKey: RowOrderRuleKey, currentLane: RowOrderLaneKey) => {
  moveRowOrderRule(ruleKey, currentLane === 'available' ? 'active' : 'available')
}

const shiftActiveRowOrderRule = (ruleKey: RowOrderRuleKey, direction: -1 | 1) => {
  const currentIndex = activeRowOrderRuleKeys.value.indexOf(ruleKey)
  if (currentIndex === -1) return

  const nextIndex = currentIndex + direction
  if (nextIndex < 0 || nextIndex >= activeRowOrderRuleKeys.value.length) return

  const nextKeys = [...activeRowOrderRuleKeys.value]
  nextKeys.splice(currentIndex, 1)
  nextKeys.splice(nextIndex, 0, ruleKey)
  activeRowOrderRuleKeys.value = nextKeys
}

const resetRowState = () => {
  for (const key of Object.keys(initialCustomInputRows)) {
    delete initialCustomInputRows[key]
  }
  for (const key of Object.keys(productEdits)) {
    delete productEdits[key]
  }
  for (const key of Object.keys(orderEdits)) {
    delete orderEdits[key]
  }
  for (const key of Object.keys(savingProducts)) {
    delete savingProducts[key]
  }
  for (const key of Object.keys(productFeedback)) {
    delete productFeedback[key]
  }
  clearLiveUpdateUiState()
}

const clearUploadedPdfs = () => {
  stopPolling()
  pdfQueueStore.clearQueue()
  uploadError.value = ''
  uploadWarning.value = ''
  ordersStore.orders = []
  clearSearch()
  resetRowState()
  fileInputKey.value += 1
}

const refreshQueueResults = async () => {
  await pdfQueueStore.refreshLookupResults()
  syncOrdersStore(lookupResults.value)
  syncProductEdits()
  captureInitialCustomInputRows()

  if (!lookupResults.value.some((result) => result.found && result.order)) {
    uploadError.value = 'The PDFs contained order IDs, but none of them matched Amazon orders in the app.'
  } else {
    uploadError.value = ''
  }
}

const removeQueuedFile = async (fileKey: string) => {
  loadingPdf.value = true
  uploadError.value = ''
  uploadWarning.value = ''
  stopPolling()

  try {
    resetRowState()
    pdfQueueStore.removeFile(fileKey)

    if (!extractedEntries.value.length) {
      ordersStore.orders = []
      return
    }

    await refreshQueueResults()
    startPolling()
  } catch (error: any) {
    uploadError.value = error?.message || 'Failed to rebuild the PDF queue.'
  } finally {
    loadingPdf.value = false
  }
}

const formatRemoteFieldValue = (field: RemoteTrackedField, product: OrderProduct) => {
  switch (field) {
    case 'customer_width_in_inches':
      return numberToString(product.customer_width_in_inches) || 'Cleared'
    case 'customer_length_in_inches':
      return numberToString(product.customer_length_in_inches) || 'Cleared'
    case 'corner_radius_and_notes':
      return product.corner_radius_and_notes?.trim() || 'Cleared'
  }
}

const updateProductEditFromRemote = (rowKey: string, field: RemoteTrackedField, nextProduct: OrderProduct) => {
  const edit = productEdits[rowKey]
  if (!edit) return

  if (field === 'customer_width_in_inches') {
    edit.customer_width_in_inches = numberToString(nextProduct.customer_width_in_inches)
    edit.customer_width_in_mm = numberToString(nextProduct.customer_width_in_mm)
    return
  }

  if (field === 'customer_length_in_inches') {
    edit.customer_length_in_inches = numberToString(nextProduct.customer_length_in_inches)
    edit.customer_length_in_mm = numberToString(nextProduct.customer_length_in_mm)
    return
  }

  edit.corner_radius_and_notes = nextProduct.corner_radius_and_notes ?? ''
}

const getRemoteFieldChanges = (
  previousOrder: Order,
  nextOrder: Order,
  source: ExtractedEntry,
): RemoteFieldChange[] => {
  const previousProducts = new Map(
    (previousOrder.products || [])
      .filter((product) => !product.is_discount_line)
      .map((product) => [product.order_product_id, product] as const),
  )

  const changes: RemoteFieldChange[] = []

  for (const nextProduct of nextOrder.products || []) {
    if (nextProduct.is_discount_line) continue

    const previousProduct = previousProducts.get(nextProduct.order_product_id)
    if (!previousProduct) continue

    const rowKey = `${source.entryKey}:${nextProduct.order_product_id}`
    const trackedFields: RemoteTrackedField[] = [
      'customer_width_in_inches',
      'customer_length_in_inches',
      'corner_radius_and_notes',
    ]

    for (const field of trackedFields) {
      const previousValue = field === 'corner_radius_and_notes'
        ? previousProduct.corner_radius_and_notes?.trim() || ''
        : previousProduct[field]
      const nextValue = field === 'corner_radius_and_notes'
        ? nextProduct.corner_radius_and_notes?.trim() || ''
        : nextProduct[field]

      if (previousValue === nextValue) continue

      changes.push({
        rowKey,
        orderId: nextOrder.amazon_order_id,
        field,
        value: formatRemoteFieldValue(field, nextProduct),
        nextProduct,
      })
    }
  }

  return changes
}

const applyChangedOrders = (changedOrders: ChangedAmazonOrderResult[]) => {
  if (!changedOrders.length) {
    return
  }

  const changedOrderMap = new Map(
    changedOrders
      .filter((result): result is ChangedAmazonOrderResult & { order: Order } => Boolean(result.order))
      .map((result) => [result.amazon_order_id, result.order] as const),
  )

  const pendingChanges: RemoteFieldChange[] = []

  lookupResults.value = lookupResults.value.map((result, index) => {
    const nextOrder = changedOrderMap.get(result.requested_amazon_order_id)
    if (!nextOrder) {
      return result
    }

    const source = extractedEntries.value[index]
    if (source && result.found && result.order) {
      pendingChanges.push(...getRemoteFieldChanges(result.order, nextOrder, source))
    }

    orderEdits[nextOrder.amazon_order_id] = buildOrderEdit(nextOrder)

    return {
      ...result,
      found: true,
      order: nextOrder,
    }
  })

  syncOrdersStore(lookupResults.value)

  const changesByOrder = new Map<string, string[]>()

  for (const change of pendingChanges) {
    updateProductEditFromRemote(change.rowKey, change.field, change.nextProduct)
    markRowUpdated(change.rowKey)
    markCellUpdated(change.rowKey, change.field)

    const fieldMessage = `${REMOTE_FIELD_LABELS[change.field]}: ${change.value || 'Cleared'}`
    const existingMessages = changesByOrder.get(change.orderId) || []
    if (!existingMessages.includes(fieldMessage)) {
      existingMessages.push(fieldMessage)
      changesByOrder.set(change.orderId, existingMessages)
    }
  }

  for (const [orderId, messages] of changesByOrder.entries()) {
    queueRemoteUpdateToast(orderId, messages.join(' | '))
  }
}

const pollForRemoteUpdates = async () => {
  if (
    pollInFlight.value ||
    loadingPdf.value ||
    !extractedEntries.value.length ||
    !lastSuccessfulSyncAt.value ||
    document.visibilityState !== 'visible'
  ) {
    return
  }

  pollInFlight.value = true

  try {
    const response = await ordersApi.getChangedByIDs(
      extractedEntries.value.map((entry) => entry.amazonOrderId),
      lastSuccessfulSyncAt.value,
    )
    missingOrderIds.value = response.missing_amazon_order_ids
    applyChangedOrders(response.changed_orders)
    lastSuccessfulSyncAt.value = response.server_time
  } catch {
    // Keep polling quiet. Operators should not lose screen state because of a transient refresh failure.
  } finally {
    pollInFlight.value = false
  }
}

const startPolling = () => {
  if (pollTimerId || !extractedEntries.value.length || document.visibilityState !== 'visible') {
    return
  }

  pollTimerId = window.setInterval(() => {
    void pollForRemoteUpdates()
  }, POLL_INTERVAL_MS)
}

const stopPolling = () => {
  if (!pollTimerId) return
  window.clearInterval(pollTimerId)
  pollTimerId = undefined
}

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible' && extractedEntries.value.length) {
    void pollForRemoteUpdates()
    startPolling()
    return
  }

  stopPolling()
}

const triggerManualSync = async () => {
  await pollForRemoteUpdates()
}

const applyBulkStatusUpdate = async () => {
  if (!bulkOrderStatus.value || selectedVisibleRows.value.length === 0) return

  bulkSaving.value = true
  bulkFeedback.value = ''

  try {
    const selectedRowCount = selectedVisibleRows.value.length
    const uniqueOrderIds = [...new Set(selectedVisibleRows.value.map((row) => row.order.amazon_order_id))]
    for (const amazonOrderId of uniqueOrderIds) {
      const updated = await withTimeout(
        ordersStore.updateOrderManualFields(amazonOrderId, {
          order_status: bulkOrderStatus.value,
        }),
        SAVE_TIMEOUT_MS,
      )
      orderEdits[amazonOrderId] = buildOrderEdit(updated)
    }

    syncProductEdits()
    bulkFeedback.value = `Updated ${selectedRowCount} selected rows across ${uniqueOrderIds.length} orders`
  } catch (error: any) {
    bulkFeedback.value = error.response?.data?.error || error.message || 'Bulk update failed'
  } finally {
    bulkSaving.value = false
  }
}

watch(
  () => visibleRows.value.map((row) => row.rowKey),
  (rowKeys) => {
    pruneRowSelection(rowKeys)
  },
  { immediate: true },
)

const handleFileSelection = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = [...(input.files || [])].filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))

  if (!files.length) {
    uploadError.value = 'Please upload at least one PDF file.'
    return
  }

  loadingPdf.value = true
  uploadError.value = ''
  uploadWarning.value = ''
  stopPolling()

  try {
    const extractedFiles: Array<{ fileName: string; entries: Array<{ pageNumber: number; amazonOrderId: string }> }> = []

    for (const file of files) {
      const extracted = await extractAmazonOrderIdsFromPdf(file)
      extractedFiles.push({
        fileName: file.name,
        entries: extracted,
      })
    }

    if (!extractedFiles.some((file) => file.entries.length > 0)) {
      uploadError.value = 'No Amazon order IDs were found in the uploaded PDFs.'
      return
    }

    const appendResult = pdfQueueStore.appendFiles(extractedFiles)

    if (appendResult.duplicateFileNames.length) {
      uploadWarning.value = `Skipped duplicate PDF files: ${appendResult.duplicateFileNames.join(', ')}`
    }

    if (appendResult.addedFileNames.length === 0) {
      if (!uploadWarning.value) {
        uploadError.value = 'No new PDF files were added to the queue.'
      }
      return
    }

    resetRowState()
    await refreshQueueResults()
    startPolling()
  } catch (error: any) {
    uploadError.value = error?.message || 'Failed to read the uploaded PDFs.'
  } finally {
    loadingPdf.value = false
    input.value = ''
  }
}

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
  let timeoutId: number | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error('Save timed out. Please try again.'))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
  }
}

const saveProductRow = async (row: VisibleRow) => {
  const key = row.rowKey
  const edit = row.productEdit
  if (!edit) return

  savingProducts[key] = true
  productFeedback[key] = ''

  try {
    const payload: UpdateProductManualFieldsRequest = {
      customer_width_in_inches: toOptionalNumber(edit.customer_width_in_inches),
      customer_length_in_inches: toOptionalNumber(edit.customer_length_in_inches),
      customer_width_in_mm: toOptionalNumber(edit.customer_width_in_mm),
      customer_length_in_mm: toOptionalNumber(edit.customer_length_in_mm),
      corner_radius_and_notes: edit.corner_radius_and_notes || undefined,
    }
    const orderPayload: UpdateManualFieldsRequest = {
      order_status: row.orderEdit.order_status || 'received',
    }

    await withTimeout(
      ordersStore.updateOrderManualFields(row.order.amazon_order_id, orderPayload),
      SAVE_TIMEOUT_MS,
    )

    await withTimeout(
      ordersStore.updateProductManualFields(row.order.amazon_order_id, row.product.order_product_id, payload),
      SAVE_TIMEOUT_MS,
    )

    syncProductEdits()
    productFeedback[key] = 'Saved'
  } catch (error: any) {
    productFeedback[key] = error.response?.data?.error || error.message || 'Save failed'
  } finally {
    savingProducts[key] = false
  }
}

const restoreQueueState = async () => {
  if (!extractedEntries.value.length) {
    ordersStore.orders = []
    return
  }

  if (lookupResults.value.length === extractedEntries.value.length) {
    syncOrdersStore(lookupResults.value)
    syncProductEdits()
    captureInitialCustomInputRows()
    if (!lastSuccessfulSyncAt.value) {
      lastSuccessfulSyncAt.value = new Date().toISOString()
    }
    startPolling()
    return
  }

  loadingPdf.value = true
  uploadError.value = ''
  uploadWarning.value = ''

  try {
    await refreshQueueResults()
    startPolling()
  } catch (error: any) {
    uploadError.value = error?.message || 'Failed to restore the PDF queue.'
  } finally {
    loadingPdf.value = false
  }
}

onMounted(() => {
  void rowHighlightRulesStore.ensureLoaded()
  document.addEventListener('visibilitychange', handleVisibilityChange)
  void restoreQueueState()
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  stopPolling()
  clearLiveUpdateUiState()
})

function matchesAdvancedFilters(row: VisibleRow, filters: OrderListAdvancedFilters) {
  const confirmedAt = row.order.date_confirmed || row.order.date_add
  if (filters.confirmed_date_from && !matchesDateTimeRangeStart(confirmedAt, filters.confirmed_date_from)) {
    return false
  }
  if (filters.confirmed_date_to && !matchesDateTimeRangeEnd(confirmedAt, filters.confirmed_date_to)) {
    return false
  }
  if (filters.priority && !matchesText(row.order.priority, filters.priority)) {
    return false
  }
  if (filters.order_status && !matchesText(row.order.order_status, filters.order_status)) {
    return false
  }
  if (filters.thickness && !includesText(row.product.thickness, filters.thickness)) {
    return false
  }
  if (filters.sku && !includesText(row.product.sku, filters.sku)) {
    return false
  }
  if (filters.is_round && !Boolean(row.product.is_round)) {
    return false
  }
  if (filters.customer_inputs_mode === 'has_customer_inputs' && !productHasCustomerInputs(row.product)) {
    return false
  }
  if (filters.customer_inputs_mode === 'no_custom_inputs' && productHasCustomerInputs(row.product)) {
    return false
  }
  if (filters.quantity && !compareNumber(row.product.quantity, filters.quantity, filters.quantity_operator)) {
    return false
  }
  if (
    filters.default_width_in_inches &&
    !compareNumber(row.product.default_width_in_inches, filters.default_width_in_inches, filters.default_width_in_inches_operator)
  ) {
    return false
  }
  if (
    filters.default_length_in_inches &&
    !compareNumber(row.product.default_length_in_inches, filters.default_length_in_inches, filters.default_length_in_inches_operator)
  ) {
    return false
  }
  return true
}

function matchesSearch(
  row: VisibleRow,
  key: string,
  value: string,
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq',
) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return true

  switch (key) {
    case 'order_id':
      return includesText(row.order.amazon_order_id, trimmedValue)
    case 'customer':
      return includesText(row.order.delivery_fullname || row.order.user_login, trimmedValue)
    case 'phone':
      return includesText(row.order.phone, trimmedValue)
    case 'sku':
      return includesText(row.product.sku, trimmedValue)
    case 'thickness':
      return includesText(row.product.thickness, trimmedValue)
    case 'priority':
      return matchesText(row.order.priority, trimmedValue)
    case 'is_round':
      return String(Boolean(row.product.is_round)) === trimmedValue.toLowerCase()
    case 'confirmed_date':
      return matchesDateOnly(row.order.date_confirmed || row.order.date_add, trimmedValue)
    case 'order_status':
      return matchesText(row.order.order_status, trimmedValue)
    case 'default_width_in_inches':
      return compareNumber(row.product.default_width_in_inches, trimmedValue, operator)
    case 'default_length_in_inches':
      return compareNumber(row.product.default_length_in_inches, trimmedValue, operator)
    default:
      return true
  }
}

function matchesVisibleRowFilters(
  row: VisibleRow,
  filters: OrderListAdvancedFilters,
  searchKey: string,
  searchValue: string,
  searchOperator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq',
) {
  if (!matchesAdvancedFilters(row, filters)) {
    return false
  }
  return matchesSearch(row, searchKey, searchValue, searchOperator)
}

function productHasCustomerInputs(product: OrderProduct) {
  return (
    product.customer_width_in_inches != null ||
    product.customer_length_in_inches != null ||
    product.customer_width_in_mm != null ||
    product.customer_length_in_mm != null ||
    Boolean(product.corner_radius_and_notes?.trim())
  )
}

function rowWasInitiallyCustom(rowKey: string) {
  return Boolean(initialCustomInputRows[rowKey])
}

function productHasInitialCustomInputs(product: OrderProduct) {
  return (
    product.customer_width_in_inches != null ||
    product.customer_length_in_inches != null ||
    Boolean(product.corner_radius_and_notes?.trim())
  )
}

function rowMatchesOrderRule(row: VisibleRow, ruleKey: RowOrderRuleKey) {
  switch (ruleKey) {
    case 'manufactured':
      return matchesText(row.order.order_status, 'manufactured')
    case 'has_custom_inputs':
      return productHasCustomerInputs(row.product)
    case 'no_custom_inputs':
      return !productHasCustomerInputs(row.product)
    case 'is_round':
      return Boolean(row.product.is_round)
    case 'more_than_1_qty':
      return Number(row.product.quantity ?? 0) > 1
  }
}

function orderRowsByActiveRules(rows: VisibleRow[], activeRuleKeys: RowOrderRuleKey[]) {
  if (activeRuleKeys.length === 0) {
    return rows
  }

  const prioritizedRows: VisibleRow[] = []
  let remainingRows = [...rows]

  for (const ruleKey of activeRuleKeys) {
    const matchedRows: VisibleRow[] = []
    const nextRemainingRows: VisibleRow[] = []

    for (const row of remainingRows) {
      if (rowMatchesOrderRule(row, ruleKey)) {
        matchedRows.push(row)
      } else {
        nextRemainingRows.push(row)
      }
    }

    if (ruleKey === 'has_custom_inputs') {
      const initialCustomRows = matchedRows.filter((row) => rowWasInitiallyCustom(row.rowKey))
      const realtimeCustomRows = matchedRows.filter(
        (row) => !rowWasInitiallyCustom(row.rowKey) && isRowUpdated(row.rowKey),
      )
      const otherCustomRows = matchedRows.filter(
        (row) => !rowWasInitiallyCustom(row.rowKey) && !isRowUpdated(row.rowKey),
      )

      prioritizedRows.push(...initialCustomRows, ...otherCustomRows, ...realtimeCustomRows)
    } else {
      prioritizedRows.push(...matchedRows)
    }
    remainingRows = nextRemainingRows
  }

  return [...prioritizedRows, ...remainingRows]
}

function includesText(source?: string | null, target?: string | null) {
  return String(source || '').toLowerCase().includes(String(target || '').trim().toLowerCase())
}

function matchesText(source?: string | null, target?: string | null) {
  return String(source || '').trim().toLowerCase() === String(target || '').trim().toLowerCase()
}

function matchesDateOnly(source?: string | null, target?: string | null) {
  if (!source || !target) return false
  const parsed = new Date(source)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.toISOString().slice(0, 10) === target
}

function matchesDateTimeRangeStart(source?: string | null, target?: string | null) {
  if (!source || !target) return false
  const sourceTime = new Date(source).getTime()
  const targetTime = new Date(target).getTime()
  if (Number.isNaN(sourceTime) || Number.isNaN(targetTime)) return false
  return sourceTime >= targetTime
}

function matchesDateTimeRangeEnd(source?: string | null, target?: string | null) {
  if (!source || !target) return false
  const sourceTime = new Date(source).getTime()
  const targetTime = new Date(target).getTime()
  if (Number.isNaN(sourceTime) || Number.isNaN(targetTime)) return false
  return sourceTime <= targetTime
}

function compareNumber(
  source: number | null | undefined,
  target: string | null | undefined,
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq',
) {
  if (source == null || target == null || target === '') return false
  const parsedTarget = Number(target)
  if (!Number.isFinite(parsedTarget)) return false

  switch (operator) {
    case 'gt':
      return source > parsedTarget
    case 'gte':
      return source >= parsedTarget
    case 'lt':
      return source < parsedTarget
    case 'lte':
      return source <= parsedTarget
    case 'eq':
    default:
      return source === parsedTarget
  }
}
</script>

<style scoped>
.cnc-page {
  max-width: 1820px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.toast-stack {
  position: fixed;
  top: 1.25rem;
  right: 1.25rem;
  z-index: 1200;
  display: grid;
  gap: 0.75rem;
  width: min(28rem, calc(100vw - 2rem));
}

.update-toast {
  display: grid;
  gap: 0.25rem;
  padding: 0.95rem 1rem;
  border-radius: 18px;
  border: 1px solid rgba(234, 88, 12, 0.28);
  background: linear-gradient(135deg, rgba(255, 237, 213, 0.98), rgba(255, 247, 237, 0.98));
  color: #9a3412;
  box-shadow: 0 18px 36px rgba(154, 52, 18, 0.16);
}

.update-toast strong {
  font-size: 0.92rem;
  font-weight: 900;
}

.update-toast span {
  font-size: 0.88rem;
  line-height: 1.4;
  font-weight: 700;
}

.cnc-hero,
.update-log-card,
.upload-card,
.result-card,
.active-files-card,
.missing-orders-card,
.redundant-orders-card,
.sequence-card,
.cnc-shell {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.cnc-hero {
  padding: 1.5rem 1.65rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.16), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(239, 246, 255, 0.92));
}

.eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.74rem;
  font-weight: 800;
  color: #0f766e;
}

h1,
h2,
h3 {
  margin: 0;
  color: #0f172a;
}

h1 {
  font-size: clamp(2rem, 3.8vw, 3.2rem);
  line-height: 1;
  font-weight: 900;
}

.cnc-hero__copy,
.upload-card__copy p,
.sequence-card__header p {
  margin: 0.8rem 0 0;
  max-width: 64ch;
  color: #475569;
}

.cnc-hero__summary {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.summary-pill,
.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 800;
  background: #e0f2fe;
  color: #075985;
}

.upload-card,
.update-log-card,
.result-card,
.active-files-card,
.missing-orders-card,
.redundant-orders-card,
.sequence-card,
.cnc-shell {
  padding: 1.2rem;
}

.cnc-shell {
  display: grid;
  gap: 1rem;
}

.cnc-shell__controls {
  display: grid;
  gap: 1rem;
}

.row-order-lanes-card {
  display: grid;
  gap: 0.9rem;
  padding: 0.95rem 1rem;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.98));
}

.row-order-lanes-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.row-order-lanes-card__header p {
  margin: 0.38rem 0 0;
  color: #475569;
  max-width: 70ch;
  font-size: 0.88rem;
}

.row-order-lanes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.row-order-lane {
  display: grid;
  gap: 0.72rem;
  padding: 0.85rem;
  border-radius: 16px;
  border: 1px dashed rgba(148, 163, 184, 0.45);
  background: rgba(255, 255, 255, 0.92);
}

.row-order-lane--active {
  border-color: rgba(2, 132, 199, 0.32);
  background: rgba(239, 246, 255, 0.72);
}

.row-order-lane__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: #0f172a;
}

.row-order-lane__header strong {
  font-size: 0.92rem;
}

.row-order-lane__header span {
  color: #475569;
  font-size: 0.8rem;
  font-weight: 800;
}

.row-order-lane__body {
  display: grid;
  gap: 0.55rem;
  min-height: 3.2rem;
}

.row-order-lane__body--empty {
  align-content: center;
}

.row-order-lane__empty {
  margin: 0;
  color: #64748b;
  font-size: 0.83rem;
  font-weight: 700;
}

.row-order-rule-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.7rem 0.8rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
  cursor: grab;
}

.row-order-rule-card--active {
  border-color: rgba(14, 165, 233, 0.24);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(239, 246, 255, 0.88));
}

.row-order-rule-card:active {
  cursor: grabbing;
}

.row-order-rule-card__copy {
  display: grid;
  gap: 0.12rem;
  min-width: 0;
}

.row-order-rule-card__copy strong {
  color: #0f172a;
  font-size: 0.9rem;
}

.row-order-rule-card__copy span {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.35;
}

.row-order-rule-card__action {
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  padding: 0.42rem 0.72rem;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 0.75rem;
  font-weight: 900;
  cursor: pointer;
}

.row-order-rule-card__action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.row-order-rule-card__actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.bulk-toolbar {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.bulk-toolbar__select-all {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  color: #0f172a;
}

.bulk-toolbar__count,
.bulk-toolbar__feedback {
  font-size: 0.88rem;
  font-weight: 700;
  color: #475569;
}

.sheet-input.bulk-toolbar__status {
  flex: 0 0 clamp(11rem, 16vw, 13rem);
  width: clamp(11rem, 16vw, 13rem);
  max-width: 100%;
}

.sync-actions {
  display: flex;
  justify-content: flex-end;
}

.sync-button {
  min-width: 8.5rem;
}

.row-has-custom-inputs > td {
  background: rgba(236, 255, 186, 0.9) !important;
  transition: background-color 0.25s ease;
}

.row-has-custom-inputs.row-updated > td,
.row-updated > td {
  background: rgba(255, 237, 213, 0.88) !important;
  transition: background-color 0.25s ease;
}

.upload-card {
  display: grid;
  gap: 1rem;
}

.result-card {
  display: grid;
  gap: 1rem;
}

.active-files-card {
  display: grid;
  gap: 1rem;
}

.active-files-card__header p {
  margin: 0.45rem 0 0;
  color: #475569;
}

.update-log-card {
  display: grid;
  gap: 0.9rem;
}

.update-log-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.update-log-card__header p {
  margin: 0.45rem 0 0;
  color: #475569;
  max-width: 72ch;
}

.update-log-list {
  display: grid;
  gap: 0.6rem;
  max-height: 18rem;
  overflow-y: auto;
  padding-right: 0.2rem;
}

.update-log-item {
  display: grid;
  gap: 0.3rem;
  padding: 0.72rem 0.88rem;
  border-radius: 14px;
  border: 1px solid rgba(234, 88, 12, 0.18);
  background: linear-gradient(135deg, rgba(255, 247, 237, 0.98), rgba(255, 255, 255, 0.98));
}

.update-log-item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.update-log-item__meta strong {
  color: #9a3412;
  font-size: 0.9rem;
  font-weight: 900;
}

.update-log-item__meta span {
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 800;
}

.update-log-item p {
  margin: 0;
  color: #7c2d12;
  font-size: 0.85rem;
  line-height: 1.42;
  font-weight: 700;
}

.active-files-card__header--actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.active-files-list {
  display: grid;
  gap: 0.7rem;
}

.active-file-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 18px;
  padding: 0.85rem 1rem;
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid rgba(59, 130, 246, 0.18);
}

.active-file-card__copy {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
}

.active-file-card__copy strong {
  color: #0f172a;
  font-size: 0.95rem;
}

.active-file-card__copy span {
  color: #475569;
  font-size: 0.82rem;
  font-weight: 700;
}

.active-file-card__remove {
  flex-shrink: 0;
}

.missing-orders-card {
  display: grid;
  gap: 1rem;
}

.redundant-orders-card {
  display: grid;
  gap: 1rem;
}

.missing-orders-card__header p {
  margin: 0.45rem 0 0;
  color: #475569;
}

.redundant-orders-card__header p {
  margin: 0.45rem 0 0;
  color: #475569;
}

.missing-orders-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.redundant-orders-list {
  display: grid;
  gap: 0.55rem;
}

.missing-order-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.6rem 0.9rem;
  background: #fff7ed;
  color: #c2410c;
  font-weight: 800;
  border: 1px solid rgba(249, 115, 22, 0.2);
}

.redundant-order-card {
  display: grid;
  grid-template-columns: minmax(12rem, auto) minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 0.65rem 0.85rem;
  border-radius: 14px;
  padding: 0.65rem 0.85rem;
  background: #fff7ed;
  border: 1px solid rgba(249, 115, 22, 0.2);
  color: #9a3412;
}

.redundant-order-card__id {
  color: #7c2d12;
  font-size: 0.94rem;
  white-space: nowrap;
}

.redundant-order-card__meta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.redundant-order-card__tag {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  background: rgba(249, 115, 22, 0.14);
  color: #c2410c;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.redundant-order-card__tag--kept {
  background: rgba(13, 148, 136, 0.12);
  color: #0f766e;
}

.redundant-order-card__text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8rem;
  font-weight: 700;
}

.result-card__header p {
  margin: 0.45rem 0 0;
  color: #475569;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.85rem;
}

.result-stat {
  border-radius: 20px;
  padding: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.28);
  display: grid;
  gap: 0.35rem;
}

.result-stat--neutral {
  background: #f8fafc;
}

.result-stat--success {
  background: #ecfdf5;
}

.result-stat--warning {
  background: #fff7ed;
}

.result-stat__label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.result-stat__value {
  font-size: 2rem;
  line-height: 1;
  color: #0f172a;
}

.upload-card__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.upload-button,
.secondary-button,
.save-button,
.view-link,
.action-button {
  border: 0;
  border-radius: 999px;
  padding: 0.75rem 1.2rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
}

.upload-button,
.save-button,
.action-button {
  background: linear-gradient(135deg, #0284c7, #0f766e);
  color: #fff;
  box-shadow: 0 18px 36px rgba(2, 132, 199, 0.24);
}

.action-button--inline {
  width: auto;
  min-width: 13rem;
}

.secondary-button,
.view-link {
  background: #e2e8f0;
  color: #0f172a;
  text-decoration: none;
}

.upload-button:hover,
.secondary-button:hover,
.save-button:hover,
.view-link:hover {
  transform: translateY(-1px);
}

.upload-button:disabled,
.secondary-button:disabled,
.save-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

.upload-input {
  display: none;
}

.upload-message {
  margin: 0;
  font-weight: 700;
}

.upload-message--error {
  color: #b91c1c;
}

.upload-message--warning {
  color: #92400e;
}

.sequence-card {
  display: grid;
  gap: 1rem;
}

.sequence-list {
  display: grid;
  gap: 0.55rem;
}

.sequence-item {
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #f8fafc;
  padding: 0.72rem 0.9rem;
  display: grid;
  grid-template-columns: minmax(12rem, auto) auto minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
}

.sequence-item__file {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #0f172a;
  font-size: 0.98rem;
}

.sequence-item__meta {
  margin: 0;
  color: #475569;
  font-weight: 700;
  white-space: nowrap;
}

.sequence-item__line {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #334155;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.79rem;
  font-weight: 700;
}

.empty-state {
  padding: 3rem 1rem;
  text-align: center;
  color: #475569;
  font-weight: 700;
}

.sheet-wrap {
  overflow-x: auto;
  padding-bottom: 0.35rem;
}

.cnc-sheet {
  width: 100%;
  min-width: 1760px;
  border-collapse: separate;
  border-spacing: 0;
}

.cnc-sheet th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0.68rem 0.52rem;
  text-align: left;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #0f766e;
  background: #f8fafc;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
}

.cnc-sheet td {
  padding: 0.62rem 0.52rem;
  vertical-align: top;
  border-bottom: 1px solid rgba(226, 232, 240, 0.85);
  color: #0f172a;
  background: var(--row-highlight-background, rgba(255, 255, 255, 0.9));
  font-size: 0.94rem;
}

.cell-check {
  width: 2.8rem;
  min-width: 2.8rem;
  text-align: center;
}

.order-id-line,
.product-title {
  font-weight: 800;
  color: #0f172a;
}

.order-subline,
.cell-pdf,
.product-feedback {
  color: #64748b;
  font-size: 0.78rem;
}

.cell-pdf {
  min-width: 8.4rem;
  font-size: 0.8rem;
}

.cell-page,
.cell-quantity,
.cell-round,
.cell-metric {
  text-align: center;
}

.cell-page {
  width: 3.4rem;
}

.cell-date {
  min-width: 7.2rem;
}

.cell-order {
  min-width: 12.6rem;
}

.cell-product {
  min-width: 13rem;
  max-width: 14.5rem;
}

.product-title {
  font-weight: 700;
  font-size: 0.92rem;
  line-height: 1.32;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}

.cell-thickness {
  min-width: 4.8rem;
  white-space: nowrap;
}

.cell-sku {
  min-width: 5.4rem;
  overflow-wrap: anywhere;
}

.cell-metric {
  min-width: 4.1rem;
}

.cell-input-group,
.cell-mm,
.cell-notes,
.cell-actions {
  min-width: 160px;
}

.cell-input-group {
  min-width: 12.1rem;
}

.cell-mm {
  min-width: 8.5rem;
}

.cell-notes {
  min-width: 14.5rem;
}

.cell-status-edit {
  min-width: 8.2rem;
}

.cell-customer {
  min-width: 8.2rem;
}

.cell-city {
  min-width: 6.6rem;
}

.sheet-input,
.sheet-textarea {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(255, 255, 255, 0.96);
  padding: 0.5rem 0.62rem;
  font: inherit;
  font-size: 0.88rem;
  color: #0f172a;
}

.sheet-textarea {
  min-height: 68px;
  resize: vertical;
}

.sheet-input--remote-updated,
.sheet-textarea--remote-updated {
  color: #991b1b;
  font-weight: 900;
  border-color: rgba(220, 38, 38, 0.55);
  background: rgba(254, 242, 242, 0.96);
  box-shadow: 0 0 0 1px rgba(220, 38, 38, 0.08);
}

.sheet-input--mm {
  min-width: 7.6rem;
}

.increment-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.28rem;
  margin-top: 0.3rem;
}

.increment-button {
  border: 0;
  border-radius: 999px;
  padding: 0.22rem 0.45rem;
  font-size: 0.68rem;
  font-weight: 800;
  background: #dbeafe;
  color: #1d4ed8;
  cursor: pointer;
}

.increment-button--indicator {
  min-width: 5rem;
  justify-content: center;
  background: #e2e8f0;
  color: #334155;
  cursor: default;
}

.increment-button--indicator:disabled {
  opacity: 1;
}

.cell-actions {
  display: grid;
  gap: 0.32rem;
  min-width: 7.8rem;
}

.save-button,
.view-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 2.35rem;
  border-radius: 12px;
  font-weight: 800;
}

.cell-round .status-pill {
  padding: 0.28rem 0.58rem;
  font-size: 0.76rem;
}

.order-id-line {
  font-size: 0.96rem;
  line-height: 1.2;
}

.order-subline {
  margin-top: 0.16rem;
  line-height: 1.15;
}

@media (max-width: 900px) {
  .toast-stack {
    top: 0.8rem;
    right: 0.8rem;
    width: min(24rem, calc(100vw - 1.6rem));
  }

  .cnc-hero {
    flex-direction: column;
  }

  .bulk-toolbar {
    align-items: stretch;
  }

  .row-order-lanes {
    grid-template-columns: 1fr;
  }

  .row-order-rule-card {
    align-items: flex-start;
  }

  .redundant-order-card {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .sheet-input.bulk-toolbar__status,
  .action-button--inline {
    width: 100%;
  }

  .sync-actions {
    justify-content: stretch;
  }

  .upload-card__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .upload-button,
  .secondary-button,
  .sync-button {
    text-align: center;
  }

  .result-grid {
    grid-template-columns: 1fr;
  }

  .sequence-item {
    grid-template-columns: 1fr;
    align-items: start;
  }
}
</style>
