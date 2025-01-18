// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

// Сохранение профиля
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
        console.log('Отправка данных:', formData);
        tg.sendData(JSON.stringify(formData));
        console.log('Данные успешно отправлены');
        
        // Показываем сообщение об успехе
        tg.showPopup({
            title: 'Успех',
            message: 'Данные профиля сохранены',
            buttons: [{type: 'ok'}]
        });
        
        // Закрываем мини-приложение через секунду
        setTimeout(() => tg.close(), 1000);
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

// Загрузка данных профиля при старте
async function loadProfile() {
    try {
        const formData = {
            action: 'get_profile'
        };
        console.log('Отправка запроса на получение профиля:', formData);
        tg.sendData(JSON.stringify(formData));
        console.log('Запрос отправлен');
    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        tg.showPopup({
            title: 'Ошибка',
            message: 'Не удалось загрузить данные профиля',
            buttons: [{type: 'ok'}]
        });
    }
}

// Обработчик ответа от бота
tg.onEvent('message', function(event) {
    console.log('Сработал обработчик сообщений');
    console.log('Получено сообщение от бота:', event);
    try {
        const response = JSON.parse(event.text);
        console.log('Разобранный ответ:', response);
        
        if (response.status === 'success' && response.profile) {
            // Заполняем форму данными профиля
            const profile = response.profile;
            document.getElementById('name').value = profile.name || '';
            document.getElementById('age').value = profile.age || '';
            document.getElementById('gender').value = profile.gender || 'male';
            document.getElementById('height').value = profile.height || '';
            document.getElementById('weight').value = profile.weight || '';
            document.getElementById('goal').value = profile.goal || 'maintenance';
        } else if (response.status === 'error') {
            tg.showPopup({
                title: 'Ошибка',
                message: response.message || 'Произошла ошибка',
                buttons: [{type: 'ok'}]
            });
        }
    } catch (error) {
        console.error('Ошибка при обработке ответа:', error);
    }
});

// Также добавим обработчик всех событий для отладки
tg.onEvent('*', function(event) {
    console.log('Получено событие:', event);
});

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadProfile(); // Загружаем данные при старте
}); 