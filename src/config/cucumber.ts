import * as cucumber from '../cucumber';
import log from '../log';
import { ExtensionConfig } from './extension';

const cache = new WeakMap<ExtensionConfig, Promise<cucumber.ConfigToken>>();

export const getCucumberConfig = (extensionConfig: ExtensionConfig) => {
  let cached = cache.get(extensionConfig);

  if (!cached) {
    cached = cucumber.readConfig({
      cwd: extensionConfig.baseUri.fsPath,
      configFile: extensionConfig.configFile,
      profiles: extensionConfig.profiles,
      log,
    });

    cache.set(extensionConfig, cached);
  }

  return cached;
};

export const setCucumberConfigStale = (extensionConfig: ExtensionConfig) => {
  cache.delete(extensionConfig);
};
