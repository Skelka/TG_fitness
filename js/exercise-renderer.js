import { formatTime, showError, showNotification } from './utils.js';
import {
    currentWorkout,
    currentExerciseIndex,
    currentSet,
    isResting,
    restTimeLeft,
    isTimerMode,
    isTimerPaused,
    tg
} from './app.js';

// Локальные переменные для таймеров
let exerciseTimer = null;
let restTimer = null;

// Функция для отображения текущего упражнения
export async function renderExercise(exercise = null, index = null, total = null) {
    // Если параметры не переданы, используем глобальные переменные
    if (!exercise) {
        if (!currentWorkout || !currentWorkout.exercises) {
            showError('Ошибка: данные тренировки не загружены');
            return;
        }
        exercise = currentWorkout.exercises[currentExerciseIndex];
        if (!exercise) {
            showError('Ошибка: упражнение не найдено');
            return;
        }
        index = currentExerciseIndex;
        total = currentWorkout.exercises.length;
    }

    // Очищаем предыдущие таймеры
    if (exerciseTimer) clearInterval(exerciseTimer);
    if (restTimer) clearInterval(restTimer);

    const container = document.querySelector('.workout-content') || document.querySelector('.container');
    if (!container) return;

    // Вычисляем прогресс тренировки
    const progress = Math.round((index / (total - 1)) * 100);

    container.innerHTML = `
        <div class="workout-header">
            <div class="workout-title">
                <h2>${exercise.name}</h2>
                <div class="workout-progress">Упражнение ${index + 1} из ${total}</div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <button class="close-btn" onclick="confirmQuitWorkout()">
                <span class="material-symbols-rounded">close</span>
            </button>
        </div>
        
        <div class="exercise-container">
            <div class="exercise-header">
                <div class="exercise-type">
                    <span class="material-symbols-rounded">${getExerciseIcon(exercise.type)}</span>
                    <span>${getExerciseTypeText(exercise.type)}</span>
                </div>
                <p class="exercise-description">${exercise.description || ''}</p>
            </div>
            
            ${exercise.image ? `<img src="${exercise.image}" class="exercise-image" alt="${exercise.name}">` : ''}
            
            <div class="exercise-info">
                ${exercise.sets ? `
                    <div class="sets-info">
                        <span class="material-symbols-rounded">repeat</span>
                        <span>Подход ${currentSet} из ${exercise.sets}</span>
                    </div>
                ` : ''}
                
                ${exercise.reps ? `
                    <div class="reps-info">
                        <span class="material-symbols-rounded">fitness_center</span>
                        <span>${exercise.reps} повторений</span>
                    </div>
                ` : ''}
                
                ${exercise.duration ? `
                    <div class="duration-info">
                        <span class="material-symbols-rounded">timer</span>
                        <div class="timer">${formatTime(exercise.duration)}</div>
                    </div>
                ` : ''}
                
                ${exercise.muscleGroups ? `
                    <div class="muscle-groups">
                        <span class="material-symbols-rounded">sports_martial_arts</span>
                        <span>${getMuscleGroupsText(exercise.muscleGroups)}</span>
                    </div>
                ` : ''}
            </div>
            
            ${exercise.sequence ? `
                <div class="exercise-sequence">
                    <h4>Последовательность выполнения:</h4>
                    <ol>
                        ${exercise.sequence.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
            ` : ''}
            
            ${exercise.technique ? `
                <div class="exercise-technique">
                    <h4>Техника выполнения:</h4>
                    <ol>
                        ${exercise.technique.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
            ` : ''}
            
            <div class="exercise-controls">
                <button class="control-btn prev" onclick="prevExercise()" ${index === 0 ? 'disabled' : ''}>
                    <span class="material-symbols-rounded">arrow_back</span>
                </button>
                
                <button class="control-btn ${isTimerMode ? 'pause' : 'play'}" onclick="toggleTimer()">
                    <span class="material-symbols-rounded">${isTimerMode ? 'pause' : 'play_arrow'}</span>
                </button>
                
                <button class="control-btn complete" onclick="completeExercise()">
                    <span class="material-symbols-rounded">check</span>
                </button>
                
                <button class="control-btn next" onclick="nextExercise()" ${index === total - 1 ? 'disabled' : ''}>
                    <span class="material-symbols-rounded">arrow_forward</span>
                </button>
            </div>
        </div>
        ${isResting ? `
            <div class="rest-timer">
                <h3>Отдых</h3>
                <div class="timer" id="rest-timer">${formatTime(restTimeLeft)}</div>
            </div>
        ` : ''}
    `;
    
    // Если упражнение с таймером, запускаем его
    if (exercise.duration && !isResting) {
        startExerciseTimer(exercise.duration);
    }

    // Добавляем тактильный отклик
    tg.HapticFeedback.impactOccurred('light');
}

// Вспомогательные функции
export function getExerciseIcon(type) {
    const icons = {
        'cardio': 'directions_run',
        'strength': 'fitness_center',
        'flexibility': 'self_improvement',
        'balance': 'sports_martial_arts',
        'warmup': 'accessibility_new',
        'cooldown': 'cooling',
        'hiit': 'timer',
        'core': 'sports_martial_arts',
        'stretch': 'sports_gymnastics',
        'breathing': 'air',
        'static': 'accessibility_new',
        'functional': 'exercise'
    };
    return icons[type] || 'fitness_center';
}

export function getExerciseTypeText(type) {
    const types = {
        'cardio': 'Кардио',
        'strength': 'Силовое',
        'flexibility': 'Растяжка',
        'balance': 'Баланс',
        'warmup': 'Разминка',
        'cooldown': 'Заминка',
        'hiit': 'ВИИТ',
        'core': 'Пресс',
        'stretch': 'Растяжка',
        'breathing': 'Дыхательное',
        'static': 'Статика',
        'functional': 'Функциональное'
    };
    return types[type] || type;
}

export function getMuscleGroupsText(groups) {
    if (!groups || !Array.isArray(groups)) return 'Все тело';
    const translations = {
        'legs': 'Ноги',
        'arms': 'Руки',
        'chest': 'Грудь',
        'back': 'Спина',
        'core': 'Пресс',
        'shoulders': 'Плечи',
        'full_body': 'Все тело',
        'cardio': 'Кардио'
    };
    return groups.map(group => translations[group] || group).join(', ');
}

// Функции для работы с таймерами
export function startExerciseTimer(duration) {
    clearTimers();
    isTimerMode = true;
    isTimerPaused = false;
    
    let timeLeft = duration;
    updateTimerDisplay(timeLeft);
    
    exerciseTimer = setInterval(() => {
        if (!isTimerPaused) {
            timeLeft--;
            updateTimerDisplay(timeLeft);
            
            if (timeLeft <= 0) {
                clearInterval(exerciseTimer);
                showNotification('Время вышло!', 'success');
                // Здесь можно добавить логику для перехода к следующему упражнению
            }
        }
    }, 1000);
}

export function toggleTimer() {
    isTimerPaused = !isTimerPaused;
    const pauseButton = document.querySelector('#pauseTimer');
    if (pauseButton) {
        pauseButton.textContent = isTimerPaused ? 'Продолжить' : 'Пауза';
    }
    showNotification(isTimerPaused ? 'Таймер на паузе' : 'Таймер запущен');
}

export function updateTimerDisplay(seconds) {
    const timerDisplay = document.querySelector('#timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = formatTime(seconds);
    }
}

export function startRestTimer(duration) {
    clearTimers();
    isResting = true;
    restTimeLeft = duration;
    
    updateTimerDisplay(restTimeLeft);
    
    restTimer = setInterval(() => {
        restTimeLeft--;
        updateTimerDisplay(restTimeLeft);
        
        if (restTimeLeft <= 0) {
            clearInterval(restTimer);
            isResting = false;
            showNotification('Отдых завершен!', 'success');
            // Здесь можно добавить логику для перехода к следующему упражнению
        }
    }, 1000);
}

export function skipRest() {
    if (isResting && restTimer) {
        clearInterval(restTimer);
        isResting = false;
        showNotification('Отдых пропущен');
        // Здесь можно добавить логику для перехода к следующему упражнению
    }
}

export function clearTimers() {
    if (exerciseTimer) {
        clearInterval(exerciseTimer);
        exerciseTimer = null;
    }
    if (restTimer) {
        clearInterval(restTimer);
        restTimer = null;
    }
    isTimerMode = false;
    isTimerPaused = false;
    isResting = false;
    restTimeLeft = 0;
}

export function renderExercise() {
    if (!currentWorkout || !currentWorkout.exercises || currentExerciseIndex >= currentWorkout.exercises.length) {
        showError('Нет доступных упражнений');
        return;
    }

    const exercise = currentWorkout.exercises[currentExerciseIndex];
    const mainContainer = document.querySelector('#mainContainer');
    if (!mainContainer) return;

    mainContainer.innerHTML = `
        <div class="exercise-card">
            <h2>${exercise.name}</h2>
            <div class="exercise-details">
                <p>Подход ${currentSet} из ${exercise.sets}</p>
                ${exercise.reps ? `<p>Повторений: ${exercise.reps}</p>` : ''}
                ${exercise.duration ? `<p>Длительность: ${formatTime(exercise.duration)}</p>` : ''}
            </div>
            ${exercise.description ? `<p class="exercise-description">${exercise.description}</p>` : ''}
            
            <div class="timer-container" ${!exercise.duration ? 'style="display: none;"' : ''}>
                <div id="timerDisplay">${exercise.duration ? formatTime(exercise.duration) : '00:00'}</div>
                <div class="timer-controls">
                    <button id="startTimer" onclick="startExerciseTimer(${exercise.duration})">Старт</button>
                    <button id="pauseTimer" onclick="toggleTimer()">Пауза</button>
                </div>
            </div>

            <div class="exercise-controls">
                <button class="primary-button" onclick="completeSet()">
                    Завершить подход
                </button>
                ${currentSet > 1 ? `
                    <button class="secondary-button" onclick="previousSet()">
                        Предыдущий подход
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    if (exercise.duration && isTimerMode) {
        startExerciseTimer(exercise.duration);
    }
}

export function completeSet() {
    const exercise = currentWorkout.exercises[currentExerciseIndex];
    clearTimers();

    if (currentSet < exercise.sets) {
        currentSet++;
        if (exercise.restBetweenSets) {
            startRestTimer(exercise.restBetweenSets);
        }
    } else {
        currentSet = 1;
        currentExerciseIndex++;
        
        if (currentExerciseIndex < currentWorkout.exercises.length) {
            const nextExercise = currentWorkout.exercises[currentExerciseIndex];
            if (nextExercise.restBeforeStart) {
                startRestTimer(nextExercise.restBeforeStart);
            }
        } else {
            showNotification('Тренировка завершена!', 'success');
            // Здесь можно добавить логику завершения тренировки
            return;
        }
    }
    
    renderExercise();
}

export function previousSet() {
    if (currentSet > 1) {
        currentSet--;
        clearTimers();
        renderExercise();
    } else if (currentExerciseIndex > 0) {
        currentExerciseIndex--;
        const exercise = currentWorkout.exercises[currentExerciseIndex];
        currentSet = exercise.sets;
        clearTimers();
        renderExercise();
    }
} 