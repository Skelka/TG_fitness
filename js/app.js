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

// Добавляем глобальную переменную
let currentProgramId = null;

// Функция для безопасного показа попапа
async function showPopupSafe(options) {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 5;
        const delay = 200;

        const tryShowPopup = async () => {
            try {
                // Сначала пытаемся закрыть текущий попап
                try {
                    await tg.closePopup();
                    // Ждем немного после закрытия
                    await new Promise(r => setTimeout(r, 100));
            } catch (e) {
                    // Игнорируем ошибку, если попап не был открыт
                }

                await tg.showPopup(options);
                resolve(true);
            } catch (error) {
                attempts++;
                if (attempts < maxAttempts) {
                    // Увеличиваем задержку с каждой попыткой
                    await new Promise(r => setTimeout(r, delay * attempts));
                    await tryShowPopup();
                } else {
                    console.error('Не удалось показать попап после нескольких попыток');
                    resolve(false);
                }
            }
        };

        tryShowPopup();
    });
}

// Упрощаем обработчик закрытия попапа
tg.onEvent('popupClosed', async (event) => {
    if (!event || !event.button_id) return;

    // Добавляем небольшую задержку перед следующим действием
    await new Promise(r => setTimeout(r, 100));

        if (event.button_id.startsWith('start_program_')) {
            const programId = event.button_id.replace('start_program_', '');
            await startProgram(programId);
        } 
        else if (event.button_id.startsWith('schedule_')) {
            const programId = event.button_id.replace('schedule_', '');
            await showProgramSchedule(programId);
    }
});

// В начале файла app.js добавим проверку данных
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

    try {
        // Ждем инициализации Telegram WebApp
        await new Promise(resolve => {
            if (window.Telegram?.WebApp) {
                resolve();
            } else {
                const maxAttempts = 10;
                let attempts = 0;
                const interval = setInterval(() => {
                    attempts++;
                    if (window.Telegram?.WebApp) {
                        clearInterval(interval);
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        clearInterval(interval);
                        throw new Error('Telegram WebApp не загружен');
                    }
                }, 100);
            }
        });

        // Инициализируем основные переменные
        tg = window.Telegram.WebApp;
        mainButton = tg.MainButton;
        backButton = tg.BackButton;
        currentPeriod = 'week';

        // Базовая настройка WebApp
        tg.ready();
        tg.expand();
        tg.enableClosingConfirmation();

        // Проверяем наличие данных программ
        if (!window.programData) {
            throw new Error('Данные программ не загружены');
        }

        // Настраиваем кнопки
        mainButton.setText('Сохранить профиль');
        mainButton.hide();

        // Проверяем наличие Chart.js
        if (typeof Chart === 'undefined') {
            throw new Error('Chart.js не загружен');
        }

        // Инициализируем все компоненты
        setupEventListeners();
        setupProgramHandlers();
        setupPopupHandlers();
        loadProfile();
        loadActiveProgram();

        // Инициализируем страницу статистики только если мы на вкладке статистики
        const statsTab = document.getElementById('stats');
        if (statsTab && statsTab.classList.contains('active')) {
            await initStatisticsPage();
        }

        // Добавляем обработчик переключения вкладок
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (btn.dataset.tab === 'stats') {
                    await initStatisticsPage();
                }
            });
        });

        // Загружаем и отображаем данные веса
        const weightData = await getWeightData('week');
        if (weightData && weightData.length > 0) {
            updateWeightChart(weightData);
        }

        // Добавляем обработчики для кнопок периода
        setupPeriodButtons();

        console.log('Версия WebApp:', tg.version);
        console.log('Платформа:', tg.platform);
        console.log('Инициализация WebApp:', tg.initData);
        console.log('Доступные методы WebApp:', Object.keys(tg));

        setupProfileHandlers();

        // Рендерим карточки программ
        renderProgramCards();

    } catch (error) {
        console.error('Ошибка инициализации:', error);
    }
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

// Загрузка данных профиля
async function loadProfile() {
    try {
        // Получаем данные пользователя из Telegram
        const user = tg.initDataUnsafe?.user;
        if (user) {
            document.getElementById('profile-name').textContent = user.first_name;
            // Если есть фото профиля
            if (user.photo_url) {
                updateProfilePhoto(user.photo_url);
            }
        }

        // Загружаем сохраненные данные профиля
        const result = await getStorageItem('profile');
        if (result) {
            const profile = JSON.parse(result);
            fillProfileForm(profile);
            updateProfileStatus(profile);
        }
    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        showError(error);
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

// Сохранение профиля
async function saveProfile() {
    try {
        mainButton.setText('Сохранение...');
        mainButton.showProgress();

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

        // Сохраняем данные
        await setStorageItem('profile', JSON.stringify(profileData));

        // Обновляем UI
        updateProfileStatus(profileData);

        // Показываем успешное сохранение
        tg.HapticFeedback.notificationOccurred('success');
        mainButton.hideProgress();
        mainButton.setText('Сохранено ✓');
        setTimeout(() => {
            mainButton.setText('Сохранить профиль');
        }, 2000);

    } catch (error) {
        console.error('Ошибка при сохранении:', error);
        mainButton.hideProgress();
        mainButton.setText('Сохранить профиль');
        showError(error);
    }
}

// Вспомогательные функции
function showError(error) {
    tg.HapticFeedback.notificationOccurred('error');
    tg.showPopup({
        title: 'Ошибка',
        message: error.message,
        buttons: [{type: 'ok'}]
    });
}

// Функция для заполнения формы профиля
function fillProfileForm(profile) {
    const form = document.getElementById('profile-form');
    if (!form) return;

    // Заполняем основные поля
    const fields = ['age', 'gender', 'height', 'weight'];
    fields.forEach(field => {
        const input = form.querySelector(`[name="${field}"]`);
        if (input) {
            input.value = profile[field] || '';
        }
    });

    // Заполняем цель (радио-кнопки)
    if (profile.goal) {
        const goalInput = form.querySelector(`input[name="goal"][value="${profile.goal}"]`);
        if (goalInput) {
            goalInput.checked = true;
        }
    }

    // Заполняем места для тренировок
    if (profile.workoutPlaces) {
        const workoutPlaceInputs = form.querySelectorAll('input[name="workout_place"]');
        workoutPlaceInputs.forEach(input => {
            input.checked = profile.workoutPlaces.includes(input.value);
        });
    }

    // Заполняем доступное оборудование
    if (profile.equipment) {
        const equipmentInputs = form.querySelectorAll('input[name="equipment"]');
        equipmentInputs.forEach(input => {
            input.checked = profile.equipment.includes(input.value);
        });
    }

    // Заполняем уровень подготовки
    if (profile.level) {
        const levelInput = form.querySelector(`input[name="level"][value="${profile.level}"]`);
        if (levelInput) {
            levelInput.checked = true;
        }
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
            updateWeightChart(currentPeriod);
        }

        // Добавляем тактильный отклик
        tg.HapticFeedback.impactOccurred('light');
        
        // Убираем попап с сообщением об успехе
        // await showPopupSafe({
        //     message: 'Данные успешно обновлены',
        //     title: 'Вес сохранен',
        //     buttons: [{
        //         type: 'ok',
        //         text: 'OK'
        //     }]
        // });
    } catch (error) {
        console.error('Ошибка сохранения веса:', error);
        showError('Не удалось сохранить вес');
    }
}

// Получение данных о весе за выбранный период
async function getWeightData(period = 'week') {
    try {
        const result = await getStorageItem('weightHistory');
        let weightHistory = [];
        
        try {
            weightHistory = result ? JSON.parse(result) : [];
            if (!Array.isArray(weightHistory)) weightHistory = [];
        } catch (e) {
            console.warn('Ошибка парсинга истории весов:', e);
            return [];
        }

        // Если данных нет, возвращаем пустой массив
        if (weightHistory.length === 0) {
            return [];
        }

        const now = new Date();
        now.setHours(23, 59, 59, 999); // Конец текущего дня
        let startDate = new Date(now);

        switch (period) {
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(startDate.getDate() - 7);
        }

        startDate.setHours(0, 0, 0, 0); // Начало стартового дня

        // Фильтруем и сортируем данные
        const filteredData = weightHistory
            .filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate >= startDate && entryDate <= now;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        console.log('Отфильтрованные данные веса:', filteredData);
        return filteredData;

    } catch (error) {
        console.error('Ошибка при получении данных веса:', error);
        return [];
    }
}

// Функция для агрегации данных по периодам
function aggregateWeightData(data, period) {
    if (!data || data.length === 0) return [];

    const aggregated = [];
    
    switch (period) {
        case 'week':
            // Для недели оставляем ежедневные значения
            return data;
            
        case 'month':
            // Группируем по неделям
            const weekMap = new Map();
            data.forEach(entry => {
                const date = new Date(entry.date);
                // Получаем номер недели
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                const weekKey = weekStart.toISOString().split('T')[0];
                
                if (!weekMap.has(weekKey)) {
                    weekMap.set(weekKey, {
                        weights: [],
                        date: weekStart
                    });
                }
                weekMap.get(weekKey).weights.push(entry.weight);
            });
            
            // Вычисляем среднее значение для каждой недели
            weekMap.forEach((value, key) => {
                const avgWeight = value.weights.reduce((a, b) => a + b, 0) / value.weights.length;
                aggregated.push({
                    date: value.date,
                    weight: Number(avgWeight.toFixed(1))
                });
            });
            break;
            
        case 'year':
            // Группируем по месяцам
            const monthMap = new Map();
            data.forEach(entry => {
                const date = new Date(entry.date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                if (!monthMap.has(monthKey)) {
                    monthMap.set(monthKey, {
                        weights: [],
                        date: new Date(date.getFullYear(), date.getMonth(), 1)
                    });
                }
                monthMap.get(monthKey).weights.push(entry.weight);
            });
            
            // Вычисляем среднее значение для каждого месяца
            monthMap.forEach((value, key) => {
                const avgWeight = value.weights.reduce((a, b) => a + b, 0) / value.weights.length;
                aggregated.push({
                    date: value.date,
                    weight: Number(avgWeight.toFixed(1))
                });
            });
            break;
    }
    
    return aggregated.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Обновляем функцию обновления графика
async function updateWeightChart(selectedPeriod) {
    currentPeriod = selectedPeriod;
    
    const ctx = document.getElementById('weight-chart');
    if (!ctx) return;

    // Получаем данные о весе
    const weightHistoryStr = await getStorageItem('weightHistory');
    const weightHistory = weightHistoryStr ? JSON.parse(weightHistoryStr) : [];
    
    console.log('История весов:', weightHistory);

    if (weightHistory.length === 0) {
        ctx.innerHTML = '<div class="no-data">Нет данных о весе</div>';
        return;
    }

    const now = new Date();
    let startDate = new Date();
    let labels = [];
    let data = [];

    // Определяем диапазон дат для выбранного периода
    switch(selectedPeriod) {
        case 'week':
            startDate.setDate(now.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            for(let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                labels.push(d.toLocaleDateString('ru-RU', { weekday: 'short' }));
                
                // Находим все записи за этот день
                const dayWeights = weightHistory.filter(w => 
                    new Date(w.date).toISOString().split('T')[0] === dateStr
                );
                
                // Берем последнее значение за день
                const weight = dayWeights.length > 0 ? 
                    dayWeights[dayWeights.length - 1].weight : 
                    null;
                
                data.push(weight);
            }
            break;
            
        case 'month':
            startDate.setMonth(now.getMonth() - 1);
            startDate.setHours(0, 0, 0, 0);
            for(let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                labels.push(d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
                
                const dayWeights = weightHistory.filter(w => 
                    new Date(w.date).toISOString().split('T')[0] === dateStr
                );
                
                const weight = dayWeights.length > 0 ? 
                    dayWeights[dayWeights.length - 1].weight : 
                    null;
                
                data.push(weight);
            }
            break;
            
        case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            startDate.setHours(0, 0, 0, 0);
            for(let m = new Date(startDate); m <= now; m.setMonth(m.getMonth() + 1)) {
                const monthStart = new Date(m.getFullYear(), m.getMonth(), 1);
                const monthEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0);
                
                labels.push(m.toLocaleDateString('ru-RU', { month: 'short' }));
                
                const monthWeights = weightHistory.filter(w => {
                    const date = new Date(w.date);
                    return date >= monthStart && date <= monthEnd;
                });
                
                const avgWeight = monthWeights.length ? 
                    monthWeights.reduce((sum, w) => sum + w.weight, 0) / monthWeights.length : 
                    null;
                
                data.push(avgWeight);
            }
            break;
    }

    console.log('Данные для графика:', { labels, data });

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
}

// Настройка кнопок периода
function setupPeriodButtons() {
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            try {
                // Обновляем активную кнопку
                document.querySelectorAll('.period-btn').forEach(b => 
                    b.classList.remove('active'));
                btn.classList.add('active');
                
                // Обновляем период и перестраиваем график
                currentPeriod = btn.dataset.period;
                const data = await getWeightData(currentPeriod);
                
                // Обновляем график
                updateWeightChart(data);
                
            } catch (error) {
                console.error('Ошибка при обновлении графика:', error);
            }
        });
    });
}

// Обновляем обработчик переключения вкладок
function setupTabHandlers() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Убираем активный класс у всех кнопок
            tabBtns.forEach(b => b.classList.remove('active'));
            
            // Добавляем активный класс текущей кнопке
            btn.classList.add('active');
            
            // Показываем соответствующий контент
            switch(tabName) {
                case 'workouts':
                    showProgramsList();
                    break;
                case 'calendar':
                    showCalendar();
                    break;
                case 'stats':
                    showStats();
                    break;
                case 'profile':
                    showProfile();
                    break;
            }
        });
    });
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчик изменения полей формы
    const form = document.getElementById('profile-form');
    const formInputs = form.querySelectorAll('input, select');
    formInputs.forEach(input => {
        input.addEventListener('input', () => {
            const hasData = Array.from(formInputs).some(input => input.value);
            if (hasData) {
                mainButton.show();
                backButton.hide();
            } else {
                mainButton.hide();
            }
        });
    });

    // Скрытие клавиатуры
    document.addEventListener('click', function(e) {
        if (!e.target.matches('input') && !e.target.matches('select')) {
            if (document.activeElement instanceof HTMLInputElement || 
                document.activeElement instanceof HTMLSelectElement) {
                document.activeElement.blur();
            }
        }
    });

    // Выделение текста в числовых полях
    document.addEventListener('focus', function(e) {
        if (e.target.type === 'number') {
            e.target.select();
            tg.HapticFeedback.selectionChanged();
        }
    }, true);

    // Обработчик нажатия на MainButton
    mainButton.onClick(saveProfile);

    // Обработчик нажатия на BackButton
    backButton.onClick(() => {
        tg.close();
    });

    // Добавляем новые обработчики
    setupTabHandlers();

    // Обработка событий попапа
    tg.onEvent('popupClosed', async (event) => {
        console.log('Popup closed with event:', event);

        if (event.button_id) {
            if (event.button_id.startsWith('start_program_')) {
                const programId = event.button_id.replace('start_program_', '');
                await startProgram(programId);
            } 
            else if (event.button_id.startsWith('schedule_')) {
                const programId = event.button_id.replace('schedule_', '');
                const program = window.programData[programId];
                if (program) {
                    await showPopupSafe({
                        title: 'Расписание тренировок',
                        message: `
День 1-${program.workouts.length}, ${program.schedule}

${program.workouts.map((workout, index) => 
    `День ${index + 1}: ${workout.title}
⏱️ ${workout.duration} мин  •  🔥 ${workout.calories} ккал`
).join('\n\n')}
                    `,
                        buttons: [
                            {
                                type: 'default',
                                text: 'Начать программу',
                                id: `start_program_${programId}`
                            }
                        ]
                    });
                }
            }
        }
    });

    // Обработка кнопок в интерфейсе тренировки
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('complete-btn')) {
            completeWorkout();
        } else if (e.target.classList.contains('pause-btn')) {
            toggleWorkoutPause();
        }
    });

    // Добавляем обработчики для чекбоксов
    setupCheckboxHandlers();
}

// Добавим функцию для запуска тренировки
async function startWorkout(workout) {
    try {
        console.log('Начинаем тренировку:', workout);
        
        if (!workout) {
            throw new Error('Данные тренировки отсутствуют');
        }

        // Добавляем ID программы к тренировке
        workout.programId = currentProgramId;
        
        currentWorkout = workout;
        currentExerciseIndex = 0;
        currentSet = 1;
        workoutStartTime = Date.now();
        
        // Скрываем нижнюю навигацию
        document.querySelector('.tabs')?.classList.add('hidden');
        
        // Показываем первое упражнение
        renderExercise();

    } catch (error) {
        console.error('Ошибка при запуске тренировки:', error);
        showError('Не удалось начать тренировку');
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
function setupWorkoutHandlers() {
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
        message: `
${program.description}

📅 ${program.duration}
🏋️ ${program.schedule}
🔥 ${program.calories_per_week}

Ожидаемые результаты:
${program.results.map(result => `• ${result}`).join('\n')}`,
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
function updateProgramProgress(progress) {
    const programCard = document.querySelector(`.program-card[data-program="${progress.programId}"]`);
    if (!programCard) return;

    const progressBar = programCard.querySelector('.progress');
    const progressText = programCard.querySelector('.progress-text');
    
    if (progress.status === 'active') {
        // Вычисляем прогресс
        const program = programData[progress.programId];
        const totalWorkouts = program.workouts.length;
        const completedWorkouts = progress.completedWorkouts.length;
        const progressPercent = (completedWorkouts / totalWorkouts) * 100;

        // Обновляем UI
        if (progressBar) {
            progressBar.style.width = `${progressPercent}%`;
        }
        if (progressText) {
            progressText.textContent = `Прогресс: ${completedWorkouts}/${totalWorkouts} тренировок`;
        }

        // Обновляем кнопки
        const startBtn = programCard.querySelector('.start-btn');
        if (startBtn) {
            startBtn.textContent = 'Продолжить';
        }
    }
}

// Функция для запуска программы
async function startProgram(programId) {
    try {
        currentProgramId = programId; // Сохраняем ID текущей программы
        const program = window.programData[programId];
        
        if (!program) {
            throw new Error('Программа не найдена');
        }

        // Сохраняем активную программу
        const activeProgram = {
            id: programId,
            startDate: Date.now(),
            title: program.title,
            workouts: program.workouts,
            completedWorkouts: []
        };

        await setStorageItem('activeProgram', JSON.stringify(activeProgram));
        
        // Запускаем первую тренировку
        startWorkout(program.workouts[0]);

    } catch (error) {
        console.error('Ошибка при запуске программы:', error);
        showError('Не удалось начать программу');
    }
}

// Функция для возврата к списку программ
function showProgramsList() {
    const container = document.querySelector('.container');
    if (!container) return;

    // Очищаем контейнер
    container.innerHTML = '';

    // Добавляем нижнюю навигацию
    const bottomNav = document.createElement('nav');
    bottomNav.className = 'tabs';
    bottomNav.innerHTML = `
            <button class="tab-btn active" data-tab="workouts">
            <span class="material-symbols-rounded">exercise</span>
            <span>Тренировки</span>
            </button>
            <button class="tab-btn" data-tab="calendar">
                <span class="material-symbols-rounded">calendar_month</span>
            <span>Календарь</span>
            </button>
            <button class="tab-btn" data-tab="stats">
                <span class="material-symbols-rounded">monitoring</span>
            <span>Статистика</span>
            </button>
            <button class="tab-btn" data-tab="profile">
                <span class="material-symbols-rounded">person</span>
            <span>Профиль</span>
            </button>
    `;
    container.appendChild(bottomNav);

    // Добавляем контент
    const content = document.createElement('div');
    content.className = 'programs-list';
    container.appendChild(content);

    // Отображаем программы
    renderProgramCards();

    // Добавляем обработчики для табов
    setupTabHandlers();
}

// Функция для отображения тренировок программы
function renderWorkouts(program) {
    const container = document.querySelector('.workouts-list');
    if (!container) return;

    getStorageItem('activeProgram')
        .then(data => {
            const progress = data ? JSON.parse(data) : { completedWorkouts: [] };
            const completedWorkouts = new Set(progress.completedWorkouts.map(w => w.day));

            let html = '';
            program.workouts.forEach((workout, index) => {
                const isLocked = index > 0 && !completedWorkouts.has(index);
                const statusClass = completedWorkouts.has(index + 1) ? 'completed' : 
                                  isLocked ? 'locked' : '';

                html += `
                    <div class="workout-day ${statusClass}">
                        <div class="workout-day-content">
                            <div class="workout-day-icon">
                                <span class="material-symbols-rounded">fitness_center</span>
                            </div>
                            <div class="workout-day-text">
                                <div class="day-number">День ${index + 1}</div>
                                <h3>${workout.title}</h3>
                                <div class="workout-meta">
                                    <span>
                                        <span class="material-symbols-rounded">schedule</span>
                                        ${workout.duration} мин
                                    </span>
                                    <span>
                                        <span class="material-symbols-rounded">local_fire_department</span>
                                        ${workout.calories} ккал
                                    </span>
                                </div>
                                <div class="workout-actions">
                                    <button class="program-btn info-btn" onclick="showWorkoutDetails(${JSON.stringify(workout).replace(/"/g, '&quot;')})">
                                        <span class="material-symbols-rounded">info</span>
                                        Подробнее
                                    </button>
                                    <button class="program-btn start-btn" 
                                            onclick="startWorkout(${JSON.stringify(workout).replace(/"/g, '&quot;')})"
                                            ${isLocked ? 'disabled' : ''}>
                                        <span class="material-symbols-rounded">play_arrow</span>
                                        Начать
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        })
        .catch(error => {
            console.error('Ошибка при рендеринге тренировок:', error);
            showError('Не удалось загрузить тренировки');
        });
}

// Функция обновления статистики
async function updateStatistics() {
    try {
        // Проверяем, находимся ли мы на вкладке статистики
        const statsTab = document.getElementById('stats');
        if (!statsTab || !statsTab.classList.contains('active')) {
            // Если мы не на вкладке статистики, просто выходим
            return;
        }

        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);

        if (!activeProgram || !activeProgram.completedWorkouts) {
            return;
        }

        // Получаем контейнер статистики
        const statsContainer = document.querySelector('.statistics-container');
        if (!statsContainer) return;

        // Обновляем статистику
        const totalWorkouts = activeProgram.completedWorkouts.length;
        const totalCalories = activeProgram.completedWorkouts.reduce((sum, w) => sum + w.calories, 0);
        const totalTime = activeProgram.completedWorkouts.reduce((sum, w) => sum + w.duration, 0);
        const completionRate = Math.round((totalWorkouts / activeProgram.workouts.length) * 100);

        // Обновляем HTML с статистикой
        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">
                        <span class="material-symbols-rounded">fitness_center</span>
                    </div>
                    <div class="stat-value">${totalWorkouts}</div>
                    <div class="stat-label">Тренировок</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <span class="material-symbols-rounded">local_fire_department</span>
                    </div>
                    <div class="stat-value">${totalCalories}</div>
                    <div class="stat-label">Ккал сожжено</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <span class="material-symbols-rounded">schedule</span>
                    </div>
                    <div class="stat-value">${totalTime}</div>
                    <div class="stat-label">Минут</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <span class="material-symbols-rounded">trending_up</span>
                    </div>
                    <div class="stat-value">${completionRate}%</div>
                    <div class="stat-label">Выполнено</div>
                </div>
            </div>
            <div class="weight-chart-container">
                <h3>Динамика веса</h3>
                <div class="period-selector">
                    <button class="period-btn ${currentPeriod === 'week' ? 'active' : ''}" data-period="week">Неделя</button>
                    <button class="period-btn ${currentPeriod === 'month' ? 'active' : ''}" data-period="month">Месяц</button>
                    <button class="period-btn ${currentPeriod === 'year' ? 'active' : ''}" data-period="year">Год</button>
                </div>
                <canvas id="weight-chart"></canvas>
            </div>
        `;

        // Обновляем график веса
        await updateWeightChart(currentPeriod);

        // Добавляем обработчики для кнопок периода
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentPeriod = btn.dataset.period;
                await updateWeightChart(currentPeriod);
            });
        });

    } catch (error) {
        console.error('Ошибка при обновлении статистики:', error);
    }
}

// Функция форматирования времени
function formatDuration(minutes) {
    if (!minutes) return '0м';
    if (minutes < 60) return `${minutes}м`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
}

// Вспомогательная функция форматирования даты
function formatDate(date) {
    const options = { day: 'numeric', month: 'long' };
    return new Date(date).toLocaleDateString('ru-RU', options);
}

// Добавим функцию для загрузки активной программы при инициализации
async function loadActiveProgram() {
    try {
        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);
        
        if (activeProgram) {
            updateProgramProgress(activeProgram);
        }
    } catch (error) {
        console.error('Ошибка при загрузке активной программы:', error);
    }
}

// Обновляем функцию initApp
function initApp() {
    console.log('Версия WebApp:', tg.version);
    console.log('Платформа:', tg.platform);
    console.log('Инициализация WebApp:', tg.initData);
    console.log('Доступные методы WebApp:', Object.keys(tg));

    setupEventListeners();
    setupProgramHandlers();
    setupPopupHandlers();
    loadProfile();
    loadActiveProgram();
}

// Обновляем обработчики событий
function setupProgramHandlers() {
    document.querySelectorAll('.start-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const programId = btn.dataset.programId;
            if (programId) {
                await startProgram(programId);
            }
        });
    });

    document.querySelectorAll('.info-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const programId = btn.dataset.programId;
            if (programId) {
                showProgramInfo(programId);
            }
        });
    });
}

// Добавим функцию для начала конкретной тренировки
function startWorkoutSession(programId, workoutDay) {
    try {
        console.log('Starting workout session:', programId, workoutDay);
        const program = programData[programId];
        if (!program) {
            throw new Error('Программа не найдена');
        }

        const workout = program.workouts.find(w => w.day === workoutDay);
        if (!workout) {
            throw new Error('Тренировка не найдена');
        }

        // Переключаемся на вкладку тренировок
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => tab.style.display = 'none');
        const workoutsTab = document.getElementById('workouts');
        workoutsTab.style.display = 'block';

        // Показываем интерфейс тренировки
        workoutsTab.innerHTML = `
            <div class="workout-session">
                <h2>${workout.title}</h2>
                <div class="workout-timer">
                    <span class="time-remaining">${workout.duration}:00</span>
                </div>
                <div class="workout-progress">
                    <div class="progress-bar">
                        <div class="progress" style="width: 0%"></div>
                    </div>
                </div>
                <div class="exercises-list">
                    ${workout.exercises.map((exercise, index) => `
                        <div class="exercise-item ${index === 0 ? 'active' : ''}">
                            <h4>${exercise.name}</h4>
                            <p>${exercise.sets} подхода × ${exercise.reps}</p>
                            <p>Отдых: ${exercise.rest} сек</p>
                        </div>
                    `).join('')}
                </div>
                <div class="workout-controls">
                    <button class="workout-btn pause-btn">
                        <span class="material-symbols-rounded">pause</span>
                        Пауза
                    </button>
                    <button class="workout-btn complete-btn">
                        <span class="material-symbols-rounded">check</span>
                        Завершить
                    </button>
                </div>
            </div>
        `;

        // Добавляем обработчики для кнопок
        setupWorkoutControls(workout, programId);

        // Запускаем таймер
        startWorkoutTimer(workout.duration * 60);

        console.log('Workout session started successfully');

    } catch (error) {
        console.error('Ошибка при запуске тренировки:', error);
        showError(error);
    }
}

// Функция для управления таймером тренировки
function startWorkoutTimer(duration) {
    let timeRemaining = duration;
    const timerElement = document.querySelector('.time-remaining');
    const progressBar = document.querySelector('.workout-progress .progress');
    
    const timer = setInterval(() => {
        timeRemaining--;
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const progress = 100 - (timeRemaining / duration * 100);
        progressBar.style.width = `${progress}%`;
        
        if (timeRemaining <= 0) {
            clearInterval(timer);
            completeWorkout();
        }
    }, 1000);

    // Сохраняем таймер в глобальной переменной для возможности паузы
    window.workoutTimer = timer;
}

// Функция для настройки контролов тренировки
function setupWorkoutControls(workout, programId) {
    const pauseBtn = document.querySelector('.pause-btn');
    const completeBtn = document.querySelector('.complete-btn');
    
    pauseBtn.addEventListener('click', () => {
        if (pauseBtn.classList.contains('paused')) {
            // Возобновляем тренировку
            startWorkoutTimer(parseInt(document.querySelector('.time-remaining').textContent));
            pauseBtn.classList.remove('paused');
            pauseBtn.innerHTML = '<span class="material-symbols-rounded">pause</span>Пауза';
        } else {
            // Ставим на паузу
            clearInterval(window.workoutTimer);
            pauseBtn.classList.add('paused');
            pauseBtn.innerHTML = '<span class="material-symbols-rounded">play_arrow</span>Продолжить';
        }
        tg.HapticFeedback.impactOccurred('medium');
    });

    completeBtn.addEventListener('click', () => {
        clearInterval(window.workoutTimer);
        completeWorkout(workout, programId);
        tg.HapticFeedback.impactOccurred('medium');
    });
}

// Добавим константы для расчета калорий
const CALORIES_PER_MINUTE = {
    cardio: 8,      // Кардио упражнения
    strength: 5,    // Силовые упражнения
    hiit: 10,       // Высокоинтенсивные интервалы
    rest: 1         // Отдых между подходами
};

// Обновим функцию handleCompleteClick
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

// Обновляем функцию handleExerciseComplete
function handleExerciseComplete() {
    const exercise = currentWorkout.exercises[currentExerciseIndex];
    console.log('Завершение упражнения:', {
        exercise,
        currentSet,
        totalSets: exercise.sets,
        currentExerciseIndex,
        totalExercises: currentWorkout.exercises.length
    });

    if (currentSet < exercise.sets) {
        currentSet++; // Увеличиваем счетчик подходов
        showRestScreen(true); // true означает отдых между подходами
    } else if (currentExerciseIndex < currentWorkout.exercises.length - 1) {
        // Если это последний подход, но есть следующее упражнение
        currentExerciseIndex++;
        currentSet = 1;
        showRestScreen(false); // false означает отдых между упражнениями
            } else {
        // Если это последний подход последнего упражнения
        completeWorkout(currentWorkout);
    }
}

// Обновляем функцию moveToNextExercise
function moveToNextExercise() {
    if (currentExerciseIndex < currentWorkout.exercises.length - 1) {
        currentExerciseIndex++;
        currentSet = 1;
        renderExercise();
    } else {
        // Передаем текущую тренировку напрямую
        completeWorkout(currentWorkout);
    }
}

// Обновляем функцию startTimer
function startTimer(duration) {
    // Проверяем, что таймер не запущен
    if (timerInterval) {
        console.log('Таймер уже запущен');
        return;
    }

    console.log('Запускаем таймер с длительностью:', duration);

    // Устанавливаем начальное значение
    timerValue = duration;
    updateCounter(timerValue);

    let lastTick = Date.now();
    
    // Запускаем таймер
    timerInterval = setInterval(() => {
        const now = Date.now();
        const delta = now - lastTick;
        lastTick = now;
        
        // Уменьшаем значение
        timerValue--;
        updateCounter(timerValue);

        // Вибрация на последних секундах
        if (timerValue <= 3 && timerValue > 0) {
            tg.HapticFeedback.impactOccurred('medium');
        }

        // Проверяем завершение
        if (timerValue <= 0) {
            console.log('Таймер завершен');
            clearInterval(timerInterval);
            timerInterval = null;
            
            handleExerciseComplete();
        }
    }, 1000);

    console.log('Таймер запущен, ID интервала:', timerInterval);
}

// Обновляем функцию completeWorkout
async function completeWorkout(workout) {
    try {
        console.log('Завершение тренировки:', workout);
        
        if (!workout) {
            throw new Error('Данные о тренировке отсутствуют');
        }

        // Очищаем все таймеры
        clearTimers();

        // Вычисляем фактическое время тренировки
        const actualDuration = Math.round((Date.now() - workoutStartTime) / (1000 * 60));

        // Получаем текущий прогресс
        let activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);

        if (!activeProgram) {
            // Если нет активной программы, создаем новую
            activeProgram = {
                id: workout.programId || 'default',
                startDate: Date.now(),
                completedWorkouts: []
            };
        }

        // Добавляем завершенную тренировку
            const completedWorkout = {
                id: Date.now(),
                date: Date.now(),
            day: workout.day,
            title: workout.title,
                duration: actualDuration,
            calories: workout.calories,
            type: workout.type
            };

            if (!Array.isArray(activeProgram.completedWorkouts)) {
                activeProgram.completedWorkouts = [];
            }

            activeProgram.completedWorkouts.push(completedWorkout);

        // Сохраняем обновленный прогресс
            await setStorageItem('activeProgram', JSON.stringify(activeProgram));

        // Показываем экран завершения
        showWorkoutComplete(actualDuration, workout.calories);

    } catch (error) {
        console.error('Ошибка при завершении тренировки:', error);
        showError('Произошла ошибка при сохранении результатов');
    }
}

// Обновляем функцию showWorkoutComplete
function showWorkoutComplete(duration, calories) {
    console.log('Показываем экран завершения:', { duration, calories });
    
    const container = document.querySelector('.container');
    if (!container) return;

        container.innerHTML = `
            <div class="workout-complete">
                <div class="complete-icon">
                    <span class="material-symbols-rounded">check_circle</span>
                </div>
                <h2>Тренировка завершена!</h2>
                <div class="workout-stats">
                    <div class="stat-item">
                    <span class="stat-value">${duration || 0}</span>
                        <span class="stat-label">минут</span>
                    </div>
                    <div class="stat-item">
                    <span class="stat-value">${calories || 0}</span>
                        <span class="stat-label">ккал</span>
                    </div>
                </div>
                <button class="finish-btn" onclick="showProgramsList()">
                    <span class="material-symbols-rounded">home</span>
                    Вернуться
                </button>
            </div>
        `;

    // Показываем нижнюю навигацию
        document.querySelector('.bottom-nav')?.classList.remove('hidden');
    
    // Добавляем тактильный отклик
    tg.HapticFeedback.notificationOccurred('success');
}

// Добавим функцию для обработки изменений в чекбоксах
function setupCheckboxHandlers() {
    const form = document.getElementById('profile-form');
    if (!form) return;

    // Обработчики для радио-кнопок целей
    const goalInputs = form.querySelectorAll('input[name="goal"]');
    goalInputs.forEach(input => {
        input.addEventListener('change', () => {
            mainButton.show();
        });
    });

    // Обработчики для чекбоксов мест тренировок
    const workoutPlaceInputs = form.querySelectorAll('input[name="workout_place"]');
    workoutPlaceInputs.forEach(input => {
        input.addEventListener('change', () => {
            mainButton.show();
        });
    });

    // Обработчики для чекбоксов оборудования
    const equipmentInputs = form.querySelectorAll('input[name="equipment"]');
    equipmentInputs.forEach(input => {
        input.addEventListener('change', () => {
            mainButton.show();
        });
    });
}

// Функция для отображения календаря
function renderCalendar() {
    const calendarContainer = document.getElementById('calendar');
    if (!calendarContainer) return;

    // Получаем активную программу
    getStorageItem('activeProgram')
        .then(data => {
            const programProgress = data ? JSON.parse(data) : null;
            if (!programProgress) return;

            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            // Отрисовываем календарь с тренировками
            const calendar = generateCalendar(currentYear, currentMonth, programProgress.plannedWorkouts);
            calendarContainer.innerHTML = calendar;

            // Добавляем обработчики для навигации по календарю
            setupCalendarNavigation(programProgress.plannedWorkouts);
        })
        .catch(console.error);
}

// Функция генерации календаря с тренировками
function generateCalendar(year, month, workouts) {
    const now = new Date();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    let calendar = `
        <div class="calendar-header">
            <button class="calendar-nav-btn prev">←</button>
            <h2>${monthNames[month]} ${year}</h2>
            <button class="calendar-nav-btn next">→</button>
                </div>
        <div class="calendar-weekdays">
            <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div>
            <div>Пт</div><div>Сб</div><div>Вс</div>
        </div>
        <div class="calendar-days">
    `;

    // Добавляем пустые ячейки в начале
    let firstDayOfWeek = firstDay.getDay() || 7;
    for (let i = 1; i < firstDayOfWeek; i++) {
        calendar += '<div class="calendar-day empty"></div>';
    }

    // Добавляем дни месяца
    for (let day = 1; day <= lastDay.getDate(); day++) {
        let classes = ['calendar-day'];
        if (day === now.getDate() && month === now.getMonth() && year === now.getFullYear()) {
            classes.push('today');
        }

        // Проверяем, есть ли тренировка в этот день
        const workout = workouts?.find(w => {
            const workoutDate = new Date(w.plannedDate);
            return workoutDate.getDate() === day && 
                   workoutDate.getMonth() === month && 
                   workoutDate.getFullYear() === year;
        });

        if (workout) {
            classes.push('has-workout');
        }

        calendar += `
            <div class="${classes.join(' ')}" data-date="${day}">
                ${day}
                ${workout ? `<div class="workout-indicator"></div>` : ''}
            </div>
        `;
    }

    calendar += '</div>';
    return calendar;
}

// Создаем элемент дня
function createDayElement(day) {
    const div = document.createElement('div');
    div.className = 'calendar-day';
    div.textContent = day;
    return div;
}

// Загружаем дни тренировок
async function loadWorkoutDays() {
    try {
        const result = await getStorageItem('activeProgram');
        if (result) {
            const program = JSON.parse(result);
            
            // Отмечаем выполненные тренировки
            if (program.completedWorkouts) {
                program.completedWorkouts.forEach(workout => {
                    const date = new Date(workout.completedAt);
                    markWorkoutDay(date, 'completed');
                });
            }
            
            // Отмечаем запланированные тренировки
            if (program.workoutDays) {
                program.workoutDays.forEach(workoutDay => {
                    const date = new Date(workoutDay.date);
                    if (date > new Date()) { // Только будущие тренировки
                        markWorkoutDay(date, 'planned');
                    }
                });
            }
        }
    } catch (error) {
        console.error('Ошибка при загрузке дней тренировок:', error);
    }
}

// Отмечаем день тренировки
function markWorkoutDay(date, type) {
    const days = document.querySelectorAll('.calendar-day');
    const dayNumber = date.getDate();
    
    days.forEach(day => {
        if (day.textContent === String(dayNumber)) {
            // Добавляем иконку штанги
            if (!day.querySelector('.workout-icon')) {
                const icon = document.createElement('span');
                icon.className = 'material-symbols-rounded workout-icon';
                icon.textContent = 'fitness_center';
                day.appendChild(icon);
            }
            day.classList.add(type);
        }
    });
}

// Обновляем стили для календаря
const styles = `
    .calendar-day {
        position: relative;
        min-height: 40px;
    }
    
    .workout-icon {
        position: absolute;
        bottom: 2px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 14px;
        color: var(--tg-theme-button-color);
    }
    
    .calendar-day.completed .workout-icon {
        color: #4CAF50;
    }
    
    .calendar-day.planned .workout-icon {
        color: var(--tg-theme-button-color);
    }
`;

// Добавляем стили
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Вызываем рендер календаря при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    renderCalendar();
});

// Функция для добавления тренировки в календарь
async function addWorkoutToCalendar(workout, date) {
    try {
        // Проверяем поддержку календаря
        if (!tg.platform.toLowerCase().includes('android') && !tg.platform.toLowerCase().includes('ios')) {
            console.log('Платформа не поддерживает добавление в календарь');
            return;
        }

        const calendarEvent = {
            title: `Тренировка: ${workout.title}`,
            description: `Длительность: ${workout.duration} мин\nТип: ${workout.type}\n\nУпражнения:\n${
                workout.exercises.map(ex => `- ${ex.name} (${ex.sets}×${ex.reps})`).join('\n')
            }`,
            start_date: Math.floor(date.getTime() / 1000),
            end_date: Math.floor((date.getTime() + workout.duration * 60000) / 1000)
        };

        // Используем CloudStorage для сохранения расписания
        await tg.CloudStorage.setItem(`workout_${workout.day}`, JSON.stringify(calendarEvent));
        
        console.log('Тренировка сохранена:', calendarEvent);
        
    } catch (error) {
        console.error('Ошибка при сохранении тренировки:', error);
        // Не показываем ошибку пользователю, просто логируем
    }
}

// Добавляем функцию setupCalendarNavigation
function setupCalendarNavigation(workouts) {
    const prevBtn = document.querySelector('.calendar-nav-btn.prev');
    const nextBtn = document.querySelector('.calendar-nav-btn.next');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            const currentDate = new Date();
            currentDate.setMonth(currentDate.getMonth() - 1);
            const calendar = generateCalendar(currentDate.getFullYear(), currentDate.getMonth(), workouts);
            document.getElementById('calendar').innerHTML = calendar;
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const currentDate = new Date();
            currentDate.setMonth(currentDate.getMonth() + 1);
            const calendar = generateCalendar(currentDate.getFullYear(), currentDate.getMonth(), workouts);
            document.getElementById('calendar').innerHTML = calendar;
        });
    }
}

// Добавим автоматическое сохранение веса при изменении в профиле
function setupProfileHandlers() {
    const weightInput = document.querySelector('input[name="weight"]');
    if (weightInput) {
        weightInput.addEventListener('change', async () => {
            const weight = parseFloat(weightInput.value);
            if (!isNaN(weight) && weight > 0) {
                await saveWeight(weight);
            }
        });
    }
}

// Добавим функцию для работы с фото профиля
function updateProfilePhoto(photoUrl) {
    const profilePhoto = document.getElementById('profile-photo');
    if (profilePhoto) {
        const defaultImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23cccccc"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="14" fill="%23ffffff" text-anchor="middle" dy=".3em"%3EНет фото%3C/text%3E%3C/svg%3E';
        
        profilePhoto.src = photoUrl || defaultImage;
        profilePhoto.onerror = () => {
            profilePhoto.src = defaultImage;
        };
    }
}

// Обновим функцию очистки данных для удаления тестовых значений
async function clearAllData() {
    try {
        // Очищаем все данные в CloudStorage и localStorage
        const keys = ['weightHistory', 'activeProgram', 'profile'];

        // Очищаем данные последовательно
        for (const key of keys) {
            await setStorageItem(key, '[]');
            localStorage.removeItem(key);
        }

        // Показываем сообщение об успехе
        await showPopupSafe({
            title: 'Данные очищены',
            message: 'Все данные успешно удалены',
            buttons: [{type: 'ok'}]
        });

        // Перезагружаем страницу
        location.reload();
    } catch (error) {
        console.error('Ошибка при очистке данных:', error);
        showError(error);
    }
}

// Добавим функцию инициализации страницы статистики
async function initStatisticsPage() {
    try {
        // Проверяем наличие Chart.js
        if (typeof Chart === 'undefined') {
            console.error('Chart.js не загружен');
            return;
        }

        // Сначала обновляем статистику
        await updateStatistics();

        // Затем инициализируем график веса
        const weightData = await getWeightData(currentPeriod);
        if (weightData && weightData.length > 0) {
            updateWeightChart(weightData);
        } else {
            // Показываем сообщение об отсутствии данных
            const chartContainer = document.getElementById('weight-chart');
            if (chartContainer) {
                chartContainer.innerHTML = '<div class="no-data">Нет данных о весе</div>';
            }
        }

        // Добавляем обработчики для кнопок периода
        setupPeriodButtons();

    } catch (error) {
        console.error('Ошибка при инициализации страницы статистики:', error);
    }
}

// Добавим функцию для создания карточек программ
function renderProgramCards() {
    const container = document.querySelector('.programs-list');
    if (!container) return;

    container.innerHTML = Object.entries(window.programData).map(([id, program]) => `
        <div class="program-card">
            <div class="program-info">
                <div class="program-icon">
                    <span class="material-symbols-rounded">${program.icon || 'fitness_center'}</span>
                </div>
                <div class="program-details">
                    <h3>${program.title}</h3>
                    <p>${program.description}</p>
                    <div class="program-meta">
                        <div class="program-schedule">
                            <span class="material-symbols-rounded">calendar_today</span>
                            ${program.schedule}
                        </div>
                        <div class="program-difficulty">
                            <span class="material-symbols-rounded">fitness_center</span>
                            ${program.difficulty}
                        </div>
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

    // Устанавливаем обработчики после рендеринга
    setupProgramHandlers();
}

// Функция для отображения тренировок программы
async function showProgramWorkouts(program) {
    console.log('Показываем программу:', program);
    console.log('Тренировки в программе:', program.workouts);
    console.log('Количество тренировок:', program.workouts?.length);

    const programsList = document.querySelector('.programs-list');
    if (!program || !program.workouts) {
        console.error('Программа или тренировки не определены:', program);
        return;
    }

    programsList.innerHTML = `
        <div class="program-workouts">
            <div class="program-header">
                <button class="back-btn">
                    <span class="material-symbols-rounded">arrow_back</span>
                </button>
                <h2>${program.title}</h2>
            </div>
            <div class="program-days">
                ${program.workouts.map((workout, index) => {
                    console.log('Рендеринг тренировки:', workout);
                    return `
                        <div class="workout-day">
                            <div class="day-header">
                                <span class="day-number">День ${workout.day}</span>
                            </div>
                            <div class="day-info">
                                <h3>${workout.title}</h3>
                                <div class="workout-meta">
                                    <span>
                                        <span class="material-symbols-rounded">timer</span>
                                        ${workout.duration} мин
                                    </span>
                                    <span>
                                        <span class="material-symbols-rounded">local_fire_department</span>
                                        ${workout.calories} ккал
                                    </span>
                                </div>
                            </div>
                            <button class="start-workout-btn" data-workout-index="${index}">
                                <span class="material-symbols-rounded">play_arrow</span>
                                Начать тренировку
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    // Добавляем обработчики
    const backBtn = programsList.querySelector('.back-btn');
    backBtn?.addEventListener('click', () => {
        renderProgramCards();
        tg.HapticFeedback.impactOccurred('medium');
    });

    const workoutBtns = programsList.querySelectorAll('.start-workout-btn');
    workoutBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const workoutIndex = parseInt(btn.dataset.workoutIndex);
            const workout = program.workouts[workoutIndex];
            if (workout && workout.exercises && workout.exercises.length > 0) {
                startWorkout(workout);
                tg.HapticFeedback.impactOccurred('medium');
            } else {
                console.error('Некорректные данные тренировки:', workout);
                tg.showPopup({
                    title: 'Ошибка',
                    message: 'Не удалось загрузить тренировку. Попробуйте позже.',
                    buttons: [{type: 'ok'}]
                });
            }
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
        input.addEventListener('change', saveProfileSettings);
    });

    // Обработчики для места тренировок
    placeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            placeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            saveProfileSettings();
        });
    });
}

async function saveProfileSettings() {
    const profile = await loadProfile() || {};
    
    // Сохраняем выбранное оборудование
    const equipment = Array.from(document.querySelectorAll('input[name="equipment"]:checked'))
        .map(input => input.value);
    
    // Сохраняем место тренировок
    const workoutPlace = document.querySelector('.place-btn.active')?.dataset.place || 'home';

    // Обновляем профиль
    const updatedProfile = {
        ...profile,
        equipment,
        workoutPlace
    };

    await setStorageItem('profile', JSON.stringify(updatedProfile));
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
            Math.round((totalWorkouts / (activeProgram.workouts?.length || 1)) * 100) : 0;

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-mini-card">
                    <div class="stat-icon">
                        <span class="material-symbols-rounded">fitness_center</span>
                </div>
                    <div class="stat-content">
                        <span class="stat-value">${totalWorkouts}</span>
                        <span class="stat-label">Тренировок</span>
                    </div>
                </div>
                <div class="stat-mini-card">
                    <div class="stat-icon">
                    <span class="material-symbols-rounded">timer</span>
                </div>
                    <div class="stat-content">
                        <span class="stat-value">${totalDuration}м</span>
                        <span class="stat-label">Общее время</span>
                    </div>
                </div>
                <div class="stat-mini-card">
                    <div class="stat-icon">
                    <span class="material-symbols-rounded">local_fire_department</span>
                </div>
                    <div class="stat-content">
                        <span class="stat-value">${totalCalories}</span>
                        <span class="stat-label">Ккал сожжено</span>
                    </div>
                </div>
                <div class="stat-mini-card">
                    <div class="stat-icon">
                    <span class="material-symbols-rounded">trending_up</span>
                </div>
                    <div class="stat-content">
                        <span class="stat-value">${goalProgress}%</span>
                        <span class="stat-label">Достижение цели</span>
            </div>
                </div>
            </div>
            <div class="weight-section">
                    <h3>Динамика веса</h3>
                    <div class="period-selector">
                        <button class="period-btn active" data-period="week">Неделя</button>
                        <button class="period-btn" data-period="month">Месяц</button>
                        <button class="period-btn" data-period="year">Год</button>
                </div>
                <canvas id="weight-chart"></canvas>
            </div>
        `;

        // Добавляем нижнюю навигацию
        const bottomNav = document.createElement('nav');
        bottomNav.className = 'tabs';
        bottomNav.innerHTML = `
            <button class="tab-btn" data-tab="workouts">
                <span class="material-symbols-rounded">exercise</span>
                <span>Тренировки</span>
            </button>
            <button class="tab-btn" data-tab="calendar">
                <span class="material-symbols-rounded">calendar_month</span>
                <span>Календарь</span>
            </button>
            <button class="tab-btn active" data-tab="stats">
                <span class="material-symbols-rounded">monitoring</span>
                <span>Статистика</span>
            </button>
            <button class="tab-btn" data-tab="profile">
                <span class="material-symbols-rounded">person</span>
                <span>Профиль</span>
            </button>
        `;
        container.appendChild(bottomNav);

        // Инициализируем график веса
        const weightData = await getWeightData(currentPeriod || 'week');
        await updateWeightChart(weightData);

        // Добавляем обработчики для кнопок периода
        setupPeriodButtons();
        setupTabHandlers();

    } catch (error) {
        console.error('Ошибка при отображении статистики:', error);
        showError('Не удалось загрузить статистику');
    }
}

// Функция для получения персонализированных советов
async function getTips() {
    try {
        // Получаем данные профиля и прогресса
        const [profileData, programData] = await Promise.all([
            getStorageItem('profile').then(data => data ? JSON.parse(data) : null),
            getStorageItem('activeProgram').then(data => data ? JSON.parse(data) : null)
        ]);

        const tips = [];

        if (profileData) {
            // Советы на основе цели
            switch(profileData.goal) {
                case 'weight_loss':
                    tips.push({
                        title: 'Контроль калорий',
                        text: 'Старайтесь создавать дефицит 500-700 ккал в день для здорового снижения веса'
                    });
                    break;
                case 'muscle_gain':
                    tips.push({
                        title: 'Белок для роста мышц',
                        text: 'Употребляйте 1.6-2.2г белка на кг веса тела для оптимального роста мышц'
                    });
                    break;
            }

            // Советы на основе места тренировок
            if (profileData.workoutPlace === 'home') {
                tips.push({
                    title: 'Тренировки дома',
                    text: 'Используйте мебель для увеличения нагрузки: стул для отжиманий, кровать для упражнений на пресс'
                });
            }
        }

        if (programData?.completedWorkouts) {
            // Советы на основе прогресса
            const workoutsThisWeek = programData.completedWorkouts.filter(w => 
                new Date(w.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ).length;

            if (workoutsThisWeek < 2) {
                tips.push({
                    title: 'Регулярность тренировок',
                    text: 'Старайтесь тренироваться минимум 3 раза в неделю для лучших результатов'
                });
            }
        }

        // Общие советы по здоровью
        tips.push({
            title: 'Водный баланс',
            text: 'Пейте 30-40 мл воды на кг веса тела в день для поддержания здоровья'
        });

        return tips;
    } catch (error) {
        console.error('Ошибка при получении советов:', error);
        return [];
    }
}

// Функция для отображения советов
async function renderTips() {
    const tipsContainer = document.querySelector('.tips-list');
    if (!tipsContainer) return;

    const tips = await getTips();
    
    tipsContainer.innerHTML = tips.map(tip => `
        <div class="tip-card">
            <h3>${tip.title}</h3>
            <p>${tip.text}</p>
        </div>
    `).join('');
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

// Добавляем функцию для показа экрана отдыха
function showRestScreen(isBetweenSets) {
    const exercise = currentWorkout.exercises[currentExerciseIndex];
    const nextExercise = currentWorkout.exercises[currentExerciseIndex + 1];
    isResting = true;
    restTimeLeft = exercise.rest || 30;
    const initialRestTime = restTimeLeft;

    const container = document.querySelector('.container');
    if (!container) return;

    // Определяем текст для следующего действия
    let nextText;
    if (isBetweenSets) {
        nextText = `Подход ${currentSet} из ${exercise.sets}`;
    } else {
        nextText = 'Следующее упражнение:';
        if (nextExercise) {
            nextText += `\n${nextExercise.name}`;
        }
    }

    container.innerHTML = `
        <div class="workout-session">
            <div class="rest-screen">
                <div class="rest-icon">
                    <span class="material-symbols-rounded">timer</span>
                </div>
                <h3>Отдых</h3>
                <div class="rest-subtitle">${nextText}</div>
                <div class="rest-progress">
                    <div class="rest-progress-bar" style="width: 100%"></div>
                </div>
                <div class="rest-timer">${restTimeLeft}</div>
                <button class="skip-rest-btn">
                    <span class="material-symbols-rounded">skip_next</span>
                    Пропустить
                </button>
            </div>
        </div>
    `;

    const timerElement = container.querySelector('.rest-timer');
    const progressBar = container.querySelector('.rest-progress-bar');

    // Запускаем таймер отдыха
    restInterval = setInterval(() => {
        restTimeLeft--;
        
        // Обновляем таймер
        if (timerElement) {
            timerElement.textContent = restTimeLeft;
            
            // Добавляем класс для анимации на последних секундах
            if (restTimeLeft <= 3) {
                timerElement.classList.add('ending');
            }
        }

        // Обновляем прогресс-бар
        if (progressBar) {
            const progress = (restTimeLeft / initialRestTime) * 100;
            progressBar.style.width = `${progress}%`;
        }

        if (restTimeLeft <= 3 && restTimeLeft > 0) {
            tg.HapticFeedback.impactOccurred('medium');
        }

        if (restTimeLeft <= 0) {
            clearInterval(restInterval);
                renderExercise();
        }
    }, 1000);

    // Добавляем обработчик для кнопки пропуска
    const skipBtn = container.querySelector('.skip-rest-btn');
    skipBtn?.addEventListener('click', () => {
        clearInterval(restInterval);
        tg.HapticFeedback.impactOccurred('medium');
            renderExercise();
    });
}

// Обновим функцию renderExercise
function renderExercise() {
    console.log('Рендеринг упражнения:', {
                currentExerciseIndex,
        currentSet,
        workout: currentWorkout
    });

    const container = document.querySelector('.container');
    if (!container || !currentWorkout) {
        console.error('Нет контейнера или текущей тренировки');
        return;
    }

    const exercise = currentWorkout.exercises[currentExerciseIndex];
    if (!exercise) {
        console.error('Упражнение не найдено');
        return;
    }

    // Определяем режим таймера
    isTimerMode = exercise.reps.toString().includes('сек') || 
                  exercise.reps.toString().includes('мин');
    
    // Устанавливаем начальное значение таймера
    if (isTimerMode) {
        const repsStr = exercise.reps.toString();
        const numericValue = parseInt(repsStr.replace(/[^0-9]/g, ''));
        
        if (isNaN(numericValue)) {
            timerValue = 30; // Значение по умолчанию
        } else {
            timerValue = numericValue;
        }

        // Минимальные значения для разных типов упражнений
        const exerciseName = exercise.name.toLowerCase();
        if (exerciseName.includes('разминка')) {
            timerValue = Math.max(timerValue, 30);
        } else if (exerciseName.includes('растяжка')) {
            timerValue = Math.max(timerValue, 20);
        } else if (exerciseName.includes('планка')) {
            timerValue = Math.max(timerValue, 30);
        } else {
            timerValue = Math.max(timerValue, 10);
        }
    } else {
        timerValue = parseInt(exercise.reps) || 0;
    }

    // Очищаем существующие таймеры
    clearTimers();

    // Получаем анимацию для упражнения
    const exerciseAnimation = window.getExerciseAnimation(exercise.name);

    container.innerHTML = `
        <div class="workout-session">
            <div class="workout-header">
                <button class="back-btn">
                    <span class="material-symbols-rounded">arrow_back</span>
                </button>
                <div class="workout-title">
                    <div>${currentWorkout.title}</div>
                    <div>${exercise.name}</div>
                </div>
                <div class="workout-progress">
                    ${currentExerciseIndex + 1}/${currentWorkout.exercises.length}
                </div>
            </div>

            <div class="exercise-display">
                <img class="exercise-background" 
                     src="${exerciseAnimation}" 
                     alt="${exercise.name}"
                     onerror="this.src='${window.exerciseAnimations.default}'">
                
                <div class="exercise-content">
                    <h2 class="exercise-name">${exercise.name}</h2>
                    <div class="exercise-subtitle">Подход ${currentSet} из ${exercise.sets}</div>
                    
                    <div class="exercise-counter">
                        <div class="counter-number">${timerValue}</div>
                        <div class="counter-label">${isTimerMode ? 'секунд' : 'повторений'}</div>
                    </div>
                </div>
            </div>

            <div class="exercise-controls">
                ${isTimerMode ? `
                    <button class="control-btn minus-btn">
                        <span class="material-symbols-rounded">remove</span>
                    </button>
                ` : ''}
                <button class="complete-btn">
                    ${isTimerMode ? 'Начать' : 'Готово'}
                </button>
                ${isTimerMode ? `
                    <button class="control-btn plus-btn">
                        <span class="material-symbols-rounded">add</span>
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    // Устанавливаем обработчики после рендеринга
    setTimeout(() => {
        console.log('Установка обработчиков');
        setupExerciseHandlers();
    }, 0);
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

// Обновляем функцию showStats
async function showStats() {
    const container = document.querySelector('.container');
    if (!container) return;

    try {
        // Получаем данные о тренировках
        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);

        // Рассчитываем статистику
        const totalWorkouts = activeProgram?.completedWorkouts?.length || 0;
        const totalDuration = activeProgram?.completedWorkouts?.reduce((sum, w) => sum + (w.duration || 0), 0) || 0;
        const totalCalories = activeProgram?.completedWorkouts?.reduce((sum, w) => sum + (w.calories || 0), 0) || 0;
        const goalProgress = activeProgram ? 
            Math.round((totalWorkouts / (activeProgram.workouts?.length || 1)) * 100) : 0;

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-mini-card">
                    <div class="stat-icon">
                        <span class="material-symbols-rounded">fitness_center</span>
                    </div>
                    <div class="stat-content">
                        <span class="stat-value">${totalWorkouts}</span>
                        <span class="stat-label">Тренировок</span>
                    </div>
                </div>
                <div class="stat-mini-card">
                    <div class="stat-icon">
                        <span class="material-symbols-rounded">timer</span>
                    </div>
                    <div class="stat-content">
                        <span class="stat-value">${totalDuration}м</span>
                        <span class="stat-label">Общее время</span>
                    </div>
                </div>
                <div class="stat-mini-card">
                    <div class="stat-icon">
                        <span class="material-symbols-rounded">local_fire_department</span>
                    </div>
                    <div class="stat-content">
                        <span class="stat-value">${totalCalories}</span>
                        <span class="stat-label">Ккал сожжено</span>
                    </div>
                </div>
                <div class="stat-mini-card">
                    <div class="stat-icon">
                        <span class="material-symbols-rounded">trending_up</span>
                    </div>
                    <div class="stat-content">
                        <span class="stat-value">${goalProgress}%</span>
                        <span class="stat-label">Достижение цели</span>
                    </div>
                </div>
            </div>
            <div class="weight-section">
                <h3>Динамика веса</h3>
                <div class="period-selector">
                    <button class="period-btn active" data-period="week">Неделя</button>
                    <button class="period-btn" data-period="month">Месяц</button>
                    <button class="period-btn" data-period="year">Год</button>
                </div>
                <canvas id="weight-chart"></canvas>
            </div>
        `;

        // Добавляем нижнюю навигацию
        const bottomNav = document.createElement('nav');
        bottomNav.className = 'tabs';
        bottomNav.innerHTML = `
            <button class="tab-btn" data-tab="workouts">
                <span class="material-symbols-rounded">exercise</span>
                <span>Тренировки</span>
            </button>
            <button class="tab-btn" data-tab="calendar">
                <span class="material-symbols-rounded">calendar_month</span>
                <span>Календарь</span>
            </button>
            <button class="tab-btn active" data-tab="stats">
                <span class="material-symbols-rounded">monitoring</span>
                <span>Статистика</span>
            </button>
            <button class="tab-btn" data-tab="profile">
                <span class="material-symbols-rounded">person</span>
                <span>Профиль</span>
            </button>
        `;
        container.appendChild(bottomNav);

        // Инициализируем график веса
        const weightData = await getWeightData(currentPeriod || 'week');
        await updateWeightChart(weightData);

        // Добавляем обработчики для кнопок периода
        setupPeriodButtons();
        setupTabHandlers();

    } catch (error) {
        console.error('Ошибка при отображении статистики:', error);
        showError('Не удалось загрузить статистику');
    }
}

// Обновляем функцию updateWeightChart
async function updateWeightChart(data) {
    const ctx = document.getElementById('weight-chart');
    if (!ctx) return;

    // Уничтожаем предыдущий график если он существует
    if (window.weightChart) {
        window.weightChart.destroy();
    }

    if (!data || data.length === 0) {
        ctx.style.display = 'none';
        const noDataMsg = document.createElement('div');
        noDataMsg.className = 'no-data-message';
        noDataMsg.textContent = 'Нет данных о весе';
        ctx.parentNode.appendChild(noDataMsg);
        return;
    }

    ctx.style.display = 'block';
    const noDataMsg = ctx.parentNode.querySelector('.no-data-message');
    if (noDataMsg) {
        noDataMsg.remove();
    }

    // Подготавливаем данные для графика
    const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = sortedData.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    });
    const weights = sortedData.map(item => item.weight);

    // Находим минимальный и максимальный вес для настройки шкалы
    const minWeight = Math.min(...weights) - 1;
    const maxWeight = Math.max(...weights) + 1;

    // Создаем новый график
    window.weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Вес (кг)',
                data: weights,
                borderColor: '#40a7e3',
                backgroundColor: 'rgba(64, 167, 227, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#40a7e3',
                pointRadius: 4,
                pointHoverRadius: 6
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
}

// Обновляем функцию getWeightData
async function getWeightData(period = 'week') {
    try {
        const result = await getStorageItem('weightHistory');
        let weightHistory = result ? JSON.parse(result) : [];
        
        if (!Array.isArray(weightHistory) || weightHistory.length === 0) {
            return [];
        }

        const now = new Date();
        let startDate = new Date();

        switch (period) {
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate.setDate(now.getDate() - 7);
        }

        return weightHistory.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= startDate && entryDate <= now;
        });

    } catch (error) {
        console.error('Ошибка при получении данных веса:', error);
        return [];
    }
}

// Добавляем функцию для отображения календаря
async function showCalendar() {
    const container = document.querySelector('.container');
    if (!container) return;

    try {
        // Получаем данные о выполненных тренировках
        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);
        
        const completedWorkouts = activeProgram?.completedWorkouts || [];

        // Получаем текущую дату
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        // Создаем календарь
        container.innerHTML = `
            <div class="calendar-container">
                <div class="calendar-header">
                    <button class="calendar-nav-btn prev-month">
                        <span class="material-symbols-rounded">chevron_left</span>
                    </button>
                    <h2>${new Date(currentYear, currentMonth).toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}</h2>
                    <button class="calendar-nav-btn next-month">
                        <span class="material-symbols-rounded">chevron_right</span>
                    </button>
                </div>
                <div class="calendar-weekdays">
                    <span>Пн</span>
                    <span>Вт</span>
                    <span>Ср</span>
                    <span>Чт</span>
                    <span>Пт</span>
                    <span>Сб</span>
                    <span>Вс</span>
                </div>
                <div class="calendar-days">
                    ${generateCalendarDays(currentYear, currentMonth, completedWorkouts)}
                </div>
                <div class="calendar-legend">
                    <div class="legend-item">
                        <span class="legend-dot completed"></span>
                        <span>Тренировка выполнена</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-dot planned"></span>
                        <span>Запланировано</span>
                    </div>
                </div>
            </div>
        `;

        // Добавляем нижнюю навигацию
        const bottomNav = document.createElement('nav');
        bottomNav.className = 'tabs';
        bottomNav.innerHTML = `
            <button class="tab-btn" data-tab="workouts">
                <span class="material-symbols-rounded">exercise</span>
                <span>Тренировки</span>
            </button>
            <button class="tab-btn active" data-tab="calendar">
                <span class="material-symbols-rounded">calendar_month</span>
                <span>Календарь</span>
            </button>
            <button class="tab-btn" data-tab="stats">
                <span class="material-symbols-rounded">monitoring</span>
                <span>Статистика</span>
            </button>
            <button class="tab-btn" data-tab="profile">
                <span class="material-symbols-rounded">person</span>
                <span>Профиль</span>
            </button>
        `;
        container.appendChild(bottomNav);

        // Добавляем обработчики
        setupCalendarHandlers();
        setupTabHandlers();

    } catch (error) {
        console.error('Ошибка при отображении календаря:', error);
        showError('Не удалось загрузить календарь');
    }
}

// Функция для отображения профиля
async function showProfile() {
    const container = document.querySelector('.container');
    if (!container) return;

    try {
        // Получаем данные профиля
        const profileData = await getStorageItem('profileData')
            .then(data => data ? JSON.parse(data) : null);

        container.innerHTML = `
            <div class="profile-container">
                <form id="profile-form" class="profile-form">
                    <div class="form-section">
                        <h4>Основные данные</h4>
                        <div class="input-group">
                            <label>Вес (кг)</label>
                            <input type="number" name="weight" value="${profileData?.weight || ''}" placeholder="Введите вес">
                        </div>
                        <div class="input-group">
                            <label>Рост (см)</label>
                            <input type="number" name="height" value="${profileData?.height || ''}" placeholder="Введите рост">
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>Цели и предпочтения</h4>
                        <div class="input-group">
                            <label>Основная цель</label>
                            <div class="checkbox-group">
                                <label class="checkbox-label">
                                    <input type="radio" name="goal" value="weight_loss" ${profileData?.goal === 'weight_loss' ? 'checked' : ''}>
                                    <span>Похудение</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="radio" name="goal" value="muscle_gain" ${profileData?.goal === 'muscle_gain' ? 'checked' : ''}>
                                    <span>Набор массы</span>
                                </label>
                                <label class="checkbox-label">
                                    <input type="radio" name="goal" value="maintenance" ${profileData?.goal === 'maintenance' ? 'checked' : ''}>
                                    <span>Поддержание</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h4>Доступное оборудование</h4>
                        <div class="checkbox-group">
                            <label class="checkbox-label">
                                <input type="checkbox" name="equipment" value="dumbbells" ${profileData?.equipment?.includes('dumbbells') ? 'checked' : ''}>
                                <span>Гантели</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" name="equipment" value="resistance_bands" ${profileData?.equipment?.includes('resistance_bands') ? 'checked' : ''}>
                                <span>Резинки</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" name="equipment" value="mat" ${profileData?.equipment?.includes('mat') ? 'checked' : ''}>
                                <span>Коврик</span>
                            </label>
                        </div>
                    </div>

                    <button type="submit" class="save-btn">Сохранить</button>
                </form>
            </div>
        `;

        // Добавляем нижнюю навигацию
        const bottomNav = document.createElement('nav');
        bottomNav.className = 'tabs';
        bottomNav.innerHTML = `
            <button class="tab-btn" data-tab="workouts">
                <span class="material-symbols-rounded">exercise</span>
                <span>Тренировки</span>
            </button>
            <button class="tab-btn" data-tab="calendar">
                <span class="material-symbols-rounded">calendar_month</span>
                <span>Календарь</span>
            </button>
            <button class="tab-btn" data-tab="stats">
                <span class="material-symbols-rounded">monitoring</span>
                <span>Статистика</span>
            </button>
            <button class="tab-btn active" data-tab="profile">
                <span class="material-symbols-rounded">person</span>
                <span>Профиль</span>
            </button>
        `;
        container.appendChild(bottomNav);

        // Добавляем обработчики
        setupProfileHandlers();
        setupTabHandlers();

    } catch (error) {
        console.error('Ошибка при отображении профиля:', error);
        showError('Не удалось загрузить профиль');
    }
}

// Вспомогательная функция для генерации дней календаря
function generateCalendarDays(year, month, completedWorkouts) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay() || 7; // Получаем день недели (1-7, где 1 - понедельник)
    const daysInMonth = lastDay.getDate();

    let html = '';
    
    // Добавляем пустые ячейки до первого дня месяца
    for (let i = 1; i < startDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Добавляем дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const hasWorkout = completedWorkouts.some(workout => {
            const workoutDate = new Date(workout.date);
            return workoutDate.getDate() === day && 
                   workoutDate.getMonth() === month && 
                   workoutDate.getFullYear() === year;
        });

        html += `
            <div class="calendar-day ${hasWorkout ? 'completed' : ''}">
                <span>${day}</span>
            </div>
        `;
    }

    return html;
}

// Добавляем обработчики для календаря
function setupCalendarHandlers() {
    const prevBtn = document.querySelector('.prev-month');
    const nextBtn = document.querySelector('.next-month');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            // Обработка перехода на предыдущий месяц
            tg.HapticFeedback.impactOccurred('medium');
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            // Обработка перехода на следующий месяц
            tg.HapticFeedback.impactOccurred('medium');
        });
    }
}

// Добавляем обработчики для профиля
function setupProfileHandlers() {
    const form = document.getElementById('profile-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const formData = new FormData(form);
            const profileData = {
                weight: formData.get('weight'),
                height: formData.get('height'),
                goal: formData.get('goal'),
                equipment: formData.getAll('equipment')
            };

            // Сохраняем данные профиля
            await setStorageItem('profileData', JSON.stringify(profileData));
            
            // Добавляем запись в историю веса
            const weightHistory = await getStorageItem('weightHistory')
                .then(data => data ? JSON.parse(data) : []);
            
            weightHistory.push({
                date: Date.now(),
                weight: parseFloat(profileData.weight)
            });

            await setStorageItem('weightHistory', JSON.stringify(weightHistory));

            showError('Профиль успешно сохранен');
            tg.HapticFeedback.notificationOccurred('success');

        } catch (error) {
            console.error('Ошибка при сохранении профиля:', error);
            showError('Не удалось сохранить профиль');
        }
    });
}