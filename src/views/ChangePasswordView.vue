<template>
  <div class="change-page">
    <section class="change-card">
      <div>
        <p class="eyebrow">Security step</p>
        <h1>Change Your Password</h1>
        <p class="copy">
          Your account is using the default password. Set a new password before continuing.
        </p>
      </div>

      <form class="form-grid" @submit.prevent="handleSubmit">
        <label class="field">
          <span>Current password</span>
          <input v-model="form.current_password" type="password" required />
        </label>
        <label class="field">
          <span>New password</span>
          <input v-model="form.new_password" type="password" required minlength="6" />
        </label>
        <label class="field">
          <span>Confirm new password</span>
          <input v-model="confirmPassword" type="password" required minlength="6" />
        </label>

        <p v-if="message" class="feedback feedback--success">{{ message }}</p>
        <p v-if="error" class="feedback feedback--error">{{ error }}</p>

        <button class="primary-button" :disabled="loading">
          {{ loading ? 'Updating...' : 'Change Password' }}
        </button>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  current_password: '',
  new_password: ''
})
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const message = ref('')

const handleSubmit = async () => {
  if (form.new_password !== confirmPassword.value) {
    error.value = 'New password and confirmation do not match.'
    return
  }

  loading.value = true
  error.value = ''
  message.value = ''
  try {
    const response = await authStore.changePassword(form)
    message.value = response.message
    router.push('/dashboard')
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to change password.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.change-page {
  min-height: calc(100vh - 8rem);
  display: grid;
  place-items: center;
}

.change-card {
  width: min(560px, 100%);
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 26px;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.08);
  padding: 1.75rem;
  display: grid;
  gap: 1rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
  font-weight: 800;
  color: #0f766e;
}

h1 {
  margin: 0;
  color: #0f172a;
  font-size: 2rem;
  font-weight: 900;
}

.copy {
  margin: 0.7rem 0 0;
  color: #475569;
}

.form-grid {
  display: grid;
  gap: 0.9rem;
}

.field {
  display: grid;
  gap: 0.45rem;
}

.field span {
  font-weight: 700;
  color: #334155;
}

.field input {
  min-height: 2.9rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  padding: 0 0.9rem;
}

.primary-button {
  min-height: 3rem;
  border: 0;
  border-radius: 16px;
  background: linear-gradient(135deg, #0f766e, #115e59);
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}

.feedback {
  margin: 0;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  font-weight: 700;
}

.feedback--success {
  background: rgba(220, 252, 231, 0.9);
  color: #166534;
}

.feedback--error {
  background: rgba(254, 226, 226, 0.92);
  color: #b91c1c;
}
</style>
