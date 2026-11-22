#!/usr/bin/env python3
"""Publish the parent and teacher rich menus to the configured LINE OA.

Run from the repository root after setting LINE_CHANNEL_ACCESS_TOKEN in .env.
The token is read locally and is never printed.
"""

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PARENT_IMAGE = ROOT / "public/line/rich-menu-leave.png"
TEACHER_IMAGE = ROOT / "public/line/rich-menu-teacher.png"
ENV = ROOT / ".env"
EXPECTED_BASIC_ID = "@089fdgbv"
MENU_NAME = "Chumkosoft leave request v1"
MENU = {
    "size": {"width": 2500, "height": 843},
    "selected": True,
    "name": MENU_NAME,
    "chatBarText": "เมนูแจ้งลา",
    "areas": [{
        "bounds": {"x": 0, "y": 0, "width": 2500, "height": 843},
        "action": {"type": "postback", "data": "leave|start"},
    }],
}
TEACHER_CONFIG = json.loads((ROOT / "scripts/line-teacher-menu.json").read_text(encoding="utf-8"))
TEACHER_WIDTH = 2500
TEACHER_ROW_HEIGHT = 843
TEACHER_MENU = {
    "size": {"width": TEACHER_WIDTH, "height": TEACHER_ROW_HEIGHT * len(TEACHER_CONFIG["rows"])},
    "selected": True,
    "name": TEACHER_CONFIG["name"],
    "chatBarText": "เมนูครู",
    "areas": [
        {
            "bounds": {
                "x": column * TEACHER_WIDTH // len(row),
                "y": index * TEACHER_ROW_HEIGHT,
                "width": (column + 1) * TEACHER_WIDTH // len(row) - column * TEACHER_WIDTH // len(row),
                "height": TEACHER_ROW_HEIGHT,
            },
            "action": (
                {"type": "postback", "label": button["label"], "data": button["postback"]}
                if "postback" in button
                else {"type": "uri", "label": button["label"], "uri": f"https://chumkosoft.com{button['path']}"}
            ),
        }
        for index, row in enumerate(TEACHER_CONFIG["rows"])
        for column, button in enumerate(row)
    ],
}


def read_token():
    token = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN", "").strip()
    if token:
        return token
    if not ENV.is_file():
        return ""
    for line in ENV.read_text(encoding="utf-8").splitlines():
        if line.startswith("LINE_CHANNEL_ACCESS_TOKEN="):
            return line.partition("=")[2].strip().strip('"\'')
    return ""


def request(url, token, method="GET", data=None, content_type=None, binary=False, allow_404=False):
    headers = {"Authorization": f"Bearer {token}"}
    if content_type:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            body = response.read()
            if binary:
                return body
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as error:
        if allow_404 and error.code == 404:
            return None
        message = error.read().decode("utf-8", errors="replace")[:400]
        raise RuntimeError(f"LINE API {method} {url}: HTTP {error.code}: {message}") from error


def publish_menu(api, token, menu, image, existing):
    if not image.is_file() or image.stat().st_size > 1_000_000:
        raise RuntimeError(f"ภาพริชเมนูไม่พบหรือใหญ่เกิน 1 MB: {image.name}")
    payload = json.dumps(menu, ensure_ascii=False).encode("utf-8")
    request(f"{api}/richmenu/validate", token, "POST", payload, "application/json")
    matches = [entry for entry in existing if entry.get("name") == menu["name"]]
    if matches:
        menu_id = matches[0]["richMenuId"]
        print(f"พบเมนูเดิม {menu['name']}: {menu_id}")
    else:
        created = request(f"{api}/richmenu", token, "POST", payload, "application/json")
        menu_id = created["richMenuId"]
        print(f"สร้างเมนู {menu['name']}: {menu_id}")

    image_url = f"https://api-data.line.me/v2/bot/richmenu/{menu_id}/content"
    if request(image_url, token, binary=True, allow_404=True) is None:
        request(image_url, token, "POST", image.read_bytes(), "image/png")
        print(f"อัปโหลดภาพ {image.name} แล้ว")
    return menu_id


def main():
    token = read_token()
    if not token:
        raise RuntimeError("ยังไม่มี LINE_CHANNEL_ACCESS_TOKEN ใน environment หรือ .env")

    api = "https://api.line.me/v2/bot"
    account = request(f"{api}/info", token)
    if account.get("basicId") != EXPECTED_BASIC_ID:
        raise RuntimeError("โทเคนไม่ใช่ของ LINE OA Chumkosoft School; ยกเลิกการเผยแพร่")

    existing = request(f"{api}/richmenu/list", token).get("richmenus", [])
    parent_id = publish_menu(api, token, MENU, PARENT_IMAGE, existing)
    teacher_id = publish_menu(api, token, TEACHER_MENU, TEACHER_IMAGE, existing)
    request(f"{api}/user/all/richmenu/{parent_id}", token, "POST", b"")
    current = request(f"{api}/user/all/richmenu", token)
    if current.get("richMenuId") != parent_id:
        raise RuntimeError("ตรวจสอบค่าเริ่มต้นไม่ผ่าน")
    print(f"เมนูผู้ปกครองเป็นค่าเริ่มต้น: {parent_id}")
    print(f"เมนูครูพร้อมกำหนดรายบัญชี: {teacher_id}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, RuntimeError) as error:
        print(f"เผยแพร่ไม่สำเร็จ: {error}", file=sys.stderr)
        sys.exit(1)
