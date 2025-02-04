// Данные программ тренировок
export const defaultPrograms = [
    {
        id: 'weight_loss',
        name: 'Снижение веса',
        title: 'Снижение веса',
        description: 'Программа для снижения веса и улучшения метаболизма',
        icon: 'monitor_weight',
        difficulty: 'beginner',
        duration: 8,
        schedule: '3-4 тр/нед',
        workoutsPerWeek: 3,
        isCompleted: false,
        workouts: [
            {
                id: 'workout_1',
                name: 'Кардио + Сила',
                description: 'Сочетание кардио и силовых упражнений',
                duration: 45,
                type: 'cardio_strength',
                exercises: [
                    {
                        id: 'warmup_1',
                        name: 'Разминка',
                        type: 'warmup',
                        description: 'Легкая разминка для подготовки к тренировке',
                        duration: 300,
                        sets: 1,
                        restBetweenSets: 0
                    },
                    {
                        id: 'jumping_jacks',
                        name: 'Прыжки Jumping Jack',
                        type: 'cardio',
                        description: 'Прыжки с разведением рук и ног',
                        duration: 60,
                        sets: 3,
                        restBetweenSets: 30
                    },
                    {
                        id: 'squats',
                        name: 'Приседания',
                        type: 'strength',
                        description: 'Классические приседания',
                        reps: 15,
                        sets: 3,
                        restBetweenSets: 60
                    },
                    {
                        id: 'pushups',
                        name: 'Отжимания',
                        type: 'strength',
                        description: 'Классические отжимания от пола',
                        reps: 10,
                        sets: 3,
                        restBetweenSets: 60
                    },
                    {
                        id: 'plank',
                        name: 'Планка',
                        type: 'static',
                        description: 'Удержание планки',
                        duration: 30,
                        sets: 3,
                        restBetweenSets: 30
                    }
                ]
            },
            {
                id: 'workout_2',
                name: 'ВИИТ тренировка',
                description: 'Высокоинтенсивная интервальная тренировка',
                duration: 30,
                type: 'hiit',
                exercises: [
                    {
                        id: 'warmup_2',
                        name: 'Разминка',
                        type: 'warmup',
                        description: 'Динамическая разминка',
                        duration: 300,
                        sets: 1
                    },
                    {
                        id: 'burpees',
                        name: 'Бёрпи',
                        type: 'hiit',
                        description: 'Комплексное упражнение',
                        duration: 30,
                        sets: 4,
                        restBetweenSets: 30
                    },
                    {
                        id: 'mountain_climbers',
                        name: 'Скалолаз',
                        type: 'hiit',
                        description: 'Бег в упоре лёжа',
                        duration: 30,
                        sets: 4,
                        restBetweenSets: 30
                    }
                ]
            }
        ]
    },
    {
        id: 'morning_workout',
        name: 'Утренняя зарядка',
        description: 'Легкая зарядка для бодрого начала каждого дня',
        icon: 'wb_sunny',
        difficulty: 'beginner',
        duration: 'unlimited',
        workoutsPerWeek: 7,
        isCompleted: false,
        workouts: [
            {
                id: 'morning_1',
                name: 'Утренний комплекс',
                description: 'Разминка всего тела, растяжка и легкие упражнения для заряда энергией',
                duration: 15,
                type: 'morning',
                exercises: [
                    {
                        id: 'warmup_1',
                        name: 'Разминка суставов',
                        type: 'warmup',
                        description: 'Мягкие круговые движения в суставах сверху вниз',
                        duration: 180,
                        sets: 1
                    },
                    {
                        id: 'stretching_1',
                        name: 'Растяжка',
                        type: 'stretch',
                        description: 'Комплекс упражнений на растяжку',
                        duration: 300,
                        sets: 1
                    }
                ]
            }
        ]
    }
];

// Функции для работы с данными программ
export const programDataManager = {
    // Получение программы по ID
    getProgramById(programId) {
        return defaultPrograms.find(p => p.id === programId);
    },

    // Получение тренировки по ID программы и тренировки
    getWorkoutById(programId, workoutId) {
        const program = this.getProgramById(programId);
        return program ? program.workouts.find(w => w.id === workoutId) : null;
    },

    // Получение следующей тренировки в программе
    getNextWorkout(programId, currentWorkoutId) {
        const program = this.getProgramById(programId);
        if (!program) return null;

        const currentIndex = program.workouts.findIndex(w => w.id === currentWorkoutId);
        return currentIndex < program.workouts.length - 1 ? program.workouts[currentIndex + 1] : null;
    }
}; 