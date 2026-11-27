"use client"
import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"

interface Pixel {
  id: number
  x: number
  y: number
  opacity: number
  age: number
  color: string
}

const COLORS = ["#ffffff", "#e0e0e0", "#c0c0c0", "#909090", "#707070"]
const PIXEL_SIZE = 12
const TRAIL_LENGTH = 40
const FADE_SPEED = 0.04

export interface PixelCursorTrailProps {
  /** If true, runs as a non-blocking pointer-events-none overlay for the full application */
  overlay?: boolean
  className?: string
}

export function PixelCursorTrail({ overlay = true, className = "" }: PixelCursorTrailProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pixels, setPixels] = useState<Pixel[]>([])
  const pixelIdRef = useRef(0)
  const lastPositionRef = useRef({ x: 0, y: 0 })
  const animationRef = useRef<number | undefined>(undefined)

  const createPixel = useCallback((x: number, y: number) => {
    return {
      id: pixelIdRef.current++,
      x,
      y,
      opacity: 1,
      age: 0,
      color: COLORS[pixelIdRef.current % COLORS.length],
    }
  }, [])

  const addPoint = useCallback(
    (clientX: number, clientY: number) => {
      let x = clientX
      let y = clientY
      if (!overlay && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        x = clientX - rect.left
        y = clientY - rect.top
      }

      const dx = x - lastPositionRef.current.x
      const dy = y - lastPositionRef.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > PIXEL_SIZE) {
        const newPixel = createPixel(x, y)
        setPixels((prev) => [...prev.slice(-TRAIL_LENGTH), newPixel])
        lastPositionRef.current = { x, y }
      }
    },
    [createPixel, overlay],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      addPoint(e.clientX, e.clientY)
    },
    [addPoint],
  )

  useEffect(() => {
    if (overlay) {
      const handleWindowPointer = (e: PointerEvent | MouseEvent) => {
        addPoint(e.clientX, e.clientY)
      }
      window.addEventListener("pointermove", handleWindowPointer, { passive: true })
      return () => {
        window.removeEventListener("pointermove", handleWindowPointer)
      }
    }
  }, [overlay, addPoint])

  useEffect(() => {
    const animate = () => {
      setPixels((prev) => {
        if (prev.length === 0) return prev
        return prev
          .map((pixel) => ({
            ...pixel,
            opacity: pixel.opacity - FADE_SPEED,
            age: pixel.age + 1,
          }))
          .filter((pixel) => pixel.opacity > 0)
      })
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      onMouseMove={overlay ? undefined : handleMouseMove}
      className={
        overlay
          ? `fixed inset-0 w-screen h-screen pointer-events-none z-[99999] overflow-hidden select-none ${className}`
          : `fixed inset-0 w-screen h-screen bg-background overflow-hidden cursor-none select-none ${className}`
      }
      aria-hidden="true"
    >
      {pixels.map((pixel) => {
        // Calculate size based on age - older pixels are smaller
        const sizeMultiplier = Math.max(0.3, 1 - pixel.age / 100)
        const currentSize = PIXEL_SIZE * sizeMultiplier

        return (
          <div
            key={pixel.id}
            className="absolute pointer-events-none"
            style={{
              left: pixel.x - currentSize / 2,
              top: pixel.y - currentSize / 2,
              width: currentSize,
              height: currentSize,
              opacity: pixel.opacity,
              backgroundColor: pixel.color || "#ffffff",
              borderRadius: "2px",
              boxShadow: "0 0 6px rgba(255, 255, 255, 0.4)",
              transition: "width 0.1s ease-out, height 0.1s ease-out",
            }}
          />
        )
      })}
      {!overlay && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-foreground/20">Move cursor</span>
        </div>
      )}
    </div>
  )
}

export default PixelCursorTrail
