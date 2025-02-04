// Функции для работы с CloudStorage
export async function getStorageItem(key) {
    return new Promise((resolve) => {
        if (!window.tg?.CloudStorage) {
            console.warn('CloudStorage не доступен, используем localStorage');
            resolve(localStorage.getItem(key));
            return;
        }

        window.tg.CloudStorage.getItem(key, (error, value) => {
            if (error) {
                console.warn(`Ошибка CloudStorage для ${key}:`, error);
                // Пробуем получить из localStorage как запасной вариант
                const localValue = localStorage.getItem(key);
                resolve(localValue);
            } else {
                // Сохраняем в localStorage для синхронизации
                if (value) localStorage.setItem(key, value);
                resolve(value);
            }
        });
    });
}

export async function setStorageItem(key, value) {
    return new Promise((resolve) => {
        // Сохраняем в localStorage в любом случае
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            console.warn('Ошибка при сохранении в localStorage:', error);
        }

        if (!window.tg?.CloudStorage) {
            console.warn('CloudStorage не доступен, сохранено только в localStorage');
            resolve(true);
            return;
        }

        window.tg.CloudStorage.setItem(key, value, (error) => {
            if (error) {
                console.warn(`Ошибка CloudStorage при сохранении ${key}:`, error);
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

// Функция форматирования времени
export function formatTime(minutes) {
    if (minutes < 60) {
        return `${minutes} мин`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} ч ${remainingMinutes} мин`;
}

// Функция для безопасного показа попапа
export async function showPopupSafe(params) {
    const maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
        try {
            if (params.message && params.message.length > 200) {
                params.message = params.message.substring(0, 197) + '...';
            }
            
            return await new Promise((resolve) => {
                window.tg.showPopup(params, resolve);
            });
        } catch (error) {
            attempt++;
            if (attempt === maxAttempts) {
                console.error('Не удалось показать попап:', error);
                return null;
            }
            await new Promise(r => setTimeout(r, 100));
        }
    }
}

// Функция для показа ошибки
export async function showError(message) {
    if (window.showNotification) {
        window.showNotification(message, 'error');
    }
    if (window.tg?.HapticFeedback) {
        window.tg.HapticFeedback.notificationOccurred('error');
    }
    return showPopupSafe({
        title: 'Ошибка',
        message: message,
        buttons: [{type: 'ok'}]
    });
}

// Функция для показа уведомлений
export function showNotification(message, type = '') {
    // Удаляем предыдущее уведомление, если оно есть
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = `notification${type ? ' ' + type : ''}`;
    notification.textContent = message;

    // Добавляем уведомление на страницу
    document.body.appendChild(notification);

    // Показываем уведомление
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Скрываем и удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
} 