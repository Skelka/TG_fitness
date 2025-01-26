// Функции для работы с таймерами
export function clearTimers() {
    const timers = window.runningTimers || [];
    timers.forEach(timer => clearInterval(timer));
    window.runningTimers = [];
}

// Форматирование времени
export function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Получение текста для типа упражнения
export function getExerciseTypeText(type) {
    const types = {
        'cardio': 'Кардио',
        'strength': 'Силовая',
        'hiit': 'ВИИТ',
        'yoga': 'Йога',
        'stretching': 'Растяжка',
        'warmup': 'Разминка',
        'cooldown': 'Заминка',
        'circuit': 'Круговая',
        'cardio_strength': 'Кардио + сила',
        'general': 'Общая'
    };
    return types[type] || type;
}

// Получение текста для групп мышц
export function getMuscleGroupsText(groups) {
    if (!groups || !Array.isArray(groups)) return '';
    const muscleGroups = {
        'chest': 'Грудь',
        'back': 'Спина',
        'legs': 'Ноги',
        'shoulders': 'Плечи',
        'arms': 'Руки',
        'core': 'Пресс',
        'full_body': 'Все тело'
    };
    return groups.map(group => muscleGroups[group] || group).join(', ');
}

// Получение иконки для типа упражнения
export function getExerciseIcon(type) {
    const icons = {
        'cardio': 'directions_run',
        'strength': 'fitness_center',
        'hiit': 'timer',
        'yoga': 'self_improvement',
        'stretching': 'sports_martial_arts',
        'warmup': 'accessibility_new',
        'cooldown': 'accessibility',
        'circuit': 'loop',
        'cardio_strength': 'sprint',
        'general': 'sports_score'
    };
    return icons[type] || 'fitness_center';
}

// Получение текста для уровня сложности
export function getDifficultyText(difficulty) {
    const difficulties = {
        'low': 'Легкий',
        'medium': 'Средний',
        'high': 'Сложный'
    };
    return difficulties[difficulty] || difficulty;
} 