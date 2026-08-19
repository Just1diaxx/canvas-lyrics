import { ProjectVersion } from "../../project/config";
import { toast } from "sonner";

let WarningInFlight = false;

async function checkForUpdates() {
  if (Spicetify?.LocalStorage?.get("canvas_lyrics_backup_version") === ProjectVersion) {
    toast(
      <div>
        <div style={{ fontSize: "0.9575rem", fontWeight: 600, lineHeight: 1.3 }}>
          Update completed!
        </div>
        <div style={{ fontSize: "0.82rem", opacity: 0.65, marginTop: "2px" }}>
          Canvas lyrics has been updated successfully
        </div>
      </div>,
      {
        duration: 5000,
        closeButton: true,
        position: "bottom-right",
      }
    );
    Spicetify.LocalStorage.remove("canvas_lyrics_backup_version");
    return;
  }

  const remoteVersion = await fetch("https://api.github.com/repos/Just1diaxx/canvas-lyrics/releases/latest")
    .then(res => res.json())
    .then(res => res.tag_name);

  if (ProjectVersion !== remoteVersion) presentUpdateAvailable(remoteVersion);
}

function presentUpdateAvailable(latestVersion: any) {
  let viewClicked = false;

  toast(
    <div>
      <div style={{ fontSize: "0.9575rem", fontWeight: 600, lineHeight: 1.3 }}>
        A new update for Canvas lyrics {`(${latestVersion})`} is available
      </div>
      <div style={{ fontSize: "0.82rem", opacity: 0.65, marginTop: "2px" }}>
        New features and fixes.
      </div>
    </div>,
    {
      duration: Infinity,
      closeButton: true,
      action: {
        label: "Update now",
        onClick: () => {
          viewClicked = true;
          startUpdate();
        },
      },
      position: "bottom-right",
      onDismiss: () => {
        if (!viewClicked) showUpdateDismissWarning();
      },
    }
  );
}

function showUpdateDismissWarning() {
  if (WarningInFlight) return;
  WarningInFlight = true;
  toast.warning(
    <div>
      <div style={{ fontSize: "0.9575rem", fontWeight: 600, lineHeight: 1.3 }}>
        Continuing without updating?
      </div>
      <div style={{ fontSize: "0.82rem", opacity: 0.75, marginTop: "2px", lineHeight: 1.4 }}>
        Some lyrics sources and features are only available on the latest version.
      </div>
    </div>,
    {
      duration: 9000,
      action: {
        label: "Update now",
        onClick: () => startUpdate(),
      },
      position: "bottom-right",
      onDismiss: () => { WarningInFlight = false; },
      onAutoClose: () => { WarningInFlight = false; },
    }
  );
}

async function startUpdate() {
  Spicetify.LocalStorage.set("canvas_lyrics_backup_version", ProjectVersion);
  window.location.reload();
}

export { checkForUpdates, presentUpdateAvailable };