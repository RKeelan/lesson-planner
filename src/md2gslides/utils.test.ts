import { describe, expect, it } from 'vitest'
import { assert, uuid } from './utils'

describe('md2gslides utils', () => {
  describe('assert function', () => {
    it('should not throw when condition is truthy', () => {
      expect(() => assert(true)).not.toThrow()
      expect(() => assert(1)).not.toThrow()
      expect(() => assert('string')).not.toThrow()
      expect(() => assert({})).not.toThrow()
      expect(() => assert([])).not.toThrow()
    })

    it('should throw when condition is falsy', () => {
      expect(() => assert(false)).toThrow('Assertion failed')
      expect(() => assert(0)).toThrow('Assertion failed')
      expect(() => assert('')).toThrow('Assertion failed')
      expect(() => assert(null)).toThrow('Assertion failed')
      expect(() => assert(undefined)).toThrow('Assertion failed')
    })

    it('should throw with custom message when provided', () => {
      expect(() => assert(false, 'Custom error message')).toThrow('Custom error message')
    })

    it('should use default message when condition is false and no message provided', () => {
      expect(() => assert(false)).toThrow('Assertion failed')
    })
  })

  describe('uuid function', () => {
    it('should generate a string', () => {
      const id = uuid()
      expect(typeof id).toBe('string')
    })

    it('should generate unique IDs', () => {
      const id1 = uuid()
      const id2 = uuid()
      expect(id1).not.toBe(id2)
    })

    it('should generate UUIDs in v1 format', () => {
      const id = uuid()
      // UUID v1 format: xxxxxxxx-xxxx-1xxx-xxxx-xxxxxxxxxxxx
      const uuidV1Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(id).toMatch(uuidV1Regex)
    })

    it('should generate different UUIDs on consecutive calls', () => {
      const ids = new Set()
      for (let i = 0; i < 10; i++) {
        ids.add(uuid())
      }
      expect(ids.size).toBe(10)
    })
  })
}) 