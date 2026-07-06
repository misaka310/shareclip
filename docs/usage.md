# ShareClip の使い方

## 起動

```bash
npm run dev
```

起動前に、次のファイルへOCI情報を入れておきます。

```text
config/shareclip.config.local.json
```

このファイルはGitに入れません。

## アップロード手順

1. 左側の `Upload` を開く
2. 期限を `1 day` / `3 days` / `7 days` から選ぶ
3. ファイルをドラッグ&ドロップする、または `Choose file` を押す
4. `Upload and copy link` を押す
5. アップロードが成功すると、署名付きURLがクリップボードへコピーされる
6. `Latest link copied to clipboard` に最後にコピーしたリンクのプレビューが出る

画面上のURLプレビューは一部マスクされます。実際にコピーされるURLはフルURLです。

## ダウンロード確認

1. ブラウザのシークレットウィンドウを開く
2. コピーされたURLを貼る
3. ファイルがダウンロードできればOK

## 履歴の使い方

1. 左側の `History` を開く
2. アップロード済みファイルの一覧を見る
3. `1d` / `3d` / `7d` を押すと、新しい署名付きURLを作ってコピーする
4. `Delete` を押すと、OCI上のオブジェクトとローカル履歴を削除する

## 設定の使い方

1. 左側の `Settings` を開く
2. `Settings Status` で不足項目を見る
3. endpoint、region、bucket、key、secret などを入れる
4. `Save settings` を押す
5. `Upload` に戻ってアップロードする

UIから設定を保存すると、Electron のローカル user data にも保存されます。

## コマンドでの動作確認

通常はこれで十分です。

```bash
npm run storage:check
```

開発時に一通り確認するなら次です。

```bash
npm run validate
npm run typecheck
npm test
npm run build
npm run storage:check
```

`storage:check` は、実際にOCIへ小さいファイルをアップロードし、署名付きURLでダウンロード確認し、最後に削除します。
