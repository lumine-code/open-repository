const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
describe("Repository URL metadata boundaries", () => {
  let repository, editor, directory, root, RepositoryFile, file, clipboard, browser;
  beforeEach(async () => {
    jasmine.useRealClock();
    for (const name of ["openPath", "openExternal", "openApplication", "showItemInFolder"])
      spyOn(lumine.shell, name).and.resolveTo("");
    browser = lumine.shell.openExternal;
    clipboard = spyOn(lumine.clipboard, "write");
    root = fs.realpathSync.native(os.tmpdir());
    directory = fs.realpathSync.native(
      fs.mkdtempSync(path.join(root, "open-repository-metadata-")),
    );
    repository = await lumine.repositories.initialize(directory, { initialBranch: "main" });
    await repository
      .getOperations()
      .setConfig("remote.origin.url", "https://github.com/controlled/owned.git");
    await repository.getOperations().setConfig("user.name", "Controlled Metadata");
    await repository.getOperations().setConfig("user.email", "metadata@example.invalid");
    await repository.getOperations().setConfig("commit.gpgsign", "false");
    file = path.join(directory, "example.txt");
    fs.writeFileSync(file, "saved source\n");
    const pack = await lumine.packages.activatePackage("open-repository");
    RepositoryFile = require(path.join(pack.path, "lib/repository-file"));
    editor = await lumine.workspace.open(file);
  });
  afterEach(async () => {
    await lumine.packages.deactivatePackage("open-repository");
    editor.destroy();
    await lumine.repositories.forget(repository);
    await lumine.fileWatchClient.settlePendingTeardown();
    if (
      path.dirname(directory) !== root ||
      !path.basename(directory).startsWith("open-repository-metadata-")
    )
      throw Error("Unsafe owned scratch cleanup");
    await fs.promises.rm(directory, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 50,
    });
  });
  it("declines a permalink before the actual repository has its first commit", async () => {
    const value = await RepositoryFile.fromPath(file);
    const warning = spyOn(lumine.notifications, "addWarning");
    expect(value.headSha).toBeNull();
    expect(() => value.copyURL()).not.toThrow();
    expect(clipboard).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalled();
  });
  it("keeps ordinary branch comparison in an actual unborn main repository", async () => {
    const value = await RepositoryFile.fromPath(file);
    expect(() => value.openBranchCompare()).not.toThrow();
    expect(browser).toHaveBeenCalledWith("https://github.com/controlled/owned/compare/main");
  });
  it("encodes the configured branch name in a real Git configuration URL", async () => {
    const operations = repository.getOperations();
    await operations.stageFiles(["example.txt"]);
    await operations.commit("Controlled URL baseline");
    await operations.setConfig("lumine.open-repository.branch", "feature#topic");
    const value = await RepositoryFile.fromPath(file);
    value.open();
    expect(browser).toHaveBeenCalledWith(
      "https://github.com/controlled/owned/blob/feature%23topic/example.txt",
    );
  });
  it("encodes an actual wiki filename instead of treating its hash as a browser fragment", async () => {
    const operations = repository.getOperations();
    await operations.setConfig("remote.origin.url", "https://github.com/controlled/owned.wiki.git");
    const wiki = path.join(directory, "Page#topic.md");
    fs.writeFileSync(wiki, "Wiki source\n");
    const value = await RepositoryFile.fromPath(wiki);
    expect(value.type).toBe("wiki");
    value.open();
    expect(browser).toHaveBeenCalledWith("https://github.com/controlled/owned/wiki/Page%23topic");
    await operations.stageFiles(["Page#topic.md"]);
    await operations.commit("Controlled wiki baseline");
    const committed = await RepositoryFile.fromPath(wiki);
    committed.history();
    expect(browser).toHaveBeenCalledWith(
      "https://github.com/controlled/owned/wiki/Page%23topic/_history",
    );
    committed.copyURL();
    expect(clipboard).toHaveBeenCalledWith(
      `https://github.com/controlled/owned/wiki/Page%23topic/${committed.headSha}`,
    );
  });
});
