// Функции для работы с тренировками
import { showNotification, showError, showPopupSafe } from './ui.js';
import { clearTimers } from './utils.js';
import { getExerciseTypeText, getMuscleGroupsText, formatTime } from './utils.js';
import { updateProgramProgress } from './program.js';
import { getStorageItem } from './storage.js';
import { programs } from './data/programs.js';

let currentWorkout = null;
let currentExerciseIndex = 0;
let exerciseTimer = null;
let restTimer = null;

export async function startWorkout(programId, workoutId) {
    try {
        const program = programs[programId];
        if (!program) throw new Error('Программа не найдена');
        
        const workout = program.workouts.find(w => w.id === workoutId);
        if (!workout) throw new Error('Тренировка не найдена');
        
        currentWorkout = workout;
        currentExerciseIndex = 0;
        
        document.querySelector('.container').innerHTML = '<div class="workout-session"><div class="workout-content"></div></div>';
        renderExercise(workout.exercises[0], 0, workout.exercises.length);
    } catch (error) {
        console.error('Ошибка при запуске тренировки:', error);
        showNotification(error.message, true);
    }
}

export function previousExercise() {
    if (!currentWorkout || currentExerciseIndex <= 0) return;
    currentExerciseIndex--;
    renderExercise(currentWorkout.exercises[currentExerciseIndex], currentExerciseIndex, currentWorkout.exercises.length);
    if (window.tg?.HapticFeedback) {
        window.tg.HapticFeedback.notificationOccurred('medium');
    }
}

export function nextExercise() {
    if (!currentWorkout || currentExerciseIndex >= currentWorkout.exercises.length - 1) return;
    currentExerciseIndex++;
    renderExercise(currentWorkout.exercises[currentExerciseIndex], currentExerciseIndex, currentWorkout.exercises.length);
    if (window.tg?.HapticFeedback) {
        window.tg.HapticFeedback.notificationOccurred('medium');
    }
}

export async function confirmQuitWorkout() {
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
        if (window.tg?.HapticFeedback) {
            window.tg.HapticFeedback.notificationOccurred('warning');
        }
    }
}

export async function completeExercise() {
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
        showNotification('Упражнение завершено!');
        if (window.tg?.HapticFeedback) {
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

export function completeWorkout() {
    const container = document.querySelector('.workout-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="workout-complete">
            <div class="complete-icon">
                <span class="material-symbols-rounded">task_alt</span>
            </div>
            <h2>Тренировка завершена!</h2>
            <div class="workout-stats">
                <div class="stat-item">
                    <div class="stat-value">${currentWorkout.exercises.length}</div>
                    <div class="stat-label">Упражнений</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${Math.floor(currentWorkout.duration / 60)}</div>
                    <div class="stat-label">Минут</div>
                </div>
            </div>
            <button class="finish-btn" onclick="closeWorkout()">
                <span class="material-symbols-rounded">home</span>
                Вернуться
            </button>
        </div>
    `;
    
    saveWorkoutProgress(currentWorkout.id);
    showNotification('Отличная работа! Тренировка завершена!');
}

export function closeWorkout() {
    clearTimers();
    currentWorkout = null;
    currentExerciseIndex = 0;
    showTab('programs');
    if (window.tg?.HapticFeedback) {
        window.tg.HapticFeedback.notificationOccurred('medium');
    }
}

export function saveWorkoutProgress(workoutId) {
    try {
        let progress = JSON.parse(localStorage.getItem('workoutProgress') || '{}');
        progress[workoutId] = {
            completed: true,
            completedAt: new Date().toISOString()
        };
        localStorage.setItem('workoutProgress', JSON.stringify(progress));
        updateProgramProgress(currentWorkout, true);
    } catch (error) {
        console.error('Ошибка при сохранении прогресса:', error);
    }
}

export async function renderExercise(exercise, index, total) {
    const container = document.querySelector('.workout-content');
    if (!container || !exercise) return;

    clearTimers();

    const progress = ((index + 1) / total) * 100;
    
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
                    ${getExerciseTypeText(exercise.type)}
                </div>
                
                ${exercise.sets ? `
                    <div class="sets-info">
                        <span class="material-symbols-rounded">repeat</span>
                        ${exercise.sets} подхода
                    </div>
                ` : ''}
                
                ${exercise.reps ? `
                    <div class="reps-info">
                        <span class="material-symbols-rounded">fitness_center</span>
                        ${exercise.reps} повторений
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
                        ${getMuscleGroupsText(exercise.muscleGroups)}
                    </div>
                ` : ''}
            </div>
            
            ${exercise.sequence ? `
                <div class="exercise-sequence">
                    <h3>Последовательность:</h3>
                    <ol>
                        ${exercise.sequence.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
            ` : ''}
            
            <div class="exercise-controls">
                <button class="control-btn prev" onclick="previousExercise()" ${index === 0 ? 'disabled' : ''}>
                    <span class="material-symbols-rounded">arrow_back</span>
                </button>
                <button class="control-btn complete" onclick="completeExercise()">
                    <span class="material-symbols-rounded">check</span>
                </button>
                <button class="control-btn next" onclick="nextExercise()" ${index === total - 1 ? 'disabled' : ''}>
                    <span class="material-symbols-rounded">arrow_forward</span>
                </button>
            </div>
        </div>
    `;

    if (exercise.duration) {
        startExerciseTimer(exercise.duration);
    }
}

export function startExerciseTimer(duration) {
    const timerElement = document.querySelector('.timer');
    if (!timerElement) return;

    let timeLeft = duration;
    updateTimerDisplay(timeLeft);

    exerciseTimer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay(timeLeft);

        if (timeLeft <= 0) {
            clearInterval(exerciseTimer);
            completeExercise();
        }
    }, 1000);
}

export function startRestTimer(duration) {
    const restTimerElement = document.createElement('div');
    restTimerElement.className = 'rest-timer';
    restTimerElement.innerHTML = `
        <h3>Отдых</h3>
        <div class="timer">${formatTime(duration)}</div>
        <button class="skip-rest-btn" onclick="skipRest()">
            <span class="material-symbols-rounded">skip_next</span>
            Пропустить
        </button>
    `;
    
    document.body.appendChild(restTimerElement);

    let timeLeft = duration;
    restTimer = setInterval(() => {
        timeLeft--;
        
        const timerDisplay = restTimerElement.querySelector('.timer');
        if (timerDisplay) {
            timerDisplay.textContent = formatTime(timeLeft);
        }
        
        if (timeLeft <= 0) {
            clearInterval(restTimer);
            restTimerElement.remove();
            showNotification('Отдых завершен!');
            if (window.tg?.HapticFeedback) {
                window.tg.HapticFeedback.notificationOccurred('success');
            }
        }
    }, 1000);
}

export function skipRest() {
    clearInterval(restTimer);
    document.querySelector('.rest-timer')?.remove();
    showNotification('Отдых пропущен');
    if (window.tg?.HapticFeedback) {
        window.tg.HapticFeedback.notificationOccurred('medium');
    }
}

function updateTimerDisplay(seconds) {
    const timerElement = document.querySelector('.timer');
    if (timerElement) {
        timerElement.textContent = formatTime(seconds);
    }
}

function getExerciseIcon(type) {
    const icons = {
        'cardio': 'directions_run',
        'strength': 'fitness_center',
        'hiit': 'timer',
        'yoga': 'self_improvement',
        'stretching': 'sports_martial_arts',
        'warmup': 'accessibility_new',
        'cooldown': 'accessibility',
        'circuit': 'loop',
        'cardio_strength': 'sprint',
        'general': 'sports_score'
    };
    return icons[type] || 'fitness_center';
}

export async function renderWorkouts() {
    try {
        const container = document.querySelector('.programs-list');
        if (!container) return;

        // Получаем активную программу
        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);

        if (activeProgram) {
            // Если есть активная программа, показываем её тренировки
            container.innerHTML = `
                <div class="active-program">
                    <h2>${activeProgram.title}</h2>
                    <div class="workouts-list">
                        ${activeProgram.workouts.map((workout, index) => `
                            <div class="workout-card ${workout.completed ? 'completed' : ''}">
                                <div class="workout-header">
                                    <span class="workout-day">День ${index + 1}</span>
                                    ${workout.completed ? '<span class="completed-badge">✓</span>' : ''}
                                </div>
                                <h3>${workout.title}</h3>
                                <div class="workout-meta">
                                    <span>
                                        <span class="material-symbols-rounded">timer</span>
                                        ${Math.round(workout.duration)} мин
                                    </span>
                                    <span>
                                        <span class="material-symbols-rounded">local_fire_department</span>
                                        ${workout.calories} ккал
                                    </span>
                                </div>
                                <button class="start-workout-btn" onclick="startWorkout('${activeProgram.id}', '${workout.id}')">
                                    <span class="material-symbols-rounded">play_arrow</span>
                                    Начать
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            // Если нет активной программы, показываем список доступных программ
            container.innerHTML = `
                <div class="programs-grid">
                    ${Object.values(programs).map(program => `
                        <div class="program-card">
                            <div class="program-icon">
                                <span class="material-symbols-rounded">${program.icon}</span>
                            </div>
                            <div class="program-content">
                                <h3>${program.title}</h3>
                                <p>${program.description}</p>
                                <div class="program-meta">
                                    <span>
                                        <span class="material-symbols-rounded">calendar_month</span>
                                        ${program.duration}
                                    </span>
                                    <span>
                                        <span class="material-symbols-rounded">exercise</span>
                                        ${program.schedule}
                                    </span>
                                </div>
                            </div>
                            <div class="program-actions">
                                <button class="info-btn" onclick="showProgramDetails('${program.id}')">
                                    <span class="material-symbols-rounded">info</span>
                                    Подробнее
                                </button>
                                <button class="start-btn" onclick="initializeProgram('${program.id}')">
                                    <span class="material-symbols-rounded">play_arrow</span>
                                    Начать
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка при отображении тренировок:', error);
        showError('Не удалось загрузить тренировки');
    }
} 