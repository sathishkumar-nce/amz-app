<template>
  <div class="users-page">
    <section class="users-hero">
      <div>
        <p class="eyebrow">Admin only</p>
        <h1>User Management</h1>
        <p class="copy">
          Create login users with the default password `Welcome999`. New users will be forced to change it on first login.
        </p>
      </div>
    </section>

    <section v-if="!isAdmin" class="notice notice--error">
      Only the `admin` user can access this screen.
    </section>

    <template v-else>
      <section class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Create user</p>
            <h2>New team member</h2>
          </div>
        </div>

        <form class="form-grid" @submit.prevent="createUser">
          <label class="field">
            <span>Username</span>
            <input v-model="form.username" type="text" required />
          </label>
          <label class="field">
            <span>Email</span>
            <input v-model="form.email" type="email" required />
          </label>
          <button class="primary-button" :disabled="creating">
            {{ creating ? 'Creating...' : 'Create User' }}
          </button>
        </form>
      </section>

      <p v-if="message" class="notice notice--success">{{ message }}</p>
      <p v-if="error" class="notice notice--error">{{ error }}</p>

      <section class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Current users</p>
            <h2>Team accounts</h2>
          </div>
          <button class="secondary-button" :disabled="loading" @click="loadUsers">
            {{ loading ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>

        <div class="table-wrap">
          <table class="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Must Change Password</th>
                <th>Created By</th>
                <th>Updated By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.username }}</td>
                <td>{{ user.email }}</td>
                <td>{{ user.must_change_password ? 'Yes' : 'No' }}</td>
                <td>{{ user.created_by || 'system' }}</td>
                <td>{{ user.updated_by || '-' }}</td>
                <td>
                  <button
                    class="danger-button"
                    :disabled="deletingUserId === user.id || user.username === 'admin' || authStore.user?.id === user.id"
                    @click="deleteUser(user)"
                  >
                    {{ deletingUserId === user.id ? 'Deleting...' : 'Delete' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types'

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.user?.username === 'admin')
const users = ref<User[]>([])
const loading = ref(false)
const creating = ref(false)
const deletingUserId = ref<number | null>(null)
const message = ref('')
const error = ref('')
const form = reactive({ username: '', email: '' })

const loadUsers = async () => {
  if (!isAdmin.value) return
  loading.value = true
  error.value = ''
  try {
    users.value = await authApi.listUsers()
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to load users.'
  } finally {
    loading.value = false
  }
}

const createUser = async () => {
  creating.value = true
  error.value = ''
  message.value = ''
  try {
    const response = await authApi.adminCreateUser(form)
    message.value = `User ${response.user.username} created. Default password: ${response.default_password}`
    form.username = ''
    form.email = ''
    await loadUsers()
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to create user.'
  } finally {
    creating.value = false
  }
}

const deleteUser = async (user: User) => {
  if (user.username === 'admin') return
  if (authStore.user?.id === user.id) {
    error.value = 'You cannot delete the currently logged in admin user.'
    return
  }

  const confirmed = window.confirm(`Delete user "${user.username}"? This cannot be undone.`)
  if (!confirmed) return

  deletingUserId.value = user.id
  error.value = ''
  message.value = ''

  try {
    const response = await authApi.deleteUser(user.id)
    message.value = response.message
    await loadUsers()
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to delete user.'
  } finally {
    deletingUserId.value = null
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.users-page {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.users-hero,
.panel {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  padding: 1.4rem 1.5rem;
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
  font-weight: 900;
}

.copy {
  margin: 0.75rem 0 0;
  color: #475569;
  max-width: 72ch;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.9rem;
}

.field {
  display: grid;
  gap: 0.4rem;
}

.field span {
  color: #334155;
  font-weight: 700;
}

.field input {
  min-height: 2.9rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  padding: 0 0.9rem;
}

.primary-button,
.secondary-button {
  min-height: 2.9rem;
  border-radius: 16px;
  font-weight: 800;
  cursor: pointer;
  padding: 0 1rem;
}

.primary-button {
  border: 0;
  background: linear-gradient(135deg, #0f766e, #115e59);
  color: #fff;
}

.secondary-button {
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #fff;
  color: #0f172a;
}

.danger-button {
  min-height: 2.4rem;
  border-radius: 14px;
  border: 0;
  padding: 0 0.9rem;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}

.danger-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.notice {
  padding: 0.95rem 1rem;
  border-radius: 16px;
  font-weight: 700;
}

.notice--success {
  background: rgba(220, 252, 231, 0.92);
  color: #166534;
}

.notice--error {
  background: rgba(254, 226, 226, 0.94);
  color: #b91c1c;
}

.table-wrap {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 680px;
}

.users-table th,
.users-table td {
  padding: 0.85rem 0.9rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  text-align: left;
}

.users-table th {
  color: #64748b;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
</style>
