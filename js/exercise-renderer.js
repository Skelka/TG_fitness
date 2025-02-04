import { formatTime, showError, showNotification } from './utils.js';

// Получаем доступ к глобальным переменным через window
const getState = () => ({
    currentWorkout: window.currentWorkout,
    currentExerciseIndex: window.currentExerciseIndex,
    currentSet: window.currentSet,
    isResting: window.isResting,
    restTimeLeft: window.restTimeLeft,
    isTimerMode: window.isTimerMode,
    isTimerPaused: window.isTimerPaused,
    tg: window.tg
});

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
    window.isTimerMode = true;
    window.isTimerPaused = false;
    
    let timeLeft = duration;
    updateTimerDisplay(timeLeft);
    
    exerciseTimer = setInterval(() => {
        if (!window.isTimerPaused) {
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
    window.isTimerPaused = !window.isTimerPaused;
    const pauseButton = document.querySelector('#pauseTimer');
    if (pauseButton) {
        pauseButton.textContent = window.isTimerPaused ? 'Продолжить' : 'Пауза';
    }
    showNotification(window.isTimerPaused ? 'Таймер на паузе' : 'Таймер запущен');
}

export function updateTimerDisplay(seconds) {
    const timerDisplay = document.querySelector('#timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = formatTime(seconds);
    }
}

export function startRestTimer(duration) {
    clearTimers();
    window.isResting = true;
    window.restTimeLeft = duration;
    
    updateTimerDisplay(window.restTimeLeft);
    
    restTimer = setInterval(() => {
        window.restTimeLeft--;
        updateTimerDisplay(window.restTimeLeft);
        
        if (window.restTimeLeft <= 0) {
            clearInterval(restTimer);
            window.isResting = false;
            showNotification('Отдых завершен!', 'success');
            // Здесь можно добавить логику для перехода к следующему упражнению
        }
    }, 1000);
}

export function skipRest() {
    if (window.isResting && restTimer) {
        clearInterval(restTimer);
        window.isResting = false;
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
    window.isTimerMode = false;
    window.isTimerPaused = false;
    window.isResting = false;
    window.restTimeLeft = 0;
}

export function renderExercise() {
    const state = getState();
    console.log('Rendering exercise with state:', state);
    
    if (!state.currentWorkout || !state.currentWorkout.exercises) {
        console.error('No workout or exercises found:', state.currentWorkout);
        showError('Нет доступных упражнений');
        return;
    }

    if (state.currentExerciseIndex >= state.currentWorkout.exercises.length) {
        console.error('Exercise index out of bounds:', {
            currentIndex: state.currentExerciseIndex,
            totalExercises: state.currentWorkout.exercises.length
        });
        showError('Нет доступных упражнений');
        return;
    }

    const exercise = state.currentWorkout.exercises[state.currentExerciseIndex];
    console.log('Current exercise:', exercise);
    
    const mainContainer = document.querySelector('#mainContainer');
    if (!mainContainer) {
        console.error('Main container not found');
        return;
    }

    mainContainer.innerHTML = `
        <div class="exercise-card">
            <h2>${exercise.name}</h2>
            <div class="exercise-details">
                <p>Подход ${state.currentSet} из ${exercise.sets}</p>
                ${exercise.reps ? `<p>Повторений: ${exercise.reps}</p>` : ''}
                ${exercise.duration ? `<p>Длительность: ${formatTime(exercise.duration)}</p>` : ''}
            </div>
            ${exercise.description ? `<p class="exercise-description">${exercise.description}</p>` : ''}
            
            <div class="timer-container" ${!exercise.duration ? 'style="display: none;"' : ''}>
                <div id="timerDisplay">${exercise.duration ? formatTime(exercise.duration) : '00:00'}</div>
                <div class="timer-controls">
                    <button id="startTimer" onclick="window.startExerciseTimer(${exercise.duration})">Старт</button>
                    <button id="pauseTimer" onclick="window.toggleTimer()">Пауза</button>
                </div>
            </div>

            <div class="exercise-controls">
                <button class="primary-button" onclick="window.completeExercise()">
                    Завершить подход
                </button>
                ${state.currentSet > 1 ? `
                    <button class="secondary-button" onclick="window.previousSet()">
                        Предыдущий подход
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    console.log('Exercise rendered successfully');

    if (exercise.duration && state.isTimerMode) {
        window.startExerciseTimer(exercise.duration);
    }
}

export function completeSet() {
    const exercise = state.currentWorkout.exercises[state.currentExerciseIndex];
    clearTimers();

    if (state.currentSet < exercise.sets) {
        state.currentSet++;
        if (exercise.restBetweenSets) {
            startRestTimer(exercise.restBetweenSets);
        }
    } else {
        state.currentSet = 1;
        state.currentExerciseIndex++;
        
        if (state.currentExerciseIndex < state.currentWorkout.exercises.length) {
            const nextExercise = state.currentWorkout.exercises[state.currentExerciseIndex];
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
    if (state.currentSet > 1) {
        state.currentSet--;
        clearTimers();
        renderExercise();
    } else if (state.currentExerciseIndex > 0) {
        state.currentExerciseIndex--;
        const exercise = state.currentWorkout.exercises[state.currentExerciseIndex];
        state.currentSet = exercise.sets;
        clearTimers();
        renderExercise();
    }
}

// Функция завершения упражнения
export function completeExercise() {
    const exercise = state.currentWorkout.exercises[state.currentExerciseIndex];
    clearTimers();

    // Если это последний подход
    if (state.currentSet >= exercise.sets) {
        state.currentSet = 1;
        state.currentExerciseIndex++;
        
        // Если есть следующее упражнение
        if (state.currentExerciseIndex < state.currentWorkout.exercises.length) {
            const nextExercise = state.currentWorkout.exercises[state.currentExerciseIndex];
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
        state.currentSet++;
        if (exercise.restBetweenSets) {
            startRestTimer(exercise.restBetweenSets);
        }
        renderExercise();
    }
    
    state.tg.HapticFeedback.impactOccurred('medium');
}

// Функция перехода к предыдущему упражнению
export function prevExercise() {
    if (state.currentExerciseIndex > 0) {
        state.currentExerciseIndex--;
        state.currentSet = 1;
        clearTimers();
        renderExercise();
        state.tg.HapticFeedback.impactOccurred('light');
    }
}

// Функция перехода к следующему упражнению
export function nextExercise() {
    if (state.currentExerciseIndex < state.currentWorkout.exercises.length - 1) {
        state.currentExerciseIndex++;
        state.currentSet = 1;
        clearTimers();
        renderExercise();
        state.tg.HapticFeedback.impactOccurred('light');
    }
} 