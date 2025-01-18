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
        tg.sendData(JSON.stringify(formData));
    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        tg.showPopup({
            title: 'Ошибка',
            message: 'Не удалось загрузить данные профиля',
            buttons: [{type: 'ok'}]
        });
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadProfile(); // Загружаем данные при старте
}); 