describe("Open Repository application menu context", () => {
  beforeEach(async () => {
    jasmine.attachToDOM(lumine.workspace.getElement());
    await lumine.packages.activatePackage("open-repository");
    spyOn(lumine.notifications, "addWarning");
    spyOn(lumine.project, "getPaths").and.returnValue([]);
    spyOn(lumine.workspace, "getActiveTextEditor").and.returnValue(null);
  });

  afterEach(async () => {
    if (jasmine.isSpy(lumine.repositories.getForPath))
      lumine.repositories.getForPath.and.callThrough();
    await lumine.packages.deactivatePackage("open-repository");
  });

  it("disables repository actions when an unsaved item has no repository path", () => {
    spyOn(lumine.workspace, "getActivePaneItem").and.returnValue({ getPath: () => undefined });
    lumine.commands.dispatch(lumine.workspace.getElement(), "open-repository:repository");
    expect(
      lumine.commands.canDispatch(lumine.workspace.getElement(), "open-repository:repository"),
    ).toBe(false);
    expect(lumine.notifications.addWarning).not.toHaveBeenCalled();
  });

  it("stays quiet when there is no item or project", () => {
    spyOn(lumine.workspace, "getActivePaneItem").and.returnValue(null);
    lumine.commands.dispatch(lumine.workspace.getElement(), "open-repository:repository");
    expect(lumine.notifications.addWarning).not.toHaveBeenCalled();
  });

  it("requires a known repository and respects an initialized remote cache", async () => {
    const editor = await lumine.workspace.open(__filename);
    const refs = { initialized: true, remotes: [] };
    const repository = { isDestroyed: () => false, getRefsSnapshot: () => refs };
    const getForPath = spyOn(lumine.repositories, "getForPath").and.returnValue(null);
    const target = editor.getElement();
    expect(lumine.commands.canDispatch(target, "open-repository:file")).toBe(false);
    getForPath.and.returnValue(repository);
    expect(lumine.commands.canDispatch(target, "open-repository:file")).toBe(false);
    refs.remotes.push({ name: "origin" });
    expect(lumine.commands.canDispatch(target, "open-repository:file")).toBe(true);
    refs.initialized = false;
    refs.remotes = [];
    expect(lumine.commands.canDispatch(target, "open-repository:file")).toBe(true);
  });
});
