import { showError } from './utils.js';
import calendarModule from './calendar.js';
import profileModule from './profile.js';
import statisticsModule from './statistics.js';
import programsModule from './programs.js';
import workoutsModule from './workouts.js';
import uiManager from './ui-manager.js';
import { programDataManager } from './program-data.js';

// Глобальные переменные
let tg;
let mainButton;
let backButton;

// Инициализация Telegram WebApp
function initializeTelegramWebApp() {
    if (!window.Telegram?.WebApp) {
        throw new Error('Telegram WebApp не доступен');
    }
    
    tg = window.Telegram.WebApp;
    window.tg = tg;
    mainButton = tg.MainButton;
    backButton = tg.BackButton;
    window.mainButton = mainButton;
    window.backButton = backButton;
    
    tg.expand();
    tg.enableClosingConfirmation();
}

// Обработчик начала программы
async function handleProgramStart(programId) {
    console.log('Starting program:', programId);
    
    const program = programDataManager.getProgramById(programId);
    if (!program) {
        console.error('Программа не найдена:', programId);
        showError('Программа не найдена');
        return;
    }

    try {
        const profileData = await profileModule.getProfile();
        if (!profileData) {
            showError('Пожалуйста, заполните профиль перед началом программы');
            uiManager.switchTab('profile');
            return;
        }

        if (!program.workouts?.length) {
            showError('В программе нет тренировок');
            return;
        }

        programsModule.renderProgramWorkouts(program);
        tg.HapticFeedback.impactOccurred('medium');
    } catch (error) {
        console.error('Ошибка при запуске программы:', error);
        showError(error.message);
        tg.HapticFeedback.notificationOccurred('error');
    }
}

// Обработчик закрытия попапа
function setupPopupHandler() {
    tg.onEvent('popupClosed', async (event) => {
        console.log('Popup closed with event:', event);
        
        if (!event?.button_id) return;

        if (event.button_id === 'quit_workout') {
            workoutsModule.finishWorkout();
        } else if (event.button_id.startsWith('start_program_')) {
            const programId = event.button_id.replace('start_program_', '');
            await handleProgramStart(programId);
        }
    });
}

// Инициализация глобальных функций
function initializeGlobalFunctions() {
    window.startWorkout = workoutsModule.startWorkout.bind(workoutsModule);
    window.showProgramDetails = programsModule.showProgramDetails.bind(programsModule);
    window.renderProgramWorkouts = programsModule.renderProgramWorkouts.bind(programsModule);
    window.switchTab = uiManager.switchTab.bind(uiManager);
    window.renderProgramCards = uiManager.renderProgramCards.bind(uiManager);
}

// Функция инициализации приложения
async function initializeApp() {
    try {
        // Инициализируем Telegram WebApp
        initializeTelegramWebApp();
        
        // Инициализируем глобальные функции
        initializeGlobalFunctions();
        
        // Настраиваем обработчик попапов
        setupPopupHandler();

        // Загружаем программы
        await programsModule.initializeDefaultPrograms();
        
        // Настраиваем обработчики событий
        uiManager.setupEventListeners();
        
        // Показываем начальный экран
        uiManager.renderProgramCards();
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Ошибка при инициализации приложения: ' + error.message);
        
        // Пытаемся показать ошибку в интерфейсе Telegram
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.showAlert('Произошла ошибка при запуске приложения. Пожалуйста, попробуйте позже.');
        }
    }
}

// Запускаем инициализацию при загрузке
document.addEventListener('DOMContentLoaded', initializeApp); 