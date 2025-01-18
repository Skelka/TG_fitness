const programData = {
    weight_loss: {
        id: 'weight_loss',
        title: 'Похудение',
        description: 'Программа для снижения веса и улучшения метаболизма',
        duration: '4 недели',
        intensity: 'medium',
        calories: '3500-4000',
        image: 'weight_loss.jpg',
        results: [
            'Снижение веса на 3-5 кг',
            'Улучшение метаболизма',
            'Повышение выносливости',
            'Уменьшение объемов тела'
        ],
        workouts: [
            {
                day: 1,
                title: 'Кардио + Силовая',
                duration: 45,
                type: 'Комбинированная',
                calories: 400,
                exercises: [
                    { name: 'Разминка (легкий бег)', sets: 1, reps: '10 мин', rest: 60 },
                    { name: 'Приседания', sets: 3, reps: '15', rest: 60 },
                    { name: 'Отжимания', sets: 3, reps: '10', rest: 60 },
                    { name: 'Планка', sets: 3, reps: '30 сек', rest: 45 },
                    { name: 'Берпи', sets: 3, reps: '10', rest: 60 },
                    { name: 'Скручивания', sets: 3, reps: '20', rest: 45 },
                    { name: 'Заминка (ходьба)', sets: 1, reps: '5 мин', rest: 0 }
                ]
            },
            {
                day: 2,
                title: 'Интервальная тренировка',
                duration: 30,
                type: 'Кардио',
                calories: 350,
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 60 },
                    { name: 'Бег (интервалы)', sets: 10, reps: '1 мин быстро + 1 мин медленно', rest: 0 },
                    { name: 'Заминка', sets: 1, reps: '5 мин', rest: 0 }
                ]
            },
            {
                day: 3,
                title: 'Силовая тренировка',
                duration: 40,
                type: 'Силовая',
                calories: 300,
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 60 },
                    { name: 'Выпады', sets: 3, reps: '12 каждая нога', rest: 60 },
                    { name: 'Подтягивания/тяга', sets: 3, reps: '8-12', rest: 90 },
                    { name: 'Отжимания от пола', sets: 3, reps: '12-15', rest: 60 },
                    { name: 'Планка с подъемом рук', sets: 3, reps: '30 сек', rest: 45 }
                ]
            },
            {
                day: 4,
                title: 'Кардио + Пресс',
                duration: 35,
                type: 'Комбинированная',
                calories: 320,
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 60 },
                    { name: 'Прыжки на скакалке', sets: 3, reps: '3 мин', rest: 60 },
                    { name: 'Велосипед', sets: 3, reps: '20', rest: 45 },
                    { name: 'Подъем ног лежа', sets: 3, reps: '15', rest: 45 },
                    { name: 'Русские скручивания', sets: 3, reps: '20', rest: 45 }
                ]
            },
            {
                day: 5,
                title: 'Функциональная тренировка',
                duration: 50,
                type: 'Функциональная',
                calories: 450,
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '7 мин', rest: 60 },
                    { name: 'Приседания с выпрыгиванием', sets: 4, reps: '12', rest: 60 },
                    { name: 'Отжимания с поворотом', sets: 4, reps: '10', rest: 60 },
                    { name: 'Берпи с подтягиванием', sets: 4, reps: '8', rest: 90 },
                    { name: 'Планка на локтях', sets: 4, reps: '45 сек', rest: 45 }
                ]
            }
        ]
    },
    maintenance: {
        id: 'maintenance',
        title: 'Поддержание формы',
        description: 'Программа для поддержания текущей формы и тонуса мышц',
        duration: '4 недели',
        intensity: 'low',
        calories: '2500-3000',
        image: 'maintenance.jpg',
        results: [
            'Поддержание текущего веса',
            'Сохранение мышечного тонуса',
            'Общее укрепление организма',
            'Улучшение гибкости'
        ],
        workouts: [
            {
                day: 1,
                title: 'Общая тренировка',
                duration: 40,
                type: 'Общая',
                calories: 250,
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '7 мин', rest: 60 },
                    { name: 'Приседания', sets: 3, reps: '12', rest: 60 },
                    { name: 'Отжимания', sets: 3, reps: '8', rest: 60 },
                    { name: 'Планка', sets: 3, reps: '30 сек', rest: 45 },
                    { name: 'Растяжка', sets: 1, reps: '10 мин', rest: 0 }
                ]
            },
            {
                day: 3,
                title: 'Кардио день',
                duration: 30,
                type: 'Кардио',
                calories: 200,
                exercises: [
                    { name: 'Ходьба', sets: 1, reps: '10 мин', rest: 0 },
                    { name: 'Легкий бег', sets: 1, reps: '15 мин', rest: 0 },
                    { name: 'Заминка', sets: 1, reps: '5 мин', rest: 0 }
                ]
            },
            {
                day: 5,
                title: 'Силовая поддержка',
                duration: 35,
                type: 'Силовая',
                calories: 220,
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 60 },
                    { name: 'Выпады', sets: 2, reps: '10 каждая нога', rest: 60 },
                    { name: 'Отжимания от пола', sets: 2, reps: '10', rest: 60 },
                    { name: 'Подъемы корпуса', sets: 2, reps: '15', rest: 45 },
                    { name: 'Растяжка', sets: 1, reps: '10 мин', rest: 0 }
                ]
            }
        ]
    }
}; 