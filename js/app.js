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
        // Сначала пробуем загрузить из CloudStorage
        const storedData = await tg.CloudStorage.getItem('profile');
        if (storedData) {
            const profile = JSON.parse(storedData);
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
            // Если в CloudStorage нет данных, пробуем загрузить из URL
            const urlParams = new URLSearchParams(window.location.search);
            const encodedData = urlParams.get('data');
            
            if (encodedData) {
                const profile = JSON.parse(decodeURIComponent(encodedData));
                console.log('Загружены данные из URL:', profile);
                
                // Заполняем форму и сохраняем в CloudStorage
                document.getElementById('name').value = profile.name || '';
                document.getElementById('age').value = profile.age || '';
                document.getElementById('gender').value = profile.gender || 'male';
                document.getElementById('height').value = profile.height || '';
                document.getElementById('weight').value = profile.weight || '';
                document.getElementById('goal').value = profile.goal || 'maintenance';
                
                // Сохраняем в CloudStorage
                await tg.CloudStorage.setItem('profile', JSON.stringify(profile));
                console.log('Данные из URL сохранены в CloudStorage');
                
                tg.HapticFeedback.notificationOccurred('success');
            }
        }
        
        // Показываем кнопку после загрузки данных
        mainButton.show();
    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
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
        await tg.CloudStorage.setItem('profile', JSON.stringify(profileData));
        console.log('Данные сохранены в CloudStorage');

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
        // Проверяем, что WebApp инициализирован
        if (!window.Telegram || !window.Telegram.WebApp) {
            throw new Error('Telegram WebApp не инициализирован');
        }

        // Проверяем версию WebApp
        console.log('Версия WebApp:', tg.version);
        console.log('Платформа:', tg.platform);
        console.log('Инициализация WebApp:', tg.initData);
        console.log('Доступные методы WebApp:', Object.keys(tg));

        setupEventListeners();
        loadProfile();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        alert('Ошибка инициализации приложения: ' + error.message);
    }
}); 