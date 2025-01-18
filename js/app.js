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
        // Пробуем загрузить данные из CloudStorage
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
            
            // Заполняем форму
            document.getElementById('name').value = profile.name || '';
            document.getElementById('age').value = profile.age || '';
            document.getElementById('gender').value = profile.gender || 'male';
            document.getElementById('height').value = profile.height || '';
            document.getElementById('weight').value = profile.weight || '';
            document.getElementById('goal').value = profile.goal || 'maintenance';
            
            tg.HapticFeedback.notificationOccurred('success');
        } else {
            console.log('Нет сохраненных данных в CloudStorage');
        }
        
        // Показываем кнопку после загрузки данных
        mainButton.show();
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
        // Меняем текст кнопки
        mainButton.setText('Сохранение...');
        mainButton.showProgress();

        const profileData = {
            name: document.getElementById('name').value || '',
            age: parseInt(document.getElementById('age').value) || 0,
            gender: document.getElementById('gender').value || 'male',
            height: parseFloat(document.getElementById('height').value) || 0,
            weight: parseFloat(document.getElementById('weight').value) || 0,
            goal: document.getElementById('goal').value || 'maintenance'
        };

        console.log('Подготовленные данные для сохранения:', profileData);

        // Сохраняем в CloudStorage
        const result = await new Promise((resolve, reject) => {
            tg.CloudStorage.setItem('profile', JSON.stringify(profileData), (error, success) => {
                if (error || !success) {
                    reject(error || new Error('Failed to save data'));
                } else {
                    resolve(success);
                }
            });
        });

        console.log('Результат сохранения в CloudStorage:', result);

        // Отправляем уведомление боту
        const sendData = {
            action: 'profile_updated',
            timestamp: Date.now()
        };
        
        tg.sendData(JSON.stringify(sendData));
        tg.HapticFeedback.notificationOccurred('success');

        // Показываем статус "Сохранено"
        mainButton.hideProgress();
        mainButton.setText('Сохранено ✓');
        setTimeout(() => {
            mainButton.setText('Сохранить профиль');
        }, 2000);

    } catch (error) {
        console.error('Ошибка при сохранении профиля:', error);
        mainButton.hideProgress();
        mainButton.setText('Сохранить профиль');
        tg.HapticFeedback.notificationOccurred('error');
        tg.showPopup({
            title: 'Ошибка',
            message: `Произошла ошибка при сохранении: ${error.message}`,
            buttons: [{type: 'ok'}]
        });
    }
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
            // Пробуем загрузить данные из CloudStorage
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
                
                // Заполняем форму
                document.getElementById('name').value = profile.name || '';
                document.getElementById('age').value = profile.age || '';
                document.getElementById('gender').value = profile.gender || 'male';
                document.getElementById('height').value = profile.height || '';
                document.getElementById('weight').value = profile.weight || '';
                document.getElementById('goal').value = profile.goal || 'maintenance';
                
                tg.HapticFeedback.notificationOccurred('success');
            } else {
                console.log('Нет сохраненных данных в CloudStorage');
            }
            
            // Показываем кнопку после загрузки данных
            mainButton.show();
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
            // Меняем текст кнопки
            mainButton.setText('Сохранение...');
            mainButton.showProgress();

            const profileData = {
                name: document.getElementById('name').value || '',
                age: parseInt(document.getElementById('age').value) || 0,
                gender: document.getElementById('gender').value || 'male',
                height: parseFloat(document.getElementById('height').value) || 0,
                weight: parseFloat(document.getElementById('weight').value) || 0,
                goal: document.getElementById('goal').value || 'maintenance'
            };

            console.log('Подготовленные данные для сохранения:', profileData);

            // Сохраняем в CloudStorage
            const result = await new Promise((resolve, reject) => {
                tg.CloudStorage.setItem('profile', JSON.stringify(profileData), (error, success) => {
                    if (error || !success) {
                        reject(error || new Error('Failed to save data'));
                    } else {
                        resolve(success);
                    }
                });
            });

            console.log('Результат сохранения в CloudStorage:', result);

            // Отправляем уведомление боту
            const sendData = {
                action: 'profile_updated',
                timestamp: Date.now()
            };
            
            tg.sendData(JSON.stringify(sendData));
            tg.HapticFeedback.notificationOccurred('success');

            // Показываем статус "Сохранено"
            mainButton.hideProgress();
            mainButton.setText('Сохранено ✓');
            setTimeout(() => {
                mainButton.setText('Сохранить профиль');
            }, 2000);

        } catch (error) {
            console.error('Ошибка при сохранении профиля:', error);
            mainButton.hideProgress();
            mainButton.setText('Сохранить профиль');
            tg.HapticFeedback.notificationOccurred('error');
            tg.showPopup({
                title: 'Ошибка',
                message: `Произошла ошибка при сохранении: ${error.message}`,
                buttons: [{type: 'ok'}]
            });
        }
    }

    // Добавляем обработчик переключения вкладок
    function setupTabHandlers() {
        const tabs = document.querySelectorAll('.tab-btn');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Убираем активный класс у всех вкладок
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));

                // Добавляем активный класс выбранной вкладке
                tab.classList.add('active');
                const tabId = tab.dataset.tab;
                document.getElementById(tabId).classList.add('active');

                // Показываем/скрываем главную кнопку
                if (tabId === 'profile') {
                    const form = document.getElementById('profile-form');
                    const hasData = Array.from(form.querySelectorAll('input, select'))
                        .some(input => input.value);
                    if (hasData) {
                        mainButton.show();
                    }
                    mainButton.setText('Сохранить профиль');
                } else {
                    mainButton.hide();
                }

                // Вибрация при переключении
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