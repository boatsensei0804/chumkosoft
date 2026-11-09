"""Installable Mac/Linux scanner UI. Camera and recognition stay on this device."""

import argparse
import base64
import os
import queue
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo

from PySide6.QtCore import Qt, QTimer, QUrl
from PySide6.QtGui import QDesktopServices, QFont, QFontDatabase, QImage, QPixmap
from PySide6.QtWidgets import (
    QApplication,
    QComboBox,
    QFileDialog,
    QFrame,
    QGridLayout,
    QHeaderView,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QScrollArea,
    QSizePolicy,
    QStackedWidget,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from model_update import ModelUpdateError, bootstrap_bundled_models, ensure_models
from scanner import best_match, extract_face, load_cv
from settings import DETECTION_INTERVALS, REPEAT_COOLDOWNS, ScannerSettings, get_or_create_device_id, load_settings, save_settings
from store import check_in, enroll, open_store, pending_photo_count, pending_photos, templates
from sync import sync_live, sync_once
from web_client import SITE, KioskWebClient, upload_pending_photos, validate_site_url

THAI_TIME = ZoneInfo("Asia/Bangkok")


def font_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS) / "fonts"
    return Path(__file__).resolve().parent / "fonts"


def load_prompt_font() -> None:
    for name in ("Prompt-Regular.ttf", "Prompt-SemiBold.ttf", "Prompt-Bold.ttf"):
        path = font_dir() / name
        if path.is_file():
            QFontDatabase.addApplicationFont(str(path))


def app_data_dir() -> Path:
    override = os.environ.get("CHUMKOSOFT_SCANNER_DATA_DIR")
    if override:
        return Path(override).expanduser()
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "Chumkosoft Scanner"
    return Path(os.environ.get("XDG_DATA_HOME", str(Path.home() / ".local" / "share"))) / "chumkosoft-scanner"


def mascot_path() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS) / "mascot" / "scan.png"
    return Path(__file__).resolve().parent.parent / "public" / "mascot" / "scan.png"


STYLE = """
QWidget { font-family: 'Prompt'; color: #183454; font-size: 13px; }
QMainWindow, QWidget#root { background: #f3f8fc; }
QScrollArea { background: #f3f8fc; border: none; }
QFrame#sidebar { background: #ffffff; border-right: 1px solid #dce9f4; }
QFrame#scanresult { background: #e9f8ef; border: 1px solid #bde7d0; border-radius: 17px; }
QFrame#scanresult[mode="warn"] { background: #fff7e7; border-color: #f1dfb8; }
QLabel#resultname { font-size: 25px; font-weight: 700; color: #126c4b; }
QLabel#resultmeta { font-size: 16px; color: #267755; }
QFrame#scanresult[mode="warn"] QLabel#resultname { color: #a26f20; }
QFrame#scanresult[mode="warn"] QLabel#resultmeta { color: #a26f20; }
QFrame#card, QFrame#metric { background: white; border: 1px solid #dce9f4; border-radius: 17px; }
QFrame#metric { min-height: 75px; }
QFrame#paircard { background: white; border: 1px solid #dce9f4; border-radius: 22px; }
QLabel#brandmark { background: #0e6cbb; color: white; border-radius: 12px; font-size: 23px; font-weight: 800; }
QLabel#brandtitle { font-size: 19px; font-weight: 800; }
QLabel#brandsub { color: #8ca1b6; font-size: 10px; letter-spacing: 1px; }
QLabel#eyebrow { color: #2f88ce; font-size: 10px; font-weight: 800; }
QLabel#heading { font-size: 28px; font-weight: 800; }
QLabel#subtle { color: #7389a0; }
QLabel#section { font-size: 18px; font-weight: 800; }
QLabel#metriclabel { color: #758ca2; font-size: 11px; }
QLabel#metricvalue { font-size: 23px; font-weight: 800; }
QLabel#clock { font-size: 32px; font-weight: 700; }
QLabel#testbadge { background: #fff3d8; color: #9c6919; border-radius: 12px; padding: 7px 12px; font-weight: 700; }
QLabel#testbadge[mode="connected"] { background: #e8f7ef; color: #16825a; }
QLabel#statebadge { background: #e8f7ef; color: #16825a; border-radius: 12px; padding: 7px 12px; font-weight: 700; }
QLabel#camera { background: #dbeaf6; border: 1px solid #cbdfee; border-radius: 14px; }
QWidget#placeholder { background: #dbeaf6; border: 1px solid #cbdfee; border-radius: 14px; }
QLabel#feedback { background: #e9f5ff; color: #275f91; border: 1px solid #d3eafa; border-radius: 11px; padding: 17px; font-size: 15px; font-weight: 600; }
QLabel#feedback[mode="success"] { background: #e9f8ef; color: #167c55; border-color: #caebd7; }
QLabel#feedback[mode="warn"] { background: #fff7e7; color: #a26f20; border-color: #f1dfb8; }
QPushButton#nav { background: transparent; color: #607d98; text-align: left; padding: 13px 14px; font-size: 14px; }
QPushButton#nav:checked { background: #e1f0fc; color: #1267ad; }
QPushButton#collapse { background: #f0f7fd; color: #1267ad; text-align: left; padding: 10px 14px; }
QPushButton { background: #eaf4fc; color: #266da5; border: none; border-radius: 10px; padding: 10px 14px; font-weight: 700; min-height: 20px; }
QPushButton:hover { background: #dceefa; }
QPushButton:disabled { color: #9caebb; background: #f0f4f7; }
QPushButton#primary { background: #1974c9; color: white; }
QPushButton#primary:hover { background: #0e5fae; }
QPushButton#primary:disabled { background: #a7c9e6; color: white; }
QComboBox { background: #fbfdff; border: 1px solid #d7e5ef; border-radius: 9px; padding: 8px 10px; min-width: 95px; }
QComboBox:focus { border-color: #69afe4; }
QLineEdit { background: #fbfdff; border: 1px solid #d7e5ef; border-radius: 9px; padding: 9px 10px; min-height: 18px; }
QLineEdit:focus { border-color: #69afe4; }
QTableWidget { background: white; border: none; gridline-color: #edf2f6; selection-background-color: #e4f2ff; font-size: 14px; }
QHeaderView::section { background: #f7fbfe; color: #7089a0; padding: 9px; border: none; font-weight: 700; }
QLineEdit#studentsearch { background: white; border: 1px solid #cbdfee; border-radius: 10px; padding: 11px 13px; font-size: 14px; }
"""


def label(text: str, kind: str = "", word_wrap: bool = False) -> QLabel:
    item = QLabel(text)
    if kind:
        item.setObjectName(kind)
    item.setWordWrap(word_wrap)
    return item


def card() -> tuple[QFrame, QVBoxLayout]:
    frame = QFrame()
    frame.setObjectName("card")
    layout = QVBoxLayout(frame)
    layout.setContentsMargins(19, 18, 19, 18)
    layout.setSpacing(10)
    return frame, layout


class CurrentPageStack(QStackedWidget):
    """Size the scroll area for the visible page, not the tallest hidden page."""

    def sizeHint(self):
        current = self.currentWidget()
        return current.sizeHint() if current is not None else super().sizeHint()

    def minimumSizeHint(self):
        current = self.currentWidget()
        return current.minimumSizeHint() if current is not None else super().minimumSizeHint()


class ScannerWindow(QMainWindow):
    def __init__(self, data_dir: Path, sync_url: Optional[str] = None, camera_index: Optional[int] = None,
                 check_updates: bool = True, site_url: str = SITE, auto_connect: bool = True):
        super().__init__()
        self.setWindowTitle("Chumkosoft · เครื่องสแกนหน้า")
        self.resize(1240, 860)
        self.setMinimumSize(970, 690)
        self.setStyleSheet(STYLE)
        self.models_dir = data_dir / "models"
        self.db_path = data_dir / "scanner.sqlite3"
        self.settings_path = data_dir / "settings.json"
        self.device_id = get_or_create_device_id(data_dir / "device-id")
        saved = load_settings(self.settings_path)
        self.settings = ScannerSettings(
            camera_index=saved.camera_index if camera_index is None else camera_index,
            detection_interval_seconds=saved.detection_interval_seconds,
            repeat_cooldown_seconds=saved.repeat_cooldown_seconds,
            scan_start_time=saved.scan_start_time,
            late_after_time=saved.late_after_time,
        )
        bootstrap_bundled_models(self.models_dir)
        # The window must open even when the model website is slow or offline.
        self.cv, self.np, self.detector, self.recognizer, self.manifest = load_cv(self.models_dir, check_updates=False)
        self.db = open_store(self.db_path)
        self.sync_url = sync_url
        self.site_url = validate_site_url(site_url)
        self.camera_index = self.settings.camera_index
        self.background_results: queue.Queue[tuple] = queue.Queue()
        self.syncing = False
        self.heartbeating = False
        self.sync_status_note = ""
        self.web_client: Optional[KioskWebClient] = None
        self.pair_client: Optional[KioskWebClient] = None
        self.pair_device_code = ""
        self.pair_verification_url = ""
        self.pair_expires_at = 0.0
        self.pair_polling = False
        self.pair_generation = 0
        self.roster_loading = False
        self.roster_students: list[dict[str, str]] = []
        self.nav_collapsed = False
        self.uploading_photos = False
        self.camera = None
        self.current_frame = None
        self.last_detection = 0.0
        self.displayed_scan_date: Optional[str] = None
        self.streak_id = None
        self.streak_count = 0
        self.last_recorded: dict[str, float] = {}
        self._build_ui()
        self.refresh()
        self.clock_timer = QTimer(self)
        self.clock_timer.timeout.connect(self._update_clock)
        self.clock_timer.start(1000)
        self._update_clock()
        self.frame_timer = QTimer(self)
        self.frame_timer.timeout.connect(self._camera_tick)
        self.background_timer = QTimer(self)
        self.background_timer.timeout.connect(self._drain_background_results)
        self.background_timer.start(250)
        if check_updates:
            QTimer.singleShot(0, self._check_model_update)
        else:
            self.model_status.setText(f"โมเดล {self.manifest['model_version']} พร้อมใช้ในเครื่อง")
        self.sync_timer = QTimer(self)
        self.sync_timer.timeout.connect(self.try_sync)
        self.sync_timer.start(15000)
        self.heartbeat_timer = QTimer(self)
        self.heartbeat_timer.timeout.connect(self.send_heartbeat)
        self.heartbeat_timer.start(30000)
        self.photo_timer = QTimer(self)
        self.photo_timer.timeout.connect(self.upload_photos)
        self.photo_timer.start(30000)
        self.pair_timer = QTimer(self)
        self.pair_timer.timeout.connect(self.poll_pairing)
        self.pair_retry_timer = QTimer(self)
        self.pair_retry_timer.setSingleShot(True)
        self.pair_retry_timer.timeout.connect(self.start_pairing)
        self.camera_retry_timer = QTimer(self)
        self.camera_retry_timer.setSingleShot(True)
        self.camera_retry_timer.timeout.connect(self.start_camera)
        if auto_connect:
            QTimer.singleShot(0, self.start_pairing)

    def _build_ui(self):
        shell = QWidget()
        shell_layout = QHBoxLayout(shell)
        shell_layout.setContentsMargins(0, 0, 0, 0)
        shell_layout.setSpacing(0)
        self.setCentralWidget(shell)

        self.navigation_widget = QFrame()
        self.navigation_widget.setObjectName("sidebar")
        self.navigation_widget.setFixedWidth(218)
        nav_layout = QVBoxLayout(self.navigation_widget)
        nav_layout.setContentsMargins(11, 20, 11, 16)
        nav_layout.setSpacing(8)
        self.collapse_button = QPushButton("☰  ย่อเมนู")
        self.collapse_button.setObjectName("collapse")
        self.collapse_button.clicked.connect(self.toggle_navigation)
        nav_layout.addWidget(self.collapse_button)
        nav_layout.addSpacing(24)
        self.nav_buttons = []
        self.nav_titles = ("สแกนใบหน้า", "ภาพรวม", "ลงทะเบียนใบหน้า", "เชื่อมต่อและซิงก์", "ตั้งค่า")
        self.nav_symbols = ("◉", "▦", "⊕", "⇄", "⚙")
        for index, title in enumerate(self.nav_titles):
            button = QPushButton(f"{self.nav_symbols[index]}   {title}")
            button.setObjectName("nav")
            button.setCheckable(True)
            button.setToolTip(title)
            button.clicked.connect(lambda checked=False, page=index: self.show_page(page))
            nav_layout.addWidget(button)
            self.nav_buttons.append(button)
        nav_layout.addStretch()
        shell_layout.addWidget(self.navigation_widget)
        self.navigation_widget.setVisible(False)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.NoFrame)
        shell_layout.addWidget(scroll, stretch=1)
        root = QWidget()
        root.setObjectName("root")
        root.setMinimumHeight(710)
        scroll.setWidget(root)
        outer = QVBoxLayout(root)
        outer.setContentsMargins(27, 18, 27, 18)
        outer.setSpacing(12)

        header = QHBoxLayout()
        mark = label("ช", "brandmark")
        mark.setAlignment(Qt.AlignCenter)
        mark.setFixedSize(39, 39)
        header.addWidget(mark)
        brand = QVBoxLayout()
        brand.setSpacing(0)
        brand.addWidget(label("Chumkosoft", "brandtitle"))
        brand.addWidget(label("FACE SCAN STATION", "brandsub"))
        header.addLayout(brand)
        header.addStretch()
        self.connection_badge = label("รอเชื่อมเว็บ", "testbadge")
        header.addWidget(self.connection_badge)
        header.addWidget(label("พร้อมใช้งานออฟไลน์", "statebadge"))
        outer.addLayout(header)

        self.pages = CurrentPageStack()
        outer.addWidget(self.pages, stretch=1)
        overview_page, overview_layout = self._page("ภาพรวมสถานี", "ดูจำนวนผู้ลงทะเบียนและประวัติการสแกนในเครื่อง")
        scan_page, scan_page_layout = self._page("สแกนใบหน้า", "กล้องเริ่มทำงานอัตโนมัติหลังเชื่อมบัญชีจุดสแกน")
        enroll_page, enroll_page_layout = self._page("ลงทะเบียนใบหน้า", "ถ่ายภาพหรือเลือกรูปที่ได้รับความยินยอม")
        transfer_page, transfer_page_layout = self._page("เชื่อมต่อและซิงก์", "จัดการรูปและรายการเช็กชื่อที่รอส่งขึ้นเว็บไซต์")
        settings_page, settings_layout = self._page("ตั้งค่าเครื่องสแกน", "เลือกกล้องและปรับจังหวะการตรวจใบหน้าในเครื่องนี้")
        for page in (scan_page, overview_page, enroll_page, transfer_page, settings_page):
            self.pages.addWidget(page)
        self.show_page(3)

        metrics = QGridLayout()
        metrics.setSpacing(11)
        self.enrolled_value = self._metric(metrics, 0, "ผู้ทดสอบที่ลงทะเบียน")
        self.pending_value = self._metric(metrics, 1, "รอซิงก์")
        self.synced_value = self._metric(metrics, 2, "ส่งแล้ว")
        self.model_value = self._metric(metrics, 3, "รุ่นโมเดล")
        overview_layout.addLayout(metrics)

        scan_card, scan_layout = card()
        scan_card.setMinimumHeight(650)
        scan_layout.addWidget(label("01 / สถานีสแกน", "eyebrow"))
        scan_layout.addWidget(label("กล้องสแกนใบหน้า", "section"))
        self.model_status = label(f"โมเดล {self.manifest['model_version']} พร้อมใช้ในเครื่อง · กำลังตรวจอัปเดต", "subtle", True)
        scan_layout.addWidget(self.model_status)
        self.stage = QStackedWidget()
        self.stage.setMinimumHeight(420)
        self.stage.setMaximumHeight(680)
        placeholder = QWidget()
        placeholder.setObjectName("placeholder")
        place_layout = QVBoxLayout(placeholder)
        place_layout.setAlignment(Qt.AlignCenter)
        mascot = mascot_path()
        if mascot.is_file():
            picture = label("")
            picture.setAlignment(Qt.AlignCenter)
            picture.setPixmap(QPixmap(str(mascot)).scaled(132, 132, Qt.KeepAspectRatio, Qt.SmoothTransformation))
            place_layout.addWidget(picture)
        ready = label("กำลังเตรียมกล้องสแกน", "section")
        ready.setAlignment(Qt.AlignCenter)
        place_layout.addWidget(ready)
        hint = label("ตรวจการตั้งค่ากล้องได้ที่หน้าตั้งค่า", "subtle")
        hint.setAlignment(Qt.AlignCenter)
        place_layout.addWidget(hint)
        self.preview = label("", "camera")
        self.preview.setAlignment(Qt.AlignCenter)
        self.preview.setMinimumHeight(420)
        self.stage.addWidget(placeholder)
        self.stage.addWidget(self.preview)
        scan_layout.addWidget(self.stage, stretch=1)
        self.feedback = label("กำลังเตรียมกล้อง · ภาพกล้องไม่ถูกบันทึกเป็นไฟล์", "feedback", True)
        scan_layout.addWidget(self.feedback)
        controls = QHBoxLayout()
        self.scan_camera_label = label(f"ใช้กล้อง {self.camera_index} · เปลี่ยนได้ในหน้าตั้งค่า", "subtle")
        controls.addWidget(self.scan_camera_label)
        controls.addStretch()
        scan_layout.insertLayout(3, controls)
        scan_workspace = QHBoxLayout()
        scan_workspace.setSpacing(14)
        scan_workspace.addWidget(scan_card, stretch=5)
        side_column = QVBoxLayout()
        side_column.setSpacing(14)
        result_card = QFrame()
        result_card.setObjectName("scanresult")
        result_layout = QVBoxLayout(result_card)
        result_layout.setContentsMargins(20, 18, 20, 18)
        result_layout.setSpacing(3)
        result_layout.addWidget(label("ผลสแกนล่าสุด", "eyebrow"))
        self.result_name = label("พร้อมสแกนใบหน้า", "resultname", True)
        result_layout.addWidget(self.result_name)
        self.result_meta = label("เมื่อสแกนสำเร็จ ชื่อและเวลาจะแสดงตรงนี้", "resultmeta", True)
        result_layout.addWidget(self.result_meta)
        side_column.addWidget(result_card)
        self.result_card = result_card
        activity_card, activity_layout = card()
        activity_card.setMinimumWidth(350)
        activity_card.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Expanding)
        activity_layout.addWidget(label("รายการสแกนวันนี้", "eyebrow"))
        activity_layout.addWidget(label("เวลาปัจจุบัน · เวลาไทย", "subtle"))
        self.scan_clock = label("--:--:--", "clock")
        activity_layout.addWidget(self.scan_clock)
        self.scan_date = label("--", "subtle")
        activity_layout.addWidget(self.scan_date)
        self.scan_count = label("สแกนแล้ว 0 คน", "section")
        activity_layout.addWidget(self.scan_count)
        self.scan_queue_note = label("บันทึกบนเครื่องนี้ · เรียงจากล่าสุด", "subtle")
        activity_layout.addWidget(self.scan_queue_note)
        self.scan_history = QTableWidget(0, 2)
        self.scan_history.setHorizontalHeaderLabels(["รายชื่อ / รหัส", "เวลาสแกน"])
        self.scan_history.verticalHeader().setVisible(False)
        self.scan_history.setEditTriggers(QTableWidget.NoEditTriggers)
        self.scan_history.setSelectionBehavior(QTableWidget.SelectRows)
        self.scan_history.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)
        self.scan_history.setColumnWidth(1, 125)
        self.scan_history.setMinimumHeight(360)
        activity_layout.addWidget(self.scan_history, stretch=1)
        self.scan_empty = label("ยังไม่มีใครสแกนในวันนี้", "subtle", True)
        self.scan_empty.setAlignment(Qt.AlignCenter)
        activity_layout.addWidget(self.scan_empty)
        side_column.addWidget(activity_card)
        scan_workspace.addLayout(side_column, stretch=3)
        scan_page_layout.addLayout(scan_workspace)
        scan_page_layout.addStretch()

        enrollment_workspace = QHBoxLayout()
        enrollment_workspace.setSpacing(14)
        roster_card, roster_layout = card()
        roster_layout.addWidget(label("02 / เลือกนักเรียน", "eyebrow"))
        roster_layout.addWidget(label("ค้นหารายชื่อ", "section"))
        roster_layout.addWidget(label("กรองตามห้อง แล้วค้นด้วยชื่อ นามสกุล หรือรหัสนักเรียน", "subtle", True))
        self.room_choice = QComboBox()
        self.room_choice.addItem("ทุกห้องเรียน", "")
        self.room_choice.currentIndexChanged.connect(self._filter_roster)
        roster_layout.addWidget(self.room_choice)
        self.student_search = QLineEdit()
        self.student_search.setObjectName("studentsearch")
        self.student_search.setPlaceholderText("พิมพ์ชื่อ นามสกุล หรือรหัสนักเรียน")
        self.student_search.setAccessibleName("ค้นหานักเรียน")
        self.student_search.textChanged.connect(self._filter_roster)
        roster_layout.addWidget(self.student_search)
        self.roster_info = label("รายชื่อจะโหลดจากเว็บหลังเชื่อมบัญชีจุดสแกน", "subtle", True)
        roster_layout.addWidget(self.roster_info)
        self.student_table = QTableWidget(0, 3)
        self.student_table.setHorizontalHeaderLabels(["ห้อง", "ชื่อและนามสกุล", "รหัส"])
        self.student_table.verticalHeader().setVisible(False)
        self.student_table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.student_table.setSelectionBehavior(QTableWidget.SelectRows)
        self.student_table.setSelectionMode(QTableWidget.SingleSelection)
        self.student_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeToContents)
        self.student_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.Stretch)
        self.student_table.setColumnWidth(2, 118)
        self.student_table.setMinimumHeight(430)
        self.student_table.itemSelectionChanged.connect(self._update_enroll_actions)
        roster_layout.addWidget(self.student_table, stretch=1)
        self.roster_reload_button = QPushButton("โหลดรายชื่อใหม่")
        self.roster_reload_button.setEnabled(False)
        self.roster_reload_button.clicked.connect(self.load_students)
        roster_layout.addWidget(self.roster_reload_button)
        enrollment_workspace.addWidget(roster_card, stretch=3)

        capture_card, capture_layout = card()
        capture_layout.addWidget(label("03 / ลงทะเบียนใบหน้า", "eyebrow"))
        capture_layout.addWidget(label("ถ่ายภาพหรือเลือกไฟล์", "section"))
        self.selected_student_label = label("เลือกนักเรียนจากตารางด้านซ้ายก่อน", "subtle", True)
        capture_layout.addWidget(self.selected_student_label)
        self.enroll_preview = label("กำลังเตรียมกล้อง หรือเลือกรูปจากไฟล์", "camera", True)
        self.enroll_preview.setAlignment(Qt.AlignCenter)
        self.enroll_preview.setMinimumHeight(300)
        capture_layout.addWidget(self.enroll_preview, stretch=1)
        self.enroll_camera_label = label(f"ใช้กล้อง {self.camera_index} · เปลี่ยนได้ในหน้าตั้งค่า", "subtle")
        capture_layout.addWidget(self.enroll_camera_label)
        self.enroll_button = QPushButton("ถ่ายภาพและลงทะเบียน")
        self.enroll_button.setObjectName("primary")
        self.enroll_button.setEnabled(False)
        self.enroll_button.clicked.connect(self.enroll_camera)
        capture_layout.addWidget(self.enroll_button)
        self.file_button = QPushButton("เลือกรูปจากไฟล์")
        self.file_button.setEnabled(False)
        self.file_button.clicked.connect(self.enroll_file)
        capture_layout.addWidget(self.file_button)
        self.enroll_feedback = label("ภาพที่ได้รับความยินยอมจะอัปโหลดไปเว็บ และเก็บค่าจดจำในเครื่องเพื่อสแกนออฟไลน์", "feedback", True)
        capture_layout.addWidget(self.enroll_feedback)
        enrollment_workspace.addWidget(capture_card, stretch=2)
        enroll_page_layout.addLayout(enrollment_workspace, stretch=1)
        enroll_page_layout.addStretch()

        self.sync_card, sync_layout = card()
        self.sync_card.setMinimumHeight(125)
        self.sync_card.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Maximum)
        sync_layout.addWidget(label("03 / การส่งข้อมูล", "eyebrow"))
        sync_layout.addWidget(label("สถานะการซิงก์", "section"))
        self.sync_info = label("รายการจะอยู่ในเครื่องจนกว่าจะเชื่อมเว็บไซต์", "subtle", True)
        sync_layout.addWidget(self.sync_info)
        self.photo_info = label("ยังไม่ได้เชื่อมเว็บไซต์", "subtle", True)
        sync_layout.addWidget(self.photo_info)
        self.sync_queue = QTableWidget(0, 4)
        self.sync_queue.setHorizontalHeaderLabels(["เวลาสแกน", "นักเรียน", "ผลการส่ง", "รายละเอียด"])
        self.sync_queue.verticalHeader().setVisible(False)
        self.sync_queue.setEditTriggers(QTableWidget.NoEditTriggers)
        self.sync_queue.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeToContents)
        self.sync_queue.horizontalHeader().setSectionResizeMode(1, QHeaderView.Stretch)
        self.sync_queue.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeToContents)
        self.sync_queue.horizontalHeader().setSectionResizeMode(3, QHeaderView.Stretch)
        self.sync_queue.setFixedHeight(330)
        sync_layout.addWidget(self.sync_queue)
        self.sync_empty = label("ยังไม่มีรายการสแกนบนเครื่องนี้", "subtle")
        self.sync_empty.setAlignment(Qt.AlignCenter)
        sync_layout.addWidget(self.sync_empty)
        sync_actions = QHBoxLayout()
        self.sync_button = QPushButton("ลองซิงก์ตอนนี้")
        self.sync_button.setObjectName("primary")
        self.sync_button.setEnabled(False)
        self.sync_button.clicked.connect(self.try_sync)
        sync_actions.addWidget(self.sync_button)
        self.upload_button = QPushButton("อัปโหลดรูปที่รอส่ง")
        self.upload_button.setEnabled(False)
        self.upload_button.clicked.connect(self.upload_photos)
        sync_actions.addWidget(self.upload_button)
        sync_actions.addStretch()
        sync_layout.addLayout(sync_actions)
        transfer_page_layout.addWidget(self.sync_card)
        self.sync_card.setVisible(False)

        upload_card, upload_layout = card()
        self.pair_card = upload_card
        upload_card.setObjectName("paircard")
        upload_card.setMaximumWidth(620)
        upload_layout.setContentsMargins(32, 30, 32, 30)
        upload_layout.setSpacing(15)
        pair_mascot = mascot_path()
        if pair_mascot.is_file():
            picture = label("")
            picture.setAlignment(Qt.AlignCenter)
            picture.setPixmap(QPixmap(str(pair_mascot)).scaled(118, 118, Qt.KeepAspectRatio, Qt.SmoothTransformation))
            upload_layout.addWidget(picture)
        pair_title = label("เชื่อมเครื่องสแกนด้วย QR", "heading")
        pair_title.setAlignment(Qt.AlignCenter)
        upload_layout.addWidget(pair_title)
        pair_help = label("สแกน QR ด้วยมือถือ ตรวจรหัสให้ตรงกัน แล้วยืนยันบนเว็บไซต์", "subtle", True)
        pair_help.setAlignment(Qt.AlignCenter)
        upload_layout.addWidget(pair_help)
        site_label = label(f"{self.site_url}", "subtle")
        site_label.setAlignment(Qt.AlignCenter)
        upload_layout.addWidget(site_label)
        self.pair_button = QPushButton("สร้าง QR ใหม่")
        self.pair_button.setObjectName("primary")
        self.pair_button.clicked.connect(self.start_pairing)
        self.pair_qr = label("")
        self.pair_qr.setAlignment(Qt.AlignCenter)
        self.pair_qr.setVisible(False)
        upload_layout.addWidget(self.pair_qr)
        self.pair_code = label("—", "section")
        self.pair_code.setAlignment(Qt.AlignCenter)
        self.pair_code.setVisible(False)
        upload_layout.addWidget(self.pair_code)
        self.pair_info = label("กำลังเตรียม QR สำหรับเครื่องนี้…", "subtle", True)
        self.pair_info.setAlignment(Qt.AlignCenter)
        upload_layout.addWidget(self.pair_info)
        upload_layout.addWidget(self.pair_button)
        self.open_pair_button = QPushButton("เปิดลิงก์ยืนยันบน Mac")
        self.open_pair_button.setVisible(False)
        self.open_pair_button.clicked.connect(self.open_pairing_page)
        upload_layout.addWidget(self.open_pair_button)
        if self.site_url.startswith("http://"):
            upload_layout.addWidget(label("โหมด dev: QR ของ localhost เปิดบนมือถือไม่ได้ ให้กดเปิดลิงก์บน Mac เครื่องนี้เพื่อทดสอบ", "subtle", True))

        centered_pair = QHBoxLayout()
        centered_pair.addStretch()
        centered_pair.addWidget(upload_card)
        centered_pair.addStretch()
        transfer_page_layout.addLayout(centered_pair)
        transfer_page_layout.addStretch()

        history_card, history_layout = card()
        history_layout.addWidget(label("รายการล่าสุด", "eyebrow"))
        history_layout.addWidget(label("ประวัติการสแกนบนเครื่องนี้", "section"))
        self.history = QTableWidget(0, 4)
        self.history.setHorizontalHeaderLabels(["ผู้ทดสอบ", "รหัส", "เวลาสแกน", "สถานะ"])
        self.history.verticalHeader().setVisible(False)
        self.history.setEditTriggers(QTableWidget.NoEditTriggers)
        self.history.setSelectionBehavior(QTableWidget.SelectRows)
        self.history.setAlternatingRowColors(False)
        self.history.horizontalHeader().setStretchLastSection(True)
        self.history.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)
        self.history.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeToContents)
        self.history.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeToContents)
        self.history.setMinimumHeight(260)
        history_layout.addWidget(self.history)
        overview_layout.addWidget(history_card)
        note = label("การเห็นหน้าต่อเนื่องไม่ใช่การพิสูจน์ว่ามีชีวิต · ตรวจสอบความถูกต้องของการสแกนด้วย", "subtle", True)
        note.setAlignment(Qt.AlignCenter)
        overview_layout.addWidget(note)
        overview_layout.addStretch()

        settings_card, settings_card_layout = card()
        settings_card_layout.addWidget(label("กล้องเริ่มต้น", "section"))
        settings_card_layout.addWidget(label("ใช้กล้องที่เลือกเมื่อเปิดหน้าสแกนหรือหน้าลงทะเบียนครั้งถัดไป", "subtle", True))
        self.settings_camera = QComboBox()
        for index in range(10):
            self.settings_camera.addItem(f"กล้อง {index}", index)
        self.settings_camera.setCurrentIndex(self.settings_camera.findData(self.settings.camera_index))
        settings_card_layout.addWidget(self.settings_camera)
        settings_card_layout.addWidget(label("ช่วงเวลาระหว่างการตรวจใบหน้า", "section"))
        settings_card_layout.addWidget(label("ค่าน้อยตอบสนองเร็วขึ้น แต่อาจใช้กำลังเครื่องมากขึ้น", "subtle", True))
        self.settings_interval = QComboBox()
        for seconds in DETECTION_INTERVALS:
            self.settings_interval.addItem(f"ทุก {seconds:g} วินาที", seconds)
        self.settings_interval.setCurrentIndex(self.settings_interval.findData(self.settings.detection_interval_seconds))
        settings_card_layout.addWidget(self.settings_interval)
        settings_card_layout.addWidget(label("ช่วงพักก่อนตรวจคนเดิมซ้ำ", "section"))
        settings_card_layout.addWidget(label("การเช็กชื่อยังถูกจำกัดไว้หนึ่งครั้งต่อคนต่อวันตามเวลาไทย", "subtle", True))
        self.settings_cooldown = QComboBox()
        for seconds in REPEAT_COOLDOWNS:
            self.settings_cooldown.addItem(f"{seconds} วินาที", seconds)
        self.settings_cooldown.setCurrentIndex(self.settings_cooldown.findData(self.settings.repeat_cooldown_seconds))
        settings_card_layout.addWidget(self.settings_cooldown)
        self.settings_save_button = QPushButton("บันทึกการตั้งค่า")
        self.settings_save_button.setObjectName("primary")
        self.settings_save_button.clicked.connect(self.save_preferences)
        settings_card_layout.addWidget(self.settings_save_button)
        self.settings_feedback = label("ตั้งค่าจากมือถือได้ที่ /scanner-devices · ค่าใหม่จะซิงก์มาที่เครื่องอัตโนมัติ", "subtle", True)
        settings_card_layout.addWidget(self.settings_feedback)
        settings_layout.addWidget(settings_card)

        clock_card, clock_layout = card()
        clock_layout.addWidget(label("วันและเวลาที่ใช้บันทึก", "section"))
        self.settings_clock = label("--", "clock")
        clock_layout.addWidget(self.settings_clock)
        clock_layout.addWidget(label("ใช้เวลาจากระบบปฏิบัติการ แสดงตามเขตเวลา Asia/Bangkok หากเวลาไม่ตรง ให้แก้ใน Date & Time ของ Mac หรือ Linux", "subtle", True))
        settings_layout.addWidget(clock_card)
        settings_layout.addStretch()

    def _page(self, title: str, subtitle: str) -> tuple[QWidget, QVBoxLayout]:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(0, 12, 0, 0)
        layout.setSpacing(13)
        layout.addWidget(label(title, "heading"))
        layout.addWidget(label(subtitle, "subtle"))
        return page, layout

    def show_page(self, index: int):
        if index not in range(self.pages.count()):
            return
        if self.web_client is None:
            index = 3
        if index not in (0, 2) and self.camera is not None:
            self.stop_camera()
        self.pages.setCurrentIndex(index)
        self.pages.updateGeometry()
        for position, button in enumerate(self.nav_buttons):
            button.setChecked(position == index)
        if index in (0, 2) and self.web_client is not None and self.camera is None:
            self.start_camera()

    def toggle_navigation(self):
        self.nav_collapsed = not self.nav_collapsed
        self.navigation_widget.setFixedWidth(66 if self.nav_collapsed else 218)
        self.collapse_button.setText("☰" if self.nav_collapsed else "☰  ย่อเมนู")
        for index, button in enumerate(self.nav_buttons):
            button.setText(self.nav_symbols[index] if self.nav_collapsed else f"{self.nav_symbols[index]}   {self.nav_titles[index]}")

    def _metric(self, grid: QGridLayout, column: int, title: str) -> QLabel:
        frame = QFrame()
        frame.setObjectName("metric")
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(17, 12, 17, 12)
        layout.setSpacing(3)
        layout.addWidget(label(title, "metriclabel"))
        value = label("—", "metricvalue")
        layout.addWidget(value)
        grid.addWidget(frame, 0, column)
        return value

    def _update_clock(self):
        now = datetime.now(THAI_TIME)
        self.scan_clock.setText(now.strftime("%H:%M:%S"))
        self.scan_date.setText(now.strftime("%d/%m/%Y"))
        self.settings_clock.setText(now.strftime("%d/%m/%Y  %H:%M:%S"))
        today = now.date().isoformat()
        if self.displayed_scan_date != today:
            self.displayed_scan_date = today
            self.refresh()

    def save_preferences(self):
        selected = ScannerSettings(
            camera_index=self.settings_camera.currentData(),
            detection_interval_seconds=self.settings_interval.currentData(),
            repeat_cooldown_seconds=self.settings_cooldown.currentData(),
            scan_start_time=self.settings.scan_start_time,
            late_after_time=self.settings.late_after_time,
        )
        try:
            save_settings(self.settings_path, selected)
        except (OSError, ValueError) as error:
            self.settings_feedback.setText(f"บันทึกไม่สำเร็จ: {error}")
            return
        self.settings = selected
        self.camera_index = selected.camera_index
        self.scan_camera_label.setText(f"ใช้กล้อง {selected.camera_index} · เปลี่ยนได้ในหน้าตั้งค่า")
        self.enroll_camera_label.setText(f"ใช้กล้อง {selected.camera_index} · เปลี่ยนได้ในหน้าตั้งค่า")
        self.settings_feedback.setText("บันทึกแล้ว · ใช้ค่ากล้องและเวลาใหม่ได้ทันที")

    def _feedback(self, text: str, mode: str = ""):
        for item in (self.feedback, self.enroll_feedback):
            item.setText(text)
            item.setProperty("mode", mode)
            item.style().unpolish(item)
            item.style().polish(item)

    def _selected_student(self) -> Optional[tuple[str, str]]:
        row = self.student_table.currentRow()
        item = self.student_table.item(row, 1) if row >= 0 else None
        selected = item.data(Qt.UserRole) if item is not None and item.isSelected() else None
        if not isinstance(selected, tuple) or len(selected) != 2:
            return None
        return selected

    def _filter_roster(self, *_args):
        room = self.room_choice.currentData() or ""
        search = self.student_search.text().strip().casefold()
        matching = [student for student in self.roster_students if
                    (not room or student["classroom"] == room) and
                    (not search or search in f"{student['name']} {student['code']}".casefold())]
        visible = matching[:200]
        self.student_table.setUpdatesEnabled(False)
        self.student_table.setRowCount(len(visible))
        for index, student in enumerate(visible):
            room_item = QTableWidgetItem(student["classroom"])
            name_item = QTableWidgetItem(student["name"])
            name_item.setData(Qt.UserRole, (student["code"], student["name"]))
            code_item = QTableWidgetItem(student["code"])
            for column, item in enumerate((room_item, name_item, code_item)):
                self.student_table.setItem(index, column, item)
            self.student_table.setRowHeight(index, 43)
        self.student_table.clearSelection()
        self.student_table.setUpdatesEnabled(True)
        if self.roster_students:
            suffix = " · แสดง 200 คนแรก กรุณาค้นหาเพิ่ม" if len(matching) > 200 else ""
            self.roster_info.setText(f"พบ {len(matching)} คน จาก {len(self.roster_students)} คน{suffix}")
        self._update_enroll_actions()

    def _update_enroll_actions(self, *_args):
        selected = self._selected_student()
        self.file_button.setEnabled(selected is not None)
        self.enroll_button.setEnabled(selected is not None and self.camera is not None)
        self.selected_student_label.setText(
            f"กำลังลงทะเบียน: {selected[1]} ({selected[0]})" if selected else "เลือกนักเรียนจากตารางด้านซ้ายก่อน"
        )

    def refresh(self):
        model_id = self.manifest["embedding_version"]
        self.enrolled_value.setText(f"{len(templates(self.db, model_id))} คน")
        pending = self.db.execute("SELECT COUNT(*) FROM events WHERE state='pending'").fetchone()[0]
        synced = self.db.execute("SELECT COUNT(*) FROM events WHERE state='synced'").fetchone()[0]
        self.pending_value.setText(f"{pending} รายการ")
        self.scan_queue_note.setText(f"บันทึกบนเครื่องนี้ · รอส่ง {pending} รายการ")
        self.synced_value.setText(f"{synced} รายการ")
        self.model_value.setText(self.manifest["model_version"])
        rejected = self.db.execute("SELECT COUNT(*) FROM events WHERE state='rejected'").fetchone()[0]
        sync_state = self.sync_status_note or ("เชื่อมเว็บไซต์แล้ว" if self.web_client else "รอเชื่อมเว็บไซต์")
        self.sync_info.setText(f"รอส่ง {pending} รายการ · ส่งไม่ผ่าน {rejected} รายการ · {sync_state}")
        photo_count = pending_photo_count(self.db)
        self.upload_button.setEnabled(self.web_client is not None and not self.uploading_photos and photo_count > 0)
        if self.web_client is None and not self.uploading_photos:
            self.photo_info.setText(f"รูปที่รอส่ง {photo_count} รูป · กรุณาเชื่อมบัญชีจุดสแกน")
        rows = self.db.execute(
            "SELECT display_name, student_id, captured_at, state, rejection_reason FROM events ORDER BY captured_at DESC LIMIT 12"
        ).fetchall()
        self.history.setRowCount(len(rows))
        for index, row in enumerate(rows):
            at = datetime.fromisoformat(row["captured_at"]).astimezone(THAI_TIME).strftime("%d/%m %H:%M")
            state_text = {"synced": "ส่งแล้ว", "pending": "รอซิงก์", "rejected": "ส่งไม่ผ่าน"}
            values = [row["display_name"], row["student_id"], at, state_text.get(row["state"], "รอตรวจ")]
            for column, value in enumerate(values):
                self.history.setItem(index, column, QTableWidgetItem(value))
        self.sync_queue.setRowCount(len(rows))
        self.sync_queue.setVisible(bool(rows))
        self.sync_empty.setVisible(not rows)
        for index, row in enumerate(rows):
            at = datetime.fromisoformat(row["captured_at"]).astimezone(THAI_TIME).strftime("%d/%m %H:%M")
            state_text = {"synced": "ส่งแล้ว", "pending": "รอส่ง", "rejected": "เว็บไม่รับ"}
            detail = row["rejection_reason"] if row["state"] == "rejected" else "—"
            for column, value in enumerate((at, row["display_name"], state_text.get(row["state"], "รอตรวจ"), detail or "—")):
                self.sync_queue.setItem(index, column, QTableWidgetItem(value))
            self.sync_queue.setRowHeight(index, 42)

        today = datetime.now(THAI_TIME).date().isoformat()
        today_rows = self.db.execute(
            "SELECT display_name, student_id, captured_at FROM events "
            "WHERE local_date=? ORDER BY captured_at DESC LIMIT 50", (today,)
        ).fetchall()
        total_today = self.db.execute("SELECT COUNT(*) FROM events WHERE local_date=?", (today,)).fetchone()[0]
        self.scan_count.setText(f"สแกนแล้ว {total_today} คน")
        self.scan_empty.setVisible(total_today == 0)
        self.scan_history.setVisible(total_today > 0)
        self.scan_history.setRowCount(len(today_rows))
        for index, row in enumerate(today_rows):
            at = datetime.fromisoformat(row["captured_at"]).astimezone(THAI_TIME).strftime("%H:%M:%S")
            self.scan_history.setItem(index, 0, QTableWidgetItem(f"{row['display_name']}\n{row['student_id']}"))
            self.scan_history.setItem(index, 1, QTableWidgetItem(at))
            self.scan_history.setRowHeight(index, 62)

    def start_camera(self):
        if self.web_client is None or self.pages.currentIndex() not in (0, 2) or self.camera is not None:
            return
        self.camera_retry_timer.stop()
        index = self.settings.camera_index
        camera = self.cv.VideoCapture(index)
        if not camera.isOpened():
            camera.release()
            self._feedback(f"เปิดกล้อง {index} ไม่ได้ · ตรวจสิทธิ์กล้องหรือเปลี่ยนที่หน้าตั้งค่า · จะลองใหม่อัตโนมัติ", "warn")
            self.camera_retry_timer.start(10000)
            return
        self.camera = camera
        self.stage.setCurrentIndex(1)
        self._update_enroll_actions()
        self._feedback("กล้องพร้อมถ่ายภาพลงทะเบียน" if self.pages.currentIndex() == 2 else "กำลังสแกน · จัดใบหน้าให้อยู่กลางภาพ")
        self.frame_timer.start(55)

    def stop_camera(self):
        self.frame_timer.stop()
        self.camera_retry_timer.stop()
        if self.camera is not None:
            self.camera.release()
        self.camera = None
        self.current_frame = None
        self.stage.setCurrentIndex(0)
        self.enroll_preview.clear()
        self.enroll_preview.setText("กำลังเตรียมกล้อง หรือเลือกรูปจากไฟล์")
        self.enroll_button.setEnabled(False)
        self._feedback("กล้องหยุดชั่วคราว · กลับหน้าสแกนเพื่อเปิดอัตโนมัติ")

    def _camera_tick(self):
        if self.camera is None:
            return
        ok, frame = self.camera.read()
        if not ok:
            self.stop_camera()
            self._feedback("อ่านภาพจากกล้องไม่ได้ · จะลองเปิดใหม่อัตโนมัติ", "warn")
            self.camera_retry_timer.start(10000)
            return
        self.current_frame = frame
        flipped = self.cv.flip(frame, 1)
        rgb = self.cv.cvtColor(flipped, self.cv.COLOR_BGR2RGB)
        height, width = rgb.shape[:2]
        image = QImage(rgb.data, width, height, width * 3, QImage.Format_RGB888).copy()
        pixmap = QPixmap.fromImage(image).scaled(self.preview.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation)
        self.preview.setPixmap(pixmap)
        self.enroll_preview.setPixmap(QPixmap.fromImage(image).scaled(
            self.enroll_preview.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation
        ))
        if self.pages.currentIndex() == 0 and time.monotonic() - self.last_detection >= self.settings.detection_interval_seconds:
            self.last_detection = time.monotonic()
            self._identify(frame)

    def _identify(self, frame):
        if datetime.now(THAI_TIME).strftime("%H:%M") < self.settings.scan_start_time:
            self._feedback(f"ยังไม่ถึงเวลาเปิดสแกน {self.settings.scan_start_time} น.", "warn")
            return
        rows = templates(self.db, self.manifest["embedding_version"])
        if not rows:
            self._feedback("ยังไม่มีผู้ทดสอบ · ลงทะเบียนใบหน้าจากกล้องหรือไฟล์ก่อน", "warn")
            return
        embedding = extract_face(self.cv, self.np, self.detector, self.recognizer, frame)
        if embedding is None:
            self.streak_id, self.streak_count = None, 0
            self._feedback("รอใบหน้าในภาพ · ให้เห็นใบหน้าคนเดียวชัดเจน")
            return
        match = best_match(self.np, embedding, rows)
        if match is None:
            self.streak_id, self.streak_count = None, 0
            self._feedback("ไม่พบข้อมูลที่ตรงกัน · ลองมองตรงและขยับเข้าใกล้กล้อง", "warn")
            return
        student_id = match["student_id"]
        self.streak_count = self.streak_count + 1 if self.streak_id == student_id else 1
        self.streak_id = student_id
        if self.streak_count < 3:
            self._feedback(f"กำลังตรวจสอบ {match['display_name']} · {self.streak_count}/3")
            return
        if time.monotonic() - self.last_recorded.get(student_id, -1e9) < self.settings.repeat_cooldown_seconds:
            return
        added = check_in(self.db, student_id, match["display_name"], datetime.now(timezone.utc))
        self.last_recorded[student_id] = time.monotonic()
        self.streak_count = 0
        self._feedback(
            f"{match['display_name']} · {'บันทึกในเครื่องแล้ว รอซิงก์' if added else 'บันทึกแล้ววันนี้'}",
            "success" if added else "warn",
        )
        self.result_card.setProperty("mode", "" if added else "warn")
        self.result_card.style().unpolish(self.result_card)
        self.result_card.style().polish(self.result_card)
        self.result_name.setText(match["display_name"])
        self.result_meta.setText(
            f"{datetime.now(THAI_TIME).strftime('%H:%M:%S')} น. · {'บันทึกแล้ว รอส่งขึ้นเว็บ' if added else 'สแกนแล้ววันนี้'}"
        )
        self.refresh()
        if added:
            self.try_sync()

    def _enroll_image(self, image):
        selected = self._selected_student()
        if selected is None:
            self._feedback("เลือกนักเรียนจากรายชื่อที่โหลดจากเว็บไซต์ก่อน", "warn")
            return
        student_id, name = selected
        embedding = extract_face(self.cv, self.np, self.detector, self.recognizer, image)
        if embedding is None:
            self._feedback("ลงทะเบียนไม่สำเร็จ · ภาพต้องมีใบหน้าคนเดียวและชัดเจน", "warn")
            return
        height, width = image.shape[:2]
        scale = min(1.0, 1024 / max(height, width))
        if scale < 1:
            image = self.cv.resize(image, (round(width * scale), round(height * scale)))
        encoded, photo = self.cv.imencode(".jpg", image, [self.cv.IMWRITE_JPEG_QUALITY, 85])
        if not encoded:
            self._feedback("บันทึกรูปไม่สำเร็จ กรุณาลองใหม่", "warn")
            return
        try:
            enroll(self.db, student_id, name, embedding.tolist(), self.manifest["embedding_version"], photo.tobytes())
        except ValueError as error:
            self._feedback(str(error), "warn")
            return
        self._feedback(f"ลงทะเบียน {name} แล้ว · รูปรออัปโหลดไปเว็บ", "success")
        self.refresh()
        if self.web_client is not None:
            self.upload_photos()

    def enroll_camera(self):
        if self.current_frame is not None:
            self._enroll_image(self.current_frame)

    def enroll_file(self):
        filename, _ = QFileDialog.getOpenFileName(self, "เลือกภาพทดสอบ", "", "Images (*.jpg *.jpeg *.png *.webp)")
        if filename:
            image = self.cv.imread(filename)
            if image is None:
                self._feedback("เปิดภาพไม่ได้", "warn")
            else:
                self._enroll_image(image)

    def _check_model_update(self):
        def work():
            try:
                manifest, changed = ensure_models(self.models_dir)
                self.background_results.put(("model", manifest, changed, ""))
            except Exception as error:
                self.background_results.put(("model", None, False, str(error)))

        threading.Thread(target=work, name="scanner-model-update", daemon=True).start()

    def _drain_background_results(self):
        while True:
            try:
                kind, *values = self.background_results.get_nowait()
            except queue.Empty:
                return
            if kind == "model":
                manifest, changed, error = values
                if error:
                    self.model_status.setText(f"ตรวจอัปเดตไม่ได้ · ใช้โมเดล {self.manifest['model_version']} ในเครื่องต่อ")
                elif changed:
                    self.model_status.setText(f"ดาวน์โหลดโมเดล {manifest['model_version']} แล้ว · เปิดโปรแกรมใหม่เพื่อใช้งาน")
                else:
                    self.model_status.setText(f"โมเดล {self.manifest['model_version']} พร้อมใช้ในเครื่อง")
            elif kind == "pair_start":
                generation, client, data, error = values
                if generation != self.pair_generation:
                    continue
                self.pair_button.setEnabled(True)
                if error:
                    self.pair_info.setText(f"{error} · จะลองใหม่อัตโนมัติ")
                    self.pair_retry_timer.start(15000)
                    continue
                picture = QPixmap()
                try:
                    valid_picture = picture.loadFromData(base64.b64decode(data["qrDataUrl"].split(",", 1)[1]))
                except (ValueError, TypeError):
                    valid_picture = False
                if not valid_picture:
                    self.pair_info.setText("แสดง QR ไม่สำเร็จ · จะลองใหม่อัตโนมัติ")
                    self.pair_retry_timer.start(15000)
                    continue
                self.pair_client = client
                self.pair_device_code = data["deviceCode"]
                self.pair_verification_url = data["verificationUrl"]
                self.pair_expires_at = time.monotonic() + data["expiresIn"]
                self.pair_qr.setPixmap(picture.scaled(230, 230, Qt.KeepAspectRatio, Qt.SmoothTransformation))
                self.pair_qr.setVisible(True)
                self.pair_code.setText(f"รหัสยืนยัน: {data['userCode']}")
                self.pair_code.setVisible(True)
                self.open_pair_button.setVisible(self.site_url.startswith("http://"))
                self.pair_info.setText("สแกน QR และยืนยันรหัสบนเว็บ · QR ใช้ได้ 5 นาที")
                self.pair_timer.start(data["pollInterval"] * 1000)
            elif kind == "pair_poll":
                client, state, error = values
                if client is not self.pair_client:
                    continue
                self.pair_polling = False
                if error:
                    self.pair_info.setText(error)
                    if "เชื่อมต่อเว็บไซต์ไม่ได้" not in error:
                        self.pair_timer.stop()
                        self.pair_retry_timer.start(5000)
                elif state == "approved":
                    self.pair_timer.stop()
                    self.pair_qr.setVisible(False)
                    self.pair_code.setVisible(False)
                    self.open_pair_button.setVisible(False)
                    self.pair_info.setText("เชื่อมบัญชีจุดสแกนแล้ว")
                    self.pair_client = None
                    self._connected_to_website(client)
            elif kind == "roster":
                client, students, error = values
                if client is not self.web_client:
                    continue
                self.roster_loading = False
                self.roster_reload_button.setEnabled(self.web_client is not None)
                if error:
                    self.roster_students = []
                    self.student_table.setRowCount(0)
                    self.room_choice.clear()
                    self.room_choice.addItem("ทุกห้องเรียน", "")
                    self.roster_info.setText(f"โหลดรายชื่อไม่สำเร็จ: {error}")
                else:
                    self.roster_students = sorted(students, key=lambda item: (item["classroom"], item["name"], item["code"]))
                    previous_room = self.room_choice.currentData()
                    self.room_choice.blockSignals(True)
                    self.room_choice.clear()
                    self.room_choice.addItem("ทุกห้องเรียน", "")
                    for room in sorted({student["classroom"] for student in students}):
                        self.room_choice.addItem(room, room)
                    chosen = self.room_choice.findData(previous_room)
                    self.room_choice.setCurrentIndex(max(0, chosen))
                    self.room_choice.blockSignals(False)
                    self._filter_roster()
                    if not students:
                        self.roster_info.setText("ยังไม่มีนักเรียนในภาคเรียนปัจจุบันที่ยินยอมให้เก็บใบหน้า")
                self._update_enroll_actions()
            elif kind == "photos":
                sent, remaining, error = values
                self.uploading_photos = False
                self.refresh()
                if error:
                    self.photo_info.setText(f"ส่งแล้ว {sent} รูป · ค้าง {remaining} รูป · {error}")
                    self.enroll_feedback.setText(f"รูปยังค้างในเครื่อง {remaining} รูป · จะลองส่งใหม่เมื่อเชื่อมต่อได้")
                else:
                    self.photo_info.setText(f"อัปโหลดแล้ว {sent} รูป · ค้าง {remaining} รูป")
                    if sent:
                        self.enroll_feedback.setText(f"อัปโหลดรูปสำเร็จ {sent} รูป · พร้อมสแกนในเครื่องนี้")
            elif kind == "sync":
                sent, remaining, rejected, error = values
                self.syncing = False
                self.sync_button.setEnabled(self.web_client is not None or bool(self.sync_url))
                if error:
                    self.sync_status_note = "ส่งไม่สำเร็จ · รายการยังเก็บในเครื่อง"
                elif rejected:
                    self.sync_status_note = f"ส่งแล้ว {sent} · ส่งไม่ผ่าน {rejected} · ตรวจรายการในภาพรวม"
                elif sent:
                    self.sync_status_note = f"ส่งแล้ว {sent} รายการ · ค้าง {remaining} รายการ"
                elif remaining:
                    self.sync_status_note = "ยังส่งไม่ได้ · รายการยังเก็บในเครื่อง"
                else:
                    self.sync_status_note = "ไม่มีรายการค้างส่ง"
                self.refresh()
            elif kind == "heartbeat":
                client, settings, error = values
                if client is not self.web_client:
                    continue
                self.heartbeating = False
                if not error:
                    self._apply_remote_settings(settings)

    def _apply_remote_settings(self, remote: dict):
        selected = ScannerSettings(
            camera_index=remote["cameraIndex"],
            detection_interval_seconds=remote["detectionIntervalSeconds"],
            repeat_cooldown_seconds=remote["repeatCooldownSeconds"],
            scan_start_time=remote["scanStartTime"],
            late_after_time=remote["lateAfterTime"],
        )
        if selected == self.settings:
            return
        old_camera = self.settings.camera_index
        save_settings(self.settings_path, selected)
        self.settings = selected
        self.camera_index = selected.camera_index
        self.settings_camera.setCurrentIndex(self.settings_camera.findData(selected.camera_index))
        self.settings_interval.setCurrentIndex(self.settings_interval.findData(selected.detection_interval_seconds))
        self.settings_cooldown.setCurrentIndex(self.settings_cooldown.findData(selected.repeat_cooldown_seconds))
        self.scan_camera_label.setText(f"ใช้กล้อง {selected.camera_index} · เปลี่ยนได้ในหน้าตั้งค่า")
        self.enroll_camera_label.setText(f"ใช้กล้อง {selected.camera_index} · เปลี่ยนได้ในหน้าตั้งค่า")
        self.settings_feedback.setText("ได้รับค่ากล้องและเวลาล่าสุดจากเว็บไซต์แล้ว")
        if old_camera != selected.camera_index and self.camera is not None:
            self.stop_camera()
            self.start_camera()

    def _reset_web_connection(self):
        self.pair_generation += 1
        self.pair_timer.stop()
        self.pair_retry_timer.stop()
        self.pair_button.setEnabled(True)
        self.pair_button.setVisible(True)
        self.pair_card.setVisible(True)
        self.pair_client = None
        self.pair_device_code = ""
        self.pair_verification_url = ""
        self.pair_polling = False
        self.pair_qr.setVisible(False)
        self.pair_code.setVisible(False)
        self.open_pair_button.setVisible(False)
        self.web_client = None
        self.connection_badge.setText("รอเชื่อมเว็บ")
        self.connection_badge.setProperty("mode", "")
        self.connection_badge.style().unpolish(self.connection_badge)
        self.connection_badge.style().polish(self.connection_badge)
        self.sync_button.setEnabled(bool(self.sync_url))
        self.navigation_widget.setVisible(False)
        self.sync_card.setVisible(False)
        self.photo_info.setVisible(False)
        self.upload_button.setVisible(False)
        self.show_page(3)
        self.roster_loading = False
        self.roster_students = []
        self.student_table.setRowCount(0)
        self.room_choice.clear()
        self.room_choice.addItem("ทุกห้องเรียน", "")
        self.student_search.clear()
        self.roster_reload_button.setEnabled(False)
        self.roster_info.setText("รอเชื่อมบัญชีจุดสแกน…")
        self._update_enroll_actions()

    def _connected_to_website(self, client: KioskWebClient):
        self.pair_retry_timer.stop()
        self.web_client = client
        self.connection_badge.setText("เชื่อมเว็บแล้ว")
        self.connection_badge.setProperty("mode", "connected")
        self.connection_badge.style().unpolish(self.connection_badge)
        self.connection_badge.style().polish(self.connection_badge)
        self.sync_button.setEnabled(True)
        self.navigation_widget.setVisible(True)
        self.sync_card.setVisible(True)
        self.pair_card.setVisible(False)
        self.photo_info.setVisible(True)
        self.upload_button.setVisible(True)
        self.photo_info.setText("เชื่อมบัญชีจุดสแกนแล้ว · กำลังตรวจรูปที่รอส่ง")
        self.show_page(0)
        self.refresh()
        self.upload_photos()
        self.load_students()
        self.send_heartbeat()
        self.try_sync()

    def start_pairing(self):
        if self.web_client is not None:
            return
        if self.uploading_photos:
            self.pair_info.setText("รอให้อัปโหลดรูปเสร็จก่อน แล้วลองสร้าง QR ใหม่")
            return
        self._reset_web_connection()
        generation = self.pair_generation
        self.pair_button.setEnabled(False)
        self.pair_info.setText("กำลังสร้าง QR…")

        def work():
            try:
                client = KioskWebClient(self.site_url, self.device_id)
                self.background_results.put(("pair_start", generation, client, client.start_pairing(), ""))
            except Exception as error:
                self.background_results.put(("pair_start", generation, None, None, str(error)))

        threading.Thread(target=work, name="scanner-pair-start", daemon=True).start()

    def poll_pairing(self):
        client = self.pair_client
        if client is None or self.pair_polling:
            return
        if time.monotonic() >= self.pair_expires_at:
            self.pair_timer.stop()
            self.pair_info.setText("QR หมดอายุแล้ว · กำลังสร้าง QR ใหม่")
            self.pair_retry_timer.start(0)
            return
        self.pair_polling = True
        device_code = self.pair_device_code

        def work():
            try:
                self.background_results.put(("pair_poll", client, client.poll_pairing(device_code), ""))
            except Exception as error:
                self.background_results.put(("pair_poll", client, "", str(error)))

        threading.Thread(target=work, name="scanner-pair-poll", daemon=True).start()

    def open_pairing_page(self):
        if self.pair_verification_url:
            QDesktopServices.openUrl(QUrl(self.pair_verification_url))

    def load_students(self):
        if self.web_client is None or self.roster_loading:
            return
        self.roster_loading = True
        self.roster_reload_button.setEnabled(False)
        self._update_enroll_actions()
        self.roster_info.setText("กำลังโหลดรายชื่อนักเรียนจากเว็บไซต์…")
        client = self.web_client

        def work():
            try:
                self.background_results.put(("roster", client, client.get_students(), ""))
            except Exception as error:
                self.background_results.put(("roster", client, [], str(error)))

        threading.Thread(target=work, name="scanner-student-roster", daemon=True).start()

    def upload_photos(self):
        if self.web_client is None or self.uploading_photos:
            return
        if not pending_photos(self.db):
            return
        self.uploading_photos = True
        self.upload_button.setEnabled(False)
        self.photo_info.setText("กำลังอัปโหลดรูปใบหน้า…")
        if self.pages.currentIndex() == 2:
            self.enroll_feedback.setText("บันทึกใบหน้าในเครื่องแล้ว · กำลังส่งรูปไปเว็บไซต์…")
        client = self.web_client

        def work():
            db = None
            try:
                db = open_store(self.db_path)
                sent, remaining, error = upload_pending_photos(db, client)
                self.background_results.put(("photos", sent, remaining, error))
            except Exception:
                self.background_results.put(("photos", 0, 0, "เชื่อมต่อเว็บไซต์ไม่ได้ รูปยังเก็บอยู่ในเครื่อง"))
            finally:
                if db is not None:
                    db.close()

        threading.Thread(target=work, name="scanner-photo-upload", daemon=True).start()

    def try_sync(self):
        if (self.web_client is None and not self.sync_url) or self.syncing:
            return
        pending_count = self.db.execute("SELECT COUNT(*) FROM events WHERE state='pending'").fetchone()[0]
        if pending_count == 0:
            self.sync_status_note = "ไม่มีรายการค้างส่ง"
            self.refresh()
            return
        self.syncing = True
        self.sync_button.setEnabled(False)
        self.sync_status_note = "กำลังส่งรายการเช็กชื่อ…"
        self.refresh()
        client = self.web_client

        def work():
            db = None
            try:
                db = open_store(self.db_path)
                if client is not None:
                    sent, remaining, rejected = sync_live(db, client)
                else:
                    sent, remaining = sync_once(db, self.sync_url)
                    rejected = 0
                self.background_results.put(("sync", sent, remaining, rejected, ""))
            except Exception as error:
                self.background_results.put(("sync", 0, pending_count, 0, str(error)))
            finally:
                if db is not None:
                    db.close()

        threading.Thread(target=work, name="scanner-sync", daemon=True).start()

    def send_heartbeat(self):
        client = self.web_client
        if client is None or self.heartbeating:
            return
        self.heartbeating = True
        count = self.db.execute("SELECT COUNT(*) FROM events WHERE state='pending'").fetchone()[0]
        camera_active = self.camera is not None
        model_version = self.manifest["model_version"]

        def work():
            try:
                settings = client.heartbeat(count, camera_active, model_version)
                self.background_results.put(("heartbeat", client, settings, ""))
            except Exception as error:
                self.background_results.put(("heartbeat", client, None, str(error)))

        threading.Thread(target=work, name="scanner-heartbeat", daemon=True).start()

    def closeEvent(self, event):
        self.background_timer.stop()
        self.sync_timer.stop()
        self.heartbeat_timer.stop()
        self.photo_timer.stop()
        self.pair_timer.stop()
        self.pair_retry_timer.stop()
        self.camera_retry_timer.stop()
        self.stop_camera()
        self.db.close()
        super().closeEvent(event)


def main():
    parser = argparse.ArgumentParser(description="Chumkosoft desktop scanner prototype")
    parser.add_argument("--sync-url", help="local mock receiver, e.g. http://127.0.0.1:8765/events")
    parser.add_argument("--camera", type=int, help="override saved camera index for this run")
    parser.add_argument("--site-url", default=SITE, help="website URL; for local dev use http://127.0.0.1:3000")
    parser.add_argument("--smoke", action="store_true", help="open and close UI without camera for a build check")
    args = parser.parse_args()
    if args.camera is not None and not 0 <= args.camera <= 9:
        parser.error("camera index must be between zero and nine")
    qt = QApplication(sys.argv[:1])
    qt.setApplicationName("Chumkosoft Scanner")
    load_prompt_font()
    qt.setFont(QFont("Prompt", 12))
    try:
        window = ScannerWindow(app_data_dir(), args.sync_url, args.camera, check_updates=not args.smoke,
                               site_url=args.site_url, auto_connect=not args.smoke)
    except (ModelUpdateError, OSError, RuntimeError, ValueError) as error:
        QMessageBox.critical(None, "เปิดโปรแกรมไม่ได้", str(error))
        return 1
    window.show()
    if args.smoke:
        if window.pages.currentIndex() != 3 or window.navigation_widget.isVisible():
            raise RuntimeError("หน้า QR ต้องเปิดก่อนเชื่อมบัญชี")
        window.show_page(0)
        if window.pages.currentIndex() != 3:
            raise RuntimeError("หน้าสแกนต้องล็อกไว้ก่อนเชื่อมบัญชี")
        QTimer.singleShot(600, qt.quit)
    return qt.exec()


if __name__ == "__main__":
    raise SystemExit(main())
