// База данных анимаций упражнений
const exerciseAnimations = {
    // Упражнения для ног
    'Приседания': 'https://www.musclewiki.com/media/uploads/male-bodyweight-squat-front.gif',
    'Выпады': 'https://www.musclewiki.com/media/uploads/male-bodyweight-lunge-front.gif',
    'Подъемы на носки': 'https://www.musclewiki.com/media/uploads/male-bodyweight-calfrise-front.gif',
    
    // Упражнения для груди
    'Отжимания': 'https://www.musclewiki.com/media/uploads/male-bodyweight-pushup-front.gif',
    'Отжимания на брусьях': 'https://www.musclewiki.com/media/uploads/male-bodyweight-dips-side.gif',
    
    // Упражнения для спины
    'Подтягивания': 'https://www.musclewiki.com/media/uploads/male-bodyweight-pullup-front.gif',
    'Гиперэкстензия': 'https://www.musclewiki.com/media/uploads/male-bodyweight-backextension-side.gif',
    
    // Упражнения для пресса
    'Скручивания': 'https://www.musclewiki.com/media/uploads/male-bodyweight-crunch-side.gif',
    'Планка': 'https://www.musclewiki.com/media/uploads/male-bodyweight-plank-side.gif',
    'Подъемы ног': 'https://www.musclewiki.com/media/uploads/male-bodyweight-legraise-side.gif',
    
    // Упражнения для плеч
    'Отжимания в стойке на руках': 'https://www.musclewiki.com/media/uploads/male-bodyweight-handstandpushup-side.gif',
    'Пике-отжимания': 'https://www.musclewiki.com/media/uploads/male-bodyweight-pikepushup-side.gif',
    
    // Упражнения для бицепса
    'Подтягивания обратным хватом': 'https://www.musclewiki.com/media/uploads/male-bodyweight-chinup-front.gif',
    
    // Упражнения для трицепса
    'Отжимания узким хватом': 'https://www.musclewiki.com/media/uploads/male-bodyweight-closegrippushup-front.gif',
    
    // Кардио упражнения
    'Берпи': 'https://www.musclewiki.com/media/uploads/male-bodyweight-burpee-side.gif',
    'Прыжки на месте': 'https://www.musclewiki.com/media/uploads/male-bodyweight-jumpingjack-front.gif',
    'Бег на месте': 'https://www.musclewiki.com/media/uploads/male-bodyweight-highknees-side.gif',
    
    // Упражнения с гантелями
    'Жим гантелей': 'https://www.musclewiki.com/media/uploads/male-dumbbell-benchpress-side.gif',
    'Тяга гантелей в наклоне': 'https://www.musclewiki.com/media/uploads/male-dumbbell-row-side.gif',
    'Подъем гантелей на бицепс': 'https://www.musclewiki.com/media/uploads/male-dumbbell-bicepscurl-side.gif',
    'Разведение гантелей': 'https://www.musclewiki.com/media/uploads/male-dumbbell-flys-side.gif',
    
    // Растяжка
    'Растяжка квадрицепса': 'https://www.musclewiki.com/media/uploads/male-stretch-quadriceps-side.gif',
    'Растяжка плеч': 'https://www.musclewiki.com/media/uploads/male-stretch-shoulder-front.gif',
    'Растяжка спины': 'https://www.musclewiki.com/media/uploads/male-stretch-back-side.gif',
    
    // Разминка
    'Круговые движения руками': 'https://www.musclewiki.com/media/uploads/male-stretch-armcircles-front.gif',
    'Наклоны в стороны': 'https://www.musclewiki.com/media/uploads/male-stretch-sidebend-front.gif',
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
        'https://www.musclewiki.com/media/uploads/male-bodyweight-squat-front.gif'; // Дефолтная анимация
}

// Экспортируем базу данных
export { exerciseAnimations };

// Делаем базу данных доступной глобально
window.exerciseAnimations = exerciseAnimations;
window.getExerciseAnimation = getExerciseAnimation; 