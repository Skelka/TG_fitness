// Создаем объект с путями к изображениям упражнений
const exerciseImages = {
    // Базовые упражнения
    'Отжимания': './images/exercises/pushups.gif',
    'Приседания': './images/exercises/squats.gif',
    'Планка': './images/exercises/plank.gif',
    // Добавьте остальные упражнения
    
    // Заглушка для отсутствующих изображений
    'default': './images/exercises/placeholder.png'
};

// Функция для получения изображения упражнения
function getExerciseImage(exerciseName) {
    return exerciseImages[exerciseName] || exerciseImages.default;
}

// Экспортируем функцию
export { getExerciseImage }; 