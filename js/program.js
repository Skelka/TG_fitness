// Функции для работы с программами тренировок
import { getStorageItem, setStorageItem } from './storage.js';
import { showNotification, showError, showPopupSafe } from './ui.js';
import { getDifficultyText } from './utils.js';

export async function initializeProgram(program) {
    try {
        // Получаем данные профиля
        const profileData = await getStorageItem('profile')
            .then(data => data ? JSON.parse(data) : null);

        if (!profileData) {
            throw new Error('Необходимо заполнить профиль перед началом программы');
        }

        // Генерируем план тренировок
        const workouts = await generateWorkoutPlan(program, profileData);
        if (!workouts) {
            throw new Error('Не удалось сгенерировать план тренировок');
        }

        // Создаем новую структуру активной программы
        const activeProgram = {
            ...program,
            startDate: Date.now(),
            workouts: workouts.map(w => ({
                ...w,
                completed: false,
                started: false
            }))
        };

        // Сохраняем программу
        await setStorageItem('activeProgram', JSON.stringify(activeProgram));
        
        console.log('Инициализирована программа:', activeProgram);
        
        return activeProgram;
    } catch (error) {
        console.error('Ошибка при инициализации программы:', error);
        throw error;
    }
}

export async function loadActiveProgram() {
    try {
        return await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);
    } catch (error) {
        console.error('Ошибка при загрузке активной программы:', error);
        return null;
    }
}

export async function updateProgramProgress(workout, isCompleted) {
    try {
        // Получаем текущую статистику
        const stats = await getStorageItem('workoutStats')
            .then(data => data ? JSON.parse(data) : {
                totalWorkouts: 0,
                totalCalories: 0,
                totalMinutes: 0,
                completedWorkouts: []
            });

        if (isCompleted) {
            // Обновляем статистику
            stats.totalWorkouts++;
            stats.totalCalories += workout.calories;
            stats.totalMinutes += workout.duration;
            stats.completedWorkouts.push({
                date: Date.now(),
                programId: workout.programId,
                workout: workout
            });

            // Сохраняем обновленную статистику
            await setStorageItem('workoutStats', JSON.stringify(stats));

            // Проверяем завершение программы
            const activeProgram = await getStorageItem('activeProgram')
                .then(data => data ? JSON.parse(data) : null);

            if (activeProgram) {
                const allWorkouts = activeProgram.workouts.length;
                const completed = activeProgram.workouts.filter(w => w.completed).length;

                if (completed === allWorkouts) {
                    // Программа завершена
                    await showPopupSafe({
                        title: 'Поздравляем! 🎉',
                        message: 'Вы успешно завершили программу тренировок!',
                        buttons: [{
                            type: 'default',
                            text: 'Отлично!'
                        }]
                    });

                    // Очищаем активную программу
                    await setStorageItem('activeProgram', '');
                }
            }
        }
    } catch (error) {
        console.error('Ошибка при обновлении прогресса:', error);
    }
}

export async function showProgramDetails(program) {
    const resultsInfo = program.results
        .map(result => `✅ ${result}`)
        .join('\n');

    await showPopupSafe({
        title: program.name,
        message: `${program.description}\n\n${program.workoutsPerWeek} тр/нед • ${getDifficultyText(program.difficulty)}\n\nДлительность: ${program.duration} недель`,
        buttons: [
            {
                id: `start_program_${program.id}`,
                type: 'default',
                text: 'Начать программу'
            },
            {
                id: `schedule_${program.id}`,
                type: 'default',
                text: 'Расписание'
            }
        ]
    });
}

export async function showProgramSchedule(programId) {
    const program = window.programData[programId];
    if (!program) return;

    // Форматируем расписание в более читаемый вид
    const scheduleMessage = formatScheduleMessage(program);

    await showPopupSafe({
        title: 'Расписание тренировок',
        message: scheduleMessage,
        buttons: [
            {
                type: 'default',
                text: '⬅️ Назад',
                id: `back_to_main_${programId}`
            },
            {
                type: 'default',
                text: 'Начать программу',
                id: `start_program_${programId}`
            }
        ]
    });
}

function formatScheduleMessage(program) {
    return `📅 График тренировок:\n\n` +
           `• ${program.workoutsPerWeek} тренировок в неделю\n` +
           `• Длительность программы: ${program.duration} недель\n\n` +
           `🎯 Рекомендуемые дни:\n` +
           program.workouts.map((workout, index) => 
               `День ${index + 1}: ${workout.name} (${workout.duration} мин)`
           ).join('\n');
}

async function generateWorkoutPlan(program, profile) {
    // Здесь должна быть логика генерации плана тренировок
    // на основе программы и профиля пользователя
    return program.workouts;
} 