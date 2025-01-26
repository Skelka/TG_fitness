// Функции для работы с программами тренировок
import { getStorageItem, setStorageItem } from './storage.js';
import { showNotification, showError, showPopupSafe } from './ui.js';
import { programs } from './data/programs.js';
import { getDifficultyText } from './utils.js';

export async function initializeProgram(programId) {
    try {
        const program = programs[programId];
        if (!program) {
            throw new Error('Программа не найдена');
        }

        // Сохраняем программу как активную
        await setStorageItem('activeProgram', JSON.stringify({
            id: program.id,
            title: program.title,
            workouts: program.workouts.map(w => ({
                ...w,
                completed: false
            }))
        }));

        showNotification('Программа успешно запущена!');
        return true;
    } catch (error) {
        console.error('Ошибка при инициализации программы:', error);
        showError('Не удалось запустить программу');
        return false;
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

export async function showProgramDetails(programId) {
    try {
        const program = programs[programId];
        if (!program) throw new Error('Программа не найдена');

        await showPopupSafe({
            title: program.title,
            message: `
                ${program.description}
                
                📅 Длительность: ${program.duration}
                🏋️‍♂️ График: ${program.schedule}
                💪 Сложность: ${getDifficultyText(program.difficulty)}
                
                Программа включает:
                ${program.workouts.slice(0, 3).map(w => `• ${w.title}`).join('\n')}
                ${program.workouts.length > 3 ? '\n... и другие тренировки' : ''}
            `,
            buttons: [
                {
                    id: `start_program_${program.id}`,
                    type: 'default',
                    text: 'Начать программу'
                },
                {
                    id: `schedule_${program.id}`,
                    type: 'default',
                    text: 'График тренировок'
                }
            ]
        });
    } catch (error) {
        console.error('Ошибка при показе деталей программы:', error);
        showError('Не удалось загрузить детали программы');
    }
}

export async function showProgramSchedule(programId) {
    try {
        const program = programs[programId];
        if (!program) throw new Error('Программа не найдена');

        await showPopupSafe({
            title: 'График тренировок',
            message: formatScheduleMessage(program),
            buttons: [
                {
                    id: `back_${program.id}`,
                    type: 'default',
                    text: 'Назад'
                }
            ]
        });
    } catch (error) {
        console.error('Ошибка при показе графика:', error);
        showError('Не удалось загрузить график');
    }
}

function formatScheduleMessage(program) {
    return `📅 График тренировок:\n\n` +
           `• ${program.schedule} тренировок в неделю\n` +
           `• Длительность программы: ${program.duration}\n\n` +
           `🎯 Рекомендуемые дни:\n` +
           program.workouts.map((workout, index) => 
               `День ${index + 1}: ${workout.title} (${workout.duration} мин)`
           ).join('\n');
}

function getDifficultyText(difficulty) {
    switch(difficulty) {
        case 'low': return 'Начальный';
        case 'medium': return 'Средний';
        case 'high': return 'Продвинутый';
        default: return 'Не указано';
    }
} 