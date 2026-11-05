<template>
  <div class="courier-workspace">
    <header class="cw-card cw-hero"><div><p class="cw-eyebrow">Courier configuration</p><h1>Courier Settings</h1><p class="cw-muted">Manage DTDC service modes and label preferences while the app is running.</p></div><router-link to="/courier-shipments" class="cw-button">Courier Shipments</router-link></header>
    <p v-if="error" class="cw-notice cw-error" role="alert">{{ error }}</p><p v-if="message" class="cw-notice" role="status">{{ message }}</p>
    <p v-if="loading" class="cw-card cw-empty">Loading courier settings…</p>
    <form v-else-if="form" class="cw-card" @submit.prevent="save">
      <h2>DTDC service modes</h2><p class="cw-muted">Add the exact API service code supplied by DTDC, such as B2B PREMIUM or B2C EXPRESS. Adding a mode makes it selectable; DTDC must enable it on your account.</p>
      <fieldset :disabled="saving" class="mode-list"><legend class="sr-only">Service modes</legend>
        <div v-for="(mode,index) in form.dtdc_modes" :key="index" class="mode-row">
          <label>Service code<input v-model.trim="mode.code" :aria-label="`Service code ${index + 1}`" maxlength="30" required placeholder="B2B PREMIUM" /></label>
          <label>Display name<input v-model.trim="mode.label" :aria-label="`Display name ${index + 1}`" maxlength="100" placeholder="Optional friendly name" /></label>
          <label class="cw-check"><input v-model="mode.enabled" type="checkbox" /> Enabled</label>
          <button type="button" class="cw-danger" :aria-label="`Remove service ${index + 1}`" @click="remove(index)">Remove</button>
        </div>
        <button type="button" @click="add">Add service mode</button>
        <hr class="cw-divider" />
        <div class="defaults-grid">
          <label>Default DTDC service<select v-model="form.dtdc_default_service" aria-label="Default DTDC service" required><option disabled value="">Choose a service</option><option v-for="mode in enabledModes" :key="mode.code" :value="mode.code.toUpperCase()">{{ mode.label || mode.code }} · {{ mode.code }}</option></select></label>
          <label>Default commodity ID or name<input v-model.trim="form.dtdc_default_commodity" maxlength="100" required list="setting-commodities" placeholder="84 — PLASTIC ITEMS" /><datalist id="setting-commodities"><option v-for="commodity in commodities" :key="commodity.id" :value="commodity.id">{{ commodity.name }}</option></datalist></label>
          <label>Default label size<select v-model="form.dtdc_label_code" aria-label="Default label size"><option value="SHIP_LABEL_4X6">4 × 6</option><option value="SHIP_LABEL_A4">A4</option><option value="SHIP_LABEL_A6">A6</option></select></label>
          <label class="cw-check"><input v-model="form.auto_download_dtdc_labels" type="checkbox" /> Automatically download DTDC labels after successful booking</label>
        </div>
      </fieldset>
      <p class="cw-muted">Credentials and pickup details remain in the seller's backend configuration. Delhivery booking settings are unchanged.</p>
      <div class="cw-actions"><button type="submit" class="cw-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save courier settings' }}</button><button type="button" :disabled="saving" @click="load">Reload saved settings</button></div>
    </form>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { directOrdersApi } from '@/api/directOrders'
import { courierError } from '@/utils/courier'
import type { CourierSettings } from '@/types'
import '@/assets/courier-workspace.css'
const form=ref<CourierSettings|null>(null)
const commodities=ref<{ id:string;name:string }[]>([])
const loading=ref(false),saving=ref(false),error=ref(''),message=ref('')
const enabledModes=computed(()=>form.value?.dtdc_modes.filter(mode=>mode.enabled && mode.code.trim()) || [])
function add(){form.value?.dtdc_modes.push({code:'',label:'',enabled:true});message.value=''}
function remove(index:number){if(form.value)form.value.dtdc_modes.splice(index,1)}
async function load(){loading.value=true;error.value='';message.value='';try{const [settings,metadata]=await Promise.all([directOrdersApi.courierSettings(),directOrdersApi.dtdcSettings()]);form.value=settings;commodities.value=metadata.commodity_options || []}catch(err){error.value=await courierError(err)}finally{loading.value=false}}
async function save(){if(!form.value)return;saving.value=true;error.value='';message.value='';try{form.value=await directOrdersApi.saveCourierSettings(form.value);message.value='Courier settings saved. New bookings use these settings immediately; no restart is required.'}catch(err){error.value=await courierError(err)}finally{saving.value=false}}
onMounted(load)
</script>
<style scoped>
.mode-list { border:0; padding:0; margin:1.1rem 0; min-width:0; display:grid; gap:.8rem; }
.mode-row { display:grid; grid-template-columns:minmax(150px,1fr) minmax(150px,1fr) auto auto; gap:.8rem; align-items:end; padding:.9rem; border:1px solid #e2e8f0; border-radius:12px; background:#f8fafc; }
.defaults-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; }
.sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); }
@media(max-width:720px) { .mode-row,.defaults-grid { grid-template-columns:1fr; } }
</style>
