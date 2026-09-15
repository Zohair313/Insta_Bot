import os
import re
import json
import getpass
from typing import List, Dict, Any

try:
    from instagrapi import Client
    from instagrapi.exceptions import (
        BadPassword,
        ChallengeRequired,
        TwoFactorRequired,
        LoginRequired,
    )
except ImportError:
    print("Error: 'instagrapi' package is not installed.")
    print("Please install it using: pip install instagrapi")
    exit(1)

SESSION_FILE = "session.json"


def handle_challenge_code(username: str, choice: str) -> str:
    """Prompt user for 2FA or Challenge security code."""
    print(f"\n[!] Security verification required for @{username}")
    code = input(f"Enter the verification code sent to your {choice}: ").strip()
    return code


def login_user(username: str = None, password: str = None) -> Client:
    """
    Logs in to Instagram using instagrapi.
    Uses session caching (session.json) to avoid triggering checkpoints repeatedly.
    """
    cl = Client()
    
    # 1. Try loading saved session first
    session_loaded = False
    if os.path.exists(SESSION_FILE):
        print(f"[*] Found existing session file '{SESSION_FILE}'. Attempting session reuse...")
        try:
            cl.load_settings(SESSION_FILE)
            # Test session validity
            if username and password:
                cl.login(username, password)
            else:
                cl.get_timeline_feed()  # Simple request to verify session
            print("[+] Session loaded successfully! Logged in without password prompt.")
            session_loaded = True
        except Exception as e:
            print(f"[-] Saved session invalid or expired: {e}")
            print("[*] Proceeding with fresh login...")

    # 2. Fresh login if session loading was not successful
    if not session_loaded:
        if not username:
            username = input("Enter Instagram Username: ").strip()
        if not password:
            password = getpass.getpass("Enter Instagram Password: ").strip()

        cl.challenge_code_handler = handle_challenge_code

        try:
            print(f"[*] Logging in as @{username}...")
            cl.login(username, password)
            print("[+] Login successful!")
            
            # Save session for future runs
            cl.dump_settings(SESSION_FILE)
            print(f"[+] Saved session cookies to '{SESSION_FILE}'.")
            
        except TwoFactorRequired:
            print("\n[!] Two-Factor Authentication (2FA) required.")
            code = input("Enter 2FA Code: ").strip()
            cl.login(username, password, verification_code=code)
            cl.dump_settings(SESSION_FILE)
            print(f"[+] 2FA Login successful! Saved session to '{SESSION_FILE}'.")
            
        except ChallengeRequired:
            print("\n[!] Challenge / Verification required by Instagram.")
            cl.dump_settings(SESSION_FILE)
            print(f"[+] Challenge resolved! Saved session to '{SESSION_FILE}'.")

        except BadPassword:
            print("[-] Incorrect password. Please check credentials and try again.")
            exit(1)
        except Exception as e:
            print(f"[-] Login failed: {e}")
            exit(1)

    return cl


def fetch_saved_medias(cl: Client, amount: int = 100) -> List[Any]:
    """
    Fetches ONLY saved posts / reels belonging to the logged-in user.
    """
    print(f"[*] Fetching up to {amount} saved posts/reels from your saved collection...")
    try:
        saved_items = cl.saved_medias(amount=amount)
        print(f"[+] Retrieved {len(saved_items)} saved items.")
        return saved_items
    except Exception as e:
        print(f"[-] Error fetching saved items: {e}")
        return []


def extract_media_info(media: Any) -> Dict[str, Any]:
    """
    Extracts text features (caption, tags, audio name) and URL from a Media object.
    """
    # Shortcode & URL construction
    code = getattr(media, "code", "")
    product_type = getattr(media, "product_type", "")  # 'clips' for Reels

    url = f"https://www.instagram.com/reel/{code}/" if product_type == "clips" else f"https://www.instagram.com/p/{code}/"

    # Caption
    caption = getattr(media, "caption_text", "") or ""

    # Tags / Hashtags
    hashtags = re.findall(r"#(\w+)", caption)
    user_tags = []
    if hasattr(media, "usertags") and media.usertags:
        user_tags = [tag.user.username for tag in media.usertags if hasattr(tag, "user")]

    # Audio / Music Information
    audio_info = []
    
    # Check clips_metadata for audio details
    clips_metadata = getattr(media, "clips_metadata", None)
    if isinstance(clips_metadata, dict):
        music_info = clips_metadata.get("music_info", {})
        original_sound = clips_metadata.get("original_sound_info", {})
        
        if music_info and isinstance(music_info, dict):
            title = music_info.get("music_asset_info", {}).get("title", "")
            artist = music_info.get("music_asset_info", {}).get("display_artist", "")
            if title or artist:
                audio_info.append(f"{title} - {artist}".strip(" -"))
                
        if original_sound and isinstance(original_sound, dict):
            audio_title = original_sound.get("original_audio_title", "")
            ig_artist = original_sound.get("ig_artist", {}).get("username", "")
            if audio_title or ig_artist:
                audio_info.append(f"{audio_title} - {ig_artist}".strip(" -"))

    audio_name = " | ".join(audio_info)

    return {
        "id": getattr(media, "pk", ""),
        "code": code,
        "url": url,
        "caption": caption,
        "tags": list(set(hashtags + user_tags)),
        "audio_name": audio_name,
        "product_type": product_type
    }


def search_saved_items(items: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
    """
    Filters saved items strictly by matching query against caption, tags, or audio name.
    """
    keywords = [k.lower().strip() for k in query.split() if k.strip()]
    matches = []

    for item in items:
        searchable_text = f"{item['caption']} {' '.join(item['tags'])} {item['audio_name']}".lower()

        # Match if all query keywords are present in caption, tags, or audio
        if all(kw in searchable_text for kw in keywords):
            matches.append(item)

    return matches


def main():
    print("=" * 60)
    print("  Instagram Saved Posts & Reels Search Utility")
    print("=" * 60)
    
    # 1. Login
    cl = login_user()

    # 2. Fetch saved items strictly from authenticated user's saves
    saved_medias = fetch_saved_medias(cl, amount=200)

    if not saved_medias:
        print("[-] No saved items found or unable to fetch saves.")
        return

    # Process items into structured format
    processed_items = [extract_media_info(m) for m in saved_medias]

    # Save to saved_reels.json for chatbot backend compatibility
    try:
        with open("saved_reels.json", "w", encoding="utf-8") as f:
            json.dump(processed_items, f, indent=2, ensure_ascii=False)
        print(f"[+] Exported {len(processed_items)} items to 'saved_reels.json'.")
    except Exception as e:
        print(f"[-] Could not export saved_reels.json: {e}")

    # 3. Interactive Search Loop
    print("\n" + "=" * 60)
    print("Search through your saved Instagram Reels and Posts!")
    print("Type 'exit' or 'quit' to stop.")
    print("=" * 60)

    while True:
        query = input("\nEnter search query (keywords/description): ").strip()
        if not query:
            continue
        if query.lower() in ("exit", "quit"):
            print("Exiting search. Goodbye!")
            break

        results = search_saved_items(processed_items, query)

        print(f"\n[+] Found {len(results)} matching saved item(s) for '{query}':\n")
        for idx, res in enumerate(results, 1):
            print(f"--- Result #{idx} ---")
            print(f"URL       : {res['url']}")
            print(f"Type      : {'Reel' if res['product_type'] == 'clips' else 'Post'}")
            print(f"Audio     : {res['audio_name'] or 'N/A'}")
            print(f"Tags      : {', '.join(res['tags']) if res['tags'] else 'None'}")
            print(f"Caption   : {res['caption'][:150]}..." if len(res['caption']) > 150 else f"Caption   : {res['caption']}")
            print()


if __name__ == "__main__":
    main()
