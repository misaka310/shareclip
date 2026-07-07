# ShareClip

ShareClip は、自分の Oracle Cloud Infrastructure Object Storage バケットを使って、一時共有リンクを作る Windows デスクトップアプリです。

ファイルを選び、1日・3日・7日の期限を選ぶと、OCI バケットへアップロードして署名付きダウンロード URL を作ります。受け取る側は OCI アカウント不要で、URL から直接ダウンロードできます。

## 主な機能

- ファイル選択またはドラッグ&ドロップでアップロード
- 署名付きURLの期限は 1日 / 3日 / 7日 のみ
- 最大期限は 604800秒、つまり7日で強制
- `Content-Disposition: attachment` を付けて、可能な限りブラウザ表示ではなくダウンロードに寄せる
- アップロード履歴の保存
- 履歴からリンク再発行
- 履歴からリモートオブジェクト削除
- 共有リンク画面や履歴から、後でリンクを再コピー
- 履歴の 1日 / 3日 / 7日 は、新しい期限のリンクを再発行してコピー
- `config/shareclip.config.local.json` はGit管理対象外

## 最短の使い方

先に OCI 側で Object Storage バケット、Namespace、Customer Secret Key、対象バケットへの Object 操作権限を用意してください。詳しい手順は `docs/oracle-setup.md` です。

### 1. 起動batを実行する

Windows でリポジトリを clone したら、次をダブルクリックします。

```text
Start-ShareClip.bat
```

このbatが次をまとめて行います。

1. Node.js / npm があるか確認する
2. 初回だけ `npm install` を実行する
3. `npm run dev` で ShareClip を起動する

Node.js が入っていない場合は、Node.js LTS を入れてからもう一度 `Start-ShareClip.bat` を実行してください。

### 2. 設定画面に OCI 情報を入れて保存する

初回起動時に OCI 設定が未入力なら、自動で `設定` 画面を開きます。

`設定` 画面で次を入力し、`設定を保存` を押します。

- Endpoint: `https://<namespace>.compat.objectstorage.<region>.oraclecloud.com`
- Region: 大阪なら `ap-osaka-1`
- Bucket: アップロード先バケット名
- Access Key ID: Customer Secret Key のアクセスキー
- Secret Access Key: Customer Secret Key の秘密キー
- Key Prefix: 例 `shareclip/`
- Signed URL Max Seconds: `604800`
- Max File Size MB: 例 `2048`

大阪リージョンで、namespace が `your-namespace` の場合は endpoint が次になります。

```text
https://your-namespace.compat.objectstorage.ap-osaka-1.oraclecloud.com
```

`config/shareclip.config.local.json` を手で作る方法もありますが、通常はアプリの設定画面から入力すれば十分です。JSON 手編集は自動化や開発者向けの任意手順です。

OCIのS3互換endpointでは、bucket名をサブドメインにすると証明書エラーになる場合があります。ShareClipは `.compat.objectstorage.` endpoint では自動的に path-style request を使います。

## 配布用 exe を作る

配布用フォルダを作りたい場合は、次をダブルクリックします。

```text
Build-ShareClip.bat
```

成功すると次ができます。

```text
release\ShareClip-win32-x64\ShareClip.exe
```

`ShareClip.exe` だけを抜き出さず、`ShareClip-win32-x64` フォルダごと使ってください。

## コマンドで起動したい場合

batを使わずにコマンドで起動する場合は次です。

```bash
npm install
npm run dev
```

## 動作確認

通常はアプリ画面で、ファイル選択またはドラッグ&ドロップ、アップロード、リンクのブラウザ確認、履歴からのコピー/再発行/削除を確認します。

### コード側の確認

```bash
npm run validate
npm run typecheck
npm test
npm run build
```

### OCI導通だけコマンドで確認する場合

アプリの設定画面ではなく `config/shareclip.config.local.json` を使って確認したい場合だけ実行します。

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

## アプリ起動後の確認手順

1. `アップロード` 画面でファイルを選ぶ、またはドラッグ&ドロップする
2. 期限を `1日` / `3日` / `7日` から選ぶ
3. `アップロードしてリンク生成` を押す
4. クリップボードに URL がコピーされる
5. ブラウザのシークレットウィンドウなどで URL を開き、ファイルがダウンロードできるか確認する
6. `共有リンク` の `コピー` で、同じ URL を後から再コピーでき、ボタン表示が一時的に `コピーしました` に変わることを確認する
7. `履歴` の `コピー` で、履歴から同じ URL を再コピーでき、ボタン表示が一時的に `コピーしました` に変わることを確認する
8. `履歴` の `1日` / `3日` / `7日` で、新しい期限の URL を再発行してコピーでき、`コピー` ボタン側の表示も一時的に `コピーしました` に変わることを確認する
9. `履歴` の `削除` で、OCI 上のファイルを削除できることを確認する

## セキュリティ

`config/shareclip.config.local.json` はコミットしないでください。Customer Secret Key が漏れた場合は、OCIコンソールで該当キーを削除して作り直してください。

アプリのUIから設定を保存すると、Electronのローカルユーザーデータディレクトリにも統合後の設定が保存されます。その保存設定には `accessKeyId` と `secretAccessKey` が含まれ得るため、app dataフォルダもローカル秘密情報として扱ってください。

## ライセンス

MIT License です。詳細は `LICENSE` を見てください。
