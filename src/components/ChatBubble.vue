<template>
  <div :class="['chat-bubble-wrapper', isUser ? 'user' : 'bot']">
    <!-- Bot avatar -->
    <div v-if="!isUser" class="avatar">🤖</div>

    <div class="bubble-group">
      <!-- Main bubble -->
      <div class="chat-bubble">
        <div class="message-content" v-html="formattedContent"></div>
        <div class="timestamp">{{ formattedTime }}</div>
      </div>

      <!-- Sentiment card (bot messages with structured result) -->
      <div v-if="!isUser && message.sentiment" class="sentiment-card" :class="message.sentiment.label_en">
        <div class="sentiment-header">
          <span class="sentiment-emoji">{{ sentimentEmoji }}</span>
          <span class="sentiment-label">{{ message.sentiment.label }}</span>
          <span class="confidence-badge">{{ (message.sentiment.confidence * 100).toFixed(1) }}%</span>
        </div>

        <!-- Probability bars -->
        <div class="prob-bars">
          <div
            v-for="(prob, key) in message.sentiment.probabilities"
            :key="key"
            class="prob-row"
          >
            <span class="prob-label">{{ key }}</span>
            <div class="prob-bar-track">
              <div
                class="prob-bar-fill"
                :class="getLabelClass(key)"
                :style="{ width: (prob * 100) + '%' }"
              ></div>
            </div>
            <span class="prob-pct">{{ (prob * 100).toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- User avatar -->
    <div v-if="isUser" class="avatar user-avatar">👤</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Message } from '../types';

const props = defineProps<{ message: Message }>();

const isUser = computed(() => props.message.role === 'user');

const formattedContent = computed(() =>
  props.message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
);

const formattedTime = computed(() =>
  props.message.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
);

const sentimentEmoji = computed(() => {
  const id = props.message.sentiment?.label_id ?? -1;
  return id === 0 ? '😊' : id === 1 ? '😠' : '';
});

const getLabelClass = (key: string) => {
  if (key.includes('Positive')) return 'pos';
  return 'neg';
};
</script>

<style scoped>
.chat-bubble-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 1.25rem;
  animation: fadeUp 0.3s ease;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.chat-bubble-wrapper.user { flex-direction: row-reverse; }
.chat-bubble-wrapper.bot  { flex-direction: row; }

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
  background: linear-gradient(135deg, #D35400, #E67E22);
  box-shadow: 0 2px 6px rgba(211,84,0,0.25);
}
.user-avatar {
  background: linear-gradient(135deg, #5D6D7E, #85929E);
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

.bubble-group {
  display: flex;
  flex-direction: column;
  max-width: 75%;
  gap: 6px;
}
.user .bubble-group { align-items: flex-end; }
.bot  .bubble-group { align-items: flex-start; }

.chat-bubble {
  padding: 12px 16px;
  border-radius: 18px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.user .chat-bubble {
  background: linear-gradient(135deg, #FAD7A0, #F5CBA7);
  border-bottom-right-radius: 4px;
  color: #4A2C0A;
}
.bot .chat-bubble {
  background: white;
  border-bottom-left-radius: 4px;
  color: #333;
}
.message-content {
  line-height: 1.65;
  font-size: 0.95rem;
}
.timestamp {
  font-size: 0.68rem;
  color: #B0A090;
  text-align: right;
  margin-top: 4px;
}

/* ── Sentiment Card ───────────────── */
.sentiment-card {
  background: white;
  border-radius: 14px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  border-left: 4px solid #ccc;
  min-width: 240px;
  max-width: 100%;
}
.sentiment-card.positive { border-color: #27AE60; }
.sentiment-card.negative { border-color: #E74C3C; }

.sentiment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.sentiment-emoji { font-size: 1.4rem; }
.sentiment-label {
  font-family: 'Noto Serif Thai', serif;
  font-weight: 700;
  font-size: 1rem;
  flex: 1;
  color: #2C3E50;
}
.confidence-badge {
  background: #F8F0E8;
  color: #D35400;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 20px;
  border: 1px solid #E8C99A;
}

/* Probability bars */
.prob-bars { display: flex; flex-direction: column; gap: 6px; }
.prob-row {
  display: grid;
  grid-template-columns: 100px 1fr 45px;
  align-items: center;
  gap: 8px;
}
.prob-label { font-size: 0.78rem; color: #7D6451; white-space: nowrap; }
.prob-bar-track {
  height: 8px;
  background: #F0EAE0;
  border-radius: 4px;
  overflow: hidden;
}
.prob-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.8s cubic-bezier(0.25, 1, 0.5, 1);
}
.prob-bar-fill.pos { background: linear-gradient(90deg, #27AE60, #2ECC71); }
.prob-bar-fill.neg { background: linear-gradient(90deg, #C0392B, #E74C3C); }
.prob-pct { font-size: 0.75rem; color: #7D6451; text-align: right; }
</style>