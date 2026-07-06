# ShareClip

ShareClip は、Oracle Cloud Infrastructure Object Storage を S3互換APIで使う、一時ファイル共有用のWindowsデスクトップアプリです。

ローカルファイルを選び、1日・3日・7日の期限を選ぶと、OCIバケットへアップロードして署名付きダウンロードURLをクリップボードへコピーします。受け取る側はOCIアカウント不要で、URLから直接ダウンロードできます。

## 主な機能

- ファイル選択とドラッグ&ドロップアップロード
- 署名付きURLの期限は 1日 / 3日 / 7日 のみ
- 最大期限は 604800秒、つまり7日で強制
- `Content-Disposition: attachment` を付けて、可能な限りブラウザ表示ではなくダウンロードに寄せる
- アップロード履歴の保存
- 履歴からリンク再発行
- 履歴からリモートオブジェクト削除
- full URL はElectron main process側でクリップボードへコピー
- 画面上のURLプレビューではcredential風のクエリ値をマスク
- `config/shareclip.config.local.json` はGit管理対象外

## セットアップ

### 1. 依存関係を入れる

```bash
npm install
```

### 2. ローカル設定ファイルを作る

```bat
copy config\shareclip.config.example.json config\shareclip.config.local.json
```

### 3. `config/shareclip.config.local.json` にOCI情報を入れる

```json
{
  "endpoint": "https://<namespace>.compat.objectstorage.<region>.oraclecloud.com",
  "region": "ap-osaka-1",
  "bucket": "shareclip",
  "accessKeyId": "your_customer_secret_key_access_key",
  "secretAccessKey": "your_customer_secret_key_secret",
  "forcePathStyle": false,
  "keyPrefix": "shareclip/",
  "signedUrlBaseSeconds": 604800,
  "maxFileSizeMB": 2048
}
```

大阪リージョンで、namespace が `axqnj0ucnp3e` の場合は endpoint が次になります。

```json
"endpoint": "https://axqnj0ucnp3e.compat.objectstorage.ap-osaka-1.oraclecloud.com",
"region": "ap-osaka-1"
```

OCIのS3互換endpointでは、bucket名をサブドメインにすると証明書エラーになる場合があります。ShareClipは `.compat.objectstorage.` endpoint では自動的に path-style request を使います。

## 動作確認

### まとめて確認

```bash
npm run validate
npm run typecheck
npm test
npm run build
npm run storage:check
```

### 実OCI導通だけ確認

```bash
npm run storage:check
```

`storage:check` は次を実行します。

1. `config/shareclip.config.local.json` を読む
2. 必須項目を検証する
3. Git管理対象にlocal configやsecretが入っていないか確認する
4. OCIバケットへ接続する
5. 小さいテストファイルを `keyPrefix` 配下へアップロードする
6. 604800秒以内の署名付きURLを作る
7. URLからHTTP GETでダウンロードする
8. ダウンロード内容が一致するか確認する
9. テストオブジェクトを削除する

成功例:

```text
config check: ok
git check: local config and secret values are not tracked.
bucket check: ok
upload check: ok
signed URL check: ok (604800s)
download check: ok
cleanup check: ok
ShareClip storage check passed.
```

## アプリ起動

```bash
npm run dev
```

起動後の確認手順:

1. `Upload` 画面でファイルを選ぶ
2. 期限を `1 day` / `3 days` / `7 days` から選ぶ
3. `Upload and copy link` を押す
4. クリップボードにURLがコピーされる
5. ブラウザのシークレットウィンドウなどでURLを開き、ファイルがダウンロードできるか確認する
6. `History` からリンク再発行またはリモート削除を確認する

## セキュリティ

`config/shareclip.config.local.json` はコミットしないでください。Customer Secret Key が漏れた場合は、OCIコンソールで該当キーを削除して作り直してください。

アプリのUIから設定を保存すると、Electronのローカルユーザーデータディレクトリにも統合後の設定が保存されます。その保存設定には `accessKeyId` と `secretAccessKey` が含まれ得るため、app dataフォルダもローカル秘密情報として扱ってください。

## ライセンス

MIT License です。詳細は `LICENSE` を見てください。
