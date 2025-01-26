// UI функции
import { renderStatistics } from './statistics.js';
import { loadProfile } from './profile.js';
import { renderCalendar } from './calendar.js';

export function switchTab(tabName) {
    // Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Убираем активный класс у всех кнопок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Показываем нужную вкладку
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Активируем соответствующую кнопку
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Дополнительные действия при переключении вкладок
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

    // Вибрация при переключении
    if (window.tg?.HapticFeedback) {
        window.tg.HapticFeedback.impactOccurred('light');
    }
}

export function showNotification(message, isError = false) {
    // Удаляем предыдущее уведомление, если оно есть
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = `notification${isError ? ' error' : ''}`;
    notification.textContent = message;

    // Добавляем уведомление на страницу
    document.body.appendChild(notification);

    // Вибрация в зависимости от типа уведомления
    if (window.tg?.HapticFeedback) {
        if (isError) {
            window.tg.HapticFeedback.notificationOccurred('error');
        } else {
            window.tg.HapticFeedback.notificationOccurred('success');
        }
    }

    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

export function showError(message) {
    showNotification(message, true);
    if (window.tg?.HapticFeedback) {
        window.tg.HapticFeedback.notificationOccurred('error');
    }
}

export async function showPopupSafe(params) {
    return new Promise((resolve) => {
        try {
            if (!window.tg?.showPopup) {
                console.warn('Telegram Web App API не доступен для показа попапа');
                resolve(null);
                return;
            }

            window.tg.showPopup(params, (event) => {
                resolve(event);
            });
        } catch (error) {
            console.error('Ошибка при показе попапа:', error);
            showError('Не удалось показать окно');
            resolve(null);
        }
    });
} 