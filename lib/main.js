const { Disposable } = require("lumine");
const RepositoryFile = require("./repository-file");
const getActivePath = require("./get-active-path");

// Every command here needs the path the dispatch was about, and every one of
// them wants a description: the labels name a GitHub page without saying which
// branch or lines it opens at. The description is a second argument rather than
// a wrapper of its own, so it stays beside the handler it belongs to.
function pathCommand(description, func) {
  return {
    description,
    didDispatch(e) {
      const itemPath = getActivePath(e.target);

      if (itemPath) {
        func(itemPath);
      }
    },
  };
}

function getSelectedRange() {
  const activePaneItem = lumine.workspace.getActivePaneItem();

  if (activePaneItem && typeof activePaneItem.getSelectedBufferRange === "function") {
    return activePaneItem.getSelectedBufferRange();
  }
}

// Resolving a RepositoryFile now loads its git data off the renderer thread, so
// the command handlers capture any selection range synchronously first, then act
// on the resolved file. A resolution failure surfaces as a warning instead of an
// unhandled rejection.
function runOnRepositoryFile(itemPath, action) {
  RepositoryFile.fromPath(itemPath).then(action, (error) => {
    lumine.notifications.addWarning("Unable to resolve the repository for this file", {
      detail: error.message,
      dismissable: true,
    });
  });
}

module.exports = {
  provideBackgroundTips() {
    return {
      packageName: "open-repository",
      tips: [
        "You can open the current file on its Git host's website with {{ 'open-repository:file' | keystroke }}",
        "You can read the blame of the current file on your Git host with {{ 'open-repository:blame' | keystroke }}",
      ],
    };
  },

  activate() {
    this.commandsSubscription = new Disposable();
    // lumine-pane does not match when focus rests on the workspace itself — right
    // after the last tab closes, say — and the application menu dispatches at
    // whatever holds focus. getActivePath already falls through the tree view,
    // the active tab, the active pane item and a lone project root, so the
    // workspace is the scope that matches what the commands actually read.
    this.commandsSubscription = lumine.commands.add("lumine-workspace", {
      "open-repository:file": pathCommand(
        "Open this file on the remote, at this branch and these lines.",
        (itemPath) => {
          const range = getSelectedRange();
          runOnRepositoryFile(itemPath, (file) => file.open(range));
        },
      ),

      "open-repository:file-on-master": pathCommand(
        "Open this file on the remote's default branch instead.",
        (itemPath) => {
          const range = getSelectedRange();
          runOnRepositoryFile(itemPath, (file) => file.openOnMaster(range));
        },
      ),

      "open-repository:blame": pathCommand(
        "Open the remote's blame view for the selected lines.",
        (itemPath) => {
          const range = getSelectedRange();
          runOnRepositoryFile(itemPath, (file) => file.blame(range));
        },
      ),

      "open-repository:history": pathCommand(
        "Open the remote's commit history for this file.",
        (itemPath) => {
          runOnRepositoryFile(itemPath, (file) => file.history());
        },
      ),

      "open-repository:issues": pathCommand(
        "Open the repository's issue list in a browser.",
        (itemPath) => {
          runOnRepositoryFile(itemPath, (file) => file.openIssues());
        },
      ),

      "open-repository:pull-requests": pathCommand(
        "Open the repository's pull requests in a browser.",
        (itemPath) => {
          runOnRepositoryFile(itemPath, (file) => file.openPullRequests());
        },
      ),

      "open-repository:copy-url": pathCommand(
        "Copy the remote URL of this file and its selected lines.",
        (itemPath) => {
          const range = getSelectedRange();
          runOnRepositoryFile(itemPath, (file) => file.copyURL(range));
        },
      ),

      "open-repository:branch-compare": pathCommand(
        "Open the remote's comparison of this branch with the default.",
        (itemPath) => {
          runOnRepositoryFile(itemPath, (file) => file.openBranchCompare());
        },
      ),

      "open-repository:repository": pathCommand(
        "Open this project's repository page in a browser.",
        (itemPath) => {
          runOnRepositoryFile(itemPath, (file) => file.openRepository());
        },
      ),
    });
  },

  deactivate() {
    this.commandsSubscription.dispose();
  },
};
