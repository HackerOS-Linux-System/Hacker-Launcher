from PySide6.QtWidgets import QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QTableWidget, QTableWidgetItem, QPushButton, QTabWidget, QComboBox, QLineEdit, QLabel, QMessageBox, QFileDialog, QDialog, QGridLayout, QProgressDialog
from PySide6.QtCore import Qt
from PySide6.QtGui import QIcon
import os
import subprocess
from proton_manager import ProtonManager
from game_manager import GameManager
from config_manager import ConfigManager
class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('Hacker Launcher')
        self.resize(1000, 800)
        self.config_manager = ConfigManager()
        self.proton_manager = ProtonManager()
        self.game_manager = GameManager(self.proton_manager)
        self.games = []
        self.settings = self.config_manager.load_settings()
        self.apply_fullscreen()
        self.setup_ui()
        self.load_games()
        self.load_protons()
    def apply_fullscreen(self):
        if self.settings['fullscreen']:
            self.showFullScreen()
        else:
            self.showNormal()
    def setup_ui(self):
        central = QWidget()
        layout = QVBoxLayout()
        tabs = QTabWidget()
        # Games tab
        games_widget = QWidget()
        games_layout = QVBoxLayout()
        self.games_list = QTableWidget()
        self.games_list.setColumnCount(3)
        self.games_list.setHorizontalHeaderLabels(['Game Name', 'Runner', 'Launch Options'])
        self.games_list.horizontalHeader().setStretchLastSection(True)
        self.games_list.setSelectionBehavior(QTableWidget.SelectRows)
        games_layout.addWidget(QLabel("Installed Games"))
        games_layout.addWidget(self.games_list)
        buttons_layout = QHBoxLayout()
        add_btn = QPushButton(QIcon.fromTheme("list-add"), 'Add Game')
        add_btn.clicked.connect(self.add_game)
        add_btn.setToolTip("Add a new game to the launcher")
        launch_btn = QPushButton(QIcon.fromTheme("media-playback-start"), 'Launch Game')
        launch_btn.clicked.connect(self.launch_game)
        launch_btn.setToolTip("Launch the selected game")
        remove_btn = QPushButton(QIcon.fromTheme("edit-delete"), 'Remove Game')
        remove_btn.clicked.connect(self.remove_game)
        remove_btn.setToolTip("Remove the selected game")
        config_btn = QPushButton(QIcon.fromTheme("configure"), 'Configure Game')
        config_btn.clicked.connect(self.configure_game)
        config_btn.setToolTip("Configure Wine/Proton for the selected game")
        buttons_layout.addWidget(add_btn)
        buttons_layout.addWidget(launch_btn)
        buttons_layout.addWidget(remove_btn)
        buttons_layout.addWidget(config_btn)
        games_layout.addLayout(buttons_layout)
        games_widget.setLayout(games_layout)
        tabs.addTab(games_widget, 'Games')
        # Protons tab
        protons_widget = QWidget()
        protons_layout = QVBoxLayout()
        self.protons_table = QTableWidget()
        self.protons_table.setColumnCount(4)
        self.protons_table.setHorizontalHeaderLabels(['Version', 'Type', 'Installed Date', 'Status'])
        self.protons_table.horizontalHeader().setStretchLastSection(True)
        self.protons_table.setSelectionBehavior(QTableWidget.SelectRows)
        protons_layout.addWidget(QLabel("Installed Protons"))
        protons_layout.addWidget(self.protons_table)
        buttons_layout = QHBoxLayout()
        install_btn = QPushButton(QIcon.fromTheme("list-add"), 'Install Proton')
        install_btn.clicked.connect(self.install_proton)
        install_btn.setToolTip("Install a new Proton version")
        update_btn = QPushButton(QIcon.fromTheme("view-refresh"), 'Update Selected')
        update_btn.clicked.connect(self.update_proton)
        update_btn.setToolTip("Check and update the selected Proton")
        remove_btn = QPushButton(QIcon.fromTheme("edit-delete"), 'Remove Selected')
        remove_btn.clicked.connect(self.remove_proton)
        remove_btn.setToolTip("Remove the selected Proton")
        refresh_btn = QPushButton(QIcon.fromTheme("view-refresh"), 'Refresh')
        refresh_btn.clicked.connect(self.load_protons)
        refresh_btn.setToolTip("Refresh the list of installed Protons")
        buttons_layout.addWidget(install_btn)
        buttons_layout.addWidget(update_btn)
        buttons_layout.addWidget(remove_btn)
        buttons_layout.addWidget(refresh_btn)
        protons_layout.addLayout(buttons_layout)
        protons_widget.setLayout(protons_layout)
        tabs.addTab(protons_widget, 'Protons')
        # Settings tab
        settings_widget = QWidget()
        settings_layout = QGridLayout()
        settings_layout.addWidget(QLabel("Settings"), 0, 0, 1, 2)
        row = 1
        theme_label = QLabel("Theme:")
        theme_combo = QComboBox()
        theme_combo.addItems(['Dark (Default)', 'Light'])
        theme_combo.setCurrentText(self.settings.get('theme', 'Dark (Default)'))
        theme_combo.currentTextChanged.connect(self.update_settings)
        settings_layout.addWidget(theme_label, row, 0)
        settings_layout.addWidget(theme_combo, row, 1)
        row += 1
        runner_label = QLabel("Default Runner:")
        runner_combo = QComboBox()
        runner_combo.addItems(['Native', 'Wine', 'Proton', 'Flatpak', 'Snap'])
        runner_combo.setCurrentText(self.settings['default_runner'])
        runner_combo.currentTextChanged.connect(self.update_settings)
        settings_layout.addWidget(runner_label, row, 0)
        settings_layout.addWidget(runner_combo, row, 1)
        row += 1
        update_label = QLabel("Auto-check Updates:")
        update_combo = QComboBox()
        update_combo.addItems(['Enabled', 'Disabled'])
        update_combo.setCurrentText(self.settings['auto_update'])
        update_combo.currentTextChanged.connect(self.update_settings)
        settings_layout.addWidget(update_label, row, 0)
        settings_layout.addWidget(update_combo, row, 1)
        row += 1
        fullscreen_label = QLabel("Fullscreen Mode:")
        fullscreen_combo = QComboBox()
        fullscreen_combo.addItems(['Enabled', 'Disabled'])
        fullscreen_combo.setCurrentText('Enabled' if self.settings['fullscreen'] else 'Disabled')
        fullscreen_combo.currentTextChanged.connect(self.update_settings)
        settings_layout.addWidget(fullscreen_label, row, 0)
        settings_layout.addWidget(fullscreen_combo, row, 1)
        row += 1
        launch_label = QLabel("Default Launch Options:")
        launch_edit = QLineEdit(self.settings['default_launch_options'])
        launch_edit.setPlaceholderText("e.g., --fullscreen --bigpicture")
        launch_edit.textChanged.connect(self.update_settings)
        settings_layout.addWidget(launch_label, row, 0)
        settings_layout.addWidget(launch_edit, row, 1)
        row += 1
        prefix_label = QLabel("Prefixes Location:")
        prefix_value = QLabel(self.config_manager.prefixes_dir)
        prefix_value.setStyleSheet("color: #888888;")
        settings_layout.addWidget(prefix_label, row, 0)
        settings_layout.addWidget(prefix_value, row, 1)
        row += 1
        protons_label = QLabel("Protons Location:")
        protons_value = QLabel(self.config_manager.protons_dir)
        protons_value.setStyleSheet("color: #888888;")
        settings_layout.addWidget(protons_label, row, 0)
        settings_layout.addWidget(protons_value, row, 1)
        settings_layout.setRowStretch(row, 1)
        settings_widget.setLayout(settings_layout)
        tabs.addTab(settings_widget, 'Settings')
        layout.addWidget(tabs)
        central.setLayout(layout)
        self.setCentralWidget(central)
    def update_settings(self):
        self.settings['theme'] = self.sender().currentText() if self.sender().objectName() == 'theme_combo' else self.settings.get('theme', 'Dark (Default)')
        self.settings['default_runner'] = self.sender().currentText() if self.sender().objectName() == 'runner_combo' else self.settings['default_runner']
        self.settings['auto_update'] = self.sender().currentText() if self.sender().objectName() == 'update_combo' else self.settings['auto_update']
        self.settings['fullscreen'] = self.sender().currentText() == 'Enabled' if self.sender().objectName() == 'fullscreen_combo' else self.settings['fullscreen']
        self.settings['default_launch_options'] = self.sender().text() if self.sender().objectName() == 'launch_edit' else self.settings['default_launch_options']
        self.config_manager.save_settings(self.settings)
        self.apply_fullscreen()
        self.sender().setObjectName('') # Reset to avoid recursive calls
    def load_games(self):
        self.games_list.setRowCount(0)
        self.games = self.config_manager.load_games()
        self.games_list.setRowCount(len(self.games))
        for i, game in enumerate(self.games):
            self.games_list.setItem(i, 0, QTableWidgetItem(game['name']))
            self.games_list.setItem(i, 1, QTableWidgetItem(game['runner']))
            self.games_list.setItem(i, 2, QTableWidgetItem(game.get('launch_options', '')))
        self.games_list.resizeColumnsToContents()
    def load_protons(self):
        self.protons_table.setRowCount(0)
        protons = self.proton_manager.get_installed_protons()
        self.protons_table.setRowCount(len(protons))
        for i, proton in enumerate(protons):
            self.protons_table.setItem(i, 0, QTableWidgetItem(proton['version']))
            self.protons_table.setItem(i, 1, QTableWidgetItem(proton['type']))
            self.protons_table.setItem(i, 2, QTableWidgetItem(proton['date']))
            self.protons_table.setItem(i, 3, QTableWidgetItem(proton['status']))
        self.protons_table.resizeColumnsToContents()
    def add_game(self):
        add_dialog = QDialog(self)
        add_dialog.setWindowTitle("Add New Game")
        dlg_layout = QGridLayout()
        row = 0
        name_label = QLabel('Game Name:')
        name_edit = QLineEdit()
        name_edit.setPlaceholderText("Enter game name")
        dlg_layout.addWidget(name_label, row, 0)
        dlg_layout.addWidget(name_edit, row, 1, 1, 2)
        row += 1
        exe_label = QLabel('Executable / App ID:')
        exe_edit = QLineEdit()
        exe_edit.setPlaceholderText("Select game executable")
        browse_btn = QPushButton(QIcon.fromTheme("folder"), 'Browse')
        browse_btn.clicked.connect(lambda: exe_edit.setText(QFileDialog.getOpenFileName(self, 'Select Executable', '/', 'Executables (*.exe *.bat);;All Files (*)')[0]))
        dlg_layout.addWidget(exe_label, row, 0)
        dlg_layout.addWidget(exe_edit, row, 1)
        dlg_layout.addWidget(browse_btn, row, 2)
        row += 1
        runner_label = QLabel('Runner:')
        runner_combo = QComboBox()
        runner_combo.addItems(['Native', 'Wine', 'Proton', 'Flatpak', 'Snap'])
        runner_combo.setCurrentText(self.settings['default_runner'])
        dlg_layout.addWidget(runner_label, row, 0)
        dlg_layout.addWidget(runner_combo, row, 1, 1, 2)
        row += 1
        proton_label = QLabel('Proton Version:')
        proton_combo = QComboBox()
        proton_combo.addItems([p['version'] for p in self.proton_manager.get_installed_protons()])
        proton_widget = QWidget()
        proton_layout = QHBoxLayout()
        proton_layout.addWidget(proton_label)
        proton_layout.addWidget(proton_combo)
        proton_widget.setLayout(proton_layout)
        proton_widget.setVisible(runner_combo.currentText() == 'Proton')
        dlg_layout.addWidget(proton_widget, row, 0, 1, 3)
        row += 1
        launch_label = QLabel('Launch Options:')
        launch_edit = QLineEdit()
        launch_edit.setPlaceholderText("e.g., --fullscreen --bigpicture --gamescope")
        launch_edit.setText(self.settings['default_launch_options'])
        dlg_layout.addWidget(launch_label, row, 0)
        dlg_layout.addWidget(launch_edit, row, 1, 1, 2)
        row += 1
        runner_combo.currentTextChanged.connect(lambda text: proton_widget.setVisible(text == 'Proton'))
        button_layout = QHBoxLayout()
        ok_btn = QPushButton(QIcon.fromTheme("dialog-ok"), 'Add Game')
        cancel_btn = QPushButton(QIcon.fromTheme("dialog-cancel"), 'Cancel')
        ok_btn.clicked.connect(add_dialog.accept)
        cancel_btn.clicked.connect(add_dialog.reject)
        button_layout.addStretch()
        button_layout.addWidget(ok_btn)
        button_layout.addWidget(cancel_btn)
        dlg_layout.addLayout(button_layout, row, 0, 1, 3)
        add_dialog.setLayout(dlg_layout)
        add_dialog.resize(600, 300)
        if add_dialog.exec() == QDialog.Accepted:
            name = name_edit.text()
            exe = exe_edit.text()
            runner = runner_combo.currentText()
            launch_options = launch_edit.text()
            if runner == 'Proton':
                runner = proton_combo.currentText()
            if not name or not exe:
                QMessageBox.warning(self, 'Error', 'Name and Executable/App ID required')
                return
            prefix = ''
            if runner in ['Wine'] or '-' in runner:
                prefix = os.path.join(self.config_manager.prefixes_dir, name.replace(' ', '_'))
                os.makedirs(prefix, exist_ok=True)
            game = {'name': name, 'exe': exe, 'runner': runner, 'prefix': prefix, 'launch_options': launch_options}
            self.game_manager.add_game(game)
            self.load_games()
    def launch_game(self):
        selected = self.games_list.currentRow()
        if selected < 0:
            QMessageBox.warning(self, 'Error', 'No game selected')
            return
        name = self.games_list.item(selected, 0).text()
        game = next((g for g in self.games if g['name'] == name), None)
        if game:
            try:
                self.game_manager.launch_game(game, '--gamescope' in game.get('launch_options', ''))
            except Exception as e:
                QMessageBox.warning(self, 'Error', str(e))
    def remove_game(self):
        selected = self.games_list.currentRow()
        if selected < 0:
            QMessageBox.warning(self, 'Error', 'No game selected')
            return
        name = self.games_list.item(selected, 0).text()
        self.game_manager.remove_game(name)
        self.load_games()
    def configure_game(self):
        selected = self.games_list.currentRow()
        if selected < 0:
            QMessageBox.warning(self, 'Error', 'No game selected')
            return
        name = self.games_list.item(selected, 0).text()
        game = next((g for g in self.games if g['name'] == name), None)
        if not game or game['runner'] in ['Native', 'Flatpak', 'Snap']:
            QMessageBox.information(self, 'Info', 'No configuration needed for this runner')
            return
        prefix = game['prefix']
        env = os.environ.copy()
        env['WINEPREFIX'] = prefix
        subprocess.Popen(['winetricks'], env=env)
    def install_proton(self):
        install_dialog = QDialog(self)
        install_dialog.setWindowTitle("Install Proton")
        layout = QVBoxLayout()
        type_label = QLabel("Proton Type:")
        type_combo = QComboBox()
        type_combo.addItems(['GE', 'Official', 'Custom'])
        layout.addWidget(type_label)
        layout.addWidget(type_combo)
        version_widget = QWidget()
        version_layout = QVBoxLayout()
        version_label = QLabel("Select Version:")
        version_combo = QComboBox()
        version_layout.addWidget(version_label)
        version_layout.addWidget(version_combo)
        version_widget.setLayout(version_layout)
        version_widget.setVisible(False)
        layout.addWidget(version_widget)
        custom_widget = QWidget()
        custom_layout = QVBoxLayout()
        custom_type_label = QLabel("Custom Source:")
        custom_type_combo = QComboBox()
        custom_type_combo.addItems(['Tar.gz File', 'Folder'])
        custom_layout.addWidget(custom_type_label)
        custom_layout.addWidget(custom_type_combo)
        path_label = QLabel("Path:")
        path_edit = QLineEdit()
        browse_btn = QPushButton(QIcon.fromTheme("folder"), 'Browse')
        path_hbox = QHBoxLayout()
        path_hbox.addWidget(path_edit)
        path_hbox.addWidget(browse_btn)
        custom_layout.addWidget(path_label)
        custom_layout.addLayout(path_hbox)
        name_label = QLabel("Version Name:")
        name_edit = QLineEdit()
        custom_layout.addWidget(name_label)
        custom_layout.addWidget(name_edit)
        custom_widget.setLayout(custom_layout)
        custom_widget.setVisible(False)
        layout.addWidget(custom_widget)
        def update_ui(text):
            if text == 'Custom':
                version_widget.setVisible(False)
                custom_widget.setVisible(True)
            else:
                version_widget.setVisible(True)
                custom_widget.setVisible(False)
                if text == 'GE':
                    available = self.proton_manager.get_available_ge()
                else:
                    available = self.proton_manager.get_available_official()
                version_combo.clear()
                version_combo.addItems(available or ["No versions available"])
        type_combo.currentTextChanged.connect(update_ui)
        update_ui(type_combo.currentText())
        def browse_custom():
            if custom_type_combo.currentText() == 'Tar.gz File':
                path = QFileDialog.getOpenFileName(self, 'Select Tar.gz', '', 'Tar.gz (*.tar.gz)')[0]
            else:
                path = QFileDialog.getExistingDirectory(self, 'Select Folder')
            if path:
                path_edit.setText(path)
                if not name_edit.text():
                    name_edit.setText(os.path.basename(path).replace('.tar.gz', ''))
        browse_btn.clicked.connect(browse_custom)
        button_layout = QHBoxLayout()
        ok_btn = QPushButton(QIcon.fromTheme("dialog-ok"), 'Install')
        cancel_btn = QPushButton(QIcon.fromTheme("dialog-cancel"), 'Cancel')
        ok_btn.clicked.connect(install_dialog.accept)
        cancel_btn.clicked.connect(install_dialog.reject)
        button_layout.addStretch()
        button_layout.addWidget(ok_btn)
        button_layout.addWidget(cancel_btn)
        layout.addLayout(button_layout)
        install_dialog.setLayout(layout)
        install_dialog.resize(500, 350)
        if install_dialog.exec() == QDialog.Accepted:
            proton_type = type_combo.currentText()
            progress = QProgressDialog(f"Installing {proton_type} Proton...", "Cancel", 0, 100, self)
            progress.setWindowModality(Qt.WindowModal)
            progress.setAutoClose(True)
            def update_progress(stage, value, total):
                progress.setLabelText(f"{stage}...")
                if total:
                    progress.setValue(int(value * 100 / total))
                if progress.wasCanceled():
                    raise Exception("Installation canceled")
            success, message = False, "Unknown error"
            try:
                if proton_type == 'GE':
                    version = version_combo.currentText()
                    success, message = self.proton_manager.install_proton(version, 'GE', update_progress)
                elif proton_type == 'Official':
                    version = version_combo.currentText()
                    success, message = self.proton_manager.install_proton(version, 'Official', update_progress)
                elif proton_type == 'Custom':
                    path = path_edit.text()
                    version = name_edit.text()
                    if not version or not path:
                        QMessageBox.warning(self, 'Error', 'Name and Path required')
                        return
                    if custom_type_combo.currentText() == 'Tar.gz File':
                        success, message = self.proton_manager.install_custom_tar(path, version, update_progress)
                    else:
                        success, message = self.proton_manager.install_custom_folder(path, version)
                progress.setValue(100)
            except Exception as e:
                success, message = False, str(e)
            if success:
                QMessageBox.information(self, 'Success', f'Proton {version} installed')
            else:
                QMessageBox.warning(self, 'Error', f'Failed to install Proton {version}: {message}')
            self.load_protons()
    def update_proton(self):
        selected = self.protons_table.currentRow()
        if selected < 0:
            QMessageBox.warning(self, 'Error', 'No Proton selected')
            return
        version = self.protons_table.item(selected, 0).text()
        proton_type = self.protons_table.item(selected, 1).text()
        update_info = self.proton_manager.check_update(version, proton_type)
        if not update_info:
            QMessageBox.information(self, 'Info', 'No update available or not supported')
            return
        new_type, new_version = update_info
        progress = QProgressDialog(f"Updating {proton_type} Proton to {new_version}...", "Cancel", 0, 100, self)
        progress.setWindowModality(Qt.WindowModal)
        progress.setAutoClose(True)
        def update_progress(stage, value, total):
            progress.setLabelText(f"{stage}...")
            if total:
                progress.setValue(int(value * 100 / total))
            if progress.wasCanceled():
                raise Exception("Update canceled")
        try:
            success, message = self.proton_manager.install_proton(new_version, new_type, update_progress)
            if success:
                self.proton_manager.remove_proton(version)
                QMessageBox.information(self, 'Success', f'Updated to {new_version}')
            else:
                QMessageBox.warning(self, 'Error', f'Failed to update to {new_version}: {message}')
        except Exception as e:
            QMessageBox.warning(self, 'Error', f'Failed to update to {new_version}: {str(e)}')
        self.load_protons()
    def remove_proton(self):
        selected = self.protons_table.currentRow()
        if selected < 0:
            QMessageBox.warning(self, 'Error', 'No Proton selected')
            return
        version = self.protons_table.item(selected, 0).text()
        reply = QMessageBox.question(self, 'Confirm', f'Remove {version}?', QMessageBox.Yes | QMessageBox.No)
        if reply == QMessageBox.Yes:
            if self.proton_manager.remove_proton(version):
                QMessageBox.information(self, 'Success', f'{version} removed')
            else:
                QMessageBox.warning(self, 'Error', f'Failed to remove {version}')
            self.load_protons()
