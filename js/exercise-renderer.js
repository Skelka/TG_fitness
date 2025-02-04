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
// export async function renderExercise(exercise = null, index = null, total = null) { ... }

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

// Функция завершения упражнения
export function completeExercise() {
    if (!currentWorkout || !currentWorkout.exercises) return;
    
    const exercise = currentWorkout.exercises[currentExerciseIndex];
    clearTimers();

    // Если это последний подход
    if (currentSet >= exercise.sets) {
        currentSet = 1;
        currentExerciseIndex++;
        
        // Если есть следующее упражнение
        if (currentExerciseIndex < currentWorkout.exercises.length) {
            const nextExercise = currentWorkout.exercises[currentExerciseIndex];
            if (nextExercise.restBeforeStart) {
                startRestTimer(nextExercise.restBeforeStart);
            }
            renderExercise();
        } else {
            // Тренировка завершена
            finishWorkout();
        }
    } else {
        // Переходим к следующему подходу
        currentSet++;
        if (exercise.restBetweenSets) {
            startRestTimer(exercise.restBetweenSets);
        }
        renderExercise();
    }
    
    tg.HapticFeedback.impactOccurred('medium');
}

// Функция перехода к предыдущему упражнению
export function prevExercise() {
    if (currentExerciseIndex > 0) {
        currentExerciseIndex--;
        currentSet = 1;
        clearTimers();
        renderExercise();
        tg.HapticFeedback.impactOccurred('light');
    }
}

// Функция перехода к следующему упражнению
export function nextExercise() {
    if (currentExerciseIndex < currentWorkout.exercises.length - 1) {
        currentExerciseIndex++;
        currentSet = 1;
        clearTimers();
        renderExercise();
        tg.HapticFeedback.impactOccurred('light');
    }
} 