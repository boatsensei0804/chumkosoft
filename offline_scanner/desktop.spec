# Build from offline_scanner/: .venv/bin/pyinstaller --noconfirm desktop.spec
from pathlib import Path
import sys
import sysconfig

root = Path(SPECPATH).resolve()
project = root.parent
site_packages = Path(sysconfig.get_paths()["purelib"])
qt_platforms = site_packages / "PySide6" / "Qt" / "plugins" / "platforms"

a = Analysis(
    [str(root / "desktop_app.py")],
    pathex=[str(root)],
    binaries=[
        (str(site_packages / "shiboken6" / "Shiboken.abi3.so"), "shiboken6"),
        *((str(path), "PySide6/Qt/plugins/platforms") for path in qt_platforms.iterdir() if path.is_file()),
    ],
    datas=[
        (str(project / "public" / "models" / "scanner"), "bundled_models"),
        (str(project / "public" / "mascot" / "scan.png"), "mascot"),
        *((str(path), "fonts") for path in (root / "fonts").glob("*.ttf")),
        (str(root / "fonts" / "OFL.txt"), "fonts"),
        (str(site_packages / "shiboken6" / "__init__.py"), "shiboken6"),
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    module_collection_mode={"shiboken6": "py"},
    noarchive=False,
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="ChumkosoftScanner",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
)
coll = COLLECT(exe, a.binaries, a.datas, strip=False, upx=False, name="ChumkosoftScanner")
if sys.platform == "darwin":
    app = BUNDLE(
        coll,
        name="ChumkosoftScanner.app",
        bundle_identifier="com.chumkosoft.scanner",
        info_plist={
            "CFBundleDisplayName": "Chumkosoft Scanner",
            "NSCameraUsageDescription": "ใช้กล้องเพื่อสแกนใบหน้าและเช็กชื่อบนเครื่องนี้",
        },
    )
