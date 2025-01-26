// Основной файл приложения
import { getStorageItem, setStorageItem, clearAllData } from './storage.js';
import { showNotification, showError, showPopupSafe, switchTab } from './ui.js';
import { renderCalendar, updateCalendar } from './calendar.js';
import { renderStatistics } from './statistics.js';
import { loadProfile, saveProfile, setupProfileEquipmentHandlers } from './profile.js';
import { 
    startWorkout, 
    previousExercise, 
    nextExercise, 
    confirmQuitWorkout,
    completeExercise,
    completeWorkout,
    closeWorkout,
    skipRest
} from './workout.js';
import {
    initializeProgram,
    loadActiveProgram,
    updateProgramProgress,
    showProgramDetails,
    showProgramSchedule
} from './program.js';

// Глобальные переменные
window.currentProgramId = null;

// Инициализация приложения
async function initApp() {
    try {
        // Настраиваем Telegram WebApp
        tg.expand();
        tg.enableClosingConfirmation();

        // Загружаем активную программу
        const activeProgram = await loadActiveProgram();
        if (activeProgram) {
            window.currentProgramId = activeProgram.id;
        }

        // Устанавливаем обработчики событий
        setupEventListeners();
        
        // Загружаем профиль
        await loadProfile();

        // Показываем начальный экран
        switchTab('programs');

    } catch (error) {
        console.error('Ошибка при инициализации приложения:', error);
        showError('Не удалось инициализировать приложение');
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчики вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
            tg.HapticFeedback.impactOccurred('light');
        });
    });

    // Обработчики для кнопок периода в статистике
    const periodButtons = document.querySelectorAll('.period-btn');
    periodButtons.forEach(button => {
        button.addEventListener('click', async () => {
            periodButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            await renderStatistics(button.dataset.period);
            tg.HapticFeedback.impactOccurred('light');
        });
    });

    // Обработчики для полей профиля
    const profileInputs = document.querySelectorAll('#profile-form input');
    profileInputs.forEach(input => {
        input.addEventListener('change', async () => {
            await saveProfile();
        tg.HapticFeedback.impactOccurred('light');
        });
    });

    // Обработчик для формы профиля
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveProfile();
        });
    }

    // Обработчики для оборудования в профиле
    setupProfileEquipmentHandlers();

    // Обработчик закрытия попапа
tg.onEvent('popupClosed', async (event) => {
    console.log('Popup closed with event:', event);
    
    if (!event || !event.button_id) return;

    if (event.button_id === 'quit_workout') {
            closeWorkout();
    } else if (event.button_id.startsWith('start_program_')) {
            const programId = event.button_id.replace('start_program_', '');
        const program = window.programData.find(p => p.id === programId);
        
        if (!program) {
            console.error('Программа не найдена:', programId);
            showError('Программа не найдена');
            return;
        }

        try {
            await initializeProgram(program);
                showNotification('Программа успешно запущена!');
                switchTab('programs');
        } catch (error) {
                showError(error.message);
            }
        } else if (event.button_id.startsWith('start_workout_')) {
            const [_, __, programId, workoutId] = event.button_id.split('_');
            startWorkout(programId, workoutId);
            } else {
                const [action, ...params] = event.button_id.split('_');
                switch(action) {
                    case 'results':
                    showProgramDetails(params[0]);
                        break;
                    case 'schedule':
                        showProgramSchedule(params[0]);
                        break;
                    case 'back':
                        showProgramDetails(params[0]);
                        break;
            }
        }
    });
}

// Экспортируем глобальные функции
window.startWorkout = startWorkout;
window.previousExercise = previousExercise;
window.nextExercise = nextExercise;
window.confirmQuitWorkout = confirmQuitWorkout;
window.completeExercise = completeExercise;
window.completeWorkout = completeWorkout;
window.closeWorkout = closeWorkout;
window.skipRest = skipRest;
window.clearAllData = clearAllData;

// Запускаем приложение
document.addEventListener('DOMContentLoaded', initApp);