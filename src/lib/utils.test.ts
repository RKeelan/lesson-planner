import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn utility function', () => {
  it('should merge classes correctly', () => {
    const result = cn('px-2 py-1', 'text-sm')
    expect(result).toBe('px-2 py-1 text-sm')
  })

  it('should handle conflicting classes with Tailwind merge', () => {
    const result = cn('px-2 px-4', 'py-1 py-2')
    expect(result).toBe('px-4 py-2')
  })

  it('should handle undefined and null values', () => {
    const result = cn('px-2', undefined, 'py-1', null, 'text-sm')
    expect(result).toBe('px-2 py-1 text-sm')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const result = cn('base-class', isActive && 'active-class', 'another-class')
    expect(result).toBe('base-class active-class another-class')
  })

  it('should handle empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should handle arrays of classes', () => {
    const result = cn(['px-2', 'py-1'], 'text-sm')
    expect(result).toBe('px-2 py-1 text-sm')
  })

  it('should handle objects with conditional classes', () => {
    const result = cn({
      'px-2': true,
      'py-1': false,
      'text-sm': true
    })
    expect(result).toBe('px-2 text-sm')
  })
}) 