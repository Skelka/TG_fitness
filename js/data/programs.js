export const programs = {
    'weight_loss': {
        id: 'weight_loss',
        title: 'Снижение веса',
        description: 'Программа для снижения веса и улучшения формы тела',
        icon: 'monitor_weight',
        duration: '8 недель',
        schedule: '3-4 тр/нед',
        difficulty: 'medium',
        workouts: [
            // Неделя 1
            {
                id: 'w1d1',
                week: 1,
                day: 1,
                title: 'Кардио + Сила',
                duration: 45,
                calories: 350,
                type: 'cardio_strength',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Приседания', sets: 3, reps: '15', rest: 60 },
                    { name: 'Отжимания с колен', sets: 3, reps: '10', rest: 60 },
                    { name: 'Планка', sets: 3, reps: '30 сек', rest: 45 }
                ]
            },
            {
                id: 'w1d2',
                week: 1,
                day: 2,
                title: 'Интервальная тренировка',
                duration: 30,
                calories: 300,
                type: 'hiit',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Джампинг джеки', sets: 3, reps: '30 сек', rest: 30 },
                    { name: 'Бёрпи', sets: 3, reps: '30 сек', rest: 30 },
                    { name: 'Скалолаз', sets: 3, reps: '30 сек', rest: 30 }
                ]
            }
        ]
    },
    'muscle_gain': {
        id: 'muscle_gain',
        title: 'Набор мышечной массы',
        description: 'Программа для увеличения мышечной массы и силы',
        icon: 'fitness_center',
        duration: '12 недель',
        schedule: '4-5 тр/нед',
        difficulty: 'high',
        workouts: [
            {
                id: 'w1d1',
                week: 1,
                day: 1,
                title: 'Грудь + Трицепс',
                duration: 60,
                calories: 450,
                type: 'strength',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Отжимания', sets: 4, reps: '12', rest: 90 },
                    { name: 'Жим гантелей', sets: 4, reps: '10', rest: 90 },
                    { name: 'Разгибания на трицепс', sets: 3, reps: '12', rest: 60 }
                ]
            },
            {
                id: 'w1d2',
                week: 1,
                day: 2,
                title: 'Спина + Бицепс',
                duration: 60,
                calories: 450,
                type: 'strength',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Подтягивания', sets: 4, reps: '8', rest: 90 },
                    { name: 'Тяга гантелей', sets: 4, reps: '12', rest: 90 },
                    { name: 'Сгибания на бицепс', sets: 3, reps: '12', rest: 60 }
                ]
            }
        ]
    },
    'endurance': {
        id: 'endurance',
        title: 'Выносливость',
        description: 'Программа для развития общей выносливости',
        icon: 'directions_run',
        duration: '6 недель',
        schedule: '3 тр/нед',
        difficulty: 'medium',
        workouts: [
            {
                id: 'w1d1',
                week: 1,
                day: 1,
                title: 'Кардио интервалы',
                duration: 45,
                calories: 400,
                type: 'cardio',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Бег', sets: 5, reps: '3 мин', rest: 60 },
                    { name: 'Ходьба', sets: 5, reps: '2 мин', rest: 0 }
                ]
            },
            {
                id: 'w1d2',
                week: 1,
                day: 2,
                title: 'Круговая тренировка',
                duration: 40,
                calories: 350,
                type: 'circuit',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Приседания', sets: 3, reps: '20', rest: 45 },
                    { name: 'Отжимания', sets: 3, reps: '15', rest: 45 },
                    { name: 'Выпады', sets: 3, reps: '20', rest: 45 }
                ]
            }
        ]
    },
    'maintenance': {
        id: 'maintenance',
        title: 'Поддержание формы',
        description: 'Программа для поддержания текущей формы и тонуса мышц',
        icon: 'sports_score',
        duration: '4 недели',
        schedule: '2-3 тр/нед',
        difficulty: 'low',
        workouts: [
            {
                id: 'w1d1',
                week: 1,
                day: 1,
                title: 'Общая тренировка',
                duration: 40,
                calories: 300,
                type: 'general',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Приседания', sets: 3, reps: '12', rest: 60 },
                    { name: 'Отжимания', sets: 3, reps: '10', rest: 60 },
                    { name: 'Планка', sets: 3, reps: '30 сек', rest: 45 }
                ]
            },
            {
                id: 'w1d2',
                week: 1,
                day: 2,
                title: 'Кардио',
                duration: 30,
                calories: 250,
                type: 'cardio',
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Бёрпи', sets: 3, reps: '10', rest: 45 },
                    { name: 'Скалолаз', sets: 3, reps: '30 сек', rest: 45 },
                    { name: 'Прыжки со скакалкой', sets: 3, reps: '1 мин', rest: 45 }
                ]
            }
        ]
    }
}; 