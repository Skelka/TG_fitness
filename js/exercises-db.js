window.exercisesDB = {
    // Упражнения для груди
    "Жим штанги лежа": {
        equipment: ["штанга", "скамья"],
        alternatives: {
            "Отжимания": {
                equipment: [],
                difficulty: "medium"
            },
            "Жим гантелей лежа": {
                equipment: ["гантели", "скамья"],
                difficulty: "medium"
            },
            "Отжимания с упором на возвышение": {
                equipment: ["скамья"],
                difficulty: "easy"
            }
        }
    },

    // Упражнения для ног
    "Приседания со штангой": {
        equipment: ["штанга"],
        alternatives: {
            "Приседания с гантелями": {
                equipment: ["гантели"],
                difficulty: "medium"
            },
            "Приседания с собственным весом": {
                equipment: [],
                difficulty: "easy"
            },
            "Болгарские сплит-приседания": {
                equipment: ["скамья"],
                difficulty: "hard"
            }
        }
    },

    // И так далее для каждого упражнения...
};

// Функция для подбора подходящего упражнения
function findBestExerciseAlternative(exercise, availableEquipment, userLevel = 'medium') {
    const exerciseData = exercisesDB[exercise];
    if (!exerciseData) return exercise; // Если упражнение не найдено в базе, возвращаем исходное

    // Проверяем, можно ли выполнить исходное упражнение
    const canDoOriginal = exerciseData.equipment.every(eq => availableEquipment.includes(eq));
    if (canDoOriginal) return exercise;

    // Ищем альтернативы
    const alternatives = Object.entries(exerciseData.alternatives);
    const possibleAlternatives = alternatives.filter(([_, data]) => 
        data.equipment.every(eq => availableEquipment.includes(eq))
    );

    if (possibleAlternatives.length === 0) {
        // Если нет подходящих альтернатив, ищем упражнение без оборудования
        const bodyweightAlternative = alternatives.find(([_, data]) => 
            data.equipment.length === 0
        );
        return bodyweightAlternative ? bodyweightAlternative[0] : exercise;
    }

    // Подбираем упражнение по уровню сложности
    const difficultyLevels = { 'easy': 0, 'medium': 1, 'hard': 2 };
    const userLevelNum = difficultyLevels[userLevel];

    return possibleAlternatives.reduce((best, current) => {
        const bestDiff = Math.abs(difficultyLevels[best[1].difficulty] - userLevelNum);
        const currentDiff = Math.abs(difficultyLevels[current[1].difficulty] - userLevelNum);
        return currentDiff < bestDiff ? current : best;
    })[0];
} 