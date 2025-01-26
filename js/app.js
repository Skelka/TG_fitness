// Глобальные переменные
let tg = window.Telegram.WebApp;
let mainButton = tg.MainButton;
let backButton = tg.BackButton;
let currentWorkout = null;
let currentPeriod, weightChart;

// Переменные для тренировки
let isTimerMode = false;
let timerValue = 0;
let currentExerciseIndex = 0;
let currentSet = 1;
let isResting = false;
let restTimeLeft = 0;
let timerInterval = null;
let restInterval = null;
let workoutStartTime = null; // Добавляем переменную для отслеживания времени тренировки

// Функция для безопасного показа попапа
async function showPopupSafe(params) {
    const maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
        try {
            // Ограничиваем длину сообщения
            if (params.message && params.message.length > 200) {
                params.message = params.message.substring(0, 197) + '...';
            }
            
            return await new Promise((resolve) => {
                tg.showPopup(params, resolve);
            });
            } catch (error) {
            attempt++;
            if (attempt === maxAttempts) {
                console.error('Не удалось показать попап:', error);
                return null;
            }
            await new Promise(r => setTimeout(r, 100));
        }
    }
}

// Упрощаем обработчик закрытия попапа
tg.onEvent('popupClosed', async (event) => {
    console.log('Popup closed with event:', event);
    
    if (!event || !event.button_id) return;

    if (event.button_id === 'quit_workout') {
        clearTimers();
        renderProgramCards();
        document.querySelector('.bottom-nav')?.classList.remove('hidden');
    } else if (event.button_id.startsWith('start_program_')) {
        // Получаем правильный ID программы
            const programId = event.button_id.replace('start_program_', '');
        // Добавляем '_gain' для программы набора массы
        const fullProgramId = programId === 'muscle' ? 'muscle_gain' : programId;
        
        try {
            const program = window.programData[fullProgramId];
            if (!program) {
                throw new Error(`Программа с ID ${fullProgramId} не найдена`);
            }
            
            await initializeProgram(program);
            showProgramWorkouts(program);
            
        } catch (error) {
            console.error('Ошибка при запуске программы:', error);
            await showError('Не удалось начать программу. Попробуйте позже.');
        }
    }
});

// Добавляем функцию инициализации программы
async function initializeProgram(program) {
    try {
        // Проверяем, нет ли уже активной программы
        const existingProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);
            
        if (existingProgram) {
            // Если это та же программа, просто возвращаем её
            if (existingProgram.id === program.id) {
                return existingProgram;
            }
        }

        // Создаем новую структуру активной программы
        const activeProgram = {
            id: program.id, // Убеждаемся, что id берется из программы
            title: program.title,
            startDate: Date.now(),
            workouts: program.workouts.map(w => ({
                ...w,
                completed: false,
                started: false
            }))
        };

        // Сохраняем программу
        await setStorageItem('activeProgram', JSON.stringify(activeProgram));
        
        // Для отладки
        console.log('Инициализирована программа:', activeProgram);
        
        return activeProgram;
    } catch (error) {
        console.error('Ошибка при инициализации программы:', error);
        throw error;
    }
}

// Добавляем функцию для загрузки активной программы
async function loadActiveProgram() {
    try {
        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);
        
        if (activeProgram) {
            const program = window.programData[activeProgram.id];
            if (program) {
                // Показываем список тренировок активной программы
                showProgramWorkouts(program);
                return;
            }
        }
        
        // Если нет активной программы, показываем список всех программ
        renderProgramCards();
    } catch (error) {
        console.error('Ошибка при загрузке активной программы:', error);
        renderProgramCards();
    }
}

// Обновляем функцию initApp
function initApp() {
    try {
        console.log('Версия WebApp:', tg.version);
        console.log('Платформа:', tg.platform);
        console.log('Инициализация WebApp:', tg.initData);
        console.log('Доступные методы WebApp:', Object.keys(tg));

        // Инициализируем все обработчики
        setupEventListeners();
        setupPopupHandlers();
        setupProfileEquipmentHandlers();
        
        // Загружаем данные
        loadProfile();
        loadActiveProgram();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError('Произошла ошибка при загрузке приложения');
    }
}

// Обновляем обработчик DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Загруженные программы:', window.programData);
    console.log('Загруженная база упражнений:', window.exercisesDB);

    if (!window.programData) {
        console.error('Ошибка: данные программ не загружены');
        return;
    }

    if (!window.exercisesDB) {
        console.error('Ошибка: база упражнений не загружена');
        return;
    }

    initApp();
});

// Функции для работы с CloudStorage
async function getStorageItem(key) {
    return new Promise((resolve) => {
        if (!tg?.CloudStorage) {
            console.warn('CloudStorage не доступен, используем localStorage');
            resolve(localStorage.getItem(key));
            return;
        }

        tg.CloudStorage.getItem(key, (error, value) => {
            if (error) {
                console.warn(`Ошибка CloudStorage для ${key}:`, error);
                // Пробуем получить из localStorage как запасной вариант
                const localValue = localStorage.getItem(key);
                resolve(localValue);
            } else {
                // Сохраняем в localStorage для синхронизации
                if (value) localStorage.setItem(key, value);
                resolve(value);
            }
        });
    });
}

async function setStorageItem(key, value) {
    return new Promise((resolve) => {
        if (!tg?.CloudStorage) {
            console.warn('CloudStorage не доступен, используем localStorage');
            localStorage.setItem(key, value);
            resolve(true);
            return;
        }

        tg.CloudStorage.setItem(key, value, (error, success) => {
            if (error || !success) {
                console.warn(`Ошибка CloudStorage для ${key}:`, error);
                // Сохраняем в localStorage как запасной вариант
                localStorage.setItem(key, value);
                resolve(true);
            } else {
                // Синхронизируем с localStorage
                localStorage.setItem(key, value);
                resolve(success);
            }
        });
    });
}

// Обновляем функцию loadProfile
async function loadProfile() {
    try {
        // Загружаем фото профиля из Telegram
        const profilePhoto = document.getElementById('profile-photo');
        if (profilePhoto && tg.initDataUnsafe.user?.photo_url) {
            profilePhoto.src = tg.initDataUnsafe.user.photo_url;
        } else if (profilePhoto) {
            // Если фото нет, используем дефолтную иконку
            profilePhoto.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23999" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
        }

        // Загружаем имя пользователя
        const profileName = document.getElementById('profile-name');
        if (profileName && tg.initDataUnsafe.user?.first_name) {
            profileName.textContent = tg.initDataUnsafe.user.first_name;
        }

        // Загружаем сохраненные данные профиля
        const profileData = await getStorageItem('profile')
            .then(data => data ? JSON.parse(data) : null);

        if (profileData) {
            // Заполняем форму сохраненными данными
            Object.entries(profileData).forEach(([key, value]) => {
                const input = document.querySelector(`[name="${key}"]`);
                if (input) {
                    if (input.type === 'radio' || input.type === 'checkbox') {
                        const radioOrCheck = document.querySelector(`[name="${key}"][value="${value}"]`);
                        if (radioOrCheck) radioOrCheck.checked = true;
                    } else {
                        input.value = value;
                    }
                }
            });
        }
    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
    }
}

// Функция обновления статуса профиля
function updateProfileStatus(profile) {
    const statusElement = document.querySelector('.profile-status');
    if (!statusElement) return;

    // Определяем статус на основе заполненности профиля и активности
    let status = 'Новичок';
    if (profile.completedWorkouts > 20) {
        status = 'Продвинутый';
    } else if (profile.completedWorkouts > 5) {
        status = 'Опытный';
    }
    statusElement.textContent = status;
}

// Функция для показа уведомления
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Добавляем класс для анимации появления
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Удаляем уведомление через 3 секунды
        setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Обновляем функцию setupEventListeners
function setupEventListeners() {
    // Обработчики для вкладок
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            switchTab(tabName);
            tg.HapticFeedback.impactOccurred('light');
        });
    });

    // Обработчики для кнопок периода в статистике
    const periodButtons = document.querySelectorAll('.period-btn');
    periodButtons.forEach(button => {
        button.addEventListener('click', async () => {
            periodButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentPeriod = button.dataset.period;
            await updateWeightChart(currentPeriod);
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

    // Обработчики для чекбоксов
    setupCheckboxHandlers();

    // Обработчик для формы профиля
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveProfile();
        });
    }

    // Обработчик для кнопки очистки данных
    const clearDataBtn = document.querySelector('.danger-btn');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', async () => {
            const confirmed = await showPopupSafe({
                title: 'Подтверждение',
                message: 'Вы уверены, что хотите очистить все данные? Это действие нельзя отменить.',
                        buttons: [
                            {
                        type: 'destructive',
                        text: 'Очистить',
                        id: 'confirm_clear'
                    },
                    {
                        type: 'cancel',
                        text: 'Отмена'
                            }
                        ]
                    });

            if (confirmed && confirmed.button_id === 'confirm_clear') {
                await clearAllData();
                tg.HapticFeedback.notificationOccurred('success');
                location.reload();
            }
        });
    }
}

// Добавляем функцию setupCheckboxHandlers
function setupCheckboxHandlers() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            // Вибрация при изменении
            tg.HapticFeedback.impactOccurred('light');
            
            // Если это чекбокс оборудования, сохраняем изменения
            if (checkbox.name === 'equipment') {
                saveProfileSettings();
            }
        });
    });
}

// Добавляем функцию для сохранения настроек профиля
async function saveProfileSettings() {
    try {
        const equipmentInputs = document.querySelectorAll('input[name="equipment"]:checked');
        const placeButtons = document.querySelectorAll('.place-btn.active');
        
        const profileData = await getStorageItem('profile')
            .then(data => data ? JSON.parse(data) : {});
        
        profileData.equipment = Array.from(equipmentInputs).map(input => input.value);
        profileData.workoutPlaces = Array.from(placeButtons).map(btn => btn.dataset.place);
        
        await setStorageItem('profile', JSON.stringify(profileData));
    } catch (error) {
        console.error('Ошибка при сохранении настроек:', error);
        showError('Не удалось сохранить настройки');
    }
}

// Добавляем константы для типов программ
const PROGRAM_TYPES = {
    weight_loss: {
        restBetweenSets: 45,
        restBetweenExercises: 60,
        minWarmupTime: 300, // 5 минут
        showCalories: true,
        hapticFeedback: 'medium',
        motivationalMessages: [
            'Каждая тренировка приближает вас к цели!',
            'Сжигаем калории!',
            'Отличная работа!'
        ]
    },
    muscle_gain: {
        restBetweenSets: 90,
        restBetweenExercises: 120,
        minWarmupTime: 240, // 4 минуты
        showWeight: true,
        hapticFeedback: 'heavy',
        motivationalMessages: [
            'Становимся сильнее!',
            'Работаем на массу!',
            'Мощная тренировка!'
        ]
    },
    endurance: {
        restBetweenSets: 30,
        restBetweenExercises: 45,
        minWarmupTime: 360, // 6 минут
        showHeartRate: true,
        hapticFeedback: 'light',
        motivationalMessages: [
            'Развиваем выносливость!',
            'Держим темп!',
            'Отличный прогресс!'
        ]
    }
};

// Обновляем функцию startWorkout
async function startWorkout(workout, programId) {
    console.log('Начинаем тренировку:', workout, 'ID программы:', programId);
    
    try {
        if (!workout || !workout.exercises || workout.exercises.length === 0) {
            throw new Error('Некорректные данные тренировки');
        }

        // Сохраняем данные текущей тренировки
        currentWorkout = workout;
        currentProgramId = programId;
        currentExerciseIndex = 0;
        currentSet = 1;
        workoutStartTime = Date.now();

        // Очищаем все таймеры
        clearTimers();

        // Скрываем нижнюю навигацию
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.classList.add('hidden');

        // Получаем активную программу
        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);
        
        if (activeProgram && activeProgram.workouts) {
            const workoutIndex = activeProgram.workouts.findIndex(w => 
                w.day === workout.day && w.title === workout.title);
            
            if (workoutIndex !== -1) {
                activeProgram.workouts[workoutIndex].started = true;
                await setStorageItem('activeProgram', JSON.stringify(activeProgram));
            }
        }

        // Показываем первое упражнение
        await renderExercise();

        // Вибрация при начале тренировки
        tg.HapticFeedback.impactOccurred('medium');

    } catch (error) {
        console.error('Ошибка при запуске тренировки:', error);
        await showError('Не удалось начать тренировку');
    }
}

// Основная логика выполнения тренировки переносится в отдельную функцию
function startWorkoutExecution(workout) {
    currentWorkout = workout;
    
    if (!workout || !workout.exercises || !workout.exercises.length) {
        console.error('Некорректные данные тренировки:', workout);
        return;
    }

    // Сбрасываем все переменные
    currentExerciseIndex = 0;
    currentSet = 1;
    isResting = false;
    restTimeLeft = 0;
    workoutStartTime = Date.now(); // Запоминаем время начала тренировки
    
    // Очищаем все таймеры
    clearInterval(timerInterval);
    clearInterval(restInterval);
    timerInterval = null;
    restInterval = null;

    const container = document.querySelector('.container');
    if (!container) return;

    // Скрываем нижнюю навигацию
    document.querySelector('.bottom-nav')?.classList.add('hidden');

    // Инициализируем обработчик выхода
    initExitHandler();

    // Отображаем первое упражнение
    renderExercise();
}

// Функция показа деталей тренировки
function showWorkoutDetails(workout) {
    // Функция для получения типа тренировки на русском
    function getWorkoutType(type) {
        const types = {
            'cardio': 'Кардио',
            'strength': 'Силовая',
            'hiit': 'HIIT',
            'cardio_strength': 'Кардио + Сила',
            'circuit': 'Круговая'
        };
        return types[type] || type;
    }

    tg.showPopup({
        title: workout.title,
        message: `
${workout.type ? `📋 Тип: ${getWorkoutType(workout.type)}` : ''}
🕒 Длительность: ${workout.duration} мин
🔥 Калории: ${workout.calories} ккал

Упражнения:
${workout.exercises.map(ex => `• ${ex.name}
  ${ex.sets}×${ex.reps}${ex.rest ? ` (отдых ${ex.rest} сек)` : ''}`).join('\n')}
        `,
        buttons: [
            {
                type: 'default',
                text: 'Закрыть'
            }
        ]
    });
}

// Обновим обработчики событий
function setupWorkoutHandlers(program) {
    document.querySelectorAll('.workout-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const workoutCard = button.closest('.workout-card');
            const workoutTitle = workoutCard.querySelector('h3').textContent;
            const workoutId = getWorkoutIdByTitle(workoutTitle);
            
            if (button.classList.contains('info-btn')) {
                tg.HapticFeedback.impactOccurred('medium');
                showWorkoutDetails(workoutId);
            } else if (button.classList.contains('start-btn')) {
                tg.HapticFeedback.impactOccurred('medium');
                startWorkout(workoutId);
            }
        });
    });
}

// Вспомогательная функция для получения ID тренировки по заголовку
function getWorkoutIdByTitle(title) {
    return Object.keys(workoutData).find(key => 
        workoutData[key].title === title
    );
}

// Функция показа деталей программы
async function showProgramDetails(programId) {
    const program = window.programData[programId];
    if (!program) return;

    await showPopupSafe({
        title: program.title,
        message: `${program.description}\n\n${program.schedule} • ${program.difficulty}\n\nДлительность: ${program.duration}`,
        buttons: [
            {
                id: `start_program_${programId}`,
                type: 'default',
                text: 'Начать программу'
            },
            {
                type: 'cancel',
                text: 'Закрыть'
            }
        ]
    });
}

// Функция показа результатов программы
function showProgramResults(programId) {
    const program = programData[programId];
    if (!program) return;

    const resultsInfo = program.results
        .map(result => `✅ ${result}`)
        .join('\n');

    tg.showPopup({
        title: 'Ожидаемые результаты',
        message: resultsInfo,
        buttons: [
            {type: 'default', text: '⬅️ Назад', id: `back_to_main_${programId}`},
            {type: 'default', text: 'Расписание ➜', id: `schedule_${programId}`},
            {type: 'default', text: 'Начать программу', id: `start_program_${programId}`}
        ]
    });
}

// Функция показа расписания программы
async function showProgramSchedule(programId) {
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
                text: 'Начать программу',
                id: `start_program_${programId}`
            }
        ]
    });
}

// Обновим обработчик событий попапа
function setupPopupHandlers() {
    tg.onEvent('popupClosed', (event) => {
        console.log('Popup closed with event:', event);
        if (event && event.button_id) {
            if (event.button_id.startsWith('start_workout_')) {
                // Извлекаем programId и workoutDay из button_id
                const [_, __, programId, workoutDay] = event.button_id.split('_').slice(2);
                console.log('Starting workout:', programId, workoutDay);
                startWorkoutSession(programId, parseInt(workoutDay));
            } else {
                const [action, ...params] = event.button_id.split('_');
                
                switch(action) {
                    case 'results':
                        showProgramResults(params[0]);
                        break;
                    case 'schedule':
                        showProgramSchedule(params[0]);
                        break;
                    case 'start':
                        if (params[0] === 'program') {
                            startProgram(params[1]);
                        }
                        break;
                    case 'back':
                        showProgramDetails(params[0]);
                        break;
                }
            }
        }
    });
}

// Функция обновления прогресса программы
async function updateProgramProgress(workout, isCompleted) {
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
                programId: currentProgramId,
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
                    
                    // Возвращаемся к списку программ
    renderProgramCards();
                }
            }
        }

        // Обновляем календарь
        updateCalendar();
        // Обновляем статистику
        updateStatistics();

    } catch (error) {
        console.error('Ошибка при обновлении прогресса:', error);
    }
}

// Функция обновления календаря
function updateCalendar() {
    const calendarContainer = document.querySelector('.calendar-days');
    if (!calendarContainer) return;

    getStorageItem('workoutStats')
        .then(data => {
            const stats = data ? JSON.parse(data) : { completedWorkouts: [] };
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            // Получаем все даты тренировок для текущего месяца
            const workoutDates = stats.completedWorkouts
                .map(w => new Date(w.date))
                .filter(date => 
                    date.getMonth() === currentMonth && 
                    date.getFullYear() === currentYear
                )
                .map(date => date.getDate());

            // Обновляем календарь
            renderCalendar(currentYear, currentMonth, workoutDates);
        });
}

// Функция обновления статистики
function updateStatistics() {
    const statsContainer = document.querySelector('.stats-grid');
    if (!statsContainer) return;

    getStorageItem('workoutStats')
        .then(data => {
            const stats = data ? JSON.parse(data) : {
                totalWorkouts: 0,
                totalCalories: 0,
                totalMinutes: 0
            };

            // Обновляем значения в карточках статистики
            document.getElementById('total-workouts').textContent = stats.totalWorkouts;
            document.getElementById('total-calories').textContent = stats.totalCalories;
            document.getElementById('total-time').textContent = `${stats.totalMinutes}м`;
            
            // Обновляем прогресс цели
            const activeProgram = window.programData[currentProgramId];
            if (activeProgram) {
                const progress = Math.round((stats.totalWorkouts / activeProgram.workouts.length) * 100);
                document.getElementById('completion-rate').textContent = `${progress}%`;
            }
        });
}

// Обновляем функцию renderProgramCards
async function renderProgramCards() {
    const container = document.querySelector('.programs-list');
    if (!container) return;

    const activeProgram = await checkActiveProgram();

    let html = '';
    Object.entries(window.programData).forEach(([programId, program]) => {
        const isActive = activeProgram && activeProgram.id === programId;
        const isDisabled = activeProgram && activeProgram.id !== programId;
        
        html += `
            <div class="program-card ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}" 
                 data-program-id="${programId}">
                <div class="program-content">
                    <div class="program-icon">
                        <span class="material-symbols-rounded">${program.icon}</span>
                    </div>
                    <div class="program-text">
                        <h3>${program.title}</h3>
                        <p class="program-description">${program.description}</p>
                        <div class="program-details">
                            <span>
                                <span class="material-symbols-rounded">calendar_today</span>
                                ${program.schedule}
                            </span>
                            <span>
                                <span class="material-symbols-rounded">fitness_center</span>
                                ${program.difficulty}
                            </span>
                        </div>
                        </div>
                    </div>
                ${isActive ? `
                    <div class="program-progress">
                        <div class="progress-text">
                            Текущая программа
                </div>
                    </div>
                ` : ''}
            </div>
        `;
    });

    container.innerHTML = html;

    // Добавляем обработчики после рендеринга
    document.querySelectorAll('.program-card').forEach(card => {
        const programId = card.dataset.programId;
        
        // Обработчик для всей карточки
        card.addEventListener('click', () => {
            if (!card.classList.contains('disabled')) {
                showProgramDetails(programId);
                tg.HapticFeedback.impactOccurred('light');
            } else {
                tg.HapticFeedback.notificationOccurred('error');
                showPopupSafe({
                    title: 'Программа недоступна',
                    message: 'Сначала завершите текущую программу',
                    buttons: [{type: 'ok'}]
                });
            }
        });

        // Обработчики для кнопок
        const infoBtn = card.querySelector('.info-btn');
        const startBtn = card.querySelector('.start-btn');

        if (infoBtn) {
            infoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showProgramDetails(programId);
                tg.HapticFeedback.impactOccurred('light');
            });
        }

        if (startBtn) {
            startBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    const program = window.programData[programId];
                    if (!program) {
                        throw new Error(`Программа с ID ${programId} не найдена`);
                    }
                    
                    await initializeProgram(program);
                    showProgramWorkouts(program);
        tg.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.error('Ошибка при запуске программы:', error);
                    await showError('Не удалось начать программу');
                }
            });
        }
    });

    // Обработчик для кнопки "Назад"
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            renderProgramCards();
                tg.HapticFeedback.impactOccurred('medium');
        });
    });
}

// Вспомогательная функция для получения текста сложности
function getDifficultyText(difficulty) {
    const difficultyMap = {
        'low': 'Легкий',
        'medium': 'Средний',
        'high': 'Сложный'
    };
    return difficultyMap[difficulty] || 'Средний';
}

// Добавляем вспомогательную функцию для очистки таймеров
function clearTimers() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (restInterval) {
        clearInterval(restInterval);
        restInterval = null;
    }
}

// Добавляем функцию для проверки возможности добавления на рабочий стол
async function checkHomeScreenAvailability() {
    // Проверяем, поддерживается ли платформа
    if (!tg.isVersionAtLeast('6.1')) {
        return false;
    }

    // Проверяем, является ли приложение ботом
    if (!tg.isBot) {
        return false;
    }

    // Проверяем, можно ли добавить на рабочий стол
    if (!tg.canAddToHomeScreen) {
        return false;
    }

    return true;
}

// Функция для добавления на рабочий стол
async function addToHomeScreen() {
    try {
        const canAdd = await checkHomeScreenAvailability();
        if (canAdd) {
            tg.addToHomeScreen();
        }
    } catch (error) {
        console.warn('Ошибка при добавлении на рабочий стол:', error);
    }
}

// Обновляем функцию renderProfilePage
function renderProfilePage() {
    const container = document.querySelector('.container');
    if (!container) return;

    container.innerHTML = `
        <div class="profile-page">
            <!-- Существующие поля профиля -->
            
            <div class="settings-section">
                <h3>Место тренировок</h3>
                <div class="workout-place-selector">
                    <button class="place-btn" data-place="home">Дома</button>
                    <button class="place-btn" data-place="gym">В зале</button>
                    <button class="place-btn" data-place="outdoor">На улице</button>
                </div>
            </div>

            <div class="settings-section">
                <h3>Доступное оборудование</h3>
                <div class="equipment-list">
                    <label class="equipment-item">
                        <input type="checkbox" name="equipment" value="гантели">
                        Гантели
                    </label>
                    <label class="equipment-item">
                        <input type="checkbox" name="equipment" value="скамья">
                        Скамья
                    </label>
                    <label class="equipment-item">
                        <input type="checkbox" name="equipment" value="штанга">
                        Штанга
                    </label>
                    <label class="equipment-item">
                        <input type="checkbox" name="equipment" value="турник">
                        Турник
                    </label>
                    <!-- Добавьте другое оборудование -->
                </div>
            </div>
        </div>
    `;

    // Добавляем обработчики
    setupProfileEquipmentHandlers();
}

function setupProfileEquipmentHandlers() {
    const equipmentInputs = document.querySelectorAll('input[name="equipment"]');
    const placeButtons = document.querySelectorAll('.place-btn');

    // Загружаем сохраненные настройки
    loadProfileSettings();

    // Обработчики для оборудования
    equipmentInputs.forEach(input => {
        input.addEventListener('change', () => {
            tg.HapticFeedback.impactOccurred('light');
            saveProfileSettings();
        });
    });

    // Обработчики для места тренировок
    placeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            placeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tg.HapticFeedback.impactOccurred('light');
            saveProfileSettings();
        });
    });
}

// Функция загрузки настроек профиля
async function loadProfileSettings() {
    try {
        const profileData = await getStorageItem('profile')
            .then(data => data ? JSON.parse(data) : {});

        // Заполняем чекбоксы оборудования
        if (profileData.equipment) {
            const equipmentInputs = document.querySelectorAll('input[name="equipment"]');
            equipmentInputs.forEach(input => {
                input.checked = profileData.equipment.includes(input.value);
            });
        }

        // Устанавливаем место тренировок
        if (profileData.workoutPlaces) {
            const placeButtons = document.querySelectorAll('.place-btn');
            placeButtons.forEach(btn => {
                if (profileData.workoutPlaces.includes(btn.dataset.place)) {
                    btn.classList.add('active');
                }
            });
        }
    } catch (error) {
        console.error('Ошибка при загрузке настроек профиля:', error);
    }
} 

// Функция для отображения статистики
async function renderStatistics() {
    const container = document.querySelector('.statistics-container');
    if (!container) return;

    try {
        // Загружаем данные о тренировках
        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);

        // Рассчитываем статистику
        const totalWorkouts = activeProgram?.completedWorkouts?.length || 0;
        const totalDuration = activeProgram?.completedWorkouts?.reduce((sum, w) => sum + (w.duration || 0), 0) || 0;
        const totalCalories = activeProgram?.completedWorkouts?.reduce((sum, w) => sum + (w.calories || 0), 0) || 0;
        const goalProgress = activeProgram ? 
            Math.round((totalWorkouts / activeProgram.workouts.length) * 100) : 0;

        // Обновляем HTML статистики
        container.innerHTML = `
            <div class="stats-overview">
                <div class="stat-card">
                    <span class="material-symbols-rounded">exercise</span>
                    <h3>${totalWorkouts}</h3>
                    <p>Тренировок</p>
                </div>
                <div class="stat-card">
                    <span class="material-symbols-rounded">timer</span>
                    <h3>${totalDuration}м</h3>
                    <p>Общее время</p>
                </div>
                <div class="stat-card">
                    <span class="material-symbols-rounded">local_fire_department</span>
                    <h3>${totalCalories}</h3>
                    <p>Ккал сожжено</p>
                </div>
                <div class="stat-card">
                    <span class="material-symbols-rounded">trending_up</span>
                    <h3>${goalProgress}%</h3>
                    <p>Достижение цели</p>
                </div>
            </div>
            <div class="weight-chart">
                <div class="chart-header">
                    <h3>Динамика веса</h3>
                    <div class="period-selector">
                        <button class="period-btn active" data-period="week">Неделя</button>
                        <button class="period-btn" data-period="month">Месяц</button>
                        <button class="period-btn" data-period="year">Год</button>
                    </div>
                </div>
                <canvas id="weight-chart"></canvas>
            </div>
            <div class="tips-list"></div>
        `;

        // Настраиваем обработчики периодов для графика
        setupPeriodButtons();
        
        // Инициализируем график с недельным периодом
        updateWeightChart('week');

        // Добавляем отрисовку советов
        await renderTips();

    } catch (error) {
        console.error('Ошибка при отображении статистики:', error);
        showError('Не удалось загрузить статистику');
    }
}

// Функция для отображения советов
async function renderTips() {
    const tipsContainer = document.querySelector('.tips-list');
    if (!tipsContainer) return;

    try {
        const tips = await getTips();
        
        tipsContainer.innerHTML = tips.map(tip => `
            <div class="tip-card">
                <div class="tip-icon">
                    <span class="material-symbols-rounded">tips_and_updates</span>
                </div>
                <div class="tip-content">
                    <h3>${tip.title}</h3>
                    <p>${tip.text}</p>
                </div>
            </div>
        `).join('');

        // Добавляем анимацию появления
        const tipCards = tipsContainer.querySelectorAll('.tip-card');
        tipCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('visible');
            }, index * 100);
        });

    } catch (error) {
        console.error('Ошибка при отображении советов:', error);
        tipsContainer.innerHTML = '<div class="no-data">Не удалось загрузить советы</div>';
    }
}

// Функция для получения персонализированных советов
async function getTips() {
    try {
        // Получаем данные профиля и прогресса
        const [profileData, workoutStats] = await Promise.all([
            getStorageItem('profile').then(data => data ? JSON.parse(data) : null),
            getStorageItem('workoutStats').then(data => data ? JSON.parse(data) : null)
        ]);

        const tips = [];

        // Базовые советы
        tips.push({
            title: 'Регулярность тренировок',
            text: 'Старайтесь тренироваться минимум 3 раза в неделю для достижения лучших результатов'
        });

        tips.push({
            title: 'Водный баланс',
            text: 'Пейте достаточно воды до, во время и после тренировки для поддержания гидратации'
        });

        if (profileData) {
            // Советы на основе цели
            switch(profileData.goal) {
                case 'weight_loss':
                    tips.push({
                        title: 'Контроль калорий',
                        text: 'Создавайте дефицит 500-700 ккал в день для здорового снижения веса'
                    });
                    break;
                case 'muscle_gain':
                    tips.push({
                        title: 'Белок для роста мышц',
                        text: 'Употребляйте 1.6-2.2г белка на кг веса тела для оптимального роста мышц'
                    });
                    break;
                case 'endurance':
                    tips.push({
                        title: 'Кардио нагрузка',
                        text: 'Чередуйте интенсивные и умеренные кардио тренировки для развития выносливости'
                    });
                    break;
            }

            // Советы на основе уровня подготовки
            if (profileData.level === 'beginner') {
                tips.push({
                    title: 'Техника выполнения',
                    text: 'Сосредоточьтесь на правильной технике выполнения упражнений, а не на весе или количестве повторений'
                });
            }
        }

        if (workoutStats) {
            // Советы на основе статистики тренировок
            const workoutsThisWeek = workoutStats.completedWorkouts?.filter(w => 
                new Date(w.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ).length || 0;

            if (workoutsThisWeek < 2) {
                tips.push({
                    title: 'Мотивация',
                    text: 'Составьте план тренировок на неделю вперед и следуйте ему для достижения своих целей'
                });
            }
        }

        // Возвращаем максимум 5 советов
        return tips.slice(0, 5);
    } catch (error) {
        console.error('Ошибка при получении советов:', error);
        return [];
    }
}

// В начало файла, после объявления глобальных переменных
function setupTheme() {
    // Определяем тему из Telegram WebApp
    const isDarkTheme = window.Telegram.WebApp.colorScheme === 'dark';
    document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');

    // Слушаем изменения темы
    window.Telegram.WebApp.onEvent('themeChanged', () => {
        const newTheme = window.Telegram.WebApp.colorScheme;
        document.documentElement.setAttribute('data-theme', newTheme);
    });
}

// Добавляем вызов функции в DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    setupTheme();
}); 

function setupExerciseHandlers() {
    const container = document.querySelector('.container');
    if (!container) return;

    const backBtn = container.querySelector('.back-btn');
    const minusBtn = container.querySelector('.minus-btn');
    const plusBtn = container.querySelector('.plus-btn');
    const completeBtn = container.querySelector('.complete-btn');

    // Очищаем старые обработчики
    backBtn?.removeEventListener('click', handleBackClick);
    minusBtn?.removeEventListener('click', handleMinusClick);
    plusBtn?.removeEventListener('click', handlePlusClick);
    completeBtn?.removeEventListener('click', handleCompleteClick);

    // Функции обработчиков
    function handleBackClick() {
        tg.showPopup({
            title: 'Прервать тренировку?',
            message: 'Вы уверены, что хотите прервать тренировку? Прогресс будет потерян.',
            buttons: [
                {
                    type: 'destructive',
                    text: 'Прервать',
                    id: 'exit_workout'
                },
                {
                    type: 'cancel',
                    text: 'Продолжить'
                }
            ]
        });
    }

    function handleMinusClick() {
        if (isTimerMode) {
            const exercise = currentWorkout.exercises[currentExerciseIndex];
            let minValue = 10;
            
            if (exercise.name.toLowerCase().includes('разминка')) {
                minValue = 30;
            } else if (exercise.name.toLowerCase().includes('растяжка')) {
                minValue = 20;
            } else if (exercise.name.toLowerCase().includes('планка')) {
                minValue = 30;
            }

            if (timerValue > minValue) {
                timerValue -= 5;
                updateCounter(timerValue);
                tg.HapticFeedback.impactOccurred('light');
            }
        }
    }

    function handlePlusClick() {
        if (isTimerMode && timerValue < 300) {
            timerValue += 5;
            updateCounter(timerValue);
            tg.HapticFeedback.impactOccurred('light');
        }
    }

    function handleCompleteClick() {
        console.log('handleCompleteClick вызван');
        console.log('isTimerMode:', isTimerMode);
        console.log('timerInterval:', timerInterval);
        console.log('timerValue:', timerValue);

        if (isTimerMode) {
            if (!timerInterval) {
                // Запускаем таймер только если он еще не запущен и есть значение
                if (timerValue > 0) {
                    console.log('Запускаем таймер');
                    startTimer(timerValue);
                    
                    // Меняем текст кнопки
                    const completeBtn = document.querySelector('.complete-btn');
                    if (completeBtn) {
                        completeBtn.innerHTML = `
                            <span class="material-symbols-rounded">skip_next</span>
                            Пропустить
                        `;
                    }
                    
                    tg.HapticFeedback.impactOccurred('medium');
                }
            } else {
                // Пропускаем текущий таймер
                console.log('Пропускаем таймер');
                clearInterval(timerInterval);
                timerInterval = null;
                
                handleExerciseComplete();
            }
        } else {
            // Для упражнений без таймера
            handleExerciseComplete();
        }
    }

    // Добавляем новые обработчики
    backBtn?.addEventListener('click', handleBackClick);
    minusBtn?.addEventListener('click', handleMinusClick);
    plusBtn?.addEventListener('click', handlePlusClick);
    completeBtn?.addEventListener('click', handleCompleteClick);
}

// Функция для инициализации обработчика выхода из тренировки
function initExitHandler() {
    tg.onEvent('popupClosed', (event) => {
        if (event.button_id === 'exit_workout') {
            // Очищаем все таймеры
            clearTimers();
            
            // Возвращаемся к списку программ
            showProgramsList();
            
            // Вибрация
            tg.HapticFeedback.impactOccurred('medium');
        }
    });
} 

// Добавим функцию обновления счетчика
function updateCounter(value) {
    console.log('Обновление счетчика:', value);
    const counterElement = document.querySelector('.counter-number');
    if (counterElement) {
        counterElement.textContent = value;
    } else {
        console.warn('Элемент счетчика не найден');
    }
} 

// Добавляем константы для отдыха
const REST_CONFIG = {
    restBetweenExercises: 60, // секунд
    motivationalMessages: [
        "Отличная работа! Время для короткого отдыха",
        "Восстанавливаем силы перед следующим упражнением",
        "Небольшой перерыв пойдет на пользу",
        "Используйте это время для восстановления"
    ]
};

// Обновляем функцию showRestScreen
function showRestScreen(isBetweenSets) {
    const exercise = currentWorkout.exercises[currentExerciseIndex];
    const restTime = isBetweenSets ? exercise.rest : REST_CONFIG.restBetweenExercises;
    const messages = REST_CONFIG.motivationalMessages;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    const container = document.querySelector('.programs-list');
    if (!container) return;

    container.innerHTML = `
            <div class="rest-screen">
                <div class="rest-icon">
                    <span class="material-symbols-rounded">timer</span>
                </div>
            <h3>Время отдохнуть</h3>
            <p class="rest-subtitle">${randomMessage}</p>
            <div class="rest-timer">${restTime}</div>
                <div class="rest-progress">
                    <div class="rest-progress-bar" style="width: 100%"></div>
                </div>
                <button class="skip-rest-btn">
                    <span class="material-symbols-rounded">skip_next</span>
                    Пропустить
                </button>
        </div>
    `;

    let timeLeft = restTime;
    const timerElement = container.querySelector('.rest-timer');
    const progressBar = container.querySelector('.rest-progress-bar');

    // Запускаем таймер
    const interval = setInterval(() => {
        timeLeft--;
        if (timerElement) {
            timerElement.textContent = timeLeft;
            if (timeLeft <= 3) {
                timerElement.classList.add('ending');
                tg.HapticFeedback.impactOccurred('medium');
            }
        }
        if (progressBar) {
            progressBar.style.width = `${(timeLeft / restTime) * 100}%`;
        }
        if (timeLeft <= 0) {
            clearInterval(interval);
            if (isBetweenSets) {
                currentSet++;
            }
                renderExercise();
        }
    }, 1000);

    // Обработчик кнопки пропуска
    const skipBtn = container.querySelector('.skip-rest-btn');
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            clearInterval(interval);
        if (isBetweenSets) {
                currentSet++;
        }
                    renderExercise();
            tg.HapticFeedback.impactOccurred('medium');
    });
    }
}

// Обновим функцию renderExercise
async function renderExercise() {
    try {
        if (!currentWorkout || !currentWorkout.exercises) {
            throw new Error('Нет данных о текущей тренировке');
    }

    const exercise = currentWorkout.exercises[currentExerciseIndex];
    if (!exercise) {
            throw new Error('Упражнение не найдено');
        }

        const container = document.querySelector('.programs-list');
        if (!container) return;

    container.innerHTML = `
            <div class="workout-session">
                <div class="exercise-background">
                    <img src="${window.getExerciseAnimation(exercise.name)}" alt="${exercise.name}">
                    <div class="overlay"></div>
                </div>
                
                <div class="workout-content">
            <div class="workout-header">
                <button class="back-btn">
                    <span class="material-symbols-rounded">arrow_back</span>
                </button>
                <div class="workout-title">
                            <h2 class="exercise-title">${exercise.name}</h2>
                <div class="workout-progress">
                    ${currentExerciseIndex + 1}/${currentWorkout.exercises.length}
                            </div>
                </div>
            </div>

                    <div class="exercise-info">
                        <div class="exercise-stats">
                            <div class="stat-item">
                                <div class="stat-value">${exercise.reps}</div>
                                <div class="stat-label">повторений</div>
                    </div>
                            <div class="stat-item">
                                <div class="stat-value">${currentSet}/${exercise.sets}</div>
                                <div class="stat-label">подход</div>
                            </div>
                            ${exercise.rest ? `
                            <div class="stat-item">
                                <div class="stat-value">${exercise.rest}</div>
                                <div class="stat-label">сек отдых</div>
                            </div>
                            ` : ''}
                        </div>
                </div>
            </div>

            <div class="exercise-controls">
                    <button class="complete-set-btn">Завершить подход</button>
            </div>
        </div>
    `;

        setupExerciseHandlers();

    } catch (error) {
        console.error('Ошибка при отображении упражнения:', error);
        await showError('Не удалось отобразить упражнение');
    }
}

// Добавляем функцию настройки обработчиков упражнения
function setupExerciseHandlers() {
    const container = document.querySelector('.workout-session');
    if (!container) return;

    // Обработчик для кнопки "Назад"
    const backBtn = container.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showPopupSafe({
                message: 'Вы уверены, что хотите прервать тренировку?',
                buttons: [
                    {
                        type: 'destructive',
                        text: 'Прервать',
                        id: 'quit_workout'
                    },
                    {
                        type: 'cancel',
                        text: 'Продолжить'
                    }
                ]
            });
        });
    }

    // Обработчик для кнопки "Завершить подход"
    const completeBtn = container.querySelector('.complete-set-btn');
    if (completeBtn) {
        completeBtn.addEventListener('click', () => {
            completeSet();
            tg.HapticFeedback.impactOccurred('medium');
        });
    }
}

// Добавим функцию форматирования расписания
function formatSchedule(program) {
    return `День 1-${program.workouts.length}, ${program.schedule}`;
}

// Обновим отображение в списке программ
function renderPrograms() {
    const container = document.querySelector('.programs-list');
    if (!container) return;

    container.innerHTML = Object.entries(window.programData).map(([id, program]) => `
        <div class="program-card" data-program-id="${id}">
            <div class="program-icon">
                <span class="material-symbols-rounded">${program.icon || 'fitness_center'}</span>
            </div>
            <div class="program-info">
                <h3>${program.title}</h3>
                <p>${program.description}</p>
                <div class="program-meta">
                    <div class="program-schedule">
                        ${formatSchedule(program)}
                    </div>
                    <div class="program-difficulty">
                        ${program.difficulty || 'Средний'}
                    </div>
                </div>
            </div>
            <div class="program-actions">
                <button class="info-btn" data-program-id="${id}">
                    <span class="material-symbols-rounded">info</span>
                    Подробнее
                </button>
                <button class="start-btn" data-program-id="${id}">
                    <span class="material-symbols-rounded">play_arrow</span>
                    Начать
                </button>
            </div>
        </div>
    `).join('');
}

// Обновим отображение в попапе
async function showProgramInfo(programId) {
    const program = window.programData[programId];
    if (!program) return;

    const message = `${program.title}

📋 ${program.description}

⏱️ Длительность: ${program.duration}
📅 График: ${program.schedule}
💪 Сложность: ${program.difficulty}

🎯 Цели программы:
${program.goals.map(goal => `• ${goal}`).join('\n')}`;

    await showPopupSafe({
        title: 'О программе',
        message: message,
        buttons: [
            {
                type: 'default',
                text: 'Расписание',
                id: `schedule_${programId}`
            },
            {
                type: 'default',
                text: 'Начать программу',
                id: `start_program_${programId}`
            }
        ]
    });
}

// Добавляем функцию форматирования расписания
function formatScheduleMessage(program) {
    const workoutIcons = {
        cardio: '🏃‍♂️',
        strength: '💪',
        hiit: '⚡️',
        cardio_strength: '💪🏃‍♂️',
        general: '🎯'
    };

    const difficultyIcons = {
        easy: '⭐️',
        medium: '⭐️⭐️',
        hard: '⭐️⭐️⭐️'
    };

    let message = `${program.title}\n`;
    message += `${difficultyIcons[program.difficulty] || '⭐️'} ${program.description}\n\n`;
    message += `📅 ${program.schedule}\n`;
    message += `⏱️ ${program.duration}\n\n`;
    message += `Тренировки:\n\n`;

    program.workouts.forEach((workout, index) => {
        const icon = workoutIcons[workout.type] || '🎯';
        message += `День ${index + 1}: ${icon} ${workout.title}\n`;
        message += `├ ⏱️ ${workout.duration} мин\n`;
        message += `├ 🔥 ${workout.calories} ккал\n`;
        message += `└ 🎯 ${workout.exercises.length} упражнений\n\n`;
    });

    message += `\nЦели программы:\n`;
    program.goals.forEach(goal => {
        message += `• ${goal}\n`;
    });

    return message;
}

// Функция для переключения вкладок
function switchTab(tabName) {
    // Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Убираем активный класс у всех кнопок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Показываем нужную вкладку
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Активируем соответствующую кнопку
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Дополнительные действия при переключении вкладок
    switch(tabName) {
        case 'stats':
            updateWeightChart(currentPeriod || 'week');
            renderTips();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'workouts':
            loadActiveProgram();
            break;
    }

    // Вибрация при переключении
    tg.HapticFeedback.impactOccurred('light');
}

// Функция для очистки всех данных
async function clearAllData() {
    try {
        // Список ключей для очистки
        const keysToDelete = [
            'profile',
            'activeProgram',
            'workoutStats',
            'weightHistory'
        ];

        // Очищаем данные в CloudStorage и localStorage
        for (const key of keysToDelete) {
            await setStorageItem(key, '');
            localStorage.removeItem(key);
        }

        // Показываем уведомление об успешной очистке
        await showPopupSafe({
            title: 'Готово',
            message: 'Все данные успешно очищены',
            buttons: [{type: 'ok'}]
        });

        // Перезагружаем страницу
        location.reload();
    } catch (error) {
        console.error('Ошибка при очистке данных:', error);
        await showError('Не удалось очистить данные');
    }
}