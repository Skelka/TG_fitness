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
        schedule: '3-4 тренировки в неделю',
        calories_per_week: '3500-4000 ккал',
        results: [
            'Снижение веса 0.5-1 кг в неделю',
            'Улучшение выносливости',
            'Ускорение метаболизма'
        ],
        workouts: [
            {
                day: 1,
                type: 'cardio',
                title: 'HIIT кардио',
                duration: 30,
                exercises: [/*...*/]
            },
            // ... остальные тренировки
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
    },
    muscle_gain: {
        id: 'muscle_gain',
        title: 'Набор мышечной массы',
        description: 'Программа для увеличения мышечной массы и силовых показателей',
        duration: '4 недели',
        intensity: 'high',
        calories: '4000-4500',
        image: 'muscle_gain.jpg',
        results: [
            'Увеличение мышечной массы',
            'Рост силовых показателей',
            'Улучшение рельефа мышц',
            'Ускорение метаболизма'
        ],
        workouts: [
            {
                day: 1,
                title: 'Грудь + Трицепс',
                duration: 60,
                type: 'Силовая',
                calories: 500,
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '10 мин', rest: 60 },
                    { name: 'Жим лежа', sets: 4, reps: '8-10', rest: 120 },
                    { name: 'Отжимания на брусьях', sets: 4, reps: '10-12', rest: 90 },
                    { name: 'Разведение гантелей', sets: 3, reps: '12-15', rest: 90 },
                    { name: 'Французский жим', sets: 3, reps: '12', rest: 90 },
                    { name: 'Растяжка', sets: 1, reps: '5 мин', rest: 0 }
                ]
            },
            {
                day: 3,
                title: 'Спина + Бицепс',
                duration: 65,
                type: 'Силовая',
                calories: 550,
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '10 мин', rest: 60 },
                    { name: 'Подтягивания', sets: 4, reps: '8-10', rest: 120 },
                    { name: 'Тяга в наклоне', sets: 4, reps: '10-12', rest: 90 },
                    { name: 'Подъем на бицепс', sets: 3, reps: '12', rest: 90 },
                    { name: 'Молотки', sets: 3, reps: '12 каждая рука', rest: 90 }
                ]
            },
            {
                day: 5,
                title: 'Ноги + Плечи',
                duration: 70,
                type: 'Силовая',
                calories: 600,
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '10 мин', rest: 60 },
                    { name: 'Приседания', sets: 4, reps: '8-10', rest: 120 },
                    { name: 'Жим гантелей', sets: 4, reps: '10-12', rest: 90 },
                    { name: 'Выпады', sets: 3, reps: '12 каждая нога', rest: 90 },
                    { name: 'Махи в стороны', sets: 3, reps: '15', rest: 60 }
                ]
            }
        ]
    },
    flexibility: {
        id: 'flexibility',
        title: 'Развитие гибкости',
        description: 'Программа для улучшения гибкости и подвижности суставов',
        duration: '4 недели',
        intensity: 'low',
        calories: '1500-2000',
        image: 'flexibility.jpg',
        results: [
            'Увеличение гибкости',
            'Улучшение осанки',
            'Снижение риска травм',
            'Улучшение координации'
        ],
        workouts: [
            {
                day: 1,
                title: 'Общая растяжка',
                duration: 40,
                type: 'Растяжка',
                calories: 150,
                exercises: [
                    { name: 'Легкая разминка', sets: 1, reps: '7 мин', rest: 30 },
                    { name: 'Наклоны вперед', sets: 3, reps: '30 сек', rest: 30 },
                    { name: 'Бабочка', sets: 3, reps: '45 сек', rest: 30 },
                    { name: 'Складка', sets: 3, reps: '30 сек', rest: 30 },
                    { name: 'Шпагат', sets: 3, reps: '60 сек', rest: 45 }
                ]
            },
            {
                day: 3,
                title: 'Йога-комплекс',
                duration: 45,
                type: 'Йога',
                calories: 180,
                exercises: [
                    { name: 'Приветствие солнцу', sets: 3, reps: '5 мин', rest: 30 },
                    { name: 'Поза собаки', sets: 3, reps: '45 сек', rest: 30 },
                    { name: 'Поза воина', sets: 3, reps: '30 сек каждая сторона', rest: 30 },
                    { name: 'Поза голубя', sets: 2, reps: '60 сек каждая сторона', rest: 45 }
                ]
            },
            {
                day: 5,
                title: 'Динамическая растяжка',
                duration: 35,
                type: 'Растяжка',
                calories: 160,
                exercises: [
                    { name: 'Разминка', sets: 1, reps: '5 мин', rest: 30 },
                    { name: 'Махи ногами', sets: 3, reps: '15 каждая нога', rest: 30 },
                    { name: 'Скручивания', sets: 3, reps: '30 сек', rest: 30 },
                    { name: 'Мостик', sets: 3, reps: '20 сек', rest: 45 },
                    { name: 'Растяжка спины', sets: 3, reps: '45 сек', rest: 30 }
                ]
            }
        ]
    }
}; 