// Базовые SVG-анимации для упражнений
window.exerciseAnimations = {
    // Приседания
    squats: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDdtY2JrY3BxOGh6YnB2OHZ5NnBham00d2x6Ym5wNzVlNmFyYmFpbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/5hnnXiTIi0jjVeMJqt/giphy.gif',

    // Отжимания
    pushups: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWRjMjJ3ZDVrMWF6NXd6ZnJ5NmE4OW1xbDlsZWN6ZHF6YnJ1aHF6eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/7YCC7PTNX4ZRxhdzdt/giphy.gif',

    // Планка
    plank: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzJnOWJyY3JyZmwwbWd1NXBnOWRxbWRwN2Zya2VpMWF6ZHJ0aXB6eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPqM5Qs5vref1pS/giphy.gif',

    // Заглушка для остальных упражнений
    default: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExenJhOWRyY3JyZmwwbWd1NXBnOWRxbWRwN2Zya2VpMWF6ZHJ0aXB6eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPc9VZj4ylzjcys/giphy.gif',

    // Бёрпи
    burpee: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeHJhOWRyY3JyZmwwbWd1NXBnOWRxbWRwN2Zya2VpMWF6ZHJ0aXB6eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPaGG0c3XRDdXKE/giphy.gif',

    // Выпады
    lunges: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMno5Y2JrY3BxOGh6YnB2OHZ5NnBham00d2x6Ym5wNzVlNmFyYmFpbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPc9VZj4ylzjcys/giphy.gif',

    // Скручивания
    crunches: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXJhOWRyY3JyZmwwbWd1NXBnOWRxbWRwN2Zya2VpMWF6ZHJ0aXB6eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT8qBmCnJ8wZeaXO8M/giphy.gif',

    // Разминка
    warmup: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJhOWRyY3JyZmwwbWd1NXBnOWRxbWRwN2Zya2VpMWF6ZHJ0aXB6eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPc9VZj4ylzjcys/giphy.gif'
};

// Функция для получения анимации упражнения
window.getExerciseAnimation = function(exerciseName) {
    const key = exerciseName.toLowerCase()
        .replace(/[^a-zа-яё]/g, '')
        .replace(/приседания/, 'squats')
        .replace(/отжимания/, 'pushups')
        .replace(/планка/, 'plank')
        .replace(/бёрпи/, 'burpee')
        .replace(/скручивания/, 'crunches')
        .replace(/разминка/, 'warmup');
    
    return window.exerciseAnimations[key] || window.exerciseAnimations.default;
}; 