# Oracle Object Storage 設定手順

ShareClip は Oracle Cloud Infrastructure Object Storage を S3互換APIで使います。OCIネイティブのPARは使いません。

## 必要な値

アプリの `設定` 画面に入れる値は次です。JSON を手で書く必要はありません。

- `endpoint`: `https://<namespace>.compat.objectstorage.<region>.oraclecloud.com`
- `region`: 大阪なら `ap-osaka-1`
- `bucket`: Object Storage のバケット名
- `accessKeyId`: Customer Secret Key のアクセスキー
- `secretAccessKey`: Customer Secret Key の秘密キー
- `forcePathStyle`: まず `false` でよい
- `keyPrefix`: 例: `shareclip/`
- `signedUrlBaseSeconds`: 7日なら `604800`
- `maxFileSizeMB`: 例: `2048`

## OCI側でやること

1. リージョンを確認する。大阪なら `Japan Central (Osaka)` / `ap-osaka-1`
2. Object Storage でバケットを作る
3. バケットのネームスペースを確認する
4. ユーザー設定から Customer Secret Key を作る
5. 生成直後に表示される値を保存する
6. 一覧に表示されるアクセスキーを保存する
7. IAMポリシーで対象バケットのObject操作を許可する

## ポリシー例

グループ名が `ShareClipObjectUsers`、バケット名が `shareclip` の例です。

```text
Allow group ShareClipObjectUsers to read buckets in tenancy
Allow group ShareClipObjectUsers to manage objects in tenancy where target.bucket.name = 'shareclip'
```

## ShareClip側でやること

1. `Start-ShareClip.bat` をダブルクリックする
2. 初回だけ exe が作成され、自動で起動する
3. 初回表示された `設定` 画面に OCI の値を入れる
4. `設定を保存` を押す
5. `アップロード` で実際にファイルを1つアップロードする
6. コピーされた URL をシークレットウィンドウで開き、ダウンロードできることを確認する

2回目以降は `Start-ShareClip.bat` が作成済みの exe をそのまま起動します。

コマンドだけで OCI 接続を切り分けたい場合は、任意で `config/shareclip.config.local.json` を作って `npm run storage:check` を実行します。`storage:check` はバケット接続、アップロード、署名付きURL生成、ダウンロード、削除まで確認します。

## 注意

- バケットは公開しなくてよいです
- private bucket + presigned URL で使います
- Customer Secret Key はOCIログイン用パスワードではありません
