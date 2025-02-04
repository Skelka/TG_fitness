window.exercisesDB = {
    // База упражнений
    exercises: {
        "Разминка": {
            type: "warmup",
            equipment: ["скакалка"],
            muscle: "full_body",
            difficulty: "easy",
            alternatives: {
                "Суставная разминка": {
                    equipment: [],
                    difficulty: "easy",
                    description: "Разминка всех суставов сверху вниз"
                },
                "Легкий бег на месте": {
                    equipment: [],
                    difficulty: "easy",
                    description: "Бег на месте в течение указанного времени"
                }
            }
        },
        "Приседания": {
            type: "strength",
            equipment: [],
            muscle: "legs",
            difficulty: "medium",
            alternatives: {
                "Приседания с гантелями": {
                    equipment: ["гантели"],
                    difficulty: "medium",
                    description: "Приседания с гантелями у плеч"
                },
                "Приседания со штангой": {
                    equipment: ["штанга"],
                    difficulty: "hard",
                    description: "Приседания со штангой на плечах"
                }
            }
        },
        "Отжимания": {
            type: "strength",
            equipment: [],
            muscle: "chest",
            difficulty: "medium",
            alternatives: {
                "Отжимания с широкой постановкой": {
                    equipment: [],
                    difficulty: "medium",
                    description: "Отжимания с широкой постановкой рук"
                },
                "Жим гантелей лежа": {
                    equipment: ["гантели", "скамья"],
                    difficulty: "medium",
                    description: "Жим гантелей лежа на скамье"
                }
            }
        }
    },

    // Метаданные
    metadata: {
        muscles: {
            full_body: "Все тело",
            legs: "Ноги",
            chest: "Грудь",
            back: "Спина",
            shoulders: "Плечи",
            arms: "Руки",
            core: "Кор",
            cardio: "Кардио",
            biceps: "Бицепс",
            triceps: "Трицепс",
            abs: "Пресс",
            warmup: "Разминка"
        },
        difficulty: {
            easy: "Легкий",
            medium: "Средний",
            hard: "Сложный"
        },
        equipment: {
            none: "Без оборудования",
            dumbbells: "Гантели",
            barbell: "Штанга",
            bench: "Скамья",
            pullup_bar: "Турник",
            resistance_bands: "Резинки",
            yoga_mat: "Коврик"
        }
    },

    // Функции для работы с базой
    getExercise(name) {
        return this.exercises[name] || null;
    },

    findAlternatives(exercise, availableEquipment = [], userLevel = 'medium', preferredMuscle = null) {
        const exerciseData = this.getExercise(exercise);
        if (!exerciseData) return [];

        // Проверяем возможность выполнения оригинального упражнения
        const canDoOriginal = !exerciseData.equipment.length || 
            exerciseData.equipment.every(eq => availableEquipment.includes(eq));
        if (canDoOriginal) return [];

        const difficultyLevels = { easy: 0, medium: 1, hard: 2 };
        const userLevelNum = difficultyLevels[userLevel];

        // Получаем все альтернативы с подсчетом их оценки
        return Object.entries(exerciseData.alternatives)
            .map(([name, data]) => {
                // Подсчет оценки для альтернативы
                let score = 0;
                
                // Проверяем доступность оборудования
                const hasEquipment = !data.equipment.length || 
                    data.equipment.every(eq => availableEquipment.includes(eq));
                if (!hasEquipment) return null;

                // Оценка сложности
                const diffScore = 1 - Math.abs(difficultyLevels[data.difficulty] - userLevelNum);
                score += diffScore * 2;

                // Бонус за соответствие целевой мышечной группе
                if (exerciseData.muscle === preferredMuscle) {
                    score += 1;
                }

                // Бонус за минимальное количество оборудования
                score += (1 / (data.equipment.length + 1));

                return {
                    name,
                    ...data,
                    score
                };
            })
            .filter(alt => alt !== null)
            .sort((a, b) => b.score - a.score);
    }
};

// Делаем базу данных доступной глобально
window.exercisesDB = exercisesDB; 