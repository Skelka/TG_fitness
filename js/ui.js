import { tg } from './globals.js';
import { renderStatistics } from './statistics.js';
import { loadProfile } from './profile.js';
import { renderCalendar } from './calendar.js';

// Переключение табов
export function switchTab(tabName) {
    // Обновляем активный элемент навигации
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });

    // Обновляем активный контент
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName);
    });

    // Дополнительные действия при переключении табов
    switch(tabName) {
        case 'stats':
            renderStatistics();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'calendar':
            renderCalendar();
            break;
    }
}

// Показ уведомлений
export function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification${isError ? ' error' : ''}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Безопасный показ попапа
export async function showPopupSafe(params) {
    return new Promise((resolve) => {
        tg.showPopup(params, (result) => {
            resolve(result);
        });
    });
} 