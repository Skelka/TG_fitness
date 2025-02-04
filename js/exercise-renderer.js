import { formatTime, showError, showNotification } from './utils.js';
import { programDataManager } from './program-data.js';

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
    
    // Создаем экран отдыха
    const restScreen = document.createElement('div');
    restScreen.className = 'rest-screen';
    restScreen.innerHTML = `
        <div class="rest-icon">
            <span class="material-symbols-rounded">timer</span>
        </div>
        <h3>Отдых</h3>
        <div class="rest-subtitle">Следующий подход через</div>
        <div class="rest-timer" id="restTimer">${formatTime(duration)}</div>
        <div class="rest-progress">
            <div class="rest-progress-bar" style="width: 100%"></div>
        </div>
        <button class="skip-rest-btn" onclick="window.skipRest()">
            <span class="material-symbols-rounded">skip_next</span>
            Пропустить
        </button>
    `;
    document.body.appendChild(restScreen);
    
    // Обновляем прогресс-бар
    const progressBar = restScreen.querySelector('.rest-progress-bar');
    const timer = restScreen.querySelector('.rest-timer');
    const startTime = duration;
    
    restTimer = setInterval(() => {
        window.restTimeLeft--;
        const progress = (window.restTimeLeft / startTime) * 100;
        progressBar.style.width = `${progress}%`;
        timer.textContent = formatTime(window.restTimeLeft);
        
        // Добавляем эффект мигания в конце отдыха
        if (window.restTimeLeft <= 3) {
            timer.classList.add('ending');
        }
        
        if (window.restTimeLeft <= 0) {
            clearInterval(restTimer);
            window.isResting = false;
            restScreen.remove();
            showNotification('Отдых завершен!', 'success');
            window.tg.HapticFeedback.notificationOccurred('success');
            renderExercise();
        }
    }, 1000);
}

export function skipRest() {
    if (window.isResting) {
        clearInterval(restTimer);
        window.isResting = false;
        const restScreen = document.querySelector('.rest-screen');
        if (restScreen) {
            restScreen.remove();
        }
        showNotification('Отдых пропущен');
        window.tg.HapticFeedback.impactOccurred('medium');
        renderExercise();
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

// Функция для проверки, является ли текущее упражнение последним
export function isLastExercise() {
    const state = getState();
    return state.currentExerciseIndex === state.currentWorkout.exercises.length - 1;
}

// Функция для отображения текущего упражнения
export function renderExercise() {
    const mainContainer = document.querySelector('#mainContainer');
    if (!mainContainer || !window.currentWorkout) return;

    const exercise = window.currentWorkout.exercises[window.currentExerciseIndex];
    if (!exercise) return;

    mainContainer.innerHTML = `
        <div class="exercise-screen">
            <div class="exercise-header">
                <h1 class="exercise-title">${exercise.name}</h1>
                <p class="exercise-subtitle">Подход ${window.currentSet} из ${exercise.sets || 1}</p>
            </div>
            
            <div class="exercise-content">
                <div class="exercise-info">
                    ${exercise.type === 'cardio' || exercise.type === 'static' ? `
                        <div class="info-card">
                            <span class="material-symbols-rounded">timer</span>
                            <strong>${exercise.duration} сек</strong>
                        </div>
                    ` : `
                        <div class="info-card">
                            <span class="material-symbols-rounded">repeat</span>
                            <strong>${exercise.reps} повт.</strong>
                        </div>
                    `}
                    <div class="info-card">
                        <span class="material-symbols-rounded">fitness_center</span>
                        <strong>${getExerciseTypeText(exercise.type)}</strong>
                    </div>
                </div>

                <div class="exercise-description">
                    ${exercise.description || 'Описание отсутствует'}
                </div>

                ${exercise.type === 'cardio' || exercise.type === 'static' ? `
                    <div class="exercise-timer">
                        <div class="timer-value" id="exercise-timer">
                            ${formatTime(exercise.duration)}
                        </div>
                        <div class="timer-label">
                            Осталось времени
                        </div>
                    </div>
                ` : ''}
            </div>

            <div class="exercise-controls">
                ${window.currentExerciseIndex > 0 ? `
                    <button class="control-btn secondary" onclick="prevExercise()">
                        <span class="material-symbols-rounded">arrow_back</span>
                        Назад
                    </button>
                ` : ''}
                <button class="control-btn" onclick="completeExercise()">
                    ${isLastExercise() ? 'Завершить' : 'Далее'}
                    <span class="material-symbols-rounded">
                        ${isLastExercise() ? 'done' : 'arrow_forward'}
                    </span>
                </button>
            </div>
        </div>
    `;

    // Запускаем таймер для кардио или статических упражнений
    if (exercise.type === 'cardio' || exercise.type === 'static') {
        startExerciseTimer(exercise.duration);
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
    const state = getState();
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
            } else {
                renderExercise();
            }
        } else {
            // Тренировка завершена
            finishWorkout();
        }
    } else {
        // Переходим к следующему подходу
        state.currentSet++;
        if (exercise.restBetweenSets) {
            startRestTimer(exercise.restBetweenSets);
        } else {
            renderExercise();
        }
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

// Функция завершения тренировки
export function finishWorkout() {
    clearTimers();
    
    // Создаем экран завершения
    const mainContainer = document.querySelector('.workout-session');
    if (!mainContainer) return;

    const state = getState();
    const workout = state.currentWorkout;
    const workoutDuration = Math.floor((Date.now() - window.workoutStartTime) / 60000); // в минутах
    
    mainContainer.innerHTML = `
        <div class="workout-complete">
            <div class="complete-icon">
                <span class="material-symbols-rounded">check_circle</span>
            </div>
            <h2>Тренировка завершена!</h2>
            <div class="workout-stats">
                <div class="stat-item">
                    <div class="stat-value">${workout.exercises.length}</div>
                    <div class="stat-label">упражнений</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${workoutDuration}</div>
                    <div class="stat-label">минут</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${workout.exercises.reduce((total, ex) => total + (ex.sets || 1), 0)}</div>
                    <div class="stat-label">подходов</div>
                </div>
            </div>
            <button class="finish-btn" onclick="window.finishAndReturn()">
                <span class="material-symbols-rounded">home</span>
                Вернуться к программе
            </button>
        </div>
    `;

    // Показываем нижнюю навигацию
    document.querySelector('.bottom-nav')?.classList.remove('hidden');

    // Добавляем тактильный отклик
    state.tg.HapticFeedback.notificationOccurred('success');
}

// Функция возврата к программе
export function finishAndReturn() {
    const state = getState();
    const program = window.programData.find(p => p.id === state.currentWorkout.programId);
    if (program) {
        renderProgramWorkouts(program);
    } else {
        renderProgramCards();
    }
}

// Делаем функцию глобальной
window.finishAndReturn = finishAndReturn;
window.completeExercise = completeExercise; 