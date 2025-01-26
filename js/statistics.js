import { getStorageItem } from './storage.js';

export async function renderStatistics() {
    try {
        const stats = await getStorageItem('workoutStats')
            .then(data => data ? JSON.parse(data) : {
                totalWorkouts: 0,
                totalCalories: 0,
                totalMinutes: 0,
                completedWorkouts: []
            });

        const container = document.querySelector('#stats');
        if (!container) return;

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">
                        <span class="material-symbols-rounded">fitness_center</span>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">${stats.totalWorkouts}</div>
                        <div class="stat-label">Тренировок</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <span class="material-symbols-rounded">local_fire_department</span>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">${Math.round(stats.totalCalories)}</div>
                        <div class="stat-label">Калорий</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <span class="material-symbols-rounded">timer</span>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">${Math.round(stats.totalMinutes)}</div>
                        <div class="stat-label">Минут</div>
                    </div>
                </div>
            </div>

            <div class="stats-chart">
                <canvas id="workoutChart"></canvas>
            </div>

            <div class="recent-workouts">
                <h3>Последние тренировки</h3>
                ${stats.completedWorkouts.slice(-5).reverse().map(workout => `
                    <div class="workout-item">
                        <div class="workout-info">
                            <h4>${workout.workout.name}</h4>
                            <p>${new Date(workout.date).toLocaleDateString()}</p>
                        </div>
                        <div class="workout-meta">
                            <span>${workout.workout.duration} мин</span>
                            <span>${workout.workout.calories} ккал</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Инициализация графика
        const ctx = document.getElementById('workoutChart');
        if (ctx) {
            const workoutsByDate = {};
            stats.completedWorkouts.forEach(workout => {
                const date = new Date(workout.date).toLocaleDateString();
                workoutsByDate[date] = (workoutsByDate[date] || 0) + 1;
            });

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: Object.keys(workoutsByDate),
                    datasets: [{
                        label: 'Тренировки',
                        data: Object.values(workoutsByDate),
                        borderColor: '#4CAF50',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        }

    } catch (error) {
        console.error('Ошибка при отображении статистики:', error);
    }
} 