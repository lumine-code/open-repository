describe("Open Repository application menu context", () => {
  beforeEach(async () => {
    await lumine.packages.activatePackage("open-repository");
    spyOn(lumine.notifications, "addWarning");
    spyOn(lumine.project, "getPaths").and.returnValue([]);
    spyOn(lumine.workspace, "getActiveTextEditor").and.returnValue(null);
  });

  afterEach(async () => {
    await lumine.packages.deactivatePackage("open-repository");
  });

  it("explains why an unsaved item has no repository path", () => {
    spyOn(lumine.workspace, "getActivePaneItem").and.returnValue({ getPath: () => undefined });
    lumine.commands.dispatch(lumine.workspace.getElement(), "open-repository:repository");
    expect(lumine.notifications.addWarning).toHaveBeenCalledOnceWith(
      "Open a saved file or select a repository folder first.",
    );
  });

  it("stays quiet when there is no item or project", () => {
    spyOn(lumine.workspace, "getActivePaneItem").and.returnValue(null);
    lumine.commands.dispatch(lumine.workspace.getElement(), "open-repository:repository");
    expect(lumine.notifications.addWarning).not.toHaveBeenCalled();
  });
});
