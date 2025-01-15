<<<<<<< HEAD
let workoutTimer;
let workoutStartTime;
let currentWorkout = null;

// Начало тренировки
function startWorkout(type) {
    if (state.workoutInProgress) {
        tg.showAlert('Тренировка уже идет!');
        return;
    }

    currentWorkout = {
        type: type,
        startTime: new Date(),
        calories: 0
    };

    state.workoutInProgress = true;
    workoutStartTime = Date.now();
    
    // Показываем активную тренировку
    document.getElementById('active-workout').classList.remove('hidden');
    
    // Запускаем таймер
    workoutTimer = setInterval(updateWorkoutTimer, 1000);
}

// Обновление таймера
function updateWorkoutTimer() {
    const elapsed = Date.now() - workoutStartTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    
    // Обновляем отображение таймера
    document.querySelector('.timer').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    
    // Обновляем калории (примерный расчет)
    const calories = Math.floor(seconds * 0.15);
    document.getElementById('calories').textContent = calories;
    currentWorkout.calories = calories;
}

// Завершение тренировки
async function finishWorkout() {
    if (!state.workoutInProgress) return;

    clearInterval(workoutTimer);
    state.workoutInProgress = false;

    const duration = Math.floor((Date.now() - workoutStartTime) / 1000);
    const workoutData = {
        type: currentWorkout.type,
        duration: duration,
        calories: currentWorkout.calories,
        completed_at: new Date().toISOString()
    };

    try {
        loading.show();
        if (navigator.onLine) {
            // Отправляем данные в бот
            await sendDataToBot({
                type: 'workout_complete',
                data: workoutData
            });
        } else {
            // Сохраняем данные локально
            saveWorkoutLocally(workoutData);
        }
        
        // Обновляем статистику
        updateStatistics(workoutData);
        
        // Сбрасываем UI
        document.getElementById('active-workout').classList.add('hidden');
        showSection('main-menu');
        
        tg.showAlert('Тренировка успешно завершена!');
    } catch (error) {
        handleError(error);
    } finally {
        loading.hide();
    }
}

// Сохранение данных локально
function saveWorkoutLocally(workoutData) {
    const cachedData = JSON.parse(localStorage.getItem('cachedData') || '[]');
    cachedData.push({
        type: 'workout_complete',
        data: workoutData,
        timestamp: Date.now()
    });
    localStorage.setItem('cachedData', JSON.stringify(cachedData));
}

// Инициализация обработчиков для кнопок тренировок
document.querySelectorAll('.workout-type').forEach(button => {
    button.addEventListener('click', () => {
        startWorkout(button.dataset.type);
    });
=======
let workoutTimer;
let workoutStartTime;
let currentWorkout = null;

// Начало тренировки
function startWorkout(type) {
    if (state.workoutInProgress) {
        tg.showAlert('Тренировка уже идет!');
        return;
    }

    currentWorkout = {
        type: type,
        startTime: new Date(),
        calories: 0
    };

    state.workoutInProgress = true;
    workoutStartTime = Date.now();
    
    // Показываем активную тренировку
    document.getElementById('active-workout').classList.remove('hidden');
    
    // Запускаем таймер
    workoutTimer = setInterval(updateWorkoutTimer, 1000);
}

// Обновление таймера
function updateWorkoutTimer() {
    const elapsed = Date.now() - workoutStartTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    
    // Обновляем отображение таймера
    document.querySelector('.timer').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    
    // Обновляем калории (примерный расчет)
    const calories = Math.floor(seconds * 0.15);
    document.getElementById('calories').textContent = calories;
    currentWorkout.calories = calories;
}

// Завершение тренировки
async function finishWorkout() {
    if (!state.workoutInProgress) return;

    clearInterval(workoutTimer);
    state.workoutInProgress = false;

    const duration = Math.floor((Date.now() - workoutStartTime) / 1000);
    const workoutData = {
        type: currentWorkout.type,
        duration: duration,
        calories: currentWorkout.calories,
        completed_at: new Date().toISOString()
    };

    try {
        loading.show();
        if (navigator.onLine) {
            // Отправляем данные в бот
            await sendDataToBot({
                type: 'workout_complete',
                data: workoutData
            });
        } else {
            // Сохраняем данные локально
            saveWorkoutLocally(workoutData);
        }
        
        // Обновляем статистику
        updateStatistics(workoutData);
        
        // Сбрасываем UI
        document.getElementById('active-workout').classList.add('hidden');
        showSection('main-menu');
        
        tg.showAlert('Тренировка успешно завершена!');
    } catch (error) {
        handleError(error);
    } finally {
        loading.hide();
    }
}

// Сохранение данных локально
function saveWorkoutLocally(workoutData) {
    const cachedData = JSON.parse(localStorage.getItem('cachedData') || '[]');
    cachedData.push({
        type: 'workout_complete',
        data: workoutData,
        timestamp: Date.now()
    });
    localStorage.setItem('cachedData', JSON.stringify(cachedData));
}

// Инициализация обработчиков для кнопок тренировок
document.querySelectorAll('.workout-type').forEach(button => {
    button.addEventListener('click', () => {
        startWorkout(button.dataset.type);
    });
>>>>>>> 14f3ba79ce7643c2429781e250c7293da79353c9
}); 