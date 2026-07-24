# Payload Color Plugin

A Payload CMS plugin for selecting colors in the admin UI and storing the
selected value as a string.

The package structure and development environment are prepared. The field,
picker UI, and plugin behavior will be implemented in the next step.

## Usage

```ts
import { colorField, payloadColorPlugin } from "@mvriu5/payload-color-picker"

export default buildConfig({
    collections: [
        {
            slug: "posts",
            fields: [
                colorField({
                    name: "color",
                    label: "Color",
                }),
            ],
        },
    ],
    plugins: [
        payloadColorPlugin({
            suggestedColors: ["#111827", "#3B82F6", "#22C55E", "#F59E0B"],
        }),
    ],
})
```

The selected color is stored as a regular string field.

## Development

```sh
cp dev/.env.example dev/.env
docker compose up -d
pnpm dev
```

## Build

```sh
pnpm build
```
