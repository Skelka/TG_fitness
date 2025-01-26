import { tg } from './globals.js';
import { renderStatistics } from './statistics.js';
import { loadProfile } from './profile.js';

// UI функции
export function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    switch(tabName) {
        case 'stats':
            renderStatistics();
            break;
        case 'profile':
            loadProfile();
            break;
    }
}

export function showNotification(message, isError = false) {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification${isError ? ' error' : ''}`;
    notification.textContent = message;

    document.body.appendChild(notification);
    tg.HapticFeedback.notificationOccurred(isError ? 'error' : 'success');

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

export async function showPopupSafe(params) {
    return new Promise((resolve) => {
        try {
            tg.showPopup(params, resolve);
        } catch (error) {
            console.error('Ошибка при показе попапа:', error);
            resolve({ button_id: 'error' });
        }
    });
} 