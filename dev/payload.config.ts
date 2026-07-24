import { postgresAdapter } from "@payloadcms/db-postgres"
import { lexicalEditor } from "@payloadcms/richtext-lexical"
import path from "path"
import { buildConfig } from "payload"
import { colorField, payloadColorPlugin } from "../src/index.js"
import sharp from "sharp"
import { fileURLToPath } from "url"

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.ROOT_DIR) {
    process.env.ROOT_DIR = dirname
}

export default buildConfig({
    admin: {
        importMap: {
            baseDir: path.resolve(dirname),
        },
    },
    collections: [
        {
            slug: "posts",
            fields: [
                {
                    name: "title",
                    type: "text",
                    required: true,
                },
                colorField({
                    name: "color",
                    label: "Color",
                }),
            ],
        },
    ],
    db: postgresAdapter({
        pool: {
            connectionString: process.env.DATABASE_URL,
        },
    }),
    editor: lexicalEditor(),
    plugins: [payloadColorPlugin({ suggestedColors: ["#FFFFFF"] })],
    secret: process.env.PAYLOAD_SECRET || "payload-color-plugin-dev-secret",
    sharp,
    typescript: {
        outputFile: path.resolve(dirname, "payload-types.ts"),
    },
})
