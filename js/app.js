// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

// Загрузка данных профиля
async function loadProfile() {
    try {
        const data = await tg.CloudStorage.getItem('profile');
        console.log('Получены сырые данные:', data);
        
        if (data && data.result) {  // Проверяем наличие result
            try {
                const profile = JSON.parse(data.result);  // Парсим result
                console.log('Загружены данные профиля:', profile);
                
                // Заполняем форму
                document.getElementById('name').value = profile.name || '';
                document.getElementById('age').value = profile.age || '';
                document.getElementById('gender').value = profile.gender || 'male';
                document.getElementById('height').value = profile.height || '';
                document.getElementById('weight').value = profile.weight || '';
                document.getElementById('goal').value = profile.goal || 'maintenance';
                
                // Показываем уведомление об успехе
                tg.HapticFeedback.notificationOccurred('success');
            } catch (parseError) {
                console.error('Ошибка при разборе данных профиля:', parseError);
                // Если данных нет или они некорректны, просто продолжаем с пустой формой
            }
        } else {
            console.log('Данные профиля не найдены, используем пустую форму');
        }
    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        tg.HapticFeedback.notificationOccurred('error');
        tg.showPopup({
            title: 'Ошибка',
            message: 'Не удалось загрузить данные профиля',
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

        // Сохраняем в CloudStorage
        const result = await tg.CloudStorage.setItem('profile', JSON.stringify(profileData));
        console.log('Результат сохранения:', result);
        
        if (result && result.result === true) {
            // Показываем уведомление об успехе
            tg.HapticFeedback.notificationOccurred('success');
            tg.showPopup({
                title: 'Успех',
                message: 'Данные профиля сохранены',
                buttons: [{type: 'ok'}]
            });
        } else {
            throw new Error('Не удалось сохранить данные');
        }
    } catch (error) {
        console.error('Ошибка при сохранении профиля:', error);
        tg.HapticFeedback.notificationOccurred('error');
        tg.showPopup({
            title: 'Ошибка',
            message: 'Произошла ошибка при сохранении',
            buttons: [{type: 'ok'}]
        });
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Форма
    document.addEventListener('submit', function(e) {
        if (e.target.id === 'profile-form') {
            e.preventDefault();
            saveProfile();
        }
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
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadProfile();
}); 