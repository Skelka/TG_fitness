import { showError, showNotification } from './utils.js';
import { renderExercise } from './exercise-renderer.js';

// Глобальные переменные для тренировки
window.currentWorkout = null;
window.currentExerciseIndex = 0;
window.currentSet = 1;
window.workoutStartTime = null;

// Функция запуска тренировки
export async function startWorkout(programId, workoutId) {
    try {
        console.log('Starting workout with programId:', programId, 'workoutId:', workoutId);

        // Получаем данные программы
        const program = window.programData.find(p => p.id === programId);
        console.log('Found program:', program);
        
        if (!program) {
            throw new Error('Программа не найдена');
        }

        // Находим тренировку
        const workout = program.workouts.find(w => w.id === workoutId);
        console.log('Found workout:', workout);
        
        if (!workout) {
            throw new Error('Тренировка не найдена');
        }

        // Проверяем наличие упражнений
        console.log('Checking exercises:', workout.exercises);
        if (!workout.exercises || workout.exercises.length === 0) {
            throw new Error('В тренировке нет упражнений');
        }

        // Добавляем дополнительные данные к тренировке
        window.currentWorkout = {
            ...workout,
            programId: programId
        };

        // Инициализируем переменные тренировки
        window.currentExerciseIndex = 0;
        window.currentSet = 1;
        window.workoutStartTime = Date.now();

        // Скрываем нижнюю навигацию
        document.querySelector('.bottom-nav')?.classList.add('hidden');

        // Инициализируем обработчик выхода
        initExitHandler();

        console.log('Starting workout with:', window.currentWorkout);

        // Отображаем первое упражнение
        renderExercise();

        // Добавляем тактильный отклик
        window.tg.HapticFeedback.impactOccurred('medium');
    } catch (error) {
        console.error('Ошибка при запуске тренировки:', error);
        showError(error.message);
        window.tg.HapticFeedback.notificationOccurred('error');
    }
}

// Функция инициализации обработчика выхода
function initExitHandler() {
    // Показываем кнопку "Назад"
    window.tg.BackButton.show();
    
    // Обработчик нажатия кнопки "Назад"
    window.tg.BackButton.onClick(() => {
        confirmQuitWorkout();
    });
    
    // Обработчик закрытия приложения
    window.tg.onEvent('viewportChanged', ({ isStateStable }) => {
        if (!isStateStable) {
            confirmQuitWorkout();
        }
    });
}

// Функция подтверждения выхода из тренировки
async function confirmQuitWorkout() {
    await showPopupSafe({
        title: 'Завершить тренировку?',
        message: 'Прогресс текущей тренировки будет потерян',
        buttons: [
            {
                type: 'destructive',
                text: 'Завершить',
                id: 'quit_workout'
            },
            {
                type: 'cancel',
                text: 'Продолжить'
            }
        ]
    });
}

// Делаем функции глобальными
window.startWorkout = startWorkout; 