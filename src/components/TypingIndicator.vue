<template>
  <div class="typing-wrapper">
    <div class="avatar">🤖</div>
    <div class="typing-indicator">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>
</template>

<style scoped>
.typing-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 1rem;
}
.avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #D35400, #E67E22);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(211, 84, 0, 0.3);
}
.typing-indicator {
  display: flex;
  gap: 5px;
  padding: 14px 18px;
  background: white;
  border-radius: 18px;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.typing-indicator span {
  width: 7px;
  height: 7px;
  background: linear-gradient(135deg, #D35400, #E67E22);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}
.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}
</style>
