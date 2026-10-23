import UIKit
import Capacitor

// iOS 27 stops apps built with its SDK at launch unless they use the scene
// lifecycle, so the window lives here instead of in AppDelegate. The scene
// configuration in Info.plist names the Main storyboard, which builds the
// Capacitor bridge view controller and its window. Link opens (blockcast://
// and universal links) now reach the scene, not the app delegate, so they are
// handed to Capacitor here and the App plugin still sees them.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        // A cold launch from a link delivers it with the connection, not
        // through openURLContexts; Capacitor keeps it for App.getLaunchUrl().
        if let url = connectionOptions.urlContexts.first?.url {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
        }
        if let activity = connectionOptions.userActivities.first {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: [:])
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}
