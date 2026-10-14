# 設定リファレンス

ShareClip は、アプリの `設定` 画面で保存した OCI 設定と、任意のローカル設定ファイルを読み込みます。

通常はアプリの `設定` 画面から入力します。JSON ファイルを手で作る必要はありません。

自動化や開発者向けにファイルで設定したい場合は、次のローカル設定ファイルも使えます。

```text
config/shareclip.config.local.json
```

このファイルは認証情報を含むため、Git管理対象にしません。公開用の見本は次です。

```text
config/shareclip.config.example.json
```

## 設定項目

- `endpoint`: OCI Object Storage のS3互換endpoint
- `region`: バケットのリージョン。大阪なら `ap-osaka-1`
- `bucket`: アップロード先バケット名
- `accessKeyId`: Customer Secret Key のアクセスキー
- `secretAccessKey`: Customer Secret Key の秘密キー
- `forcePathStyle`: path-style request を強制するか
- `keyPrefix`: オブジェクトキーのprefix。例: `shareclip/`
- `signedUrlBaseSeconds`: 署名付きURLの最大秒数。7日なら `604800`
- `maxFileSizeMB`: アップロード可能な最大ファイルサイズMB

## 読み込み優先順位

1. Electron のローカル user data に保存した設定
2. `config/shareclip.config.local.json`
3. アプリ内の初期値

UI で設定を保存すると、それ以降は保存済み設定が `config/shareclip.config.local.json` より優先されます。ローカルJSONを直したのに画面へ反映されない場合は、アプリ内の設定を保存し直してください。

UIから設定保存した場合は、Electron の user data 側にも設定が保存されます。`secretAccessKey` は Electron `safeStorage` の非同期APIで暗号化して保存します。WindowsではDPAPIによりOSユーザー単位で保護されます。旧バージョンの平文設定は初回読み込み時に自動移行され、暗号化機能が利用できない場合は平文保存へフォールバックしません。

## バリデーション

アップロード前と接続テスト前に最低限次を確認します。

- `endpoint` がある
- `region` がある
- `bucket` がある
- `accessKeyId` がある
- `secretAccessKey` がある
- `keyPrefix` がある
- `signedUrlBaseSeconds` が 604800 秒以下
- `maxFileSizeMB` が正の数

署名付きURLの期限は、UI/APIともに `1日 / 3日 / 7日` だけを受け付けます。実装側でも最大 `604800` 秒を超えないようにしています。

## 接続テスト

`設定` 画面の `接続テスト` は、入力中の設定を使って次を確認します。

1. OCI バケットへアクセスできるか
2. `keyPrefix` 配下に小さいテストファイルをアップロードできるか
3. 署名付きURLを生成できるか
4. 署名付きURLからダウンロードできるか
5. ダウンロード内容がアップロード内容と一致するか
6. テストファイルを削除できるか

既に保存済みの認証情報がある場合、画面上は `<configured>` と表示されます。この状態で接続テストを押すと、Electron main process 側で保存済みの実値とマージして確認します。

## Gitに入れてはいけないもの

```text
config/shareclip.config.local.json
*.local.json
```

`npm run storage:check` は、local config がGit管理対象に入っていないことと、tracked files に認証情報が混入していないことも確認します。
