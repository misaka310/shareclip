# ShareClip

[![CI](https://github.com/misaka310/shareclip/actions/workflows/ci.yml/badge.svg)](https://github.com/misaka310/shareclip/actions/workflows/ci.yml)

ShareClip は、自分の Oracle Cloud Infrastructure Object Storage を使って、期限付きのファイル共有URLを作る Windows デスクトップアプリです。

ファイルを選び、期限を1日・3日・7日から選ぶと、OCIへアップロードして署名付きURLを生成します。受け取る側にOCIアカウントは必要ありません。

## できること

- ファイル選択またはドラッグ&ドロップでアップロード
- 1日・3日・7日の署名付きURLを生成
- 生成したURLを自動でクリップボードへコピー
- 履歴からURLの再コピー・再発行・リモート削除
- OCIへの実接続テスト

## 必要なもの

- Windows 10 / 11
- Node.js LTS（初回ビルド時のみ）
- OCI Object Storageのバケット
- 対象バケットを操作できるCustomer Secret Key

OCI側の準備は [Oracle Cloudの準備](docs/oracle-setup.md) を参照してください。

## 起動

リポジトリをcloneし、次をダブルクリックします。

```text
Start-ShareClip.bat
```

初回は依存関係と配布用exeを作成してから起動します。2回目以降は作成済みのexeを直接起動します。

起動後は、`設定`画面でOCI情報を入力し、`接続テスト`が成功してから保存してください。

詳しい操作手順は [使い方](docs/usage.md)、設定項目は [設定リファレンス](docs/configuration.md) にあります。

## セキュリティ

- `config/shareclip.config.local.json` はGit管理対象外です
- UIから保存した`secretAccessKey`はElectron `safeStorage`で暗号化します
- WindowsではOSユーザー単位のDPAPI保護を利用します
- 旧バージョンの平文設定は初回読み込み時に自動移行します
- 暗号化機能が利用できない場合、平文では保存しません

詳細と報告方法は [SECURITY.md](SECURITY.md) を参照してください。

## 開発と検証

```bash
npm ci
npm run validate
npm run typecheck
npm test
npm run build
```

GitHub Actionsでも、pull requestと`master`へのpush時に同じ基本チェックを実行します。

OCIへの実導通確認は、ローカル設定を用意したうえで次を実行します。

```bash
npm run storage:check
```

## ライセンス

[MIT License](LICENSE)
