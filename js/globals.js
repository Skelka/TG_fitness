// Глобальные переменные и утилиты
export const tg = window.Telegram.WebApp;

// Экспортируем глобальные функции для использования в HTML
export function initGlobalHandlers(handlers) {
    // Добавляем функции в глобальную область видимости
    Object.entries(handlers).forEach(([name, func]) => {
        window[name] = func;
    });
} 