export interface SharedConfig {
  readonly configFile?: string;
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly envFiles?: readonly string[];
  readonly profiles?: readonly string[];
}

export interface VirtualFolder extends SharedConfig {
  readonly name: string;
}

export interface MainConfig extends SharedConfig {
  readonly virtualFolders?: readonly VirtualFolder[];
}
