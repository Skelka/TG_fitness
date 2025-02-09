import { formatTime, showError, showNotification } from './utils.js';
import { programDataManager } from './program-data.js';
import { getExerciseAnimation } from './exercises-animations.js';
import workoutsModule from './workouts.js';

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
        <button class="skip-rest-btn" id="skipRestBtn">
            <span class="material-symbols-rounded">skip_next</span>
            Пропустить
        </button>
    `;

    // Добавляем обработчик для кнопки пропуска
    const skipButton = restScreen.querySelector('#skipRestBtn');
    if (skipButton) {
        skipButton.addEventListener('click', skipRest);
    }

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
    const isLastExercise = state.currentExerciseIndex === totalExercises - 1;

    mainContainer.innerHTML = `
        <div class="exercise-screen">
            <div class="exercise-header">
                <div class="exercise-title">${exercise.name}</div>
                <div class="exercise-subtitle">Упражнение ${state.currentExerciseIndex + 1} из ${totalExercises}</div>
            </div>
            
            <div class="exercise-content">
                <div class="exercise-animation">
                    <img src="${getExerciseAnimation(exercise.name)}" alt="${exercise.name}" class="exercise-gif">
                </div>

                <div class="sets-counter">
                    <div class="sets-label">Количество подходов</div>
                    <div class="sets-controls">
                        <button class="sets-adjust" onclick="window.adjustSets(-1)">-</button>
                        <div class="sets-display">
                            <div class="sets-count">${exercise.sets || 1}</div>
                            <div class="sets-text">подходов</div>
                        </div>
                        <button class="sets-adjust" onclick="window.adjustSets(1)">+</button>
                    </div>
                </div>

                <button class="complete-set" onclick="window.completeSet()">
                    <span class="complete-text">Готово</span>
                </button>
            </div>

            <div class="exercise-controls">
                <button class="control-btn next-exercise" onclick="window.nextExercise()">
                    <span class="material-symbols-rounded">skip_next</span>
                    ${isLastExercise ? 'Завершить тренировку' : 'Следующее упражнение'}
                </button>
            </div>
        </div>
    `;

    // Обновляем состояние кнопки "Готово"
    updateCompleteButton();
}

// Функция для изменения количества подходов
export function adjustSets(change) {
    initState();
    const exercise = state.currentWorkout.exercises[state.currentExerciseIndex];
    if (!exercise) return;

    exercise.sets = Math.max(1, (exercise.sets || 1) + change);
    exercise.completedSets = exercise.completedSets || 0;
    
    // Обновляем отображение
    const setsCount = document.querySelector('.sets-count');
    if (setsCount) {
        setsCount.textContent = exercise.sets;
    }
    
    // Обновляем состояние кнопки
    updateCompleteButton();
}

// Функция для отметки выполнения подхода
export function completeSet() {
    initState();
    const exercise = state.currentWorkout.exercises[state.currentExerciseIndex];
    if (!exercise) return;

    exercise.completedSets = (exercise.completedSets || 0) + 1;
    
    if (exercise.completedSets >= exercise.sets) {
        exercise.completedSets = 0; // Сбрасываем счетчик
        nextExercise();
    } else {
        // Обновляем состояние кнопки
        updateCompleteButton();
        // Добавляем тактильный отклик
        window.tg.HapticFeedback.impactOccurred('medium');
    }
}

// Функция для обновления состояния кнопки "Готово"
function updateCompleteButton() {
    const exercise = state.currentWorkout.exercises[state.currentExerciseIndex];
    const completeButton = document.querySelector('.complete-set');
    
    if (completeButton && exercise) {
        const isCompleted = (exercise.completedSets || 0) > 0;
        completeButton.classList.toggle('done', isCompleted);
        completeButton.querySelector('.complete-text').textContent = 
            isCompleted ? `${exercise.completedSets}/${exercise.sets}` : 'Готово';
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
        workoutsModule.finishWorkout();
    }
}

// Экспортируем вспомогательные функции
export {
    createRestScreen,
    updateRestTimerUI,
    finishRest
};

// Инициализируем глобальные функции после их объявления
window.skipRest = skipRest;
window.toggleTimer = toggleTimer;
window.nextExercise = nextExercise;
window.startRestTimer = startRestTimer;
window.exerciseState = state;
window.adjustSets = adjustSets;
window.completeSet = completeSet; 