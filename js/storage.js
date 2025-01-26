import { tg } from './globals.js';

// Функции для работы с хранилищем
export async function getStorageItem(key) {
    return new Promise((resolve) => {
        tg.CloudStorage.getItem(key, (error, value) => {
            if (error) {
                console.warn(`Ошибка CloudStorage для ${key}:`, error);
                const localValue = localStorage.getItem(key);
                resolve(localValue);
            } else {
                resolve(value);
            }
        });
    });
}

export async function setStorageItem(key, value) {
    return new Promise((resolve) => {
        tg.CloudStorage.setItem(key, value, (error, success) => {
            if (error || !success) {
                console.warn(`Ошибка CloudStorage для ${key}:`, error);
                localStorage.setItem(key, value);
                resolve(true);
            } else {
                resolve(success);
            }
        });
    });
} 