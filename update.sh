#!/bin/bash

# Сначала получаем изменения из репозитория
echo "Pulling updates from repository..."
git pull origin main

# Затем добавляем наши изменения
echo "Adding changes..."
git add .

# Коммитим изменения
echo "Committing changes..."
git commit -m "Update content"

# Отправляем изменения в репозиторий
echo "Pushing changes..."
git push origin main

echo "Update completed!" 