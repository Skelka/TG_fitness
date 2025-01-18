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
        const result = await tg.CloudStorage.getItem('profile');
        console.log('Результат из CloudStorage:', result);
        
        // Проверяем, что получили значение
        if (result && result.value) {
            const profile = JSON.parse(result.value);
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
        const result = await tg.CloudStorage.setItem('profile', JSON.stringify(profileData));
        console.log('Результат сохранения в CloudStorage:', result);

        // Отправляем уведомление боту о том, что данные обновлены
        const sendData = {
            action: 'profile_updated',
            timestamp: Date.now()
        };
        
        tg.sendData(JSON.stringify(sendData));
        tg.HapticFeedback.notificationOccurred('success');

    } catch (error) {
        console.error('Ошибка при сохранении профиля:', error);
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
            const result = await tg.CloudStorage.getItem('profile');
            console.log('Результат из CloudStorage:', result);
            
            // Проверяем, что получили значение
            if (result && result.value) {
                const profile = JSON.parse(result.value);
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
            const result = await tg.CloudStorage.setItem('profile', JSON.stringify(profileData));
            console.log('Результат сохранения в CloudStorage:', result);

            // Отправляем уведомление боту о том, что данные обновлены
            const sendData = {
                action: 'profile_updated',
                timestamp: Date.now()
            };
            
            tg.sendData(JSON.stringify(sendData));
            tg.HapticFeedback.notificationOccurred('success');

        } catch (error) {
            console.error('Ошибка при сохранении профиля:', error);
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

    // Запускаем инициализацию
    setupEventListeners();
    loadProfile();
} 