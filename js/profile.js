// Функции для работы с профилем
import { getStorageItem, setStorageItem } from './storage.js';
import { showNotification, showError } from './ui.js';

export async function loadProfile() {
    try {
        // Загружаем фото профиля из Telegram
        const profilePhoto = document.getElementById('profile-photo');
        if (profilePhoto && tg.initDataUnsafe.user?.photo_url) {
            profilePhoto.src = tg.initDataUnsafe.user.photo_url;
        } else if (profilePhoto) {
            profilePhoto.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23999" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
        }

        // Загружаем имя пользователя
        const profileName = document.getElementById('profile-name');
        if (profileName && tg.initDataUnsafe.user?.first_name) {
            profileName.textContent = tg.initDataUnsafe.user.first_name;
        }

        // Загружаем данные профиля
        const profileData = await getStorageItem('profile')
            .then(data => data ? JSON.parse(data) : {});

        // Заполняем форму данными
        Object.entries(profileData).forEach(([key, value]) => {
            const input = document.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'radio') {
                    const radioInput = document.querySelector(`[name="${key}"][value="${value}"]`);
                    if (radioInput) radioInput.checked = true;
                } else if (input.type !== 'checkbox') {
                    input.value = value;
                }
            }
        });

        // Восстанавливаем выбранное оборудование
        if (profileData.equipment) {
            const equipmentCheckboxes = document.querySelectorAll('input[name="equipment"]');
            equipmentCheckboxes.forEach(checkbox => {
                checkbox.checked = profileData.equipment.includes(checkbox.value);
            });
        }

        // Восстанавливаем места тренировок
        if (profileData.workoutPlaces) {
            const placeButtons = document.querySelectorAll('.place-btn');
            placeButtons.forEach(button => {
                button.classList.toggle('active', 
                    profileData.workoutPlaces.includes(button.dataset.place)
                );
            });
        }

        // Обновляем статус профиля
        updateProfileStatus(profileData);

        // Устанавливаем обработчики после загрузки данных
        setupProfileEquipmentHandlers();

    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        showError('Не удалось загрузить профиль');
    }
}

export function updateProfileStatus(profile) {
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

export async function saveProfile() {
    try {
        const formData = new FormData(document.getElementById('profile-form'));
        const profileData = {
            gender: formData.get('gender'),
            age: parseInt(formData.get('age')),
            weight: parseFloat(formData.get('weight')),
            height: parseInt(formData.get('height')),
            goal: formData.get('goal'),
            activityLevel: formData.get('activityLevel'),
            equipment: formData.getAll('equipment'),
            lastUpdated: Date.now()
        };

        // Сохраняем данные профиля
        await setStorageItem('profile', JSON.stringify(profileData));
        
        // Обновляем историю веса
        const weightHistory = await getStorageItem('weightHistory')
            .then(data => data ? JSON.parse(data) : []);
        
        weightHistory.push({
            date: Date.now(),
            weight: profileData.weight
        });

        await setStorageItem('weightHistory', JSON.stringify(weightHistory));

        showNotification('Профиль сохранен');
        tg.HapticFeedback.notificationOccurred('success');

    } catch (error) {
        console.error('Ошибка при сохранении:', error);
        showNotification('Ошибка при сохранении', 'error');
        tg.HapticFeedback.notificationOccurred('error');
    }
}

export function setupProfileEquipmentHandlers() {
    const equipmentCheckboxes = document.querySelectorAll('input[name="equipment"]');
    equipmentCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', async () => {
            await saveProfile();
            tg.HapticFeedback.impactOccurred('light');
        });
    });

    const placeButtons = document.querySelectorAll('.place-btn');
    placeButtons.forEach(button => {
        button.addEventListener('click', async () => {
            button.classList.toggle('active');
            await saveProfile();
            tg.HapticFeedback.impactOccurred('light');
        });
    });
} 