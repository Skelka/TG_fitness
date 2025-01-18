// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

// Настройка MainButton для загрузки профиля
const mainButton = window.Telegram.WebApp.MainButton;
mainButton.setText('Получить данные профиля');
mainButton.show();

// Загрузка данных профиля
function loadProfile() {
    try {
        // Запрашиваем данные у бота через API
        fetch('/api/get_profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Id': tg.initDataUnsafe.user.id
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log('Получены данные профиля:', data);
            if (data.status === 'success' && data.profile) {
                // Заполняем форму данными профиля
                const profile = data.profile;
                document.getElementById('name').value = profile.name || '';
                document.getElementById('age').value = profile.age || '';
                document.getElementById('gender').value = profile.gender || 'male';
                document.getElementById('height').value = profile.height || '';
                document.getElementById('weight').value = profile.weight || '';
                document.getElementById('goal').value = profile.goal || 'maintenance';
                
                // Скрываем кнопку после загрузки данных
                mainButton.hide();
            }
        })
        .catch(error => {
            console.error('Ошибка при получении данных:', error);
            tg.showPopup({
                title: 'Ошибка',
                message: 'Не удалось загрузить данные профиля',
                buttons: [{type: 'ok'}]
            });
        });
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

// Настраиваем обработчик нажатия на кнопку
mainButton.onClick(loadProfile);

// Сохранение профиля (отправка данных боту)
async function saveProfile() {
    const formData = {
        action: 'save_profile',
        profile: {
            name: document.getElementById('name').value || '',
            age: parseInt(document.getElementById('age').value) || 0,
            gender: document.getElementById('gender').value || 'male',
            height: parseFloat(document.getElementById('height').value) || 0,
            weight: parseFloat(document.getElementById('weight').value) || 0,
            goal: document.getElementById('goal').value || 'maintenance'
        }
    };

    try {
        console.log('Отправка данных профиля:', formData);
        tg.sendData(JSON.stringify(formData));
        console.log('Данные успешно отправлены');
        
        tg.showPopup({
            title: 'Успех',
            message: 'Данные профиля сохранены',
            buttons: [{type: 'ok'}]
        });
    } catch (error) {
        console.error('Ошибка при сохранении профиля:', error);
        tg.showPopup({
            title: 'Ошибка',
            message: 'Произошла ошибка при сохранении',
            buttons: [{type: 'ok'}]
        });
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    document.addEventListener('submit', function(e) {
        if (e.target.id === 'profile-form') {
            e.preventDefault();
            saveProfile();
        }
    });

    // Добавляем обработчик для скрытия клавиатуры
    document.addEventListener('click', function(e) {
        if (!e.target.matches('input') && !e.target.matches('select')) {
            if (document.activeElement instanceof HTMLInputElement || 
                document.activeElement instanceof HTMLSelectElement) {
                document.activeElement.blur();
            }
        }
    });

    // Добавляем обработчик для input type="number"
    document.addEventListener('focus', function(e) {
        if (e.target.type === 'number') {
            e.target.select();
        }
    }, true);
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    // Автоматически загружаем данные при старте
    loadProfile();
}); 