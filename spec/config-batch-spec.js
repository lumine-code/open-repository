const RepositoryFile = require("../lib/repository-file");

describe("RepositoryFile config loading", () => {
  it("awaits asynchronous repository resolution before loading Git data", async () => {
    let resolveRepository;
    const repositoryPromise = new Promise((resolve) => {
      resolveRepository = resolve;
    });
    const ensureRefsSnapshot = jasmine
      .createSpy("ensureRefsSnapshot")
      .and.resolveTo({ head: null, remotes: [] });
    const repo = {
      ensureRefsSnapshot,
      getConfigValuesAsync: () => Promise.resolve({}),
    };
    const resolveForPath = spyOn(lumine.repositories, "resolveForPath").and.returnValue(
      repositoryPromise,
    );

    const filePromise = RepositoryFile.fromPath("/repo/file.txt");

    expect(ensureRefsSnapshot).not.toHaveBeenCalled();
    resolveRepository(repo);

    const file = await filePromise;
    expect(resolveForPath).toHaveBeenCalledWith("/repo/file.txt");
    expect(ensureRefsSnapshot).toHaveBeenCalledTimes(1);
    expect(file.repo).toBe(repo);
  });

  it("does not discover a repository in the constructor", () => {
    const file = new RepositoryFile("/repo/file.txt");

    expect(file.repo).toBeNull();
  });

  it("loads related Git config values in batches", async () => {
    const file = new RepositoryFile("/repo/file.txt");
    const getConfigValuesAsync = jasmine.createSpy("getConfigValuesAsync").and.callFake((keys) =>
      Promise.resolve(
        Object.fromEntries(
          keys.map((key) => {
            const values = {
              "lumine.open-repository.remote": "upstream",
              "branch.main.remote": "origin",
              "branch.main.merge": "refs/heads/main",
            };
            return [key, values[key] ?? null];
          }),
        ),
      ),
    );
    const repo = {
      ensureRefsSnapshot: () =>
        Promise.resolve({
          head: { name: "main", oid: "a".repeat(40), detached: false },
          remotes: [
            {
              name: "upstream",
              fetchUrl: "https://github.com/owner/repo.git",
              pushUrl: "https://github.com/owner/repo.git",
            },
          ],
        }),
      getConfigValuesAsync,
    };
    spyOn(lumine.repositories, "resolveForPath").and.resolveTo(repo);

    await file.load();

    expect(getConfigValuesAsync).toHaveBeenCalledTimes(1);
    expect(getConfigValuesAsync).toHaveBeenCalledWith([
      "lumine.open-repository.provider",
      "lumine.open-repository.remote",
      "lumine.open-repository.branch",
      "branch.main.remote",
      "branch.main.merge",
    ]);
    expect(file.gitURL()).toBe("https://github.com/owner/repo.git");
  });
});
