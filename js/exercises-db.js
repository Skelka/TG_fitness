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
        },
        // ... остальные упражнения
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
            cardio: "Кардио"
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

    findAlternatives(exercise, availableEquipment = [], userLevel = 'medium') {
        const exerciseData = this.getExercise(exercise);
        if (!exerciseData) return null;

        return Object.entries(exerciseData.alternatives)
            .filter(([_, data]) => {
                const hasEquipment = data.equipment.every(eq => 
                    availableEquipment.includes(eq));
                const matchesDifficulty = this.matchesDifficulty(data.difficulty, userLevel);
                return hasEquipment && matchesDifficulty;
            })
            .map(([name, data]) => ({
                name,
                ...data
            }));
    },

    matchesDifficulty(exerciseDifficulty, userLevel) {
        const levels = { easy: 0, medium: 1, hard: 2 };
        const diff = Math.abs(levels[exerciseDifficulty] - levels[userLevel]);
        return diff <= 1;
    }
};

// Добавляем метаданные для каждого упражнения
const exerciseMetadata = {
    difficulty: {
        easy: "Легкий",
        medium: "Средний",
        hard: "Сложный"
    },
    muscles: {
        chest: "Грудь",
        back: "Спина",
        legs: "Ноги",
        shoulders: "Плечи",
        biceps: "Бицепс",
        triceps: "Трицепс",
        abs: "Пресс",
        cardio: "Кардио",
        warmup: "Разминка"
    }
};

// Улучшаем функцию поиска альтернатив
function findBestExerciseAlternative(exercise, availableEquipment, userLevel = 'medium', preferredMuscle = null) {
    const exerciseData = exercisesDB.exercises[exercise];
    if (!exerciseData) return exercise;

    // Проверяем возможность выполнения оригинального упражнения
    const canDoOriginal = exerciseData.equipment.every(eq => availableEquipment.includes(eq));
    if (canDoOriginal) return exercise;

    // Получаем все возможные альтернативы
    const alternatives = Object.entries(exerciseData.alternatives)
        .filter(([_, data]) => data.equipment.every(eq => availableEquipment.includes(eq)));

    if (alternatives.length === 0) {
        // Ищем упражнение без оборудования
        const bodyweightAlternative = Object.entries(exerciseData.alternatives)
            .find(([_, data]) => data.equipment.length === 0);
        return bodyweightAlternative ? bodyweightAlternative[0] : exercise;
    }

    // Оценка каждой альтернативы
    const difficultyLevels = { easy: 0, medium: 1, hard: 2 };
    const userLevelNum = difficultyLevels[userLevel];

    return alternatives.reduce((best, current) => {
        const bestScore = scoreAlternative(best[1], userLevelNum, exerciseData.muscle, preferredMuscle);
        const currentScore = scoreAlternative(current[1], userLevelNum, exerciseData.muscle, preferredMuscle);
        return currentScore > bestScore ? current : best;
    })[0];
}

// Функция подсчета очков для альтернативы
function scoreAlternative(alternative, userLevel, targetMuscle, preferredMuscle) {
    let score = 0;
    
    // Соответствие уровню сложности
    const difficultyLevels = { easy: 0, medium: 1, hard: 2 };
    const diffScore = 1 - Math.abs(difficultyLevels[alternative.difficulty] - userLevel);
    score += diffScore * 2;

    // Бонус за соответствие целевой мышечной группе
    if (targetMuscle === preferredMuscle) {
        score += 1;
    }

    // Бонус за минимальное количество оборудования
    score += (1 / (alternative.equipment.length + 1));

    return score;
} 