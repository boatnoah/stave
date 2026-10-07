import { openWorkspaceStore } from "@stave/db";
import { parseWorkspaceSnapshot } from "../../shared/ipc-contract";

export function openStaveStore(path: string) {
  return openWorkspaceStore({
    path,
    parseSnapshot: parseWorkspaceSnapshot,
    parseEvent: (value: unknown) => {
      if (
        typeof value !== "object" ||
        value === null ||
        !("revision" in value) ||
        !("message" in value) ||
        typeof value.revision !== "number" ||
        !Number.isSafeInteger(value.revision) ||
        value.revision < 0 ||
        typeof value.message !== "string"
      )
        throw new Error("Invalid workspace journal entry");
      return { revision: value.revision, message: value.message };
    },
  });
}
export type StaveStore = ReturnType<typeof openStaveStore>;
