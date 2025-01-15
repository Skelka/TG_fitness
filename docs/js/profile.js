// Загрузка профиля
async function loadProfile() {
    try {
        const profile = JSON.parse(localStorage.getItem('profile'));
        if (profile) {
            fillProfileForm(profile);
            state.profile = profile;
            
            // Загружаем фото профиля, если есть
            if (profile.photo) {
                document.getElementById('profile-image').src = profile.photo;
            }
        }
    } catch (error) {
        handleError(error);
    }
}

// Заполнение формы профиля
function fillProfileForm(profile) {
    const form = document.getElementById('profile-form');
    for (const [key, value] of Object.entries(profile)) {
        const input = form.elements[key];
        if (input && key !== 'photo') {
            input.value = value;
        }
    }
}

// Сохранение профиля
async function saveProfile(event) {
    event.preventDefault();
    
    try {
        loading.show();
        const formData = new FormData(event.target);
        const profileData = {
            type: 'profile_update',
            data: {
                ...Object.fromEntries(formData),
                photo: document.getElementById('profile-image').src
            }
        };

        if (navigator.onLine) {
            await sendDataToBot(profileData);
        }
        
        // Сохраняем локально в любом случае
        localStorage.setItem('profile', JSON.stringify(profileData.data));
        state.profile = profileData.data;
        
        tg.showAlert('Профиль успешно обновлен!');
        showSection('main-menu');
    } catch (error) {
        handleError(error);
    } finally {
        loading.hide();
    }
}

// Обработчик отправки формы профиля
document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await saveProfile(e);
}); 