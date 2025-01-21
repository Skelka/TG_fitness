// Создаем объект с путями к изображениям упражнений
window.exerciseImages = {
    // Базовые упражнения
    'Отжимания': './images/exercises/pushups.gif',
    'Приседания': './images/exercises/squats.gif',
    'Планка': './images/exercises/plank.gif',
    // Добавьте остальные упражнения
    
    // Заглушка для отсутствующих изображений
    'default': './images/exercises/placeholder.png'
};

// Функция для получения изображения упражнения
window.getExerciseImage = function(exerciseName) {
    return window.exerciseImages[exerciseName] || window.exerciseImages.default;
}; 