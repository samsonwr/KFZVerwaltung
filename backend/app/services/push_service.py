import json
from typing import TYPE_CHECKING

try:
    from pywebpush import webpush, WebPushException
    WEBPUSH_AVAILABLE = True
except ImportError:
    WEBPUSH_AVAILABLE = False

if TYPE_CHECKING:
    from app.models.push_subscription import PushSubscription
    from app.config import Settings


def send_push_notification(subscription: "PushSubscription", message: str, settings: "Settings") -> bool:
    """
    Send a push notification to a single subscription.
    Returns True on success, False on failure.
    """
    if not WEBPUSH_AVAILABLE:
        print("pywebpush not available, skipping push notification")
        return False

    if not settings.vapid_private_key:
        print("VAPID private key not configured, skipping push notification")
        return False

    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.keys_p256dh,
                    "auth": subscription.keys_auth,
                },
            },
            data=json.dumps({"title": "KFZ Wartung", "body": message}),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": f"mailto:{settings.vapid_admin_email}"},
        )
        return True
    except WebPushException as e:
        print(f"Push failed: {e}")
        return False
    except Exception as e:
        print(f"Unexpected push error: {e}")
        return False


def send_push_to_all(db, message: str, settings: "Settings") -> int:
    """
    Send a push notification to all subscriptions.
    Returns count of successful sends.
    """
    from app.models.push_subscription import PushSubscription

    subscriptions = db.query(PushSubscription).all()
    success_count = 0

    for sub in subscriptions:
        if send_push_notification(sub, message, settings):
            success_count += 1

    return success_count
