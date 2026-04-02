<template>
  <Transition name="modal">
    <div v-if="isOpen" class="modal-overlay" @click.self.stop>
      <div class="modal-content">
        <div class="modal-icon">🔌</div>
        <h2>ตั้งค่าเชื่อมต่อ API</h2>
        <p>กรุณาใส่ URL จาก Google Colab (Ngrok) เพื่อเริ่มต้นใช้งาน</p>

        <div class="input-wrapper">
          <input
            v-model="apiUrl"
            type="url"
            placeholder="https://xxxx.ngrok-free.app"
            @keyup.enter="save"
            autocomplete="off"
            spellcheck="false"
          />
          <span class="input-icon">🌐</span>
        </div>

        <div v-if="errorMsg" class="error-msg">⚠️ {{ errorMsg }}</div>

        <button class="save-btn" @click="save" :class="{ loading: isTesting }">
          <span v-if="!isTesting">บันทึก &amp; เริ่มใช้งาน</span>
          <span v-else class="btn-loading">กำลังตรวจสอบ<span class="dots">...</span></span>
        </button>

        <p class="hint">💡 รัน Cell สุดท้ายใน Colab แล้วก็อปปี้ URL ที่ขึ้นต้นด้วย https://<br>รองรับ <strong>ngrok-free.app</strong></p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ (e: 'save', url: string): void }>();

const apiUrl = ref(localStorage.getItem('api_url') || '');
const errorMsg = ref('');
const isTesting = ref(false);

const isNgrok = (url: string) => url.includes('ngrok');

const testConnection = async (url: string): Promise<boolean> => {
  const endpoints = ['/health', '/review', '/predict'];
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${url}${ep}`, {
        signal: AbortSignal.timeout(5000),
        method: ep === '/predict' ? 'POST' : 'GET',
        ...(ep === '/predict' && {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'test' }),
        }),
      });
      if (res.status < 500) return true;
    } catch {
      // ลอง endpoint ถัดไป
    }
  }
  return false;
};

const save = async () => {
  let url = apiUrl.value.trim();
  if (url.endsWith('/')) url = url.slice(0, -1);
  apiUrl.value = url;

  if (!url) {
    errorMsg.value = 'กรุณาใส่ URL ก่อนนะครับ';
    return;
  }
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    errorMsg.value = 'URL ต้องขึ้นต้นด้วย https:// หรือ http://';
    return;
  }
  if (!isNgrok(url)) {
    const confirmed = window.confirm(
      `URL นี้ไม่ใช่ Ngrok\n(${url})\n\nต้องการดำเนินการต่อไหม?`
    );
    if (!confirmed) return;
  }

  isTesting.value = true;
  errorMsg.value = '';

  try {
    const ok = await testConnection(url);
    if (ok) {
      localStorage.setItem('api_url', url);
      emit('save', url);
    } else {
      errorMsg.value = 'เชื่อมต่อไม่ได้ ตรวจสอบ URL หรือว่า Colab ยังรันอยู่ไหม';
    }
  } catch {
    errorMsg.value = 'เกิดข้อผิดพลาดที่ไม่คาดคิด ลองอีกครั้งนะครับ';
  } finally {
    isTesting.value = false;
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 10, 5, 0.65);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}
.modal-content {
  background: linear-gradient(145deg, #FFFDF5, #FFF8E8);
  padding: 2.5rem 2rem;
  border-radius: 20px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(180, 60, 0, 0.2), 0 2px 8px rgba(0,0,0,0.1);
  border: 1px solid rgba(211, 84, 0, 0.15);
  text-align: center;
}
.modal-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  animation: float 3s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
h2 {
  font-family: 'Noto Serif Thai', serif;
  font-size: 1.5rem;
  color: #C0392B;
  margin: 0 0 0.5rem;
}
p {
  color: #7D6451;
  font-size: 0.9rem;
  margin: 0 0 1.25rem;
  line-height: 1.6;
}
.input-wrapper {
  position: relative;
  margin-bottom: 0.75rem;
}
.input-wrapper input {
  width: 100%;
  padding: 0.85rem 2.5rem 0.85rem 1rem;
  border: 2px solid #E8C99A;
  border-radius: 10px;
  font-family: 'Sarabun', sans-serif;
  font-size: 0.95rem;
  background: white;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
  color: #333;
}
.input-wrapper input:focus {
  outline: none;
  border-color: #D35400;
  box-shadow: 0 0 0 3px rgba(211, 84, 0, 0.1);
}
.input-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.1rem;
  pointer-events: none;
}
.error-msg {
  background: #FFF0ED;
  border: 1px solid #F5A88C;
  color: #C0392B;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
  text-align: left;
}
.save-btn {
  width: 100%;
  background: linear-gradient(135deg, #D35400, #E67E22);
  color: white;
  border: none;
  padding: 0.9rem;
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Sarabun', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(211, 84, 0, 0.3);
}
.save-btn:hover:not(.loading) {
  background: linear-gradient(135deg, #A04000, #C0392B);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(211, 84, 0, 0.4);
}
.save-btn.loading { opacity: 0.8; cursor: not-allowed; }
.hint {
  font-size: 0.8rem;
  color: #A08060;
  margin: 1rem 0 0;
}
.dots { animation: blink 1.4s infinite; }
@keyframes blink {
  0%, 80%, 100% { opacity: 0; }
  40% { opacity: 1; }
}

/* Transition */
.modal-enter-active, .modal-leave-active { transition: all 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.92); }
</style>