"""
forum_store.py — JSON-file backed storage for community forum posts & replies.
All data lives in storage/forum.json so it survives backend restarts.
"""
import json
import uuid
import os
from datetime import datetime, timezone
from threading import Lock

FORUM_PATH = os.getenv("FORUM_PATH", "storage/forum.json")
_lock = Lock()


def _load() -> dict:
    os.makedirs(os.path.dirname(FORUM_PATH), exist_ok=True)
    if not os.path.exists(FORUM_PATH):
        return {"posts": []}
    try:
        with open(FORUM_PATH, "r") as f:
            return json.load(f)
    except Exception:
        return {"posts": []}


def _save(data: dict):
    os.makedirs(os.path.dirname(FORUM_PATH), exist_ok=True)
    with open(FORUM_PATH, "w") as f:
        json.dump(data, f, indent=2, default=str)


def get_posts() -> list:
    with _lock:
        return _load()["posts"]


def create_post(author: str, title: str, content: str, tag: str) -> dict:
    post = {
        "id": str(uuid.uuid4()),
        "author": author.strip() or "Anonymous",
        "title": title.strip(),
        "content": content.strip(),
        "tag": tag.strip() or "General",
        "likes": 0,
        "liked_by": [],
        "replies": [],
        "created_at": datetime.now(tz=timezone.utc).isoformat(),
    }
    with _lock:
        data = _load()
        data["posts"].insert(0, post)  # newest first
        _save(data)
    return post


def add_reply(post_id: str, author: str, content: str) -> dict | None:
    reply = {
        "id": str(uuid.uuid4()),
        "author": author.strip() or "Anonymous",
        "content": content.strip(),
        "created_at": datetime.now(tz=timezone.utc).isoformat(),
    }
    with _lock:
        data = _load()
        for post in data["posts"]:
            if post["id"] == post_id:
                post["replies"].append(reply)
                _save(data)
                return reply
    return None


def toggle_like(post_id: str, user_token: str) -> dict | None:
    """Toggle like for a post. user_token is a client-generated UUID stored in localStorage."""
    with _lock:
        data = _load()
        for post in data["posts"]:
            if post["id"] == post_id:
                if user_token in post["liked_by"]:
                    post["liked_by"].remove(user_token)
                    post["likes"] = max(0, post["likes"] - 1)
                    liked = False
                else:
                    post["liked_by"].append(user_token)
                    post["likes"] += 1
                    liked = True
                _save(data)
                return {"likes": post["likes"], "liked": liked}
    return None
