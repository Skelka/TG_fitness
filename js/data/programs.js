export const programs = {
    'morning': {
        id: 'morning',
        title: 'Утренняя зарядка',
        description: 'Комплекс упражнений для бодрого начала дня',
        icon: 'wb_sunny',
        duration: '10-15 минут',
        schedule: 'Каждое утро',
        difficulty: 'low',
        workouts: [
            {
                id: 'morning_1',
                title: 'Утренняя разминка',
                duration: 10,
                calories: 50,
                type: 'warmup',
                exercises: [
                    { name: 'Наклоны головы', sets: 1, reps: '8-10 раз в каждую сторону', rest: 10 },
                    { name: 'Вращения плечами', sets: 1, reps: '10 раз вперед и назад', rest: 10 },
                    { name: 'Наклоны в стороны', sets: 1, reps: '8 раз в каждую сторону', rest: 10 },
                    { name: 'Круговые движения руками', sets: 1, reps: '10 раз', rest: 10 }
                ]
            }
        ]
    },
    'office': {
        id: 'office',
        title: 'Разминка для офиса',
        description: 'Упражнения для снятия напряжения во время работы',
        icon: 'computer',
        duration: '5-10 минут',
        schedule: '2-3 раза в день',
        difficulty: 'low',
        workouts: [
            {
                id: 'office_1',
                title: 'Разминка для шеи и плеч',
                duration: 5,
                calories: 20,
                type: 'stretching',
                exercises: [
                    { name: 'Растяжка шеи', sets: 1, reps: '30 сек на каждую сторону', rest: 10 },
                    { name: 'Вращения плечами', sets: 1, reps: '10 раз', rest: 10 },
                    { name: 'Разминка запястий', sets: 1, reps: '10 вращений', rest: 10 }
                ]
            }
        ]
    },
    'evening': {
        id: 'evening',
        title: 'Вечерняя растяжка',
        description: 'Комплекс упражнений для расслабления перед сном',
        icon: 'bedtime',
        duration: '15-20 минут',
        schedule: 'Каждый вечер',
        difficulty: 'low',
        workouts: [
            {
                id: 'evening_1',
                title: 'Вечерняя растяжка',
                duration: 15,
                calories: 40,
                type: 'stretching',
                exercises: [
                    { name: 'Растяжка спины', sets: 1, reps: '30 сек', rest: 15 },
                    { name: 'Растяжка ног', sets: 1, reps: '30 сек на каждую ногу', rest: 15 },
                    { name: 'Растяжка плеч', sets: 1, reps: '30 сек', rest: 15 },
                    { name: 'Скручивания лежа', sets: 1, reps: '30 сек', rest: 15 }
                ]
            }
        ]
    },
    'break': {
        id: 'break',
        title: 'Активный перерыв',
        description: 'Быстрая разминка для перерыва',
        icon: 'timer',
        duration: '3-5 минут',
        schedule: 'Каждые 2-3 часа',
        difficulty: 'low',
        workouts: [
            {
                id: 'break_1',
                title: 'Быстрая разминка',
                duration: 3,
                calories: 15,
                type: 'general',
                exercises: [
                    { name: 'Ходьба на месте', sets: 1, reps: '30 сек', rest: 10 },
                    { name: 'Наклоны в стороны', sets: 1, reps: '5 раз в каждую сторону', rest: 10 },
                    { name: 'Вращения руками', sets: 1, reps: '10 раз', rest: 10 }
                ]
            }
        ]
    }
}; 