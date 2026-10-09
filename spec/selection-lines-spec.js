const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

describe("Repository URLs for editor selections", () => {
  let root, directory, repository, editor, value, copy;

  beforeEach(async () => {
    jasmine.useRealClock();
    for (const method of ["openExternal", "openPath", "showItemInFolder", "openApplication"])
      spyOn(lumine.shell, method).and.resolveTo();
    spyOn(lumine.application, "openWindow").and.resolveTo();
    copy = spyOn(lumine.clipboard, "write");
    root = fs.realpathSync.native(os.tmpdir());
    directory = fs.realpathSync.native(fs.mkdtempSync(path.join(root, "repository-lines-")));
    repository = await lumine.repositories.initialize(directory, { initialBranch: "main" });
    const operations = repository.getOperations();
    await operations.setConfig("remote.origin.url", "https://github.com/controlled/owned.git");
    await operations.setConfig("user.name", "Controlled Selection");
    await operations.setConfig("user.email", "selection@example.invalid");
    await operations.setConfig("commit.gpgsign", "false");
    const hooksPath = path.join(directory, "owned-hooks");
    fs.mkdirSync(hooksPath);
    await operations.setConfig("core.hooksPath", hooksPath);
    const file = path.join(directory, "example.txt");
    fs.writeFileSync(file, "first\nsecond\nthird\n");
    await operations.stageFiles(["example.txt"]);
    await operations.commit("Add controlled selection source");
    const pack = await lumine.packages.activatePackage("open-repository");
    const RepositoryFile = require(path.join(pack.path, "lib/repository-file"));
    editor = await lumine.workspace.open(file);
    value = await RepositoryFile.fromPath(file);
    lumine.config.set("open-repository.includeLineNumbersInUrls", true);
  });

  afterEach(async () => {
    if (lumine.packages.isPackageLoaded("open-repository")) {
      await lumine.packages.deactivatePackage("open-repository");
      await lumine.packages.unloadPackage("open-repository");
    }
    editor?.destroy();
    if (repository) await lumine.repositories.forget(repository);
    await lumine.fileWatchClient.settlePendingTeardown();
    if (
      path.dirname(directory) !== root ||
      !path.basename(directory).startsWith("repository-lines-")
    )
      throw new Error("Unsafe selection fixture cleanup");
    await fs.promises.rm(directory, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 50,
    });
  });

  for (const [name, range, suffix] of [
    [
      "one complete selected line",
      [
        [0, 0],
        [1, 0],
      ],
      "#L1",
    ],
    [
      "two complete selected lines",
      [
        [0, 0],
        [2, 0],
      ],
      "#L1-L2",
    ],
    [
      "a selection ending inside its final line",
      [
        [0, 0],
        [1, 1],
      ],
      "#L1-L2",
    ],
    [
      "a caret at the start of a line",
      [
        [2, 0],
        [2, 0],
      ],
      "#L3",
    ],
  ]) {
    it(`copies exactly the lines covered by ${name}`, () => {
      editor.setSelectedBufferRange(range);
      value.copyURL(editor.getSelectedBufferRange());
      expect(copy).toHaveBeenCalledOnceWith(value.shaURL() + suffix);
    });
  }
});
