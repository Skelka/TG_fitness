import { tg } from './globals.js';
import { getStorageItem, setStorageItem } from './storage.js';
import { showNotification, showPopupSafe } from './ui.js';

export async function initializeProgram(programId) {
    try {
        const program = window.programData[programId];
        if (!program) {
            throw new Error('Программа не найдена');
        }

        // Проверяем, нет ли уже активной программы
        const activeProgram = await getStorageItem('activeProgram')
            .then(data => data ? JSON.parse(data) : null);

        if (activeProgram && activeProgram.id !== programId && programId !== 'morning_workout') {
            await showPopupSafe({
                title: 'Внимание',
                message: 'У вас уже есть активная программа. Хотите её заменить?',
                buttons: [
                    {type: 'destructive', text: 'Заменить', id: 'replace'},
                    {type: 'default', text: 'Отмена', id: 'cancel'}
                ]
            });
            return;
        }

        // Инициализируем программу
        const initializedProgram = {
            ...program,
            startDate: Date.now(),
            workouts: program.workouts.map(workout => ({
                ...workout,
                completed: false
            }))
        };

        await setStorageItem('activeProgram', JSON.stringify(initializedProgram));
        showNotification('Программа успешно активирована');

        // Показываем детали программы
        await showProgramDetails(programId);

    } catch (error) {
        console.error('Ошибка при инициализации программы:', error);
        showNotification('Ошибка при инициализации программы', true);
    }
}

export async function showProgramDetails(programId) {
    const program = window.programData[programId];
    if (!program) return;

    const container = document.querySelector('.programs-list');
    if (!container) return;

    const activeProgram = await getStorageItem('activeProgram')
        .then(data => data ? JSON.parse(data) : null);

    const isActive = activeProgram && activeProgram.id === programId;

    container.innerHTML = `
        <div class="program-header">
            <button class="back-btn" onclick="showProgramList()">
                <span class="material-symbols-rounded">arrow_back</span>
            </button>
            <h2>${program.name}</h2>
        </div>
        <div class="program-details">
            <div class="program-info">
                <p>${program.description}</p>
                <div class="program-meta">
                    <span>
                        <span class="material-symbols-rounded">timer</span>
                        ${program.duration} недель
                    </span>
                    <span>
                        <span class="material-symbols-rounded">calendar_month</span>
                        ${program.workoutsPerWeek} тр/нед
                    </span>
                </div>
            </div>
            <div class="program-workouts">
                ${program.workouts.map((workout, index) => `
                    <div class="workout-card ${activeProgram?.workouts[index]?.completed ? 'completed' : ''}">
                        <div class="workout-info">
                            <h3>${workout.name}</h3>
                            <p>${workout.description}</p>
                        </div>
                        <button class="start-workout-btn" onclick="startWorkout('${programId}', '${workout.id}')"
                            ${activeProgram?.workouts[index]?.completed ? 'disabled' : ''}>
                            <span class="material-symbols-rounded">play_arrow</span>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

export function showProgramList() {
    const container = document.querySelector('.programs-list');
    if (!container) return;

    let html = '<div class="programs-grid">';
    
    Object.entries(window.programData).forEach(([id, program]) => {
        html += `
            <div class="program-card" onclick="showProgramDetails('${id}')">
                <div class="program-icon">
                    <span class="material-symbols-rounded">${program.icon}</span>
                </div>
                <div class="program-info">
                    <h3>${program.name}</h3>
                    <p>${program.description}</p>
                    <div class="program-meta">
                        <span>${program.duration} недель</span>
                        <span>${program.workoutsPerWeek} тр/нед</span>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
} 