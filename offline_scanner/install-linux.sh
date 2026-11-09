#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
source_dir="$script_dir/dist/ChumkosoftScanner"
install_dir="$HOME/.local/opt/chumkosoft-scanner"
desktop_dir="${XDG_DATA_HOME:-$HOME/.local/share}/applications"

if [ ! -x "$source_dir/ChumkosoftScanner" ]; then
  echo "Build first: .venv/bin/pyinstaller --noconfirm desktop.spec" >&2
  exit 1
fi

mkdir -p "$install_dir" "$desktop_dir"
cp -R "$source_dir/." "$install_dir/"
cat > "$desktop_dir/chumkosoft-scanner.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Chumkosoft Scanner
Comment=Offline face scanner prototype
Exec="$install_dir/ChumkosoftScanner"
Icon=camera-video
Terminal=false
Categories=Education;Utility;
EOF
echo "Installed: $install_dir/ChumkosoftScanner"
