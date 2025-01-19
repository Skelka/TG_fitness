// Базовые SVG-анимации для упражнений
window.exerciseAnimations = {
    // Приседания
    squats: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <style>
            @keyframes squat {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(20px); }
            }
            .figure { animation: squat 2s infinite; fill: none; stroke: %2340a7e3; stroke-width: 2; }
        </style>
        <g class="figure">
            <circle cx="50" cy="20" r="8"/>
            <line x1="50" y1="28" x2="50" y2="60"/>
            <line x1="50" y1="60" x2="35" y2="80"/>
            <line x1="50" y1="60" x2="65" y2="80"/>
            <line x1="50" y1="40" x2="35" y2="55"/>
            <line x1="50" y1="40" x2="65" y2="55"/>
        </g>
    </svg>`,

    // Отжимания
    pushups: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <style>
            @keyframes pushup {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            .figure { animation: pushup 2s infinite; fill: none; stroke: %2340a7e3; stroke-width: 2; }
        </style>
        <g class="figure">
            <line x1="20" y1="70" x2="80" y2="70"/>
            <line x1="30" y1="70" x2="30" y2="50"/>
            <line x1="70" y1="70" x2="70" y2="50"/>
            <line x1="30" y1="50" x2="70" y2="50"/>
        </g>
    </svg>`,

    // Планка
    plank: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <style>
            @keyframes plank {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(2px); }
            }
            .figure { animation: plank 2s infinite; fill: none; stroke: %2340a7e3; stroke-width: 2; }
        </style>
        <g class="figure">
            <line x1="20" y1="70" x2="80" y2="70"/>
            <line x1="25" y1="70" x2="25" y2="50"/>
            <line x1="75" y1="70" x2="75" y2="50"/>
            <line x1="25" y1="50" x2="75" y2="50"/>
        </g>
    </svg>`,

    // Заглушка для остальных упражнений
    default: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="%23f0f0f0"/>
        <text x="50" y="50" font-family="Arial" font-size="10" fill="%23999" text-anchor="middle">
            Упражнение
        </text>
    </svg>`
};

// Функция для получения анимации упражнения
window.getExerciseAnimation = function(exerciseName) {
    const key = exerciseName.toLowerCase()
        .replace(/[^a-zа-яё]/g, '')
        .replace(/приседания/, 'squats')
        .replace(/отжимания/, 'pushups')
        .replace(/планка/, 'plank');
    
    return window.exerciseAnimations[key] || window.exerciseAnimations.default;
}; 