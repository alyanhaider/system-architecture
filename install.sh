#!/usr/bin/env bash

# AI Skills Library Installer
# Usage: curl -sSL https://raw.githubusercontent.com/alyanhaider/system-architecture/main/install.sh | bash -s -- cors-configuration

SKILL=$1
TARGET_DIR=${2:-".cursor/rules"}

if [ -z "$SKILL" ]; then
  echo "❌ Error: Please specify a skill name."
  echo "Usage: ./install.sh <skill-name> [target-directory]"
  echo "Example: ./install.sh cors-configuration"
  exit 1
fi

echo "📥 Installing skill '$SKILL' to '$TARGET_DIR'..."

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Handle file extension difference for api-design-and-responses
if [ "$SKILL" = "api-design-and-responses" ]; then
  EXT="skill"
else
  EXT="md"
fi

# Download the skill file
URL="https://raw.githubusercontent.com/alyanhaider/system-architecture/main/skills/$SKILL/skill.$EXT"
RESPONSE=$(curl -s -o "$TARGET_DIR/$SKILL.md" -w "%{http_code}" "$URL")

if [ "$RESPONSE" -eq 200 ]; then
  echo "✅ Successfully installed $SKILL.md in $TARGET_DIR!"
else
  echo "❌ Failed to download skill. Please check the skill name."
  rm -f "$TARGET_DIR/$SKILL.md"
  exit 1
fi
