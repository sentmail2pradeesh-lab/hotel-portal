import os
import uuid

import dropbox
from dropbox.files import WriteMode

APP_FOLDER_PREFIX = "/hotel-booking"


def _client():
    app_key = os.getenv("DROPBOX_APP_KEY")
    app_secret = os.getenv("DROPBOX_APP_SECRET")
    refresh_token = os.getenv("DROPBOX_REFRESH_TOKEN")
    if not (app_key and app_secret and refresh_token):
        raise RuntimeError("Dropbox env vars are missing (DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN)")
    return dropbox.Dropbox(
        app_key=app_key,
        app_secret=app_secret,
        oauth2_refresh_token=refresh_token,
    )


def upload_file(data: bytes, folder: str, filename: str) -> str:
    """Upload bytes under the app folder and return the Dropbox path.

    A random prefix keeps two uploads with the same name from overwriting each other.
    """
    path = f"{APP_FOLDER_PREFIX}/{folder}/{uuid.uuid4().hex[:8]}_{filename}"
    _client().files_upload(data, path, mode=WriteMode.add)
    return path


def download_file(path: str) -> bytes:
    """Return the raw bytes of a stored file."""
    _, response = _client().files_download(path)
    return response.content
