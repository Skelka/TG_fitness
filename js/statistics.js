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
    const mainContainer = document.querySelector('#mainContainer');
    if (!mainContainer) return;

    // Получаем статистику тренировок
    const workoutStats = await getStorageItem('workoutStats')
        .then(data => data ? JSON.parse(data) : { workouts: [] });

    // Рассчитываем общую статистику
    const totalWorkouts = workoutStats.workouts.length;
    const totalTime = workoutStats.workouts.reduce((sum, workout) => sum + (workout.duration || 0), 0);
    const totalCalories = workoutStats.workouts.reduce((sum, workout) => sum + (workout.calories || 0), 0);
    const completionRate = Math.round((totalWorkouts / (totalWorkouts + workoutStats.workouts.filter(w => !w.completed).length)) * 100) || 0;

    mainContainer.innerHTML = `
        <div class="statistics-container">
            <div class="stats-overview">
                <div class="stat-card">
                    <span class="material-symbols-rounded">exercise</span>
                    <h3 id="total-workouts">${totalWorkouts}</h3>
                    <p>Тренировок</p>
                </div>
                <div class="stat-card">
                    <span class="material-symbols-rounded">timer</span>
                    <h3 id="total-time">${Math.round(totalTime)}м</h3>
                    <p>Общее время</p>
                </div>
                <div class="stat-card">
                    <span class="material-symbols-rounded">local_fire_department</span>
                    <h3 id="total-calories">${totalCalories}</h3>
                    <p>Ккал сожжено</p>
                </div>
                <div class="stat-card">
                    <span class="material-symbols-rounded">trending_up</span>
                    <h3 id="completion-rate">${completionRate}%</h3>
                    <p>Достижение цели</p>
                </div>
            </div>

            <div class="weight-chart-section">
                <div class="chart-header">
                    <h3>Динамика веса</h3>
                    <div class="period-selector">
                        <button class="period-btn active" data-period="week">Неделя</button>
                        <button class="period-btn" data-period="month">Месяц</button>
                        <button class="period-btn" data-period="year">Год</button>
                    </div>
                </div>
                <div class="chart-placeholder">
                    <p>Начните записывать свой вес в профиле, чтобы увидеть график прогресса</p>
                </div>
            </div>

            <div class="tips-section">
                <h3>Советы</h3>
                <div class="tips-list">
                    ${getRandomTips()}
                </div>
            </div>
        </div>
    `;

    // Настраиваем обработчики для периода
    document.querySelectorAll('.period-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            // TODO: Обновление графика при смене периода
        });
    });
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
    currentPeriod,
    getRandomTips
};

export default statisticsModule;