// Экспортируем данные о программах тренировок
window.programData = {
    'weight_loss': {
        id: 'weight_loss',
        title: 'Похудение',
        description: 'Программа для снижения веса и улучшения метаболизма',
        icon: 'monitor_weight',
        duration: '8 недель',
        schedule: '3-4 тр/нед',
        difficulty: 'medium',
        workouts: [
            // Неделя 1
            {
                week: 1,
                day: 1,
                title: 'Кардио + Сила',
                duration: 45,
                calories: 400,
                type: 'cardio_strength',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Приседания', sets: 3, reps: '12', rest: 60 },
                    { name: 'Отжимания', sets: 3, reps: '10', rest: 60 },
                    { name: 'Планка', sets: 3, reps: '30 сек', rest: 45 }
                ]
            },
            {
                week: 1,
                day: 2,
                title: 'HIIT Тренировка',
                duration: 30,
                calories: 350,
                type: 'hiit',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Бёрпи', sets: 4, reps: '10', rest: 45 },
                    { name: 'Скручивания', sets: 3, reps: '15', rest: 45 }
                ]
            },
            {
                week: 1,
                day: 3,
                title: 'Кардио',
                duration: 40,
                calories: 300,
                type: 'cardio',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Выпады', sets: 3, reps: '12', rest: 60 },
                    { name: 'Приседания', sets: 3, reps: '15', rest: 60 }
                ]
            },
            // Неделя 2 (увеличиваем нагрузку)
            {
                week: 2,
                day: 1,
                title: 'Кардио + Сила',
                duration: 50,
                calories: 450,
                type: 'cardio_strength',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Приседания', sets: 4, reps: '12', rest: 60 },
                    { name: 'Отжимания', sets: 4, reps: '10', rest: 60 },
                    { name: 'Планка', sets: 3, reps: '45 сек', rest: 45 }
                ]
            },
            // ... и так далее для каждой недели
        ]
    },
    'muscle_gain': {
        id: 'muscle_gain',
        title: 'Набор мышечной массы',
        description: 'Программа для увеличения мышечной массы и силы',
        duration: '12 недель',
        difficulty: 'high',
        workouts: [
            {
                day: 1,
                title: 'Грудь + Трицепс',
                duration: 60,
                calories: 450,
                type: 'strength',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Отжимания', sets: 4, reps: '12', rest: 90 },
                    { name: 'Жим гантелей', sets: 4, reps: '10', rest: 90 },
                    { name: 'Планка', sets: 3, reps: '45 сек', rest: 60 }
                ]
            },
            {
                day: 2,
                title: 'Спина + Бицепс',
                duration: 60,
                calories: 450,
                type: 'strength',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Подтягивания', sets: 4, reps: '8', rest: 90 },
                    { name: 'Тяга гантелей', sets: 4, reps: '12', rest: 90 }
                ]
            },
            {
                day: 3,
                title: 'Ноги + Плечи',
                duration: 60,
                calories: 450,
                type: 'strength',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Приседания', sets: 4, reps: '12', rest: 90 },
                    { name: 'Жим гантелей стоя', sets: 4, reps: '10', rest: 90 }
                ]
            },
            {
                day: 4,
                title: 'Кардио + Пресс',
                duration: 45,
                calories: 350,
                type: 'cardio',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Бёрпи', sets: 3, reps: '30 сек', rest: 45 },
                    { name: 'Скручивания', sets: 3, reps: '20', rest: 45 }
                ]
            }
        ]
    },
    'maintenance': {
        id: 'maintenance',
        title: 'Поддержание формы',
        description: 'Программа для поддержания текущей формы и тонуса мышц',
        duration: '4 недели',
        difficulty: 'low',
        workouts: [
            {
                day: 1,
                title: 'Общая тренировка',
                duration: 40,
                calories: 300,
                type: 'general',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Приседания', sets: 3, reps: '10', rest: 60 },
                    { name: 'Отжимания', sets: 3, reps: '8', rest: 60 },
                    { name: 'Планка', sets: 2, reps: '30 сек', rest: 45 }
                ]
            },
            {
                day: 2,
                title: 'Кардио',
                duration: 30,
                calories: 250,
                type: 'cardio',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Бёрпи', sets: 3, reps: '8', rest: 45 },
                    { name: 'Выпады', sets: 3, reps: '10', rest: 45 }
                ]
            }
        ]
    },
    'endurance': {
        id: 'endurance',
        title: 'Выносливость',
        description: 'Программа для развития общей выносливости',
        duration: '6 недель',
        difficulty: 'medium',
        workouts: [
            {
                day: 1,
                title: 'Кардио интервалы',
                duration: 45,
                calories: 400,
                type: 'cardio',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Бёрпи', sets: 5, reps: '30 сек', rest: 30 },
                    { name: 'Прыжки', sets: 4, reps: '45 сек', rest: 45 }
                ]
            },
            {
                day: 2,
                title: 'Силовая выносливость',
                duration: 40,
                calories: 350,
                type: 'circuit',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Приседания', sets: 3, reps: '20', rest: 45 },
                    { name: 'Отжимания', sets: 3, reps: '15', rest: 45 }
                ]
            },
            {
                day: 3,
                title: 'Интервальный бег',
                duration: 40,
                calories: 400,
                type: 'cardio',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Бег', sets: 5, reps: '2 мин', rest: 60 },
                    { name: 'Ходьба', sets: 5, reps: '1 мин', rest: 0 }
                ]
            }
        ]
    }
};

// Обновляем текст кнопки с "Начать" на "Старт"
function renderProgramCards() {
    const container = document.querySelector('.programs-list');
    if (!container) return;

    let html = '';
    Object.entries(window.programData).forEach(([programId, program]) => {
        html += `
            <div class="program-card" data-program-id="${programId}">
                <div class="program-content">
                    <div class="program-icon">
                        <span class="material-symbols-rounded">${program.icon}</span>
                    </div>
                    <div class="program-text">
                        <h3>${program.title}</h3>
                        <p class="program-description">${program.description}</p>
                        <div class="program-details">
                            <span>
                                <span class="material-symbols-rounded">calendar_today</span>
                                ${program.schedule}
                            </span>
                            <span>
                                <span class="material-symbols-rounded">fitness_center</span>
                                ${program.difficulty}
                            </span>
                        </div>
                        <div class="program-actions">
                            <button class="program-btn info-btn">
                                <span class="material-symbols-rounded">info</span>
                                Подробнее
                            </button>
                            <button class="program-btn start-btn">
                                <span class="material-symbols-rounded">play_arrow</span>
                                Старт
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}