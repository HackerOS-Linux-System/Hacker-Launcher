# main_window.py
from PySide6.QtWidgets import QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QTableWidget, QTableWidgetItem, QPushButton, QTabWidget, QComboBox, QLineEdit, QLabel, QMessageBox, QFileDialog, QDialog, QGridLayout, QProgressDialog, QCheckBox, QTextEdit
from PySide6.QtCore import Qt, QThread, Signal
from PySide6.QtGui import QIcon
import os
import subprocess
import shutil
import logging
from proton_manager import ProtonManager
from game_manager import GameManager
from config_manager import ConfigManager

class InstallThread(QThread):
    update_progress = Signal(str, int, int)
    finished = Signal(bool, str)

    def __init__(self, manager, version, proton_type, custom_path=None, custom_type=None):
        super().__init__()
        self.manager = manager
        self.version = version
        self.proton_type = proton_type
        self.custom_path = custom_path
        self.custom_type = custom_type

    def run(self):
        def progress_callback(stage, value, total):
            self.update_progress.emit(stage, value, total)
        try:
            if self.proton_type in ['GE', 'Official', 'Experimental']:
                success, message = self.manager.install_proton(self.version, self.proton_type if self.proton_type != 'Experimental' else 'Official', progress_callback)
            else:  # Custom
                if self.custom_type == 'Tar.gz File':
                    success, message = self.manager.install_custom_tar(self.custom_path, self.version, progress_callback)
                else:
                    success, message = self.manager.install_custom_folder(self.custom_path, self.version)
            self.finished.emit(success, message)
        except Exception as e:
            self.finished.emit(False, str(e))

class LoadProtonsThread(QThread):
    protons_loaded = Signal(list)

    def __init__(self, manager):
        super().__init__()
        self.manager = manager

    def run(self):
        try:
            protons = self.manager.get_installed_protons()
            self.protons_loaded.emit(protons)
        except Exception as e:
            logging.error(f"Error loading protons: {e}")
            self.protons_loaded.emit([])

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
        self.start_proton_loading()

    def apply_fullscreen(self):
        if self.settings['fullscreen']:
            self.showFullScreen()
        else:
            self.showNormal()

    def setup_ui(self):
        central = QWidget()
        layout = QVBoxLayout(central)
        tabs = QTabWidget()
        # Games tab
        games_widget = QWidget()
        games_layout = QVBoxLayout(games_widget)
        self.games_list = QTableWidget(0, 3)
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
        tabs.addTab(games_widget, 'Games')
        # Protons tab
        protons_widget = QWidget()
        protons_layout = QVBoxLayout(protons_widget)
        self.protons_table = QTableWidget(0, 4)
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
        refresh_btn.clicked.connect(self.start_proton_loading)
        refresh_btn.setToolTip("Refresh the list of installed Protons")
        stable_check = QCheckBox("Stable Only")
        stable_check.setChecked(True)
        stable_check.stateChanged.connect(self.start_proton_loading)
        buttons_layout.addWidget(install_btn)
        buttons_layout.addWidget(update_btn)
        buttons_layout.addWidget(remove_btn)
        buttons_layout.addWidget(refresh_btn)
        buttons_layout.addWidget(stable_check)
        protons_layout.addLayout(buttons_layout)
        tabs.addTab(protons_widget, 'Protons')
        # Settings tab
        settings_widget = QWidget()
        settings_layout = QGridLayout(settings_widget)
        settings_layout.addWidget(QLabel("Settings"), 0, 0, 1, 2)
        row = 1
        theme_label = QLabel("Theme:")
        self.theme_combo = QComboBox()
        self.theme_combo.addItems(['Dark (Default)', 'Light'])
        self.theme_combo.setCurrentText(self.settings.get('theme', 'Dark (Default)'))
        self.theme_combo.setObjectName('theme_combo')
        self.theme_combo.currentTextChanged.connect(self.update_settings)
        settings_layout.addWidget(theme_label, row, 0)
        settings_layout.addWidget(self.theme_combo, row, 1)
        row += 1
        runner_label = QLabel("Default Runner:")
        self.runner_combo = QComboBox()
        self.runner_combo.addItems(['Native', 'Wine', 'Proton', 'Flatpak', 'Steam'])
        self.runner_combo.setCurrentText(self.settings['default_runner'])
        self.runner_combo.setObjectName('runner_combo')
        self.runner_combo.currentTextChanged.connect(self.update_settings)
        settings_layout.addWidget(runner_label, row, 0)
        settings_layout.addWidget(self.runner_combo, row, 1)
        row += 1
        update_label = QLabel("Auto-check Updates:")
        self.update_combo = QComboBox()
        self.update_combo.addItems(['Enabled', 'Disabled'])
        self.update_combo.setCurrentText(self.settings['auto_update'])
        self.update_combo.setObjectName('update_combo')
        self.update_combo.currentTextChanged.connect(self.update_settings)
        settings_layout.addWidget(update_label, row, 0)
        settings_layout.addWidget(self.update_combo, row, 1)
        row += 1
        fullscreen_label = QLabel("Fullscreen Mode:")
        self.fullscreen_combo = QComboBox()
        self.fullscreen_combo.addItems(['Enabled', 'Disabled'])
        self.fullscreen_combo.setCurrentText('Enabled' if self.settings['fullscreen'] else 'Disabled')
        self.fullscreen_combo.setObjectName('fullscreen_combo')
        self.fullscreen_combo.currentTextChanged.connect(self.update_settings)
        settings_layout.addWidget(fullscreen_label, row, 0)
        settings_layout.addWidget(self.fullscreen_combo, row, 1)
        row += 1
        esync_check = QCheckBox("Enable Esync (Global)")
        esync_check.setChecked(self.settings['enable_esync'])
        esync_check.setObjectName('esync_check')
        esync_check.stateChanged.connect(self.update_settings)
        settings_layout.addWidget(esync_check, row, 0)
        row += 1
        fsync_check = QCheckBox("Enable Fsync (Global)")
        fsync_check.setChecked(self.settings['enable_fsync'])
        fsync_check.setObjectName('fsync_check')
        fsync_check.stateChanged.connect(self.update_settings)
        settings_layout.addWidget(fsync_check, row, 0)
        row += 1
        dxvk_async_check = QCheckBox("Enable DXVK Async (Global)")
        dxvk_async_check.setChecked(self.settings['enable_dxvk_async'])
        dxvk_async_check.setObjectName('dxvk_async_check')
        dxvk_async_check.stateChanged.connect(self.update_settings)
        settings_layout.addWidget(dxvk_async_check, row, 0)
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
        tabs.addTab(settings_widget, 'Settings')
        # About tab
        about_widget = QWidget()
        about_layout = QVBoxLayout(about_widget)
        about_text = QTextEdit()
        about_text.setReadOnly(True)
        about_text.setText("Hacker Launcher v1.0\nGitHub: https://github.com/your-repo\nA launcher for running games with Proton/Wine easily.")
        about_layout.addWidget(about_text)
        tabs.addTab(about_widget, 'About')
        layout.addWidget(tabs)
        self.setCentralWidget(central)

    def start_proton_loading(self):
        self.protons_table.setRowCount(0)  # Clear table while loading
        self.proton_thread = LoadProtonsThread(self.proton_manager)
        self.proton_thread.protons_loaded.connect(self.load_protons)
        self.proton_thread.start()

    def update_settings(self):
        sender = self.sender()
        obj_name = sender.objectName()
        if obj_name == 'theme_combo':
            self.settings['theme'] = sender.currentText()
        elif obj_name == 'runner_combo':
            self.settings['default_runner'] = sender.currentText()
        elif obj_name == 'update_combo':
            self.settings['auto_update'] = sender.currentText()
        elif obj_name == 'fullscreen_combo':
            self.settings['fullscreen'] = sender.currentText() == 'Enabled'
            self.apply_fullscreen()
        elif obj_name == 'esync_check':
            self.settings['enable_esync'] = sender.isChecked()
        elif obj_name == 'fsync_check':
            self.settings['enable_fsync'] = sender.isChecked()
        elif obj_name == 'dxvk_async_check':
            self.settings['enable_dxvk_async'] = sender.isChecked()
        self.config_manager.save_settings(self.settings)

    def load_games(self):
        self.games_list.setRowCount(0)
        self.games = self.config_manager.load_games()
        self.games_list.setRowCount(len(self.games))
        for i, game in enumerate(self.games):
            self.games_list.setItem(i, 0, QTableWidgetItem(game['name']))
            self.games_list.setItem(i, 1, QTableWidgetItem(game['runner']))
            self.games_list.setItem(i, 2, QTableWidgetItem(game.get('launch_options', '')))
        self.games_list.resizeColumnsToContents()

    def load_protons(self, protons):
        self.protons_table.setRowCount(0)
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
        exe_edit.setPlaceholderText("Select game executable or enter Steam App ID")
        browse_btn = QPushButton(QIcon.fromTheme("folder"), 'Browse')
        browse_btn.clicked.connect(lambda: exe_edit.setText(QFileDialog.getOpenFileName(self, 'Select Executable', '/', 'Executables (*.exe *.bat);;All Files (*)')[0]))
        dlg_layout.addWidget(exe_label, row, 0)
        dlg_layout.addWidget(exe_edit, row, 1)
        dlg_layout.addWidget(browse_btn, row, 2)
        row += 1
        runner_label = QLabel('Runner:')
        runner_combo = QComboBox()
        runner_combo.addItems(['Native', 'Wine', 'Proton', 'Flatpak', 'Steam'])
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
        prefix_label = QLabel('Wine/Proton Prefix:')
        prefix_edit = QLineEdit()
        prefix_edit.setPlaceholderText("Select or enter prefix path")
        prefix_browse_btn = QPushButton(QIcon.fromTheme("folder"), 'Browse')
        prefix_browse_btn.clicked.connect(lambda: prefix_edit.setText(QFileDialog.getExistingDirectory(self, 'Select Prefix Directory')))
        prefix_widget = QWidget()
        prefix_layout = QHBoxLayout()
        prefix_layout.addWidget(prefix_label)
        prefix_layout.addWidget(prefix_edit)
        prefix_layout.addWidget(prefix_browse_btn)
        prefix_widget.setLayout(prefix_layout)
        prefix_widget.setVisible(runner_combo.currentText() in ['Wine', 'Proton'])
        dlg_layout.addWidget(prefix_widget, row, 0, 1, 3)
        row += 1
        launch_label = QLabel('Launch Options:')
        launch_edit = QLineEdit()
        launch_edit.setPlaceholderText("e.g., --fullscreen --bigpicture --gamescope --adaptive-sync --width=1920 --height=1080")
        dlg_layout.addWidget(launch_label, row, 0)
        dlg_layout.addWidget(launch_edit, row, 1, 1, 2)
        row += 1
        dxvk_check = QCheckBox("Enable DXVK/VKD3D")
        dxvk_check.setVisible(runner_combo.currentText() in ['Wine', 'Proton'])
        dlg_layout.addWidget(dxvk_check, row, 0)
        row += 1
        esync_check = QCheckBox("Enable Esync (Override)")
        esync_check.setVisible(runner_combo.currentText() in ['Wine', 'Proton'])
        dlg_layout.addWidget(esync_check, row, 0)
        row += 1
        fsync_check = QCheckBox("Enable Fsync (Override)")
        fsync_check.setVisible(runner_combo.currentText() in ['Wine', 'Proton'])
        dlg_layout.addWidget(fsync_check, row, 0)
        row += 1
        dxvk_async_check = QCheckBox("Enable DXVK Async (Override)")
        dxvk_async_check.setVisible(runner_combo.currentText() in ['Wine', 'Proton'])
        dlg_layout.addWidget(dxvk_async_check, row, 0)
        row += 1
        app_id_widget = QWidget()
        app_id_layout = QHBoxLayout()
        app_id_label = QLabel('Steam App ID:')
        app_id_edit = QLineEdit()
        app_id_layout.addWidget(app_id_label)
        app_id_layout.addWidget(app_id_edit)
        app_id_widget.setLayout(app_id_layout)
        app_id_widget.setVisible(runner_combo.currentText() == 'Steam')
        dlg_layout.addWidget(app_id_widget, row, 0, 1, 3)
        row += 1
        def update_visibility(text):
            proton_widget.setVisible(text == 'Proton')
            prefix_widget.setVisible(text in ['Wine', 'Proton'])
            app_id_widget.setVisible(text == 'Steam')
            browse_btn.setVisible(text != 'Steam')
            dxvk_check.setVisible(text in ['Wine', 'Proton'])
            esync_check.setVisible(text in ['Wine', 'Proton'])
            fsync_check.setVisible(text in ['Wine', 'Proton'])
            dxvk_async_check.setVisible(text in ['Wine', 'Proton'])
        runner_combo.currentTextChanged.connect(update_visibility)
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
        add_dialog.resize(600, 400)
        if add_dialog.exec() == QDialog.Accepted:
            name = name_edit.text()
            exe = exe_edit.text()
            runner = runner_combo.currentText()
            launch_options = launch_edit.text()
            enable_dxvk = dxvk_check.isChecked()
            enable_esync = esync_check.isChecked()
            enable_fsync = fsync_check.isChecked()
            enable_dxvk_async = dxvk_async_check.isChecked()
            app_id = app_id_edit.text() if runner == 'Steam' else ''
            prefix = prefix_edit.text() if runner in ['Wine', 'Proton'] else ''
            if runner == 'Proton':
                runner = proton_combo.currentText()
            if not name or (runner != 'Steam' and not exe) or (runner == 'Steam' and not app_id):
                QMessageBox.warning(self, 'Error', 'Name and Executable/App ID required')
                return
            if runner in ['Wine', 'Proton'] and not prefix:
                prefix = os.path.join(self.config_manager.prefixes_dir, name.replace(' ', '_'))
            if prefix:
                os.makedirs(prefix, exist_ok=True)
            if os.name == 'posix' and ':' in exe:
                exe = exe.replace('\\', '/').replace('C:', '/drive_c')
            game = {
                'name': name,
                'exe': exe,
                'runner': runner,
                'prefix': prefix,
                'launch_options': launch_options,
                'enable_dxvk': enable_dxvk,
                'enable_esync': enable_esync,
                'enable_fsync': enable_fsync,
                'enable_dxvk_async': enable_dxvk_async,
                'app_id': app_id
            }
            self.game_manager.add_game(game)
            self.load_games()
            QMessageBox.information(self, 'Success', 'Game added successfully!')

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
                logging.error(f"Error launching {name}: {e}")
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
        if not game or game['runner'] in ['Native', 'Flatpak', 'Steam']:
            QMessageBox.information(self, 'Info', 'No configuration needed for this runner')
            return
        if not shutil.which('winetricks'):
            QMessageBox.warning(self, 'Error', 'Winetricks not installed. Please install it.')
            return
        tricks_dialog = QDialog(self)
        tricks_dialog.setWindowTitle("Install Winetricks Libraries")
        tricks_layout = QVBoxLayout()
        tricks_label = QLabel("Select libraries to install:")
        tricks_list = QComboBox()
        popular_tricks = ['dotnet48', 'vcrun2019', 'dxvk', 'vkd3d', 'corefonts', 'd3dcompiler_47', 'physx', 'msls31']
        tricks_list.addItems(popular_tricks)
        install_btn = QPushButton('Install Selected')
        def install_trick():
            trick = tricks_list.currentText()
            prefix = game['prefix']
            env = os.environ.copy()
            env['WINEPREFIX'] = prefix
            try:
                subprocess.run(['winetricks', '--unattended', trick], env=env, check=True)
                QMessageBox.information(self, 'Success', f'{trick} installed')
            except Exception as e:
                QMessageBox.warning(self, 'Error', str(e))
        install_btn.clicked.connect(install_trick)
        tricks_layout.addWidget(tricks_label)
        tricks_layout.addWidget(tricks_list)
        tricks_layout.addWidget(install_btn)
        tricks_dialog.setLayout(tricks_layout)
        tricks_dialog.exec()
        env = os.environ.copy()
        env['WINEPREFIX'] = game['prefix']
        subprocess.Popen(['winetricks'], env=env)

    def install_proton(self):
        install_dialog = QDialog(self)
        install_dialog.setWindowTitle("Install Proton")
        layout = QVBoxLayout()
        type_label = QLabel("Proton Type:")
        type_combo = QComboBox()
        type_combo.addItems(['GE', 'Official', 'Experimental', 'Custom'])
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
                elif text == 'Official':
                    available = self.proton_manager.get_available_official(stable=True)
                elif text == 'Experimental':
                    available = self.proton_manager.get_available_official(stable=False)
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
            version = version_combo.currentText() if proton_type != 'Custom' else name_edit.text()
            custom_path = path_edit.text() if proton_type == 'Custom' else None
            custom_type = custom_type_combo.currentText() if proton_type == 'Custom' else None
            if proton_type == 'Custom' and (not version or not custom_path):
                QMessageBox.warning(self, 'Error', 'Name and Path required')
                return
            thread = InstallThread(self.proton_manager, version, proton_type, custom_path, custom_type)
            thread.update_progress.connect(lambda stage, value, total: progress.setLabelText(stage) or progress.setValue(int(value * 100 / total) if total else 0))
            thread.finished.connect(lambda success, message: self.install_finished(success, message, version, progress))
            thread.start()
            progress.canceled.connect(thread.terminate)

    def install_finished(self, success, message, version, progress):
        progress.setValue(100)
        if success:
            QMessageBox.information(self, 'Success', f'Proton {version} installed')
        else:
            QMessageBox.warning(self, 'Error', f'Failed to install Proton {version}: {message}')
        self.start_proton_loading()

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
        reply = QMessageBox.question(self, 'Update', f'Update to {new_version} ({new_type})?', QMessageBox.Yes | QMessageBox.No)
        if reply == QMessageBox.No:
            return
        progress = QProgressDialog(f"Updating {proton_type} Proton to {new_version}...", "Cancel", 0, 100, self)
        progress.setWindowModality(Qt.WindowModal)
        progress.setAutoClose(True)
        thread = InstallThread(self.proton_manager, new_version, new_type)
        thread.update_progress.connect(lambda stage, value, total: progress.setLabelText(stage) or progress.setValue(int(value * 100 / total) if total else 0))
        thread.finished.connect(lambda success, message: self.update_finished(success, message, new_version, version, progress))
        thread.start()
        progress.canceled.connect(thread.terminate)

    def update_finished(self, success, message, new_version, old_version, progress):
        progress.setValue(100)
        if success:
            self.proton_manager.remove_proton(old_version)
            QMessageBox.information(self, 'Success', f'Updated to {new_version}')
        else:
            QMessageBox.warning(self, 'Error', f'Failed to update to {new_version}: {message}')
        self.start_proton_loading()

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
            self.start_proton_loading()
