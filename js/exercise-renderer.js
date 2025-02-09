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
    exercise.completedSets = exercise.completedSets || [];
    exercise.currentReps = exercise.currentReps || exercise.reps || 10;

    mainContainer.innerHTML = `
        <div class="exercise-screen">
            <div class="exercise-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(state.currentExerciseIndex / totalExercises) * 100}%"></div>
                </div>
                <div class="progress-text">
                    Тренировка ${state.currentExerciseIndex + 1} из ${totalExercises}
                </div>
            </div>

            <div class="exercise-header">
                <h1 class="exercise-title">${exercise.name}</h1>
                <div class="exercise-subtitle">${getExerciseTypeText(exercise.type)} • ${getMuscleGroupsText(exercise.muscleGroups)}</div>
            </div>
            
            <div class="exercise-content">
                <div class="exercise-animation">
                    <img src="${getExerciseAnimation(exercise.name)}" alt="${exercise.name}" class="exercise-gif">
                </div>

                <div class="reps-counter">
                    <button class="reps-btn" id="decreaseReps">-</button>
                    <div class="reps-count" id="repsCount">${exercise.currentReps}</div>
                    <button class="reps-btn" id="increaseReps">+</button>
                </div>

                <div class="sets-grid">
                    ${Array.from({length: exercise.sets || 5}, (_, i) => `
                        <div class="set-box ${exercise.completedSets.includes(i) ? 'completed' : ''}" data-set="${i}">
                            <div class="set-reps">${exercise.completedSets.includes(i) ? exercise.completedSets[i]?.reps || exercise.currentReps : exercise.currentReps}</div>
                            <div class="set-label">Готово</div>
                        </div>
                    `).join('')}
                </div>

                <div class="exercise-description">
                    <h3>Как выполнять</h3>
                    <p>${exercise.description || 'Описание отсутствует'}</p>
                </div>
            </div>
        </div>
    `;

    // Обработчики для кнопок изменения количества повторений
    const decreaseBtn = document.querySelector('#decreaseReps');
    const increaseBtn = document.querySelector('#increaseReps');
    const repsCount = document.querySelector('#repsCount');

    if (decreaseBtn && increaseBtn && repsCount) {
        decreaseBtn.addEventListener('click', () => {
            if (exercise.currentReps > 1) {
                exercise.currentReps--;
                repsCount.textContent = exercise.currentReps;
                window.tg.HapticFeedback.impactOccurred('light');
            }
        });

        increaseBtn.addEventListener('click', () => {
            exercise.currentReps++;
            repsCount.textContent = exercise.currentReps;
            window.tg.HapticFeedback.impactOccurred('light');
        });
    }

    // Обработчики для отметки выполненных подходов
    const setBoxes = document.querySelectorAll('.set-box');
    setBoxes.forEach(box => {
        box.addEventListener('click', () => {
            const setIndex = parseInt(box.dataset.set);
            if (!exercise.completedSets.includes(setIndex)) {
                exercise.completedSets.push(setIndex);
                box.classList.add('completed');
                window.tg.HapticFeedback.notificationOccurred('success');

                // Сохраняем количество повторений для этого подхода
                exercise.completedSets[setIndex] = {
                    reps: exercise.currentReps,
                    timestamp: Date.now()
                };

                // Если все подходы выполнены, переходим к следующему упражнению
                if (exercise.completedSets.length === (exercise.sets || 5)) {
                    setTimeout(() => {
                        nextExercise();
                    }, 500);
                }
            }
        });
    });
}

// Функция для перехода к следующему упражнению
export function nextExercise() {
    const isLastExercise = state.currentExerciseIndex === state.currentWorkout.exercises.length - 1;

    if (!isLastExercise) {
        // Переходим к следующему упражнению
        state.currentExerciseIndex++;
        window.currentExerciseIndex = state.currentExerciseIndex;
        
        // Сбрасываем состояние для нового упражнения
        const nextExercise = state.currentWorkout.exercises[state.currentExerciseIndex];
        nextExercise.completedSets = [];
        nextExercise.currentReps = nextExercise.reps || 10;
        
        renderExercise();
    } else {
        // Завершаем тренировку
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