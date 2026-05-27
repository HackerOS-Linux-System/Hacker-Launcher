export interface Game {
  name: string;
  exe: string;
  runner: string;
  prefix: string;
  launch_options: string;
  fps_limit: number | null;
  enable_dxvk: boolean;
  enable_esync: boolean;
  enable_fsync: boolean;
  enable_dxvk_async: boolean;
  app_id: string;
}

export interface Settings {
  fullscreen: boolean;
  default_runner: string;
  auto_update: string;
  enable_esync: boolean;
  enable_fsync: boolean;
  enable_dxvk_async: boolean;
  theme: string;
}

export interface ProtonEntry {
  version: string;
  type: string;
  date: string;
  status: string;
}

export interface Paths {
  prefixes_dir: string;
  protons_dir: string;
  logs_dir: string;
}

export interface Toast {
  id: number;
  message: string;
  kind: "success" | "error" | "info";
}
