import sys
import shutil
from PySide6.QtWidgets import QApplication, QMessageBox
from main_window import MainWindow
if __name__ == '__main__':
    gamescope = '--gamescope' in sys.argv
    if gamescope and not shutil.which('gamescope'):
        app = QApplication(sys.argv)
        QMessageBox.critical(None, 'Error', "Gamescope is not installed. Please install it using 'sudo apt install gamescope'.")
        sys.exit(1)
    app = QApplication(sys.argv)
    with open('styles.qss', 'r') as f:
        app.setStyleSheet(f.read())
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
