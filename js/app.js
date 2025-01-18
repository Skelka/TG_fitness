let tg = window.Telegram.WebApp;
tg.expand();

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    await loadUserData();
    await loadWorkoutHistory();
});

// Загрузка данных пользователя
async function loadUserData() {
    try {
        const response = await fetch(`/api/user/${tg.initDataUnsafe.user.id}`);
        if (response.ok) {
            const userData = await response.json();
            document.getElementById('height').value = userData.height || '';
            document.getElementById('weight').value = userData.weight || '';
        }
    } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
    }
}

// Сохранение профиля
async function saveProfile() {
    const height = document.getElementById('height').value;
    const weight = document.getElementById('weight').value;

    try {
        const response = await fetch('/api/user/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: tg.initDataUnsafe.user.id,
                height: parseFloat(height),
                weight: parseFloat(weight)
            })
        });

        if (response.ok) {
            tg.showAlert('Данные профиля сохранены!');
        }
    } catch (error) {
        console.error('Ошибка при сохранении:', error);
        tg.showAlert('Ошибка при сохранении данных');
    }
}

// Сохранение тренировки
async function saveWorkout() {
    const workoutType = document.getElementById('workout-type').value;
    const duration = document.getElementById('duration').value;

    try {
        const response = await fetch('/api/workout/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: tg.initDataUnsafe.user.id,
                workout_type: workoutType,
                duration: parseInt(duration)
            })
        });

        if (response.ok) {
            tg.showAlert('Тренировка добавлена!');
            await loadWorkoutHistory();
        }
    } catch (error) {
        console.error('Ошибка при сохранении тренировки:', error);
        tg.showAlert('Ошибка при сохранении тренировки');
    }
}

// Загрузка истории тренировок
async function loadWorkoutHistory() {
    try {
        const response = await fetch(`/api/workouts/${tg.initDataUnsafe.user.id}`);
        if (response.ok) {
            const workouts = await response.json();
            const historyContainer = document.getElementById('workout-history');
            historyContainer.innerHTML = workouts.map(workout => `
                <div class="workout-item">
                    <div>Тип: ${workout.workout_type}</div>
                    <div>Длительность: ${workout.duration} мин</div>
                    <div>Дата: ${new Date(workout.date).toLocaleDateString()}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Ошибка при загрузке истории:', error);
    }
} 