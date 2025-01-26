// Функции для работы со статистикой
import { getStorageItem } from './storage.js';
import { tips } from './data/tips-db.js';

export async function renderStatistics() {
    try {
        const stats = await getStorageItem('workoutStats')
            .then(data => data ? JSON.parse(data) : {
                totalWorkouts: 0,
                totalCalories: 0,
                totalMinutes: 0,
                completedWorkouts: []
            });

        // Обновляем статистику
        const totalWorkoutsEl = document.getElementById('total-workouts');
        const totalTimeEl = document.getElementById('total-time');
        const totalCaloriesEl = document.getElementById('total-calories');
        const completionRateEl = document.getElementById('completion-rate');

        if (totalWorkoutsEl) {
            totalWorkoutsEl.textContent = stats.totalWorkouts || 0;
        }
        if (totalTimeEl) {
            totalTimeEl.textContent = `${Math.round(stats.totalMinutes || 0)} мин`;
        }
        if (totalCaloriesEl) {
            totalCaloriesEl.textContent = `${Math.round(stats.totalCalories || 0)} ккал`;
        }
        if (completionRateEl) {
            const completionRate = stats.completedWorkouts?.length > 0 
                ? Math.round((stats.completedWorkouts.filter(w => w.completed).length / stats.completedWorkouts.length) * 100)
                : 0;
            completionRateEl.textContent = `${completionRate}%`;
        }

        // Обновляем график веса
        await updateWeightChart();

        // Отображаем советы
        renderTips();

    } catch (error) {
        console.error('Ошибка при обновлении статистики:', error);
    }
}

export async function updateWeightChart(period = 'week') {
    try {
        const weightHistory = await getStorageItem('weightHistory')
            .then(data => data ? JSON.parse(data) : []);

        if (!weightHistory.length) return;

        const now = new Date();
        const startDate = new Date();
        const labels = [];
        const data = [];

        switch(period) {
            case 'week':
                startDate.setDate(now.getDate() - 7);
                for(let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
                    labels.push(d.toLocaleDateString('ru-RU', { weekday: 'short' }));
                    const dayWeight = weightHistory.find(w => 
                        new Date(w.date).toDateString() === d.toDateString()
                    );
                    data.push(dayWeight ? dayWeight.weight : null);
                }
                break;

            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                for(let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
                    labels.push(d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
                    const dayWeight = weightHistory.find(w => 
                        new Date(w.date).toDateString() === d.toDateString()
                    );
                    data.push(dayWeight ? dayWeight.weight : null);
                }
                break;

            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                for(let m = new Date(startDate); m <= now; m.setMonth(m.getMonth() + 1)) {
                    labels.push(m.toLocaleDateString('ru-RU', { month: 'short' }));
                    const monthWeights = weightHistory.filter(w => {
                        const date = new Date(w.date);
                        return date.getMonth() === m.getMonth() && 
                               date.getFullYear() === m.getFullYear();
                    });
                    const avgWeight = monthWeights.length ? 
                        monthWeights.reduce((sum, w) => sum + w.weight, 0) / monthWeights.length : 
                        null;
                    data.push(avgWeight);
                }
                break;
        }

        // Находим минимальный и максимальный вес для настройки шкалы
        const weights = data.filter(w => w !== null);
        const minWeight = Math.min(...weights) - 1;
        const maxWeight = Math.max(...weights) + 1;

        // Уничтожаем предыдущий график
        if (window.weightChart) {
            window.weightChart.destroy();
        }

        // Создаем новый график
        const ctx = document.getElementById('weight-chart')?.getContext('2d');
        if (!ctx) return;

        window.weightChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Вес',
                    data: data,
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
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
                        min: minWeight,
                        max: maxWeight,
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

    } catch (error) {
        console.error('Ошибка при обновлении графика веса:', error);
    }
}

function renderTips() {
    const tipsContainer = document.querySelector('.tips-list');
    if (!tipsContainer) return;

    // Выбираем 3 случайных совета
    const randomTips = shuffleArray(tips).slice(0, 3);

    tipsContainer.innerHTML = randomTips.map(tip => `
        <div class="tip-card">
            <div class="tip-icon">
                <span class="material-symbols-rounded">${tip.icon}</span>
            </div>
            <div class="tip-content">
                <h4>${tip.title}</h4>
                <p>${tip.text}</p>
            </div>
        </div>
    `).join('');
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
} 