//! Where a file asked for from outside goes when the setting says each
//! document gets a window. Kept free of Tauri so the rule is a unit test.

use std::collections::HashMap;

pub(super) type Session = HashMap<String, Vec<String>>;

/// A path as the app compares it: one separator, `.` and `..` resolved, and
/// lowercase where the filesystem ignores case. Not `canonicalize`, which on
/// Windows adds a `\\?\` prefix only for paths that exist - a file that has
/// since gone would then compare unequal to the same path a window reported.
fn path_key(path: &str) -> String {
    use std::path::{Component, Path};
    let mut parts: Vec<String> = Vec::new();
    let mut prefix = String::new();
    let mut absolute = false;
    for part in Path::new(path).components() {
        match part {
            Component::Prefix(p) => prefix = p.as_os_str().to_string_lossy().into_owned(),
            Component::RootDir => {
                absolute = true;
                parts.clear();
            }
            Component::CurDir => {}
            Component::ParentDir => {
                let _ = parts.pop();
            }
            Component::Normal(s) => parts.push(s.to_string_lossy().into_owned()),
        }
    }
    let joined = parts.join("/");
    let key = if !prefix.is_empty() {
        format!("{prefix}/{joined}")
    } else if absolute {
        format!("/{joined}")
    } else {
        joined
    };
    #[cfg(windows)]
    {
        key.to_lowercase()
    }
    #[cfg(not(windows))]
    {
        key
    }
}

/// Which window already has this path, and the exact spelling that window
/// reported. The frontend matches `tab.path === path` strictly, so the event
/// must carry the reported string rather than the caller's.
fn find_open_path(session: &Session, key: &str) -> Option<(String, String)> {
    let mut labels: Vec<&String> = session.keys().collect();
    labels.sort_by_key(|label| (label.as_str() != "main", label.as_str()));
    labels.into_iter().find_map(|label| {
        session[label]
            .iter()
            .find(|path| path_key(path) == key)
            .map(|path| (label.clone(), path.clone()))
    })
}

#[derive(Debug, PartialEq, Eq)]
pub(super) enum OpenRoute {
    Focus { label: String, path: String },
    Skip,
    NewWindow(String),
}

/// Where a file asked for from outside goes in window mode.
pub(super) fn route_open_path(
    path: &str,
    session: &Session,
    in_flight: &[String],
    claimed: &[String],
) -> OpenRoute {
    let key = path_key(path);
    // A window is already mounting for this path, or this batch already asked
    // for it: neither has reported its tabs yet, so the registry cannot see
    // them. One window is enough.
    if in_flight
        .iter()
        .chain(claimed)
        .any(|queued| path_key(queued) == key)
    {
        return OpenRoute::Skip;
    }
    if let Some((label, registered)) = find_open_path(session, &key) {
        return OpenRoute::Focus {
            label,
            path: registered,
        };
    }
    OpenRoute::NewWindow(path.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn session(entries: &[(&str, &[&str])]) -> Session {
        entries
            .iter()
            .map(|(label, paths)| {
                (
                    (*label).to_string(),
                    paths.iter().map(|p| (*p).to_string()).collect(),
                )
            })
            .collect()
    }

    const DOC: &str = "/notes/one.md";

    #[test]
    fn a_path_open_elsewhere_is_focused_instead_of_opening_a_window() {
        let route = route_open_path(DOC, &session(&[("window-2", &[DOC])]), &[], &[]);
        assert_eq!(
            route,
            OpenRoute::Focus {
                label: "window-2".into(),
                path: DOC.into(),
            }
        );
    }

    #[test]
    fn the_event_carries_the_spelling_the_window_reported() {
        // The caller names the same file differently; the frontend's strict
        // `tab.path === path` would not match the caller's spelling.
        let reported = "/notes/one.md";
        let asked = "/notes/./one.md";
        let route = route_open_path(asked, &session(&[("main", &[reported])]), &[], &[]);
        assert_eq!(
            route,
            OpenRoute::Focus {
                label: "main".into(),
                path: reported.into(),
            }
        );
    }

    #[cfg(windows)]
    #[test]
    fn windows_case_and_separators_compare_equal() {
        let route = route_open_path(
            r"c:/notes/one.md",
            &session(&[("main", &[r"C:\Notes\One.md"])]),
            &[],
            &[],
        );
        assert!(matches!(route, OpenRoute::Focus { .. }));
    }

    #[test]
    fn a_path_not_open_anywhere_gets_a_window() {
        let route = route_open_path("/notes/two.md", &session(&[("main", &[DOC])]), &[], &[]);
        assert_eq!(route, OpenRoute::NewWindow("/notes/two.md".into()));
    }

    #[test]
    fn a_window_still_mounting_counts_as_open() {
        let route = route_open_path(DOC, &Session::new(), &[DOC.into()], &[]);
        assert_eq!(route, OpenRoute::Skip);
    }

    #[test]
    fn the_same_path_twice_in_one_batch_opens_once() {
        let mut claimed = Vec::new();
        let mut skipped = 0;
        for path in [DOC, DOC] {
            match route_open_path(path, &Session::new(), &[], &claimed) {
                OpenRoute::NewWindow(p) => claimed.push(p),
                OpenRoute::Skip => skipped += 1,
                other => panic!("unexpected route: {other:?}"),
            }
        }
        assert_eq!(claimed, vec![DOC.to_string()]);
        assert_eq!(skipped, 1);
    }

    #[test]
    fn a_batch_does_not_lose_other_paths() {
        let mut claimed = Vec::new();
        for path in [DOC, DOC, "/notes/two.md"] {
            if let OpenRoute::NewWindow(p) = route_open_path(path, &Session::new(), &[], &claimed) {
                claimed.push(p);
            }
        }
        assert_eq!(claimed, vec![DOC.to_string(), "/notes/two.md".to_string()]);
    }

    #[test]
    fn the_main_window_wins_when_an_old_duplicate_exists() {
        // Duplicates from before this rule should focus one, deterministically.
        let route = route_open_path(
            DOC,
            &session(&[("window-7", &[DOC]), ("main", &[DOC])]),
            &[],
            &[],
        );
        assert_eq!(
            route,
            OpenRoute::Focus {
                label: "main".into(),
                path: DOC.into(),
            }
        );
    }

    #[test]
    fn different_paths_do_not_collide() {
        assert_ne!(path_key("/notes/one.md"), path_key("/notes/one-two.md"));
        assert_eq!(path_key("/notes/./one.md"), path_key("/notes/one.md"));
        assert_eq!(path_key("/notes/tmp/../one.md"), path_key("/notes/one.md"));
    }
}
