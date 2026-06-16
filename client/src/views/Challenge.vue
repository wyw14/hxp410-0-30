<template>
  <div class="challenge-container">
    <div v-if="showHistory" class="card history-card">
      <div class="card-header">
        <span class="icon">📜</span>
        <h2>我的挑战记录</h2>
        <p class="subtitle">只属于你自己的私密空间</p>
      </div>

      <div v-if="loadingHistory" class="loading">
        <div class="spinner"></div>
        <p>正在加载记录...</p>
      </div>

      <div v-else-if="historyList.length === 0" class="empty-state">
        <span class="empty-icon">🌱</span>
        <p>还没有任何挑战记录</p>
        <p class="sub-hint">完成今天的温柔挑战，开启你的记录吧</p>
        <button class="btn btn-primary" @click="showHistory = false">回到今日挑战</button>
      </div>

      <div v-else class="history-list">
        <div class="history-item" v-for="item in historyList" :key="item.id">
          <div class="history-header">
            <span class="history-icon">{{ item.icon }}</span>
            <span class="history-date">{{ item.date }}</span>
            <span class="history-type-badge" :class="'type-' + item.type">{{ typeLabel(item.type) }}</span>
          </div>
          <p class="history-prompt">{{ item.prompt }}</p>
          <p class="history-response">"{{ item.response }}"</p>
        </div>
        <button class="btn btn-secondary back-btn" @click="showHistory = false">回到今日挑战</button>
      </div>
    </div>

    <div v-else class="card challenge-card" :class="{ 'completed-card': saved }">
      <div class="card-header">
        <span class="icon">{{ challenge?.icon || '🌿' }}</span>
        <h2>今日温柔挑战</h2>
        <p class="date-text">{{ challenge?.date }}</p>
      </div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>正在为你准备今天的挑战...</p>
      </div>

      <template v-else>
        <div class="challenge-content" v-if="challenge">
          <div class="prompt-section">
            <p class="prompt-text">{{ challenge.prompt }}</p>
            <p class="hint-text">💡 {{ challenge.hint }}</p>
          </div>

          <div class="type-tag" :class="'type-' + challenge.type">
            {{ typeLabel(challenge.type) }}
          </div>

          <transition name="fade" mode="out-in">
            <div v-if="!saved" class="response-section" key="form">
              <div class="form-group">
                <textarea
                  v-model="responseText"
                  class="response-input"
                  :placeholder="placeholderMap[challenge.type] || '写下你的回应...'"
                  rows="5"
                  :disabled="submitting"
                ></textarea>
                <div class="char-count" :class="{ over: responseText.length > 500 }">
                  {{ responseText.length }} / 500
                </div>
              </div>

              <div v-if="error" class="error-message">
                {{ error }}
              </div>

              <div class="form-actions">
                <button
                  class="btn btn-primary save-btn"
                  @click="saveResponse"
                  :disabled="submitting || !responseText.trim() || responseText.length > 500"
                >
                  <span v-if="submitting">
                    <span class="btn-spinner"></span>
                    保存中...
                  </span>
                  <span v-else>
                    🌿 私密保存
                  </span>
                </button>
              </div>

              <p class="privacy-note">🔒 你的回应仅自己可见，安心书写</p>
            </div>

            <div v-else class="saved-section" key="saved">
              <div class="saved-icon">✨</div>
              <p class="saved-title">已温柔保存</p>
              <p class="saved-response">"{{ responseText }}"</p>
              <p class="saved-hint">你的每一份勇气都值得被珍藏</p>
              <button class="btn btn-secondary edit-btn" @click="saved = false">重新书写</button>
            </div>
          </transition>
        </div>

        <div class="history-link" v-if="!saved">
          <button class="link-btn" @click="openHistory">
            📜 查看我的挑战记录
            <span v-if="historyCount > 0" class="count-badge">{{ historyCount }}</span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const LOCAL_USER_KEY = 'gentle_challenge_user_id'

function getUserId() {
  let id = localStorage.getItem(LOCAL_USER_KEY)
  if (!id) {
    id = 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem(LOCAL_USER_KEY, id)
  }
  return id
}

const userId = getUserId()

const loading = ref(true)
const loadingHistory = ref(false)
const challenge = ref(null)
const completed = ref(false)
const responseText = ref('')
const submitting = ref(false)
const error = ref('')
const saved = ref(false)
const showHistory = ref(false)
const historyList = ref([])
const historyCount = ref(0)

const placeholderMap = {
  apology: '在这里写下你的道歉，哪怕只是一句简单的话...\n\n亲爱的______，对不起，______',
  gratitude: '在这里写下你的感谢，让温暖被记录...\n\n谢谢你，______，因为______',
  letgo: '在这里写下你想放下的，然后轻轻放手...\n\n我选择放下______，因为______'
}

const typeLabel = (type) => {
  const map = { apology: '道歉', gratitude: '感谢', letgo: '放下' }
  return map[type] || type
}

async function fetchTodayChallenge() {
  loading.value = true
  try {
    const response = await fetch(`/api/challenge/today?userId=${encodeURIComponent(userId)}`)
    const data = await response.json()
    challenge.value = data.challenge
    completed.value = data.completed
    if (data.completed && data.response) {
      responseText.value = data.response
      saved.value = true
    }
  } catch (err) {
    console.error('获取今日挑战失败:', err)
    error.value = '无法连接到服务器'
  } finally {
    loading.value = false
  }
}

async function saveResponse() {
  if (!responseText.value.trim()) {
    error.value = '请写下你的回应'
    return
  }
  if (responseText.value.length > 500) {
    error.value = '回应内容不能超过500字'
    return
  }

  submitting.value = true
  error.value = ''

  try {
    const response = await fetch('/api/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, response: responseText.value })
    })
    const data = await response.json()

    if (response.ok) {
      saved.value = true
      historyCount.value += completed.value ? 0 : 1
    } else {
      error.value = data.error || '保存失败，请稍后重试'
    }
  } catch (err) {
    console.error('保存回应失败:', err)
    error.value = '无法连接到服务器'
  } finally {
    submitting.value = false
  }
}

async function openHistory() {
  showHistory.value = true
  loadingHistory.value = true
  try {
    const response = await fetch(`/api/challenges?userId=${encodeURIComponent(userId)}`)
    const data = await response.json()
    historyList.value = data.challenges
    historyCount.value = data.total
  } catch (err) {
    console.error('获取挑战记录失败:', err)
  } finally {
    loadingHistory.value = false
  }
}

async function fetchHistoryCount() {
  try {
    const response = await fetch(`/api/challenges?userId=${encodeURIComponent(userId)}`)
    const data = await response.json()
    historyCount.value = data.total
  } catch (err) {
    console.error('获取记录数量失败:', err)
  }
}

onMounted(() => {
  fetchTodayChallenge()
  fetchHistoryCount()
})
</script>

<style scoped>
.challenge-container {
  width: 100%;
  max-width: 600px;
}

.challenge-card,
.history-card {
  animation: slideUp 0.6s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  text-align: center;
  margin-bottom: 30px;
}

.icon {
  font-size: 56px;
  display: block;
  margin-bottom: 15px;
}

.card-header h2 {
  color: #333;
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
}

.subtitle {
  color: #888;
  font-size: 14px;
}

.date-text {
  color: #999;
  font-size: 14px;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.challenge-content {
  padding: 0;
}

.prompt-section {
  text-align: center;
  margin-bottom: 25px;
}

.prompt-text {
  font-size: 22px;
  line-height: 1.8;
  color: #333;
  font-weight: 600;
  margin-bottom: 15px;
}

.hint-text {
  font-size: 15px;
  color: #999;
  line-height: 1.6;
}

.type-tag {
  display: inline-block;
  padding: 6px 18px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 25px;
}

.type-apology {
  background: linear-gradient(135deg, #ffeef8 0%, #ffe4f0 100%);
  color: #a8556a;
}

.type-gratitude {
  background: linear-gradient(135deg, #fef9e7 0%, #fef3c7 100%);
  color: #92640a;
}

.type-letgo {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  color: #2d6a4f;
}

.response-section {
  margin-top: 20px;
}

.form-group {
  margin-bottom: 20px;
  position: relative;
}

.response-input {
  width: 100%;
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 15px;
  font-size: 16px;
  font-family: inherit;
  resize: none;
  transition: all 0.3s ease;
  line-height: 1.8;
  background: #fafafa;
}

.response-input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.response-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.response-input::placeholder {
  color: #bbb;
  line-height: 1.8;
  font-size: 14px;
}

.char-count {
  position: absolute;
  bottom: 10px;
  right: 15px;
  font-size: 13px;
  color: #999;
}

.char-count.over {
  color: #dc2626;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 12px 20px;
  border-radius: 10px;
  margin-bottom: 20px;
  font-size: 14px;
  border-left: 4px solid #dc2626;
}

.form-actions {
  text-align: center;
  margin-bottom: 15px;
}

.save-btn {
  min-width: 200px;
  font-size: 18px;
  padding: 15px 40px;
}

.btn-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}

.privacy-note {
  text-align: center;
  color: #aaa;
  font-size: 13px;
  margin-top: 10px;
}

.saved-section {
  text-align: center;
  padding: 30px 20px;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.saved-icon {
  font-size: 56px;
  margin-bottom: 15px;
  animation: bounce 1.5s ease infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.saved-title {
  font-size: 22px;
  font-weight: 600;
  color: #667eea;
  margin-bottom: 20px;
}

.saved-response {
  font-size: 18px;
  line-height: 1.8;
  color: #555;
  font-style: italic;
  margin-bottom: 20px;
  padding: 0 10px;
}

.saved-hint {
  color: #999;
  font-size: 14px;
  margin-bottom: 25px;
}

.edit-btn {
  font-size: 14px;
  padding: 10px 24px;
}

.history-link {
  margin-top: 30px;
  text-align: center;
  padding-top: 25px;
  border-top: 1px solid #eee;
}

.link-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 8px 16px;
  border-radius: 20px;
  font-family: inherit;
}

.link-btn:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.08);
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 12px;
  border-radius: 11px;
  padding: 0 6px;
  margin-left: 6px;
  vertical-align: middle;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 20px;
}

.empty-state p {
  color: #666;
  font-size: 16px;
  margin-bottom: 10px;
}

.sub-hint {
  color: #999;
  font-size: 14px;
  margin-bottom: 30px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.history-item {
  background: #fafafa;
  border-radius: 15px;
  padding: 20px;
  transition: all 0.3s ease;
  border-left: 4px solid transparent;
}

.history-item:hover {
  background: #f5f5f5;
}

.history-item:has(.type-apology) {
  border-left-color: #f9a8d4;
}

.history-item:has(.type-gratitude) {
  border-left-color: #fbbf24;
}

.history-item:has(.type-letgo) {
  border-left-color: #6ee7b7;
}

.history-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.history-icon {
  font-size: 24px;
}

.history-date {
  color: #999;
  font-size: 13px;
}

.history-type-badge {
  padding: 3px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.history-type-badge.type-apology {
  background: #ffeef8;
  color: #a8556a;
}

.history-type-badge.type-gratitude {
  background: #fef9e7;
  color: #92640a;
}

.history-type-badge.type-letgo {
  background: #ecfdf5;
  color: #2d6a4f;
}

.history-prompt {
  font-size: 15px;
  color: #666;
  margin-bottom: 10px;
}

.history-response {
  font-size: 16px;
  color: #333;
  font-style: italic;
  line-height: 1.7;
}

.back-btn {
  display: block;
  margin: 10px auto 0;
}

.completed-card {
  border-top: 4px solid #84fab0;
}
</style>
