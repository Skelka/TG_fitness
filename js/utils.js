// Вспомогательные функции
export function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

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
        'cardio_strength': 'Кардио + Сила',
        'general': 'Общая'
    };
    return types[type] || type;
}

export function getMuscleGroupsText(groups) {
    if (!Array.isArray(groups)) return '';
    
    const translations = {
        'legs': 'Ноги',
        'arms': 'Руки',
        'chest': 'Грудь',
        'back': 'Спина',
        'shoulders': 'Плечи',
        'core': 'Пресс',
        'fullbody': 'Все тело'
    };
    return groups.map(group => translations[group] || group).join(', ');
}

export function getDifficultyText(difficulty) {
    const difficulties = {
        'beginner': 'Начинающий',
        'intermediate': 'Средний',
        'advanced': 'Продвинутый',
        'expert': 'Эксперт'
    };
    return difficulties[difficulty] || difficulty;
}

export function clearTimers() {
    if (window.workoutTimer) clearInterval(window.workoutTimer);
    if (window.restTimer) clearInterval(window.restTimer);
    if (window.exerciseTimer) clearInterval(window.exerciseTimer);
    window.workoutTimer = null;
    window.restTimer = null;
    window.exerciseTimer = null;
} 