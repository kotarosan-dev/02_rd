import os
import time
import webbrowser
import requests
from dotenv import load_dotenv
from runwayml import RunwayML

def download_video(url, save_path):
    """動画ファイルを指定されたURLからダウンロードして保存する"""
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=1024):
                if chunk:
                    f.write(chunk)
        print(f"ビデオが {save_path} に保存されました。")
    except requests.exceptions.RequestException as e:
        print(f"ビデオのダウンロードに失敗しました: {e}")

def open_video_in_browser(url):
    """ビデオURLをブラウザで開く"""
    try:
        webbrowser.open(url)
        print(f"ブラウザでビデオを開きます: {url}")
    except Exception as e:
        print(f"ブラウザを開く際にエラーが発生しました: {e}")

def main():
    # .env ファイルをロード
    load_dotenv(dotenv_path=".env")

    api_key = os.environ.get("RUNWAYML_API_SECRET")
    if not api_key:
        print("RUNWAYML_API_SECRET 環境変数が設定されていません。")
        return

    # RunwayML APIクライアントを作成
    client = RunwayML(api_key=api_key)

    # 動画生成タスクを作成
    try:
        image_to_video = client.image_to_video.create(
            model="gen3a_turbo",
            prompt_image="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiUsDm-cMfSFPHGrWKxyp_SCUa0GqVHC0ZddV7AyWbpiRRMh6D3-9EqIJ0JjiC35HP3hgkbMRKZqd55jpKmjf6PlXOuQpkm6VsKRb6TADlk17f4jdejrBAndjB3vCSg_lIWZhheIUiyZn795yWQssryNfahuwRxNRtiM4zPECF_xz1WilPPqnZjacgEfmd4/s658/ai_character05_idea.png",
            prompt_text="The bunny is eating a carrot",
        )
        task_id = image_to_video.id
        print(f"タスクID: {task_id}")
    except Exception as e:
        print(f"タスクの作成に失敗しました: {e}")
        return

    # タスクの結果を確認
    output = None
    while output is None:
        try:
            # タスクのステータスを確認する
            task_status = client.tasks.retrieve(task_id)
            print(f"タスクのステータス: {task_status.status}")
            if task_status.status == "SUCCEEDED":
                output = task_status.output
            elif task_status.status == "FAILED":
                print("タスクが失敗しました。")
                return
            else:
                print("タスクがまだ完了していません。5秒後に再確認します。")
                time.sleep(5)  # 5秒待機して再確認
        except Exception as e:
            print(f"タスクの取得に失敗しました: {e}")
            return

    # 出力URLを取得してブラウザで開くか、ファイルを保存
    if output:
        video_url = output[0]  # 最初のURLを取得
        print(f"生成されたビデオのURL: {video_url}")

        # ブラウザでビデオを開く
        open_video_in_browser(video_url)

        # またはローカルに保存したい場合は、以下のコメントを外してください。
        # save_path = "generated_video.mp4"
        # download_video(video_url, save_path)
    else:
        print("出力が見つかりませんでした。")

if __name__ == "__main__":
    main()
