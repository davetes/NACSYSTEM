#!/bin/bash

# Create folder structure
echo "Creating folder structure..."
mkdir -p backend/api backend/models backend/utils frontend docs scripts

# Create placeholder files
echo "Creating placeholder files..."
touch docs/api.md
touch .env
touch .gitignore

# Move existing files to new locations
echo "Moving existing files..."
[ -f app.py ] && mv app.py backend/ || echo "app.py not found"
[ -f nac_controller.py ] && mv nac_controller.py backend/ || echo "nac_controller.py not found"
[ -f radius_auth.py ] && mv radius_auth.py backend/ || echo "radius_auth.py not found"
[ -f nac.py ] && mv nac.py scripts/ || echo "nac.py not found"
[ -f requirements.txt ] && mv requirements.txt backend/ || echo "requirements.txt not found"

# Verify the structure
echo "Verifying folder structure..."
tree -a || echo "tree command not available, listing directories manually..."
ls -R

echo "Setup complete! Check the structure above."
