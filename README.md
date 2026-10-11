# midori-pic-editor

pygame で使う画像素材を、Scratch のコスチュームエディタのような操作で作れるブラウザアプリです。
サーバーを使わず、すべてブラウザ内で動きます。

## 目指す機能

- ビットマップ描画（ピクセルアート向け）とレイヤー
- PNG の書き出し、`pygame.image.load()` のコード出力
- スプライトシートの作成と、`subsurface` による切り出しコード出力
- IndexedDB への自動保存と、プロジェクトファイル（ZIP）の保存/読み込み

## 開発

```sh
pnpm install
pnpm dev        # 開発サーバー
pnpm test       # 単体テスト
pnpm coverage   # カバレッジ（domain / lib で 80% 以上）
pnpm lint
pnpm build
```

`main` ブランチへの push で GitHub Pages にデプロイされます（リポジトリの Settings → Pages で Source を「GitHub Actions」にしてください）。

## 設計メモ

- ピクセルの正データは `BitmapStore`（型付き配列）が持ち、Canvas は表示専用です。
- コスチュームは `layers[]` を持ち、既定ではアンチエイリアスなし（ピクセルアート向け）です。
- プロジェクトデータには `schemaVersion` があり、読み込み時に移行 → 検証を行います。

## ライセンス

MIT
