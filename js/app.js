// Глобальные переменные
if (!window.Telegram?.WebApp) {
    console.error('Telegram WebApp не инициализирован');
    throw new Error('Приложение должно быть запущено в Telegram');
}

let tg = window.Telegram.WebApp;
let mainButton = tg.MainButton;
let backButton = tg.BackButton;
let timerInterval = null;
let restInterval = null;
let currentWorkout = null;
let currentPeriod, weightChart;

// Добавим очередь для попапов
const popupQueue = [];
let isPopupShowing = false;

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
        setupEventHandlers();
        setupTabHandlers();
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

        // Инициализируем статистику
        await renderStatistics();

        console.log('Приложение успешно инициализировано');
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError(error);
    }
});

// Делаем функции глобальными
window.getStorageItem = async function(key) {
    try {
        return new Promise((resolve) => {
            if (!tg?.CloudStorage) {
                const value = localStorage.getItem(key);
                console.warn(`CloudStorage недоступен, используем localStorage для ${key}:`, value);
                resolve(value);
                return;
            }

            tg.CloudStorage.getItem(key, (error, value) => {
                if (error) {
                    console.warn(`Ошибка CloudStorage для ${key}:`, error);
                    const localValue = localStorage.getItem(key);
                    resolve(localValue);
                } else {
                    if (value) localStorage.setItem(key, value);
                    resolve(value);
                }
            });
        });
    } catch (error) {
        console.error(`Ошибка при получении ${key}:`, error);
        return null;
    }
};

window.setStorageItem = async function(key, value) {
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
                localStorage.setItem(key, value);
                resolve(true);
            } else {
                localStorage.setItem(key, value);
                resolve(success);
            }
        });
    });
};

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
    if (!profile) return;

    // Заполняем поля формы
    const form = document.getElementById('profile-form');
    if (!form) return;

    // Заполняем базовые поля
    Object.entries(profile).forEach(([key, value]) => {
        const input = form.querySelector(`[name="${key}"]`);
        if (!input) return;

        if (input.type === 'checkbox') {
            input.checked = value;
        } else if (input.type === 'radio') {
            form.querySelector(`[name="${key}"][value="${value}"]`)?.checked = true;
        } else {
            input.value = value;
        }
    });

    // Обновляем отображение оборудования
    if (profile.equipment) {
        profile.equipment.forEach(item => {
            const checkbox = form.querySelector(`[name="equipment"][value="${item}"]`);
            if (checkbox) checkbox.checked = true;
        });
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
function updateWeightChart(selectedPeriod) {
    currentPeriod = selectedPeriod; // Сохраняем текущий период
    
    const ctx = document.getElementById('weight-chart');
    if (!ctx) return;

    const now = new Date();
    let labels = [];
    let data = [];

    // Получаем данные о весе
    getStorageItem('weightHistory')
        .then(historyStr => {
            const weightHistory = historyStr ? JSON.parse(historyStr) : [];
            
            // Определяем диапазон дат для выбранного периода
            let startDate = new Date();
            switch(selectedPeriod) {
                case 'week':
                    startDate.setDate(now.getDate() - 7);
                    for(let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
                        labels.push(d.toLocaleDateString('ru-RU', { weekday: 'short' }));
                        const weight = weightHistory.find(w => 
                            new Date(w.date).toDateString() === d.toDateString()
                        )?.weight;
                        data.push(weight || null);
                    }
                    break;
                    
                case 'month':
                    startDate.setMonth(now.getMonth() - 1);
                    for(let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
                        labels.push(d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
                        const weight = weightHistory.find(w => 
                            new Date(w.date).toDateString() === d.toDateString()
                        )?.weight;
                        data.push(weight || null);
                    }
                    break;
                    
                case 'year':
                    startDate.setFullYear(now.getFullYear() - 1);
                    for(let d = new Date(startDate); d <= now; d.setMonth(d.getMonth() + 1)) {
                        labels.push(d.toLocaleDateString('ru-RU', { month: 'short' }));
                        const monthWeights = weightHistory.filter(w => {
                            const date = new Date(w.date);
                            return date.getMonth() === d.getMonth() && 
                                   date.getFullYear() === d.getFullYear();
                        });
                        // Берем среднее значение веса за месяц
                        const avgWeight = monthWeights.length ? 
                            monthWeights.reduce((sum, w) => sum + w.weight, 0) / monthWeights.length : 
                            null;
                        data.push(avgWeight);
                    }
                    break;
            }

            // Обновляем график
            if (window.weightChart) {
                window.weightChart.destroy();
            }

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
                        pointBackgroundColor: '#40a7e3'
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
        tab.addEventListener('click', () => {
            // Убираем активный класс со всех вкладок
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            // Добавляем активный класс выбранной вкладке
            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            document.getElementById(tabId)?.classList.add('active');

            // Дополнительные действия при переключении вкладок
            if (tabId === 'stats') {
                initStatisticsPage();
            } else if (tabId === 'profile') {
                loadProfile();
            }

            tg.HapticFeedback.selectionChanged();
        });
    });
}

// Настройка обработчиков событий
function setupEventHandlers() {
    // Обработчик закрытия попапов
    tg.onEvent('popupClosed', (event) => {
        if (!event) return;
        
        console.log('Popup closed with event:', event);
        
        if (event.button_id === 'exit_workout') {
            handleWorkoutExit();
        }
        
        // Обрабатываем следующий попап в очереди
        processPopupQueue();
    });

    // Обработчик ошибок
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        showError('Произошла ошибка в приложении');
    });

    // Обработчик непойманных промисов
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        showError('Произошла ошибка в приложении');
    });
}

// Добавим функцию для запуска тренировки
async function startWorkout(workout) {
    try {
        if (!workout) {
            throw new Error('Данные тренировки не переданы');
        }

    console.log('Начинаем тренировку:', workout);
    
        if (!workout.exercises || workout.exercises.length === 0) {
            throw new Error('В тренировке нет упражнений');
        }

        // Получаем программу
        const program = Object.values(window.programData || {}).find(p => 
            p.workouts.some(w => w.day === workout.day && w.title === workout.title)
        );

        if (!program) {
            throw new Error('Программа не найдена');
        }

        console.log('Найдена программа:', program.title);

        // Получаем профиль пользователя
        const profileData = await getStorageItem('profile');
        const profile = profileData ? JSON.parse(profileData) : {};

        // Запускаем тренировку
        startWorkoutExecution(workout);

    } catch (error) {
        console.error('Ошибка при запуске тренировки:', error);
        showError(error.message || 'Не удалось запустить тренировку');
        return false;
    }
}

// Основная логика выполнения тренировки переносится в отдельную функцию
function startWorkoutExecution(workout) {
    currentWorkout = workout;
    
    if (!workout || !workout.exercises || !workout.exercises.length) {
        console.error('Некорректные данные тренировки:', workout);
        return;
    }

    const container = document.querySelector('.container');
    if (!container) return;

    let currentExerciseIndex = 0;
    let currentSet = 1;
    let isResting = false;
    let restTimeLeft = 0;
    let currentReps = 0;
    let timerValue = 0;
    let isTimerMode = false;

    // Очищаем предыдущие таймеры при старте новой тренировки
    clearTimers();

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
        timerValue = duration;
        clearInterval(timerInterval);
        
        const counterElement = document.querySelector('.counter-number');
        const completeBtn = document.querySelector('.complete-btn');
        
        timerInterval = setInterval(() => {
            timerValue--;
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
        
        // Проверяем, нужно ли переходить к следующему упражнению
        if (currentSet >= exercise.sets) {
            currentSet = 1; // Сбрасываем счетчик подходов
            
            // Проверяем, есть ли следующее упражнение
            if (currentExerciseIndex < workout.exercises.length - 1) {
                startRestTimer(exercise.rest, true); // Отдых перед следующим упражнением
            } else {
                // Если это было последнее упражнение, завершаем тренировку
                completeWorkout(workout);
                return;
            }
        } else {
            currentSet++; // Увеличиваем счетчик подходов
            startRestTimer(exercise.rest, false); // Обычный отдых между подходами
        }
    }

    function startRestTimer(duration, isExerciseComplete) {
        isResting = true;
        restTimeLeft = duration;

        container.innerHTML = `
            <div class="workout-session">
                <div class="rest-screen">
                    <div class="rest-icon">
                        <span class="material-symbols-rounded">timer</span>
                    </div>
                    <h3>Отдых</h3>
                    <div class="rest-subtitle">
                        ${isExerciseComplete ? 'Следующее упражнение' : `Подход ${currentSet} из ${workout.exercises[currentExerciseIndex].sets}`}
                    </div>
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
            if (isExerciseComplete) {
                goToNextExercise();
            } else {
                renderExercise(); // Возвращаемся к тому же упражнению для следующего подхода
            }
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
                if (isExerciseComplete) {
                    goToNextExercise();
                } else {
                    renderExercise(); // Возвращаемся к тому же упражнению для следующего подхода
                }
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

        // Обработчик кнопки "Назад"
        backBtn?.addEventListener('click', () => {
            showExitConfirmation();
        });

        // Обработчики для кнопок +/-
        minusBtn?.addEventListener('click', () => {
            if (isTimerMode) {
                if (timerValue > 5) {
                    timerValue -= 5;
                    updateCounter(timerValue);
                }
            } else {
                updateCounter(currentReps - 1);
            }
        });

        plusBtn?.addEventListener('click', () => {
            if (isTimerMode) {
                if (timerValue < 300) {
                    timerValue += 5;
                    updateCounter(timerValue);
                }
            } else {
                updateCounter(currentReps + 1);
            }
        });
    }

    // Выносим обработчик диалога на уровень выше
    function initExitHandler() {
        tg.onEvent('popupClosed', (event) => {
            if (event.button_id === 'exit_workout') {
                // Очищаем все таймеры
                if (timerInterval) clearInterval(timerInterval);
                if (restInterval) clearInterval(restInterval);
                
                // Возвращаем нижнюю навигацию
                document.querySelector('.bottom-nav')?.classList.remove('hidden');
                
                // Возвращаемся к списку программ
                renderProgramCards();
                
                // Вибрация
                tg.HapticFeedback.impactOccurred('medium');
            }
        });
    }

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
                        <div class="exercise-subtitle">Подход ${currentSet} из ${exercise.sets}</div>
                        
                        <div class="exercise-counter">
                            <div class="counter-number">${initialValue}</div>
                            <div class="counter-label">${isTimerMode ? 'секунд' : 'повторений'}</div>
                        </div>
                    </div>
                </div>

                <div class="exercise-controls">
                    <button class="control-btn minus-btn" ${isTimerMode ? '' : 'style="display:none"'}>
                        <span class="material-symbols-rounded">remove</span>
                    </button>
                    <button class="complete-btn">
                        ${isTimerMode ? 'Начать' : 'Готово'}
                    </button>
                    <button class="control-btn plus-btn" ${isTimerMode ? '' : 'style="display:none"'}>
                        <span class="material-symbols-rounded">add</span>
                    </button>
                </div>
            </div>
        `;

        setupExerciseHandlers();
    }

    // Инициализируем обработчик выхода
    initExitHandler();

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

    // Предзагружаем анимации для всех упражнений
    window.preloadExerciseAnimations(workout.exercises);
}

// Функция показа деталей тренировки
function showWorkoutDetails(workout) {
    tg.showPopup({
        title: workout.title,
        message: `
${workout.description}

🕒 Длительность: ${workout.duration} мин
🔥 Калории: ${workout.calories} ккал

Упражнения:
${workout.exercises.map(ex => `• ${ex.name} - ${ex.sets}×${ex.reps} (отдых ${ex.rest} сек)`).join('\n')}
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

// Функция для запуска программы
async function startProgram(programId) {
    try {
        const program = window.programData[programId];
        if (!program) {
            throw new Error('Программа не найдена');
        }

        // Сохраняем выбранную программу
        await setStorageItem('activeProgram', JSON.stringify({
            id: programId,
            title: program.title,
            workouts: program.workouts,
            completedWorkouts: []
        }));

        // Очищаем текущий контейнер
        const container = document.querySelector('.container');
        if (!container) return;

        // Создаем контейнер для списка тренировок
        container.innerHTML = `
            <div class="program-header">
                <button class="back-btn" onclick="renderProgramCards()">
                    <span class="material-symbols-rounded">arrow_back</span>
                </button>
                <h2>${program.title}</h2>
            </div>
            <div class="workouts-list"></div>
        `;

        // Добавляем обработчик для кнопки "Назад"
        const backBtn = container.querySelector('.back-btn');
        backBtn?.addEventListener('click', () => {
            tg.HapticFeedback.impactOccurred('medium');
        });

        // Отображаем список тренировок
        renderWorkouts(program);

    } catch (error) {
        console.error('Ошибка при запуске программы:', error);
        showError(error.message);
    }
}

// Функция для отображения тренировок программы
function renderWorkouts(program) {
    const container = document.querySelector('.workouts-list');
    if (!container) return;

    // Получаем прогресс программы
    getStorageItem('activeProgram')
        .then(data => {
            const progress = data ? JSON.parse(data) : { completedWorkouts: [] };
            const completedWorkouts = new Set(progress.completedWorkouts.map(w => w.day));

            let html = '';
            program.workouts.forEach((workout, index) => {
                // Тренировка заблокирована, если:
                // 1. Это не первый день (index > 0)
                // 2. Предыдущий день не выполнен (не содержится в completedWorkouts)
                const isLocked = index > 0 && !completedWorkouts.has(index);
                
                // Определяем статус тренировки
                const statusClass = completedWorkouts.has(index + 1) ? 'completed' : 
                                  isLocked ? 'locked' : '';

                html += `
                    <div class="workout-card ${statusClass}">
                        <div class="workout-header">
                            <div class="workout-day">День ${index + 1}</div>
                            <div class="workout-status">
                                ${completedWorkouts.has(index + 1) ? 
                                    '<span class="material-symbols-rounded">check_circle</span>' : 
                                    isLocked ? 
                                    '<span class="material-symbols-rounded">lock</span>' : 
                                    ''}
                            </div>
                        </div>
                        <h3>${workout.title}</h3>
                        <div class="workout-details">
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
async function renderStatistics() {
    try {
        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);

        const container = document.querySelector('.statistics-container');
        if (!container) return;

        // Отображаем статистику
        renderStatisticsContent(activeProgram, container);

        // Настраиваем обработчики периодов
        setupPeriodHandlers(container);

        // Инициализируем график с недельным периодом
        updateWeightChart('week');

        // Добавляем советы
        await renderTips();

    } catch (error) {
        console.error('Ошибка при отображении статистики:', error);
        showError('Не удалось загрузить статистику');
    }
}

// Выносим отображение контента в отдельную функцию
function renderStatisticsContent(activeProgram, container) {
    if (!activeProgram || !activeProgram.completedWorkouts?.length) {
        container.innerHTML = getEmptyStatisticsHTML();
    } else {
        const stats = calculateStatistics(activeProgram);
        container.innerHTML = getStatisticsHTML(stats);
    }
}

// Вспомогательные функции
function getEmptyStatisticsHTML() {
    return `
        <div class="stats-overview">
            <div class="stat-card">
                <span class="material-symbols-rounded">exercise</span>
                <h3>0</h3>
                <p>Тренировок</p>
            </div>
            <!-- Остальные карточки статистики -->
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
        <div class="tips-list"></div>
    `;
}

function calculateStatistics(activeProgram) {
    const totalWorkouts = activeProgram.completedWorkouts.length;
    const totalDuration = activeProgram.completedWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    const totalCalories = activeProgram.completedWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
    const goalProgress = Math.round((totalWorkouts / activeProgram.workouts.length) * 100);

    return { totalWorkouts, totalDuration, totalCalories, goalProgress };
}

function getStatisticsHTML(stats) {
    return `
        <div class="stats-overview">
            <div class="stat-card">
                <span class="material-symbols-rounded">exercise</span>
                <h3>${stats.totalWorkouts}</h3>
                <p>Тренировок</p>
            </div>
            <!-- Остальные карточки статистики -->
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
        <div class="tips-list"></div>
    `;
}

function setupPeriodHandlers(container) {
    const periodBtns = container.querySelectorAll('.period-btn');
    periodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            periodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateWeightChart(btn.dataset.period);
        });
    });
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

// Обновляем функцию renderTips
async function renderTips() {
    const tipsContainer = document.querySelector('.tips-list');
    if (!tipsContainer) return;

    try {
        const tips = await getTips();
        
        tipsContainer.innerHTML = tips.map(tip => `
            <div class="tip-card">
                <h3>${tip.title}</h3>
                <p>${tip.text}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка при отображении советов:', error);
        tipsContainer.innerHTML = `
            <div class="tip-card">
                <h3>Общий совет</h3>
                <p>Регулярные тренировки и правильное питание - ключ к успеху</p>
            </div>
        `;
    }
}

// Обновляем функцию getExerciseAnimation
function getExerciseAnimation(exerciseName) {
    return window.getExerciseImage(exerciseName);
}

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

// Добавим вызов при выходе из тренировки
function handleWorkoutExit() {
    clearTimers();
    document.querySelector('.bottom-nav')?.classList.remove('hidden');
    renderProgramCards();
    tg.HapticFeedback.impactOccurred('medium');
}

// Добавляем функцию setupProgramHandlers
function setupProgramHandlers() {
    // Обработчики для карточек программ
    document.querySelectorAll('.program-card').forEach(card => {
        // Обработчик для кнопки "Подробнее"
        const infoBtn = card.querySelector('.info-btn');
        infoBtn?.addEventListener('click', () => {
            const programId = card.dataset.program;
            const program = window.programData[programId];
            if (!program) return;

            tg.HapticFeedback.impactOccurred('medium');
            showProgramDetails(program);
        });

        // Обработчик для кнопки "Начать"
        const startBtn = card.querySelector('.start-btn');
        startBtn?.addEventListener('click', () => {
            const programId = card.dataset.program;
            const program = window.programData[programId];
            if (!program) return;

            tg.HapticFeedback.impactOccurred('medium');
            startProgram(programId);
        });
    });
}

// Функция для отображения деталей программы
function showProgramDetails(program) {
    tg.showPopup({
        title: program.title,
        message: `
${program.description}

🎯 Цель: ${program.goal}
📅 График: ${program.schedule}
⚡️ Сложность: ${getDifficultyText(program.difficulty)}

Программа включает:
${program.features.map(f => `• ${f}`).join('\n')}

Необходимое оборудование:
${program.equipment.length ? program.equipment.map(e => `• ${e}`).join('\n') : '• Не требуется'}
        `,
        buttons: [
            {
                type: 'default',
                text: 'Закрыть'
            }
        ]
    });
}

// Вспомогательная функция для получения текста сложности
function getDifficultyText(difficulty) {
    switch(difficulty) {
        case 'beginner':
            return 'Начинающий';
        case 'intermediate':
            return 'Средний';
        case 'advanced':
            return 'Продвинутый';
        default:
            return 'Не указана';
    }
} 

function renderProgramCards() {
    const container = document.querySelector('.programs-list');
    if (!container) return;

    let html = '';
    Object.entries(window.programData).forEach(([programId, program]) => {
        html += `
            <div class="program-card" data-program="${programId}">
                <div class="program-content">
                    <div class="program-icon">
                        <span class="material-symbols-rounded">${program.icon}</span>
                    </div>
                    <h3>${program.title}</h3>
                    <p class="program-description">${program.description}</p>
                    <div class="program-details">
                        <span>
                            <span class="material-symbols-rounded">calendar_today</span>
                            ${program.schedule}
                        </span>
                        <span>
                            ${getDifficultyText(program.difficulty)}
                        </span>
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
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    setupProgramHandlers(); // Устанавливаем обработчики после рендеринга
}

// Функция обновления фото профиля
function updateProfilePhoto(photoUrl) {
    const photoElement = document.querySelector('.profile-photo');
    if (!photoElement) return;

    if (photoUrl) {
        photoElement.style.backgroundImage = `url(${photoUrl})`;
        photoElement.classList.add('has-photo');
    } else {
        photoElement.style.backgroundImage = '';
        photoElement.classList.remove('has-photo');
    }
}

// Функция загрузки активной программы
async function loadActiveProgram() {
    try {
        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);

        if (activeProgram) {
            // Обновляем UI для активной программы
            const programCard = document.querySelector(`[data-program="${activeProgram.id}"]`);
            if (programCard) {
                programCard.classList.add('active');
                const startBtn = programCard.querySelector('.start-btn');
                if (startBtn) {
                    startBtn.textContent = 'Продолжить';
                    startBtn.classList.add('continue');
                }
            }
        }
    } catch (error) {
        console.error('Ошибка при загрузке активной программы:', error);
        showError('Не удалось загрузить активную программу');
    }
}

// Функция для обработки профиля
function setupProfileHandlers() {
    const form = document.getElementById('profile-form');
    if (!form) return;

    // Обработчик изменения полей формы
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

    // Обработчик сохранения профиля
    mainButton.onClick(async () => {
        try {
            const formData = new FormData(form);
            const profile = Object.fromEntries(formData);
            
            // Сохраняем данные
            await setStorageItem('profile', JSON.stringify(profile));
            
            tg.HapticFeedback.impactOccurred('medium');
            showSuccess('Профиль сохранен');
            
            // Обновляем статус
            updateProfileStatus(profile);
        } catch (error) {
            console.error('Ошибка при сохранении профиля:', error);
            showError('Не удалось сохранить профиль');
        }
    });
} 

async function initStatisticsPage() {
    try {
        const container = document.querySelector('.statistics-container');
        if (!container) return;

        // Загружаем данные статистики
        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);

        // Отображаем статистику
        renderStatisticsContent(activeProgram, container);

        // Настраиваем обработчики периодов
        setupPeriodHandlers(container);

        // Инициализируем график
        updateWeightChart('week');

        // Добавляем советы
        await renderTips();
    } catch (error) {
        console.error('Ошибка при инициализации статистики:', error);
        showError('Не удалось загрузить статистику');
    }
} 