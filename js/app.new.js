import { showError } from './utils.js';
import calendarModule from './calendar.js';
import profileModule from './profile.js';
import statisticsModule from './statistics.js';
import programsModule from './programs.js';
import workoutsModule from './workouts.js';
import uiManager from './ui-manager.js';
import { programDataManager } from './program-data.js';

// Глобальные переменные
window.tg = window.Telegram.WebApp;
window.mainButton = tg.MainButton;
window.backButton = tg.BackButton;

// Делаем функции глобальными
window.startWorkout = workoutsModule.startWorkout.bind(workoutsModule);
window.showProgramDetails = programsModule.showProgramDetails.bind(programsModule);
window.renderProgramWorkouts = programsModule.renderProgramWorkouts.bind(programsModule);
window.switchTab = uiManager.switchTab.bind(uiManager);
window.renderProgramCards = uiManager.renderProgramCards.bind(uiManager);

// Обработчик события закрытия попапа
tg.onEvent('popupClosed', async (event) => {
    console.log('Popup closed with event:', event);
    
    if (!event || !event.button_id) return;

    if (event.button_id === 'quit_workout') {
        workoutsModule.finishWorkout();
    } else if (event.button_id.startsWith('start_program_')) {
        const programId = event.button_id.replace('start_program_', '');
        console.log('Starting program:', programId);
        
        const program = programDataManager.getProgramById(programId);
        if (!program) {
            console.error('Программа не найдена:', programId);
            showError('Программа не найдена');
            return;
        }

        try {
            // Проверяем наличие профиля
            const profileData = await profileModule.getProfile();
            if (!profileData) {
                showError('Пожалуйста, заполните профиль перед началом программы');
                uiManager.switchTab('profile');
                return;
            }

            // Проверяем наличие тренировок
            if (!program.workouts || program.workouts.length === 0) {
                showError('В программе нет тренировок');
                return;
            }

            // Отображаем список тренировок программы
            programsModule.renderProgramWorkouts(program);

            // Добавляем тактильный отклик
            window.tg.HapticFeedback.impactOccurred('medium');
        } catch (error) {
            console.error('Ошибка при запуске программы:', error);
            showError(error.message);
            window.tg.HapticFeedback.notificationOccurred('error');
        }
    }
});

// Функция инициализации приложения
async function initializeApp() {
    try {
        // Инициализируем Telegram WebApp
        window.tg = window.Telegram.WebApp;
        tg.expand();
        tg.enableClosingConfirmation();

        // Загружаем программы
        await programsModule.initializeDefaultPrograms();
        
        // Настраиваем обработчики событий
        uiManager.setupEventListeners();
        
        // Показываем начальный экран
        uiManager.renderProgramCards();
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Ошибка при инициализации приложения');
    }
}

// Запускаем инициализацию при загрузке
document.addEventListener('DOMContentLoaded', initializeApp); 