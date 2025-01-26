// Функции для работы с хранилищем
import { showNotification, showError, showPopupSafe } from './ui.js';

export async function getStorageItem(key) {
    return new Promise((resolve) => {
        if (!window.tg?.CloudStorage) {
            console.warn('CloudStorage недоступен, используем localStorage');
            const localValue = localStorage.getItem(key);
            resolve(localValue);
            return;
        }

        window.tg.CloudStorage.getItem(key, (error, value) => {
            if (error) {
                console.warn(`Ошибка CloudStorage для ${key}:`, error);
                // Пробуем получить из localStorage как запасной вариант
                const localValue = localStorage.getItem(key);
                resolve(localValue);
                return;
            }
            // Синхронизируем с localStorage
            if (value) localStorage.setItem(key, value);
            resolve(value);
        });
    });
}

export async function setStorageItem(key, value) {
    return new Promise((resolve) => {
        if (!window.tg?.CloudStorage) {
            console.warn('CloudStorage недоступен, используем localStorage');
            localStorage.setItem(key, value);
            resolve(true);
            return;
        }

        window.tg.CloudStorage.setItem(key, value, (error, success) => {
            if (error || !success) {
                console.warn(`Ошибка CloudStorage для ${key}:`, error);
                // Сохраняем в localStorage как запасной вариант
                localStorage.setItem(key, value);
                resolve(true);
            } else {
                // Синхронизируем с localStorage
                localStorage.setItem(key, value);
                resolve(success);
            }
        });
    });
}

export async function clearAllData() {
    try {
        // Список ключей для очистки
        const keysToDelete = [
            'profile',
            'activeProgram',
            'workoutStats',
            'weightHistory'
        ];

        // Очищаем данные в CloudStorage и localStorage
        for (const key of keysToDelete) {
            await setStorageItem(key, '');
            localStorage.removeItem(key);
        }

        // Показываем уведомление об успешной очистке
        await showPopupSafe({
            title: 'Готово',
            message: 'Все данные успешно очищены',
            buttons: [{type: 'ok'}]
        });

        // Перезагружаем страницу
        location.reload();
    } catch (error) {
        console.error('Ошибка при очистке данных:', error);
        showError('Не удалось очистить данные');
    }
} 