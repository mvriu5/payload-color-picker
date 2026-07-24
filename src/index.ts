import type { Config, Field, TextField } from "payload"

export type PayloadColorPluginOptions = {
    disabled?: boolean
    suggestedColors?: string[]
}

export type ColorFieldConfig = Omit<TextField, "admin" | "hasMany" | "maxRows" | "minRows" | "type"> & {
    admin?: TextField["admin"]
}

const COLOR_FIELD_MARKER = "payloadColorPicker"
const COLOR_FIELD_COMPONENT = "@mvriu5/payload-color-picker/client#ColorField"

export const defaultSuggestedColors = ["#EF4444", "#F97316", "#F59E0B", "#22C55E", "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899", "#111827", "#FFFFFF"]

export const colorField = ({ admin, ...field }: ColorFieldConfig): TextField =>
    ({
        ...field,
        hasMany: false,
        type: "text",
        admin: {
            ...admin,
            custom: {
                ...(admin?.custom ?? {}),
                [COLOR_FIELD_MARKER]: true,
            },
        },
    }) as TextField

export const payloadColorPlugin =
    (options: PayloadColorPluginOptions = {}) =>
    (config: Config): Config => {
        if (options.disabled) return config
        const suggestedColors = options.suggestedColors ?? defaultSuggestedColors

        config.collections = config.collections?.map((collection) => ({
            ...collection,
            fields: withColorFields(collection.fields, suggestedColors),
        }))
        config.globals = config.globals?.map((global) => ({
            ...global,
            fields: withColorFields(global.fields, suggestedColors),
        }))
        return config
    }

const withColorFields = (fields: Field[] | undefined, suggestedColors: string[]): Field[] =>
    (fields ?? []).map((field) => {
        const nestedField = field as Field & {
            blocks?: Array<{ fields: Field[] }>
            fields?: Field[]
            tabs?: Array<{ fields: Field[] }>
        }

        if ("admin" in field && field.admin?.custom?.[COLOR_FIELD_MARKER]) {
            const textField = field as TextField
            return {
                ...textField,
                admin: {
                    ...textField.admin,
                    components: {
                        ...(textField.admin?.components ?? {}),
                        Field: {
                            clientProps: { suggestedColors },
                            path: COLOR_FIELD_COMPONENT,
                        },
                    },
                },
            } as Field
        }

        if (nestedField.fields) {
            return { ...nestedField, fields: withColorFields(nestedField.fields, suggestedColors) } as Field
        }
        if (nestedField.tabs) {
            return {
                ...nestedField,
                tabs: nestedField.tabs.map((tab) => ({
                    ...tab,
                    fields: withColorFields(tab.fields, suggestedColors),
                })),
            } as Field
        }
        if (nestedField.blocks) {
            return {
                ...nestedField,
                blocks: nestedField.blocks.map((block) => ({
                    ...block,
                    fields: withColorFields(block.fields, suggestedColors),
                })),
            } as Field
        }
        return field
    })
