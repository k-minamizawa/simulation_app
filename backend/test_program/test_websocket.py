import asyncio
import websockets
import requests
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

async def test_websocket_and_broadcast():
    print("=== WebSocket & Broadcast Test ===\n")

    uri = "ws://localhost:8000/ws/results"

    try:
        print(f"1. WebSocketに接続中: {uri}")
        async with websockets.connect(uri) as websocket:
            print("[OK] WebSocket接続成功\n")

            print("2. 完了通知APIを呼び出し中...")
            response = requests.post("http://localhost:8000/api/notify-completion")
            print(f"[OK] API応答: {response.json()}\n")

            print("3. WebSocketからのメッセージ受信を待機中...")
            message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            print(f"[OK] メッセージ受信成功！\n")

            print("受信したデータ:")
            data = json.loads(message)
            print(json.dumps(data, indent=2, ensure_ascii=False))

            print("\n=== テスト成功 ===")

    except asyncio.TimeoutError:
        print("[ERROR] タイムアウト: メッセージが受信できませんでした")
    except websockets.exceptions.WebSocketException as e:
        print(f"[ERROR] WebSocketエラー: {e}")
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] HTTPリクエストエラー: {e}")
    except Exception as e:
        print(f"[ERROR] 予期しないエラー: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket_and_broadcast())