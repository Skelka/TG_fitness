// База данных анимаций упражнений
const exerciseAnimations = {
    // Разминка
    'Разминка суставов': 'https://i.imgur.com/7spG1Rb.gif',
    'Круговые движения руками': 'https://i.imgur.com/QcXRlwF.gif',
    'Наклоны в стороны': 'https://i.imgur.com/L8E8zyH.gif',
    'Разминка': 'https://i.imgur.com/7spG1Rb.gif',

    // Кардио
    'Прыжки Jumping Jack': 'https://i.imgur.com/8YXwvB3.gif',
    'Бёрпи': 'https://i.imgur.com/kqB9LyJ.gif',
    'Скалолаз': 'https://i.imgur.com/0Y6zXgK.gif',
    'Бег на месте': 'https://i.imgur.com/ZUr8H7g.gif',

    // Силовые
    'Приседания': 'https://i.imgur.com/UJqLbwl.gif',
    'Отжимания': 'https://i.imgur.com/UwZyefW.gif',
    'Планка': 'https://i.imgur.com/x4qJPqF.gif',
    'Выпады': 'https://i.imgur.com/1jKRjZF.gif',
    'Подтягивания': 'https://i.imgur.com/8yXV6q4.gif',

    // Растяжка
    'Растяжка': 'https://i.imgur.com/YpfDORm.gif',
    'Растяжка ног': 'https://i.imgur.com/nWYHxQA.gif',
    'Растяжка спины': 'https://i.imgur.com/K3xGg9j.gif',
    'Наклоны к ногам': 'https://i.imgur.com/2GLxZbg.gif',

    // Упражнения для груди
    'Отжимания на брусьях': 'https://www.musclewiki.com/media/uploads/male-bodyweight-dips-side.gif',
    
    // Упражнения для спины
    'Гиперэкстензия': 'https://www.musclewiki.com/media/uploads/male-bodyweight-backextension-side.gif',
    
    // Упражнения для пресса
    'Скручивания': 'https://www.musclewiki.com/media/uploads/male-bodyweight-crunch-side.gif',
    'Подъемы ног': 'https://www.musclewiki.com/media/uploads/male-bodyweight-legraise-side.gif',
    
    // Упражнения для плеч
    'Отжимания в стойке на руках': 'https://www.musclewiki.com/media/uploads/male-bodyweight-handstandpushup-side.gif',
    'Пике-отжимания': 'https://www.musclewiki.com/media/uploads/male-bodyweight-pikepushup-side.gif',
    
    // Упражнения для бицепса
    'Подтягивания обратным хватом': 'https://www.musclewiki.com/media/uploads/male-bodyweight-chinup-front.gif',
    
    // Упражнения для трицепса
    'Отжимания узким хватом': 'https://www.musclewiki.com/media/uploads/male-bodyweight-closegrippushup-front.gif',
    
    // Упражнения с гантелями
    'Жим гантелей': 'https://www.musclewiki.com/media/uploads/male-dumbbell-benchpress-side.gif',
    'Тяга гантелей в наклоне': 'https://www.musclewiki.com/media/uploads/male-dumbbell-row-side.gif',
    'Подъем гантелей на бицепс': 'https://www.musclewiki.com/media/uploads/male-dumbbell-bicepscurl-side.gif',
    'Разведение гантелей': 'https://www.musclewiki.com/media/uploads/male-dumbbell-flys-side.gif',
    
    // Растяжка
    'Растяжка квадрицепса': 'https://www.musclewiki.com/media/uploads/male-stretch-quadriceps-side.gif',
    'Растяжка плеч': 'https://www.musclewiki.com/media/uploads/male-stretch-shoulder-front.gif',
    'Вращение тазом': 'https://www.musclewiki.com/media/uploads/male-stretch-hiprotation-side.gif'
};

// Функция для получения анимации по названию упражнения
export function getExerciseAnimation(exerciseName) {
    // Если анимация найдена, возвращаем её
    if (exerciseAnimations[exerciseName]) {
        return exerciseAnimations[exerciseName];
    }
    
    // Если точного совпадения нет, ищем частичное совпадение
    const exerciseKey = Object.keys(exerciseAnimations).find(key => 
        exerciseName.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(exerciseName.toLowerCase())
    );
    
    // Возвращаем найденную анимацию или заглушку
    return exerciseKey ? 
        exerciseAnimations[exerciseKey] : 
        'https://i.imgur.com/UJqLbwl.gif'; // Дефолтная анимация
}

// Экспортируем базу данных
export { exerciseAnimations };

// Делаем базу данных доступной глобально
window.exerciseAnimations = exerciseAnimations;
window.getExerciseAnimation = getExerciseAnimation; 