import { formatTime, showError, showNotification } from './utils.js';
import { programDataManager } from './program-data.js';
import { getExerciseAnimation } from './exercises-animations.js';

// Состояние приложения
export const state = {
    currentWorkout: null,
    currentExerciseIndex: 0,
    currentSet: 1,
    isResting: false,
    restTimeLeft: 0,
    isTimerMode: false,
    isTimerPaused: false,
    exerciseTimer: null,
    restTimer: null
};

// Инициализация состояния из глобальных переменных
export function initState() {
    state.currentWorkout = window.currentWorkout;
    state.currentExerciseIndex = window.currentExerciseIndex;
    state.currentSet = window.currentSet;
    state.isResting = window.isResting;
    state.restTimeLeft = window.restTimeLeft;
    state.isTimerMode = window.isTimerMode;
    state.isTimerPaused = window.isTimerPaused;
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
export function clearTimers() {
    if (state.exerciseTimer) {
        clearInterval(state.exerciseTimer);
        state.exerciseTimer = null;
    }
    if (state.restTimer) {
        clearInterval(state.restTimer);
        state.restTimer = null;
    }
    state.isTimerMode = false;
    state.isTimerPaused = false;
    state.isResting = false;
    state.restTimeLeft = 0;
}

export function startExerciseTimer(duration) {
    clearTimers();
    state.isTimerMode = true;
    state.isTimerPaused = false;
    
    let timeLeft = duration;
    updateTimerDisplay(timeLeft);
    
    state.exerciseTimer = setInterval(() => {
        if (!state.isTimerPaused) {
            timeLeft--;
            updateTimerDisplay(timeLeft);
            
            if (timeLeft <= 0) {
                clearInterval(state.exerciseTimer);
                showNotification('Время вышло!', 'success');
                window.tg.HapticFeedback.notificationOccurred('success');
                renderExercise();
            }
        }
    }, 1000);
}

export function toggleTimer() {
    state.isTimerPaused = !state.isTimerPaused;
    const pauseButton = document.querySelector('#pauseTimer');
    if (pauseButton) {
        pauseButton.textContent = state.isTimerPaused ? 'Продолжить' : 'Пауза';
    }
    showNotification(state.isTimerPaused ? 'Таймер на паузе' : 'Таймер запущен');
}

export function updateTimerDisplay(seconds) {
    const timerDisplay = document.querySelector('#timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = formatTime(seconds);
    }
}

export function startRestTimer(duration) {
    clearTimers();
    state.isResting = true;
    state.restTimeLeft = duration;
    
    const restScreen = createRestScreen(duration);
    document.body.appendChild(restScreen);
    
    const progressBar = restScreen.querySelector('.rest-progress-bar');
    const timer = restScreen.querySelector('.rest-timer');
    const startTime = duration;
    
    state.restTimer = setInterval(() => {
        state.restTimeLeft--;
        updateRestTimerUI(progressBar, timer, startTime);
        
        if (state.restTimeLeft <= 0) {
            finishRest(restScreen);
        }
    }, 1000);
}

function createRestScreen(duration) {
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
    return restScreen;
}

function updateRestTimerUI(progressBar, timer, startTime) {
    const progress = (state.restTimeLeft / startTime) * 100;
    progressBar.style.width = `${progress}%`;
    timer.textContent = formatTime(state.restTimeLeft);
    
    if (state.restTimeLeft <= 3) {
        timer.classList.add('ending');
    }
}

function finishRest(restScreen) {
    clearInterval(state.restTimer);
    state.isResting = false;
    restScreen.remove();
    showNotification('Отдых завершен!', 'success');
    window.tg.HapticFeedback.notificationOccurred('success');
    renderExercise();
}

export function skipRest() {
    if (state.isResting) {
        clearInterval(state.restTimer);
        state.isResting = false;
        const restScreen = document.querySelector('.rest-screen');
        if (restScreen) {
            restScreen.remove();
        }
        showNotification('Отдых пропущен');
        window.tg.HapticFeedback.impactOccurred('medium');
        renderExercise();
    }
}

// Функция для проверки, является ли текущее упражнение последним
export function isLastExercise() {
    initState();
    return state.currentExerciseIndex === state.currentWorkout.exercises.length - 1;
}

// Функция для отображения текущего упражнения
export function renderExercise() {
    initState();
    const mainContainer = document.querySelector('#mainContainer');
    if (!mainContainer || !state.currentWorkout) return;

    const exercise = state.currentWorkout.exercises[state.currentExerciseIndex];
    if (!exercise) return;

    const totalExercises = state.currentWorkout.exercises.length;
    const isLastSet = state.currentSet === (exercise.sets || 1);
    const isLastExercise = state.currentExerciseIndex === totalExercises - 1;

    mainContainer.innerHTML = `
        <div class="exercise-screen">
            <div class="exercise-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(state.currentExerciseIndex / totalExercises) * 100}%"></div>
                </div>
                <div class="progress-text">
                    Упражнение ${state.currentExerciseIndex + 1} из ${totalExercises}
                </div>
            </div>

            <div class="exercise-header">
                <h1 class="exercise-title">${exercise.name}</h1>
                <div class="exercise-sets">
                    <span class="material-symbols-rounded">repeat</span>
                    Подход ${state.currentSet} из ${exercise.sets || 1}
                </div>
            </div>
            
            <div class="exercise-content">
                <div class="exercise-animation">
                    <img src="${getExerciseAnimation(exercise.name)}" alt="${exercise.name}" class="exercise-gif">
                </div>

                <div class="exercise-info">
                    ${exercise.type === 'cardio' || exercise.type === 'static' ? `
                        <div class="info-card">
                            <span class="material-symbols-rounded">timer</span>
                            <strong>${exercise.duration} сек</strong>
                            <span>Время</span>
                        </div>
                    ` : `
                        <div class="info-card">
                            <span class="material-symbols-rounded">repeat</span>
                            <strong>${exercise.reps} повт.</strong>
                            <span>Повторений</span>
                        </div>
                    `}
                    <div class="info-card">
                        <span class="material-symbols-rounded">fitness_center</span>
                        <strong>${getExerciseTypeText(exercise.type)}</strong>
                        <span>Тип</span>
                    </div>
                    <div class="info-card">
                        <span class="material-symbols-rounded">sports_martial_arts</span>
                        <strong>${getMuscleGroupsText(exercise.muscleGroups)}</strong>
                        <span>Группы мышц</span>
                    </div>
                </div>

                <div class="exercise-description">
                    <h3>Как выполнять</h3>
                    <p>${exercise.description || 'Описание отсутствует'}</p>
                </div>

                ${exercise.type === 'cardio' || exercise.type === 'static' ? `
                    <div class="exercise-timer">
                        <div class="timer-display" id="timerDisplay">
                            ${formatTime(exercise.duration)}
                        </div>
                        <button class="timer-btn" id="pauseTimer" onclick="window.toggleTimer()">
                            <span class="material-symbols-rounded">pause</span>
                            Пауза
                        </button>
                    </div>
                ` : ''}

                <div class="exercise-controls">
                    ${!isLastSet ? `
                        <button class="control-btn next-set" onclick="window.startRestTimer(${exercise.restBetweenSets || 30})">
                            <span class="material-symbols-rounded">timer</span>
                            Следующий подход
                        </button>
                    ` : `
                        <button class="control-btn next-exercise" onclick="window.nextExercise()">
                            <span class="material-symbols-rounded">skip_next</span>
                            ${isLastExercise ? 'Завершить тренировку' : 'Следующее упражнение'}
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;

    // Запускаем таймер для упражнений с временным интервалом
    if (exercise.type === 'cardio' || exercise.type === 'static') {
        startExerciseTimer(exercise.duration);
    }
}

// Функция для перехода к следующему упражнению
export function nextExercise() {
    const exercise = state.currentWorkout.exercises[state.currentExerciseIndex];
    const isLastSet = state.currentSet === (exercise.sets || 1);
    const isLastExercise = state.currentExerciseIndex === state.currentWorkout.exercises.length - 1;

    if (!isLastSet) {
        // Если это не последний подход, увеличиваем счетчик подходов
        state.currentSet++;
        window.currentSet = state.currentSet;
        startRestTimer(exercise.restBetweenSets || 30);
    } else if (!isLastExercise) {
        // Если это последний подход, но не последнее упражнение
        state.currentExerciseIndex++;
        state.currentSet = 1;
        window.currentExerciseIndex = state.currentExerciseIndex;
        window.currentSet = state.currentSet;
        renderExercise();
    } else {
        // Если это последнее упражнение и последний подход
        window.workoutsModule.finishWorkout();
    }
}

// Добавляем функцию в глобальные
export function initGlobalFunctions() {
    window.skipRest = skipRest;
    window.toggleTimer = toggleTimer;
    window.nextExercise = nextExercise;
    window.exerciseState = state;
}

// Экспортируем вспомогательные функции
export {
    createRestScreen,
    updateRestTimerUI,
    finishRest
};

// Инициализируем глобальные функции
initGlobalFunctions(); 