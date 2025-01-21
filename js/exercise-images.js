// Базовые анимации для упражнений
window.exerciseAnimations = {
    // Разминка и кардио
    'Разминка': 'https://media.giphy.com/media/3oKIPaGG0c3XRDdXKE/giphy.gif',
    'Бёрпи': 'https://media.giphy.com/media/5hnnXiTIi0jjVeMJqt/giphy.gif',
    'Прыжки': 'https://media.giphy.com/media/3oKIPc9VZj4ylzjcys/giphy.gif',
    'Бег на месте': 'https://media.giphy.com/media/3oKIPaGG0c3XRDdXKE/giphy.gif',
    'Джампинг джек': 'https://media.giphy.com/media/3oKIPaGG0c3XRDdXKE/giphy.gif',

    // Ноги
    'Приседания': 'https://media.giphy.com/media/5hnnXiTIi0jjVeMJqt/giphy.gif',
    'Выпады': 'https://media.giphy.com/media/7YCC7PTNX4ZRxhdzdt/giphy.gif',
    'Приседания с гантелями': 'https://media.giphy.com/media/5hnnXiTIi0jjVeMJqt/giphy.gif',
    'Приседания со штангой': 'https://media.giphy.com/media/5hnnXiTIi0jjVeMJqt/giphy.gif',
    
    // Грудь и трицепс
    'Отжимания': 'https://media.giphy.com/media/7YCC7PTNX4ZRxhdzdt/giphy.gif',
    'Отжимания с широкой постановкой': 'https://media.giphy.com/media/7YCC7PTNX4ZRxhdzdt/giphy.gif',
    'Жим гантелей': 'https://media.giphy.com/media/3oKIPqM5Qs5vref1pS/giphy.gif',
    
    // Спина и бицепс
    'Подтягивания': 'https://media.giphy.com/media/3oKIPqM5Qs5vref1pS/giphy.gif',
    'Тяга гантелей': 'https://media.giphy.com/media/3oKIPqM5Qs5vref1pS/giphy.gif',
    
    // Пресс и планки
    'Планка': 'https://media.giphy.com/media/3oKIPqM5Qs5vref1pS/giphy.gif',
    'Скручивания': 'https://media.giphy.com/media/xT8qBmCnJ8wZeaXO8M/giphy.gif',
    
    // Заглушка для остальных упражнений
    'default': 'https://media.giphy.com/media/3oKIPc9VZj4ylzjcys/giphy.gif'
};

// Функция для получения анимации упражнения с учетом оборудования
window.getExerciseAnimation = function(exerciseName, equipment = []) {
    // Нормализуем название упражнения
    const normalizedName = exerciseName.toLowerCase()
        .replace(/ё/g, 'е')
        .trim();

    // Проверяем наличие специальной версии с оборудованием
    if (equipment && equipment.length > 0) {
        const withEquipment = equipment.some(eq => {
            const fullName = `${normalizedName} с ${eq}`.toLowerCase();
            return window.exerciseAnimations[fullName];
        });
        if (withEquipment) return window.exerciseAnimations[withEquipment];
    }

    // Ищем базовую версию упражнения
    for (const [key, value] of Object.entries(window.exerciseAnimations)) {
        if (key.toLowerCase() === normalizedName) {
            return value;
        }
    }

    // Возвращаем анимацию по умолчанию, если ничего не найдено
    return window.exerciseAnimations.default;
};

// Добавляем функцию предзагрузки анимаций
window.preloadExerciseAnimations = function(exercises) {
    const uniqueAnimations = new Set();
    
    exercises.forEach(exercise => {
        const animation = window.getExerciseAnimation(exercise.name);
        uniqueAnimations.add(animation);
    });

    // Предзагружаем все уникальные анимации
    uniqueAnimations.forEach(url => {
        const img = new Image();
        img.src = url;
    });
}; 