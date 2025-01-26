// Функции для работы с профилем
async function loadProfile() {
    try {
        const profileData = await getStorageItem('profile')
            .then(data => data ? JSON.parse(data) : null);

        if (!profileData) return;

        // Заполняем форму данными профиля
        const form = document.getElementById('profile-form');
        if (!form) return;

        // Заполняем текстовые поля
        ['age', 'height', 'weight'].forEach(field => {
            const input = form.querySelector(`input[name="${field}"]`);
            if (input && profileData[field]) {
                input.value = profileData[field];
            }
        });

        // Заполняем радио-кнопки
        ['gender', 'goal', 'level'].forEach(field => {
            const radio = form.querySelector(`input[name="${field}"][value="${profileData[field]}"]`);
            if (radio) {
                radio.checked = true;
            }
        });

        // Заполняем место тренировок
        if (profileData.workoutPlace) {
            const placeBtn = form.querySelector(`.place-btn[data-place="${profileData.workoutPlace}"]`);
            if (placeBtn) {
                document.querySelectorAll('.place-btn').forEach(btn => btn.classList.remove('active'));
                placeBtn.classList.add('active');
            }
        }

        // Заполняем оборудование
        if (profileData.equipment && Array.isArray(profileData.equipment)) {
            profileData.equipment.forEach(eq => {
                const checkbox = form.querySelector(`input[name="equipment"][value="${eq}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }

        // Обновляем статус профиля
        updateProfileStatus(profileData);

        // Обновляем фото профиля и имя, если доступны
        const profilePhoto = document.getElementById('profile-photo');
        const profileName = document.getElementById('profile-name');
        
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            const user = window.Telegram.WebApp.initDataUnsafe.user;
            if (profilePhoto && user.photo_url) {
                profilePhoto.src = user.photo_url;
            }
            if (profileName && user.first_name) {
                profileName.textContent = user.first_name;
            }
        }

    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        showError('Не удалось загрузить профиль');
    }
}

function updateProfileStatus(profile) {
    const statusElement = document.querySelector('.profile-status');
    if (!statusElement) return;

    if (!profile) {
        statusElement.textContent = 'Профиль не заполнен';
        return;
    }

    const level = profile.level || 'beginner';
    const statusMap = {
        beginner: 'Новичок',
        intermediate: 'Продолжающий',
        advanced: 'Продвинутый'
    };

    statusElement.textContent = statusMap[level] || 'Новичок';
}

function setupProfileEquipmentHandlers() {
    const placeButtons = document.querySelectorAll('.place-btn');
    placeButtons.forEach(button => {
        button.addEventListener('click', () => {
            placeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
}

async function saveProfile() {
    try {
        const form = document.getElementById('profile-form');
        if (!form) return;

        const profileData = {
            age: parseInt(form.querySelector('input[name="age"]').value),
            height: parseInt(form.querySelector('input[name="height"]').value),
            weight: parseFloat(form.querySelector('input[name="weight"]').value),
            gender: form.querySelector('input[name="gender"]:checked').value,
            goal: form.querySelector('input[name="goal"]:checked').value,
            level: form.querySelector('input[name="level"]:checked').value,
            workoutPlace: form.querySelector('.place-btn.active').dataset.place,
            equipment: Array.from(form.querySelectorAll('input[name="equipment"]:checked'))
                .map(input => input.value)
        };

        // Проверяем обязательные поля
        if (!profileData.age || !profileData.height || !profileData.weight) {
            showError('Пожалуйста, заполните все обязательные поля');
            return;
        }

        await setStorageItem('profile', JSON.stringify(profileData));
        showNotification('Профиль успешно сохранен');
        updateProfileStatus(profileData);

        // Сохраняем начальный вес в истории
        const weightHistory = await getStorageItem('weightHistory')
            .then(data => data ? JSON.parse(data) : []);

        if (!weightHistory.length) {
            await saveWeight(profileData.weight);
        }

        return profileData;
    } catch (error) {
        console.error('Ошибка при сохранении профиля:', error);
        showError('Не удалось сохранить профиль');
        return null;
    }
}

async function saveWeight(weight) {
    try {
        const weightHistory = await getStorageItem('weightHistory')
            .then(data => data ? JSON.parse(data) : []);

        weightHistory.push({
            date: new Date().toISOString(),
            weight: parseFloat(weight)
        });

        await setStorageItem('weightHistory', JSON.stringify(weightHistory));
        await updateWeightChart();
    } catch (error) {
        console.error('Ошибка при сохранении веса:', error);
    }
}

// Экспортируем функции
window.profileModule = {
    loadProfile,
    updateProfileStatus,
    setupProfileEquipmentHandlers,
    saveProfile,
    saveWeight
}; 