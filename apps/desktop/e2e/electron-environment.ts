export function electronEnvironment({
  dataDirectory,
}: {
  readonly dataDirectory: string;
}): NodeJS.ProcessEnv {
  const environment = { ...process.env, STAVE_DATA_DIR: dataDirectory };
  delete environment.ELECTRON_RUN_AS_NODE;
  return environment;
}
