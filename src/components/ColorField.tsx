"use client"

import { FieldLabel, useField } from "@payloadcms/ui"
import type { TextFieldClientProps, Validate } from "payload"
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

import styles from "./ColorField.module.css"

export type ColorFieldProps = TextFieldClientProps & {
    suggestedColors?: string[]
}

type HSV = { h: number; s: number; v: number }
type RGB = { b: number; g: number; r: number }

const FALLBACK_COLOR = "#000000"

export const ColorField: React.FC<ColorFieldProps> = ({ field, path, suggestedColors = [], validate }) => {
    const { description, readOnly } = field.admin ?? {}
    const { label, required } = field
    const { disabled, errorMessage, formProcessing, setValue, showError, value } = useField<string>({
        potentiallyStalePath: path,
        validate: validate as Validate | undefined,
    })
    const rootRef = useRef<HTMLDivElement>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [draftValue, setDraftValue] = useState(value ?? "")
    const parsedColor = useMemo(() => parseColor(draftValue), [draftValue])
    const [hsv, setHsv] = useState<HSV>(() => rgbToHsv(parsedColor ?? { b: 0, g: 0, r: 0 }))
    const isDisabled = Boolean(disabled || readOnly || formProcessing)
    const displayedColor = parsedColor ? rgbToHex(parsedColor) : FALLBACK_COLOR

    useEffect(() => setDraftValue(value ?? ""), [value])

    useEffect(() => {
        if (!parsedColor) return
        setHsv((current) => {
            const next = rgbToHsv(parsedColor)
            return next.s === 0 ? { ...next, h: current.h } : next
        })
    }, [parsedColor])

    useEffect(() => {
        if (!isOpen) return
        const closeOutside = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
        }
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsOpen(false)
        }
        document.addEventListener("mousedown", closeOutside)
        document.addEventListener("keydown", closeOnEscape)
        return () => {
            document.removeEventListener("mousedown", closeOutside)
            document.removeEventListener("keydown", closeOnEscape)
        }
    }, [isOpen])

    const commitColor = useCallback(
        (color: RGB) => {
            const nextValue = rgbToHex(color)
            setDraftValue(nextValue)
            setValue(nextValue)
        },
        [setValue]
    )

    const updateFromHsv = useCallback(
        (nextHsv: HSV) => {
            setHsv(nextHsv)
            commitColor(hsvToRgb(nextHsv))
        },
        [commitColor]
    )

    const updateMap = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (isDisabled) return
            const bounds = event.currentTarget.getBoundingClientRect()
            const s = clamp((event.clientX - bounds.left) / bounds.width, 0, 1)
            const v = 1 - clamp((event.clientY - bounds.top) / bounds.height, 0, 1)
            updateFromHsv({ ...hsv, s, v })
            event.currentTarget.setPointerCapture(event.pointerId)
        },
        [hsv, isDisabled, updateFromHsv]
    )

    const updateRgb = useCallback(
        (channel: keyof RGB, input: string) => {
            const current = parsedColor ?? hsvToRgb(hsv)
            commitColor({ ...current, [channel]: clamp(Number(input) || 0, 0, 255) })
        },
        [commitColor, hsv, parsedColor]
    )

    return (
        <div className={`field-type text ${styles.field}`} ref={rootRef}>
            <FieldLabel label={label} path={path} required={required} />
            {description && <div className="field-description">{description as ReactNode}</div>}

            <div className={styles.control}>
                <span aria-hidden="true" className={styles.swatch} style={{ "--color-field-value": displayedColor } as CSSProperties} />
                <input
                    aria-expanded={isOpen}
                    aria-haspopup="dialog"
                    className={styles.textInput}
                    disabled={isDisabled}
                    onChange={(event) => {
                        setDraftValue(event.target.value)
                        setValue(event.target.value)
                    }}
                    onClick={() => setIsOpen(true)}
                    onFocus={() => setIsOpen(true)}
                    placeholder="#000000"
                    type="text"
                    value={draftValue}
                />

                {isOpen && !isDisabled && (
                    <div aria-label="Color picker" className={styles.picker} role="dialog">
                        {suggestedColors.length > 0 && (
                            <div className={styles.suggestions}>
                                {suggestedColors.map((color) => {
                                    const suggestion = parseColor(color)
                                    if (!suggestion) return null
                                    const normalized = rgbToHex(suggestion)
                                    return (
                                        <button
                                            aria-label={`Select ${normalized}`}
                                            className={styles.suggestion}
                                            key={color}
                                            onClick={() => commitColor(suggestion)}
                                            style={{ "--color-field-value": normalized } as CSSProperties}
                                            title={normalized}
                                            type="button"
                                        />
                                    )
                                })}
                            </div>
                        )}

                        <div
                            className={styles.colorMap}
                            onPointerDown={updateMap}
                            onPointerMove={(event) => {
                                if (event.buttons === 1) updateMap(event)
                            }}
                            style={{ "--color-field-hue": `hsl(${hsv.h} 100% 50%)` } as CSSProperties}
                        >
                            <span className={styles.mapThumb} style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }} />
                        </div>

                        <input
                            aria-label="Hue"
                            className={styles.hue}
                            max="360"
                            min="0"
                            onChange={(event) => updateFromHsv({ ...hsv, h: Number(event.target.value) })}
                            type="range"
                            value={Math.round(hsv.h)}
                        />

                        <div className={styles.rgb}>
                            {(["r", "g", "b"] as const).map((channel) => (
                                <label className={styles.channel} key={channel}>
                                    <span>{channel.toUpperCase()}</span>
                                    <input
                                        aria-label={`${channel.toUpperCase()} value`}
                                        max="255"
                                        min="0"
                                        onChange={(event) => updateRgb(channel, event.target.value)}
                                        type="number"
                                        value={(parsedColor ?? hsvToRgb(hsv))[channel]}
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {showError && errorMessage && <div className="field-error">{errorMessage}</div>}
        </div>
    )
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

const parseColor = (value: string): RGB | undefined => {
    const normalized = value.trim()
    const shortHex = /^#?([\da-f])([\da-f])([\da-f])$/i.exec(normalized)
    if (shortHex) {
        return {
            b: Number.parseInt(shortHex[3] + shortHex[3], 16),
            g: Number.parseInt(shortHex[2] + shortHex[2], 16),
            r: Number.parseInt(shortHex[1] + shortHex[1], 16),
        }
    }
    const hex = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(normalized)
    if (hex) {
        return {
            b: Number.parseInt(hex[3], 16),
            g: Number.parseInt(hex[2], 16),
            r: Number.parseInt(hex[1], 16),
        }
    }
    const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(normalized)
    if (!rgb) return undefined
    return {
        b: clamp(Number(rgb[3]), 0, 255),
        g: clamp(Number(rgb[2]), 0, 255),
        r: clamp(Number(rgb[1]), 0, 255),
    }
}

const rgbToHex = ({ b, g, r }: RGB): string => `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`.toUpperCase()

const rgbToHsv = ({ b, g, r }: RGB): HSV => {
    const [red, green, blue] = [r / 255, g / 255, b / 255]
    const max = Math.max(red, green, blue)
    const min = Math.min(red, green, blue)
    const delta = max - min
    let h = 0
    if (delta !== 0) {
        if (max === red) h = 60 * (((green - blue) / delta) % 6)
        else if (max === green) h = 60 * ((blue - red) / delta + 2)
        else h = 60 * ((red - green) / delta + 4)
    }
    return { h: h < 0 ? h + 360 : h, s: max === 0 ? 0 : delta / max, v: max }
}

const hsvToRgb = ({ h, s, v }: HSV): RGB => {
    const chroma = v * s
    const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1))
    const offset = v - chroma
    let [red, green, blue] = [0, 0, 0]
    if (h < 60) [red, green, blue] = [chroma, x, 0]
    else if (h < 120) [red, green, blue] = [x, chroma, 0]
    else if (h < 180) [red, green, blue] = [0, chroma, x]
    else if (h < 240) [red, green, blue] = [0, x, chroma]
    else if (h < 300) [red, green, blue] = [x, 0, chroma]
    else [red, green, blue] = [chroma, 0, x]
    return {
        b: Math.round((blue + offset) * 255),
        g: Math.round((green + offset) * 255),
        r: Math.round((red + offset) * 255),
    }
}
