<template>
  <div class="app-container">
    <ApiModal :isOpen="isModalOpen" @save="onApiUrlSaved" />

    <!-- Header -->
    <header class="header">
      <div class="title-area">
        <span class="header-icon">🍜</span>
        <div>
          <h1>วิเคราะห์รีวิวอาหาร</h1>
          <p class="subtitle">AI ด้วย WangchanBERTa</p>
        </div>
      </div>
      <div class="header-right">
        <div class="status-badge" :class="{ online: isOnline }">
          <span class="dot"></span>
          <span>{{ isOnline ? 'Online' : 'Offline' }}</span>
        </div>
        <button class="settings-btn" @click="isModalOpen = true" title="ตั้งค่า API">⚙️</button>
      </div>
    </header>

    <!-- Chat area -->
    <main class="chat-area" ref="chatContainer">

      <!-- Empty state -->
      <Transition name="fade">
        <div v-if="messages.length === 0" class="empty-state">
          <div class="empty-icon">🍽️</div>
          <h2>ยินดีต้อนรับ!</h2>
          <p>ลองพิมพ์รีวิวอาหารให้ AI วิเคราะห์ความรู้สึกดูสิครับ</p>
          <div class="chips">
            <button v-for="s in suggestions" :key="s" @click="sendSuggestion(s)" class="chip">
              "{{ s }}"
            </button>
          </div>
          <div class="legend">
            <span class="legend-item pos">😊 Positive</span>
            <span class="legend-item neg">😠 Negative</span>
          </div>
        </div>
      </Transition>

      <!-- Messages -->
      <ChatBubble v-for="(msg, i) in messages" :key="i" :message="msg" />

      <!-- Typing indicator -->
      <TypingIndicator v-if="isTyping" />
    </main>

    <!-- Input area -->
    <footer class="input-area">
      <div class="char-count" v-if="inputText.length > 0">
        {{ inputText.length }} ตัวอักษร
      </div>
      <div class="input-row">
        <textarea
          v-model="inputText"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact.stop
          placeholder="พิมพ์รีวิวอาหารที่นี่..."
          :disabled="isTyping || !isOnline"
          rows="1"
          ref="inputRef"
          @input="autoResize"
        ></textarea>
        <button
          class="send-btn"
          @click="sendMessage"
          :disabled="isTyping || !inputText.trim() || !isOnline"
          :title="!isOnline ? 'กรุณาตั้งค่า API ก่อน' : 'ส่งรีวิว'"
        >
          <span v-if="!isTyping">ส่ง ➤</span>
          <span v-else>⏳</span>
        </button>
      </div>
      <p v-if="!isOnline" class="offline-hint">
        🔴 ยังไม่ได้เชื่อมต่อ —
        <button class="link-btn" @click="isModalOpen = true">ตั้งค่า API</button>
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted } from 'vue';
import ApiModal from './components/ApiModal.vue';
import ChatBubble from './components/ChatBubble.vue';
import TypingIndicator from './components/TypingIndicator.vue';
import type { Message, SentimentResult } from './types';

const apiUrl        = ref('');
const isModalOpen   = ref(false);
const isOnline      = ref(false);
const messages      = ref<Message[]>([]);
const inputText     = ref('');
const isTyping      = ref(false);
const chatContainer = ref<HTMLElement | null>(null);
const inputRef      = ref<HTMLTextAreaElement | null>(null);
let reviewInterval: number;

const suggestions = [
  'อาหารอร่อยมาก บริการดีเยี่ยม แนะนำเลย!',
  'รอนานมาก อาหารเย็นแล้ว แถมราคาแพงเกิน',
  'ร้านธรรมดา อาหารกินได้ราคาโอเค ไม่มีอะไรพิเศษ',
  'โคตรอร่อย ราคาถูก คุ้มมากกกก',
];

// ── Connection health check ────────────────────────────────
// นับ fail ต่อเนื่องก่อนตัด offline เพื่อรับมือกับ network กระตุกชั่วคราว
let consecutiveFails = 0;
const FAIL_THRESHOLD = 3;

const checkReview = async () => {
  if (!apiUrl.value) return;
  const endpoints = ['/health', '/review'];
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${apiUrl.value}${ep}`, {
        signal: AbortSignal.timeout(8000),
        headers: { 'ngrok-skip-browser-warning': '1' },
      });
      if (res.status < 500) {
        consecutiveFails = 0;
        isOnline.value = true;
        return;
      }
    } catch { /* ลอง endpoint ถัดไป */ }
  }
  // ตัด offline ก็ต่อเมื่อ fail ติดกัน FAIL_THRESHOLD ครั้ง
  consecutiveFails++;
  if (consecutiveFails >= FAIL_THRESHOLD) {
    isOnline.value = false;
  }
};

const onApiUrlSaved = (url: string) => {
  apiUrl.value      = url;
  isModalOpen.value = false;
  isOnline.value    = true;
  consecutiveFails  = 0;
};

// ── Auto-resize textarea ────────────────────────────────────
const autoResize = () => {
  const el = inputRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
};

// ── Scroll helpers ─────────────────────────────────────────
const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

const sendSuggestion = (text: string) => {
  inputText.value = text;
  sendMessage();
};

// ── Main send function ─────────────────────────────────────
const sendMessage = async () => {
  const text = inputText.value.trim();
  if (!text || !isOnline.value || isTyping.value) return;

  // Push user message
  messages.value.push({
    role: 'user',
    content: text,
    timestamp: new Date(),
  });

  inputText.value = '';
  if (inputRef.value) inputRef.value.style.height = 'auto';
  isTyping.value = true;
  scrollToBottom();

  // retry สูงสุด 2 ครั้งเพื่อรับมือ network กระตุกชั่วคราว
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${apiUrl.value}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': '1',
        },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: SentimentResult = await res.json();
      consecutiveFails = 0;

      messages.value.push({
        role: 'assistant',
        content: buildSummary(data),
        timestamp: new Date(),
        sentiment: data,
      });

      isTyping.value = false;
      scrollToBottom();
      return;

    } catch (err) {
      lastErr = err;
      // รอก่อน retry ครั้งที่ 2
      if (attempt === 0) await new Promise(r => setTimeout(r, 1500));
    }
  }

  // fail ทั้ง 2 ครั้ง
  console.error(lastErr);
  consecutiveFails++;
  if (consecutiveFails >= FAIL_THRESHOLD) isOnline.value = false;
  messages.value.push({
    role: 'assistant',
    content: '❌ เชื่อมต่อไม่ได้ชั่วคราว กรุณาลองใหม่อีกครั้งครับ',
    timestamp: new Date(),
  });
  isTyping.value = false;
  scrollToBottom();
};

// ── Build human-readable summary ──────────────────────────
const buildSummary = (r: SentimentResult): string => {
  const pct = (r.confidence * 100).toFixed(1);
  const verdicts: Record<string, string> = {
    positive: 'รีวิวนี้มีความรู้สึก**เชิงบวก** 🎉 ผู้รีวิวพึงพอใจ',
    negative: 'รีวิวนี้มีความรู้สึก**เชิงลบ** 😟 ผู้รีวิวไม่พึงพอใจ',
  };
  return `${verdicts[r.label_en] ?? r.label}\nความมั่นใจ: ${pct}%`;
};

// ── Lifecycle ──────────────────────────────────────────────
onMounted(() => {
  const saved = localStorage.getItem('api_url');
  if (saved) {
    apiUrl.value = saved;
    checkReview();
  } else {
    isModalOpen.value = true;
  }
  reviewInterval = window.setInterval(checkReview, 20000);
});

onUnmounted(() => clearInterval(reviewInterval));
</script>

<style>
/* ── Reset & Base ─────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  font-family: 'Sarabun', sans-serif;
  background: #F5ECD8;
  min-height: 100vh;
}

#app { height: 100vh; }
</style>

<style scoped>
/* ── Layout ───────────────────────────────────────────────── */
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 820px;
  margin: 0 auto;
  background: #FFFDF5;
  box-shadow: 0 0 40px rgba(0,0,0,0.12);
  position: relative;
  overflow: hidden;
}

/* ── Header ───────────────────────────────────────────────── */
.header {
  background: linear-gradient(135deg, #C0392B 0%, #D35400 60%, #E67E22 100%);
  color: white;
  padding: 0.9rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 3px 12px rgba(180,40,0,0.3);
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}
.title-area {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-icon {
  font-size: 2rem;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}
h1 {
  margin: 0;
  font-family: 'Noto Serif Thai', serif;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.subtitle {
  margin: 0;
  font-size: 0.75rem;
  opacity: 0.85;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0,0,0,0.2);
  border-radius: 20px;
  padding: 5px 12px;
  font-size: 0.78rem;
  font-weight: 600;
}
.status-badge .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #BDC3C7;
  transition: background 0.3s;
}
.status-badge.online .dot {
  background: #2ECC71;
  box-shadow: 0 0 0 0 rgba(46,204,113,0.7);
  animation: pulse 1.8s infinite;
}
@keyframes pulse {
  0%   { box-shadow: 0 0 0 0 rgba(46,204,113,0.7); }
  70%  { box-shadow: 0 0 0 6px rgba(46,204,113,0); }
  100% { box-shadow: 0 0 0 0 rgba(46,204,113,0); }
}
.settings-btn {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.3);
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.2s;
}
.settings-btn:hover {
  background: rgba(255,255,255,0.25);
  transform: rotate(30deg);
}

/* ── Chat area ────────────────────────────────────────────── */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 1.25rem;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse at 20% 20%, rgba(230,126,34,0.05) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(211,84,0,0.04) 0%, transparent 50%),
    #FFFDF5;
  scroll-behavior: smooth;
}
.chat-area::-webkit-scrollbar { width: 4px; }
.chat-area::-webkit-scrollbar-thumb { background: #E8C99A; border-radius: 2px; }

/* ── Empty state ──────────────────────────────────────────── */
.empty-state {
  text-align: center;
  margin: auto;
  padding: 2rem 1rem;
  max-width: 500px;
}
.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: float 3s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-8px); }
}
.empty-state h2 {
  font-family: 'Noto Serif Thai', serif;
  color: #C0392B;
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}
.empty-state p {
  color: #7D6451;
  font-size: 0.95rem;
  margin: 0 0 1.5rem;
  line-height: 1.6;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 1.5rem;
}
.chip {
  background: white;
  border: 1.5px solid #E8C99A;
  color: #8B4513;
  padding: 8px 16px;
  border-radius: 24px;
  cursor: pointer;
  font-family: 'Sarabun', sans-serif;
  font-size: 0.85rem;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.chip:hover {
  background: #D35400;
  color: white;
  border-color: #D35400;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(211,84,0,0.25);
}
.legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}
.legend-item {
  font-size: 0.82rem;
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 600;
}
.legend-item.pos { background: #EAFAF1; color: #27AE60; }
.legend-item.neu { background: #FEF9E7; color: #F39C12; }
.legend-item.neg { background: #FDEDEC; color: #E74C3C; }

/* ── Input area ───────────────────────────────────────────── */
.input-area {
  padding: 0.75rem 1.25rem 1rem;
  background: white;
  border-top: 1px solid #F0E6D8;
  flex-shrink: 0;
  box-shadow: 0 -4px 16px rgba(0,0,0,0.05);
}
.char-count {
  font-size: 0.72rem;
  color: #B0A090;
  text-align: right;
  margin-bottom: 4px;
}
.input-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}
textarea {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #E8D5B8;
  border-radius: 14px;
  resize: none;
  outline: none;
  font-family: 'Sarabun', sans-serif;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #333;
  background: #FDFAF5;
  transition: border-color 0.2s, box-shadow 0.2s;
  overflow: hidden;
  min-height: 48px;
  max-height: 120px;
}
textarea:focus {
  border-color: #D35400;
  box-shadow: 0 0 0 3px rgba(211,84,0,0.1);
  background: white;
}
textarea:disabled { opacity: 0.5; cursor: not-allowed; }
textarea::placeholder { color: #C0A882; }

.send-btn {
  background: linear-gradient(135deg, #C0392B, #D35400);
  color: white;
  border: none;
  padding: 12px 22px;
  border-radius: 14px;
  font-family: 'Sarabun', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(211,84,0,0.3);
  height: 48px;
}
.send-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #A93226, #C0392B);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(211,84,0,0.4);
}
.send-btn:disabled { background: #D4C5B0; cursor: not-allowed; box-shadow: none; }

.offline-hint {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
  color: #E74C3C;
  text-align: center;
}
.link-btn {
  background: none;
  border: none;
  color: #D35400;
  font-family: 'Sarabun', sans-serif;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  font-size: 0.8rem;
}

/* ── Transitions ──────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>