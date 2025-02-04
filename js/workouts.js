import { getStorageItem, setStorageItem, showError, showNotification, formatTime } from './utils.js';
import { 
    renderExercise, 
    clearTimers, 
    state as exerciseState,
    initState as initExerciseState 
} from './exercise-renderer.js';
import { programDataManager } from './program-data.js';
import programsModule from './programs.js';

// Состояние тренировки
const workoutState = {
    currentWorkout: null,
    currentExerciseIndex: 0,
    currentSet: 1,
    workoutStartTime: null,
    isActive: false
};

const workoutsModule = {
    // Инициализация модуля
    init() {
        // Делаем состояние доступным глобально
        window.workoutState = workoutState;
        
        // Добавляем глобальные функции для обратной совместимости
        window.startWorkout = this.startWorkout.bind(this);
        window.currentWorkout = null;
        window.currentExerciseIndex = 0;
        window.currentSet = 1;
    },

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

            // Обновляем состояние
            workoutState.currentWorkout = {
                ...workout,
                programId: programId
            };
            workoutState.currentExerciseIndex = 0;
            workoutState.currentSet = 1;
            workoutState.workoutStartTime = Date.now();
            workoutState.isActive = true;

            // Обновляем глобальные переменные для обратной совместимости
            window.currentWorkout = workoutState.currentWorkout;
            window.currentExerciseIndex = workoutState.currentExerciseIndex;
            window.currentSet = workoutState.currentSet;

            // Очищаем таймеры и инициализируем состояние упражнения
            clearTimers();
            initExerciseState();

            // Скрываем нижнюю навигацию
            document.querySelector('.bottom-nav')?.classList.add('hidden');

            // Инициализируем обработчик выхода
            this.initExitHandler();

            console.log('Starting workout with:', workoutState.currentWorkout);

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
            if (!isStateStable && workoutState.isActive) {
                this.confirmQuitWorkout();
            }
        });
    },

    // Подтверждение выхода из тренировки
    async confirmQuitWorkout() {
        const result = await window.tg.showConfirm('Вы уверены, что хотите прервать тренировку?');
        if (result) {
            this.resetWorkout();
        }
    },

    // Сброс состояния тренировки
    resetWorkout() {
        clearTimers();
        document.querySelector('.bottom-nav')?.classList.remove('hidden');
        window.tg.BackButton.hide();
        
        // Сбрасываем состояние
        workoutState.currentWorkout = null;
        workoutState.currentExerciseIndex = 0;
        workoutState.currentSet = 1;
        workoutState.isActive = false;
        
        // Обновляем глобальные переменные
        window.currentWorkout = null;
        window.currentExerciseIndex = 0;
        window.currentSet = 1;
    },

    // Завершение тренировки
    async finishWorkout() {
        if (!workoutState.isActive) return;
        
        clearTimers();
        
        // Обновляем статистику
        const workoutDuration = Math.floor((Date.now() - workoutState.workoutStartTime) / 60000); // в минутах
        const stats = {
            date: new Date().toISOString(),
            programId: workoutState.currentWorkout.programId,
            workoutId: workoutState.currentWorkout.id,
            duration: workoutDuration,
            exercises: workoutState.currentWorkout.exercises.length,
            completed: true
        };

        try {
            // Получаем текущую статистику
            const currentStats = await getStorageItem('workoutStats')
                .then(data => data ? JSON.parse(data) : { workouts: [] });
            
            currentStats.workouts = currentStats.workouts || [];
            currentStats.workouts.push(stats);
            
            // Сохраняем обновленную статистику
            await setStorageItem('workoutStats', JSON.stringify(currentStats));

            // Обновляем прогресс программы
            await programDataManager.updateProgramProgress(workoutState.currentWorkout.id);

            // Показываем поздравление
            await window.tg.showPopup({
                title: 'Поздравляем! 🎉',
                message: `Тренировка завершена!\n\nДлительность: ${formatTime(workoutDuration)}\nУпражнений: ${workoutState.currentWorkout.exercises.length}`,
                buttons: [{
                    type: 'default',
                    text: 'Отлично!'
                }]
            });

            // Сбрасываем состояние
            this.resetWorkout();

            // Возвращаемся к списку тренировок программы
            const program = programDataManager.getProgramById(stats.programId);
            if (program) {
                programsModule.renderProgramWorkouts(program);
            } else {
                window.renderProgramCards();
            }
        } catch (error) {
            console.error('Ошибка при завершении тренировки:', error);
            showError('Не удалось сохранить результаты тренировки');
        }
    }
};

// Инициализируем модуль
workoutsModule.init();

export default workoutsModule; 