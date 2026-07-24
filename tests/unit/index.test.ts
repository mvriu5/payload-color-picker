import type { Config, Field } from "payload"
import { describe, expect, it } from "vitest"

import { colorField, defaultSuggestedColors, payloadColorPlugin } from "../../src/index.js"

const createConfig = (config: Partial<Config>): Config => config as Config

const getFieldComponent = (field: Field | undefined) =>
    (
        field as {
            admin?: {
                components?: {
                    Field?: {
                        clientProps?: { suggestedColors?: string[] }
                        path?: string
                    }
                }
            }
        }
    )?.admin?.components?.Field

describe("colorField", () => {
    it("creates a single-value text field and preserves admin options", () => {
        const field = colorField({
            admin: {
                custom: { existing: true },
                position: "sidebar",
            },
            label: "Brand color",
            name: "color",
            required: true,
        })

        expect(field).toMatchObject({
            hasMany: false,
            label: "Brand color",
            name: "color",
            required: true,
            type: "text",
        })
        expect(field.admin).toMatchObject({
            custom: {
                existing: true,
                payloadColorPicker: true,
            },
            position: "sidebar",
        })
    })
})

describe("payloadColorPlugin", () => {
    it("attaches the client field and default suggestions", () => {
        const config = payloadColorPlugin()(
            createConfig({
                collections: [
                    {
                        fields: [colorField({ name: "color" })],
                        slug: "posts",
                    },
                ],
            })
        )

        expect(getFieldComponent(config.collections?.[0]?.fields[0])).toEqual({
            clientProps: {
                suggestedColors: defaultSuggestedColors,
            },
            path: "@mvriu5/payload-color-picker/client#ColorField",
        })
    })

    it("passes overridden suggestions into collection and nested global fields", () => {
        const suggestedColors = ["#112233", "rgb(10, 20, 30)"]
        const config = payloadColorPlugin({ suggestedColors })(
            createConfig({
                collections: [
                    {
                        fields: [colorField({ name: "color" })],
                        slug: "posts",
                    },
                ],
                globals: [
                    {
                        fields: [
                            {
                                fields: [colorField({ name: "color" })],
                                name: "appearance",
                                type: "group",
                            },
                        ],
                        slug: "settings",
                    },
                ],
            })
        )

        const group = config.globals?.[0]?.fields[0] as { fields: Field[] }
        expect(getFieldComponent(config.collections?.[0]?.fields[0])?.clientProps).toEqual({
            suggestedColors,
        })
        expect(getFieldComponent(group.fields[0])?.clientProps).toEqual({ suggestedColors })
    })

    it("leaves marked fields unchanged when disabled", () => {
        const config = payloadColorPlugin({ disabled: true })(
            createConfig({
                collections: [
                    {
                        fields: [colorField({ name: "color" })],
                        slug: "posts",
                    },
                ],
            })
        )

        expect(getFieldComponent(config.collections?.[0]?.fields[0])).toBeUndefined()
        expect(config.collections?.[0]?.fields[0]).toMatchObject({
            name: "color",
            type: "text",
        })
    })
})
