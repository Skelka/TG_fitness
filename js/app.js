// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

// Настройка кнопок
const mainButton = tg.MainButton;
const backButton = tg.BackButton;

mainButton.setText('Сохранить профиль');
mainButton.hide();

// Загрузка данных профиля
async function loadProfile() {
    try {
        const result = await new Promise((resolve) => {
            tg.CloudStorage.getItem('profile', (error, value) => {
                if (error) {
                    console.error('Ошибка при получении данных:', error);
                    resolve(null);
                } else {
                    resolve(value);
                }
            });
        });

        console.log('Результат из CloudStorage:', result);
        
        if (result) {
            const profile = JSON.parse(result);
            console.log('Загружены данные из CloudStorage:', profile);
            
            // Сохраняем данные в глобальную переменную
            window.profileData = profile;

            // Заполняем форму только если мы на вкладке профиля
            if (document.getElementById('profile').classList.contains('active')) {
                fillProfileForm(profile);
            }
            
            tg.HapticFeedback.notificationOccurred('success');
        } else {
            console.log('Нет сохраненных данных в CloudStorage');
        }
    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        tg.showPopup({
            title: 'Ошибка',
            message: `Не удалось загрузить данные: ${error.message}`,
            buttons: [{type: 'ok'}]
        });
    }
}

// Функция для заполнения формы профиля
function fillProfileForm(profile) {
    const form = document.getElementById('profile-form');
    if (!form) return;

    const fields = ['name', 'age', 'gender', 'height', 'weight', 'goal'];
    fields.forEach(field => {
        const input = document.getElementById(field);
        if (input) {
            input.value = profile[field] || '';
        }
    });
}

// Сохранение профиля
async function saveProfile() {
    try {
        mainButton.setText('Сохранение...');
        mainButton.showProgress();

        const profileData = {
            name: document.getElementById('name').value || '',
            age: parseInt(document.getElementById('age').value) || 0,
            gender: document.getElementById('gender').value || 'male',
            height: parseFloat(document.getElementById('height').value) || 0,
            weight: parseFloat(document.getElementById('weight').value) || 0,
            goal: document.getElementById('goal').value || 'maintenance',
            lastUpdated: Date.now()
        };

        // Сохраняем историю веса
        let weightHistory = [];
        try {
            const storedHistory = await new Promise((resolve) => {
                tg.CloudStorage.getItem('weightHistory', (error, value) => {
                    resolve(value ? JSON.parse(value) : []);
                });
            });
            weightHistory = storedHistory;
        } catch (e) {
            console.error('Ошибка при загрузке истории веса:', e);
        }

        // Добавляем новую запись веса
        weightHistory.push({
            weight: profileData.weight,
            date: Date.now()
        });

        // Сохраняем профиль
        await new Promise((resolve, reject) => {
            tg.CloudStorage.setItem('profile', JSON.stringify(profileData), (error, success) => {
                if (error || !success) {
                    reject(error || new Error('Failed to save profile'));
                } else {
                    resolve(success);
                }
            });
        });

        // Сохраняем историю веса
        await new Promise((resolve, reject) => {
            tg.CloudStorage.setItem('weightHistory', JSON.stringify(weightHistory), (error, success) => {
                if (error || !success) {
                    reject(error || new Error('Failed to save weight history'));
                } else {
                    resolve(success);
                }
            });
        });

        // Обновляем график веса, если мы на вкладке статистики
        if (document.getElementById('stats').classList.contains('active')) {
            updateWeightChart(weightHistory);
        }

        // Обновляем сохраненные данные
        window.profileData = profileData;

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
        tg.HapticFeedback.notificationOccurred('error');
        tg.showPopup({
            title: 'Ошибка',
            message: `Не удалось сохранить данные: ${error.message}`,
            buttons: [{type: 'ok'}]
        });
    }
}

// Функция обновления графика веса
function updateWeightChart(weightHistory) {
    const chartPlaceholder = document.querySelector('#stats .chart-placeholder');
    if (!chartPlaceholder) return;

    // Очищаем placeholder
    chartPlaceholder.innerHTML = '';

    if (weightHistory.length === 0) {
        chartPlaceholder.textContent = 'Нет данных для отображения';
        return;
    }

    // Создаем простое текстовое представление истории веса
    const weightList = document.createElement('div');
    weightList.style.padding = '10px';
    weightList.style.width = '100%';

    weightHistory.slice(-5).forEach(record => {
        const date = new Date(record.date);
        const dateStr = date.toLocaleDateString('ru-RU');
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.marginBottom = '8px';
        item.innerHTML = `
            <span>${dateStr}</span>
            <span>${record.weight} кг</span>
        `;
        weightList.appendChild(item);
    });

    chartPlaceholder.appendChild(weightList);
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

            if (tabId === 'profile' && window.profileData) {
                fillProfileForm(window.profileData);
                mainButton.setText('Сохранить профиль');
                mainButton.show();
            } else if (tabId === 'stats') {
                // Загружаем и отображаем историю веса
                try {
                    const weightHistory = await new Promise((resolve) => {
                        tg.CloudStorage.getItem('weightHistory', (error, value) => {
                            resolve(value ? JSON.parse(value) : []);
                        });
                    });
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
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Ждем инициализации WebApp
        if (!window.Telegram || !window.Telegram.WebApp) {
            // Пробуем еще раз через небольшую задержку
            setTimeout(() => {
                initApp();
            }, 100);
            return;
        }
        
        initApp();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        alert('Ошибка инициализации приложения: ' + error.message);
    }
});

// Функция инициализации приложения
function initApp() {
    const tg = window.Telegram.WebApp;
    tg.expand();
    tg.enableClosingConfirmation();

    mainButton.setText('Сохранить профиль');
    mainButton.hide();

    // Проверяем версию WebApp
    console.log('Версия WebApp:', tg.version);
    console.log('Платформа:', tg.platform);
    console.log('Инициализация WebApp:', tg.initData);
    console.log('Доступные методы WebApp:', Object.keys(tg));

    // Загрузка данных профиля
    async function loadProfile() {
        try {
            const result = await new Promise((resolve) => {
                tg.CloudStorage.getItem('profile', (error, value) => {
                    if (error) {
                        console.error('Ошибка при получении данных:', error);
                        resolve(null);
                    } else {
                        resolve(value);
                    }
                });
            });

            console.log('Результат из CloudStorage:', result);
            
            if (result) {
                const profile = JSON.parse(result);
                console.log('Загружены данные из CloudStorage:', profile);
                
                // Сохраняем данные в глобальную переменную
                window.profileData = profile;

                // Заполняем форму только если мы на вкладке профиля
                if (document.getElementById('profile').classList.contains('active')) {
                    fillProfileForm(profile);
                }
                
                tg.HapticFeedback.notificationOccurred('success');
            } else {
                console.log('Нет сохраненных данных в CloudStorage');
            }
        } catch (error) {
            console.error('Ошибка при загрузке профиля:', error);
            tg.showPopup({
                title: 'Ошибка',
                message: `Не удалось загрузить данные: ${error.message}`,
                buttons: [{type: 'ok'}]
            });
        }
    }

    // Сохранение профиля
    async function saveProfile() {
        try {
            mainButton.setText('Сохранение...');
            mainButton.showProgress();

            const profileData = {
                name: document.getElementById('name').value || '',
                age: parseInt(document.getElementById('age').value) || 0,
                gender: document.getElementById('gender').value || 'male',
                height: parseFloat(document.getElementById('height').value) || 0,
                weight: parseFloat(document.getElementById('weight').value) || 0,
                goal: document.getElementById('goal').value || 'maintenance',
                lastUpdated: Date.now()
            };

            // Сохраняем историю веса
            let weightHistory = [];
            try {
                const storedHistory = await new Promise((resolve) => {
                    tg.CloudStorage.getItem('weightHistory', (error, value) => {
                        resolve(value ? JSON.parse(value) : []);
                    });
                });
                weightHistory = storedHistory;
            } catch (e) {
                console.error('Ошибка при загрузке истории веса:', e);
            }

            // Добавляем новую запись веса
            weightHistory.push({
                weight: profileData.weight,
                date: Date.now()
            });

            // Сохраняем профиль
            await new Promise((resolve, reject) => {
                tg.CloudStorage.setItem('profile', JSON.stringify(profileData), (error, success) => {
                    if (error || !success) {
                        reject(error || new Error('Failed to save profile'));
                    } else {
                        resolve(success);
                    }
                });
            });

            // Сохраняем историю веса
            await new Promise((resolve, reject) => {
                tg.CloudStorage.setItem('weightHistory', JSON.stringify(weightHistory), (error, success) => {
                    if (error || !success) {
                        reject(error || new Error('Failed to save weight history'));
                    } else {
                        resolve(success);
                    }
                });
            });

            // Обновляем график веса, если мы на вкладке статистики
            if (document.getElementById('stats').classList.contains('active')) {
                updateWeightChart(weightHistory);
            }

            // Обновляем сохраненные данные
            window.profileData = profileData;

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
            tg.HapticFeedback.notificationOccurred('error');
            tg.showPopup({
                title: 'Ошибка',
                message: `Не удалось сохранить данные: ${error.message}`,
                buttons: [{type: 'ok'}]
            });
        }
    }

    // Функция обновления графика веса
    function updateWeightChart(weightHistory) {
        const chartPlaceholder = document.querySelector('#stats .chart-placeholder');
        if (!chartPlaceholder) return;

        // Очищаем placeholder
        chartPlaceholder.innerHTML = '';

        if (weightHistory.length === 0) {
            chartPlaceholder.textContent = 'Нет данных для отображения';
            return;
        }

        // Создаем простое текстовое представление истории веса
        const weightList = document.createElement('div');
        weightList.style.padding = '10px';
        weightList.style.width = '100%';

        weightHistory.slice(-5).forEach(record => {
            const date = new Date(record.date);
            const dateStr = date.toLocaleDateString('ru-RU');
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.marginBottom = '8px';
            item.innerHTML = `
                <span>${dateStr}</span>
                <span>${record.weight} кг</span>
            `;
            weightList.appendChild(item);
        });

        chartPlaceholder.appendChild(weightList);
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

                if (tabId === 'profile' && window.profileData) {
                    fillProfileForm(window.profileData);
                    mainButton.setText('Сохранить профиль');
                    mainButton.show();
                } else if (tabId === 'stats') {
                    // Загружаем и отображаем историю веса
                    try {
                        const weightHistory = await new Promise((resolve) => {
                            tg.CloudStorage.getItem('weightHistory', (error, value) => {
                                resolve(value ? JSON.parse(value) : []);
                            });
                        });
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
    }

    // Обработчики для тренировок
    function setupWorkoutHandlers() {
        const workoutButtons = document.querySelectorAll('.start-workout-btn');
        workoutButtons.forEach(button => {
            button.addEventListener('click', () => {
                const workoutCard = button.closest('.workout-card');
                const workoutTitle = workoutCard.querySelector('h3').textContent;
                
                tg.HapticFeedback.impactOccurred('medium');
                tg.showPopup({
                    title: 'Начать тренировку',
                    message: `Вы хотите начать тренировку "${workoutTitle}"?`,
                    buttons: [
                        {
                            type: 'destructive',
                            text: 'Отмена'
                        },
                        {
                            type: 'default',
                            text: 'Начать',
                            id: 'start_workout'
                        }
                    ]
                });
            });
        });
    }

    // Обработчик для советов
    function setupTipsHandlers() {
        const tipCards = document.querySelectorAll('.tip-card');
        tipCards.forEach(card => {
            card.addEventListener('click', () => {
                const title = card.querySelector('h3').textContent;
                const content = card.querySelector('p').textContent;
                
                tg.HapticFeedback.selectionChanged();
                tg.showPopup({
                    title: title,
                    message: content,
                    buttons: [{type: 'ok'}]
                });
            });
        });
    }

    // Обновляем setupEventListeners
    function setupEventListeners() {
        // ... существующие обработчики ...

        // Добавляем новые обработчики
        setupTabHandlers();
        setupWorkoutHandlers();
        setupTipsHandlers();

        // Обработчик закрытия попапов
        tg.onEvent('popupClosed', (event) => {
            if (event.button_id === 'start_workout') {
                // Здесь будет логика начала тренировки
                tg.HapticFeedback.notificationOccurred('success');
                tg.showAlert('Тренировка начата! (демо)');
            }
        });
    }

    // Запускаем инициализацию
    setupEventListeners();
    loadProfile();
} 