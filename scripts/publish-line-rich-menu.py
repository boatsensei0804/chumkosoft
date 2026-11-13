#!/usr/bin/env python3
"""Publish the leave-request rich menu to the configured LINE Official Account.

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
IMAGE = ROOT / "public/line/rich-menu-leave.png"
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


def main():
    if not IMAGE.is_file():
        raise RuntimeError("ไม่พบ public/line/rich-menu-leave.png ในโปรเจกต์")
    if IMAGE.stat().st_size > 1_000_000:
        raise RuntimeError("ภาพริชเมนูต้องมีขนาดไม่เกิน 1 MB")
    token = read_token()
    if not token:
        raise RuntimeError("ยังไม่มี LINE_CHANNEL_ACCESS_TOKEN ใน environment หรือ .env")

    api = "https://api.line.me/v2/bot"
    account = request(f"{api}/info", token)
    if account.get("basicId") != EXPECTED_BASIC_ID:
        raise RuntimeError("โทเคนไม่ใช่ของ LINE OA Chumkosoft School; ยกเลิกการเผยแพร่")

    payload = json.dumps(MENU, ensure_ascii=False).encode("utf-8")
    request(f"{api}/richmenu/validate", token, "POST", payload, "application/json")
    existing = request(f"{api}/richmenu/list", token).get("richmenus", [])
    matches = [menu for menu in existing if menu.get("name") == MENU_NAME]
    if matches:
        menu_id = matches[0]["richMenuId"]
        print(f"พบเมนูเดิม {menu_id}; จะตั้งเป็นค่าเริ่มต้น")
    else:
        created = request(f"{api}/richmenu", token, "POST", payload, "application/json")
        menu_id = created["richMenuId"]
        print(f"สร้างเมนู {menu_id}")

    image_url = f"https://api-data.line.me/v2/bot/richmenu/{menu_id}/content"
    if request(image_url, token, binary=True, allow_404=True) is None:
        request(
            image_url,
            token,
            "POST",
            IMAGE.read_bytes(),
            "image/png",
        )
        print("อัปโหลดภาพแล้ว")

    request(f"{api}/user/all/richmenu/{menu_id}", token, "POST", b"")
    current = request(f"{api}/user/all/richmenu", token)
    if current.get("richMenuId") != menu_id:
        raise RuntimeError("ตรวจสอบค่าเริ่มต้นไม่ผ่าน")
    print(f"เผยแพร่ริชเมนูให้ทุกคนแล้ว: {menu_id}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, RuntimeError) as error:
        print(f"เผยแพร่ไม่สำเร็จ: {error}", file=sys.stderr)
        sys.exit(1)
