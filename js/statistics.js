import { getStorageItem, setStorageItem, formatTime } from './utils.js';

// Глобальные переменные
let currentPeriod = 'week';

// Функция для обновления графика веса
async function updateWeightChart(period = 'week') {
    try {
        currentPeriod = period;
        const weightHistory = await getStorageItem('weightHistory')
            .then(data => data ? JSON.parse(data) : []);

        const chartCanvas = document.getElementById('weight-chart');
        if (!chartCanvas) return;

        // Уничтожаем существующий график
        if (window.weightChart) {
            window.weightChart.destroy();
            window.weightChart = null;
        }

        if (!weightHistory.length) {
            chartCanvas.style.display = 'none';
            chartCanvas.parentElement.innerHTML = '<div class="no-data">Нет данных о весе</div>';
            return;
        }

        chartCanvas.style.display = 'block';

        // Сортируем историю по дате
        weightHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Фильтруем данные в зависимости от выбранного периода
        const now = new Date();
        const filteredHistory = weightHistory.filter(record => {
            const recordDate = new Date(record.date);
            switch (period) {
                case 'week':
                    return (now - recordDate) <= 7 * 24 * 60 * 60 * 1000;
                case 'month':
                    return (now - recordDate) <= 30 * 24 * 60 * 60 * 1000;
                case 'year':
                    return (now - recordDate) <= 365 * 24 * 60 * 60 * 1000;
                default:
                    return true;
            }
        });

        // Подготавливаем данные для графика
        const labels = filteredHistory.map(record => {
            const date = new Date(record.date);
            switch (period) {
                case 'week':
                    return date.toLocaleDateString('ru', { weekday: 'short' });
                case 'month':
                    return date.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
                case 'year':
                    return date.toLocaleDateString('ru', { month: 'short' });
                default:
                    return date.toLocaleDateString('ru');
            }
        });

        const weights = filteredHistory.map(record => record.weight);

        // Создаем новый график
        const ctx = chartCanvas.getContext('2d');
        window.weightChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Вес (кг)',
                    data: weights,
                    borderColor: '#40a7e3',
                    backgroundColor: 'rgba(64, 167, 227, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });

        // Обновляем кнопки периода
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.period === period);
        });

    } catch (error) {
        console.error('Ошибка при обновлении графика:', error);
        const chartCanvas = document.getElementById('weight-chart');
        if (chartCanvas) {
            chartCanvas.style.display = 'none';
            chartCanvas.parentElement.innerHTML = '<div class="no-data">Ошибка при загрузке данных</div>';
        }
    }
}

// Функция для рендеринга статистики
async function renderStatistics() {
    try {
        // Получаем элементы статистики
        const totalWorkouts = document.getElementById('total-workouts');
        const totalTime = document.getElementById('total-time');
        const totalCalories = document.getElementById('total-calories');
        const completionRate = document.getElementById('completion-rate');

        // Загружаем данные статистики
        const stats = await getStorageItem('statistics')
            .then(data => data ? JSON.parse(data) : {
                workouts: 0,
                time: 0,
                calories: 0,
                completion: 0
            });

        // Обновляем значения
        if (totalWorkouts) totalWorkouts.textContent = stats.workouts || 0;
        if (totalTime) totalTime.textContent = formatTime(stats.time || 0);
        if (totalCalories) totalCalories.textContent = stats.calories || 0;
        if (completionRate) completionRate.textContent = `${stats.completion || 0}%`;

        // Настраиваем обработчики для кнопок периода
        const periodButtons = document.querySelectorAll('.period-btn');
        periodButtons.forEach(button => {
            button.addEventListener('click', () => {
                updateWeightChart(button.dataset.period);
                // Добавляем тактильный отклик
                if (window.tg) {
                    window.tg.HapticFeedback.impactOccurred('light');
                }
            });
        });

        // Обновляем график веса
        await updateWeightChart(currentPeriod);

    } catch (error) {
        console.error('Ошибка при рендеринге статистики:', error);
    }
}

// Функция для обновления статистики
async function updateStatistics(data) {
    try {
        const stats = await getStorageItem('statistics')
            .then(data => data ? JSON.parse(data) : {
                workouts: 0,
                time: 0,
                calories: 0,
                completion: 0
            });

        // Обновляем статистику
        stats.workouts = (stats.workouts || 0) + 1;
        stats.time = (stats.time || 0) + (data.duration || 0);
        stats.calories = (stats.calories || 0) + (data.calories || 0);

        // Сохраняем обновленную статистику
        await setStorageItem('statistics', JSON.stringify(stats));

        // Обновляем отображение
        renderStatistics();

    } catch (error) {
        console.error('Ошибка при обновлении статистики:', error);
    }
}

// Экспортируем функции для использования в других модулях
const statisticsModule = {
    updateWeightChart,
    renderStatistics,
    updateStatistics,
    currentPeriod
};

export default statisticsModule;