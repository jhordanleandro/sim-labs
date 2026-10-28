// utils.js - utilitários didáticos para simulação
// Funções auxiliares para delays, logs, métricas, etc.

/** Aguarda um tempo em ms (Promise) */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Gera um IP aleatório (IPv4) */
function randomIP() {
  return Array(4).fill(0).map(() => Math.floor(Math.random() * 256)).join('.');
}

/** Gera um número inteiro aleatório entre min e max (inclusive) */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Clona profundamente um objeto */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/** Formata data/hora para logs */
function formatTime() {
  const d = new Date();
  return d.toLocaleTimeString('pt-BR', { hour12: false });
}

/** Escapa texto para inserir com innerHTML sem que vire HTML */
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Traduz uma chave usando dicionário atual */
function t(key, dict) {
  return (dict && dict[key]) || key;
}
