// Глобальные переменные
let tg, mainButton, backButton, currentPeriod, weightChart;

// Добавим очередь для попапов
const popupQueue = [];
let isPopupShowing = false;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
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
        const result = await getStorageItem('weightHistory');
        let weightHistory = [];
        
        try {
            weightHistory = result ? JSON.parse(result) : [];
            if (!Array.isArray(weightHistory)) weightHistory = [];
        } catch (e) {
            console.warn('Ошибка парсинга истории весов:', e);
        }

        // Создаем новую запись
        const newEntry = {
            date: new Date().toISOString(),
            weight: parseFloat(weight)
        };

        console.log('Сохраняем новую запись веса:', newEntry);

        // Проверяем, есть ли уже запись за сегодня
        const today = new Date().setHours(0, 0, 0, 0);
        const existingTodayIndex = weightHistory.findIndex(entry => 
            new Date(entry.date).setHours(0, 0, 0, 0) === today
        );

        if (existingTodayIndex !== -1) {
            weightHistory[existingTodayIndex] = newEntry;
        } else {
            weightHistory.push(newEntry);
        }

        // Сортируем записи по дате
        weightHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Сохраняем обновленную историю
        await setStorageItem('weightHistory', JSON.stringify(weightHistory));
        
        // Обновляем график
        const data = await getWeightData(currentPeriod);
        updateWeightChart(data);

        // Показываем уведомление об успехе
        tg.showPopup({
            title: 'Вес сохранен',
            message: 'Данные успешно обновлены',
            buttons: [{type: 'ok'}]
        });

    } catch (error) {
        console.error('Ошибка при сохранении веса:', error);
        showError(error);
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
function updateWeightChart(data, period = 'week') {
    const ctx = document.getElementById('weight-chart');
    if (!ctx) return;

    // Агрегируем данные в зависимости от периода
    const aggregatedData = aggregateWeightData(data, period);
    
    // Форматируем метки в зависимости от периода
    const formatLabel = (date) => {
        const d = new Date(date);
        switch (period) {
            case 'week':
                return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
            case 'month':
                return `Неделя ${Math.ceil(d.getDate() / 7)}`;
            case 'year':
                return d.toLocaleDateString('ru-RU', { month: 'short' });
            default:
                return d.toLocaleDateString('ru-RU');
        }
    };

    // Если график уже существует, уничтожаем его
    if (window.weightChart instanceof Chart) {
        window.weightChart.destroy();
    }

    // Создаем новый график
    window.weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: aggregatedData.map(d => formatLabel(d.date)),
            datasets: [{
                label: 'Вес (кг)',
                data: aggregatedData.map(d => d.weight),
                borderColor: '#40a7e3',
                backgroundColor: 'rgba(64, 167, 227, 0.1)',
                fill: true,
                tension: 0.4
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
                    beginAtZero: false,
                    ticks: {
                        callback: value => `${value} кг`
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
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            const tabContent = document.getElementById(tabId);
            tabContent.classList.add('active');

            // При переключении на вкладку с программами
            if (tabId === 'workouts') {
                setupProgramHandlers(); // Переинициализируем обработчики
                mainButton.hide();
            } else if (tabId === 'profile' && window.profileData) {
                fillProfileForm(window.profileData);
                mainButton.setText('Сохранить профиль');
                mainButton.show();
            } else if (tabId === 'stats') {
                try {
                    const weightHistory = await getStorageItem('weightHistory')
                        .then(data => data ? JSON.parse(data) : []);
                    updateWeightChart(weightHistory);
                } catch (e) {
                    console.error('Ошибка при загрузке истории веса:', e);
                }
                mainButton.hide();
            } else {
                mainButton.hide();
            }

            tg.HapticFeedback.selectionChanged();
        });
    });

    // Добавляем обработчики для кнопок периода
    const periodButtons = document.querySelectorAll('.period-btn');
    periodButtons.forEach(button => {
        button.addEventListener('click', async () => {
            // Обновляем активную кнопку
            periodButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Загружаем данные и обновляем график
            try {
                const weightHistory = await getStorageItem('weightHistory')
                    .then(data => data ? JSON.parse(data) : []);
                updateWeightChart(weightHistory, button.dataset.period);
                tg.HapticFeedback.selectionChanged();
            } catch (e) {
                console.error('Ошибка при обновлении графика:', e);
                showError(e);
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
    tg.onEvent('popupClosed', (button_id) => {
        if (button_id && button_id.startsWith('start_workout_')) {
            const [_, programId, day] = button_id.split('_').slice(2);
            startWorkout(programId, parseInt(day));
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
        if (!workout || !workout.exercises || workout.exercises.length === 0) {
            throw new Error('Некорректные данные тренировки');
        }

        // Получаем профиль пользователя
        const profileData = await getStorageItem('profile');
        let profile = {};
        try {
            profile = JSON.parse(profileData);
        } catch (e) {
            console.warn('Ошибка парсинга профиля:', e);
        }

        const availableEquipment = profile.equipment || [];
        const userLevel = profile.fitnessLevel || 'medium';

        // Адаптируем упражнения под пользователя
        const adaptedWorkout = {
            ...workout,
            exercises: workout.exercises.map(exercise => ({
                ...exercise,
                name: findBestExerciseAlternative(exercise.name, availableEquipment, userLevel)
            }))
        };

        // Запускаем тренировку с адаптированными упражнениями
        startWorkoutExecution(adaptedWorkout);

    } catch (error) {
        console.error('Ошибка при запуске тренировки:', error);
        tg.showPopup({
            title: 'Ошибка',
            message: error.message,
            buttons: [{type: 'ok'}]
        });
    }
}

// Основная логика выполнения тренировки переносится в отдельную функцию
function startWorkoutExecution(workout) {
    if (!workout || !workout.exercises || !workout.exercises.length) {
        console.error('Некорректные данные тренировки:', workout);
        return;
    }

    const container = document.querySelector('.container');
    if (!container) return;

    let currentExerciseIndex = 0;
    let isResting = false;
    let restTimeLeft = 0;
    let restInterval;
    let timerInterval;
    let currentReps = 0;
    let timerValue = 0;
    let isTimerMode = false;

    // Скрываем нижнюю навигацию
    document.querySelector('.bottom-nav')?.classList.add('hidden');

    function updateCounter(value) {
        currentReps = Math.max(0, value);
        const counterElement = document.querySelector('.counter-number');
        if (counterElement) {
            counterElement.textContent = currentReps;
            tg.HapticFeedback.impactOccurred('light');
        }
    }

    function startTimer(duration) {
        isTimerMode = true;
        timerValue = duration;
        clearInterval(timerInterval);
        
        timerInterval = setInterval(() => {
            timerValue--;
            const counterElement = document.querySelector('.counter-number');
            if (counterElement) {
                counterElement.textContent = timerValue;
            }

            if (timerValue <= 3 && timerValue > 0) {
                tg.HapticFeedback.impactOccurred('medium');
            }

            if (timerValue <= 0) {
                clearInterval(timerInterval);
                tg.HapticFeedback.notificationOccurred('success');
                showRestScreen();
            }
        }, 1000);
    }

    // Добавляем функцию showRestScreen
    function showRestScreen() {
        isResting = true;
        const exercise = workout.exercises[currentExerciseIndex];
        startRestTimer(exercise.rest);
    }

    function startRestTimer(duration) {
        isResting = true;
        restTimeLeft = duration;

        container.innerHTML = `
            <div class="workout-session">
                <div class="rest-screen">
                    <div class="rest-icon">
                        <span class="material-symbols-rounded">timer</span>
                    </div>
                    <h3>Отдых</h3>
                    <div class="rest-timer">${formatTime(restTimeLeft)}</div>
                    <button class="skip-rest-btn">
                        <span class="material-symbols-rounded">skip_next</span>
                        Пропустить
                    </button>
                </div>
            </div>
        `;

        const skipBtn = container.querySelector('.skip-rest-btn');
        skipBtn?.addEventListener('click', () => {
            clearInterval(restInterval);
            goToNextExercise();
        });

        restInterval = setInterval(() => {
            restTimeLeft--;
            const timerElement = container.querySelector('.rest-timer');
            if (timerElement) {
                timerElement.textContent = formatTime(restTimeLeft);
            }

            if (restTimeLeft <= 3 && restTimeLeft > 0) {
                tg.HapticFeedback.impactOccurred('medium');
            }

            if (restTimeLeft <= 0) {
                clearInterval(restInterval);
                goToNextExercise();
            }
        }, 1000);
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function goToNextExercise() {
        isResting = false;
        if (currentExerciseIndex < workout.exercises.length - 1) {
            currentExerciseIndex++;
            renderExercise();
        } else {
            completeWorkout(workout); // Передаем workout в функцию
        }
    }

    function setupExerciseHandlers() {
        const backBtn = container.querySelector('.back-btn');
        const minusBtn = container.querySelector('.minus-btn');
        const plusBtn = container.querySelector('.plus-btn');
        const completeBtn = container.querySelector('.complete-btn');

        backBtn?.addEventListener('click', () => {
            showExitConfirmation();
        });

        // Добавляем обработчик ответа на диалог
        tg.onEvent('popupClosed', (buttonId) => {
            if (buttonId === 'exit_workout') {
                if (timerInterval) clearInterval(timerInterval);
                if (restInterval) clearInterval(restInterval);
                document.querySelector('.bottom-nav')?.classList.remove('hidden');
                renderProgramCards();
            }
        });

        minusBtn?.addEventListener('click', () => {
            updateCounter(currentReps - 1);
        });

        plusBtn?.addEventListener('click', () => {
            updateCounter(currentReps + 1);
        });

        if (!isTimerMode) {
            completeBtn?.addEventListener('click', () => {
                showRestScreen();
            });
        }
    }

    function renderExercise() {
        const exercise = workout.exercises[currentExerciseIndex];
        isTimerMode = exercise.reps.toString().includes('сек') || 
                      exercise.reps.toString().includes('мин');
        
        let initialValue = isTimerMode ? 
            parseInt(exercise.reps) || 30 : 
            0;

        container.innerHTML = `
            <div class="workout-session">
                <div class="workout-header">
                    <button class="back-btn">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </button>
                    <div class="workout-title">
                        <div>${workout.title}</div>
                        <div>${exercise.name}</div>
                    </div>
                    <div class="workout-progress">
                        ${currentExerciseIndex + 1}/${workout.exercises.length}
                    </div>
                </div>

                <div class="exercise-display">
                    <img class="exercise-background" 
                         src="${getExerciseAnimation(exercise.name)}" 
                         alt="${exercise.name}">
                    
                    <div class="exercise-content">
                        <h2 class="exercise-name">${exercise.name}</h2>
                        <div class="exercise-subtitle">Подход ${exercise.currentSet || 1} из ${exercise.sets}</div>
                        
                        <div class="exercise-counter">
                            <div class="counter-number">${initialValue}</div>
                            <div class="counter-label">${isTimerMode ? 'секунд' : 'повторений'}</div>
                        </div>
                    </div>
                </div>

                <div class="exercise-controls">
                    <button class="control-btn minus-btn" ${isTimerMode ? 'style="display:none"' : ''}>
                        <span class="material-symbols-rounded">remove</span>
                    </button>
                    <button class="complete-btn">
                        ${isTimerMode ? 'Начать' : 'Готово'}
                    </button>
                    <button class="control-btn plus-btn" ${isTimerMode ? 'style="display:none"' : ''}>
                        <span class="material-symbols-rounded">add</span>
                    </button>
                </div>
            </div>
        `;

        setupExerciseHandlers();

        if (isTimerMode) {
            const completeBtn = container.querySelector('.complete-btn');
            completeBtn?.addEventListener('click', function() {
                if (this.textContent === 'Начать') {
                    startTimer(initialValue);
                    this.textContent = 'Пропустить';
                } else {
                    clearInterval(timerInterval);
                    showRestScreen();
                }
            });
        }
    }

    // Начинаем тренировку
    renderExercise();

    // Добавляем функцию для сохранения прогресса тренировки
    async function saveWorkoutProgress() {
        try {
            const progress = {
                workoutId: workout.id,
                currentExercise: currentExerciseIndex,
                completedExercises: [],
                timestamp: Date.now()
            };
            await setStorageItem('currentWorkout', JSON.stringify(progress));
        } catch (error) {
            console.error('Ошибка сохранения прогресса:', error);
        }
    }

    // Добавляем функцию для показа диалога подтверждения выхода
    function showExitConfirmation() {
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
}

// Функция показа деталей тренировки
function showWorkoutDetails(workoutId) {
    const workout = workoutData[workoutId];
    if (!workout) return;

    let detailsHtml = `
        <div class="workout-details-content">
            <h3>${workout.title}</h3>
            <p class="workout-description">${workout.description}</p>
            
            <div class="workout-info-grid">
                <div class="info-item">
                    <span class="material-symbols-rounded">schedule</span>
                    <span>${workout.duration} мин</span>
                </div>
                <div class="info-item">
                    <span class="material-symbols-rounded">local_fire_department</span>
                    <span>${workout.calories} ккал</span>
                </div>
                <div class="info-item">
                    <span class="material-symbols-rounded">fitness_center</span>
                    <span>${workout.difficulty}</span>
                </div>
            </div>`;

    if (workout.exercises) {
        detailsHtml += `
            <h4>Упражнения:</h4>
            <div class="exercises-list">
                ${workout.exercises.map(ex => `
                    <div class="exercise-item">
                        <h5>${ex.name}</h5>
                        <p>${ex.sets} подхода × ${ex.reps} повторений</p>
                        <p>Отдых: ${ex.rest} сек</p>
                    </div>
                `).join('')}
            </div>`;
    }

    if (workout.intervals) {
        detailsHtml += `
            <h4>Интервалы:</h4>
            <div class="intervals-list">
                ${workout.intervals.map(int => `
                    <div class="interval-item">
                        <span>${int.type}</span>
                        <span>${int.duration} мин - ${int.intensity}</span>
                    </div>
                `).join('')}
            </div>`;
    }

    detailsHtml += `
            <div class="workout-tips">
                <h4>Советы:</h4>
                <ul>
                    ${workout.tips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;

    tg.showPopup({
        title: 'Детали тренировки',
        message: detailsHtml,
        buttons: [
            {type: 'default', text: 'Начать', id: `start_${workoutId}`},
            {type: 'cancel', text: 'Закрыть'}
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
function showProgramDetails(programId) {
    const program = programData[programId];
    if (!program) return;

    // Показываем основную информацию в более компактном виде
    const mainInfo = `
        <b>${program.title}</b>
        ${program.description}

        📅 ${program.schedule}
        🔥 ${program.calories_per_week}
        💪 Сложность: ${program.difficulty}
    `;

    // Ограничиваем количество кнопок до 3
    const buttons = [
        {
            id: `start_program_${programId}`,
            type: 'default',
            text: 'Начать программу'
        },
        {
            id: `schedule_${programId}`,
            type: 'default',
            text: 'Расписание'
        }
    ];

    tg.showPopup({
        title: program.title,
        message: mainInfo,
        buttons: buttons
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
function showProgramSchedule(programId) {
    const program = programData[programId];
    if (!program) return;

    const scheduleInfo = program.workouts
        .map(workout => `День ${workout.day}: ${workout.title}\n${workout.duration} мин • ${workout.type}`)
        .join('\n\n');

    tg.showPopup({
        title: 'Расписание тренировок',
        message: scheduleInfo,
        buttons: [
            {type: 'default', text: '⬅️ Назад', id: `back_to_main_${programId}`},
            {type: 'default', text: 'Начать программу', id: `start_program_${programId}`}
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

// Обновляем функцию startProgram
async function startProgram(programId) {
    const program = programData[programId];
    if (!program) return;

    try {
        // Создаем объект прогресса программы
        const programProgress = {
            programId: programId,
            startDate: Date.now(),
            currentDay: 1,
            completedWorkouts: [],
            plannedWorkouts: []
        };

        // Планируем все тренировки
        const startDate = new Date();
        for (const workout of program.workouts) {
            const workoutDate = new Date(startDate);
            workoutDate.setDate(workoutDate.getDate() + workout.day - 1);
            
            programProgress.plannedWorkouts.push({
                day: workout.day,
                plannedDate: workoutDate.getTime(),
                title: workout.title,
                duration: workout.duration,
                type: workout.type
            });
        }

        // Сохраняем прогресс
        await setStorageItem('activeProgram', JSON.stringify(programProgress));

        // Обновляем статистику
        await updateStatistics();

        // Обновляем календарь
        renderCalendar();

        // Показываем сообщение о начале программы
        await showPopupSafe({
            title: 'Программа начата!',
            message: `Вы начали программу "${program.title}". Первая тренировка запланирована на сегодня.`,
            buttons: [{
                type: 'default',
                text: 'Начать тренировку',
                id: `start_workout_${programId}_1`
            }]
        });

    } catch (error) {
        console.error('Ошибка при запуске программы:', error);
        showError(error);
    }
}

// Функция обновления статистики
async function updateStatistics() {
    try {
        // Получаем все необходимые данные
        const [weightHistoryStr, activeProgramStr] = await Promise.all([
            getStorageItem('weightHistory'),
            getStorageItem('activeProgram')
        ]);

        const weightHistory = weightHistoryStr ? JSON.parse(weightHistoryStr) : [];
        const activeProgram = activeProgramStr ? JSON.parse(activeProgramStr) : null;

        // Статистика тренировок
        let stats = {
            totalWorkouts: 0,
            totalCalories: 0,
            totalMinutes: 0,
            completionRate: 0
        };

        if (activeProgram?.completedWorkouts) {
            stats.totalWorkouts = activeProgram.completedWorkouts.length;
            
            // Подсчитываем калории и время
            stats.totalCalories = activeProgram.completedWorkouts.reduce((sum, workout) => 
                sum + (workout.calories || 0), 0);
            stats.totalMinutes = activeProgram.completedWorkouts.reduce((sum, workout) => 
                sum + (workout.duration || 0), 0);

            // Вычисляем процент выполнения программы
            if (activeProgram.plannedWorkouts && activeProgram.plannedWorkouts.length > 0) {
                stats.completionRate = Math.round(
                    (stats.totalWorkouts / activeProgram.plannedWorkouts.length) * 100
                );
            }
        }

        // Обновляем UI статистики с проверкой наличия элементов
        const elements = {
            'total-workouts': stats.totalWorkouts,
            'total-calories': stats.totalCalories,
            'total-time': formatDuration(stats.totalMinutes),
            'completion-rate': `${stats.completionRate}%`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            } else {
                console.warn(`Элемент с id "${id}" не найден`);
            }
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
    // Обработчики для кнопок в карточках программ
    document.querySelectorAll('.program-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const programCard = button.closest('.program-card');
            const programId = programCard.dataset.program;
            
            if (button.classList.contains('info-btn')) {
                tg.HapticFeedback.impactOccurred('medium');
                showProgramDetails(programId);
            } else if (button.classList.contains('start-btn')) {
                tg.HapticFeedback.impactOccurred('medium');
                startProgram(programId);
            }
        });
    });

    // Добавляем обработчик для всей карточки программы
    document.querySelectorAll('.program-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.program-btn')) {
                const programId = card.dataset.program;
                tg.HapticFeedback.impactOccurred('medium');
                showProgramDetails(programId);
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

// Функция завершения тренировки
async function completeWorkout(workout, programId) {
    try {
        // Добавим проверку входных параметров
        if (!workout || !programId) {
            console.warn('Отсутствуют необходимые параметры:', { workout, programId });
            return;
        }

        // Получаем текущий прогресс программы
        const result = await getStorageItem('activeProgram');
        let programProgress = result ? JSON.parse(result) : {
            programId: programId,
            startDate: Date.now(),
            completedWorkouts: [],
            plannedWorkouts: []
        };

        // Добавляем завершенную тренировку
        programProgress.completedWorkouts.push({
            day: workout.day,
            completedAt: Date.now(),
            duration: workout.duration,
            type: workout.type,
            calories: workout.calories || 0
        });

        // Сохраняем обновленный прогресс
        await setStorageItem('activeProgram', JSON.stringify(programProgress));

        // Обновляем статистику
        await updateStatistics();

        // Показываем сообщение об успехе
        try {
            await tg.showPopup({
                title: 'Тренировка завершена!',
                message: 'Поздравляем! Вы успешно завершили тренировку.',
                buttons: [{
                    type: 'default',
                    text: 'Продолжить',
                    id: 'return_to_main'
                }]
            });
        } catch (popupError) {
            console.warn('Не удалось показать попап:', popupError);
        }

        // Обновляем UI
        updateProgramProgress(programProgress);

    } catch (error) {
        console.error('Ошибка при завершении тренировки:', error);
    }
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

// Добавим функцию для отображения попапа
async function showPopupSafe(options) {
    return new Promise((resolve) => {
        const showNext = async () => {
            if (popupQueue.length > 0 && !isPopupShowing) {
                isPopupShowing = true;
                const { options, resolver } = popupQueue[0];
                
                try {
                    const result = await tg.showPopup(options);
                    resolver(result);
                } catch (error) {
                    console.warn('Ошибка показа попапа:', error);
                    resolver(null);
                } finally {
                    isPopupShowing = false;
                    popupQueue.shift();
                    showNext();
                }
            }
        };

        popupQueue.push({ options, resolver: resolve });
        showNext();
    });
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
    const programsList = document.querySelector('.programs-list');
    if (!programsList || !window.programData) return;

    // Очищаем текущий список
    programsList.innerHTML = '';

    // Создаем карточки для каждой программы
    Object.values(window.programData).forEach(program => {
        const workoutsCount = program.workouts?.length || 0;
        const schedule = program.schedule || `${workoutsCount} тр/нед`;
        const difficulty = program.difficulty || program.intensity || 'medium';

        const card = document.createElement('div');
        card.className = 'program-card';
        card.dataset.program = program.id;

        card.innerHTML = `
            <div class="program-header">
                <div class="program-icon">
                    <span class="material-symbols-rounded">${program.icon || 'fitness_center'}</span>
                </div>
                <div class="program-info">
                    <h3>
                        ${program.title}
                        <span class="program-duration">${program.duration}</span>
                    </h3>
                    <p class="program-description">${program.description}</p>
                    <div class="program-details">
                        <span>
                            <span class="material-symbols-rounded">calendar_month</span>
                            ${schedule}
                        </span>
                        <span>
                            <span class="material-symbols-rounded">fitness_center</span>
                            ${getDifficultyText(difficulty)}
                        </span>
                    </div>
                </div>
            </div>
            <div class="program-progress">
                <div class="progress-bar">
                    <div class="progress" style="width: 0%"></div>
                </div>
                <span class="progress-text">0/${workoutsCount} тренировок</span>
            </div>
            <div class="program-actions">
                <button class="program-btn info-btn">
                    <span class="material-symbols-rounded">info</span>
                    Подробнее
                </button>
                <button class="program-btn start-btn">
                    <span class="material-symbols-rounded">play_arrow</span>
                    Начать
                </button>
            </div>
        `;

        // Добавляем обработчики для кнопок
        const startBtn = card.querySelector('.start-btn');
        const infoBtn = card.querySelector('.info-btn');

        startBtn.addEventListener('click', () => {
            showProgramWorkouts(program);
            tg.HapticFeedback.impactOccurred('medium');
        });

        infoBtn.addEventListener('click', () => {
            showProgramDetails(program);
            tg.HapticFeedback.impactOccurred('medium');
        });

        programsList.appendChild(card);
    });
}

// Функция для отображения тренировок программы
async function showProgramWorkouts(program) {
    const programsList = document.querySelector('.programs-list');
    if (!program || !program.workouts) {
        console.error('Программа или тренировки не определены:', program);
        return;
    }

    // Получаем прогресс пользователя
    const progressData = await getStorageItem('activeProgram');
    let progress = {};
    try {
        progress = progressData ? JSON.parse(progressData) : {};
    } catch (e) {
        console.warn('Ошибка парсинга прогресса:', e);
    }

    // Определяем последний доступный день
    const completedWorkouts = progress.completedWorkouts || [];
    const lastCompletedDay = Math.max(...completedWorkouts.map(w => w.day) || [0]);
    const nextAvailableDay = lastCompletedDay + 1;

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
                    const isAvailable = workout.day <= nextAvailableDay;
                    const isCompleted = completedWorkouts.some(w => w.day === workout.day);
                    return `
                        <div class="workout-day ${isCompleted ? 'completed' : ''} ${isAvailable ? 'available' : 'locked'}">
                            <div class="day-header">
                                <span class="day-number">День ${workout.day}</span>
                                <span class="day-status">
                                    ${isCompleted ? 
                                        '<span class="material-symbols-rounded">task_alt</span>' :
                                        isAvailable ? 
                                            '<span class="material-symbols-rounded">lock_open</span>' : 
                                            '<span class="material-symbols-rounded">lock</span>'
                                    }
                                </span>
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
                            ${isAvailable && !isCompleted ? `
                                <button class="start-workout-btn" data-workout-index="${index}">
                                    <span class="material-symbols-rounded">play_arrow</span>
                                    Начать тренировку
                                </button>
                            ` : ''}
                            ${isCompleted ? `
                                <button class="repeat-workout-btn" data-workout-index="${index}">
                                    <span class="material-symbols-rounded">replay</span>
                                    Повторить
                                </button>
                            ` : ''}
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

    const workoutBtns = programsList.querySelectorAll('.start-workout-btn, .repeat-workout-btn');
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

// Добавляем функцию для проверки возможности добавления на рабочий стол
async function checkHomeScreenAvailability() {
    if (tg.platform !== 'android' && tg.platform !== 'ios') {
        return false;
    }

    try {
        const result = await tg.checkHomeScreenStatus();
        return !result.is_added; // Возвращаем true если приложение ещё не добавлено
    } catch (error) {
        console.warn('Ошибка проверки статуса добавления на рабочий стол:', error);
        return false;
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