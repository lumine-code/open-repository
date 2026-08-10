const path = require("path");
const getActivePath = require("../lib/get-active-path");


const projectPath = path.resolve(__dirname, "./fixtures/project/");
const file1 = path.resolve(__dirname, "./fixtures/project/file1.txt");
const file2 = path.resolve(__dirname, "./fixtures/project/file2.txt");
const img1 = path.resolve(__dirname, "./fixtures/project/img1.png");

describe("getActivePath", function () {
  let workspaceElement;
  beforeEach(async function () {
    workspaceElement = lumine.views.getView(lumine.workspace);
    await lumine.packages.activatePackage("tabs");
    await lumine.packages.activatePackage("tree-view");
    lumine.project.setPaths([projectPath]);
  });

  it("returns project path when no target", function () {
    const itemPath = getActivePath();
    expect(itemPath).toBe(projectPath);
  });

  it("returns project path when nothing open", function () {
    const itemPath = getActivePath(workspaceElement);
    expect(itemPath).toBe(projectPath);
  });

  it("returns active file path when workspace is selected", async function () {
    await lumine.workspace.open(file1);
    await lumine.workspace.open(file2);

    const itemPath = getActivePath(workspaceElement);
    expect(itemPath).toBe(file2);
  });

  // Driven against the shape `getActivePath` actually reads rather than a live
  // tree view: the rows are virtualized, so a real one renders no entry at all
  // unless it is in the document with a height, and none of that is this
  // function's contract. What is its contract is the `.entry.selected` element
  // inside a `.tree-view`, carrying the `getPath` that tree-row-view.js puts on
  // every row.
  it("returns the selected entry's path when called from the tree view", () => {
    const treeView = document.createElement("div");
    treeView.classList.add("tree-view");

    const unselected = document.createElement("li");
    unselected.classList.add("entry");
    unselected.getPath = () => file2;

    const selected = document.createElement("li");
    selected.classList.add("entry", "selected");
    selected.getPath = () => file1;

    treeView.append(unselected, selected);

    expect(getActivePath(selected)).toBe(file1);
  });

  it("ignores a selected special-root header, which has no real directory", () => {
    const treeView = document.createElement("div");
    treeView.classList.add("tree-view");

    const specialRoot = document.createElement("li");
    specialRoot.classList.add("entry", "selected", "tree-view-special-root");
    specialRoot.getPath = () => "special-root://recent";

    treeView.append(specialRoot);

    expect(getActivePath(specialRoot)).toBeUndefined();
  });

  it("returns file path when tab is selected", async function () {
    await lumine.workspace.open(file1);
    await lumine.workspace.open(file2);
    const file1Target = workspaceElement.querySelector(".tab-bar [data-name='file1.txt']");

    const itemPath = getActivePath(file1Target);
    expect(itemPath).toBe(file1);
  });

  it("returns project when active pane is not a file", async function () {
    await lumine.packages.activatePackage("settings-view");
    await lumine.workspace.open(file1);
    await lumine.workspace.open("lumine://config");

    const itemPath = getActivePath(workspaceElement);
    expect(itemPath).toBe(projectPath);
  });

  // A stand-in for any non-editor pane item that knows its path — image-editor
  // is the real one, but it is not bundled, so activating it here would only
  // test whether this checkout happens to have it installed.
  it("returns active pane path when it is not a text file", async function () {
    await lumine.workspace.open(file1);
    await lumine.workspace.getActivePane().activateItem({
      element: document.createElement("div"),
      getTitle: () => "img1.png",
      getPath: () => img1,
    });

    const itemPath = getActivePath(workspaceElement);
    expect(itemPath).toBe(img1);
  });
});
