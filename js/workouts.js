import { getStorageItem, setStorageItem, showError, showNotification, formatTime } from './utils.js';
import { renderExercise, clearTimers } from './exercise-renderer.js';
import { programDataManager } from './program-data-manager.js';

const workoutsModule = {
    // Запуск тренировки
    async startWorkout(programId, workoutId) {
        try {
            console.log('Starting workout with programId:', programId, 'workoutId:', workoutId);

            const workout = programDataManager.getWorkoutById(programId, workoutId);
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
            window.isResting = false;
            window.restTimeLeft = 0;
            window.workoutStartTime = Date.now();

            // Очищаем таймеры
            clearTimers();

            // Скрываем нижнюю навигацию
            document.querySelector('.bottom-nav')?.classList.add('hidden');

            // Инициализируем обработчик выхода
            this.initExitHandler();

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
    },

    // Инициализация обработчика выхода
    initExitHandler() {
        // Показываем кнопку "Назад"
        window.tg.BackButton.show();
        
        // Обработчик нажатия кнопки "Назад"
        window.tg.BackButton.onClick(() => {
            this.confirmQuitWorkout();
        });
        
        // Обработчик закрытия приложения
        window.tg.onEvent('viewportChanged', ({ isStateStable }) => {
            if (!isStateStable) {
                this.confirmQuitWorkout();
            }
        });
    },

    // Подтверждение выхода из тренировки
    async confirmQuitWorkout() {
        const result = await window.tg.showConfirm('Вы уверены, что хотите прервать тренировку?');
        if (result) {
            clearTimers();
            document.querySelector('.bottom-nav')?.classList.remove('hidden');
            window.tg.BackButton.hide();
            window.currentWorkout = null;
            window.currentExerciseIndex = 0;
            window.currentSet = 1;
        }
    },

    // Завершение тренировки
    async finishWorkout() {
        clearTimers();
        
        // Обновляем статистику
        const workoutDuration = Math.floor((Date.now() - window.workoutStartTime) / 60000); // в минутах
        const stats = {
            date: new Date().toISOString(),
            programId: window.currentWorkout.programId,
            workoutId: window.currentWorkout.id,
            duration: workoutDuration,
            exercises: window.currentWorkout.exercises.length,
            completed: true
        };

        // Получаем текущую статистику
        const currentStats = await getStorageItem('workoutStats')
            .then(data => data ? JSON.parse(data) : { workouts: [] });
        
        currentStats.workouts = currentStats.workouts || [];
        currentStats.workouts.push(stats);
        
        // Сохраняем обновленную статистику
        await setStorageItem('workoutStats', JSON.stringify(currentStats));

        // Показываем поздравление
        await window.tg.showPopup({
            title: 'Поздравляем! 🎉',
            message: `Тренировка завершена!\n\nДлительность: ${formatTime(workoutDuration)}\nУпражнений: ${window.currentWorkout.exercises.length}`,
            buttons: [{
                type: 'default',
                text: 'Отлично!'
            }]
        });

        // Возвращаемся к списку тренировок
        document.querySelector('.bottom-nav')?.classList.remove('hidden');
        window.renderProgramCards();
    }
};

export default workoutsModule; 