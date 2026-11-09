#!/bin/zsh

script_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$script_dir" || exit 1

if [ ! -x .venv/bin/python ]; then
  print -u2 "ไม่พบ Python ของโปรแกรมใน .venv"
  print -u2 "ติดตั้งก่อน: python3 -m venv .venv && .venv/bin/python -m pip install -r requirements.txt"
  exit 1
fi

# Qt can abort before Python can report an error if another Qt installation's
# platform plugin is inherited from the shell.
unset QT_QPA_PLATFORM QT_QPA_PLATFORM_PLUGIN_PATH QT_PLUGIN_PATH
export PYTHONFAULTHANDLER=1

.venv/bin/python desktop_app.py "$@"
scanner_exit_code=$?
if [ "$scanner_exit_code" -ne 0 ]; then
  print -u2 "โปรแกรมปิดด้วยรหัส $scanner_exit_code — ดูข้อความผิดพลาดด้านบน"
  if [ -t 0 ]; then
    print -n "กด Enter เพื่อปิดหน้าต่าง Terminal..."
    read -r
  fi
fi
exit "$scanner_exit_code"
