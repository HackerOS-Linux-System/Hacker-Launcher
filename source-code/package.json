import sys
import shutil
import os
import logging
from PySide6.QtWidgets import QApplication, QMessageBox
from PySide6.QtGui import QPalette, QColor

STYLESHEET = """
/* ============================================
   HACKER LAUNCHER — Glassmorphism Theme
   ============================================ */

/* Tło aplikacji — głęboki gradient z akcentem */
QWidget {
    background-color: #0a0a14;
    color: #e8e8f0;
    font-family: "Segoe UI", "SF Pro Display", "Ubuntu", sans-serif;
    font-size: 13px;
}

QMainWindow {
    background: qlineargradient(
        x1:0, y1:0, x2:1, y2:1,
        stop:0 #0a0a14,
        stop:0.4 #0d0d1f,
        stop:1 #0a0a14
    );
}

QDialog {
    background-color: #0f0f1e;
    border: 1px solid rgba(138, 92, 246, 0.3);
    border-radius: 12px;
}

/* ============================================
   GLASS PANELS — główne kontenery
   ============================================ */

QTabWidget::pane {
    background: rgba(15, 15, 30, 0.85);
    border: 1px solid rgba(138, 92, 246, 0.25);
    border-radius: 12px;
    margin-top: -1px;
}

QGroupBox {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(138, 92, 246, 0.2);
    border-radius: 10px;
    padding: 16px;
    margin-top: 8px;
    font-weight: 600;
    color: rgba(200, 180, 255, 0.9);
}

/* ============================================
   TABS
   ============================================ */

QTabBar {
    background: transparent;
}

QTabBar::tab {
    background: rgba(255, 255, 255, 0.04);
    color: rgba(180, 180, 210, 0.7);
    padding: 11px 24px;
    margin: 4px 3px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    font-weight: 500;
    font-size: 12px;
    letter-spacing: 0.3px;
}

QTabBar::tab:selected {
    background: qlineargradient(
        x1:0, y1:0, x2:0, y2:1,
        stop:0 rgba(138, 92, 246, 0.5),
        stop:1 rgba(109, 40, 217, 0.4)
    );
    color: #ffffff;
    border: 1px solid rgba(167, 139, 250, 0.5);
    font-weight: 600;
}

QTabBar::tab:hover:!selected {
    background: rgba(138, 92, 246, 0.15);
    color: rgba(220, 200, 255, 0.9);
    border-color: rgba(138, 92, 246, 0.2);
}

/* ============================================
   TABELE — glass surface
   ============================================ */

QTableWidget {
    background: rgba(12, 12, 24, 0.9);
    border: 1px solid rgba(138, 92, 246, 0.2);
    border-radius: 10px;
    color: #e8e8f0;
    gridline-color: rgba(138, 92, 246, 0.08);
    alternate-background-color: rgba(138, 92, 246, 0.04);
    selection-background-color: rgba(138, 92, 246, 0.3);
}

QTableWidget::item {
    padding: 10px 12px;
    border: none;
    color: #d4d4e8;
}

QTableWidget::item:selected {
    background: qlineargradient(
        x1:0, y1:0, x2:1, y2:0,
        stop:0 rgba(138, 92, 246, 0.4),
        stop:1 rgba(109, 40, 217, 0.25)
    );
    color: #ffffff;
    border-left: 2px solid rgba(167, 139, 250, 0.8);
}

QTableWidget::item:hover {
    background: rgba(138, 92, 246, 0.1);
}

QHeaderView::section {
    background: rgba(138, 92, 246, 0.15);
    color: rgba(200, 180, 255, 0.9);
    padding: 10px 12px;
    border: none;
    border-bottom: 1px solid rgba(138, 92, 246, 0.3);
    border-right: 1px solid rgba(138, 92, 246, 0.1);
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
}

QHeaderView::section:first {
    border-top-left-radius: 10px;
}

QHeaderView::section:last {
    border-top-right-radius: 10px;
    border-right: none;
}

/* ============================================
   PRZYCISKI — glass + glow
   ============================================ */

QPushButton {
    background: qlineargradient(
        x1:0, y1:0, x2:0, y2:1,
        stop:0 rgba(138, 92, 246, 0.35),
        stop:1 rgba(109, 40, 217, 0.25)
    );
    color: #e8d5ff;
    border: 1px solid rgba(167, 139, 250, 0.4);
    border-radius: 8px;
    padding: 9px 18px;
    font-weight: 600;
    font-size: 12px;
    letter-spacing: 0.2px;
}

QPushButton:hover {
    background: qlineargradient(
        x1:0, y1:0, x2:0, y2:1,
        stop:0 rgba(167, 139, 250, 0.55),
        stop:1 rgba(138, 92, 246, 0.45)
    );
    color: #ffffff;
    border: 1px solid rgba(196, 181, 253, 0.65);
}

QPushButton:pressed {
    background: rgba(109, 40, 217, 0.6);
    border-color: rgba(167, 139, 250, 0.5);
    color: #ffffff;
}

QPushButton:disabled {
    background: rgba(255, 255, 255, 0.04);
    color: rgba(180, 180, 210, 0.35);
    border-color: rgba(255, 255, 255, 0.06);
}

/* Przycisk "niebezpieczny" (Remove) — czerwony akcent */
QPushButton[text="Remove Game"],
QPushButton[text="Remove Selected"] {
    background: qlineargradient(
        x1:0, y1:0, x2:0, y2:1,
        stop:0 rgba(220, 38, 38, 0.3),
        stop:1 rgba(185, 28, 28, 0.2)
    );
    border-color: rgba(239, 68, 68, 0.4);
    color: #fca5a5;
}

QPushButton[text="Remove Game"]:hover,
QPushButton[text="Remove Selected"]:hover {
    background: rgba(220, 38, 38, 0.45);
    border-color: rgba(239, 68, 68, 0.65);
    color: #ffffff;
}

/* ============================================
   INPUTS — frosted glass
   ============================================ */

QLineEdit {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(138, 92, 246, 0.25);
    color: #e8e8f0;
    padding: 9px 13px;
    border-radius: 8px;
    font-size: 13px;
    selection-background-color: rgba(138, 92, 246, 0.4);
}

QLineEdit:focus {
    border: 1px solid rgba(167, 139, 250, 0.7);
    background: rgba(138, 92, 246, 0.08);
    color: #ffffff;
}

QLineEdit::placeholder {
    color: rgba(180, 180, 210, 0.35);
    font-style: italic;
}

QComboBox {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(138, 92, 246, 0.25);
    color: #e8e8f0;
    padding: 9px 13px;
    border-radius: 8px;
    font-size: 13px;
    min-width: 120px;
}

QComboBox:focus, QComboBox:on {
    border-color: rgba(167, 139, 250, 0.7);
    background: rgba(138, 92, 246, 0.08);
}

QComboBox::drop-down {
    border: none;
    width: 28px;
}

QComboBox::down-arrow {
    image: none;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid rgba(167, 139, 250, 0.7);
    margin-right: 8px;
}

QComboBox QAbstractItemView {
    background: #13132a;
    color: #e8e8f0;
    border: 1px solid rgba(138, 92, 246, 0.3);
    border-radius: 8px;
    padding: 4px;
    selection-background-color: rgba(138, 92, 246, 0.35);
    outline: none;
}

QComboBox QAbstractItemView::item {
    padding: 8px 12px;
    border-radius: 4px;
}

/* ============================================
   CHECKBOXY
   ============================================ */

QCheckBox {
    color: rgba(200, 185, 240, 0.85);
    spacing: 10px;
    font-size: 13px;
}

QCheckBox::indicator {
    width: 18px;
    height: 18px;
    border: 1px solid rgba(138, 92, 246, 0.4);
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.04);
}

QCheckBox::indicator:hover {
    border-color: rgba(167, 139, 250, 0.7);
    background: rgba(138, 92, 246, 0.1);
}

QCheckBox::indicator:checked {
    background: qlineargradient(
        x1:0, y1:0, x2:0, y2:1,
        stop:0 rgba(138, 92, 246, 0.9),
        stop:1 rgba(109, 40, 217, 0.8)
    );
    border-color: rgba(167, 139, 250, 0.7);
    image: none;
}

/* ============================================
   ETYKIETY
   ============================================ */

QLabel {
    color: rgba(200, 185, 240, 0.85);
    font-weight: 500;
    background: transparent;
}

/* Nagłówki sekcji */
QLabel[text="Installed Games"],
QLabel[text="Installed Protons"],
QLabel[text="Settings"] {
    color: rgba(200, 185, 240, 0.95);
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.3px;
    padding: 4px 0px 8px 0px;
    border-bottom: 1px solid rgba(138, 92, 246, 0.2);
    margin-bottom: 4px;
}

/* ============================================
   PASEK POSTĘPU
   ============================================ */

QProgressDialog {
    background: #0f0f1e;
    color: #e8e8f0;
    border: 1px solid rgba(138, 92, 246, 0.3);
    border-radius: 12px;
}

QProgressBar {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(138, 92, 246, 0.2);
    border-radius: 6px;
    text-align: center;
    color: rgba(200, 185, 240, 0.9);
    font-weight: 600;
    font-size: 11px;
    height: 14px;
}

QProgressBar::chunk {
    background: qlineargradient(
        x1:0, y1:0, x2:1, y2:0,
        stop:0 rgba(138, 92, 246, 0.9),
        stop:0.5 rgba(167, 139, 250, 1.0),
        stop:1 rgba(196, 181, 253, 0.9)
    );
    border-radius: 5px;
}

/* ============================================
   SCROLLBARY — minimalne
   ============================================ */

QScrollBar:vertical {
    background: rgba(255, 255, 255, 0.02);
    width: 8px;
    border-radius: 4px;
    margin: 0;
}

QScrollBar::handle:vertical {
    background: rgba(138, 92, 246, 0.35);
    border-radius: 4px;
    min-height: 24px;
}

QScrollBar::handle:vertical:hover {
    background: rgba(167, 139, 250, 0.6);
}

QScrollBar::add-line:vertical,
QScrollBar::sub-line:vertical {
    height: 0px;
}

QScrollBar:horizontal {
    background: rgba(255, 255, 255, 0.02);
    height: 8px;
    border-radius: 4px;
}

QScrollBar::handle:horizontal {
    background: rgba(138, 92, 246, 0.35);
    border-radius: 4px;
    min-width: 24px;
}

QScrollBar::handle:horizontal:hover {
    background: rgba(167, 139, 250, 0.6);
}

/* ============================================
   TOOLTIP
   ============================================ */

QToolTip {
    background: rgba(15, 15, 30, 0.95);
    color: #e8d5ff;
    border: 1px solid rgba(138, 92, 246, 0.4);
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12px;
}

/* ============================================
   TEXT EDIT (About tab)
   ============================================ */

QTextEdit {
    background: rgba(12, 12, 24, 0.8);
    border: 1px solid rgba(138, 92, 246, 0.2);
    border-radius: 10px;
    color: #c4c4d4;
    padding: 12px;
    font-size: 13px;
    line-height: 1.6;
    selection-background-color: rgba(138, 92, 246, 0.4);
}

/* ============================================
   MESSAGE BOXY
   ============================================ */

QMessageBox {
    background: #0f0f1e;
    color: #e8e8f0;
}

QMessageBox QLabel {
    color: #d4d4e8;
    font-size: 13px;
}

QMessageBox QPushButton {
    min-width: 80px;
}
"""


if __name__ == '__main__':
    try:
        gamescope = '--gamescope' in sys.argv
        if gamescope and not shutil.which('gamescope'):
            app = QApplication(sys.argv)
            QMessageBox.critical(None, 'Error', "Gamescope is not installed. Please install it via your package manager (e.g., apt, dnf, pacman).")
            sys.exit(1)

        app = QApplication(sys.argv)

        # Ustaw paletę bazową aby Qt nie nadpisywał kolorów w niektórych miejscach
        palette = QPalette()
        palette.setColor(QPalette.Window, QColor(10, 10, 20))
        palette.setColor(QPalette.WindowText, QColor(232, 232, 240))
        palette.setColor(QPalette.Base, QColor(12, 12, 24))
        palette.setColor(QPalette.AlternateBase, QColor(15, 15, 30))
        palette.setColor(QPalette.ToolTipBase, QColor(15, 15, 30))
        palette.setColor(QPalette.ToolTipText, QColor(232, 213, 255))
        palette.setColor(QPalette.Text, QColor(232, 232, 240))
        palette.setColor(QPalette.Button, QColor(138, 92, 246, 80))
        palette.setColor(QPalette.ButtonText, QColor(232, 213, 255))
        palette.setColor(QPalette.Highlight, QColor(138, 92, 246, 120))
        palette.setColor(QPalette.HighlightedText, QColor(255, 255, 255))
        palette.setColor(QPalette.Link, QColor(167, 139, 250))
        palette.setColor(QPalette.BrightText, QColor(196, 181, 253))
        app.setPalette(palette)

        app.setStyleSheet(STYLESHEET)

        # Import tutaj żeby uniknąć błędów przy braku pliku
        from main_window import MainWindow
        window = MainWindow()
        window.show()
        sys.exit(app.exec())

    except Exception as e:
        logging.error(f"Application error: {e}")
        try:
            app
        except NameError:
            app = QApplication(sys.argv)
        QMessageBox.critical(None, 'Error', str(e))
        sys.exit(1)
