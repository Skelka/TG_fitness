// Дожидаемся загрузки DOM и Telegram Web App
document.addEventListener('DOMContentLoaded', async () => {
    // Проверяем доступность Telegram Web App
    if (typeof window.Telegram === 'undefined') {
        console.error('Telegram WebApp не доступен');
        return;
    }

    // Инициализируем глобальные переменные
    const tg = window.Telegram.WebApp;
    const mainButton = tg.MainButton;
    const backButton = tg.BackButton;
    let currentPeriod = 'week';

    // Базовая инициализация WebApp
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();

    // Настройка главной кнопки
    mainButton.setText('Сохранить профиль');
    mainButton.hide();

    // Проверяем наличие Chart.js
    if (typeof Chart === 'undefined') {
        console.error('Chart.js не загружен');
        return;
    }

    // Функции для работы с CloudStorage
    async function getStorageItem(key) {
        return new Promise((resolve) => {
            tg.CloudStorage.getItem(key, (error, value) => {
                if (error) {
                    console.error(`Ошибка при получении ${key}:`, error);
                    resolve(null);
                } else {
                    resolve(value);
                }
            });
        });
    }

    async function setStorageItem(key, value) {
        return new Promise((resolve, reject) => {
            tg.CloudStorage.setItem(key, value, (error, success) => {
                if (error || !success) {
                    reject(error || new Error(`Failed to save ${key}`));
                } else {
                    resolve(success);
                }
            });
        });
    }

    // Инициализация страницы статистики
    async function initStatisticsPage() {
        try {
            // Обновляем статистику
            await updateStatistics();

            // Инициализируем график веса
            const weightData = await getWeightData(currentPeriod);
            if (weightData && weightData.length > 0) {
                updateWeightChart(weightData);
            }

            // Добавляем обработчики для кнопок периода
            document.querySelectorAll('.period-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        document.querySelectorAll('.period-btn').forEach(b => 
                            b.classList.remove('active'));
                        btn.classList.add('active');
                        
                        currentPeriod = btn.dataset.period;
                        const data = await getWeightData(currentPeriod);
                        if (data && data.length > 0) {
                            updateWeightChart(data);
                        }
                    } catch (error) {
                        console.error('Ошибка при обновлении графика:', error);
                    }
                });
            });
        } catch (error) {
            console.error('Ошибка при инициализации страницы статистики:', error);
        }
    }

    // Запускаем инициализацию
    try {
        await initStatisticsPage();
    } catch (error) {
        console.error('Ошибка при запуске приложения:', error);
    }
});

// Остальной код файла... 