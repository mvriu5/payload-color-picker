// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const fieldState = vi.hoisted(() => ({
    disabled: false,
    formProcessing: false,
    setValue: vi.fn(),
    useField: vi.fn(),
    value: "",
}))

vi.mock("@payloadcms/ui", () => ({
    FieldLabel: ({ label, path, required }: { label?: React.ReactNode; path?: string; required?: boolean }) => (
        <label htmlFor={path}>
            {label}
            {required ? " *" : ""}
        </label>
    ),
    useField: fieldState.useField,
}))

import { ColorField } from "../../src/components/ColorField.js"

const field = {
    admin: {},
    label: "Color",
    name: "color",
    type: "text" as const,
}

describe("ColorField", () => {
    beforeEach(() => {
        fieldState.disabled = false
        fieldState.formProcessing = false
        fieldState.value = ""
        fieldState.setValue.mockReset()
        fieldState.useField.mockReset()
        fieldState.useField.mockImplementation(() => ({
            disabled: fieldState.disabled,
            errorMessage: undefined,
            formInitializing: false,
            formProcessing: fieldState.formProcessing,
            formSubmitted: false,
            path: "color",
            setValue: fieldState.setValue,
            showError: false,
            value: fieldState.value,
        }))
    })

    afterEach(cleanup)

    it("looks like a text input and opens the picker on focus", async () => {
        const user = userEvent.setup()
        render(<ColorField field={field} path="color" suggestedColors={["#112233"]} />)

        const input = screen.getByRole("textbox") as HTMLInputElement
        expect(input.placeholder).toBe("#000000")
        expect(screen.queryByRole("dialog")).toBeNull()

        await user.click(input)

        expect(screen.getByRole("dialog", { name: "Color picker" })).toBeTruthy()
        expect(screen.getByRole("button", { name: "Select #112233" })).toBeTruthy()
        expect(screen.getByRole("slider", { name: "Hue" })).toBeTruthy()
    })

    it("stores manually entered text through Payload form state", async () => {
        const user = userEvent.setup()
        render(<ColorField field={field} path="color" />)

        await user.type(screen.getByRole("textbox"), "#ABCDEF")

        expect(fieldState.setValue).toHaveBeenLastCalledWith("#ABCDEF")
    })

    it("normalizes a selected suggestion to a hex string", async () => {
        const user = userEvent.setup()
        render(<ColorField field={field} path="color" suggestedColors={["rgb(10, 20, 30)"]} />)

        await user.click(screen.getByRole("textbox"))
        await user.click(screen.getByRole("button", { name: "Select #0A141E" }))

        expect(fieldState.setValue).toHaveBeenLastCalledWith("#0A141E")
    })

    it("converts RGB channel changes to the stored hex value", async () => {
        fieldState.value = "#000000"
        const user = userEvent.setup()
        render(<ColorField field={field} path="color" />)

        await user.click(screen.getByRole("textbox"))
        fireEvent.change(screen.getByRole("spinbutton", { name: "R value" }), {
            target: { value: "255" },
        })

        expect(fieldState.setValue).toHaveBeenLastCalledWith("#FF0000")
    })

    it("closes on Escape and stays closed when disabled", async () => {
        const user = userEvent.setup()
        const { rerender } = render(<ColorField field={field} path="color" />)

        await user.click(screen.getByRole("textbox"))
        expect(screen.getByRole("dialog")).toBeTruthy()
        await user.keyboard("{Escape}")
        expect(screen.queryByRole("dialog")).toBeNull()

        fieldState.disabled = true
        rerender(<ColorField field={field} path="color" />)
        expect((screen.getByRole("textbox") as HTMLInputElement).disabled).toBe(true)
    })
})
