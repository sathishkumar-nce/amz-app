import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { amazonRowHighlightRulesApi } from '@/api/amazonRowHighlightRules'
import type { AmazonRowHighlightRule, Order, OrderProduct } from '@/types'

export const useAmazonRowHighlightRulesStore = defineStore('amazonRowHighlightRules', () => {
  const rules = ref<AmazonRowHighlightRule[]>([])
  const loading = ref(false)
  const initialized = ref(false)

  const enabledRules = computed(() =>
    [...rules.value]
      .filter((rule) => rule.enabled)
      .sort((left, right) => left.sort_order - right.sort_order),
  )

  const applyRules = (items: AmazonRowHighlightRule[]) => {
    rules.value = [...items].sort((left, right) => left.sort_order - right.sort_order)
  }

  async function ensureLoaded() {
    if (initialized.value) return
    loading.value = true
    try {
      const response = await amazonRowHighlightRulesApi.list()
      applyRules(response.rules)
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  async function refresh() {
    loading.value = true
    try {
      const response = await amazonRowHighlightRulesApi.list()
      applyRules(response.rules)
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  async function saveAll(items: AmazonRowHighlightRule[]) {
    loading.value = true
    try {
      const response = await amazonRowHighlightRulesApi.updateAll(items)
      applyRules(response.rules)
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  async function resetDefaults() {
    loading.value = true
    try {
      const response = await amazonRowHighlightRulesApi.resetDefaults()
      applyRules(response.rules)
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  const getRowHighlightStyle = (order: Order, products: OrderProduct[] = []) => {
    for (const rule of enabledRules.value) {
      if (!ruleMatches(rule, order, products)) continue

      if (rule.color_mode === 'gradient' && rule.color_end) {
        return {
          '--row-highlight-background': `linear-gradient(135deg, ${rule.color_start}, ${rule.color_end})`,
        }
      }

      return {
        '--row-highlight-background': rule.color_start,
      }
    }

    return {}
  }

  return {
    rules,
    loading,
    initialized,
    enabledRules,
    ensureLoaded,
    refresh,
    saveAll,
    resetDefaults,
    getRowHighlightStyle,
  }
})

function ruleMatches(rule: AmazonRowHighlightRule, order: Order, products: OrderProduct[]) {
  if (rule.field_name === 'priority') {
    return matchTextValue(order.priority, rule)
  }
  if (rule.field_name === 'payment_done') {
    return matchNumericValue(order.payment_done ?? 0, rule)
  }
  if (rule.field_name === 'quantity') {
    return products.some((product) => matchNumericValue(product.quantity ?? 0, rule))
  }
  if (rule.field_name === 'is_round') {
    return products.some((product) => matchBooleanValue(Boolean(product.is_round), rule))
  }
  return false
}

function matchNumericValue(value: number, rule: AmazonRowHighlightRule) {
  if (rule.operator !== 'gt' || rule.threshold_number == null) return false
  return value > rule.threshold_number
}

function matchTextValue(value: string | null | undefined, rule: AmazonRowHighlightRule) {
  if (rule.operator !== 'eq') return false
  return String(value ?? '').trim().toLowerCase() === String(rule.match_text ?? '').trim().toLowerCase()
}

function matchBooleanValue(value: boolean, rule: AmazonRowHighlightRule) {
  if (rule.operator !== 'eq') return false
  return String(value) === String(rule.match_text ?? '').trim().toLowerCase()
}
