import { getStorageItem, setStorageItem, showPopupSafe, showError } from './utils.js';
import statisticsModule from './statistics.js';

// Глобальные переменные для тренировок
let currentWorkout = null;
let currentExerciseIndex = 0;
let currentSet = 1;
let isResting = false;
let restTimeLeft = 0;
let workoutStartTime = null;

// Таймеры
let timerInterval = null;
let restInterval = null;
let workoutTimer = null;
let restTimer = null;
let exerciseTimer = null;
let isTimerPaused = false;

// Функция для отображения текущего упражнения
async function renderExercise() {
    if (!currentWorkout || !currentWorkout.exercises) {
        showError('Ошибка: данные тренировки не загружены');
        return;
    }

    const exercise = currentWorkout.exercises[currentExerciseIndex];
    if (!exercise) {
        showError('Ошибка: упражнение не найдено');
        return;
    }

    const container = document.querySelector('.container');
    if (!container) return;

    // Вычисляем прогресс тренировки
    const totalExercises = currentWorkout.exercises.length;
    const progress = Math.round((currentExerciseIndex / (totalExercises - 1)) * 100);

    container.innerHTML = `
        <div class="workout-header">
            <h2>${currentWorkout.name}</h2>
            <div class="workout-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <span>${currentExerciseIndex + 1}/${totalExercises}</span>
            </div>
            <button class="close-btn" onclick="confirmQuitWorkout()">
                <span class="material-symbols-rounded">close</span>
            </button>
        </div>
        <div class="exercise-container">
            <div class="exercise-header">
                <div class="exercise-type">
                    <span class="material-symbols-rounded">
                        ${getExerciseIcon(exercise.type)}
                    </span>
                    <span>${getExerciseTypeText(exercise.type)}</span>
                </div>
                <h3>${exercise.name}</h3>
                <p class="exercise-description">${exercise.description || ''}</p>
            </div>
            ${exercise.image ? `<img src="${exercise.image}" alt="${exercise.name}" class="exercise-image">` : ''}
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
                        <span>${exercise.duration} сек</span>
                    </div>
                ` : ''}
            </div>
            <div class="exercise-controls">
                ${currentExerciseIndex > 0 ? `
                    <button onclick="previousExercise()" class="secondary-btn">
                        <span class="material-symbols-rounded">arrow_back</span>
                        Назад
                    </button>
                ` : ''}
                <button onclick="completeExercise()" class="primary-btn">
                    ${currentExerciseIndex === currentWorkout.exercises.length - 1 ? 'Завершить тренировку' : 'Следующее упражнение'}
                </button>
            </div>
        </div>
    `;
}

// Функция для запуска тренировки
async function startWorkout(programId, workoutId) {
    try {
        const program = window.programData.find(p => p.id === programId);
        if (!program) throw new Error('Программа не найдена');
        
        const workout = program.workouts.find(w => w.id === workoutId);
        if (!workout) throw new Error('Тренировка не найдена');
        
        currentWorkout = workout;
        currentExerciseIndex = 0;
        
        document.querySelector('.container').innerHTML = '<div class="workout-session"><div class="workout-content"></div></div>';
        renderExercise(workout.exercises[0], 0, workout.exercises.length);
    } catch (error) {
        console.error('Ошибка при запуске тренировки:', error);
        window.showNotification(error.message, true);
    }
}

// Функция для перехода к предыдущему упражнению
function previousExercise() {
    if (!currentWorkout || currentExerciseIndex <= 0) return;
    currentExerciseIndex--;
    renderExercise(currentWorkout.exercises[currentExerciseIndex], currentExerciseIndex, currentWorkout.exercises.length);
    if (window.tg) {
        window.tg.HapticFeedback.notificationOccurred('medium');
    }
}

// Функция для перехода к следующему упражнению
function nextExercise() {
    if (!currentWorkout || currentExerciseIndex >= currentWorkout.exercises.length - 1) return;
    currentExerciseIndex++;
    renderExercise(currentWorkout.exercises[currentExerciseIndex], currentExerciseIndex, currentWorkout.exercises.length);
    if (window.tg) {
        window.tg.HapticFeedback.notificationOccurred('medium');
    }
}

// Функция для подтверждения выхода из тренировки
async function confirmQuitWorkout() {
    const result = await showPopupSafe({
        title: 'Завершить тренировку?',
        message: 'Вы уверены, что хотите завершить тренировку? Прогресс будет потерян.',
        buttons: [
            {
                id: 'quit_workout',
                type: 'destructive',
                text: 'Завершить'
            },
            {
                type: 'cancel',
                text: 'Продолжить тренировку'
            }
        ]
    });

    if (result && result.button_id === 'quit_workout') {
        clearTimers();
        renderProgramCards();
        document.querySelector('.bottom-nav')?.classList.remove('hidden');
        if (window.tg) {
            window.tg.HapticFeedback.notificationOccurred('warning');
        }
    }
}

// Функция для завершения упражнения
async function completeExercise() {
    if (!currentWorkout || !currentWorkout.exercises) return;

    const exercise = currentWorkout.exercises[currentExerciseIndex];
    if (!exercise) return;

    // Очищаем таймеры текущего упражнения
    if (exerciseTimer) clearInterval(exerciseTimer);

    // Если это последнее упражнение
    if (currentExerciseIndex === currentWorkout.exercises.length - 1) {
        await completeWorkout();
    } else {
        // Показываем уведомление
        window.showNotification('Упражнение завершено!');
        if (window.tg) {
            window.tg.HapticFeedback.notificationOccurred('success');
        }

        // Запускаем таймер отдыха
        const restTime = exercise.rest || 60;
        startRestTimer(restTime);

        // Автоматически переходим к следующему упражнению после отдыха
        setTimeout(() => {
            nextExercise();
        }, restTime * 1000);
    }
}

// Функция для завершения тренировки
async function completeWorkout() {
    try {
        if (!currentWorkout) return;

        // Обновляем статистику
        await statisticsModule.updateStatistics({
            duration: currentWorkout.duration,
            calories: currentWorkout.calories
        });

        // Очищаем таймеры
        clearTimers();

        // Показываем уведомление
        window.showNotification('Тренировка завершена!');
        if (window.tg) {
            window.tg.HapticFeedback.notificationOccurred('success');
        }

        // Возвращаемся к списку программ
        renderProgramCards();
        document.querySelector('.bottom-nav')?.classList.remove('hidden');

    } catch (error) {
        console.error('Ошибка при завершении тренировки:', error);
        showError('Не удалось завершить тренировку');
    }
}

// Вспомогательные функции
function getExerciseIcon(type) {
    const icons = {
        'warmup': 'directions_run',
        'strength': 'fitness_center',
        'cardio': 'directions_run',
        'hiit': 'timer',
        'core': 'sports_martial_arts',
        'cooldown': 'self_improvement',
        'stretch': 'sports_gymnastics',
        'breathing': 'air',
        'static': 'accessibility_new',
        'functional': 'exercise'
    };
    return icons[type] || 'fitness_center';
}

function getExerciseTypeText(type) {
    const types = {
        'warmup': 'Разминка',
        'strength': 'Силовое',
        'cardio': 'Кардио',
        'hiit': 'ВИИТ',
        'core': 'Пресс',
        'cooldown': 'Заминка',
        'stretch': 'Растяжка',
        'breathing': 'Дыхательное',
        'static': 'Статика',
        'functional': 'Функциональное'
    };
    return types[type] || type;
}

function getMuscleGroupsText(groups) {
    const translations = {
        'legs': 'Ноги',
        'back': 'Спина',
        'chest': 'Грудь',
        'shoulders': 'Плечи',
        'arms': 'Руки',
        'core': 'Пресс',
        'full_body': 'Все тело',
        'cardio': 'Кардио'
    };
    return Array.isArray(groups) ? groups.map(group => translations[group] || group).join(', ') : '';
}

// Функция для очистки всех таймеров
function clearTimers() {
    [timerInterval, restInterval, workoutTimer, restTimer, exerciseTimer].forEach(timer => {
        if (timer) clearInterval(timer);
    });
    timerInterval = restInterval = workoutTimer = restTimer = exerciseTimer = null;
}

// Функция для запуска таймера отдыха
function startRestTimer(duration) {
    restTimeLeft = duration;
    if (restTimer) clearInterval(restTimer);
    
    restTimer = setInterval(() => {
        if (restTimeLeft > 0) {
            restTimeLeft--;
            // Обновляем отображение таймера
            const timerDisplay = document.querySelector('.rest-timer');
            if (timerDisplay) {
                timerDisplay.textContent = `${Math.floor(restTimeLeft / 60)}:${(restTimeLeft % 60).toString().padStart(2, '0')}`;
            }
        } else {
            clearInterval(restTimer);
            restTimer = null;
        }
    }, 1000);
}

// Экспортируем функции для использования в других модулях
const workoutsModule = {
    startWorkout,
    renderExercise,
    previousExercise,
    nextExercise,
    completeExercise,
    completeWorkout,
    confirmQuitWorkout,
    clearTimers,
    getCurrentWorkout: () => currentWorkout,
    getCurrentExerciseIndex: () => currentExerciseIndex
};

// Делаем некоторые функции доступными глобально
window.previousExercise = previousExercise;
window.nextExercise = nextExercise;
window.completeExercise = completeExercise;
window.confirmQuitWorkout = confirmQuitWorkout;

export default workoutsModule; 