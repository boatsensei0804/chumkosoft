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
from PySide6.QtGui import QDesktopServices, QImage, QPixmap
from PySide6.QtWidgets import (
    QApplication,
    QComboBox,
    QFileDialog,
    QFrame,
    QGridLayout,
    QHeaderView,
    QHBoxLayout,
    QLabel,
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
from settings import DETECTION_INTERVALS, REPEAT_COOLDOWNS, ScannerSettings, load_settings, save_settings
from store import check_in, enroll, open_store, pending_photo_count, pending_photos, templates
from sync import sync_once
from web_client import SITE, KioskWebClient, upload_pending_photos, validate_site_url

THAI_TIME = ZoneInfo("Asia/Bangkok")


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
QWidget { font-family: -apple-system, 'Helvetica Neue', 'Noto Sans Thai', sans-serif; color: #183454; font-size: 13px; }
QMainWindow, QWidget#root { background: #f3f8fc; }
QScrollArea { background: #f3f8fc; border: none; }
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
QLabel#clock { font-size: 25px; font-weight: 800; }
QLabel#testbadge { background: #fff3d8; color: #9c6919; border-radius: 12px; padding: 7px 12px; font-weight: 700; }
QLabel#statebadge { background: #e8f7ef; color: #16825a; border-radius: 12px; padding: 7px 12px; font-weight: 700; }
QLabel#camera { background: #dbeaf6; border: 1px solid #cbdfee; border-radius: 14px; }
QWidget#placeholder { background: #dbeaf6; border: 1px solid #cbdfee; border-radius: 14px; }
QLabel#feedback { background: #e9f5ff; color: #275f91; border: 1px solid #d3eafa; border-radius: 11px; padding: 13px; font-weight: 700; }
QLabel#feedback[mode="success"] { background: #e9f8ef; color: #167c55; border-color: #caebd7; }
QLabel#feedback[mode="warn"] { background: #fff7e7; color: #a26f20; border-color: #f1dfb8; }
QPushButton#nav { background: transparent; color: #607d98; text-align: left; padding: 11px 16px; }
QPushButton#nav:checked { background: #e1f0fc; color: #1267ad; }
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
QTableWidget { background: white; border: none; gridline-color: #edf2f6; selection-background-color: #e4f2ff; }
QHeaderView::section { background: #f7fbfe; color: #7089a0; padding: 9px; border: none; font-weight: 700; }
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
        saved = load_settings(self.settings_path)
        self.settings = ScannerSettings(
            camera_index=saved.camera_index if camera_index is None else camera_index,
            detection_interval_seconds=saved.detection_interval_seconds,
            repeat_cooldown_seconds=saved.repeat_cooldown_seconds,
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
        self.sync_status_note = ""
        self.web_client: Optional[KioskWebClient] = None
        self.pair_client: Optional[KioskWebClient] = None
        self.pair_device_code = ""
        self.pair_verification_url = ""
        self.pair_expires_at = 0.0
        self.pair_polling = False
        self.pair_generation = 0
        self.roster_loading = False
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
        if self.sync_url:
            self.sync_timer.timeout.connect(self.try_sync)
            self.sync_timer.start(15000)
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
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.NoFrame)
        self.setCentralWidget(scroll)
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
        header.addWidget(label("โหมดทดสอบ", "testbadge"))
        header.addWidget(label("พร้อมใช้งานออฟไลน์", "statebadge"))
        outer.addLayout(header)

        self.navigation_widget = QWidget()
        navigation = QHBoxLayout(self.navigation_widget)
        navigation.setContentsMargins(0, 0, 0, 0)
        navigation.setSpacing(8)
        self.nav_buttons = []
        for index, title in enumerate(("สแกนใบหน้า", "ภาพรวม", "ลงทะเบียนใบหน้า", "เชื่อมต่อและซิงก์", "ตั้งค่า")):
            button = QPushButton(title)
            button.setObjectName("nav")
            button.setCheckable(True)
            button.clicked.connect(lambda checked=False, page=index: self.show_page(page))
            navigation.addWidget(button)
            self.nav_buttons.append(button)
        navigation.addStretch()
        outer.addWidget(self.navigation_widget)
        self.navigation_widget.setVisible(False)

        self.pages = CurrentPageStack()
        outer.addWidget(self.pages, stretch=1)
        overview_page, overview_layout = self._page("ภาพรวมสถานี", "ดูจำนวนผู้ลงทะเบียนและประวัติการสแกนในเครื่อง")
        scan_page, scan_page_layout = self._page("สแกนใบหน้า", "กล้องเริ่มทำงานอัตโนมัติหลังเชื่อมบัญชีจุดสแกน")
        enroll_page, enroll_page_layout = self._page("ลงทะเบียนใบหน้า", "ถ่ายภาพหรือเลือกรูปที่ได้รับความยินยอม")
        transfer_page, transfer_page_layout = self._page("เชื่อมต่อและซิงก์", "จัดการรูปที่รออัปโหลดและรายการเช็กชื่อทดสอบ")
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
        scan_card.setMinimumHeight(600)
        scan_layout.addWidget(label("01 / สถานีสแกน", "eyebrow"))
        scan_layout.addWidget(label("กล้องสแกนใบหน้า", "section"))
        self.model_status = label(f"โมเดล {self.manifest['model_version']} พร้อมใช้ในเครื่อง · กำลังตรวจอัปเดต", "subtle", True)
        scan_layout.addWidget(self.model_status)
        self.stage = QStackedWidget()
        self.stage.setMinimumHeight(420)
        self.stage.setMaximumHeight(520)
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
        scan_workspace.addWidget(scan_card, stretch=4)
        side_column = QVBoxLayout()
        side_column.setSpacing(14)
        activity_card, activity_layout = card()
        activity_card.setMinimumWidth(300)
        activity_card.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Maximum)
        activity_layout.addWidget(label("รายการสแกนวันนี้", "eyebrow"))
        activity_layout.addWidget(label("เวลาปัจจุบัน · เวลาไทย", "subtle"))
        self.scan_clock = label("--:--:--", "clock")
        activity_layout.addWidget(self.scan_clock)
        self.scan_date = label("--", "subtle")
        activity_layout.addWidget(self.scan_date)
        self.scan_count = label("สแกนแล้ว 0 คน", "section")
        activity_layout.addWidget(self.scan_count)
        activity_layout.addWidget(label("บันทึกบนเครื่องนี้ · เรียงจากล่าสุด", "subtle"))
        self.scan_history = QTableWidget(0, 2)
        self.scan_history.setHorizontalHeaderLabels(["รายชื่อ / รหัส", "เวลาสแกน"])
        self.scan_history.verticalHeader().setVisible(False)
        self.scan_history.setEditTriggers(QTableWidget.NoEditTriggers)
        self.scan_history.setSelectionBehavior(QTableWidget.SelectRows)
        self.scan_history.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)
        self.scan_history.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeToContents)
        self.scan_history.setMaximumHeight(330)
        activity_layout.addWidget(self.scan_history)
        self.scan_empty = label("ยังไม่มีใครสแกนในวันนี้", "subtle", True)
        self.scan_empty.setAlignment(Qt.AlignCenter)
        activity_layout.addWidget(self.scan_empty)
        side_column.addWidget(activity_card)
        state_card, state_layout = card()
        state_layout.addWidget(label("สถานะจุดสแกน", "eyebrow"))
        self.scan_camera_state = label("กล้องยังไม่เปิด", "section")
        state_layout.addWidget(self.scan_camera_state)
        self.scan_pending = label("รอซิงก์ 0 รายการ", "subtle")
        state_layout.addWidget(self.scan_pending)
        state_layout.addWidget(label("รายการเช็กชื่อเก็บไว้ในเครื่องระหว่างทดสอบ", "subtle", True))
        side_column.addWidget(state_card)
        side_column.addStretch()
        scan_workspace.addLayout(side_column, stretch=2)
        scan_page_layout.addLayout(scan_workspace)
        scan_page_layout.addStretch()

        enroll_card, enroll_layout = card()
        enroll_card.setMinimumHeight(325)
        enroll_layout.addWidget(label("02 / เตรียมผู้ทดสอบ", "eyebrow"))
        enroll_layout.addWidget(label("ลงทะเบียนใบหน้าทดสอบ", "section"))
        enroll_layout.addWidget(label("เก็บรูปชั่วคราวเพื่อส่งขึ้นเว็บและเก็บค่าจดจำไว้สแกนออฟไลน์ ใช้เฉพาะภาพที่ได้รับความยินยอม", "subtle", True))
        enroll_layout.addWidget(label("เลือกนักเรียนจากเว็บไซต์"))
        self.student_choice = QComboBox()
        self.student_choice.setEditable(True)
        self.student_choice.setInsertPolicy(QComboBox.NoInsert)
        self.student_choice.addItem("เชื่อมบัญชีจุดสแกนเพื่อโหลดรายชื่อ", None)
        self.student_choice.setEnabled(False)
        self.student_choice.setAccessibleName("เลือกนักเรียนจากเว็บไซต์")
        self.student_choice.completer().setFilterMode(Qt.MatchContains)
        self.student_choice.completer().setCaseSensitivity(Qt.CaseInsensitive)
        enroll_layout.addWidget(self.student_choice)
        self.roster_info = label("รายชื่อจะโหลดจากเว็บหลังเชื่อมบัญชีจุดสแกน", "subtle", True)
        enroll_layout.addWidget(self.roster_info)
        roster_actions = QHBoxLayout()
        self.roster_reload_button = QPushButton("โหลดรายชื่อใหม่")
        self.roster_reload_button.setEnabled(False)
        self.roster_reload_button.clicked.connect(self.load_students)
        roster_actions.addWidget(self.roster_reload_button)
        connect_hint = QPushButton("ไปหน้าเชื่อมบัญชี")
        connect_hint.clicked.connect(lambda: self.show_page(3))
        roster_actions.addWidget(connect_hint)
        roster_actions.addStretch()
        enroll_layout.addLayout(roster_actions)
        self.enroll_preview = label("กำลังเตรียมกล้อง หรือเลือกรูปจากไฟล์", "camera", True)
        self.enroll_preview.setAlignment(Qt.AlignCenter)
        self.enroll_preview.setMinimumHeight(230)
        enroll_layout.addWidget(self.enroll_preview)
        enroll_camera_controls = QHBoxLayout()
        self.enroll_camera_label = label(f"ใช้กล้อง {self.camera_index} · เปลี่ยนได้ในหน้าตั้งค่า", "subtle")
        enroll_camera_controls.addWidget(self.enroll_camera_label)
        enroll_camera_controls.addStretch()
        enroll_layout.addLayout(enroll_camera_controls)
        self.enroll_button = QPushButton("ลงทะเบียนจากภาพกล้อง")
        self.enroll_button.setEnabled(False)
        self.enroll_button.clicked.connect(self.enroll_camera)
        enroll_layout.addWidget(self.enroll_button)
        self.file_button = QPushButton("เลือกรูปทดสอบจากไฟล์")
        self.file_button.setEnabled(False)
        self.file_button.clicked.connect(self.enroll_file)
        enroll_layout.addWidget(self.file_button)
        self.student_choice.currentIndexChanged.connect(self._update_enroll_actions)
        self.student_choice.editTextChanged.connect(self._update_enroll_actions)
        self.enroll_feedback = label("พร้อมลงทะเบียน · ภาพจะรอส่งขึ้นเว็บเมื่อเชื่อมบัญชีจุดสแกน", "feedback", True)
        enroll_layout.addWidget(self.enroll_feedback)
        enroll_page_layout.addWidget(enroll_card)
        enroll_page_layout.addStretch()

        self.sync_card, sync_layout = card()
        self.sync_card.setMinimumHeight(125)
        sync_layout.addWidget(label("03 / การส่งข้อมูล", "eyebrow"))
        sync_layout.addWidget(label("สถานะการซิงก์", "section"))
        self.sync_info = label("รายการจะอยู่ในเครื่องจนกว่าจะเชื่อมตัวรับข้อมูลทดสอบ", "subtle", True)
        sync_layout.addWidget(self.sync_info)
        self.sync_button = QPushButton("ลองซิงก์ตอนนี้")
        self.sync_button.setEnabled(bool(self.sync_url))
        self.sync_button.clicked.connect(self.try_sync)
        sync_layout.addWidget(self.sync_button)
        transfer_page_layout.addWidget(self.sync_card)
        self.sync_card.setVisible(False)

        upload_card, upload_layout = card()
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

        self.photo_info = label("ยังไม่ได้เชื่อมเว็บไซต์", "subtle", True)
        upload_layout.addWidget(self.photo_info)
        self.photo_info.setVisible(False)
        self.upload_button = QPushButton("อัปโหลดรูปที่รอส่ง")
        self.upload_button.setEnabled(False)
        self.upload_button.clicked.connect(self.upload_photos)
        upload_layout.addWidget(self.upload_button)
        self.upload_button.setVisible(False)
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
        note = label("ต้นแบบสำหรับทดลองเท่านั้น · ยังไม่เชื่อมเช็กชื่อจริงหรือ LINE · การเห็นหน้าต่อเนื่องไม่ใช่การพิสูจน์ว่ามีชีวิต", "subtle", True)
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
        self.settings_feedback = label("ค่าที่บันทึกจะใช้กับเครื่องนี้เท่านั้น", "subtle", True)
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
        index = self.student_choice.currentIndex()
        selected = self.student_choice.currentData()
        if (not self.student_choice.isEnabled() or index <= 0 or not isinstance(selected, tuple) or
                self.student_choice.currentText() != self.student_choice.itemText(index)):
            return None
        return selected

    def _update_enroll_actions(self, *_args):
        selected = self._selected_student() is not None
        self.file_button.setEnabled(selected)
        self.enroll_button.setEnabled(selected and self.camera is not None)

    def refresh(self):
        model_id = self.manifest["embedding_version"]
        self.enrolled_value.setText(f"{len(templates(self.db, model_id))} คน")
        pending = self.db.execute("SELECT COUNT(*) FROM events WHERE state='pending'").fetchone()[0]
        synced = self.db.execute("SELECT COUNT(*) FROM events WHERE state='synced'").fetchone()[0]
        self.pending_value.setText(f"{pending} รายการ")
        self.scan_pending.setText(f"รอซิงก์ {pending} รายการ")
        self.synced_value.setText(f"{synced} รายการ")
        self.model_value.setText(self.manifest["model_version"])
        sync_state = self.sync_status_note or ("ซิงก์ไปตัวรับข้อมูลทดสอบในเครื่อง" if self.sync_url else "ยังไม่ได้เชื่อมระบบจริง")
        self.sync_info.setText(f"รอส่ง {pending} รายการ · {sync_state}")
        photo_count = pending_photo_count(self.db)
        self.upload_button.setEnabled(self.web_client is not None and not self.uploading_photos and photo_count > 0)
        if self.web_client is None and not self.uploading_photos:
            self.photo_info.setText(f"รูปที่รอส่ง {photo_count} รูป · กรุณาเชื่อมบัญชีจุดสแกน")
        rows = self.db.execute(
            "SELECT display_name, student_id, captured_at, state FROM events ORDER BY captured_at DESC LIMIT 12"
        ).fetchall()
        self.history.setRowCount(len(rows))
        for index, row in enumerate(rows):
            at = datetime.fromisoformat(row["captured_at"]).astimezone(THAI_TIME).strftime("%d/%m %H:%M")
            values = [row["display_name"], row["student_id"], at, "ส่งแล้ว" if row["state"] == "synced" else "รอซิงก์"]
            for column, value in enumerate(values):
                self.history.setItem(index, column, QTableWidgetItem(value))

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
            self.scan_history.setRowHeight(index, 48)
        table_height = self.scan_history.horizontalHeader().height() + 4 + sum(
            self.scan_history.rowHeight(index) for index in range(len(today_rows))
        )
        self.scan_history.setFixedHeight(min(330, table_height))

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
        self.scan_camera_state.setText(f"กล้อง {index} กำลังทำงาน")
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
        self.scan_camera_state.setText("กล้องยังไม่เปิด")
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
        self.refresh()

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
                self.student_choice.clear()
                self.student_choice.addItem("เลือกนักเรียนจากเว็บไซต์", None)
                if error:
                    self.student_choice.setEnabled(False)
                    self.roster_info.setText(f"โหลดรายชื่อไม่สำเร็จ: {error}")
                else:
                    for student in sorted(students, key=lambda item: (item["classroom"], item["name"], item["code"])):
                        text = f"{student['classroom']} · {student['name']} ({student['code']})"
                        self.student_choice.addItem(text, (student["code"], student["name"]))
                    self.student_choice.setCurrentIndex(0)
                    self.student_choice.setEnabled(bool(students))
                    self.roster_info.setText(
                        f"โหลดแล้ว {len(students)} คน · เลือกชื่อก่อนลงทะเบียนใบหน้า"
                        if students else "ยังไม่มีนักเรียนในภาคเรียนปัจจุบันที่ยินยอมให้เก็บใบหน้า"
                    )
                self._update_enroll_actions()
            elif kind == "photos":
                sent, remaining, error = values
                self.uploading_photos = False
                self.refresh()
                if error:
                    self.photo_info.setText(f"ส่งแล้ว {sent} รูป · ค้าง {remaining} รูป · {error}")
                else:
                    self.photo_info.setText(f"อัปโหลดแล้ว {sent} รูป · ค้าง {remaining} รูป")
            elif kind == "sync":
                sent, remaining, error = values
                self.syncing = False
                self.sync_button.setEnabled(bool(self.sync_url))
                if error:
                    self.sync_status_note = "ส่งไม่สำเร็จ · รายการยังเก็บในเครื่อง"
                elif sent:
                    self.sync_status_note = f"ส่งแล้ว {sent} รายการ · ค้าง {remaining} รายการ"
                elif remaining:
                    self.sync_status_note = "ยังส่งไม่ได้ · รายการยังเก็บในเครื่อง"
                else:
                    self.sync_status_note = "ไม่มีรายการค้างส่ง"
                self.refresh()

    def _reset_web_connection(self):
        self.pair_generation += 1
        self.pair_timer.stop()
        self.pair_retry_timer.stop()
        self.pair_button.setEnabled(True)
        self.pair_client = None
        self.pair_device_code = ""
        self.pair_verification_url = ""
        self.pair_polling = False
        self.pair_qr.setVisible(False)
        self.pair_code.setVisible(False)
        self.open_pair_button.setVisible(False)
        self.web_client = None
        self.navigation_widget.setVisible(False)
        self.sync_card.setVisible(False)
        self.photo_info.setVisible(False)
        self.upload_button.setVisible(False)
        self.show_page(3)
        self.roster_loading = False
        self.student_choice.clear()
        self.student_choice.addItem("เชื่อมบัญชีจุดสแกนเพื่อโหลดรายชื่อ", None)
        self.student_choice.setEnabled(False)
        self.roster_reload_button.setEnabled(False)
        self.roster_info.setText("รอเชื่อมบัญชีจุดสแกน…")
        self._update_enroll_actions()

    def _connected_to_website(self, client: KioskWebClient):
        self.pair_retry_timer.stop()
        self.web_client = client
        self.navigation_widget.setVisible(True)
        self.sync_card.setVisible(True)
        self.pair_button.setVisible(False)
        self.photo_info.setVisible(True)
        self.upload_button.setVisible(True)
        self.photo_info.setText("เชื่อมบัญชีจุดสแกนแล้ว · กำลังตรวจรูปที่รอส่ง")
        self.show_page(0)
        self.refresh()
        self.upload_photos()
        self.load_students()

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
                client = KioskWebClient(self.site_url)
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
        self.student_choice.setEnabled(False)
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
        if not self.sync_url or self.syncing:
            return
        pending_count = self.db.execute("SELECT COUNT(*) FROM events WHERE state='pending'").fetchone()[0]
        if pending_count == 0:
            self.sync_status_note = "ไม่มีรายการค้างส่ง"
            self.refresh()
            return
        self.syncing = True
        self.sync_button.setEnabled(False)
        self.sync_status_note = "กำลังส่งข้อมูลทดสอบ…"
        self.refresh()

        def work():
            db = None
            try:
                db = open_store(self.db_path)
                sent, remaining = sync_once(db, self.sync_url)
                self.background_results.put(("sync", sent, remaining, ""))
            except Exception as error:
                self.background_results.put(("sync", 0, pending_count, str(error)))
            finally:
                if db is not None:
                    db.close()

        threading.Thread(target=work, name="scanner-mock-sync", daemon=True).start()

    def closeEvent(self, event):
        self.background_timer.stop()
        self.sync_timer.stop()
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
