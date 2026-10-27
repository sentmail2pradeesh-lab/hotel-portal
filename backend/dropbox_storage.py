import os

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
    """Upload bytes to hotel-booking/<folder>/<filename> and return the Dropbox path.

    The name is set by the caller (ID or guest name), so a file with the same name is replaced.
    """
    path = f"{APP_FOLDER_PREFIX}/{folder}/{filename}"
    _client().files_upload(data, path, mode=WriteMode.overwrite)
    return path


def download_file(path: str) -> bytes:
    """Return the raw bytes of a stored file."""
    _, response = _client().files_download(path)
    return response.content
