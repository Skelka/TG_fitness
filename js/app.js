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
async function initApp() {
    try {
        console.log('Версия WebApp:', tg.version);
        console.log('Платформа:', tg.platform);
        console.log('Инициализация WebApp:', tg.initData);
        console.log('Доступные методы WebApp:', Object.keys(tg));

        // Анализируем базу упражнений
        const exercisesAnalysis = analyzeExercisesDatabase();
        console.log('Анализ базы упражнений завершен');

        // Инициализируем программы при первом запуске
        await initializeDefaultPrograms();
        
        // Инициализируем все обработчики
        setupEventListeners();
        setupPopupHandlers();
        setupProfileEquipmentHandlers();
        
        // Загружаем данные
        await loadProfile();
        await loadActiveProgram();

    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError('Произошла ошибка при загрузке приложения');
    }
}

// Обновляем обработчик DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
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

    initApp().catch(error => {
        console.error('Ошибка при инициализации приложения:', error);
        showError('Не удалось загрузить приложение');
    });
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
            // Заполняем текстовые поля и радиокнопки
            Object.entries(profileData).forEach(([key, value]) => {
                const input = document.querySelector(`[name="${key}"]`);
                if (input) {
                    if (input.type === 'radio') {
                        const radioInput = document.querySelector(`[name="${key}"][value="${value}"]`);
                        if (radioInput) radioInput.checked = true;
                    } else if (input.type !== 'checkbox') {
                        input.value = value;
                    }
                }
            });

            // Восстанавливаем выбранное оборудование
            if (profileData.equipment) {
                const equipmentCheckboxes = document.querySelectorAll('input[name="equipment"]');
                equipmentCheckboxes.forEach(checkbox => {
                    checkbox.checked = profileData.equipment.includes(checkbox.value);
                });
            }

            // Восстанавливаем места тренировок
            if (profileData.workoutPlaces) {
                const placeButtons = document.querySelectorAll('.place-btn');
                placeButtons.forEach(button => {
                    button.classList.toggle('active', 
                        profileData.workoutPlaces.includes(button.dataset.place)
                    );
                });
            }

            // Обновляем статус профиля
            updateProfileStatus(profileData);
        }

        // Устанавливаем обработчики после загрузки данных
        setupProfileEquipmentHandlers();

    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        showError('Не удалось загрузить профиль');
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
function showNotification(message, isError = false) {
    // Удаляем предыдущее уведомление, если оно есть
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = `notification${isError ? ' error' : ''}`;
    notification.textContent = message;

    // Добавляем уведомление на страницу
    document.body.appendChild(notification);

    // Показываем уведомление
        setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Скрываем и удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
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
        // Получаем текущие данные профиля
        const profileData = await getStorageItem('profile')
            .then(data => data ? JSON.parse(data) : {});

        // Собираем выбранное оборудование
        const equipmentInputs = document.querySelectorAll('input[name="equipment"]:checked');
        profileData.equipment = Array.from(equipmentInputs).map(input => input.value);

        // Собираем выбранные места тренировок
        const placeButtons = document.querySelectorAll('.place-btn.active');
        profileData.workoutPlaces = Array.from(placeButtons).map(btn => btn.dataset.place);

        // Сохраняем обновленные данные
        await setStorageItem('profile', JSON.stringify(profileData));

        // Показываем уведомление об успешном сохранении
        showNotification('Настройки сохранены');

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

// Функция для отображения списка программ
async function renderProgramCards() {
    const container = document.querySelector('.programs-list');
    if (!container) return;

    try {
        // Получаем активную программу
        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);

        let html = '';
        Object.entries(window.programData).forEach(([id, program]) => {
            const isActive = activeProgram?.id === id;
            const isDisabled = activeProgram && !isActive;

            html += `
                <div class="program-card ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}" data-program-id="${id}">
                    <div class="program-icon">
                        <span class="material-symbols-rounded">${program.icon || 'fitness_center'}</span>
                    </div>
                    <div class="program-info">
                        <h3>${program.title}</h3>
                        <p>${program.description}</p>
                        <div class="program-meta">
                            <span>
                                <span class="material-symbols-rounded">timer</span>
                                ${program.duration}
                            </span>
                            <span>
                                <span class="material-symbols-rounded">calendar_month</span>
                                ${program.schedule}
                            </span>
                            <span class="difficulty-badge">
                                ${getDifficultyText(program.difficulty)}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Добавляем обработчики для карточек
        document.querySelectorAll('.program-card').forEach(card => {
            const programId = card.dataset.programId;
            
            card.addEventListener('click', async () => {
                if (!card.classList.contains('disabled')) {
                    await showProgramDetails(programId);
                    tg.HapticFeedback.impactOccurred('light');
                } else {
                    tg.HapticFeedback.notificationOccurred('error');
                    showNotification('Сначала завершите текущую программу', 'error');
                }
            });
        });

    } catch (error) {
        console.error('Ошибка при отображении программ:', error);
        container.innerHTML = '<div class="no-data">Ошибка при загрузке программ</div>';
    }
}

// Функция для отображения деталей программы
async function showProgramDetails(programId) {
    const program = window.programData[programId];
    if (!program) return;

    await showPopupSafe({
        title: program.title,
        message: `${program.description}\n\n${program.schedule} • ${getDifficultyText(program.difficulty)}\n\nДлительность: ${program.duration}`,
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

// Функция для отображения тренировок программы
async function showProgramWorkouts(program) {
    const programsList = document.querySelector('.programs-list');
    if (!programsList) return;

    programsList.innerHTML = `
        <div class="program-header">
            <button class="back-btn" onclick="renderProgramCards()">
                <span class="material-symbols-rounded">arrow_back</span>
            </button>
            <h2>${program.name}</h2>
        </div>
        <div class="program-days">
            ${program.workouts.map((workout, index) => `
                <div class="workout-day">
                    <div class="workout-day-content">
                        <div class="workout-day-icon">
                            <span class="material-symbols-rounded">exercise</span>
                        </div>
                        <div class="workout-day-text">
                            <span class="day-number">День ${index + 1}</span>
                            <h3>${workout.name}</h3>
                            <p>${workout.description}</p>
                            <div class="workout-meta">
                                <span>
                                    <span class="material-symbols-rounded">timer</span>
                                    ${workout.duration} мин
                                </span>
                            </div>
                        </div>
                    </div>
                    <button class="start-workout-btn" onclick="startWorkout('${program.id}', '${workout.id}')">
                        <span class="material-symbols-rounded">play_arrow</span>
                        Начать тренировку
                    </button>
                </div>
            `).join('')}
        </div>
    `;
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

// Функция для отображения календаря
function renderCalendar() {
    const calendarHeader = document.querySelector('.calendar-header h2');
    const calendarDays = document.querySelector('.calendar-days');
    if (!calendarHeader || !calendarDays) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Устанавливаем заголовок календаря
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    calendarHeader.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Получаем первый день месяца
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    // Получаем день недели для первого дня (0 - воскресенье, 1 - понедельник, и т.д.)
    let firstDayOfWeek = firstDay.getDay();
    // Преобразуем воскресенье (0) в 7 для правильного отображения
    firstDayOfWeek = firstDayOfWeek === 0 ? 7 : firstDayOfWeek;

    let html = '';
    
    // Добавляем пустые ячейки для дней до начала месяца
    for (let i = 1; i < firstDayOfWeek; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Добавляем дни месяца
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const isToday = day === now.getDate() && 
                       currentMonth === now.getMonth() && 
                       currentYear === now.getFullYear();
        
        html += `
            <div class="calendar-day${isToday ? ' today' : ''}">
                <span>${day}</span>
            </div>
        `;
    }

    calendarDays.innerHTML = html;

    // Добавляем обработчики для кнопок навигации
    const prevBtn = document.querySelector('.calendar-nav-btn:first-child');
    const nextBtn = document.querySelector('.calendar-nav-btn:last-child');

    if (prevBtn && nextBtn) {
        prevBtn.onclick = () => navigateCalendar('prev');
        nextBtn.onclick = () => navigateCalendar('next');
    }
}

// Функция для навигации по календарю
function navigateCalendar(direction) {
    const currentDate = new Date();
    if (direction === 'prev') {
        currentDate.setMonth(currentDate.getMonth() - 1);
    } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    renderCalendar();
    tg.HapticFeedback.impactOccurred('light');
}

// Обновляем функцию switchTab
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
            renderStatistics();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'workouts':
            loadActiveProgram();
            break;
        case 'calendar':
    renderCalendar();
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

// Функция для обновления графика веса
async function updateWeightChart(period = 'week') {
    const ctx = document.getElementById('weight-chart');
    if (!ctx) return;

    try {
        // Получаем историю веса
        const weightHistoryStr = await getStorageItem('weightHistory');
        const weightHistory = weightHistoryStr ? JSON.parse(weightHistoryStr) : [];

        if (weightHistory.length === 0) {
            ctx.style.display = 'none';
            ctx.parentElement.innerHTML = '<div class="no-data">Нет данных о весе</div>';
            return;
        }

        ctx.style.display = 'block';

        const now = new Date();
        let startDate = new Date();
        let labels = [];
        let data = [];

        // Определяем диапазон дат для выбранного периода
        switch(period) {
            case 'week':
                startDate.setDate(now.getDate() - 7);
                for(let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
                    labels.push(d.toLocaleDateString('ru-RU', { weekday: 'short' }));
                    const dayWeight = weightHistory.find(w => 
                        new Date(w.date).toDateString() === d.toDateString()
                    );
                    data.push(dayWeight ? dayWeight.weight : null);
                }
                break;

            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                for(let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
                    labels.push(d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
                    const dayWeight = weightHistory.find(w => 
                        new Date(w.date).toDateString() === d.toDateString()
                    );
                    data.push(dayWeight ? dayWeight.weight : null);
                }
                break;

            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                for(let m = new Date(startDate); m <= now; m.setMonth(m.getMonth() + 1)) {
                    labels.push(m.toLocaleDateString('ru-RU', { month: 'short' }));
                    const monthWeights = weightHistory.filter(w => {
                        const date = new Date(w.date);
                        return date.getMonth() === m.getMonth() && 
                               date.getFullYear() === m.getFullYear();
                    });
                    const avgWeight = monthWeights.length ? 
                        monthWeights.reduce((sum, w) => sum + w.weight, 0) / monthWeights.length : 
                        null;
                    data.push(avgWeight);
                }
                break;
        }

        // Находим минимальный и максимальный вес для настройки шкалы
        const weights = data.filter(w => w !== null);
        const minWeight = Math.min(...weights) - 1;
        const maxWeight = Math.max(...weights) + 1;

        // Уничтожаем предыдущий график
        if (window.weightChart) {
            window.weightChart.destroy();
        }

        // Создаем новый график
        window.weightChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Вес (кг)',
                    data: data,
                    borderColor: '#40a7e3',
                    tension: 0.4,
                    fill: false,
                    pointBackgroundColor: '#40a7e3',
                    spanGaps: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        min: minWeight,
                        max: maxWeight,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Ошибка при обновлении графика веса:', error);
        ctx.style.display = 'none';
        ctx.parentElement.innerHTML = '<div class="no-data">Ошибка при загрузке данных</div>';
    }
}

// Функция сохранения веса
async function saveWeight(weight) {
    try {
        // Получаем текущую историю весов
        const weightHistoryStr = await getStorageItem('weightHistory');
        const weightHistory = weightHistoryStr ? JSON.parse(weightHistoryStr) : [];
        
        // Добавляем новую запись
        weightHistory.push({
            date: new Date().toISOString(),
            weight: parseFloat(weight)
        });
        
        // Сохраняем обновленную историю
        await setStorageItem('weightHistory', JSON.stringify(weightHistory));
        
        // Обновляем график, если мы на странице статистики
        const statsTab = document.getElementById('stats');
        if (statsTab && statsTab.classList.contains('active')) {
            updateWeightChart(currentPeriod || 'week');
        }

        // Добавляем тактильный отклик
        tg.HapticFeedback.impactOccurred('light');
    } catch (error) {
        console.error('Ошибка сохранения веса:', error);
        showNotification('Не удалось сохранить вес', 'error');
    }
}

// Обновляем функцию saveProfile
async function saveProfile() {
    try {
        const form = document.getElementById('profile-form');
        const formData = new FormData(form);

        // Собираем все данные из формы
        const profileData = {
            age: parseInt(formData.get('age')) || 0,
            gender: formData.get('gender'),
            height: parseFloat(formData.get('height')) || 0,
            weight: parseFloat(formData.get('weight')) || 0,
            goal: formData.get('goal'),
            level: formData.get('level'),
            workoutPlaces: formData.getAll('workout_place'),
            equipment: formData.getAll('equipment'),
            lastUpdated: Date.now()
        };

        // Сохраняем данные профиля
        await setStorageItem('profile', JSON.stringify(profileData));

        // Сохраняем вес в историю, если он указан
        if (profileData.weight > 0) {
            await saveWeight(profileData.weight);
        }

        // Обновляем UI
        updateProfileStatus(profileData);

        // Показываем уведомление об успешном сохранении
        showNotification('Профиль обновлен');
        tg.HapticFeedback.notificationOccurred('success');

    } catch (error) {
        console.error('Ошибка при сохранении:', error);
        showNotification('Ошибка при сохранении', 'error');
        tg.HapticFeedback.notificationOccurred('error');
    }
}

// Функция для настройки обработчиков оборудования в профиле
function setupProfileEquipmentHandlers() {
    // Обработчики для кнопок места тренировки
    const placeButtons = document.querySelectorAll('.place-btn');
    placeButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active');
            saveProfileSettings();
            tg.HapticFeedback.impactOccurred('light');
        });
    });

    // Обработчики для чекбоксов оборудования
    const equipmentCheckboxes = document.querySelectorAll('.equipment-item input[type="checkbox"]');
    equipmentCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            saveProfileSettings();
            tg.HapticFeedback.impactOccurred('light');
        });
    });
}

// Функция для отображения ошибок
function showError(message) {
    showNotification(message, 'error');
    tg.HapticFeedback.notificationOccurred('error');
}

// Функция для отображения статистики
function renderStatistics() {
    getStorageItem('workoutStats')
        .then(data => {
            const stats = data ? JSON.parse(data) : {
                totalWorkouts: 0,
                totalCalories: 0,
                totalMinutes: 0,
                completedWorkouts: []
            };

            // Проверяем наличие элементов перед обновлением
            const totalWorkoutsEl = document.querySelector('.total-workouts');
            const totalTimeEl = document.querySelector('.total-time');
            const totalCaloriesEl = document.querySelector('.total-calories');
            const completionRateEl = document.querySelector('.completion-rate');

            if (totalWorkoutsEl) {
                totalWorkoutsEl.textContent = stats.totalWorkouts || 0;
            }
            if (totalTimeEl) {
                totalTimeEl.textContent = `${Math.round(stats.totalMinutes || 0)} мин`;
            }
            if (totalCaloriesEl) {
                totalCaloriesEl.textContent = `${Math.round(stats.totalCalories || 0)} ккал`;
            }
            if (completionRateEl) {
                const completionRate = stats.completedWorkouts?.length > 0 
                    ? Math.round((stats.completedWorkouts.filter(w => w.completed).length / stats.completedWorkouts.length) * 100)
                    : 0;
                completionRateEl.textContent = `${completionRate}%`;
            }

            // Обновляем график веса
            updateWeightChart('week');
            
            // Добавляем вызов renderTips
            renderTips();
        })
        .catch(error => {
            console.error('Ошибка при загрузке статистики:', error);
            showError('Не удалось загрузить статистику');
        });
}

async function initializeDefaultPrograms() {
    try {
        const existingPrograms = await getStorageItem('programs');
        if (!existingPrograms) {
            const defaultPrograms = [
                {
                    id: 'beginner_strength',
                    name: 'Базовая сила',
                    description: 'Программа для начинающих, направленная на развитие силы и мышечной массы',
                    icon: 'fitness_center',
                    difficulty: 'beginner',
                    duration: 4,
                    workoutsPerWeek: 3,
                    isCompleted: false,
                    workouts: [
                        {
                            id: 'workout_1',
                            name: 'Тренировка A',
                            description: 'Фокус на верхнюю часть тела',
                            duration: 45,
                            exercises: []
                        },
                        {
                            id: 'workout_2',
                            name: 'Тренировка B',
                            description: 'Фокус на нижнюю часть тела',
                            duration: 45,
                            exercises: []
                        },
                        {
                            id: 'workout_3',
                            name: 'Тренировка C',
                            description: 'Общая тренировка',
                            duration: 45,
                            exercises: []
                        }
                    ]
                },
                {
                    id: 'cardio_endurance',
                    name: 'Кардио и выносливость',
                    description: 'Программа для улучшения выносливости и сжигания жира',
                    icon: 'directions_run',
                    difficulty: 'intermediate',
                    duration: 6,
                    workoutsPerWeek: 4,
                    isCompleted: false,
                    workouts: [
                        {
                            id: 'workout_1',
                            name: 'ВИИТ',
                            description: 'Высокоинтенсивная интервальная тренировка',
                            duration: 30,
                            exercises: []
                        },
                        {
                            id: 'workout_2',
                            name: 'Круговая тренировка',
                            description: 'Комплексная тренировка на все тело',
                            duration: 40,
                            exercises: []
                        }
                    ]
                },
                {
                    id: 'advanced_strength',
                    name: 'Продвинутая сила',
                    description: 'Программа для опытных атлетов, нацеленная на максимальную силу',
                    icon: 'exercise',
                    difficulty: 'advanced',
                    duration: 8,
                    workoutsPerWeek: 5,
                    isCompleted: false,
                    workouts: [
                        {
                            id: 'workout_1',
                            name: 'Силовая тренировка',
                            description: 'Тяжелые базовые упражнения',
                            duration: 60,
                            exercises: []
                        },
                        {
                            id: 'workout_2',
                            name: 'Гипертрофия',
                            description: 'Тренировка на рост мышечной массы',
                            duration: 55,
                            exercises: []
                        }
                    ]
                }
            ];

            await setStorageItem('programs', JSON.stringify(defaultPrograms));
            console.log('Программы по умолчанию инициализированы');
        }
    } catch (error) {
        console.error('Ошибка при инициализации программ:', error);
        throw error;
    }
}

function getDifficultyText(difficulty) {
    switch (difficulty) {
        case 'beginner':
            return 'Начальный';
        case 'intermediate':
            return 'Средний';
        case 'advanced':
            return 'Продвинутый';
        default:
            return 'Начальный';
    }
}

async function renderTips() {
    const tipsContainer = document.querySelector('.tips-list');
    if (!tipsContainer) return;

    try {
        // Получаем данные профиля и статистику
        const profileData = await getStorageItem('profile')
            .then(data => data ? JSON.parse(data) : null);
        
        const stats = await getStorageItem('workoutStats')
            .then(data => data ? JSON.parse(data) : null);

        const tips = [];

        // Базовые советы (всегда показываются)
        tips.push({
            icon: 'water_drop',
            title: 'Пейте больше воды',
            text: 'Поддерживайте водный баланс. Рекомендуется выпивать 30мл воды на кг веса тела.'
        });

        tips.push({
            icon: 'schedule',
            title: 'Регулярность важна',
            text: 'Тренируйтесь регулярно, даже если это будут короткие тренировки. Регулярность важнее интенсивности.'
        });

        // Советы на основе профиля
        if (profileData) {
            if (profileData.level === 'beginner') {
                tips.push({
                    icon: 'trending_up',
                    title: 'Начните с малого',
                    text: 'Не перегружайте себя в начале. Постепенно увеличивайте нагрузку и длительность тренировок.'
                });
            }

            if (profileData.goal === 'weight_loss') {
                tips.push({
                    icon: 'nutrition',
                    title: 'Следите за питанием',
                    text: 'Для снижения веса важно создать дефицит калорий. Комбинируйте тренировки с правильным питанием.'
                });
            }

            if (profileData.goal === 'muscle_gain') {
                tips.push({
                    icon: 'restaurant',
                    title: 'Белок важен',
                    text: 'Для набора мышечной массы употребляйте достаточно белка - 1.6-2.2г на кг веса тела.'
                });
            }
        }

        // Советы на основе статистики
        if (stats) {
            if (stats.totalWorkouts === 0) {
                tips.push({
                    icon: 'fitness_center',
                    title: 'Начните свой путь',
                    text: 'Выберите программу тренировок, соответствующую вашему уровню и целям.'
                });
            } else if (stats.totalWorkouts > 0 && stats.totalWorkouts < 5) {
                tips.push({
                    icon: 'emoji_events',
                    title: 'Отличное начало!',
                    text: 'Вы уже сделали первый шаг. Продолжайте в том же духе!'
                });
            }
        }

        // Ограничиваем количество советов до 5
        const finalTips = tips.slice(0, 5);

        // Очищаем контейнер
        tipsContainer.innerHTML = '';

        // Добавляем советы с анимацией
        finalTips.forEach((tip, index) => {
            const tipElement = document.createElement('div');
            tipElement.className = 'tip-card';
            tipElement.innerHTML = `
                <div class="tip-icon">
                    <span class="material-symbols-rounded">${tip.icon}</span>
                </div>
                <div class="tip-content">
                    <h3>${tip.title}</h3>
                    <p>${tip.text}</p>
        </div>
    `;

            tipsContainer.appendChild(tipElement);

            // Добавляем анимацию появления с задержкой
    setTimeout(() => {
                tipElement.classList.add('visible');
            }, index * 100);
        });

    } catch (error) {
        console.error('Ошибка при отображении советов:', error);
        tipsContainer.innerHTML = '<div class="no-data">Не удалось загрузить советы</div>';
    }
}

async function generateWorkoutPlan(program, profileData) {
    try {
        if (!program || !profileData) return null;

        const exercises = window.exercisesDB.exercises;
        const workouts = [];

        // Определяем базовые параметры на основе уровня подготовки
        const setsPerExercise = {
            'beginner': { min: 2, max: 3 },
            'intermediate': { min: 3, max: 4 },
            'advanced': { min: 4, max: 5 }
        }[profileData.level] || { min: 2, max: 3 };

        const repsPerSet = {
            'beginner': { min: 8, max: 12 },
            'intermediate': { min: 10, max: 15 },
            'advanced': { min: 12, max: 20 }
        }[profileData.level] || { min: 8, max: 12 };

        // Подбираем упражнения в зависимости от цели
        const targetMuscleGroups = {
            'weight_loss': ['legs', 'back', 'chest', 'core'], // Большие мышечные группы для сжигания калорий
            'muscle_gain': ['chest', 'back', 'legs', 'shoulders', 'arms'],
            'endurance': ['legs', 'core', 'back', 'cardio']
        }[profileData.goal] || ['legs', 'back', 'chest', 'core'];

        // Фильтруем упражнения по доступному оборудованию
        const availableEquipment = profileData.equipment || [];
        const workoutPlaces = profileData.workoutPlaces || [];

        program.workouts.forEach((workout, index) => {
            const workoutExercises = [];
            const usedMuscleGroups = new Set();
            const exercisesPerWorkout = profileData.level === 'beginner' ? 5 : 
                                      profileData.level === 'intermediate' ? 7 : 9;

            // Подбираем упражнения для тренировки
            for (let i = 0; i < exercisesPerWorkout; i++) {
                // Выбираем мышечную группу
                const availableMuscleGroups = targetMuscleGroups.filter(group => 
                    !usedMuscleGroups.has(group) || usedMuscleGroups.size >= targetMuscleGroups.length
                );
                const muscleGroup = availableMuscleGroups[Math.floor(Math.random() * availableMuscleGroups.length)];

                // Фильтруем подходящие упражнения
                const suitableExercises = Object.values(exercises).filter(exercise => {
                    const hasRequiredEquipment = !exercise.equipment || 
                        exercise.equipment.every(eq => availableEquipment.includes(eq));
                    const suitablePlace = !exercise.place || workoutPlaces.includes(exercise.place);
                    const matchesDifficulty = exercise.difficulty <= 
                        (profileData.level === 'beginner' ? 1 : 
                         profileData.level === 'intermediate' ? 2 : 3);
                    const matchesMuscleGroup = exercise.muscleGroups.includes(muscleGroup);

                    return hasRequiredEquipment && suitablePlace && matchesDifficulty && matchesMuscleGroup;
                });

                if (suitableExercises.length > 0) {
                    const exercise = suitableExercises[Math.floor(Math.random() * suitableExercises.length)];
                    const sets = Math.floor(Math.random() * (setsPerExercise.max - setsPerExercise.min + 1)) + setsPerExercise.min;
                    const reps = Math.floor(Math.random() * (repsPerSet.max - repsPerSet.min + 1)) + repsPerSet.min;

                    workoutExercises.push({
                        id: exercise.id,
                        name: exercise.name,
                        sets: sets,
                        reps: reps,
                        rest: profileData.goal === 'endurance' ? 30 : 
                              profileData.goal === 'weight_loss' ? 45 : 60,
                        type: exercise.type,
                        equipment: exercise.equipment,
                        description: exercise.description,
                        image: exercise.image
                    });

                    usedMuscleGroups.add(muscleGroup);
                }
            }

            // Добавляем разминку и заминку
            const warmup = {
                id: 'warmup',
                name: 'Разминка',
                duration: 5,
                type: 'warmup',
                description: 'Разогрев мышц и суставов перед тренировкой'
            };

            const cooldown = {
                id: 'cooldown',
                name: 'Заминка',
                duration: 5,
                type: 'cooldown',
                description: 'Растяжка и восстановление после тренировки'
            };

            workout.exercises = [warmup, ...workoutExercises, cooldown];
            workouts.push(workout);
        });

        return workouts;
    } catch (error) {
        console.error('Ошибка при генерации плана тренировок:', error);
        return null;
    }
}

function analyzeExercisesDatabase() {
    const exercises = window.exercisesDB.exercises;
    if (!exercises) {
        console.error('База упражнений не загружена');
        return;
    }

    const analysis = {
        total: Object.keys(exercises).length,
        byEquipment: {},
        byMuscleGroup: {},
        byDifficulty: {
            1: 0, // beginner
            2: 0, // intermediate
            3: 0  // advanced
        },
        byPlace: {
            home: 0,
            gym: 0,
            outdoor: 0,
            any: 0
        }
    };

    Object.values(exercises).forEach(exercise => {
        // Подсчет по оборудованию
        if (exercise.equipment && exercise.equipment.length) {
            exercise.equipment.forEach(eq => {
                analysis.byEquipment[eq] = (analysis.byEquipment[eq] || 0) + 1;
            });
        } else {
            analysis.byEquipment['bodyweight'] = (analysis.byEquipment['bodyweight'] || 0) + 1;
        }

        // Подсчет по мышечным группам
        exercise.muscleGroups.forEach(group => {
            analysis.byMuscleGroup[group] = (analysis.byMuscleGroup[group] || 0) + 1;
        });

        // Подсчет по сложности
        analysis.byDifficulty[exercise.difficulty] = (analysis.byDifficulty[exercise.difficulty] || 0) + 1;

        // Подсчет по месту выполнения
        if (exercise.place) {
            analysis.byPlace[exercise.place]++;
        } else {
            analysis.byPlace.any++;
        }
    });

    console.log('Анализ базы упражнений:', analysis);
    return analysis;
}