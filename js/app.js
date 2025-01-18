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
        tg.sendData(JSON.stringify(formData));
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

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
}); 