// Экспортируем данные о программах тренировок
window.programData = {
    weight_loss: {
        id: 'weight_loss',
        title: 'Похудение',
        description: 'Программа для снижения веса и улучшения метаболизма',
        duration: '8 недель',
        difficulty: 'medium',
        category: 'weight_loss',
        icon: 'monitor_weight',
        schedule: '3-4 тр/нед',
        calories_per_week: '3500-4000 ккал',
        results: [
            'Снижение веса 0.5-1 кг в неделю',
            'Улучшение выносливости',
            'Ускорение метаболизма'
        ],
        workouts: [
            {
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
            }
        ]
    },
    maintenance: {
        id: 'maintenance',
        title: 'Поддержание формы',
        description: 'Программа для поддержания текущей формы и тонуса мышц',
        duration: '4 недели',
        difficulty: 'low',
        category: 'maintenance',
        icon: 'fitness_center',
        schedule: '2-3 тр/нед',
        calories_per_week: '2500-3000 ккал',
        results: [
            'Поддержание текущего веса',
            'Сохранение мышечного тонуса',
            'Общее укрепление организма'
        ],
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
    }
};