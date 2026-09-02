const RepositoryFile = require("../lib/repository-file");

describe("RepositoryFile config loading", () => {
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
    file.repo = {
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
