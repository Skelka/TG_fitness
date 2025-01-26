import { tg } from './globals.js';
import { getStorageItem, setStorageItem } from './storage.js';
import { showNotification, showPopupSafe } from './ui.js';

let currentWorkout = null;
let currentExerciseIndex = 0;
let workoutTimer = null;
let restTimer = null;

export async function startWorkout(programId, workoutId) {
    try {
        const program = await getStorageItem('activeProgram')
            .then(data => JSON.parse(data));
            
        if (!program) {
            throw new Error('Программа не найдена');
        }

        const workout = program.workouts.find(w => w.id === workoutId);
        if (!workout) {
            throw new Error('Тренировка не найдена');
        }

        currentWorkout = workout;
        currentExerciseIndex = 0;

        // Отображаем первое упражнение
        await renderExercise(workout.exercises[0], 0, workout.exercises.length);

    } catch (error) {
        console.error('Ошибка при старте тренировки:', error);
        showNotification('Ошибка при старте тренировки', true);
    }
}

export async function completeWorkout() {
    try {
        if (!currentWorkout) return;

        // Обновляем статус тренировки
        const program = await getStorageItem('activeProgram')
            .then(data => JSON.parse(data));

        if (program) {
            const workoutIndex = program.workouts.findIndex(w => w.id === currentWorkout.id);
            if (workoutIndex !== -1) {
                program.workouts[workoutIndex].completed = true;
                await setStorageItem('activeProgram', JSON.stringify(program));
            }
        }

        // Обновляем статистику
        const stats = await getStorageItem('workoutStats')
            .then(data => data ? JSON.parse(data) : {
                totalWorkouts: 0,
                totalCalories: 0,
                totalMinutes: 0,
                completedWorkouts: []
            });

        stats.totalWorkouts++;
        stats.totalCalories += currentWorkout.calories || 0;
        stats.totalMinutes += currentWorkout.duration || 0;
        stats.completedWorkouts.push({
            date: Date.now(),
            programId: program.id,
            workout: currentWorkout
        });

        await setStorageItem('workoutStats', JSON.stringify(stats));

        // Показываем уведомление о завершении
        showNotification('Тренировка завершена!');
        tg.HapticFeedback.notificationOccurred('success');

        // Очищаем текущую тренировку
        currentWorkout = null;
        currentExerciseIndex = 0;
        clearTimers();

    } catch (error) {
        console.error('Ошибка при завершении тренировки:', error);
        showNotification('Ошибка при завершении тренировки', true);
    }
}

function clearTimers() {
    if (workoutTimer) clearInterval(workoutTimer);
    if (restTimer) clearInterval(restTimer);
    workoutTimer = null;
    restTimer = null;
}

async function renderExercise(exercise, index, total) {
    const container = document.querySelector('.workout-container');
    if (!container) return;

    const progress = ((index + 1) / total) * 100;

    container.innerHTML = `
        <div class="exercise-card">
            <div class="exercise-header">
                <h2>${exercise.name}</h2>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="exercise-progress">${index + 1} / ${total}</div>
            </div>
            <div class="exercise-details">
                <div class="exercise-sets">
                    ${exercise.sets}×${exercise.reps} ${exercise.weight ? `(${exercise.weight}кг)` : ''}
                </div>
                ${exercise.rest ? `
                <div class="rest-time">
                    Отдых: ${exercise.rest}с
                </div>
                ` : ''}
            </div>
            <div class="exercise-controls">
                <button class="control-btn" onclick="previousExercise()" ${index === 0 ? 'disabled' : ''}>
                    <span class="material-symbols-rounded">arrow_back</span>
                </button>
                <button class="control-btn complete" onclick="completeExercise()">
                    <span class="material-symbols-rounded">check</span>
                </button>
                <button class="control-btn" onclick="nextExercise()" ${index === total - 1 ? 'disabled' : ''}>
                    <span class="material-symbols-rounded">arrow_forward</span>
                </button>
            </div>
        </div>
    `;
}

export function previousExercise() {
    if (currentExerciseIndex > 0) {
        currentExerciseIndex--;
        renderExercise(currentWorkout.exercises[currentExerciseIndex], currentExerciseIndex, currentWorkout.exercises.length);
    }
}

export function nextExercise() {
    if (currentExerciseIndex < currentWorkout.exercises.length - 1) {
        currentExerciseIndex++;
        renderExercise(currentWorkout.exercises[currentExerciseIndex], currentExerciseIndex, currentWorkout.exercises.length);
    }
} 